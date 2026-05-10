# Scores a candidate against a JD using a weighted rubric
import json
import os
import time

from dotenv import load_dotenv
from groq import Groq

load_dotenv()
client = Groq(api_key=os.getenv("GROQ_API_KEY"))

WEIGHTS = {
    "skills_match":          0.30,
    "experience_relevance":  0.25,
    "education_certs":       0.15,
    "project_portfolio":     0.20,
    "communication_quality": 0.10,
}


def score_candidate(parsed_candidate: dict, parsed_jd: dict) -> dict:
    system_prompt = """You are a strict, unbiased HR evaluator. You score candidates against job descriptions using a fixed rubric.

RUBRIC (follow exactly):

skills_match (30% weight):
- 0-3: Less than 30% of required skills present
- 4-6: 50-70% of required skills present
- 7-10: More than 85% of required skills present
Count the required_skills list from the JD. Count how many the candidate actually has. Calculate the percentage. Score accordingly.

experience_relevance (25% weight):
- 0-3: Unrelated domain entirely
- 4-6: Adjacent domain, some overlap
- 7-10: Exact domain match AND meets or exceeds experience_years required
If experience_years is less than required, cap this score at 6 maximum.

education_certs (15% weight):
- 0-3: Does not meet minimum education requirement
- 4-6: Meets minimum exactly
- 7-10: Exceeds minimum OR has additional relevant certifications

project_portfolio (20% weight):
- 0-3: No projects or completely irrelevant projects
- 4-6: 1-2 generic projects with weak relevance
- 7-10: Strong projects directly relevant to the role with measurable impact

communication_quality (10% weight):
- Use the communication_quality_score field from the candidate profile directly
- Map it: 1-3 → score 2, 4-5 → score 4, 6-7 → score 6, 8 → score 7, 9 → score 8, 10 → score 9

STRICT RULES:
- Never give 10/10 unless the evidence is exceptional and explicitly stated
- A candidate missing more than 40% of required skills MUST score below 5 on skills_match
- Scores must differ between candidates — if two candidates have different profiles, their scores must be different
- Cite specific evidence from the candidate profile for every justification
- Return ONLY valid JSON, no markdown"""

    user_message = f"""Evaluate this candidate against this job description.

JOB DESCRIPTION:
Title: {parsed_jd.get('title')}
Required Skills: {', '.join(parsed_jd.get('required_skills', []))}
Preferred Skills: {', '.join(parsed_jd.get('preferred_skills', []))}
Experience Required: {parsed_jd.get('experience_years')} years
Education Minimum: {parsed_jd.get('education_minimum')}
Key Responsibilities: {', '.join(parsed_jd.get('key_responsibilities', []))}

CANDIDATE:
Name: {parsed_candidate.get('name')}
Skills: {', '.join(parsed_candidate.get('skills', []))}
Experience Years: {parsed_candidate.get('experience_years')}
Experience Domains: {', '.join(parsed_candidate.get('experience_domains', []))}
Education: {parsed_candidate.get('education')}
Certifications: {', '.join(parsed_candidate.get('certifications', []))}
Projects: {json.dumps(parsed_candidate.get('projects', []))}
Communication Quality Score: {parsed_candidate.get('communication_quality_score')}

Return this JSON structure:
{{
  "candidate_name": "string",
  "scores": {{
    "skills_match": {{"score": int 0-10, "justification": "cite specific skills present and missing"}},
    "experience_relevance": {{"score": int 0-10, "justification": "cite years and domain match"}},
    "education_certs": {{"score": int 0-10, "justification": "cite education and certs"}},
    "project_portfolio": {{"score": int 0-10, "justification": "cite specific projects and relevance"}},
    "communication_quality": {{"score": int 0-10, "justification": "based on communication_quality_score field"}}
  }},
  "summary": "one sentence overall assessment"
}}"""

    max_retries = 3
    for attempt in range(max_retries):
        try:
            response = client.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user",   "content": user_message},
                ],
                response_format={"type": "json_object"},
                temperature=0.1,
                timeout=30,
            )
            result = json.loads(response.choices[0].message.content)

            # Weighted total calculated in Python — never trust the LLM with arithmetic
            s = result["scores"]
            result["weighted_total"] = round(
                s["skills_match"]["score"]          * WEIGHTS["skills_match"]          +
                s["experience_relevance"]["score"]  * WEIGHTS["experience_relevance"]  +
                s["education_certs"]["score"]       * WEIGHTS["education_certs"]       +
                s["project_portfolio"]["score"]     * WEIGHTS["project_portfolio"]     +
                s["communication_quality"]["score"] * WEIGHTS["communication_quality"],
                2,
            ) * 10

            wt = result["weighted_total"]
            result["hire_recommendation"] = (
                "Strong Hire" if wt >= 70 else "Consider" if wt >= 50 else "No Hire"
            )
            result["override_log"] = []
            return result

        except Exception as e:
            err = str(e)
            if "429" in err or "rate_limit" in err.lower():
                wait = (attempt + 1) * 15
                print(f"[scorer] Rate limited. Retrying in {wait}s...")
                time.sleep(wait)
                continue
            print(f"[scorer] Error: {e}")
            return None

    print("[scorer] Failed after max retries")
    return None
