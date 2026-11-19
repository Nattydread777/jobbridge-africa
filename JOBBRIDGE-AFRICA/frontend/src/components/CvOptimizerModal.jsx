import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../services/api";
import PageBreadcrumb from "./PageBreadcrumb";
import { useAuth } from "../context/AuthContext";

const extractResumeText = async (file) => {
  const extension = file.name.split(".").pop()?.toLowerCase();

  if (extension === "docx") {
    const { unzipSync } = await import("fflate");
    const docxFiles = unzipSync(new Uint8Array(await file.arrayBuffer()));
    const documentXml = docxFiles["word/document.xml"];
    if (!documentXml) {
      throw new Error("This DOCX file could not be opened. Please paste your CV text.");
    }
    const parsedXml = new DOMParser().parseFromString(
      new TextDecoder().decode(documentXml),
      "application/xml",
    );
    if (parsedXml.querySelector("parsererror")) {
      throw new Error("This DOCX file could not be read. Please paste your CV text.");
    }
    return Array.from(parsedXml.getElementsByTagNameNS("*", "p"))
      .map((paragraph) =>
        Array.from(paragraph.getElementsByTagNameNS("*", "t"))
          .map((textNode) => textNode.textContent || "")
          .join(""),
      )
      .join("\n");
  }

  if (extension === "pdf") {
    const [{ getDocument, GlobalWorkerOptions }, workerModule] = await Promise.all([
      import("pdfjs-dist/legacy/build/pdf.mjs"),
      import("pdfjs-dist/legacy/build/pdf.worker.mjs?url"),
    ]);
    GlobalWorkerOptions.workerSrc = workerModule.default;
    const document = await getDocument({
      data: new Uint8Array(await file.arrayBuffer()),
    }).promise;
    try {
      const pageText = [];
      for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
        const page = await document.getPage(pageNumber);
        const content = await page.getTextContent();
        pageText.push(
          content.items
            .map((item) => ("str" in item ? item.str : ""))
            .filter(Boolean)
            .join(" "),
        );
      }
      return pageText.join("\n");
    } finally {
      await document.destroy();
    }
  }

  if (!["txt", "md", "csv", "html", "htm", "rtf"].includes(extension)) {
    throw new Error("Choose a .txt, .md, .csv, .html, .rtf, .docx, or .pdf file.");
  }

  const rawText = await file.text();
  if (extension === "html" || extension === "htm") {
    const parsed = new DOMParser().parseFromString(rawText, "text/html");
    parsed.querySelectorAll("script, style").forEach((node) => node.remove());
    return parsed.body.textContent || "";
  }
  if (extension === "rtf") {
    return rawText
      .replace(/\\'[0-9a-f]{2}/gi, " ")
      .replace(/\\[a-z]+-?\d* ?/gi, " ")
      .replace(/[{}]/g, " ")
      .replace(/\s+/g, " ");
  }
  return rawText;
};

const MAX_INPUT_LENGTH = 100000;

