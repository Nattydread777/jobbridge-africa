const SKILL_TERMS = [
  "JavaScript", "TypeScript", "Python", "Java", "C++", "C#", "PHP", "Ruby",
  "Go", "Rust", "React", "Angular", "Vue.js", "Node.js", "Express.js",
  "Next.js", "Django", "Flask", "Laravel", "MongoDB", "MySQL",
  "PostgreSQL", "Redis", "AWS", "Azure", "Google Cloud", "Docker",
  "Kubernetes", "Git", "Linux", "Machine Learning", "Data Analysis",
  "SQL", "HTML", "CSS", "Figma", "UI/UX Design", "Project Management",
  "Agile", "Scrum", "Communication", "Cybersecurity", "Excel",
];

export const extractResumeText = async (file) => {
  const extension = file.name.split(".").pop()?.toLowerCase();

  if (extension === "docx") {
    const { unzipSync } = await import("fflate");
    const entries = unzipSync(new Uint8Array(await file.arrayBuffer()));
    const documentXml = entries["word/document.xml"];
    if (!documentXml) throw new Error("Could not read this DOCX file.");
    const xml = new DOMParser().parseFromString(
      new TextDecoder().decode(documentXml),
      "application/xml",
    );
    if (xml.querySelector("parsererror")) throw new Error("Could not read this DOCX file.");
    return Array.from(xml.getElementsByTagNameNS("*", "p"))
      .map((paragraph) => {
        const content = Array.from(paragraph.getElementsByTagNameNS("*", "t"))
          .map((node) => node.textContent || "")
          .join("");
        return paragraph.getElementsByTagNameNS("*", "numPr").length
          ? `• ${content}`
          : content;
      })
      .join("\n");
  }

  if (extension === "pdf") {
    const [{ getDocument, GlobalWorkerOptions }, worker] = await Promise.all([
      import("pdfjs-dist/legacy/build/pdf.mjs"),
      import("pdfjs-dist/legacy/build/pdf.worker.mjs?url"),
    ]);
    GlobalWorkerOptions.workerSrc = worker.default;
    const pdf = await getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
    try {
      const pages = [];
      for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
        const page = await pdf.getPage(pageNumber);
        const content = await page.getTextContent();
        const pageLines = [];
        let currentLine = "";
        let previousY = null;
        let previousX = null;
        for (const item of content.items) {
          if (!("str" in item) || !item.str.trim()) continue;
          const x = Number(item.transform?.[4]);
          const y = Number(item.transform?.[5]);
          const startsNewLine = previousY !== null && Number.isFinite(y)
            && Math.abs(y - previousY) > 2;
          if (startsNewLine && currentLine.trim()) {
            pageLines.push(currentLine.trim());
            currentLine = "";
          }
          const gap = previousX !== null && Number.isFinite(x) && x - previousX > 30
            ? "    "
            : " ";
          currentLine += `${currentLine ? gap : ""}${item.str.trim()}`;
          if (item.hasEOL) {
            pageLines.push(currentLine.trim());
            currentLine = "";
            previousY = null;
            previousX = null;
            continue;
          }
          previousY = Number.isFinite(y) ? y : previousY;
          previousX = Number.isFinite(x) ? x + Number(item.width || 0) : previousX;
        }
        if (currentLine.trim()) pageLines.push(currentLine.trim());
        pages.push(pageLines.join("\n"));
      }
      return pages.join("\n");
    } finally {
      await pdf.destroy();
    }
  }

  if (!["txt", "md", "csv", "html", "htm", "rtf"].includes(extension)) {
    throw new Error("Choose a PDF, DOCX, TXT, Markdown, HTML, CSV, or RTF resume.");
  }
  const rawText = await file.text();
  if (extension === "html" || extension === "htm") {
    const parsed = new DOMParser().parseFromString(rawText, "text/html");
    parsed.querySelectorAll("script, style, noscript").forEach((node) => node.remove());
    parsed.querySelectorAll("br").forEach((node) => node.replaceWith("\n"));
    parsed.querySelectorAll("p, div, li, h1, h2, h3, h4").forEach((node) => {
      node.append("\n");
    });
    return parsed.body.textContent || "";
  }
  if (extension === "rtf") {
    return rawText
      .replace(/\\par[d]?\b/g, "\n")
      .replace(/\\line\b/g, "\n")
      .replace(/\\tab\b/g, "\t")
      .replace(/\\'[0-9a-f]{2}/gi, " ")
      .replace(/\\[a-z]+-?\d* ?/gi, " ")
      .replace(/[{}]/g, " ")
      .replace(/[ \t]+\n/g, "\n");
  }
  return rawText.replace(/\r\n?/g, "\n");
};

