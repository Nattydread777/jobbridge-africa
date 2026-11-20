import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../services/api";
import PageBreadcrumb from "./PageBreadcrumb";
import { useAuth } from "../context/AuthContext";
import { extractResumeText, splitResumeSections } from "../utils/resumeParser";
import { createCvDocxBlob, createCvPdf } from "../utils/cvExport";

const CV_INPUT_LIMIT = 30000;
const JOB_INPUT_LIMIT = 15000;
const COVER_LETTER_LIMIT = 10000;
const AI_PROGRESS_STEPS = [
  "Running job requirement, summary, skills, and experience analyses in parallel…",
  "Checking generated experience edits against source bullets…",
  "Provider network, timeout, and rate errors are automatically retried once…",
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

const createStructuredDraft = (sections) => {
  const parsed = sections.structured || {};
  return {
    contact: { ...(parsed.contact || {}) },
    summary: parsed.summary || "",
    skills: [...(parsed.skills || [])],
    experience: (parsed.experience || []).map((role) => ({
      ...role,
      bullets: role.bullets.map((sourceBullet) => ({
        sourceBullet,
        tailoredBullet: "",
        editedText: sourceBullet,
        reason: "",
        traceable: false,
        accepted: false,
      })),
    })),
    education: [...(parsed.education || [])],
    certifications: [...(parsed.certifications || [])],
  };
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
  const [aiProgress, setAiProgress] = useState("");
  const [aiReviewLoading, setAiReviewLoading] = useState(false);
  const [savingCv, setSavingCv] = useState(false);
  const [savedCvId, setSavedCvId] = useState("");
  const [saveStatus, setSaveStatus] = useState("");
  const { isAuthenticated, refreshUser } = useAuth();
  const navigate = useNavigate();

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

  useEffect(() => {
    if (!aiReviewLoading) {
      setAiProgress("");
      return undefined;
    }
    let step = 0;
    setAiProgress(AI_PROGRESS_STEPS[step]);
    const timer = setInterval(() => {
      step = (step + 1) % AI_PROGRESS_STEPS.length;
      setAiProgress(AI_PROGRESS_STEPS[step]);
    }, 3500);
    return () => clearInterval(timer);
  }, [aiReviewLoading]);

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

  const invalidateReview = () => {
    setResult(null);
    setDraft(null);
    setAiConsentGiven(false);
    setSavedCvId("");
    setSaveStatus("");
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
      setDraft(createStructuredDraft(sections));
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
    setAiReviewLoading(true);
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
      setSavedCvId("");
    } catch (requestError) {
      setError(requestError.response?.data?.message || "AI review is unavailable right now. Your diagnostic remains available.");
    } finally {
      setLoading(false);
      setAiReviewLoading(false);
    }
  };

  const handleSummaryDecision = (accepted) => {
    const tailored = result?.tailored_cv?.summary;
    if (!tailored) return;
    setDraft((current) => current && {
      ...current,
      summary: accepted ? tailored.tailored : tailored.original,
    });
    setResult((current) => ({
      ...current,
      tailored_cv: {
        ...current.tailored_cv,
        summary: { ...current.tailored_cv.summary, accepted },
      },
    }));
  };

  const handleSkillsDecision = (accepted) => {
    const suggestedSkills = result?.tailored_cv?.skills;
    if (!Array.isArray(suggestedSkills)) return;
    setDraft((current) => ({
      ...current,
      skills: accepted ? suggestedSkills : result.cv_sections.skills,
    }));
    setResult((current) => ({ ...current, skills_tailoring_accepted: accepted }));
  };

  const handleBulletDecision = (roleIndex, bulletIndex, accepted) => {
    const suggestion = result?.tailored_cv?.experience?.[roleIndex]?.bullets?.[bulletIndex];
    if (!suggestion?.traceable) return;
    setDraft((current) => ({
      ...current,
      experience: current.experience.map((role, currentRoleIndex) => (
        currentRoleIndex !== roleIndex ? role : {
          ...role,
          bullets: role.bullets.map((bullet, currentBulletIndex) => (
            currentBulletIndex !== bulletIndex ? bullet : {
              ...bullet,
              editedText: accepted ? suggestion.tailoredBullet : suggestion.sourceBullet,
              accepted,
            }
          )),
        }
      )),
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
      setSavedCvId("");
      await refreshUser();
    } catch (requestError) {
      setDeleteStatus(requestError.response?.data?.message || "We couldn't delete your saved CV data. Please try again or contact support.");
    } finally {
      setDeleting(false);
    }
  };

  const handleSaveTailoredCv = async () => {
    if (!draft || !selectedJobId || !isAuthenticated || !result?.ai_review_used) return;
    setSavingCv(true);
    setSaveStatus("");
    try {
      const { data } = await api.post("/ai/tailored-cvs", {
        jobId: selectedJobId,
        sections: draft,
        source: "ai_assisted",
      });
      setSavedCvId(data.id);
      setSaveStatus(data.message);
    } catch (requestError) {
      setSaveStatus(requestError.response?.data?.message || "Could not save this tailored CV. Please try again.");
    } finally {
      setSavingCv(false);
    }
  };

  const applyWithSavedCv = () => {
    if (!selectedJobId || !savedCvId) return;
    const selectedJob = jobs.find((job) => job._id === selectedJobId);
    const canApplyOnPlatform = selectedJob?.source === "employer" && selectedJob?.isDirectPosting !== false;
    if (!canApplyOnPlatform) {
      setSaveStatus("This listing uses an external application site. Use its application link instead.");
      return;
    }
    navigate(`/jobs/${encodeURIComponent(selectedJobId)}?tailoredCvId=${encodeURIComponent(savedCvId)}#apply`);
  };

  const exportWord = async () => {
    if (!draft) return;
    setExporting("word");
    try {
      const blob = await createCvDocxBlob(draft);
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
      const pdf = await createCvPdf(draft);
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
            <p className="mt-1">The free diagnostic sends your CV text and selected job information to JobBridge Africa's backend for rule-based analysis. It is not retained after the request. Optional AI tailoring is a separate choice: if enabled, direct contact details and the detected candidate name are redacted before the remaining CV is sent to the configured AI provider (Gemini or OpenAI). The provider may process contextual CV information under its own policies. AI-generated text is a suggestion, not a verified fact; review it and its source bullet before use.</p>
            <p className="mt-2">Your CV inputs are not saved by this tool unless you explicitly choose “Save tailored CV for this job.” Saved versions are stored with your account and removed by “Delete my saved CV data.” Text otherwise stays in this page until you clear it or leave. Separately uploaded profile/application CVs remain in JobBridge-managed storage until deleted.</p>
          </section>
          <label className="mb-5 flex items-start gap-3 rounded-xl border border-slate-300 bg-white p-4 text-sm leading-6 text-slate-800">
            <input type="checkbox" checked={consentGiven} disabled={loading} onChange={(event) => { setConsentGiven(event.target.checked); if (!event.target.checked) invalidateReview(); }} className="mt-1" />
            <span>I have read the CV processing disclosure and consent to sending my CV and job information to JobBridge Africa for analysis. Optional third-party AI processing requires a separate opt-in. See our <Link to="/privacy" className="font-semibold underline">Privacy Policy</Link>.</span>
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

              {result.job_requirements && (
                <section className="grid gap-4 md:grid-cols-2">
                  <article className="rounded-xl border border-rose-200 bg-rose-50 p-4">
                    <h2 className="font-bold text-rose-950">Job must-haves</h2>
                    <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-rose-900">
                      {result.job_requirements.must_haves.map((item) => <li key={item}>{item}</li>)}
                      {!result.job_requirements.must_haves.length && <li>No explicit must-haves detected.</li>}
                    </ul>
                  </article>
                  <article className="rounded-xl border border-indigo-200 bg-indigo-50 p-4">
                    <h2 className="font-bold text-indigo-950">Nice-to-haves</h2>
                    <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-indigo-900">
                      {result.job_requirements.nice_to_haves.map((item) => <li key={item}>{item}</li>)}
                      {!result.job_requirements.nice_to_haves.length && <li>No explicit nice-to-haves detected.</li>}
                    </ul>
                  </article>
                </section>
              )}
              {result.ai_job_analysis_fallback && <p role="status" className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">The optional AI job-requirement extraction was unavailable, so the requirements shown use JobBridge Africa’s rule-based analysis.</p>}

              {result.ai_review_available && !result.ai_review_used && (
                <section className="rounded-xl border border-violet-200 bg-violet-50 p-4">
                  <h2 className="font-bold text-violet-950">Optional AI tailoring</h2>
                  <p className="mt-1 text-sm leading-6 text-violet-900">With separate opt-in, direct contact details and the detected candidate name are redacted before CV text is sent to the configured third-party AI provider. The service generates focused summary, skill, experience, and job-requirement results in parallel and retries transient failures once. Review all edits and source links before accepting.</p>
                  <label className="mt-3 flex items-start gap-2 text-sm leading-6 text-violet-950"><input type="checkbox" checked={aiConsentGiven} disabled={loading} onChange={(event) => setAiConsentGiven(event.target.checked)} className="mt-1" />I explicitly consent to optional AI processing of the redacted CV and job description.</label>
                  <button type="button" onClick={handleAiReview} disabled={loading || !aiConsentGiven} className="mt-3 rounded-lg bg-violet-800 px-4 py-2 font-semibold text-white disabled:opacity-50">{loading ? "Tailoring your CV…" : "Let AI Review & Tailor My CV"}</button>
                  {result.daily_allowance && <p className="mt-2 text-xs text-violet-900">Free AI tailorings remaining today: {result.daily_allowance.aiTailoringsRemaining} of {result.daily_allowance.aiTailoringLimit}.</p>}
                </section>
              )}
              {aiReviewLoading && <p role="status" aria-live="polite" className="rounded-lg bg-violet-50 p-3 text-sm text-violet-950">{aiProgress || "Preparing focused review requests…"}</p>}
              {result.ai_review_used && <p className="rounded-lg border border-violet-200 bg-violet-50 p-3 text-sm text-violet-950">AI-assisted suggestions from {result.ai_provider} are ready. Unsupported or untraceable additions are listed under “Gaps: add only if true.” Review each source bullet before accepting.</p>}
              {result.tailored_cv && (
                <div className="space-y-4">
                  <section className="rounded-xl border border-violet-200 bg-white p-4">
                    <h2 className="font-bold text-charcoal">Summary: original vs tailored</h2>
                    <div className="mt-3 grid gap-3 md:grid-cols-2">
                      <p className="rounded-lg bg-stone-50 p-3 text-sm"><strong>Original</strong><br />{result.tailored_cv.summary.original || "No summary section found."}</p>
                      <p className="rounded-lg bg-violet-50 p-3 text-sm"><strong>Tailored</strong><br />{result.tailored_cv.summary.tailored || result.tailored_cv.summary.untraceableSuggestion || "No grounded summary suggestion."}</p>
                    </div>
                    {result.tailored_cv.summary.traceable && <div className="mt-3 flex gap-2"><button type="button" onClick={() => handleSummaryDecision(true)} className="rounded-lg bg-emerald-700 px-3 py-2 text-sm font-semibold text-white">Accept</button><button type="button" onClick={() => handleSummaryDecision(false)} className="rounded-lg border border-stone-300 px-3 py-2 text-sm font-semibold">Reject</button></div>}
                  </section>
                  <section className="rounded-xl border border-stone-200 bg-white p-4">
                    <h2 className="font-bold text-charcoal">Skills: original vs tailored order</h2>
                    <div className="mt-3 grid gap-3 md:grid-cols-2">
                      <p className="rounded-lg bg-stone-50 p-3 text-sm"><strong>Original</strong><br />{result.cv_sections.skills.join(", ") || "No labeled skills section found."}</p>
                      <p className="rounded-lg bg-violet-50 p-3 text-sm"><strong>Suggested (source skills only)</strong><br />{result.tailored_cv.skills.join(", ") || "No skill ordering suggestion."}</p>
                    </div>
                    {result.tailored_cv.skills.length > 0 && <div className="mt-3 flex gap-2"><button type="button" onClick={() => handleSkillsDecision(true)} className="rounded-lg bg-emerald-700 px-3 py-2 text-sm font-semibold text-white">Accept</button><button type="button" onClick={() => handleSkillsDecision(false)} className="rounded-lg border border-stone-300 px-3 py-2 text-sm font-semibold">Reject</button></div>}
                  </section>
                  <section className="space-y-3">
                    <h2 className="text-lg font-bold text-charcoal">Experience bullets: source vs tailored</h2>
                    {result.tailored_cv.experience.flatMap((role, roleIndex) => role.bullets.map((bullet, bulletIndex) => (
                      <article key={`${roleIndex}-${bulletIndex}`} className="rounded-xl border border-stone-200 bg-white p-4">
                        <p className="mb-2 text-sm font-semibold">{[role.title, role.company, role.dates].filter(Boolean).join(" · ") || `Experience item ${roleIndex + 1}`}</p>
                        <div className="grid gap-3 md:grid-cols-2">
                          <p className="rounded-lg bg-stone-50 p-3 text-sm"><strong>Original</strong><br />{bullet.sourceBullet}</p>
                          <p className="rounded-lg bg-violet-50 p-3 text-sm"><strong>Tailored</strong><br />{bullet.traceable ? bullet.tailoredBullet : bullet.untraceableSuggestion || "No source-traceable rewrite returned."}</p>
                        </div>
                        {bullet.traceable
                          ? <div className="mt-3 flex gap-2"><button type="button" onClick={() => handleBulletDecision(roleIndex, bulletIndex, true)} className="rounded-lg bg-emerald-700 px-3 py-2 text-sm font-semibold text-white">Accept</button><button type="button" onClick={() => handleBulletDecision(roleIndex, bulletIndex, false)} className="rounded-lg border border-stone-300 px-3 py-2 text-sm font-semibold">Reject</button></div>
                          : <p className="mt-2 text-xs font-semibold text-amber-800">Untraceable suggestion — not applied to your CV.</p>}
                      </article>
                    )))}
                  </section>
                  <section className="rounded-xl border border-amber-300 bg-amber-50 p-4">
                    <h2 className="font-bold text-amber-950">Gaps: add only if true</h2>
                    {result.tailored_cv.gaps.length
                      ? <ul className="mt-2 space-y-2 text-sm text-amber-950">{result.tailored_cv.gaps.map((gap, index) => <li key={`${gap.requirement}-${index}`}><strong>{gap.requirement}</strong><p>{gap.guidance}</p></li>)}</ul>
                      : <p className="mt-2 text-sm text-amber-900">No unsupported requirements were detected.</p>}
                  </section>
                </div>
              )}

              {draft && (
                <section className="space-y-4 rounded-2xl border border-stone-200 bg-white p-5">
                  <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-lg font-bold text-charcoal">Editable ATS-friendly CV preview</h2><div className="flex flex-wrap gap-2"><button type="button" onClick={exportWord} disabled={Boolean(exporting)} className="rounded-lg border border-stone-300 px-3 py-2 text-sm font-semibold disabled:opacity-50">{exporting === "word" ? "Preparing…" : "Download Word (.docx)"}</button><button type="button" onClick={exportPdf} disabled={Boolean(exporting)} className="rounded-lg border border-stone-300 px-3 py-2 text-sm font-semibold disabled:opacity-50">{exporting === "pdf" ? "Preparing…" : "Download PDF"}</button></div></div>
                  <h3 className="font-semibold">Header / Contact</h3>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {["name", "email", "phone", "location"].map((key) => <label key={key} className="grid gap-1 text-sm capitalize">{key}<input value={draft.contact[key] || ""} onChange={(event) => setDraft((current) => ({ ...current, contact: { ...current.contact, [key]: event.target.value } }))} className="rounded-lg border border-stone-300 p-2" /></label>)}
                  </div>
                  <label className="grid gap-2 text-sm font-semibold">Summary<textarea value={draft.summary} onChange={(event) => setDraft((current) => ({ ...current, summary: event.target.value }))} rows={4} className="w-full rounded-lg border border-stone-300 p-3 font-normal" /></label>
                  <label className="grid gap-2 text-sm font-semibold">Core Skills<textarea value={draft.skills.join(", ")} onChange={(event) => setDraft((current) => ({ ...current, skills: event.target.value.split(/[,;\n]/).map((skill) => skill.trim()).filter(Boolean) }))} rows={3} className="w-full rounded-lg border border-stone-300 p-3 font-normal" /></label>
                  <div className="space-y-4">
                    <h3 className="font-semibold">Experience</h3>
                    {draft.experience.map((role, roleIndex) => (
                      <fieldset key={`${role.title}-${role.company}-${roleIndex}`} className="grid gap-2 rounded-lg border border-stone-200 p-3">
                        <legend className="px-1 text-sm font-semibold">{role.title || `Role ${roleIndex + 1}`}</legend>
                        <div className="grid gap-2 sm:grid-cols-2">
                          {["title", "company", "dates", "location"].map((key) => <label key={key} className="grid gap-1 text-xs capitalize">{key}<input value={role[key] || ""} onChange={(event) => setDraft((current) => ({ ...current, experience: current.experience.map((entry, index) => index === roleIndex ? { ...entry, [key]: event.target.value } : entry) }))} className="rounded border p-2 text-sm" /></label>)}
                        </div>
                        {role.bullets.map((bullet, bulletIndex) => <label key={`${bullet.sourceBullet}-${bulletIndex}`} className="grid gap-1 text-xs">Experience bullet<textarea value={bullet.editedText} onChange={(event) => setDraft((current) => ({ ...current, experience: current.experience.map((entry, index) => index === roleIndex ? { ...entry, bullets: entry.bullets.map((item, itemIndex) => itemIndex === bulletIndex ? { ...item, editedText: event.target.value } : item) } : entry) }))} rows={2} className="rounded border p-2 text-sm" /></label>)}
                      </fieldset>
                    ))}
                  </div>
                  {[
                    ["education", "Education"],
                    ["certifications", "Certifications"],
                  ].map(([key, title]) => <label key={key} className="grid gap-2 text-sm font-semibold">{title}<textarea value={draft[key].join("\n")} onChange={(event) => setDraft((current) => ({ ...current, [key]: linesFrom(event.target.value) }))} rows={3} className="w-full rounded-lg border border-stone-300 p-3 font-normal" /></label>)}
                  {result.ai_review_used && selectedJobId && (
                    <div className="flex flex-wrap gap-2 border-t pt-4">
                      {isAuthenticated ? <button type="button" onClick={handleSaveTailoredCv} disabled={savingCv} className="rounded-lg bg-violet-800 px-4 py-2 font-semibold text-white disabled:opacity-50">{savingCv ? "Saving…" : "Save tailored CV for this job"}</button> : <Link to="/login" className="rounded-lg bg-violet-800 px-4 py-2 font-semibold text-white">Sign in to save this tailored CV</Link>}
                      {savedCvId && <button type="button" onClick={applyWithSavedCv} className="rounded-lg bg-emerald-700 px-4 py-2 font-semibold text-white">Apply with this CV</button>}
                    </div>
                  )}
                  {saveStatus && <p role="status" className="text-sm text-stone-700">{saveStatus}</p>}
                </section>
              )}
              <p className="rounded-lg bg-stone-100 p-3 text-xs leading-relaxed text-stone-600">{result.note} Review all AI suggestions before export and do not include any detail that is not true.</p>
              {result.daily_allowance && <p className="text-xs text-stone-500">Diagnostic uses remaining today: {result.daily_allowance.diagnosticsRemaining} of {result.daily_allowance.diagnosticLimit}; AI tailorings remaining: {result.daily_allowance.aiTailoringsRemaining} of {result.daily_allowance.aiTailoringLimit}.</p>}
            </div>
          )}

          <p className="mt-6 text-xs text-stone-500">Want more career services? <Link to="/pricing" className="font-semibold text-terracotta underline">Explore plans</Link></p>
        </div>
      </section>
    </div>
  );
};

export default CvOptimizerModal;
