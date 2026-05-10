# Parses resume files and LinkedIn JSON into candidate profiles
import io
import json
import os
import time

from dotenv import load_dotenv
from groq import Groq

load_dotenv()
client = Groq(api_key=os.getenv("GROQ_API_KEY"))

SYSTEM_PROMPT = """You are an expert resume and LinkedIn profile parser.

Extract ONLY what is explicitly written. Do not infer or hallucinate skills.

RULES:
- skills: List ONLY skills explicitly mentioned by name. No guessing.
- experience_years: Total years of professional work experience only.
- experience_domains: Actual industries worked in (e.g. FinTech, Healthcare, E-commerce).
- education: Highest qualification with institution name.
- certifications: Only explicitly listed certifications. Empty array if none.
- projects: Only explicitly described projects. Empty array if none.
- communication_quality_score: 1-10. Score how well-written, structured and clear the document is.
  1-3 = poor grammar/structure, 4-6 = adequate, 7-8 = clear and professional, 9-10 = exceptional.

Return ONLY a valid JSON object. No markdown, no explanation."""


def parse_resume(resume_text: str) -> dict:
    user_message = f"""Extract the following fields from this resume and return them as a single JSON object:
- name (string): candidate's full name
- email (string or null): email address, null if not found
- skills (list of strings): all technical and soft skills mentioned
- experience_years (integer): total years of professional experience (use 0 if not mentioned)
- experience_domains (list of strings): industries or domains the candidate has worked in
- education (string): highest degree and institution
- certifications (list of strings): any certifications or courses listed
- projects (list of objects, each with "title" and "description"): notable projects described
- communication_quality_score (integer 1-10): assessment of clarity, structure, and grammar

Resume:
{resume_text}"""

    max_retries = 3
    for attempt in range(max_retries):
        try:
            response = client.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=[
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {"role": "user", "content": user_message},
                ],
                response_format={"type": "json_object"},
                timeout=30,
            )
            parsed = json.loads(response.choices[0].message.content)
            return {
                "name": str(parsed.get("name", "")),
                "email": parsed.get("email", None),
                "skills": list(parsed.get("skills", [])),
                "experience_years": int(parsed.get("experience_years", 0)),
                "experience_domains": list(parsed.get("experience_domains", [])),
                "education": str(parsed.get("education", "")),
                "certifications": list(parsed.get("certifications", [])),
                "projects": [
                    {"title": str(p.get("title", "")), "description": str(p.get("description", ""))}
                    for p in parsed.get("projects", [])
                ],
                "communication_quality_score": int(parsed.get("communication_quality_score", 5)),
            }

        except Exception as e:
            err = str(e)
            if "429" in err or "rate_limit" in err.lower():
                wait = (attempt + 1) * 15
                print(f"[resume_parser] Rate limited. Retrying in {wait}s...")
                time.sleep(wait)
                continue
            print(f"[resume_parser] Error: {e}")
            return None

    print("[resume_parser] Failed after max retries")
    return None


def extract_text_from_file(uploaded_file) -> str:
    filename = uploaded_file.name.lower()
    content = uploaded_file.read()

    try:
        if filename.endswith(".pdf"):
            import pdfplumber
            try:
                with pdfplumber.open(io.BytesIO(content)) as pdf:
                    pages = [page.extract_text() or "" for page in pdf.pages]
            except Exception as e:
                raise ValueError(f"Could not open PDF ({e}). File may be corrupted or password-protected.")
            text = "\n".join(pages).strip()
            if not text:
                raise ValueError(
                    "Scanned / image-only PDF — no text layer found. "
                    "Re-export as a text-based PDF, or save as DOCX / TXT."
                )
            return text

        elif filename.endswith(".docx"):
            import docx
            try:
                doc = docx.Document(io.BytesIO(content))
                text = "\n".join(p.text for p in doc.paragraphs).strip()
            except Exception as e:
                raise ValueError(f"Could not open DOCX ({e}). File may be corrupted.")
            if not text:
                raise ValueError("DOCX appears empty or contains only images.")
            return text

        elif filename.endswith(".txt"):
            try:
                return content.decode("utf-8")
            except UnicodeDecodeError:
                return content.decode("latin-1")

        elif filename.endswith(".json"):
            try:
                data = json.loads(content.decode("utf-8"))
            except Exception as e:
                raise ValueError(f"Invalid JSON ({e}).")
            lines = []
            if data.get("firstName") or data.get("lastName"):
                lines.append(f"Name: {data.get('firstName', '')} {data.get('lastName', '')}")
            if data.get("emailAddress"):
                lines.append(f"Email: {data['emailAddress']}")
            if data.get("headline"):
                lines.append(f"Headline: {data['headline']}")
            if data.get("summary"):
                lines.append(f"Summary: {data['summary']}")
            if data.get("positions"):
                lines.append("Experience:")
                for pos in data["positions"].get("values", []):
                    lines.append(
                        f"- {pos.get('title')} at {pos.get('company', {}).get('name', '')} "
                        f"({pos.get('startDate', {}).get('year', '')} - "
                        f"{pos.get('endDate', {}).get('year', 'Present')})"
                    )
                    if pos.get("summary"):
                        lines.append(f"  {pos['summary']}")
            if data.get("educations"):
                lines.append("Education:")
                for edu in data["educations"].get("values", []):
                    lines.append(
                        f"- {edu.get('degree', '')} in {edu.get('fieldOfStudy', '')} "
                        f"from {edu.get('schoolName', '')}"
                    )
            if data.get("skills"):
                skills = [s.get("skill", {}).get("name", "") for s in data["skills"].get("values", [])]
                lines.append(f"Skills: {', '.join(skills)}")
            if data.get("certifications"):
                certs = [c.get("name", "") for c in data["certifications"].get("values", [])]
                lines.append(f"Certifications: {', '.join(certs)}")
            text = "\n".join(lines).strip()
            if not text:
                raise ValueError(
                    "JSON does not match LinkedIn export format. "
                    "Expected keys: firstName, lastName, positions, skills, educations."
                )
            return text

        else:
            ext = filename.rsplit(".", 1)[-1] if "." in filename else "unknown"
            raise ValueError(f"Unsupported file type '.{ext}'. Upload a PDF, DOCX, TXT, or LinkedIn JSON.")

    except ValueError:
        raise
    except Exception as e:
        print(f"[extract_text_from_file] Unexpected error on {uploaded_file.name}: {e}")
        raise ValueError(f"Unexpected error reading file: {e}")
