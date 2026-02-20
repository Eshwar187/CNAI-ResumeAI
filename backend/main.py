from fastapi import FastAPI, UploadFile, File, HTTPException, Form
from PyPDF2 import PdfReader
import io
from pydantic import BaseModel
from typing import List, Dict, Optional
import math
from fastapi.middleware.cors import CORSMiddleware
import httpx
import os
import traceback
import json
import re
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="ResumeAI API", version="1.0.0")

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

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", None)

def call_gemini_rest(prompt: str, model: str = "gemini-1.5-flash", temperature: float = 0.0, max_output_tokens: int = 1024) -> dict:
    if not GEMINI_API_KEY:
        raise HTTPException(status_code=500, detail="GEMINI_API_KEY not set in environment")
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={GEMINI_API_KEY}"
    payload = {
        "contents": [{
            "parts": [{"text": prompt}]
        }],
        "generationConfig": {
            "temperature": temperature,
            "maxOutputTokens": max_output_tokens,
        }
    }
    try:
        with httpx.Client(timeout=60.0) as client:
            r = client.post(url, json=payload)
            print(f"DEBUG: Status Code: {r.status_code}")
            if r.status_code != 200:
                print(f"DEBUG: Error Response: {r.text[:500]}")
            r.raise_for_status()
            response_json = r.json()
            print(f"DEBUG: Full API Response: {json.dumps(response_json, indent=2)[:1000]}")
            return response_json
    except httpx.HTTPStatusError as e:
        print(f"ERROR: HTTP Status Error: {e.response.status_code}")
        print(f"ERROR: Response body: {e.response.text}")
        raise HTTPException(status_code=502, detail=f"Gemini API failed: {e.response.text}")
    except httpx.HTTPError as e:
        print(f"ERROR: HTTP Error: {str(e)}")
        raise HTTPException(status_code=502, detail=f"Gemini API request failed: {e}")

def parse_gemini_response(resp_json: dict) -> str:
    candidates = resp_json.get("candidates")
    if candidates and isinstance(candidates, list) and len(candidates) > 0:
        first = candidates[0]
        if isinstance(first, dict):
            content = first.get("content")
            if isinstance(content, dict):
                if "parts" in content and content["parts"] and isinstance(content["parts"], list):
                    first_part = content["parts"][0]
                    text = first_part.get("text", "")
                    if text:
                        print(f"DEBUG: Extracted text length: {len(text)}")
                        return text
                for key in ['text', 'output', 'result']:
                    if key in content:
                        return content[key]
                print(f"DEBUG: Candidate content: {content}")
    print("WARNING: No parts or text found in Gemini response.")
    print(f"DEBUG: Full response: {json.dumps(resp_json, indent=2)[:2000]}")
    return ""

def strip_markdown_fences(raw: str) -> str:
    """Remove markdown code fences like ```json ... ``` or ``` ... ```"""
    raw = raw.strip()
    raw = re.sub(r'^```(?:json|python|text)?\s*', '', raw, flags=re.IGNORECASE)
    raw = re.sub(r'\s*```$', '', raw)
    return raw.strip()

def extract_text_from_pdf(file_bytes: bytes) -> str:
    try:
        reader = PdfReader(io.BytesIO(file_bytes))
        text_pages = []
        for page in reader.pages:
            try:
                page_text = page.extract_text() or ""
            except Exception as e:
                print(f"WARNING: Error extracting page text: {e}")
                page_text = ""
            text_pages.append(page_text)
        full_text = "\n".join(text_pages)
        print(f"DEBUG: Extracted {len(full_text)} characters from PDF")
        return full_text
    except Exception as e:
        print(f"ERROR: PDF extraction failed: {e}")
        traceback.print_exc()
        return ""

