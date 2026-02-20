export const API_BASE = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

export async function extractSkillsFromFile(file: File) {
  const form = new FormData();
  form.append('file', file);

  const res = await fetch(`${API_BASE}/extract-skills/`, {
    method: 'POST',
    body: form,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || `API error ${res.status}`);
  }
  return res.json();
}

export async function matchJobWithFile(file: File, jobDescription: string) {
  const form = new FormData();
  form.append('file', file);
  form.append('job_description', jobDescription);

  const res = await fetch(`${API_BASE}/match-job/`, {
    method: 'POST',
    body: form,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || `API error ${res.status}`);
  }
  return res.json();
}

export async function getAtsScore(file: File) {
  const form = new FormData();
  form.append('file', file);

  const res = await fetch(`${API_BASE}/ats-score/`, {
    method: 'POST',
    body: form,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || `API error ${res.status}`);
  }
  return res.json();
}

export async function evaluateMatching(body: {
  resume_text: string;
  job_description: string;
  ground_truth_skills: string[];
}) {
  const res = await fetch(`${API_BASE}/evaluate-matching/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || `API error ${res.status}`);
  }
  return res.json();
}
