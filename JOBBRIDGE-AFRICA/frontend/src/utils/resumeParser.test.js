import test from "node:test";
import assert from "node:assert/strict";
import {
  extractResumeText,
  mapParsedResumeToProfile,
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

test("resume data maps into complete profile records and work preferences", () => {
  const parsed = parseResumeText([
    "Ada Example",
    "ada@example.com",
    "+254 712 345 678",
    "Location: Nairobi, Kenya",
    "Professional Summary",
    "Data analyst focused on clear reporting and decision support.",
    "Skills",
    "SQL, Excel, Project Management",
    "Experience",
    "Data Analyst | Acme | Nairobi | Jan 2020 - Present",
    "- Built reporting dashboards for regional teams.",
    "Education",
    "University of Nairobi",
    "BSc Computer Science | 2016 - 2020",
    "Certifications",
    "Power BI Data Analyst Certificate",
    "Projects",
    "Regional Sales Dashboard",
    "- Built a sales dashboard for five markets.",
    "Target Roles",
    "Data Analyst, Business Analyst",
    "Preferred Locations",
    "Nairobi, Kenya; Remote",
  ].join("\n"));
  const mapped = mapParsedResumeToProfile(parsed, {
    name: "",
    email: "",
    phone: "",
    country: "",
    bio: "",
    skills: [],
    skillGroups: { core: [], tools: [], technical: [] },
    education: [],
    experience: [],
    certifications: [],
    projects: [],
    workPreferences: {
      workModes: [],
      targetRoles: [],
      preferredLocations: [],
      willingToRelocate: false,
    },
  }, [{ country: "Kenya" }, { country: "Nigeria" }]);

  assert.equal(mapped.name, "Ada Example");
  assert.equal(mapped.phone, "+254 712 345 678");
  assert.equal(mapped.country, "Kenya");
  assert.match(mapped.bio, /decision support/);
  assert.deepEqual(mapped.skillGroups.technical, ["SQL"]);
  assert.deepEqual(mapped.skillGroups.tools, ["Excel"]);
  assert.deepEqual(mapped.skillGroups.core, ["Project Management"]);
  assert.equal(mapped.experience[0].position, "Data Analyst");
  assert.equal(mapped.experience[0].startDate, "Jan 2020");
  assert.equal(mapped.experience[0].endDate, "Present");
  assert.match(mapped.experience[0].description, /regional teams/);
  assert.equal(mapped.education[0].school, "University of Nairobi");
  assert.equal(mapped.education[0].endYear, "2020");
  assert.equal(mapped.certifications[0].name, "Power BI Data Analyst Certificate");
  assert.equal(mapped.projects[0].name, "Regional Sales Dashboard");
  assert.match(mapped.projects[0].description, /five markets/);
  assert.deepEqual(mapped.workPreferences.targetRoles, ["Data Analyst", "Business Analyst"]);
  assert.deepEqual(mapped.workPreferences.preferredLocations, ["Nairobi, Kenya", "Remote"]);
});

test("incomplete experience records are not added to the profile", () => {
  const parsed = parseResumeText([
    "Experience",
    "Software Engineer | Missing Dates",
    "- Built internal tools.",
    "2019 - 2022",
    "Senior Developer",
    "Example Corp",
    "- Improved deployment workflows.",
  ].join("\n"));
  const mapped = mapParsedResumeToProfile(parsed, {
    name: "",
    email: "",
    phone: "",
    country: "",
    bio: "",
    skills: [],
    skillGroups: { core: [], tools: [], technical: [] },
    education: [],
    experience: [],
    certifications: [],
    projects: [],
    workPreferences: { workModes: [], targetRoles: [], preferredLocations: [], willingToRelocate: false },
  });

  assert.equal(mapped.experience.length, 1);
  assert.equal(mapped.experience[0].position, "Senior Developer");
});

test("multiple roles and labeled or numbered work bullets map to separate profile entries", () => {
  const parsed = parseResumeText([
    "Experience",
    "Senior Product Manager | Alpha Ltd | Lagos | Jan 2022 - Present",
    "- Led product strategy for regional teams.",
    "Project Management: Coordinated five cross-functional launches.",
    "Data & BI: Built weekly performance dashboards.",
    "1. Improved reporting turnaround by 30%.",
    "Product Analyst | Beta Group | Accra | Jan 2020 - Dec 2021",
    "- Analyzed customer and sales trends.",
    "Business Analyst | Gamma Co | Nairobi | 2018 - 2019",
    "- Documented business requirements.",
    "Operations Associate | Delta Ltd | Kampala | 2016 - 2018",
    "- Streamlined onboarding processes.",
    "Research Assistant | Epsilon Org | Kigali | 2014 - 2016",
    "- Prepared research summaries.",
  ].join("\n"));
  const mapped = mapParsedResumeToProfile(parsed, {
    name: "",
    email: "",
    phone: "",
    country: "",
    bio: "",
    skills: [],
    skillGroups: { core: [], tools: [], technical: [] },
    education: [],
    experience: [],
    certifications: [],
    projects: [],
    workPreferences: { workModes: [], targetRoles: [], preferredLocations: [], willingToRelocate: false },
  });

  assert.equal(mapped.experience.length, 5);
  assert.deepEqual(
    mapped.experience.slice(0, 2).map(({ position, company }) => [position, company]),
    [["Senior Product Manager", "Alpha Ltd"], ["Product Analyst", "Beta Group"]],
  );
  assert.deepEqual(mapped.experience[0].description.split("\n"), [
    "Led product strategy for regional teams.",
    "Project Management: Coordinated five cross-functional launches.",
    "Data & BI: Built weekly performance dashboards.",
    "Improved reporting turnaround by 30%.",
  ]);
  assert.equal(mapped.experience[0].startDate, "Jan 2022");
  assert.equal(mapped.experience[0].endDate, "Present");
});

test("resume summaries retain up to 1,500 characters", () => {
  const parsed = parseResumeText(`Professional Summary\n${"A".repeat(1600)}`);
  assert.equal(parsed.bio.length, 1500);
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
