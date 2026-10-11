import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../services/api";
import PageBreadcrumb from "./PageBreadcrumb";

const MAX_INPUT_LENGTH = 25000;

const CvOptimizerModal = ({ onClose }) => {
  const [cvText, setCvText] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

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
    if (file.size > MAX_INPUT_LENGTH) {
      setError("Please choose a plain-text CV file smaller than 25 KB.");
      event.target.value = "";
      return;
    }
    try {
      setCvText(await file.text());
      setError("");
    } catch {
      setError("The selected file could not be read. Please paste your CV text.");
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setResult(null);
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
              Your text is processed by a local rule-based matcher and is not stored.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="grid gap-5">
          <label className="grid gap-2 text-sm font-semibold text-charcoal">
            CV / resume text
            <textarea
              value={cvText}
              onChange={(event) => setCvText(event.target.value)}
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

          <label className="w-fit cursor-pointer rounded-lg border border-stone-300 bg-white px-4 py-2 text-sm font-semibold text-charcoal hover:bg-stone-100">
            Upload plain-text CV (.txt)
            <input
              type="file"
              accept=".txt,text/plain"
              onChange={handleFile}
              className="sr-only"
            />
          </label>

          <label className="grid gap-2 text-sm font-semibold text-charcoal">
            Target job description
            <textarea
              value={jobDescription}
              onChange={(event) => setJobDescription(event.target.value)}
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
            disabled={loading || !cvText.trim() || !jobDescription.trim()}
            className="w-fit rounded-xl bg-terracotta px-6 py-3 font-bold text-white transition hover:bg-terracotta-dark disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Reviewing your CV..." : "Review my CV"}
          </button>
        </form>

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