const RESUME_HEADINGS = [
  ["summary", /^(?:professional\s+)?(?:summary|profile|objective|about me)$/i],
  ["skills", /^(?:core\s+|technical\s+|key\s+)?skills(?:\s+and\s+competencies)?$/i],
  ["experience", /^(?:(?:professional|work)\s+)?(?:experience|employment history|work history)$/i],
  ["education", /^(?:education|academic background|qualifications)$/i],
  ["certifications", /^(?:certifications?|licenses?|professional development)$/i],
  ["projects", /^(?:selected\s+)?projects?$/i],
  ["coverLetter", /^(?:cover letter|letter of motivation)$/i],
];

export const splitResumeSections = (sourceText) => {
  const lines = String(sourceText || "")
    .replaceAll(String.fromCharCode(0), " ")
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((line) => line.replace(/[ \t]+$/g, "").trim())
    .filter(Boolean);
  const sections = {
    header: [],
    summary: [],
    skills: [],
    experience: [],
    education: [],
    certifications: [],
    projects: [],
    other: [],
    coverLetter: [],
  };
  let current = "header";
  let coverLetterIndex = -1;
  for (const [index, line] of lines.entries()) {
    const heading = line.replace(/[:\s]+$/, "");
    const matched = RESUME_HEADINGS.find(([, pattern]) => pattern.test(heading));
    if (matched) {
      current = matched[0];
      if (current === "coverLetter") coverLetterIndex = index;
      continue;
    }
    sections[current].push(line);
  }
  return {
    ...sections,
    header: sections.header.join("\n"),
    summary: sections.summary.join("\n"),
    skills: sections.skills,
    experience: sections.experience,
    education: sections.education,
    certifications: sections.certifications,
    projects: sections.projects,
    other: sections.other,
    coverLetter: sections.coverLetter.join("\n"),
    resumeText: coverLetterIndex >= 0
      ? lines.slice(0, coverLetterIndex).join("\n")
      : lines.join("\n"),
  };
};

const sectionText = (text, headingPattern) => {
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const start = lines.findIndex((line) => headingPattern.test(line));
  if (start < 0) return "";
  const sectionLines = [];
  for (const line of lines.slice(start + 1)) {
    if (/^(summary|profile|skills?|technical skills|education|experience|employment|work history|projects|certifications|references)\s*:?\s*$/i.test(line)) break;
    sectionLines.push(line);
  }
  return sectionLines.join("\n");
};

export const parseResumeText = (sourceText) => {
  const text = sourceText
    .replaceAll(String.fromCharCode(0), " ")
    .replace(/\r\n?/g, "\n")
    .replace(/[ \t]+$/gm, "")
    .trim();
  if (!text) throw new Error("No readable text was found. Try another file or paste your CV content.");

  const sections = splitResumeSections(text);
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const email = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0] || "";
  const phone = text.match(/(?:\+\d{1,3}[\s.-]?)?(?:\(?\d{2,4}\)?[\s.-]?)?\d{3,4}[\s.-]?\d{3,4}/)?.[0] || "";
  const name = lines.slice(0, 8).find((line) =>
    line.length <= 70
    && !line.includes("@")
    && !/\d/.test(line)
    && !/^(curriculum vitae|resume|résumé|cv)$/i.test(line),
  ) || "";
  const foundSkills = SKILL_TERMS.filter((skill) =>
    new RegExp(`(^|[^a-z0-9+#])${skill.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([^a-z0-9+#]|$)`, "i").test(text),
  );

  const educationText = sections.education.join("\n")
    || sectionText(text, /^(education|academic background|qualifications)\s*:?\s*$/i);
  const schoolLine = educationText.split(/\r?\n/).find((line) =>
    /\b(university|college|institute|school|polytechnic)\b/i.test(line),
  );
  const degreeLine = educationText.split(/\r?\n/).find((line) =>
    /\b(bachelor|master|doctor|ph\.?d|b\.?sc|m\.?sc|mba|diploma|degree)\b/i.test(line),
  );
  const years = educationText.match(/\b(?:19|20)\d{2}\b/g) || [];
  const education = schoolLine || degreeLine ? [{
    school: schoolLine || "",
    degree: degreeLine || "",
    field: "",
    startYear: years[0] || "",
    endYear: years[1] || "",
  }] : [];

  const experienceText = sections.experience.join("\n")
    || sectionText(text, /^(experience|work experience|employment history|work history)\s*:?\s*$/i);
  const experience = experienceText
    ? experienceText.split(/\r?\n/).slice(0, 12).map((line) => ({
      company: "",
      position: line.slice(0, 120),
      location: "",
      startDate: "",
      endDate: "",
      description: "",
    })).filter((item) => item.position)
    : [];
  const summaryText = sections.summary
    || sectionText(text, /^(summary|professional summary|profile|about me|objective)\s*:?\s*$/i);

  return {
    name,
    email,
    phone,
    bio: summaryText.slice(0, 1200),
    skills: foundSkills,
    education,
    experience,
    sections,
    resumeText: sections.resumeText,
    coverLetter: sections.coverLetter,
  };
};
