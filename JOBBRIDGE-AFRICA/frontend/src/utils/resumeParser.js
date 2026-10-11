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
      .map((paragraph) => Array.from(paragraph.getElementsByTagNameNS("*", "t"))
        .map((node) => node.textContent || "").join(""))
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
        pages.push(content.items.map((item) => ("str" in item ? item.str : "")).join(" "));
      }
      return pages.join("\n");
    } finally {
      await pdf.destroy();
    }
  }

  if (extension !== "txt") {
    throw new Error("Choose a PDF, DOCX, or TXT resume.");
  }
  return file.text();
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
  const text = sourceText.replaceAll(String.fromCharCode(0), " ").replace(/[ \t]+/g, " ").trim();
  if (!text) throw new Error("No readable text was found. Try another file or paste your CV content.");

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

  const educationText = sectionText(text, /^(education|academic background|qualifications)\s*:?\s*$/i);
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

  const experienceText = sectionText(text, /^(experience|work experience|employment history|work history)\s*:?\s*$/i);
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
  const summaryText = sectionText(text, /^(summary|professional summary|profile|about me|objective)\s*:?\s*$/i);

  return {
    name,
    email,
    phone,
    bio: summaryText.slice(0, 1200),
    skills: foundSkills,
    education,
    experience,
  };
};
