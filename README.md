# RecruitAI — HR Resume Shortlisting Agent

A working AI agent that helps HR teams screen resumes faster. You paste a job description, upload candidate resumes (PDF, DOCX, TXT, or LinkedIn JSON), and the agent scores each candidate across 5 dimensions, ranks them, and lets you override any score with a logged reason.
## What it does
- Parses a job description and extracts required skills, experience, education requirements
- Accepts resumes in PDF, DOCX, TXT, or LinkedIn profile JSON format
- Scores each candidate across 5 weighted dimensions using a strict rubric
- Ranks all candidates by weighted total score
- Lets HR override any dimension score with a reason — every change is logged
- Exports the full report as JSON
## Agent Architecture
```
Input Layer
├── Job Description (pasted text)
└── Resumes (PDF / DOCX / TXT / LinkedIn JSON)
         ↓
Parsing Layer
├── jd_parser.py        → structured JD dict (title, skills, experience, education)
└── resume_parser.py    → candidate profile dict + text extraction from files
         ↓
Scoring Engine
└── scorer.py           → 5-dimension scores with rubric enforcement, weighted total in Python
         ↓
Report Generator
└── report.py           → ranked shortlist, shortlisted count, top candidate
         ↓
HR Override Module
└── report.py           → apply_override() updates score, recalculates total, logs change
         ↓
API Layer
└── backend/main.py     → FastAPI with /analyze and /override endpoints
         ↓
Frontend
└── React (Vite)        → InputPage → LoadingPage → ResultsPage with CandidateCard
```

## Scoring Rubric
| Dimension | Weight | 0 – Poor | 5 – Average | 10 – Excellent |
|---|---|---|---|---|
| Skills Match | 30% | < 30% skills match | 50–70% skills match | > 85% skills match |
| Experience Relevance | 25% | Unrelated domain | Adjacent domain | Exact domain & seniority |
| Education & Certs | 15% | Does not meet minimum | Meets minimum | Exceeds + extra certs |
| Project / Portfolio | 20% | No evidence | 1–2 generic projects | Strong relevant portfolio |
| Communication Quality | 10% | Poor structure/grammar | Adequate clarity | Crisp, structured, impactful |

Weighted total is calculated in Python, not by the LLM. Hire recommendation thresholds: **≥70 = Strong Hire**, **50–69 = Consider**, **<50 = No Hire**.

## Tech Stack & Decision Log
| Layer | Choice | Reason |
|---|---|---|
| LLM | Llama 3.3 70B via Groq API | Free tier with generous limits, fast inference, strong instruction following, reliable JSON output mode |
| Agent Pattern | Custom sequential pipeline | No framework overhead, every step is transparent and easy to explain, straightforward to debug |
| Backend | FastAPI + Uvicorn | Lightweight, async, automatic docs at `/docs`, easy to run locally |
| Frontend | React + Vite | Fast dev server, component-based, no framework bloat |
| File Parsing | pdfplumber + python-docx | Best text extraction for PDF and DOCX without layout issues |
| Score Calculation | Python arithmetic | LLM only provides scores and justifications, all math happens in code to prevent hallucinated totals |
| Output | JSON export | Structured, portable, easy for evaluators to verify |

## Setup
### Backend

```bash
cd backend
pip install -r requirements.txt
cp .env.example .env
# Add your GROQ_API_KEY to .env
uvicorn main:app --reload --port 8000
```

