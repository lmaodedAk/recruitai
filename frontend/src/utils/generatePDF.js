import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export function generatePDF(report) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();

  // ── Header ──────────────────────────────────────────
  doc.setFillColor(15, 17, 26);
  doc.rect(0, 0, pageWidth, 40, "F");

  doc.setTextColor(79, 142, 247);
  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.text("RecruitAI", 14, 18);

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text("HR Resume Shortlisting Report", 14, 30);

  doc.setTextColor(160, 174, 192);
  doc.setFontSize(9);
  doc.text(`Generated: ${report.generated_at?.slice(0, 19).replace("T", " ")} UTC`, pageWidth - 14, 30, { align: "right" });

  // ── Summary Section ──────────────────────────────────
  doc.setTextColor(30, 30, 30);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("Summary", 14, 54);

  doc.setDrawColor(79, 142, 247);
  doc.setLineWidth(0.5);
  doc.line(14, 57, pageWidth - 14, 57);

  const summaryData = [
    ["Role", report.job_title],
    ["Total Candidates", String(report.total_candidates)],
    ["Strong Hire", String(report.shortlisted_count)],
    ["Top Candidate", report.top_candidate],
  ];

  autoTable(doc, {
    startY: 60,
    head: [],
    body: summaryData,
    theme: "plain",
    styles: { fontSize: 10, cellPadding: 3 },
    columnStyles: {
      0: { fontStyle: "bold", cellWidth: 50, textColor: [100, 100, 100] },
      1: { textColor: [30, 30, 30] },
    },
  });

  // ── Rubric Table ─────────────────────────────────────
  let currentY = doc.lastAutoTable.finalY + 12;

  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(30, 30, 30);
  doc.text("Scoring Rubric", 14, currentY);

  doc.setDrawColor(79, 142, 247);
  doc.line(14, currentY + 3, pageWidth - 14, currentY + 3);

  autoTable(doc, {
    startY: currentY + 7,
    head: [["Dimension", "Weight", "0 – Poor", "5 – Average", "10 – Excellent"]],
    body: [
      ["Skills Match", "30%", "< 30% match", "50–70% match", "> 85% match"],
      ["Experience Relevance", "25%", "Unrelated domain", "Adjacent domain", "Exact domain & seniority"],
      ["Education & Certs", "15%", "Below minimum", "Meets minimum", "Exceeds + extra certs"],
      ["Project / Portfolio", "20%", "No evidence", "1–2 generic projects", "Strong relevant portfolio"],
      ["Communication Quality", "10%", "Poor structure", "Adequate clarity", "Crisp & impactful"],
    ],
    headStyles: { fillColor: [15, 17, 26], textColor: [255, 255, 255], fontSize: 9 },
    styles: { fontSize: 8.5, cellPadding: 3 },
    alternateRowStyles: { fillColor: [245, 247, 250] },
  });

  // ── Candidate Cards ───────────────────────────────────
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

  report.candidates.forEach((candidate, index) => {
    doc.addPage();

    const recColor =
      candidate.hire_recommendation === "Strong Hire"
        ? [72, 187, 120]
        : candidate.hire_recommendation === "Consider"
        ? [236, 201, 75]
        : [252, 129, 129];

    // Colour bar + dark header
    doc.setFillColor(...recColor);
    doc.rect(0, 0, pageWidth, 8, "F");

    doc.setFillColor(15, 17, 26);
    doc.rect(0, 8, pageWidth, 36, "F");

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text(`#${index + 1}  ${candidate.candidate_name}`, 14, 24);

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(160, 174, 192);
    doc.text(candidate.summary || "", 14, 35, { maxWidth: pageWidth - 80 });

    // Score badge
    doc.setFontSize(24);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...recColor);
    doc.text(`${candidate.weighted_total}`, pageWidth - 50, 24, { align: "right" });

    doc.setFontSize(10);
    doc.setTextColor(160, 174, 192);
    doc.text("/100", pageWidth - 14, 24);

    doc.setFontSize(9);
    doc.setTextColor(...recColor);
    doc.text(candidate.hire_recommendation, pageWidth - 14, 34, { align: "right" });

    // Dimension scores table
    let y = 54;
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30, 30, 30);
    doc.text("Dimension Scores", 14, y);

    doc.setDrawColor(79, 142, 247);
    doc.setLineWidth(0.5);
    doc.line(14, y + 3, pageWidth - 14, y + 3);

    const dimRows = Object.entries(candidate.scores).map(([key, dim]) => [
      dimLabels[key] || key,
      weights[key] || "",
      `${dim.score}/10`,
      dim.justification || "",
    ]);

    autoTable(doc, {
      startY: y + 7,
      head: [["Dimension", "Weight", "Score", "Justification"]],
      body: dimRows,
      headStyles: { fillColor: [15, 17, 26], textColor: [255, 255, 255], fontSize: 9 },
      styles: { fontSize: 8.5, cellPadding: 4, valign: "top" },
      columnStyles: {
        0: { cellWidth: 38, fontStyle: "bold" },
        1: { cellWidth: 18, halign: "center" },
        2: { cellWidth: 18, halign: "center" },
        3: { cellWidth: "auto" },
      },
      alternateRowStyles: { fillColor: [245, 247, 250] },
    });

    // Weighted total summary box
    const finalY = doc.lastAutoTable.finalY + 8;
    const lightColor = recColor.map(c => Math.min(255, c + 180));
    doc.setFillColor(...lightColor);
    doc.roundedRect(14, finalY, pageWidth - 28, 18, 3, 3, "F");

    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30, 30, 30);
    doc.text(`Weighted Total: ${candidate.weighted_total}/100`, 20, finalY + 7);
    doc.text(`Recommendation: ${candidate.hire_recommendation}`, 20, finalY + 14);

    // Override log
    if (candidate.override_log?.length > 0) {
      const overY = finalY + 26;
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(30, 30, 30);
      doc.text("Override Log", 14, overY);

      doc.setDrawColor(79, 142, 247);
      doc.line(14, overY + 3, pageWidth - 14, overY + 3);

      const overRows = candidate.override_log.map(entry => [
        dimLabels[entry.dimension] || entry.dimension,
        `${entry.old_score} → ${entry.new_score}`,
        entry.reason,
        entry.timestamp?.slice(0, 19) || "",
      ]);

      autoTable(doc, {
        startY: overY + 7,
        head: [["Dimension", "Change", "Reason", "Timestamp"]],
        body: overRows,
        headStyles: { fillColor: [79, 142, 247], textColor: [255, 255, 255], fontSize: 9 },
        styles: { fontSize: 8.5, cellPadding: 3 },
      });
    }
  });

  // ── Footer on every page ──────────────────────────────
  const totalPages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(160, 174, 192);
    doc.text(
      `RecruitAI — Confidential  |  Page ${i} of ${totalPages}`,
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 8,
      { align: "center" }
    );
  }

  doc.save(`shortlist_${report.job_title?.replace(/\s+/g, "_") || "report"}.pdf`);
}
