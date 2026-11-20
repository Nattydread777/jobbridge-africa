const SKILL_TERMS = [
  "JavaScript", "TypeScript", "Python", "Java", "C++", "C#", "PHP", "Ruby",
  "Go", "Rust", "React", "Angular", "Vue.js", "Node.js", "Express.js",
  "Next.js", "Django", "Flask", "Laravel", "MongoDB", "MySQL",
  "PostgreSQL", "Redis", "AWS", "Azure", "Google Cloud", "Docker",
  "Kubernetes", "Git", "Linux", "Machine Learning", "Data Analysis",
  "SQL", "HTML", "CSS", "Figma", "UI/UX Design", "Project Management",
  "Agile", "Scrum", "Communication", "Cybersecurity", "Excel", "Power BI",
  "Tableau", "Salesforce", "SEO", "Express.js", "Next.js", "Angular",
  "Vue.js", "WordPress", "Customer Service",
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
  ["skills", /^(?:(?:core|technical|key|domain)\s+)?(?:skills|competencies|areas of expertise|technical proficiencies|tools and technologies)(?:\s+and\s+competencies)?$/i],
  ["experience", /^(?:(?:professional|work|career)\s+)?(?:experience|employment history|work history|professional background)$/i],
  ["education", /^(?:education|academic background|qualifications)$/i],
  ["certifications", /^(?:certifications?|licenses?|professional development|training|courses|coursework|programs|programmes)$/i],
  ["projects", /^(?:selected\s+)?projects?$/i],
  ["coverLetter", /^(?:cover letter|letter of motivation)$/i],
];

const RESUME_DATE_RANGE = /\b(?:(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+)?(?:19|20)\d{2}\s*(?:-|–|to|through)\s*(?:(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+)?(?:(?:19|20)\d{2}|present|current)\b/i;
const isBullet = (line) => /^(?:[-*•▪◦‣]|\d+[.)])\s+/.test(line);
const cleanBullet = (line) => line.replace(/^(?:[-*•▪◦‣]|\d+[.)])\s+/, "").trim();
const EXPERIENCE_ACTION_PATTERN = /^(?:built|created|designed|developed|delivered|implemented|launched|led|managed|owned|improved|increased|reduced|supported|coordinated|analyzed|analysed|maintained|automated|trained|taught)\b/i;
const isCredentialRecord = (line) => {
  const content = cleanBullet(line);
  if (EXPERIENCE_ACTION_PATTERN.test(content)) return false;
  return /\b(?:PLP|HQFM|Packt|Scenario Academy)\b/i.test(content)
    || /\b(?:certification|certificate|certified|coursework|course completion|training program|training programme|professional development|bootcamp)\b/i.test(content);
};
const isEducationRecord = (line) => {
  const content = cleanBullet(line);
  return !EXPERIENCE_ACTION_PATTERN.test(content)
    && /\b(?:bachelor|master|ph\.?d|b\.?sc|m\.?sc|mba|diploma|degree|university|polytechnic|college)\b/i.test(content);
};

export const normalizeResumeText = (sourceText) => String(sourceText || "")
  .replace(/\u00ad/g, "")
  .replaceAll(String.fromCharCode(0), " ")
  .replace(/\r\n?/g, "\n")
  .replace(/\bMERN\s*-\s*stack\b/gi, "MERN stack")
  .replace(/\ba\s*nd\b/gi, "and")
  .replace(/\bauto\s+mation\b/gi, "automation")
  .replace(/([a-z0-9])\s+-\s+([a-z0-9])/g, "$1-$2")
  .split("\n")
  .map((line) => line.replace(/[ \t]+$/g, "").trim())
  .filter(Boolean)
  .reduce((state, line) => {
    const { normalized } = state;
    const heading = RESUME_HEADINGS.find(([, pattern]) => pattern.test(line.replace(/[:\s]+$/, "")));
    if (heading) {
      state.section = heading[0];
      normalized.push(line);
      return state;
    }
    const previous = normalized.at(-1);
    if (!previous || isBullet(line)) {
      normalized.push(line);
      return state;
    }
    const roleHeader = RESUME_DATE_RANGE.test(line) || /\s(?:\|| at )\s/i.test(line);
    const continuation = (isBullet(previous)
      && !roleHeader
      && !isCredentialRecord(line)
      && !isEducationRecord(line))
      || (previous.length > 18
        && !/[.!?]$/.test(previous)
        && !RESUME_DATE_RANGE.test(previous)
        && !RESUME_DATE_RANGE.test(line)
        && state.section !== "skills"
        && !(state.section === "experience" && !isBullet(previous))
        && (/^[a-z]/.test(line) || /[,;:]$/.test(previous)));
    if (continuation) normalized[normalized.length - 1] = `${previous} ${line}`.replace(/\s+/g, " ").trim();
    else normalized.push(line);
    return state;
  }, { normalized: [], section: "" }).normalized
  .join("\n");

