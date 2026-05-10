from typing import List

import uvicorn
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware

from jd_parser import parse_job_description
from report import apply_override, generate_report
from resume_parser import extract_text_from_file, parse_resume
from scorer import score_candidate

app = FastAPI(title="HR Shortlisting Agent API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class MockUploadedFile:
    def __init__(self, filename: str, content: bytes):
        self.name = filename
        self._content = content

    def read(self) -> bytes:
        return self._content


@app.get("/")
def root():
    return {"status": "ok", "message": "HR Shortlisting Agent API is running"}


@app.post("/analyze")
async def analyze(jd_text: str = Form(...), files: List[UploadFile] = File(...)):
    parsed_jd = parse_job_description(jd_text)
    if not parsed_jd:
        raise HTTPException(
            status_code=400,
            detail="Failed to parse job description. Make sure it includes a role title, required skills, and responsibilities.",
        )

    scored_list = []
    errors = []

    for file in files:
        try:
            content = await file.read()
            resume_text = extract_text_from_file(MockUploadedFile(file.filename, content))
            parsed = parse_resume(resume_text)
            if not parsed:
                errors.append(f"{file.filename}: could not parse resume")
                continue
            scored = score_candidate(parsed, parsed_jd)
            if not scored:
                errors.append(f"{file.filename}: could not score candidate")
                continue
            scored_list.append(scored)
        except Exception as e:
            errors.append(f"{file.filename}: {str(e)}")

    if not scored_list:
        raise HTTPException(
            status_code=400,
            detail=f"No candidates could be scored. Errors: {'; '.join(errors)}",
        )

    return {"report": generate_report(scored_list, parsed_jd["title"]), "errors": errors}


@app.post("/override")
async def override_score(payload: dict):
    required = {"report", "candidate_name", "dimension_key", "new_score", "reason"}
    missing = required - payload.keys()
    if missing:
        raise HTTPException(status_code=400, detail=f"Missing fields: {', '.join(missing)}")

    return apply_override(
        payload["report"],
        payload["candidate_name"],
        payload["dimension_key"],
        int(payload["new_score"]),
        payload["reason"],
    )


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
