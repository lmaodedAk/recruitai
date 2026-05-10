import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

const dimLabels = {
  skills_match: "Skills Match",
  experience_relevance: "Experience Relevance",
  education_certs: "Education & Certs",
  project_portfolio: "Project / Portfolio",
  communication_quality: "Communication Quality",
};

const weights = {
  skills_match: "30%",
  experience_relevance: "25%",
  education_certs: "15%",
  project_portfolio: "20%",
  communication_quality: "10%",
};

const rubric = {
  skills_match: ["< 30% match", "50–70% match", "> 85% match"],
  experience_relevance: ["Unrelated domain", "Adjacent domain", "Exact domain & seniority"],
  education_certs: ["Below minimum", "Meets minimum", "Exceeds + extra certs"],
  project_portfolio: ["No evidence", "1–2 generic projects", "Strong relevant portfolio"],
  communication_quality: ["Poor structure", "Adequate clarity", "Crisp & impactful"],
};

export default function CandidateCard({ candidate, rank, onOverride }) {
  const [expanded, setExpanded] = useState(rank === 1);
  const [overrideDim, setOverrideDim] = useState("skills_match");
  const [overrideScore, setOverrideScore] = useState(0);
  const [overrideReason, setOverrideReason] = useState("");
  const [saving, setSaving] = useState(false);

  const rec = candidate.hire_recommendation;
  const recColor = rec === "Strong Hire" ? "#48bb78" : rec === "Consider" ? "#ecc94b" : "#fc8181";
  const wt = candidate.weighted_total;

  async function handleSaveOverride() {
    if (!overrideReason.trim()) return;
    setSaving(true);
    await onOverride(candidate.candidate_name, overrideDim, overrideScore, overrideReason);
    setOverrideReason("");
    setSaving(false);
  }

  return (
    <div style={styles.card}>
      <div style={styles.cardHeader} onClick={() => setExpanded(!expanded)}>
        <div style={styles.rankBadge}>#{rank}</div>
        <div style={styles.nameSection}>
          <div style={styles.candidateName}>{candidate.candidate_name}</div>
          <div style={styles.summary}>{candidate.summary}</div>
        </div>
        <div style={styles.scoreSection}>
          <div style={{ ...styles.scoreBig, color: recColor }}>{wt}</div>
          <div style={styles.scoreLabel}>/100</div>
          <div style={{ ...styles.recBadge, background: `${recColor}22`, color: recColor, border: `1px solid ${recColor}44` }}>
            {rec}
          </div>
        </div>
        <div style={styles.chevron}>
          {expanded ? <ChevronUp size={20} color="#718096" /> : <ChevronDown size={20} color="#718096" />}
        </div>
      </div>

      {expanded && (
        <div style={styles.expandedContent}>
          <div style={styles.divider} />

          <h3 style={styles.sectionTitle}>📊 Dimension Scores</h3>
          {Object.entries(candidate.scores).map(([key, dim]) => {
            const score = dim.score;
            const color = score >= 8 ? "#48bb78" : score >= 5 ? "#ecc94b" : "#fc8181";
            const badge = score >= 8 ? "Excellent" : score >= 5 ? "Average" : "Poor";
            const [poor, avg, excellent] = rubric[key] || ["—", "—", "—"];
            return (
              <div key={key} style={{ ...styles.dimCard, borderLeft: `4px solid ${color}` }}>
                <div style={styles.dimHeader}>
                  <div>
                    <span style={styles.dimName}>{dimLabels[key]}</span>
                    <span style={styles.weightTag}>Weight: {weights[key]}</span>
                  </div>
                  <div style={styles.dimScoreRight}>
                    <span style={{ ...styles.dimScore, color }}>{score}</span>
                    <span style={styles.dimScoreOf}>/10</span>
                    <span style={{ ...styles.dimBadge, background: `${color}22`, color, border: `1px solid ${color}44` }}>{badge}</span>
                  </div>
                </div>
                <div style={styles.progressTrack}>
                  <div style={{ ...styles.progressFill, width: `${score * 10}%` }} />
                </div>
                <div style={styles.rubricHint}>0 = {poor} · 5 = {avg} · 10 = {excellent}</div>
                <div style={styles.justification}>↳ {dim.justification}</div>
              </div>
            );
          })}

          {candidate.override_log?.length > 0 && (
            <>
              <h3 style={styles.sectionTitle}>📋 Override Log</h3>
              {candidate.override_log.map((entry, i) => (
                <div key={i} style={styles.logEntry}>
                  <strong>{dimLabels[entry.dimension]}</strong> changed {entry.old_score} → {entry.new_score} &nbsp;|&nbsp;
                  By: {entry.overridden_by} &nbsp;|&nbsp; {entry.timestamp?.slice(0, 19)}<br />
                  <span style={{ color: "#a0aec0" }}>Reason: {entry.reason}</span>
                </div>
              ))}
            </>
          )}

          <h3 style={styles.sectionTitle}>✏️ HR Override</h3>
          <div style={styles.overrideForm}>
            <div style={styles.formRow}>
              <div style={styles.formGroup}>
                <label style={styles.formLabel}>Dimension</label>
                <select
                  style={styles.select}
                  value={overrideDim}
                  onChange={(e) => { setOverrideDim(e.target.value); setOverrideScore(candidate.scores[e.target.value]?.score || 0); }}
                >
                  {Object.entries(dimLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div style={styles.formGroup}>
                <label style={styles.formLabel}>New Score: {overrideScore}/10</label>
                <input type="range" min={0} max={10} value={overrideScore}
                  onChange={(e) => setOverrideScore(Number(e.target.value))} style={styles.slider} />
              </div>
            </div>
            <div style={styles.formGroup}>
              <label style={styles.formLabel}>Reason for Override</label>
              <input type="text" style={styles.input}
                placeholder="Explain why you are overriding this score..."
                value={overrideReason} onChange={(e) => setOverrideReason(e.target.value)} />
            </div>
            <button style={{ ...styles.saveBtn, opacity: saving ? 0.6 : 1 }}
              onClick={handleSaveOverride} disabled={saving}>
              {saving ? "Saving..." : "💾 Save Override"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  card: { background: "#111827", border: "1px solid #1f2937", borderRadius: 14, overflow: "hidden" },
  cardHeader: { display: "flex", alignItems: "center", gap: 20, padding: "20px 24px", cursor: "pointer" },
  rankBadge: { background: "#1f2937", color: "#a0aec0", borderRadius: 8, padding: "6px 12px", fontWeight: 700, fontSize: "0.9rem", flexShrink: 0 },
  nameSection: { flex: 1 },
  candidateName: { fontSize: "1.1rem", fontWeight: 700, color: "#ffffff", marginBottom: 4 },
  summary: { fontSize: "0.82rem", color: "#718096", lineHeight: 1.4 },
  scoreSection: { display: "flex", alignItems: "center", gap: 8, flexShrink: 0 },
  scoreBig: { fontSize: "2rem", fontWeight: 800 },
  scoreLabel: { color: "#718096", fontSize: "0.9rem" },
  recBadge: { padding: "4px 12px", borderRadius: 20, fontSize: "0.78rem", fontWeight: 700 },
  chevron: { flexShrink: 0 },
  expandedContent: { padding: "0 24px 24px" },
  divider: { height: 1, background: "#1f2937", marginBottom: 24 },
  sectionTitle: { fontSize: "0.9rem", fontWeight: 700, color: "#a0aec0", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 16, marginTop: 24 },
  dimCard: { background: "#0a0e1a", border: "1px solid #1f2937", borderRadius: 10, padding: "16px 20px", marginBottom: 12 },
  dimHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  dimName: { fontWeight: 700, fontSize: "0.95rem", color: "#e2e8f0" },
  weightTag: { marginLeft: 10, background: "#1f2937", color: "#718096", fontSize: "0.72rem", padding: "2px 8px", borderRadius: 20 },
  dimScoreRight: { display: "flex", alignItems: "center", gap: 6 },
  dimScore: { fontSize: "1.6rem", fontWeight: 800 },
  dimScoreOf: { color: "#718096", fontSize: "0.85rem" },
  dimBadge: { padding: "2px 10px", borderRadius: 20, fontSize: "0.72rem", fontWeight: 700 },
  progressTrack: { background: "#1f2937", borderRadius: 10, height: 6, overflow: "hidden", marginBottom: 8 },
  progressFill: { height: "100%", background: "linear-gradient(90deg, #4f8ef7, #a78bfa)", borderRadius: 10, transition: "width 0.4s ease" },
  rubricHint: { fontSize: "0.75rem", color: "#4a5568", marginBottom: 8 },
  justification: { fontSize: "0.88rem", color: "#a0aec0", lineHeight: 1.5 },
  logEntry: { background: "#0a0e1a", border: "1px solid #1f2937", borderLeft: "4px solid #4f8ef7", borderRadius: 8, padding: "12px 16px", marginBottom: 10, fontSize: "0.85rem", color: "#e2e8f0", lineHeight: 1.8 },
  overrideForm: { background: "#0a0e1a", border: "1px solid #1f2937", borderRadius: 12, padding: 20 },
  formRow: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 16 },
  formGroup: { display: "flex", flexDirection: "column", gap: 8 },
  formLabel: { fontSize: "0.8rem", fontWeight: 600, color: "#a0aec0", textTransform: "uppercase", letterSpacing: "0.04em" },
  select: { background: "#111827", border: "1px solid #1f2937", color: "#e2e8f0", borderRadius: 8, padding: "10px 12px", fontSize: "0.9rem" },
  slider: { width: "100%", accentColor: "#4f8ef7" },
  input: { background: "#111827", border: "1px solid #1f2937", color: "#e2e8f0", borderRadius: 8, padding: "10px 12px", fontSize: "0.9rem", outline: "none" },
  saveBtn: { background: "linear-gradient(90deg, #4f8ef7, #a78bfa)", color: "white", border: "none", borderRadius: 8, padding: "12px 24px", fontWeight: 700, cursor: "pointer", fontSize: "0.9rem", marginTop: 8 },
};
