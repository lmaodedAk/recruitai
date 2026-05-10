from datetime import datetime

WEIGHTS = {
    "skills_match":          0.30,
    "experience_relevance":  0.25,
    "education_certs":       0.15,
    "project_portfolio":     0.20,
    "communication_quality": 0.10,
}


def generate_report(scored_candidates: list, jd_title: str) -> dict:
    sorted_candidates = sorted(scored_candidates, key=lambda c: c.get("weighted_total", 0), reverse=True)
    return {
        "job_title":         jd_title,
        "generated_at":      datetime.utcnow().isoformat(),
        "total_candidates":  len(sorted_candidates),
        "shortlisted_count": sum(1 for c in sorted_candidates if c.get("hire_recommendation") == "Strong Hire"),
        "top_candidate":     sorted_candidates[0]["candidate_name"] if sorted_candidates else None,
        "candidates":        sorted_candidates,
    }


def apply_override(report: dict, candidate_name: str, dimension_key: str, new_score: int, reason: str) -> dict:
    target = next(
        (c for c in report["candidates"] if c["candidate_name"].strip().lower() == candidate_name.strip().lower()),
        None,
    )
    if target is None:
        return report

    old_score = target["scores"][dimension_key]["score"]
    target["scores"][dimension_key]["score"] = new_score

    s = target["scores"]
    target["weighted_total"] = round(
        s["skills_match"]["score"]          * WEIGHTS["skills_match"]          +
        s["experience_relevance"]["score"]  * WEIGHTS["experience_relevance"]  +
        s["education_certs"]["score"]       * WEIGHTS["education_certs"]       +
        s["project_portfolio"]["score"]     * WEIGHTS["project_portfolio"]     +
        s["communication_quality"]["score"] * WEIGHTS["communication_quality"],
        2,
    ) * 10

    wt = target["weighted_total"]
    target["hire_recommendation"] = "Strong Hire" if wt >= 70 else "Consider" if wt >= 50 else "No Hire"

    target["override_log"].append({
        "dimension":     dimension_key,
        "old_score":     old_score,
        "new_score":     new_score,
        "reason":        reason,
        "overridden_by": "HR",
        "timestamp":     datetime.utcnow().isoformat(),
    })

    report["shortlisted_count"] = sum(
        1 for c in report["candidates"] if c.get("hire_recommendation") == "Strong Hire"
    )
    return report