def extract_skills_from_text(text: str) -> List[str]:
    max_chars = 3000
    truncated_text = text[:max_chars] if len(text) > max_chars else text
    prompt = (
        "Extract all technical skills (ONLY programming languages, frameworks, libraries, and tools) "
        "from the text below. Respond ONLY with a JSON array of strings, no explanations, no markdown fences. Example: [\"Python\", \"Django\"]\n\n"
        f"Text:\n{truncated_text}"
    )
    try:
        resp_json = call_gemini_rest(prompt, model="gemini-1.5-flash", max_output_tokens=512)
        raw = parse_gemini_response(resp_json).strip()
        raw = strip_markdown_fences(raw)
        print(f"DEBUG: Raw skills response: {raw[:300]}")
        if not raw:
            print("ERROR: Empty response from Gemini API")
            return []
    except Exception as e:
        print(f"ERROR: Gemini call failed: {e}")
        traceback.print_exc()
        return []
    skills = []
    if raw.startswith('[') and raw.endswith(']'):
        try:
            skills = json.loads(raw)
            print(f"DEBUG: Successfully parsed JSON array with {len(skills)} items")
        except Exception as parse_error:
            print(f"ERROR: JSON parsing failed: {parse_error}")
            skills = [s.strip().strip('"').strip("'") for s in raw.strip('[]').split(',') if s.strip()]
    else:
        skills = [s.strip().strip('"').strip("'") for s in raw.replace('\n', ',').split(',') if s.strip()]
    normalized = []
    for s in skills:
        if isinstance(s, str):
            ns = s.lower().strip()
            if ns and ns not in normalized:
                normalized.append(ns)
    print(f"DEBUG: Extracted {len(normalized)} skills: {normalized[:10]}")
    return normalized

def match_skills(resume_skills: List[str], job_skills: List[str]) -> Dict:
    rs = set([s.lower() for s in resume_skills])
    js = set([s.lower() for s in job_skills])
    intersection = rs & js
    missing = js - rs
    precision = len(intersection) / len(rs) if rs else 0.0
    recall = len(intersection) / len(js) if js else 0.0
    f1 = (2 * precision * recall) / (precision + recall) if (precision + recall) > 0 else 0.0
    overlap_score = len(intersection) / max(len(js), 1)
    score = math.floor(overlap_score * 100)
    return {
        "matched_skills": sorted(list(intersection)),
        "missing_skills": sorted(list(missing)),
        "resume_count": len(rs),
        "job_count": len(js),
        "precision": round(precision, 3),
        "recall": round(recall, 3),
        "f1": round(f1, 3),
        "score": score,
    }

@app.post("/extract-skills/")
async def extract_skills(file: UploadFile = File(...)):
    try:
        print(f"DEBUG: Received file: {file.filename}, content_type: {file.content_type}")
        content = await file.read()
        if not content:
            raise HTTPException(status_code=400, detail="Empty file")
        print(f"DEBUG: File size: {len(content)} bytes")
        resume_text = extract_text_from_pdf(content)
        if not resume_text.strip():
            raise HTTPException(status_code=400, detail="Could not extract text from PDF")
        skills = extract_skills_from_text(resume_text)
        return {"skills": skills, "text": resume_text[:2000]}
    except HTTPException:
        raise
    except Exception as e:
        print(f"FATAL ERROR in extract_skills: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Internal error: {str(e)}")

@app.post("/match-job/")
async def match_job(file: UploadFile = File(...), job_description: str = Form(...)):
    try:
        print(f"DEBUG: Received file: {file.filename}")
        print(f"DEBUG: Job description length: {len(job_description)}")
        content = await file.read()
        if not content:
            raise HTTPException(status_code=400, detail="Empty file")
        resume_text = extract_text_from_pdf(content)
        resume_skills = extract_skills_from_text(resume_text)
        job_skills = extract_skills_from_text(job_description)
        match = match_skills(resume_skills, job_skills)
        explain_prompt = (
            "Given the following resume skills and job-required skills, provide a short explanation (2-3 sentences) "
            "of the match and list the top 3 reasons the candidate is a good or poor fit. "
            "Return as pure JSON (no markdown fences) with keys 'explanation' (string) and 'reasons' (array of strings).\n\n"
            f"Resume skills: {resume_skills}\nJob skills: {job_skills}"
        )
        try:
            resp_json = call_gemini_rest(explain_prompt, model="gemini-1.5-flash", max_output_tokens=512)
            explanation_raw = parse_gemini_response(resp_json).strip()
            explanation_raw = strip_markdown_fences(explanation_raw)
            if explanation_raw.startswith('{'):
                explanation_data = json.loads(explanation_raw)
            else:
                explanation_data = {"explanation": explanation_raw, "reasons": []}
        except Exception as e:
            print(f"WARNING: Explanation generation failed: {e}")
            explanation_data = {"explanation": "Could not generate explanation", "reasons": []}
        return {
            "resume_skills": resume_skills,
            "job_skills": job_skills,
            "match": match,
            "explain": explanation_data
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"FATAL ERROR in match_job: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Internal error: {str(e)}")