const CvOptimizerModal = ({ onClose }) => {
  const [cvText, setCvText] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [readingFile, setReadingFile] = useState(false);
  const [consentGiven, setConsentGiven] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteStatus, setDeleteStatus] = useState("");
  const { isAuthenticated, refreshUser } = useAuth();

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const handleFile = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setError("");
    setReadingFile(true);
    try {
      const extractedText = await extractResumeText(file);
      if (!extractedText.trim()) {
        throw new Error(
          "No selectable text was found. For scanned documents, please paste your CV text instead.",
        );
      }
      if (extractedText.length > MAX_INPUT_LENGTH) {
        throw new Error(
          `This document contains more than ${MAX_INPUT_LENGTH.toLocaleString()} characters. Paste a shorter CV excerpt to continue.`,
        );
      }
      setCvText(extractedText);
    } catch (fileError) {
      console.error("Failed to read uploaded CV:", fileError);
      setError(
        fileError.message ||
          "The selected file could not be read. Please paste your CV text instead.",
      );
    } finally {
      setReadingFile(false);
      event.target.value = "";
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setResult(null);
    if (!consentGiven) {
      setError("Please read and accept the CV processing disclosure before continuing.");
      return;
    }
    if (!cvText.trim() || !jobDescription.trim()) {
      setError("Add both your CV text and the target job description to continue.");
      return;
    }
    if (cvText.length > MAX_INPUT_LENGTH || jobDescription.length > MAX_INPUT_LENGTH) {
      setError(`Each text field must stay within ${MAX_INPUT_LENGTH.toLocaleString()} characters.`);
      return;
    }
    setLoading(true);
    try {
      const response = await api.post("/ai/optimize-cv", {
        cvText,
        jobDescription,
      });
      setResult(response.data);
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
          "We couldn't process your CV right now. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteData = async () => {
    if (!window.confirm("Delete your saved profile CV and uploaded CV files attached to applications from JobBridge-managed storage?")) return;
    setDeleting(true);
    setDeleteStatus("");
    try {
      const { data } = await api.delete("/auth/cv-data");
      setDeleteStatus(data.message);
      setCvText("");
      setResult(null);
      await refreshUser();
    } catch (requestError) {
      setDeleteStatus(requestError.response?.data?.message || "We couldn't delete your saved CV data. Please try again or contact support.");
    } finally {
      setDeleting(false);
    }
  };
  const keywordCount = result
    ? result.skillsGap.matched.length + result.skillsGap.missing.length
    : 0;
  const matchScore = keywordCount
    ? Math.round((result.skillsGap.matched.length / keywordCount) * 100)
    : 0;

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
          <button
            type="button"
            onClick={onClose}
            aria-label="Close CV refinisher"
            className="rounded-full px-3 py-1 text-2xl text-stone-500 hover:bg-stone-100"
          >
            ×
          </button>
        </div>
        <div className="p-6 md:p-10">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <p className="mb-2 text-sm font-bold uppercase tracking-[0.18em] text-terracotta">
              Career intelligence workspace
            </p>
            <h1 id="cv-optimizer-title" className="text-3xl font-black text-charcoal">
              CV Refinisher
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-stone-600">
              Compare your CV with a role, identify keyword gaps, and surface relevant experience.
              The score is guidance only, not an employment guarantee or hiring decision.
            </p>
          </div>
        </div>

        <section className="mb-5 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm leading-6 text-blue-950">
          <h2 className="font-bold">How your CV is processed</h2>
          <p className="mt-1">The selected PDF, DOCX, or text file is read in your browser. Extracted CV text and the target job description are sent to JobBridge Africa’s backend and compared using a rule-based keyword matcher; no third-party AI service receives the text. The CV Refinisher does not save these inputs to your JobBridge account, application database, or file storage. The backend processes the text only for the duration of the analysis request and does not retain it afterward. Your entered text remains in this page until you clear it or leave.</p>
          <p className="mt-2">A CV uploaded separately to your profile or job application is stored in Cloudinary until removed. Use “Delete my data” below to remove saved profile and application CV files from JobBridge-managed storage.</p>
        </section>
        <label className="mb-5 flex items-start gap-3 rounded-xl border border-slate-300 bg-white p-4 text-sm leading-6 text-slate-800">
          <input type="checkbox" checked={consentGiven} onChange={(event) => setConsentGiven(event.target.checked)} className="mt-1" />
          <span>I have read the CV processing disclosure and consent to sending the extracted CV text and job description to JobBridge Africa for this one-time analysis. See our <Link to="/privacy" className="font-semibold underline">Privacy Policy</Link>.</span>
        </label>

        <form onSubmit={handleSubmit} className="grid gap-5">
          <label className="grid gap-2 text-sm font-semibold text-charcoal">
            CV / resume text
            <textarea
              value={cvText}
              onChange={(event) => setCvText(event.target.value)}
              disabled={!consentGiven}
              maxLength={MAX_INPUT_LENGTH}
              required
              rows={8}
              aria-invalid={Boolean(error && !cvText.trim())}
              placeholder="Paste your CV text here..."
              className="w-full rounded-xl border border-stone-300 bg-white p-4 font-normal outline-none focus:border-terracotta focus:ring-2 focus:ring-terracotta/20"
            />
            <span className={`font-normal ${cvText.length >= MAX_INPUT_LENGTH ? "text-red-700" : "text-stone-500"}`}>
              {cvText.length.toLocaleString()} / {MAX_INPUT_LENGTH.toLocaleString()} characters
            </span>
          </label>

          <label className={`w-fit rounded-lg border border-stone-300 bg-white px-4 py-2 text-sm font-semibold text-charcoal hover:bg-stone-100 ${readingFile ? "cursor-wait opacity-70" : "cursor-pointer"}`}>
            <span className="inline-flex items-center gap-2">
              {readingFile && <span className="h-4 w-4 animate-spin rounded-full border-2 border-stone-300 border-t-terracotta" aria-hidden="true" />}
              {readingFile ? "Reading your document..." : "Upload CV (TXT, DOCX, PDF, or text formats)"}
            </span>
            <input
              type="file"
              accept=".txt,.md,.csv,.html,.htm,.rtf,.docx,.pdf,text/plain,text/markdown,text/csv,text/html,application/rtf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/pdf"
              onChange={handleFile}
              disabled={readingFile || !consentGiven}
              className="sr-only"
            />
          </label>

          <label className="grid gap-2 text-sm font-semibold text-charcoal">
            Target job description
            <textarea
              value={jobDescription}
              onChange={(event) => setJobDescription(event.target.value)}
              disabled={!consentGiven}
              maxLength={MAX_INPUT_LENGTH}
              required
              rows={7}
              aria-invalid={Boolean(error && !jobDescription.trim())}
              placeholder="Paste the job description..."
              className="w-full rounded-xl border border-stone-300 bg-white p-4 font-normal outline-none focus:border-terracotta focus:ring-2 focus:ring-terracotta/20"
            />
            <span className={`font-normal ${jobDescription.length >= MAX_INPUT_LENGTH ? "text-red-700" : "text-stone-500"}`}>
              {jobDescription.length.toLocaleString()} / {MAX_INPUT_LENGTH.toLocaleString()} characters
            </span>
          </label>

          {error && (
            <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading || !consentGiven || !cvText.trim() || !jobDescription.trim()}
            aria-busy={loading}
            className="inline-flex w-fit items-center gap-2 rounded-xl bg-terracotta px-6 py-3 font-bold text-white transition hover:bg-terracotta-dark disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading && <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" aria-hidden="true" />}
            {loading ? "Reviewing your CV..." : "Review my CV"}
          </button>
          <p aria-live="polite" className="sr-only">
            {loading ? "Analyzing your resume and job description." : ""}
          </p>
        </form>

        <section className="mt-6 rounded-xl border border-stone-200 bg-white p-4">
          <h2 className="font-bold text-charcoal">Delete my saved CV data</h2>
          <p className="mt-1 text-sm leading-6 text-stone-600">This removes your profile CV and uploaded CV files attached to your applications from JobBridge-managed storage. Application details remain; employers who already received a copy may retain it.</p>
          {isAuthenticated ? (
            <button type="button" onClick={handleDeleteData} disabled={deleting} className="mt-3 rounded-lg border border-red-300 px-4 py-2 font-semibold text-red-800 hover:bg-red-50 disabled:opacity-60">
              {deleting ? "Deleting…" : "Delete my data"}
            </button>
          ) : (
            <p className="mt-3 text-sm">Sign in to delete saved CV files from your account. <Link to="/login" className="font-semibold text-terracotta underline">Sign in</Link></p>
          )}
          {deleteStatus && <p role="status" className="mt-3 text-sm text-slate-700">{deleteStatus}</p>}
        </section>

        {result && (
          <div className="mt-8 space-y-5 border-t border-stone-200 pt-6">
            <section className="grid gap-4 sm:grid-cols-3">
              <article className="rounded-2xl bg-charcoal p-5 text-white">
                <p className="text-sm font-semibold text-stone-300">Role keyword match</p>
                <p className="mt-2 text-4xl font-black text-amber-300">{matchScore}%</p>
                <div
                  className="mt-4 h-2 overflow-hidden rounded-full bg-white/15"
                  role="progressbar"
                  aria-label="CV keyword match score"
                  aria-valuemin="0"
                  aria-valuemax="100"
                  aria-valuenow={matchScore}
                >
                  <div className="h-full rounded-full bg-amber-400" style={{ width: `${matchScore}%` }} />
                </div>
              </article>
              <article className="rounded-2xl bg-emerald-50 p-5">
                <p className="text-sm font-semibold text-emerald-800">Matched keywords</p>
                <p className="mt-2 text-3xl font-black text-emerald-950">{result.skillsGap.matched.length}</p>
              </article>
              <article className="rounded-2xl bg-amber-50 p-5">
                <p className="text-sm font-semibold text-amber-900">Potential gaps</p>
                <p className="mt-2 text-3xl font-black text-amber-950">{result.skillsGap.missing.length}</p>
              </article>
            </section>
            <section>
              <h2 className="text-lg font-bold text-charcoal">ATS-focused summary guidance</h2>
              <p className="mt-2 leading-relaxed text-stone-700">{result.summary}</p>
            </section>
            <section className="grid gap-4 md:grid-cols-2">
              <div className="rounded-xl bg-emerald-50 p-4">
                <h2 className="font-bold text-emerald-900">Keywords found in your CV</h2>
                <p className="mt-2 text-sm text-emerald-800">
                  {result.skillsGap.matched.join(", ") || "No target keywords found"}
                </p>
              </div>
              <div className="rounded-xl bg-amber-50 p-4">
                <h2 className="font-bold text-amber-950">Potential skills gaps</h2>
                <p className="mt-2 text-sm text-amber-900">
                  {result.skillsGap.missing.join(", ") || "No keyword gaps identified"}
                </p>
              </div>
            </section>
            <section>
              <h2 className="text-lg font-bold text-charcoal">Relevant CV bullet points</h2>
              {result.enhancedBulletPoints.length ? (
                <ul className="mt-2 list-disc space-y-2 pl-5 text-stone-700">
                  {result.enhancedBulletPoints.map((bullet, index) => (
                    <li key={`${index}-${bullet}`}>{bullet}</li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-sm text-stone-600">
                  Add experience as separate lines in your CV to identify relevant bullet points.
                </p>
              )}
            </section>
            <p className="rounded-lg bg-stone-100 p-3 text-xs leading-relaxed text-stone-600">
              {result.note}
            </p>
          </div>
        )}

        <p className="mt-6 text-xs text-stone-500">
          Want more career services?{" "}
          <Link to="/pricing" className="font-semibold text-terracotta underline">
            Explore plans
          </Link>
        </p>
        </div>
      </section>
    </div>
  );
};

export default CvOptimizerModal;