Get a free Groq API key at [console.groq.com](https://console.groq.com)

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Open **http://localhost:5173**

## Security Risk Mitigation

This section is mandatory per the assignment brief. Every risk from the spec is addressed below.

| Risk | Description | What we did |
|---|---|---|
| Prompt Injection | Malicious resume content manipulating agent behaviour | User input only appears in the `user` role message, never in system prompts. JSON output mode constrains what the model can return. Structured schema means injected instructions cannot escape the response format. |
| Data Privacy / PII | Resume data contains personal information | All processing is in-memory only. No resume data is written to disk, stored in a database, or logged anywhere. Candidate names and emails never appear in system prompts sent to the LLM. |
| API Key Exposure | Groq API key leaked in code or repository | Key stored in `.env` file only. `.env` is in `.gitignore` and never committed. `.env.example` ships with a placeholder. Key is never hardcoded anywhere in the codebase. |
| Hallucination Risk | LLM generating wrong scores or fabricating candidate details | JSON mode enforces output schema. Weighted total and hire recommendation are computed entirely in Python — the LLM only provides raw dimension scores and text justifications. HR override exists specifically to correct any wrong LLM judgements. `temperature=0.1` reduces randomness. |
| Unauthorised Access | Anyone triggering the agent endpoint | Local deployment only — no public endpoint exposed. For production: add API key authentication or OAuth to the FastAPI endpoints, plus rate limiting per IP. |
| Email Spoofing | Not applicable to Task 1 | Task 1 has no email sending functionality. Noted for completeness. |
## File Structure
```
Task_1/
├── backend/
│   ├── main.py            # FastAPI server — /analyze and /override endpoints
│   ├── jd_parser.py       # Extracts structured requirements from job description
│   ├── resume_parser.py   # Parses resumes and LinkedIn JSON into candidate profiles
│   ├── scorer.py          # Scores candidate against JD using rubric
│   ├── report.py          # Generates ranked report and handles HR overrides
│   ├── requirements.txt
│   ├── .env.example
│   └── .gitignore
└── frontend/
    ├── src/
    │   ├── components/
    │   │   ├── InputPage.jsx      # JD input + resume upload
    │   │   ├── LoadingPage.jsx    # Progress screen during analysis
    │   │   ├── ResultsPage.jsx    # Report view with metrics and export
    │   │   └── CandidateCard.jsx  # Per-candidate scores, rubric, override form
    │   ├── App.jsx
    │   ├── App.css
    │   └── main.jsx
    ├── index.html
    ├── package.json
    └── vite.config.js
```
## Sample Output

```json
{
  "job_title": "Senior Python Backend Engineer",
  "generated_at": "2026-05-09T14:22:31",
  "total_candidates": 3,
  "shortlisted_count": 1,
  "top_candidate": "Akshat Jain",
  "candidates": [
    {
      "candidate_name": "Akshat Jain",
      "scores": {
        "skills_match": { "score": 8, "justification": "Candidate has Python, FastAPI, PostgreSQL, Docker — 80% of required skills present. Missing Kubernetes production experience." },
        "experience_relevance": { "score": 7, "justification": "4 years in FinTech backend development, close to the 5 years required. Domain is directly relevant." },
        "education_certs": { "score": 6, "justification": "B.Tech Computer Science meets the minimum. No additional certifications listed." },
        "project_portfolio": { "score": 8, "justification": "Fraud detection system and API gateway project directly relevant to backend engineering role." },
        "communication_quality": { "score": 7, "justification": "Resume is well structured and clearly written." }
      },
      "weighted_total": 73.5,
      "hire_recommendation": "Strong Hire",
      "summary": "Strong backend engineering candidate with relevant domain experience and good project portfolio.",
      "override_log": [
        {
          "dimension": "experience_relevance",
          "old_score": 7,
          "new_score": 9,
          "reason": "Candidate has additional freelance experience not captured in resume",
          "overridden_by": "HR",
          "timestamp": "2026-05-09T14:35:12"
        }
      ]
    }
  ]
}
```
## How to Demo

1. Start the backend and frontend using the setup commands above
2. Paste a software engineering job description into the left panel
3. Upload 2–3 resumes in PDF or DOCX format (try one strong match, one partial match, one unrelated)
4. Click **Analyze Candidates**
5. Watch the ranked results appear with green/yellow/red recommendation badges
6. Expand any candidate card to see dimension scores, rubric criteria, and justifications
7. Use the override slider to adjust a score, enter a reason, and save
8. The override log appears immediately below the scores
9. Click **Export JSON** to download the full report