const parseExperienceItems = (lines) => {
  const items = [];
  let current = null;
  const startRole = (header = "") => {
    const dates = header.match(RESUME_DATE_RANGE)?.[0] || "";
    const withoutDates = header.replace(RESUME_DATE_RANGE, "").replace(/[|,;–—-]+$/g, "").trim();
    const parts = withoutDates.split(/\s*(?:\||•|·| at )\s*/i).map((part) => part.trim()).filter(Boolean);
    current = {
      title: parts[0] || "",
      company: parts[1] || "",
      dates,
      location: parts[2] || "",
      bullets: [],
    };
    items.push(current);
  };
  for (const line of lines) {
    if (isBullet(line)) {
      if (!current) startRole();
      current.bullets.push(cleanBullet(line));
    } else if (!current) {
      startRole(line);
    } else if (RESUME_DATE_RANGE.test(line) && !line.replace(RESUME_DATE_RANGE, "").trim()) {
      if (!current.dates && !current.bullets.length) current.dates = line.match(RESUME_DATE_RANGE)?.[0] || "";
      else startRole(line);
    } else if (current.dates && !current.title && !current.bullets.length) {
      const dates = current.dates;
      const header = line.match(RESUME_DATE_RANGE) ? line : `${line} | ${dates}`;
      const parsed = header.replace(RESUME_DATE_RANGE, "").split(/\s*(?:\||•|·| at )\s*/i).map((part) => part.trim()).filter(Boolean);
      current.title = parsed[0] || "";
      current.company = parsed[1] || "";
      current.location = parsed[2] || "";
      current.dates = line.match(RESUME_DATE_RANGE)?.[0] || dates;
    } else if (current.bullets.length || RESUME_DATE_RANGE.test(line)) {
      startRole(line);
    } else if (!current.title) {
      current.title = line;
    } else if (!current.company) {
      current.company = line;
    } else if (!current.location) {
      current.location = line;
    } else {
      current.bullets.push(line);
    }
  }
  return items.filter((item) => item.title || item.company || item.dates || item.bullets.length);
};

const splitSkillLines = (lines) => [...new Set(
  lines.flatMap((line) => line.split(/[,;|•·]\s*/))
    .map((line) => cleanBullet(line).replace(/[.]+$/g, "").trim())
    .filter((line) => line && line.length <= 80),
)];

export const splitResumeSections = (sourceText) => {
  const normalizedText = normalizeResumeText(sourceText);
  const lines = normalizedText
    .split("\n")
    .map((line) => line.trim());
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
  for (const line of lines) {
    const heading = line.replace(/[:\s]+$/, "");
    const matched = RESUME_HEADINGS.find(([, pattern]) => pattern.test(heading));
    if (matched) {
      current = matched[0];
      continue;
    }
    sections[current].push(line);
  }
  const routedCertifications = sections.experience.filter(isCredentialRecord).map(cleanBullet);
  const routedEducation = sections.experience
    .filter((line) => !isCredentialRecord(line) && isEducationRecord(line))
    .map(cleanBullet);
  const experienceLines = sections.experience
    .filter((line) => !isCredentialRecord(line) && !isEducationRecord(line));
  const educationLines = [...sections.education, ...routedEducation];
  const certificationLines = [...sections.certifications, ...routedCertifications];
  const structuredSkills = splitSkillLines(sections.skills);
  const detectedSkills = SKILL_TERMS.filter((skill) =>
    new RegExp(`(^|[^a-z0-9+#])${skill.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([^a-z0-9+#]|$)`, "i").test(normalizedText),
  );
  const coverLetterStart = lines.findIndex((line) => /^(?:cover letter|letter of motivation)[:\s]*$/i.test(line));
  return {
    ...sections,
    header: sections.header.join("\n"),
    summary: sections.summary.join("\n"),
    skills: structuredSkills.length ? sections.skills : detectedSkills,
    experience: experienceLines,
    education: educationLines,
    certifications: certificationLines,
    projects: sections.projects,
    other: sections.other,
    coverLetter: sections.coverLetter.join("\n"),
    resumeText: coverLetterStart >= 0 ? lines.slice(0, coverLetterStart).join("\n") : normalizedText,
    structured: {
      contact: parseContactHeader(sections.header),
      summary: sections.summary.join("\n"),
      skills: structuredSkills.length ? structuredSkills : detectedSkills,
      experience: parseExperienceItems(experienceLines),
      education: educationLines,
      certifications: splitSkillLines(certificationLines),
    },
  };
};

const parseContactHeader = (headerLines) => {
  const header = headerLines.join("\n");
  const lines = headerLines.map((line) => line.trim()).filter(Boolean);
  const email = header.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0] || "";
  const phone = header.match(/(?:\+?\d{1,3}[\s().-]?)?(?:\d[\s().-]?){7,14}\d/)?.[0] || "";
  const name = lines.find((line) => !line.includes("@") && !/\d/.test(line)
    && !/^(?:curriculum vitae|resume|résumé|cv|contact)$/i.test(line)) || "";
  const locationLine = lines.find((line) => /\b(?:address|location|based in)\b/i.test(line)) || "";
  return {
    name,
    email,
    phone,
    location: locationLine.replace(/^(?:address|location|based in)\s*[:-]?\s*/i, ""),
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
  const text = normalizeResumeText(sourceText).trim();
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
    ? parseExperienceItems(experienceText.split(/\r?\n/).slice(0, 40))
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
    certifications: sections.structured.certifications,
    experience,
    sections,
    structured: sections.structured,
    resumeText: sections.resumeText,
    coverLetter: sections.coverLetter,
  };
};
