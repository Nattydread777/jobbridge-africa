import test from "node:test";
import assert from "node:assert/strict";
import {
  extractResumeText,
  normalizeResumeText,
  parseResumeText,
  splitResumeSections,
} from "./resumeParser.js";
import { createCvDocxBlob } from "./cvExport.js";
import { unzipSync } from "fflate";

test("resume sections preserve bullets and separate cover-letter content", () => {
  const source = [
    "Ada Example",
    "Summary",
    "Product designer with accessibility experience.",
    "Experience",
    "- Led research for a public-service product.",
    "• Improved usability testing.",
    "Cover Letter",
    "I am applying for this role.",
  ].join("\n");
  const sections = splitResumeSections(source);

  assert.equal(sections.header, "Ada Example");
  assert.deepEqual(sections.experience, [
    "- Led research for a public-service product.",
    "• Improved usability testing.",
  ]);
  assert.equal(sections.coverLetter, "I am applying for this role.");
  assert.doesNotMatch(sections.resumeText, /Cover Letter/);
});

test("resume parser retains line breaks and returns structured content", () => {
  const parsed = parseResumeText([
    "Ada Example",
    "ada@example.com",
    "Skills",
    "React",
    "Experience",
    "- Built accessible interfaces.",
  ].join("\n"));
  assert.equal(parsed.name, "Ada Example");
  assert.equal(parsed.email, "ada@example.com");
  assert.equal(parsed.sections.experience[0], "- Built accessible interfaces.");
  assert.match(parsed.resumeText, /\nSkills\nReact\nExperience/);
});

test("plain-text and RTF extraction retain paragraph boundaries", async () => {
  const plainText = await extractResumeText({
    name: "candidate.txt",
    text: async () => "Summary\r\nProduct designer\r\nExperience\r\n- Led research",
  });
  assert.equal(plainText, "Summary\nProduct designer\nExperience\n- Led research");

  const rtf = await extractResumeText({
    name: "candidate.rtf",
    text: async () => String.raw`{\rtf1\ansi Summary\par Experience\par Led research}`,
  });
  assert.match(rtf, /Summary\s+Experience\s+Led research/);
});

test("normalization repairs hyphen spacing and joins continuation lines without merging roles", () => {
  const normalized = normalizeResumeText([
    "Summary",
    "Built an end - to - end service with multi - stakeholder teams",
    "for regional clients.",
    "Skills",
    "React",
    "JavaScript",
    "Experience",
    "Senior Engineer | Acme | Lagos | Jan 2020 - Present",
    "- Built customer dashboards that improved",
    "weekly reporting.",
    "Product Manager | Example | Accra | 2018 - 2019",
  ].join("\n"));
  assert.match(normalized, /end-to-end service with multi-stakeholder teams for regional clients/);
  assert.match(normalized, /Skills\nReact\nJavaScript/);
  assert.match(normalized, /improved weekly reporting/);
  assert.match(normalized, /Product Manager \| Example/);
  assert.doesNotMatch(normalized, /weekly reporting\. Product Manager/);

  const sections = splitResumeSections(normalized);
  assert.equal(sections.structured.summary.includes("React"), false);
  assert.deepEqual(sections.structured.skills, ["React", "JavaScript"]);
  assert.equal(sections.structured.experience[0].title, "Senior Engineer");
  assert.equal(sections.structured.experience[0].company, "Acme");
  assert.match(sections.structured.experience[0].dates, /2020/);
  assert.equal(sections.structured.experience[1].title, "Product Manager");
});

test("core competencies, separated dates, and training records map to the right CV sections", () => {
  const parsed = parseResumeText([
    "Ada Example",
    "Core Competencies",
    "React, Stakeholder Management, SQL",
    "Experience",
    "2020 - 2022",
    "Product Designer",
    "Acme",
    "Lagos",
    "- Built MERN - stack tools for a nd auto mation workflows.",
    "PLP Digital Skills Program",
    "Packt JavaScript Certificate",
    "Education",
    "BSc Computer Science",
  ].join("\n"));

  assert.deepEqual(parsed.structured.skills, ["React", "Stakeholder Management", "SQL"]);
  assert.equal(parsed.structured.summary, "");
  assert.equal(parsed.structured.experience.length, 1);
  assert.equal(parsed.structured.experience[0].title, "Product Designer");
  assert.equal(parsed.structured.experience[0].company, "Acme");
  assert.match(parsed.structured.experience[0].dates, /2020/);
  assert.match(parsed.structured.experience[0].bullets[0], /MERN stack tools for and automation workflows/);
  assert.deepEqual(parsed.certifications, ["PLP Digital Skills Program", "Packt JavaScript Certificate"]);
  assert.ok(parsed.education.some((entry) => /BSc Computer Science/.test(entry.degree)));
});

test("DOCX export uses candidate name first and leaves role headers outside bullet lists", async () => {
  const blob = await createCvDocxBlob({
    contact: { name: "Ada Example", email: "ada@example.com", phone: "", location: "" },
    summary: "Grounded summary.",
    skills: ["React", "JavaScript"],
    experience: [{
      title: "Senior Engineer",
      company: "Acme",
      dates: "2020-2023",
      location: "Lagos",
      bullets: [{
        sourceBullet: "Built dashboards.",
        tailoredBullet: "Built dashboards.",
        editedText: "Built dashboards for internal teams.",
      }],
    }],
    education: ["BSc Computer Science"],
    certifications: ["AWS Certified"],
  });
  const files = unzipSync(new Uint8Array(await blob.arrayBuffer()));
  const xml = new TextDecoder().decode(files["word/document.xml"]);
  assert.ok(xml.indexOf("Ada Example") < xml.indexOf("Professional Summary"));
  assert.doesNotMatch(xml, /Curriculum Vitae/);
  const roleParagraph = xml.match(/<w:p(?:\s[^>]*)?>[\s\S]*?Senior Engineer[\s\S]*?<\/w:p>/)?.[0];
  assert.ok(roleParagraph);
  assert.doesNotMatch(roleParagraph, /<w:numPr>/);
  assert.match(xml, /<w:numPr>/);
  assert.match(xml, /Arial/);
});
