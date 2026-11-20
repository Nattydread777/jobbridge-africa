const textLines = (value) => String(value || "").split(/\r?\n/).map((line) => line.trim()).filter(Boolean);

export const buildCvExportBlocks = (draft) => {
  const blocks = [];
  const contact = draft.contact || {};
  if (contact.name) blocks.push({ type: "name", text: contact.name });
  const details = [contact.email, contact.phone, contact.location].filter(Boolean).join(" | ");
  if (details) blocks.push({ type: "contact", text: details });
  if (draft.summary?.trim()) {
    blocks.push({ type: "heading", text: "Professional Summary" });
    blocks.push({ type: "body", text: draft.summary.trim() });
  }
  if (draft.skills?.length) {
    blocks.push({ type: "heading", text: "Core Skills" });
    blocks.push({ type: "body", text: draft.skills.join(" • ") });
  }
  if (draft.experience?.length) {
    blocks.push({ type: "heading", text: "Experience" });
    for (const role of draft.experience) {
      const metadata = [role.title, role.company, role.dates, role.location].filter(Boolean).join(" | ");
      if (metadata) blocks.push({ type: "role", text: metadata });
      for (const bullet of role.bullets || []) {
        const text = bullet.editedText || bullet.tailoredBullet || bullet.sourceBullet;
        if (text) blocks.push({ type: "bullet", text });
      }
    }
  }
  for (const [key, title] of [["education", "Education"], ["certifications", "Certifications"]]) {
    const lines = Array.isArray(draft[key]) ? draft[key] : textLines(draft[key]);
    if (!lines.length) continue;
    blocks.push({ type: "heading", text: title });
    lines.forEach((text) => blocks.push({ type: "body", text }));
  }
  return blocks;
};

export const createCvDocxBlob = async (draft) => {
  const { Document, Packer, Paragraph, TextRun } = await import("docx");
  const children = buildCvExportBlocks(draft).map(({ type, text }) => {
    const name = type === "name";
    const heading = type === "heading";
    const bullet = type === "bullet";
    return new Paragraph({
      children: [new TextRun({
        text,
        font: "Arial",
        size: name ? 28 : heading ? 24 : 21,
        bold: name || heading || type === "role",
        color: "000000",
      })],
      ...(bullet ? { bullet: { level: 0 } } : {}),
      spacing: { before: heading ? 180 : 0, after: name ? 100 : 80 },
    });
  });
  const document = new Document({
    styles: {
      default: {
        document: {
          run: { font: "Arial", size: 21, color: "000000" },
          paragraph: { spacing: { after: 80 } },
        },
      },
    },
    sections: [{ children }],
  });
  return Packer.toBlob(document);
};

export const createCvPdf = async (draft) => {
  const { jsPDF } = await import("jspdf");
  const pdf = new jsPDF({ unit: "pt", format: "a4" });
  const left = 52;
  const width = 490;
  let y = 52;
  for (const { type, text } of buildCvExportBlocks(draft)) {
    const isName = type === "name";
    const isHeader = type === "heading" || type === "role";
    pdf.setFont("helvetica", isName || isHeader ? "bold" : "normal");
    const size = isName ? 20 : type === "heading" ? 13 : 10;
    pdf.setFontSize(size);
    if (type === "heading") y += 8;
    const content = pdf.splitTextToSize(type === "bullet" ? `• ${text}` : text, width);
    for (const line of content) {
      if (y > 780) {
        pdf.addPage();
        y = 52;
      }
      pdf.text(line, left, y);
      y += size + 5;
    }
  }
  return pdf;
};