@app.post("/ats-score/")
async def ats_score(file: UploadFile = File(...)):
    """
    Analyse a resume PDF and return an ATS (Applicant Tracking System) score
    with per-section breakdown and improvement suggestions.
    """
    try:
        print(f"DEBUG: ATS Score - received file: {file.filename}")
        content = await file.read()
        if not content:
            raise HTTPException(status_code=400, detail="Empty file")
        resume_text = extract_text_from_pdf(content)
        if not resume_text.strip():
            raise HTTPException(status_code=400, detail="Could not extract text from PDF")

        prompt = f"""You are an expert ATS (Applicant Tracking System) analyser.
Analyse the resume below and return a detailed ATS score as pure JSON (no markdown fences, no explanations outside JSON).

The JSON must have this exact structure:
{{
  "overall_score": <integer 0-100>,
  "grade": "<A+|A|B+|B|C+|C|D|F>",
  "summary": "<2-3 sentence summary of the resume quality>",
  "sections": {{
    "contact_info": {{ "score": <0-100>, "feedback": "<string>" }},
    "work_experience": {{ "score": <0-100>, "feedback": "<string>" }},
    "education": {{ "score": <0-100>, "feedback": "<string>" }},
    "skills": {{ "score": <0-100>, "feedback": "<string>" }},
    "keywords": {{ "score": <0-100>, "feedback": "<string>" }},
    "formatting": {{ "score": <0-100>, "feedback": "<string>" }}
  }},
  "improvements": [
    "<improvement suggestion 1>",
    "<improvement suggestion 2>",
    "<improvement suggestion 3>",
    "<improvement suggestion 4>",
    "<improvement suggestion 5>"
  ],
  "keywords_found": ["<keyword1>", "<keyword2>", "<keyword3>"],
  "keywords_missing": ["<keyword1>", "<keyword2>", "<keyword3>"]
}}

Resume text:
{resume_text[:4000]}
"""
        resp_json = call_gemini_rest(prompt, model="gemini-1.5-flash", max_output_tokens=1500, temperature=0.1)
        raw = parse_gemini_response(resp_json).strip()
        raw = strip_markdown_fences(raw)
        print(f"DEBUG: ATS raw response: {raw[:500]}")

        if not raw:
            raise HTTPException(status_code=502, detail="Empty response from Gemini")

        ats_data = json.loads(raw)
        return ats_data

    except json.JSONDecodeError as e:
        print(f"ERROR: Failed to parse ATS JSON: {e}")
        raise HTTPException(status_code=502, detail=f"Failed to parse ATS response from AI: {str(e)}")
    except HTTPException:
        raise
    except Exception as e:
        print(f"FATAL ERROR in ats_score: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Internal error: {str(e)}")

class EvalRequest(BaseModel):
    resume_text: str
    job_description: str
    ground_truth_skills: List[str]

@app.post("/evaluate-matching/")
async def evaluate_matching(body: EvalRequest):
    try:
        pred_resume_skills = extract_skills_from_text(body.resume_text)
        job_skills = extract_skills_from_text(body.job_description)
        match = match_skills(pred_resume_skills, job_skills)
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
            "precision": round(precision, 3),
            "recall": round(recall, 3),
            "f1": round(f1, 3),
        }
    except Exception as e:
        print(f"FATAL ERROR in evaluate_matching: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Internal error: {str(e)}")
