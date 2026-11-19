import test from "node:test";
import assert from "node:assert/strict";
import { extractResumeText, parseResumeText, splitResumeSections } from "./resumeParser.js";

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
