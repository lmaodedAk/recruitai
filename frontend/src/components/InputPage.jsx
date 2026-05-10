import { useState, useRef } from "react";
import axios from "axios";
import { Upload, FileText, Briefcase, ArrowRight, X } from "lucide-react";

const API = "https://recruitai-uu8w.onrender.com";

export default function InputPage({ onResults }) {
  const [jdText, setJdText] = useState("");
  const [files, setFiles] = useState([]);
  const [error, setError] = useState("");
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const fileRef = useRef();

  function handleDrop(e) {
    e.preventDefault();
    setDragging(false);
    const dropped = Array.from(e.dataTransfer.files).filter(f =>
      f.name.endsWith(".pdf") || f.name.endsWith(".docx") ||
      f.name.endsWith(".txt") || f.name.endsWith(".json")
    );
    setFiles(prev => [...prev, ...dropped]);
  }

  function removeFile(index) {
    setFiles(prev => prev.filter((_, i) => i !== index));
  }

  async function handleAnalyze() {
    if (!jdText.trim() || jdText.trim().length < 50) {
      return setError("Please paste a complete job description (at least 50 characters).");
    }
    if (files.length === 0) {
      return setError("Please upload at least one resume.");
    }

    setError("");
    setLoading(true);

    const formData = new FormData();
    formData.append("jd_text", jdText);
    files.forEach(f => formData.append("files", f));

    try {
      const res = await axios.post(`${API}/analyze`, formData, { timeout: 180000 });
      onResults(res.data.report || res.data);
    } catch (e) {
      if (e.code === "ECONNABORTED") {
        setError("Request timed out. Try with fewer resumes or a shorter JD.");
      } else {
        const detail = e?.response?.data?.detail;
        const msg = typeof detail === "string"
          ? detail
          : Array.isArray(detail)
          ? detail.map(d => d.msg || JSON.stringify(d)).join("; ")
          : "Analysis failed. Make sure the backend is running on port 8000.";
        setError(`Error ${e?.response?.status ?? ""}: ${msg}`);
      }
      setLoading(false);
    }
  }

  const ready = jdText.trim().length > 50 && files.length >= 1;

  return (
    <div style={s.page}>
      <nav style={s.nav}>
        <div style={s.navLogo}>
          <div style={s.navDot} />
          <span style={s.navBrand}>RecruitAI</span>
        </div>
      </nav>

      <div style={s.body}>
        <div style={s.hero}>
          <h1 style={s.h1}>Smarter Hiring,<br />Faster Decisions</h1>
          <p style={s.heroSub}>
            Upload a job description and candidate resumes. Get an AI-ranked shortlist
            with scoring breakdown and override controls in seconds.
          </p>
          <div style={s.heroStats}>
            {[
              ["5 Dimensions", "Scored per candidate"],
              ["Weighted Rubric", "Transparent scoring"],
              ["HR Override", "Human in the loop"],
            ].map(([a, b], i) => (
              <div key={i} style={s.statItem}>
                <div style={s.statA}>{a}</div>
                <div style={s.statB}>{b}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={s.card}>
          <div style={s.section}>
            <div style={s.sectionHead}>
              <Briefcase size={15} color="#4f8ef7" />
              <span style={s.sectionLabel}>Job Description</span>
              <span style={s.required}>Required</span>
            </div>
            <textarea
              style={s.textarea}
              placeholder="Paste the full job description here — include role title, required skills, experience, and responsibilities..."
              value={jdText}
              onChange={e => setJdText(e.target.value)}
            />
            <div style={s.charRow}>
              <span style={{ color: jdText.length > 50 ? "#48bb78" : "#4a5568" }}>
                {jdText.length > 50 ? "✓ Looks good" : "Paste at least a paragraph"}
              </span>
              <span style={s.charCount}>{jdText.length} chars</span>
            </div>
          </div>

          <div style={s.divider} />

          <div style={s.section}>
            <div style={s.sectionHead}>
              <Upload size={15} color="#4f8ef7" />
              <span style={s.sectionLabel}>Candidate Resumes</span>
              <span style={s.required}>PDF, DOCX, TXT, JSON</span>
            </div>

            <div
              style={{ ...s.dropzone, borderColor: dragging ? "#4f8ef7" : "#1f2937", background: dragging ? "#4f8ef711" : "#0a0e1a" }}
              onClick={() => fileRef.current.click()}
              onDragOver={e => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
            >
              <div style={s.dropIcon}><Upload size={22} color="#4f8ef7" /></div>
              <div style={s.dropText}>
                <span style={{ color: "#4f8ef7", fontWeight: 600 }}>Click to browse</span>
                <span style={{ color: "#718096" }}> or drag and drop</span>
              </div>
              <div style={s.dropHint}>PDF, DOCX, TXT, LinkedIn JSON · Multiple files allowed</div>
              <input
                ref={fileRef}
                type="file"
                multiple
                accept=".pdf,.docx,.txt,.json"
                style={{ display: "none" }}
                onChange={e => setFiles(prev => [...prev, ...Array.from(e.target.files)])}
              />
            </div>

            {files.length > 0 && (
              <div style={s.fileGrid}>
                {files.map((f, i) => (
                  <div key={i} style={s.fileChip}>
                    <FileText size={13} color="#4f8ef7" />
                    <span style={s.fileName}>{f.name}</span>
                    <button style={s.removeBtn} onClick={e => { e.stopPropagation(); removeFile(i); }}>
                      <X size={12} color="#718096" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {error && <div style={s.errorBox}>⚠ {error}</div>}

          <button
            style={{ ...s.cta, opacity: (ready && !loading) ? 1 : 0.5, cursor: (ready && !loading) ? "pointer" : "not-allowed" }}
            onClick={handleAnalyze}
            disabled={loading}
          >
            {loading ? (
              <><div style={s.btnSpinner} /><span>Analyzing...</span></>
            ) : (
              <><span>Analyze Candidates</span><ArrowRight size={18} /></>
            )}
          </button>

          {!ready && !loading && (
            <p style={s.ctaHint}>
              {!jdText.trim() ? "Paste a job description to continue" : files.length === 0 ? "Upload at least one resume" : "Ready to analyze"}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

const s = {
  page: { minHeight: "100vh", background: "#080b14" },
  nav: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "18px 40px", borderBottom: "1px solid #0f1623" },
  navLogo: { display: "flex", alignItems: "center", gap: 10 },
  navDot: { width: 8, height: 8, borderRadius: "50%", background: "linear-gradient(135deg, #4f8ef7, #a78bfa)" },
  navBrand: { fontWeight: 700, fontSize: "1rem", color: "#ffffff", letterSpacing: "-0.01em" },
  body: { maxWidth: 780, margin: "0 auto", padding: "60px 24px 80px" },
  hero: { textAlign: "center", marginBottom: 48 },
  h1: { fontSize: "3rem", fontWeight: 800, lineHeight: 1.15, letterSpacing: "-0.03em", color: "#ffffff", marginBottom: 18 },
  heroSub: { color: "#718096", fontSize: "1rem", lineHeight: 1.7, maxWidth: 520, margin: "0 auto 32px" },
  heroStats: { display: "flex", justifyContent: "center", gap: 40 },
  statItem: { textAlign: "center" },
  statA: { fontSize: "0.85rem", fontWeight: 700, color: "#4f8ef7", marginBottom: 2 },
  statB: { fontSize: "0.75rem", color: "#4a5568" },
  card: { background: "#0d1117", border: "1px solid #161b27", borderRadius: 18, padding: 36, boxShadow: "0 0 0 1px #ffffff08, 0 32px 64px -12px #00000080" },
  section: { marginBottom: 4 },
  sectionHead: { display: "flex", alignItems: "center", gap: 8, marginBottom: 12 },
  sectionLabel: { fontSize: "0.82rem", fontWeight: 700, color: "#a0aec0", textTransform: "uppercase", letterSpacing: "0.06em" },
  required: { marginLeft: "auto", fontSize: "0.72rem", color: "#4a5568", background: "#0f1623", padding: "2px 8px", borderRadius: 20, border: "1px solid #1f2937" },
  textarea: { width: "100%", height: 200, background: "#080b14", border: "1px solid #161b27", borderRadius: 10, color: "#e2e8f0", padding: "14px 16px", fontSize: "0.9rem", resize: "vertical", outline: "none", lineHeight: 1.65, fontFamily: "inherit", transition: "border-color 0.2s" },
  charRow: { display: "flex", justifyContent: "space-between", marginTop: 6, fontSize: "0.75rem" },
  charCount: { color: "#4a5568" },
  divider: { height: 1, background: "#0f1623", margin: "24px 0" },
  dropzone: { border: "1.5px dashed", borderRadius: 10, padding: "28px 20px", textAlign: "center", cursor: "pointer", transition: "all 0.2s", marginBottom: 14 },
  dropIcon: { width: 44, height: 44, borderRadius: 10, background: "#4f8ef711", border: "1px solid #4f8ef722", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px" },
  dropText: { fontSize: "0.9rem", marginBottom: 4 },
  dropHint: { fontSize: "0.75rem", color: "#4a5568" },
  fileGrid: { display: "flex", flexWrap: "wrap", gap: 8 },
  fileChip: { display: "flex", alignItems: "center", gap: 7, background: "#0f1623", border: "1px solid #1f2937", borderRadius: 8, padding: "6px 10px" },
  fileName: { fontSize: "0.8rem", color: "#a0aec0", maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  removeBtn: { background: "none", border: "none", cursor: "pointer", display: "flex", padding: 0 },
  errorBox: { background: "#fc818111", border: "1px solid #fc818133", color: "#fc8181", borderRadius: 8, padding: "12px 16px", fontSize: "0.85rem", marginBottom: 16 },
  cta: { width: "100%", padding: "15px 24px", marginTop: 24, background: "#ffffff", color: "#080b14", border: "none", borderRadius: 10, fontSize: "0.95rem", fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 10, transition: "opacity 0.2s" },
  btnSpinner: { width: 18, height: 18, border: "2px solid #08080b", borderTop: "2px solid #4f8ef7", borderRadius: "50%", animation: "spin 0.8s linear infinite", flexShrink: 0 },
  ctaHint: { textAlign: "center", fontSize: "0.78rem", color: "#4a5568", marginTop: 10 },
};
