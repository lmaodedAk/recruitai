import axios from "axios";
import CandidateCard from "./CandidateCard";
import { Download, RotateCcw } from "lucide-react";
import { generatePDF } from "../utils/generatePDF";

const API = import.meta.env.VITE_API_URL || "http://localhost:8000";

export default function ResultsPage({ report, setReport, onReset }) {
  async function handleOverride(candidateName, dimensionKey, newScore, reason) {
    const res = await axios.post(`${API}/override`, {
      report,
      candidate_name: candidateName,
      dimension_key: dimensionKey,
      new_score: newScore,
      reason,
    });
    setReport(res.data);
  }

  function handleExportJSON() {
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "shortlist_report.json";
    a.click();
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>📊 Shortlist Report</h1>
          <p style={styles.subtitle}>Generated at {report.generated_at?.slice(0, 19).replace("T", " ")} UTC</p>
        </div>
        <div style={styles.actions}>
          <button style={styles.exportBtn} onClick={() => generatePDF(report)}>
            <Download size={16} style={{ marginRight: 8 }} />
            Export PDF
          </button>
          <button style={{ ...styles.exportBtn, background: "#111827", border: "1px solid #1f2937", color: "#a0aec0" }} onClick={handleExportJSON}>
            <Download size={16} style={{ marginRight: 8 }} />
            Export JSON
          </button>
          <button style={styles.resetBtn} onClick={onReset}>
            <RotateCcw size={16} style={{ marginRight: 8 }} />
            Start Over
          </button>
        </div>
      </div>

      <div style={styles.metricsRow}>
        {[
          { label: "Role", value: report.job_title },
          { label: "Total Analyzed", value: report.total_candidates },
          { label: "Strong Hire", value: report.shortlisted_count },
          { label: "Top Candidate", value: report.top_candidate },
        ].map((m, i) => (
          <div key={i} style={styles.metricCard}>
            <div style={styles.metricLabel}>{m.label}</div>
            <div style={styles.metricValue}>{m.value}</div>
          </div>
        ))}
      </div>

      <details style={styles.rubricToggle}>
        <summary style={styles.rubricSummary}>📏 Scoring Rubric Reference</summary>
        <table style={styles.table}>
          <thead>
            <tr>{["Dimension","Weight","0 – Poor","5 – Average","10 – Excellent"].map(h=><th key={h} style={styles.th}>{h}</th>)}</tr>
          </thead>
          <tbody>
            {[
              ["Skills Match","30%","< 30% match","50–70% match","> 85% match"],
              ["Experience Relevance","25%","Unrelated domain","Adjacent domain","Exact domain & seniority"],
              ["Education & Certs","15%","Does not meet minimum","Meets minimum","Exceeds + extra certs"],
              ["Project / Portfolio","20%","No evidence","1–2 generic projects","Strong relevant portfolio"],
              ["Communication Quality","10%","Poor structure","Adequate clarity","Crisp, structured, impactful"],
            ].map((row,i)=>(
              <tr key={i}>{row.map((cell,j)=><td key={j} style={styles.td}>{cell}</td>)}</tr>
            ))}
          </tbody>
        </table>
      </details>

      <div style={styles.candidatesList}>
        {report.candidates.map((candidate, i) => (
          <CandidateCard key={i} candidate={candidate} rank={i + 1} onOverride={handleOverride} />
        ))}
      </div>
    </div>
  );
}

const styles = {
  container: { maxWidth: 1100, margin: "0 auto", padding: "40px 24px" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 32 },
  title: { fontSize: "2rem", fontWeight: 800, background: "linear-gradient(90deg, #4f8ef7, #a78bfa)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" },
  subtitle: { color: "#718096", fontSize: "0.85rem", marginTop: 4 },
  actions: { display: "flex", gap: 10 },
  exportBtn: { display: "flex", alignItems: "center", background: "#111827", border: "1px solid #4f8ef7", color: "#4f8ef7", padding: "10px 18px", borderRadius: 8, cursor: "pointer", fontWeight: 600, fontSize: "0.9rem" },
  resetBtn: { display: "flex", alignItems: "center", background: "#111827", border: "1px solid #1f2937", color: "#a0aec0", padding: "10px 18px", borderRadius: 8, cursor: "pointer", fontWeight: 600, fontSize: "0.9rem" },
  metricsRow: { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 32 },
  metricCard: { background: "#111827", border: "1px solid #1f2937", borderRadius: 12, padding: "20px 24px" },
  metricLabel: { color: "#718096", fontSize: "0.8rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 },
  metricValue: { color: "#ffffff", fontSize: "1.2rem", fontWeight: 700 },
  rubricToggle: { background: "#111827", border: "1px solid #1f2937", borderRadius: 12, padding: 20, marginBottom: 32 },
  rubricSummary: { color: "#a0aec0", cursor: "pointer", fontWeight: 600, fontSize: "0.9rem" },
  table: { width: "100%", borderCollapse: "collapse", marginTop: 16 },
  th: { background: "#1f2937", color: "#a0aec0", padding: "10px 14px", fontSize: "0.8rem", textAlign: "left", fontWeight: 600 },
  td: { color: "#e2e8f0", padding: "10px 14px", fontSize: "0.85rem", borderBottom: "1px solid #1f2937" },
  candidatesList: { display: "flex", flexDirection: "column", gap: 16 },
};
