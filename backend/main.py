from fastapi import FastAPI, UploadFile, File, HTTPException, Form
from google import genai
import fitz  # PyMuPDF
from pydantic import BaseModel
from typing import List, Dict
import math
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

# Allow CORS for local frontend during development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000", "http://127.0.0.1:5173", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health():
    return {"status": "ok"}

# Initialize GenAI client for Vertex AI Gemini
client = genai.Client(vertexai=True, project="eminent-goods-468204-b4", location="us-central1")

def extract_text_from_pdf(file_bytes: bytes) -> str:
    doc = fitz.open(stream=file_bytes, filetype="pdf")
    text = ""
    for page in doc:
        text += page.get_text()
    return text


def extract_skills_from_text(text: str) -> List[str]:
    """Use Gemini to extract skills from raw resume/job description text."""
    prompt = (
        "Extract all key *technical* skills (programming languages, libraries, frameworks, tools) "
        "from the text below. Return a JSON array of skills ONLY.\n\n"
        f"Text:\n{text}"
    )

    resp = client.models.generate_content(
        model="gemini-2.5-flash",
        contents=prompt
    )

    raw = resp.text.strip()
    skills = []
    if raw.startswith('[') and raw.endswith(']'):
        try:
            skills = eval(raw)
        except Exception:
            skills = [s.strip() for s in raw.strip('[]').split(',') if s.strip()]
    else:
        skills = [s.strip() for s in raw.replace('\n', ',').split(',') if s.strip()]

    # normalize to lowercase unique
    normalized = []
    for s in skills:
        ns = s.lower().strip()
        if ns and ns not in normalized:
            normalized.append(ns)
    return normalized


def match_skills(resume_skills: List[str], job_skills: List[str]) -> Dict:
    """Compute simple matching metrics and an overlap score."""
    rs = set([s.lower() for s in resume_skills])
    js = set([s.lower() for s in job_skills])
    intersection = rs & js
    precision = len(intersection) / len(rs) if rs else 0.0
    recall = len(intersection) / len(js) if js else 0.0
    f1 = (2 * precision * recall) / (precision + recall) if (precision + recall) > 0 else 0.0

    # A simple explainable score: weighted by overlap and normalized coverage
    overlap_score = len(intersection) / max(len(js), 1)
    # Smooth to 0-100
    score = math.floor(overlap_score * 100)

    return {
        "matched_skills": sorted(list(intersection)),
        "resume_count": len(rs),
        "job_count": len(js),
        "precision": precision,
        "recall": recall,
        "f1": f1,
        "score": score,
    }

@app.post("/extract-skills/")
async def extract_skills(file: UploadFile = File(...)):
    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="Empty file")

    # Extract text from PDF
    resume_text = extract_text_from_pdf(content)

    if not resume_text.strip():
        raise HTTPException(status_code=400, detail="Could not extract text from PDF")

    prompt = (
        "Extract all key *technical* skills (programming languages, libraries, frameworks, tools) "
        "from the resume below. Return a JSON array of skills ONLY.\n\n"
        f"Resume:\n{resume_text}"
    )

    try:
        resp = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"GenAI error: {e}")

    # resp.text might be a free-text list; ideally JSON but we will parse minimally
    # Try to clean it up by removing extra markup
    raw = resp.text.strip()

    # If it looks like a JSON array, return it; otherwise split on commas / newlines
    skills = []
    if raw.startswith('[') and raw.endswith(']'):
        try:
            skills = eval(raw)  # crude, but OK for testing
        except Exception:
            skills = [s.strip() for s in raw.strip('[]').split(',') if s.strip()]
    else:
        skills = [s.strip() for s in raw.replace('\n', ',').split(',') if s.strip()]

    # normalize
    skills = [s.lower() for s in skills]

    return {"skills": skills, "text": resume_text}


@app.post("/match-job/")
async def match_job(file: UploadFile = File(...), job_description: str = Form(...)):
    """Accept resume PDF and a job description text (form field), return matched skills and score."""

    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="Empty file")

    resume_text = extract_text_from_pdf(content)

    resume_skills = extract_skills_from_text(resume_text)
    job_skills = extract_skills_from_text(job_description)

    match = match_skills(resume_skills, job_skills)

    # Ask Gemini for a short human-readable explanation of match
    explain_prompt = (
        "Given the following resume skills and job-required skills, provide a short explanation (1-2 sentences) "
        "of the match and list the top 3 reasons the candidate is a good or poor fit. Return JSON with `explanation` and `reasons` array.\n\n"
        f"Resume skills: {resume_skills}\nJob skills: {job_skills}"
    )

    try:
        resp = client.models.generate_content(model="gemini-2.5-flash", contents=explain_prompt)
        explanation_raw = resp.text.strip()
    except Exception:
        explanation_raw = ""

    return {"match": match, "explain": explanation_raw}


class EvalRequest(BaseModel):
    resume_text: str
    job_description: str
    ground_truth_skills: List[str]


@app.post("/evaluate-matching/")
async def evaluate_matching(body: EvalRequest):
    """Evaluate matching by comparing predicted matched skills to ground-truth list."""
    pred_resume_skills = extract_skills_from_text(body.resume_text)
    job_skills = extract_skills_from_text(body.job_description)

    match = match_skills(pred_resume_skills, job_skills)

    # compute metrics comparing predicted matched skills vs ground truth
    pred_matched = set(match["matched_skills"]) if match.get("matched_skills") else set()
    gt = set([s.lower() for s in body.ground_truth_skills])

    tp = len(pred_matched & gt)
    fp = len(pred_matched - gt)
    fn = len(gt - pred_matched)

    precision = tp / (tp + fp) if (tp + fp) > 0 else 0.0
    recall = tp / (tp + fn) if (tp + fn) > 0 else 0.0
    f1 = (2 * precision * recall) / (precision + recall) if (precision + recall) > 0 else 0.0

    return {
        "predicted_matched": sorted(list(pred_matched)),
        "ground_truth": sorted(list(gt)),
        "tp": tp,
        "fp": fp,
        "fn": fn,
        "precision": precision,
        "recall": recall,
        "f1": f1,
    }
