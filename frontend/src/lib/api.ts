export const API_BASE = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

export async function extractSkillsFromFile(file: File) {
  const form = new FormData();
  form.append('file', file);

  const res = await fetch(`${API_BASE}/extract-skills/`, {
    method: 'POST',
    body: form,
  });

  if (!res.ok) throw new Error(`API error ${res.status}`);
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

  if (!res.ok) throw new Error(`API error ${res.status}`);
  return res.json();
}

export async function evaluateMatching(body: any) {
  const res = await fetch(`${API_BASE}/evaluate-matching/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`API error ${res.status}`);
  return res.json();
}
