from fastapi import FastAPI, UploadFile, File, HTTPException, Form
from PyPDF2 import PdfReader
import io
from pydantic import BaseModel
from typing import List, Dict
import math
from fastapi.middleware.cors import CORSMiddleware
import httpx
import os
import traceback
import json


app = FastAPI()


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


def call_gemini_rest(prompt: str, model: str = "gemini-2.5-flash", temperature: float = 0.0, max_output_tokens: int = 512) -> dict:
    """Call Gemini Generative Language REST API using v1beta endpoint with Gemini 2.5 models."""
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
        with httpx.Client(timeout=30.0) as client:
            r = client.post(url, json=payload)
            print(f"DEBUG: Status Code: {r.status_code}")
            if r.status_code != 200:
                print(f"DEBUG: Error Response: {r.text[:500]}")
            r.raise_for_status()
            response_json = r.json()
            
            # Print full response for debugging
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
    """Extract generated text from v1beta Gemini response with multiple fallback strategies."""
    if not isinstance(resp_json, dict):
        print("ERROR: Response is not a dictionary")
        return ""

    print(f"DEBUG: Response keys: {list(resp_json.keys())}")
    
    # Strategy 1: Standard v1beta structure: candidates[0].content.parts[0].text
    candidates = resp_json.get("candidates")
    if candidates and isinstance(candidates, list) and len(candidates) > 0:
        first = candidates[0]
        print(f"DEBUG: First candidate keys: {list(first.keys()) if isinstance(first, dict) else 'not a dict'}")
        
        if isinstance(first, dict):
            content = first.get("content")
            print(f"DEBUG: Content type: {type(content)}, keys: {list(content.keys()) if isinstance(content, dict) else 'N/A'}")
            
            if isinstance(content, dict):
                parts = content.get("parts")
                print(f"DEBUG: Parts type: {type(parts)}, length: {len(parts) if isinstance(parts, list) else 'N/A'}")
                
                if parts and isinstance(parts, list) and len(parts) > 0:
                    first_part = parts[0]
                    print(f"DEBUG: First part: {first_part}")
                    
                    text = first_part.get("text", "")
                    if text:
                        print(f"DEBUG: Extracted text length: {len(text)}")
                        return text
            
            # Strategy 2: Sometimes text is directly in content
            if isinstance(content, str):
                return content
    
    # Strategy 3: Check for 'text' or 'output' at top level
    if "text" in resp_json:
        return resp_json["text"]
    
    if "output" in resp_json:
        return resp_json["output"]

    print("WARNING: Could not parse response using any known structure")
    print(f"DEBUG: Full response: {json.dumps(resp_json, indent=2)[:2000]}")
    return ""


def extract_text_from_pdf(file_bytes: bytes) -> str:
    """Use PyPDF2 to extract text from PDF bytes."""
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
    """Use Gemini to extract skills from raw resume/job description text."""
    max_chars = 10000
    truncated_text = text[:max_chars] if len(text) > max_chars else text
    
    prompt = (
        "Extract all key technical skills from the text below. "
        "Include programming languages, libraries, frameworks, and tools. "
        "Return ONLY a JSON array format like this: [\"Python\", \"JavaScript\", \"React\"]\n\n"
        f"Text:\n{truncated_text}"
    )

    try:
        resp_json = call_gemini_rest(prompt, model="gemini-2.5-flash", max_output_tokens=1024)
        raw = parse_gemini_response(resp_json).strip()
        print(f"DEBUG: Raw skills response: {raw[:300]}")
        
        if not raw:
            print("ERROR: Empty response from Gemini API")
            return []
            
    except Exception as e:
        print(f"ERROR: Gemini call failed: {e}")
        traceback.print_exc()
        return []

    skills = []
    
    # Remove markdown code blocks if present
    raw = raw.replace('``````', '').strip()
    
    if raw.startswith('[') and raw.endswith(']'):
        try:
            skills = json.loads(raw)
            print(f"DEBUG: Successfully parsed JSON array with {len(skills)} items")
        except Exception as parse_error:
            print(f"ERROR: JSON parsing failed: {parse_error}")
            try:
                skills = eval(raw)
            except Exception as e:
                print(f"ERROR: Could not parse skills array with eval: {e}")
                skills = [s.strip().strip('"').strip("'") for s in raw.strip('[]').split(',') if s.strip()]
    else:
        # Split by commas or newlines
        skills = [s.strip().strip('"').strip("'") for s in raw.replace('\n', ',').split(',') if s.strip()]

    # Normalize skills
    normalized = []
    for s in skills:
        if isinstance(s, str):
            ns = s.lower().strip()
            if ns and ns not in normalized:
                normalized.append(ns)
    
    print(f"DEBUG: Extracted {len(normalized)} skills: {normalized[:10]}")
    return normalized


def match_skills(resume_skills: List[str], job_skills: List[str]) -> Dict:
    """Compute simple matching metrics and an overlap score."""
    rs = set([s.lower() for s in resume_skills])
    js = set([s.lower() for s in job_skills])
    intersection = rs & js
    
    precision = len(intersection) / len(rs) if rs else 0.0
    recall = len(intersection) / len(js) if js else 0.0
    f1 = (2 * precision * recall) / (precision + recall) if (precision + recall) > 0 else 0.0

    overlap_score = len(intersection) / max(len(js), 1)
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
    """Extract skills from a resume PDF file."""
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

        return {"skills": skills, "text": resume_text[:1000]}
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"FATAL ERROR in extract_skills: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Internal error: {str(e)}")


@app.post("/match-job/")
async def match_job(file: UploadFile = File(...), job_description: str = Form(...)):
    """Accept resume PDF and a job description text, return matched skills and score."""
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
            "Given the following resume skills and job-required skills, provide a short explanation (1-2 sentences) "
            "of the match and list the top 3 reasons the candidate is a good or poor fit. "
            "Return as JSON with keys 'explanation' (string) and 'reasons' (array of strings).\n\n"
            f"Resume skills: {resume_skills}\nJob skills: {job_skills}"
        )

        try:
            resp_json = call_gemini_rest(explain_prompt, model="gemini-2.5-flash", max_output_tokens=1024)
            explanation_raw = parse_gemini_response(resp_json).strip()
            
            explanation_raw = explanation_raw.replace('``````', '').strip()
            
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


class EvalRequest(BaseModel):
    resume_text: str
    job_description: str
    ground_truth_skills: List[str]


@app.post("/evaluate-matching/")
async def evaluate_matching(body: EvalRequest):
    """Evaluate matching by comparing predicted matched skills to ground-truth list."""
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
            "precision": precision,
            "recall": recall,
            "f1": f1,
        }
        
    except Exception as e:
        print(f"FATAL ERROR in evaluate_matching: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Internal error: {str(e)}")
