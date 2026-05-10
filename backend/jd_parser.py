# Parses job description text into structured requirements
import json
import os
import time

from dotenv import load_dotenv
from groq import Groq

load_dotenv()
client = Groq(api_key=os.getenv("GROQ_API_KEY"))

SYSTEM_PROMPT = (
    "You are a precise HR analyst. Extract structured requirements from the job description provided. "
    "Return ONLY a valid JSON object. No markdown, no backticks, no explanation, nothing else."
)


def parse_job_description(jd_text: str) -> dict:
    user_message = f"""Extract the following fields from this job description and return them as a single JSON object:
- title (string): the job title
- required_skills (list of strings): mandatory technical/soft skills
- preferred_skills (list of strings): nice-to-have skills
- experience_years (integer): minimum years of experience required (use 0 if not mentioned)
- education_minimum (string): minimum education qualification required
- key_responsibilities (list of strings): main duties of the role

Job Description:
{jd_text}"""

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
                "title": str(parsed.get("title", "")),
                "required_skills": list(parsed.get("required_skills", [])),
                "preferred_skills": list(parsed.get("preferred_skills", [])),
                "experience_years": int(parsed.get("experience_years", 0)),
                "education_minimum": str(parsed.get("education_minimum", "")),
                "key_responsibilities": list(parsed.get("key_responsibilities", [])),
            }

        except Exception as e:
            err = str(e)
            if "429" in err or "rate_limit" in err.lower():
                wait = (attempt + 1) * 15
                print(f"[jd_parser] Rate limited. Retrying in {wait}s...")
                time.sleep(wait)
                continue
            print(f"[jd_parser] Error: {e}")
            return None

    print("[jd_parser] Failed after max retries")
    return None
