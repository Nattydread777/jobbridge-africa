import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../services/api";
import PageBreadcrumb from "./PageBreadcrumb";
import { useAuth } from "../context/AuthContext";
import { extractResumeText, splitResumeSections } from "../utils/resumeParser";

const CV_INPUT_LIMIT = 30000;
const JOB_INPUT_LIMIT = 15000;
const COVER_LETTER_LIMIT = 10000;
const DOWNLOAD_SECTIONS = [
  ["summary", "Professional Summary"],
  ["skills", "Core Skills"],
  ["experience", "Experience"],
  ["education", "Education"],
  ["certifications", "Certifications"],
];

const linesFrom = (value) => String(value || "").split(/\r?\n/).map((line) => line.trim()).filter(Boolean);

const downloadBlob = (blob, filename) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
};

const CvOptimizerModal = ({ onClose, jobId: initialJobId = "" }) => {
  const [cvText, setCvText] = useState("");
  const [coverLetterText, setCoverLetterText] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [selectedJobId, setSelectedJobId] = useState(initialJobId);
  const [jobs, setJobs] = useState([]);
  const [jobsError, setJobsError] = useState("");
  const [result, setResult] = useState(null);
  const [draft, setDraft] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [readingFile, setReadingFile] = useState(false);
  const [consentGiven, setConsentGiven] = useState(false);
  const [aiConsentGiven, setAiConsentGiven] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteStatus, setDeleteStatus] = useState("");
  const [exporting, setExporting] = useState("");
  const { isAuthenticated, refreshUser } = useAuth();

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  useEffect(() => {
    let active = true;
    api.get("/jobs?limit=100")
      .then(({ data }) => {
        const activeJobs = Array.isArray(data) ? data : data?.jobs;
        if (!Array.isArray(activeJobs)) throw new Error("The jobs service returned an unexpected response.");
        if (active) setJobs(activeJobs);
      })
      .catch((requestError) => {
        if (!active) return;
        setJobsError(requestError.response?.data?.message || "Active job listings could not be loaded.");
      });
    return () => { active = false; };
  }, []);

  const handleFile = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setError("");
    setReadingFile(true);
    try {
      const extractedText = await extractResumeText(file);
      if (!extractedText.trim()) {
        throw new Error("No selectable text was found. For scanned documents, please paste your CV text instead.");
      }
      if (extractedText.length > CV_INPUT_LIMIT + COVER_LETTER_LIMIT) {
        throw new Error(`This document exceeds the ${CV_INPUT_LIMIT.toLocaleString()} character CV limit.`);
      }
      const parsed = splitResumeSections(extractedText);
      setCvText(parsed.resumeText);
      setCoverLetterText(parsed.coverLetter.slice(0, COVER_LETTER_LIMIT));
      invalidateReview();
    } catch (fileError) {
      setError(fileError.message || "The selected file could not be read. Please paste your CV text instead.");
    } finally {
      setReadingFile(false);
      event.target.value = "";
    }
  };

  const createDraft = (sections) => ({
    header: sections.header,
    summary: sections.summary,
    skills: sections.skills.join("\n"),
    experience: sections.experience.join("\n"),
    education: sections.education.join("\n"),
    certifications: sections.certifications.join("\n"),
  });

  const invalidateReview = () => {
    setResult(null);
    setDraft(null);
    setAiConsentGiven(false);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setResult(null);
    setDraft(null);
    setAiConsentGiven(false);
    if (!consentGiven) {
      setError("Please read and accept the CV processing disclosure before continuing.");
      return;
    }
    if (!cvText.trim() || (!selectedJobId && !jobDescription.trim())) {
      setError("Add your CV and either select an active job or paste a target job description.");
      return;
    }
    if (cvText.length > CV_INPUT_LIMIT || jobDescription.length > JOB_INPUT_LIMIT
      || coverLetterText.length > COVER_LETTER_LIMIT) {
      setError("The CV, cover letter, or job description exceeds its character limit.");
      return;
    }
    const sections = splitResumeSections(cvText);
    const actualCvText = sections.resumeText;
    const detectedCoverLetter = coverLetterText || sections.coverLetter;
    if (!actualCvText.trim()) {
      setError("Add CV content before the cover letter section.");
      return;
    }
    setCvText(actualCvText);
    setCoverLetterText(detectedCoverLetter);
    setLoading(true);
    try {
      const response = await api.post("/ai/optimize-cv", {
        cvText: actualCvText,
        coverLetterText: detectedCoverLetter,
        jobDescription,
        jobId: selectedJobId || undefined,
        consent: true,
        mode: "diagnostic",
      });
      setResult(response.data);
      setDraft(createDraft(sections));
    } catch (requestError) {
      setError(requestError.response?.data?.message || "We couldn't process your CV right now. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleAiReview = async () => {
    setError("");
    if (!aiConsentGiven) {
      setError("Please opt in to optional third-party AI review before continuing.");
      return;
    }
    setLoading(true);
    try {
      const response = await api.post("/ai/optimize-cv", {
        cvText,
        coverLetterText,
        jobDescription,
        jobId: selectedJobId || undefined,
        consent: true,
        aiConsent: true,
        mode: "ai_review",
      });
      setResult(response.data);
    } catch (requestError) {
      setError(requestError.response?.data?.message || "AI review is unavailable right now. Your diagnostic remains available.");
    } finally {
      setLoading(false);
    }
  };

  const handleRewriteDecision = (index, accepted) => {
    const rewrite = result?.rewrites?.[index];
    if (!rewrite) return;
    if (accepted !== rewrite.accepted && rewrite.suggested) {
      const from = accepted ? rewrite.original : rewrite.suggested;
      const to = accepted ? rewrite.suggested : rewrite.original;
      setDraft((current) => {
        if (!current) return current;
        const next = { ...current };
        for (const key of ["summary", "skills", "experience", "education", "certifications"]) {
          if (next[key]?.includes(from)) {
            next[key] = next[key].replace(from, to);
            break;
          }
        }
        return next;
      });
    }
    setResult((current) => ({
      ...current,
      rewrites: current.rewrites.map((entry, currentIndex) => (
        currentIndex === index ? { ...entry, accepted, rejected: !accepted } : entry
      )),
    }));
  };

  const handleSummaryDecision = (accepted) => {
    const rewrite = result?.summary_rewrite;
    if (!rewrite) return;
    if (accepted !== rewrite.accepted && rewrite.suggested) {
      setDraft((current) => current && {
        ...current,
        summary: accepted ? rewrite.suggested : rewrite.original,
      });
    }
    setResult((current) => ({
      ...current,
      summary_rewrite: { ...current.summary_rewrite, accepted, rejected: !accepted },
    }));
  };

  const handleDeleteData = async () => {
    if (!window.confirm("Delete your saved profile CV and uploaded CV files attached to applications from JobBridge-managed storage?")) return;
    setDeleting(true);
    setDeleteStatus("");
    try {
      const { data } = await api.delete("/auth/cv-data");
      setDeleteStatus(data.message);
      setCvText("");
      setCoverLetterText("");
      setResult(null);
      setDraft(null);
      await refreshUser();
    } catch (requestError) {
      setDeleteStatus(requestError.response?.data?.message || "We couldn't delete your saved CV data. Please try again or contact support.");
    } finally {
      setDeleting(false);
    }
  };

  const exportWord = async () => {
    if (!draft) return;
    setExporting("word");
    try {
      const { Document, HeadingLevel, Packer, Paragraph } = await import("docx");
      const children = [
        new Paragraph({ text: "Curriculum Vitae", heading: HeadingLevel.TITLE }),
        ...linesFrom(draft.header).map((line) => new Paragraph({ text: line })),
      ];
      for (const [key, title] of DOWNLOAD_SECTIONS) {
        const content = linesFrom(draft[key]);
        if (!content.length) continue;
        children.push(new Paragraph({ text: title, heading: HeadingLevel.HEADING_1 }));
        children.push(...content.map((line) => new Paragraph({
          text: line.replace(/^(?:[-*•▪◦‣]|\d+[.)])\s+/, ""),
          ...(key === "experience" ? { bullet: { level: 0 } } : {}),
        })));
      }
      const blob = await Packer.toBlob(new Document({ sections: [{ children }] }));
      downloadBlob(blob, "jobbridge-cv.docx");
    } catch (exportError) {
      setError(`Word export failed: ${exportError.message}`);
    } finally {
      setExporting("");
    }
  };

  const exportPdf = async () => {
    if (!draft) return;
    setExporting("pdf");
    try {
      const { jsPDF } = await import("jspdf");
      const pdf = new jsPDF({ unit: "pt", format: "a4" });
      const left = 52;
      const width = 490;
      let y = 52;
      const addText = (text, size, bold = false) => {
        pdf.setFont("helvetica", bold ? "bold" : "normal");
        pdf.setFontSize(size);
        const wrapped = pdf.splitTextToSize(text, width);
        for (const line of wrapped) {
          if (y > 780) {
            pdf.addPage();
            y = 52;
          }
          pdf.text(line, left, y);
          y += size + 6;
        }
      };
      addText("Curriculum Vitae", 20, true);
      y += 6;
      linesFrom(draft.header).forEach((line) => addText(line, 10));
      for (const [key, title] of DOWNLOAD_SECTIONS) {
        const content = linesFrom(draft[key]);
        if (!content.length) continue;
        y += 8;
        addText(title, 13, true);
        content.forEach((line) => addText(line, 10));
      }
      pdf.save("jobbridge-cv.pdf");
    } catch (exportError) {
      setError(`PDF export failed: ${exportError.message}`);
    } finally {
      setExporting("");
    }
  };

  return (
    <div className="fixed inset-0 z-[70] overflow-y-auto bg-[#f2eee6] px-3 py-4 md:px-8 md:py-8">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="cv-optimizer-title"
        className="mx-auto my-2 max-w-6xl overflow-hidden rounded-[2rem] border border-stone-200 bg-offwhite shadow-2xl"
      >
        <div className="flex items-center justify-between gap-4 border-b border-stone-200 bg-white px-6 py-4 md:px-10">
          <PageBreadcrumb />
          <button type="button" onClick={onClose} aria-label="Close CV refinisher" className="rounded-full px-3 py-1 text-2xl text-stone-500 hover:bg-stone-100">×</button>
        </div>
        <div className="p-6 md:p-10">
          <div className="mb-6">
            <p className="mb-2 text-sm font-bold uppercase tracking-[0.18em] text-terracotta">Career intelligence workspace</p>
            <h1 id="cv-optimizer-title" className="text-3xl font-black text-charcoal">CV Refinisher &amp; Match</h1>
            <p className="mt-2 max-w-2xl text-sm text-stone-600">Start with a free phrase-based diagnostic, then choose whether to request AI-assisted edits. Scores and suggestions are guidance only—not employment guarantees or hiring decisions.</p>
          </div>

          <section className="mb-5 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm leading-6 text-blue-950">
            <h2 className="font-bold">How your CV is processed</h2>
            <p className="mt-1">The free diagnostic sends your CV text and selected job information to JobBridge Africa's backend for rule-based analysis. It is not retained after the request. Optional AI review is a separate choice: if enabled, direct contact details and the detected candidate name are redacted before the text is sent to OpenAI, but the AI may still process other contextual information. OpenAI's API abuse-monitoring retention is generally up to 30 days under its current policies; provider-specific controls can differ. The AI output is guidance and must be checked for accuracy.</p>
            <p className="mt-2">Your CV refinement inputs are not saved to your account or application records by this tool. Text stays in this page until you clear it or leave. CVs separately uploaded to a profile or application remain in JobBridge-managed storage until deleted. Use “Delete my data” below to remove saved profile and application CV files.</p>
          </section>
          <label className="mb-5 flex items-start gap-3 rounded-xl border border-slate-300 bg-white p-4 text-sm leading-6 text-slate-800">
            <input type="checkbox" checked={consentGiven} disabled={loading} onChange={(event) => { setConsentGiven(event.target.checked); if (!event.target.checked) invalidateReview(); }} className="mt-1" />
            <span>I have read the CV processing disclosure and consent to sending my CV and job information to JobBridge Africa for analysis. Optional OpenAI processing requires a separate opt-in. See our <Link to="/privacy" className="font-semibold underline">Privacy Policy</Link>.</span>
          </label>

          <form onSubmit={handleSubmit} className="grid gap-5">
            <label className="grid gap-2 text-sm font-semibold text-charcoal">
              CV / resume text
              <textarea value={cvText} onChange={(event) => { setCvText(event.target.value); invalidateReview(); }} disabled={!consentGiven || loading} maxLength={CV_INPUT_LIMIT + COVER_LETTER_LIMIT} required rows={8} placeholder="Paste your CV text here..." className="w-full rounded-xl border border-stone-300 bg-white p-4 font-normal outline-none focus:border-terracotta focus:ring-2 focus:ring-terracotta/20" />
              <span className="font-normal text-stone-500">{cvText.length.toLocaleString()} / {CV_INPUT_LIMIT.toLocaleString()} CV characters</span>
            </label>
            <label className={`w-fit rounded-lg border border-stone-300 bg-white px-4 py-2 text-sm font-semibold text-charcoal hover:bg-stone-100 ${readingFile ? "cursor-wait opacity-70" : "cursor-pointer"}`}>
              <span>{readingFile ? "Reading your document..." : "Upload CV (TXT, DOCX, PDF, or text formats)"}</span>
              <input type="file" accept=".txt,.md,.csv,.html,.htm,.rtf,.docx,.pdf,text/plain,text/markdown,text/csv,text/html,application/rtf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/pdf" onChange={handleFile} disabled={readingFile || loading || !consentGiven} className="sr-only" />
            </label>
            <label className="grid gap-2 text-sm font-semibold text-charcoal">
              Cover letter (optional; kept separate from your CV)
              <textarea value={coverLetterText} onChange={(event) => { setCoverLetterText(event.target.value); invalidateReview(); }} disabled={!consentGiven || loading} maxLength={COVER_LETTER_LIMIT} rows={4} placeholder="Paste cover-letter text here, if you want it included in the review." className="w-full rounded-xl border border-stone-300 bg-white p-4 font-normal outline-none focus:border-terracotta focus:ring-2 focus:ring-terracotta/20" />
              <span className="font-normal text-stone-500">{coverLetterText.length.toLocaleString()} / {COVER_LETTER_LIMIT.toLocaleString()} characters</span>
            </label>
            <fieldset disabled={!consentGiven} className="grid gap-3 rounded-xl border border-stone-200 bg-white p-4">
              <legend className="px-2 text-sm font-semibold text-charcoal">Choose a target role</legend>
              <label className="grid gap-2 text-sm font-semibold text-charcoal">
                Active JobBridge listing
                <select value={selectedJobId} disabled={loading} onChange={(event) => { setSelectedJobId(event.target.value); invalidateReview(); }} className="rounded-lg border border-stone-300 bg-white p-3 font-normal">
                  <option value="">Select an active job (optional)</option>
                  {jobs.map((job) => <option key={job._id} value={job._id}>{job.title} — {job.companyName}</option>)}
                </select>
                {jobsError && <span role="status" className="font-normal text-amber-800">{jobsError} You can paste the job description instead.</span>}
              </label>
              <label className="grid gap-2 text-sm font-semibold text-charcoal">
                Or paste a job description
                <textarea value={jobDescription} onChange={(event) => { setJobDescription(event.target.value); invalidateReview(); }} disabled={loading} maxLength={JOB_INPUT_LIMIT} rows={6} placeholder="Paste the role's job description..." className="w-full rounded-xl border border-stone-300 bg-white p-4 font-normal outline-none focus:border-terracotta focus:ring-2 focus:ring-terracotta/20" />
                <span className="font-normal text-stone-500">{jobDescription.length.toLocaleString()} / {JOB_INPUT_LIMIT.toLocaleString()} characters</span>
              </label>
            </fieldset>
            {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
            <button type="submit" disabled={loading || !consentGiven || !cvText.trim() || (!selectedJobId && !jobDescription.trim())} aria-busy={loading} className="inline-flex w-fit items-center gap-2 rounded-xl bg-terracotta px-6 py-3 font-bold text-white transition hover:bg-terracotta-dark disabled:cursor-not-allowed disabled:opacity-60">
              {loading && <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" aria-hidden="true" />}
              {loading ? "Reviewing your CV..." : "Run free diagnostic"}
            </button>
          </form>

          <section className="mt-6 rounded-xl border border-stone-200 bg-white p-4">
            <h2 className="font-bold text-charcoal">Delete my saved CV data</h2>
            <p className="mt-1 text-sm leading-6 text-stone-600">This removes your profile CV and uploaded CV files attached to your applications from JobBridge-managed storage. Application details remain; employers who already received a copy may retain it.</p>
            {isAuthenticated ? (
              <button type="button" onClick={handleDeleteData} disabled={deleting} className="mt-3 rounded-lg border border-red-300 px-4 py-2 font-semibold text-red-800 hover:bg-red-50 disabled:opacity-60">{deleting ? "Deleting…" : "Delete my data"}</button>
            ) : <p className="mt-3 text-sm">Sign in to delete saved CV files from your account. <Link to="/login" className="font-semibold text-terracotta underline">Sign in</Link></p>}
            {deleteStatus && <p role="status" className="mt-3 text-sm text-slate-700">{deleteStatus}</p>}
          </section>

          {result && (
            <div className="mt-8 space-y-6 border-t border-stone-200 pt-6">
              <section className="grid gap-4 sm:grid-cols-3">
                <article className="rounded-2xl bg-charcoal p-5 text-white">
                  <p className="text-sm font-semibold text-stone-300">Overall role fit</p>
                  <p className="mt-2 text-4xl font-black text-amber-300">{result.overall_score}%</p>
                  <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/15" role="progressbar" aria-label="Overall role fit" aria-valuemin="0" aria-valuemax="100" aria-valuenow={result.overall_score}>
                    <div className="h-full rounded-full bg-amber-400" style={{ width: `${result.overall_score}%` }} />
                  </div>
                </article>
                <article className="rounded-2xl bg-emerald-50 p-5"><p className="text-sm font-semibold text-emerald-800">Skills match</p><p className="mt-2 text-3xl font-black text-emerald-950">{result.skills.score}%</p><p className="mt-1 text-sm text-emerald-800">{result.skills.matched.length} relevant skill phrases found</p></article>
                <article className="rounded-2xl bg-amber-50 p-5"><p className="text-sm font-semibold text-amber-900">Experience fit</p><p className="mt-2 text-3xl font-black text-amber-950">{result.experience.score}%</p><p className="mt-1 text-sm text-amber-900">{result.experience.notes}</p></article>
              </section>
              <section className="rounded-xl border border-sky-200 bg-sky-50 p-4">
                <h2 className="font-bold text-sky-950">Logistics &amp; Eligibility</h2>
                <p className="mt-1 text-sm text-sky-900">Status: {result.logistics.status.replaceAll("_", " ")}</p>
                {result.logistics.notes.length ? <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-sky-900">{result.logistics.notes.map((note) => <li key={note}>{note}</li>)}</ul> : <p className="mt-2 text-sm text-sky-900">No specific schedule, location, relocation, or work-authorization conditions were detected. Confirm them with the employer.</p>}
              </section>
              <section className="grid gap-4 md:grid-cols-2">
                <article className="rounded-xl bg-emerald-50 p-4"><h2 className="font-bold text-emerald-900">Relevant skill phrases</h2><p className="mt-2 text-sm text-emerald-800">{result.skills.matched.join(", ") || "No recognized skill phrases found in the target role."}</p></article>
                <article className="rounded-xl bg-amber-50 p-4"><h2 className="font-bold text-amber-950">Top requirements to review</h2>{result.must_have_gaps.length ? <ul className="mt-2 space-y-3 text-sm text-amber-950">{result.must_have_gaps.map((gap, index) => <li key={`${gap.skill}-${index}`}><strong>{gap.skill}</strong><p>{gap.guidance}</p></li>)}</ul> : <p className="mt-2 text-sm text-amber-900">No must-have gaps were identified.</p>}</article>
              </section>
              {result.ats_flags.length > 0 && <section className="rounded-xl border border-orange-200 bg-orange-50 p-4"><h2 className="font-bold text-orange-950">ATS parsing checks</h2><ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-orange-900">{result.ats_flags.map((flag) => <li key={flag}>{flag}</li>)}</ul></section>}

              {result.ai_review_available && !result.ai_review_used && (
                <section className="rounded-xl border border-violet-200 bg-violet-50 p-4">
                  <h2 className="font-bold text-violet-950">Optional AI review</h2>
                  <p className="mt-1 text-sm leading-6 text-violet-900">With your separate opt-in, direct contact details and your detected name are redacted before CV text is sent to OpenAI. AI-generated edits are suggestions only; review each one for accuracy before accepting.</p>
                  <label className="mt-3 flex items-start gap-2 text-sm leading-6 text-violet-950"><input type="checkbox" checked={aiConsentGiven} onChange={(event) => setAiConsentGiven(event.target.checked)} className="mt-1" />I explicitly consent to optional OpenAI processing of the redacted CV and job description.</label>
                  <button type="button" onClick={handleAiReview} disabled={loading || !aiConsentGiven} className="mt-3 rounded-lg bg-violet-800 px-4 py-2 font-semibold text-white disabled:opacity-50">{loading ? "Requesting AI review…" : "Let AI Review & Format My CV"}</button>
                </section>
              )}
              {result.ai_review_used && <p className="rounded-lg border border-violet-200 bg-violet-50 p-3 text-sm text-violet-950">AI-assisted suggestions from {result.ai_provider} are ready. Verify every statement; unsupported additions are marked “Add only if true.”</p>}
              {(result.summary_rewrite?.suggested || result.summary_rewrite?.add_only_if_true) && (
                <section className="rounded-xl border border-violet-200 bg-white p-4">
                  <h2 className="font-bold text-charcoal">Summary rewrite suggestion</h2>
                  {result.summary_rewrite.add_only_if_true
                    ? <p className="mt-2 text-sm font-semibold text-amber-800">Add only if true: {result.summary_rewrite.unverified_addition}</p>
                    : <>
                      <p className="mt-2 text-sm text-stone-600"><strong>Original:</strong> {result.summary_rewrite.original}</p>
                      <p className="mt-2 text-sm text-stone-700"><strong>Suggested:</strong> {result.summary_rewrite.suggested}</p>
                    </>}
                  <p className="mt-1 text-xs text-stone-500">{result.summary_rewrite.reason}</p>
                  {!result.summary_rewrite.add_only_if_true && <div className="mt-3 flex gap-2"><button type="button" onClick={() => handleSummaryDecision(true)} className="rounded-lg bg-emerald-700 px-3 py-2 text-sm font-semibold text-white">Accept</button><button type="button" onClick={() => handleSummaryDecision(false)} className="rounded-lg border border-stone-300 px-3 py-2 text-sm font-semibold">Reject</button></div>}
                </section>
              )}
              {result.rewrites?.length > 0 && (
                <section className="space-y-3">
                  <h2 className="text-lg font-bold text-charcoal">Grounded rewrite suggestions</h2>
                  {result.rewrites.map((rewrite, index) => (
                    <article key={`${index}-${rewrite.original}`} className="rounded-xl border border-stone-200 bg-white p-4">
                      {rewrite.add_only_if_true ? <p className="mb-2 text-sm font-bold text-amber-800">Add only if true: {rewrite.unverified_addition}</p> : <><p className="text-sm text-stone-600"><strong>Original:</strong> {rewrite.original}</p><p className="mt-2 text-sm text-charcoal"><strong>Suggested:</strong> {rewrite.suggested}</p></>}
                      <p className="mt-1 text-xs text-stone-500">{rewrite.reason}</p>
                      {!rewrite.add_only_if_true && <div className="mt-3 flex gap-2"><button type="button" onClick={() => handleRewriteDecision(index, true)} className="rounded-lg bg-emerald-700 px-3 py-2 text-sm font-semibold text-white">Accept</button><button type="button" onClick={() => handleRewriteDecision(index, false)} className="rounded-lg border border-stone-300 px-3 py-2 text-sm font-semibold">Reject</button></div>}
                    </article>
                  ))}
                </section>
              )}

              {draft && (
                <section className="space-y-4 rounded-2xl border border-stone-200 bg-white p-5">
                  <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-lg font-bold text-charcoal">Editable ATS-friendly CV preview</h2><div className="flex gap-2"><button type="button" onClick={exportWord} disabled={Boolean(exporting)} className="rounded-lg border border-stone-300 px-3 py-2 text-sm font-semibold disabled:opacity-50">{exporting === "word" ? "Preparing…" : "Download Word (.docx)"}</button><button type="button" onClick={exportPdf} disabled={Boolean(exporting)} className="rounded-lg border border-stone-300 px-3 py-2 text-sm font-semibold disabled:opacity-50">{exporting === "pdf" ? "Preparing…" : "Download PDF"}</button></div></div>
                  {[
                    ["header", "Header & Contact"],
                    ["summary", "Summary"],
                    ["skills", "Core Skills"],
                    ["experience", "Experience & Bullets"],
                    ["education", "Education"],
                    ["certifications", "Certifications"],
                  ].map(([key, title]) => (
                    <label key={key} className="grid gap-2 text-sm font-semibold text-charcoal">{title}<textarea value={draft[key]} onChange={(event) => setDraft((current) => ({ ...current, [key]: event.target.value }))} rows={key === "header" ? 3 : key === "experience" ? 7 : 4} className="w-full rounded-lg border border-stone-300 p-3 font-normal leading-6" /></label>
                  ))}
                </section>
              )}
              <p className="rounded-lg bg-stone-100 p-3 text-xs leading-relaxed text-stone-600">{result.note} Review all AI suggestions before export and do not include any detail that is not true.</p>
              {result.daily_allowance && <p className="text-xs text-stone-500">Daily free reviews remaining: {result.daily_allowance.remaining} of {result.daily_allowance.dailyLimit}.</p>}
            </div>
          )}

          <p className="mt-6 text-xs text-stone-500">Want more career services? <Link to="/pricing" className="font-semibold text-terracotta underline">Explore plans</Link></p>
        </div>
      </section>
    </div>
  );
};

export default CvOptimizerModal;
