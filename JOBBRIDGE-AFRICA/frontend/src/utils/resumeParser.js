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
const TECHNICAL_SKILLS = new Set([
  "javascript", "typescript", "python", "java", "c++", "c#", "php", "ruby",
  "go", "rust", "react", "angular", "vue.js", "node.js", "express.js", "next.js",
  "django", "flask", "laravel", "mongodb", "mysql", "postgresql", "redis",
  "machine learning", "data analysis", "sql", "html", "css", "cybersecurity",
]);
const TOOL_SKILLS = new Set([
  "aws", "azure", "google cloud", "docker", "kubernetes", "git", "linux",
  "figma", "excel", "power bi", "tableau", "salesforce", "wordpress",
]);
const classifySkills = (skills) => skills.reduce((groups, skill) => {
  const normalized = skill.toLowerCase();
  const group = TECHNICAL_SKILLS.has(normalized)
    ? "technical"
    : TOOL_SKILLS.has(normalized)
      ? "tools"
      : "core";
  groups[group].push(skill);
  return groups;
}, { core: [], tools: [], technical: [] });

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
  ["preferences", /^(?:work\s+)?(?:preferences|career\s+interests|target\s+roles?|roles?\s+of\s+interest)$/i],
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
  return items.filter((item) => item.title || item.company || item.dates || item.bullets.length)
    .map((item) => ({ ...item, bullets: item.bullets.filter(Boolean) }));
};

const splitSkillLines = (lines) => [...new Set(
  lines.flatMap((line) => line.split(/[,;|•·]\s*/))
    .map((line) => cleanBullet(line).replace(/[.]+$/g, "").trim())
    .filter((line) => line && line.length <= 80),
)];

const parseEducationItems = (lines) => {
  const cleanLines = lines.map(cleanBullet).filter(Boolean);
  const degreeLines = cleanLines.filter((line) =>
    /\b(?:bachelor|master|doctor|ph\.?d|b\.?sc|m\.?sc|mba|diploma|degree)\b/i.test(line),
  );
  const schoolLines = cleanLines.filter((line) =>
    /\b(?:university|college|institute|school|polytechnic)\b/i.test(line),
  );
  const years = cleanLines.join(" ").match(/\b(?:19|20)\d{2}\b/g) || [];
  return degreeLines.map((degree, index) => {
    const degreeWithoutYears = degree.replace(/\b(?:19|20)\d{2}\b/g, "").trim();
    const field = degreeWithoutYears
      .replace(/^(?:bachelor(?:'s)?|master(?:'s)?|doctor(?:ate)?|ph\.?d|b\.?sc|m\.?sc|mba|diploma|degree)\s*(?:of|in)?\s*/i, "")
      .trim();
    const yearIndex = Math.min(index * 2, Math.max(years.length - 1, 0));
    return {
      school: schoolLines[index] || schoolLines[0] || "",
      degree: degreeWithoutYears,
      field,
      startYear: years[yearIndex] || "",
      endYear: years[yearIndex + 1] || years[yearIndex] || "",
    };
  }).filter((item) => item.school || item.degree);
};

const parseProjectItems = (lines) => {
  const projects = [];
  for (const rawLine of lines) {
    const line = cleanBullet(rawLine);
    if (!line) continue;
    if (isBullet(rawLine)) {
      if (projects.length) {
        projects.at(-1).description = [projects.at(-1).description, line]
          .filter(Boolean).join("\n");
      }
      continue;
    }
    const url = line.match(/https?:\/\/\S+/i)?.[0] || "";
    const text = line.replace(/https?:\/\/\S+/ig, "").replace(/^[-|:,\s]+|[-|:,\s]+$/g, "").trim();
    const [name, ...descriptionParts] = text.split(/:\s+|\s+[|–—]\s+/).map((part) => part.trim());
    if (name) projects.push({ name, description: descriptionParts.join(" "), url });
  }
  return projects.filter((project) => project.name);
};

const parseWorkPreferences = (lines) => {
  const targetRoles = [];
  const preferredLocations = [];
  let currentPreference = "";
  for (const line of lines) {
    const roleMatch = line.match(/^(?:target\s+roles?|desired\s+(?:roles?|positions?)|roles?\s+of\s+interest)\s*:?\s*(.*)$/i);
    const locationMatch = line.match(/^(?:preferred\s+locations?|desired\s+locations?)\s*:?\s*(.*)$/i);
    if (roleMatch) {
      currentPreference = "roles";
      if (roleMatch[1]) targetRoles.push(...roleMatch[1].split(/[,;|]/));
      continue;
    }
    if (locationMatch) {
      currentPreference = "locations";
      if (locationMatch[1]) preferredLocations.push(...locationMatch[1].split(/[;|]/));
      continue;
    }
    if (RESUME_HEADINGS.some(([, pattern]) => pattern.test(line))) {
      currentPreference = "";
      continue;
    }
    if (currentPreference === "roles") targetRoles.push(...line.split(/[,;|]/));
    if (currentPreference === "locations") preferredLocations.push(...line.split(/[;|]/));
  }
  return {
    targetRoles: [...new Set(targetRoles.map((value) => value.trim()).filter(Boolean))],
    preferredLocations: [...new Set(preferredLocations.map((value) => value.trim()).filter(Boolean))],
  };
};

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
    preferences: [],
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
      skillGroups: classifySkills(structuredSkills.length ? structuredSkills : detectedSkills),
      experience: parseExperienceItems(experienceLines),
      education: parseEducationItems(educationLines),
      certifications: splitSkillLines(certificationLines),
      projects: parseProjectItems(sections.projects),
      workPreferences: parseWorkPreferences(lines),
    },
  };
};

const parseContactHeader = (headerLines) => {
  const header = headerLines.join("\n");
  const lines = headerLines.map((line) => line.trim()).filter(Boolean);
  const email = header.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0] || "";
  const phone = header.match(/(?:\+?\d{1,3}[\s().-]?)?(?:\d[\s().-]?){7,14}\d/)?.[0] || "";
  const locationLine = lines.find((line) => /\b(?:address|location|based in)\b/i.test(line))
    || lines.find((line) => line.includes(",") && !line.includes("@") && !/\d{6,}/.test(line));
  const location = locationLine?.replace(/^(?:address|location|based in)\s*[:-]?\s*/i, "") || "";
  const name = lines.find((line) => !line.includes("@") && !/\d/.test(line)
    && line !== locationLine
    && !/^(?:curriculum vitae|resume|résumé|cv|contact)$/i.test(line)) || "";
  return {
    name,
    email,
    phone,
    location,
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
    education: sections.structured.education,
    certifications: sections.structured.certifications,
    experience,
    projects: sections.structured.projects,
    workPreferences: sections.structured.workPreferences,
    sections,
    structured: sections.structured,
    resumeText: sections.resumeText,
    coverLetter: sections.coverLetter,
  };
};

const resumeDateParts = (dateRange) => {
  const parts = String(dateRange || "").match(
    /(?:(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+)?(?:19|20)\d{2}|present|current/gi,
  ) || [];
  return {
    startDate: parts[0] || "",
    endDate: parts[1] ? parts[1].replace(/^current$/i, "Present") : "",
  };
};

export const mapParsedResumeToProfile = (parsedData, currentProfile, countryOptions = []) => {
  const parsedSkills = parsedData.sections?.structured?.skills || parsedData.skills || [];
  const parsedGroups = parsedData.sections?.structured?.skillGroups || classifySkills(parsedSkills);
  const skillGroups = Object.fromEntries(["core", "tools", "technical"].map((group) => [
    group,
    [...new Set([...(currentProfile.skillGroups?.[group] || []), ...(parsedGroups[group] || [])])],
  ]));
  const skills = [...new Set(Object.values(skillGroups).flat())];
  const parsedExperience = (parsedData.experience || [])
    .map((item) => ({
      company: item.company || "",
      position: item.title || "",
      location: item.location || "",
      ...resumeDateParts(item.dates),
      description: (item.bullets || []).filter(Boolean).join("\n"),
    }))
    .filter((item) => item.position && item.company && item.startDate && item.endDate && item.description);
  const parsedEducation = (parsedData.education || [])
    .filter((item) => item.school && item.degree);
  const parsedCertifications = (parsedData.certifications || [])
    .map((item) => typeof item === "string" ? { name: item, issuer: "", issueDate: "", credentialUrl: "" } : item)
    .filter((item) => item.name);
  const parsedProjects = (parsedData.projects || [])
    .filter((item) => item.name);
  const location = parsedData.sections?.structured?.contact?.location || "";
  const matchedCountry = countryOptions.find(({ country }) =>
    country && location.toLowerCase().includes(country.toLowerCase()),
  )?.country;
  const preferences = parsedData.workPreferences || {};
  const preferredLocations = [...new Set([
    ...(preferences.preferredLocations || []),
    ...(!matchedCountry && location ? [location] : []),
  ])];

  return {
    ...currentProfile,
    name: parsedData.name || currentProfile.name,
    email: parsedData.email || currentProfile.email,
    phone: parsedData.phone || currentProfile.phone,
    country: matchedCountry || currentProfile.country,
    bio: parsedData.bio ? parsedData.bio.slice(0, 300) : currentProfile.bio,
    skills,
    skillGroups,
    education: parsedEducation.length ? parsedEducation : currentProfile.education,
    experience: parsedExperience.length ? parsedExperience : currentProfile.experience,
    certifications: parsedCertifications.length ? parsedCertifications : currentProfile.certifications,
    projects: parsedProjects.length ? parsedProjects : currentProfile.projects,
    workPreferences: {
      ...currentProfile.workPreferences,
      targetRoles: [...new Set([
        ...(currentProfile.workPreferences?.targetRoles || []),
        ...(preferences.targetRoles || []),
      ])],
      preferredLocations: [...new Set([
        ...(currentProfile.workPreferences?.preferredLocations || []),
        ...preferredLocations,
      ])],
    },
  };
};
