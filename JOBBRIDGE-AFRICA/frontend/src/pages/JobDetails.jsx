import { useParams, Link, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";
import PageBreadcrumb from "../components/PageBreadcrumb";
import ExternalJobLink from "../components/ExternalJobLink";
import { updatePageMetadata } from "../utils/pageMetadata";
import { formatSalaryLabel } from "../utils/salaryDisplay";

const normalizeJobText = (value) => String(value || "")
  .replace(/<br\s*\/?>/gi, "\n")
  .replace(/<\/(?:p|li|h[1-6])\s*>/gi, "\n")
  .replace(/<li(?:\s[^>]*)?>/gi, "• ")
  .replace(/<[^>]*>/g, "")
  .replace(/&nbsp;/gi, " ")
  .replace(/&amp;/gi, "&")
  .replace(/&lt;/gi, "<")
  .replace(/&gt;/gi, ">")
  .replace(/&quot;/gi, '"')
  .replace(/&#39;/gi, "'")
  .replace(/\r\n?/g, "\n")
  .replace(/[ \t]+\n/g, "\n")
  .trim();

const safeExternalUrl = (value) => {
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol) ? url.href : "";
  } catch {
    return "";
  }
};

const isJobSectionHeading = (line) => (
  line.length <= 90
  && (
    /^(?:about (?:the|this) (?:role|job)|what you(?:'|’)ll do|what you(?:'|’)ll need|responsibilities|requirements|qualifications|benefits|nice to have|preferred qualifications|how to apply)[:\s]*$/i.test(line)
    || /:$/.test(line)
  )
);

const FormattedJobText = ({ text }) => {
  const lines = normalizeJobText(text)
    .replace(/[•▪◦‣]\s*/g, "\n• ")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const blocks = [];
  for (const line of lines) {
    if (isJobSectionHeading(line)) {
      blocks.push({ type: "heading", text: line.replace(/:$/, "") });
    } else if (/^(?:[-*•▪◦‣]|\d+[.)])\s+/.test(line)) {
      const current = blocks.at(-1);
      if (current?.type === "list") current.items.push(line.replace(/^(?:[-*•▪◦‣]|\d+[.)])\s+/, ""));
      else blocks.push({ type: "list", items: [line.replace(/^(?:[-*•▪◦‣]|\d+[.)])\s+/, "")] });
    } else {
      blocks.push({ type: "paragraph", text: line });
    }
  }
  return (
    <div className="space-y-3 text-gray-700">
      {blocks.map((block, index) => {
        if (block.type === "heading") return <h3 key={`${block.text}-${index}`} className="pt-2 font-semibold text-slate-900">{block.text}</h3>;
        if (block.type === "list") return <ul key={`list-${index}`} className="list-disc space-y-1 pl-6">{block.items.map((item, itemIndex) => <li key={`${item}-${itemIndex}`}>{item}</li>)}</ul>;
        return <p key={`paragraph-${index}`}>{block.text}</p>;
      })}
    </div>
  );
};

const JobDetails = () => {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const applicationResumeInputRef = useRef(null);
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [applied, setApplied] = useState(false);
  const [showApplicationModal, setShowApplicationModal] = useState(false);
  const [applicationData, setApplicationData] = useState({
    coverLetter: "",
    resume: null,
  });
  const [submitting, setSubmitting] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState("inaccurate");
  const [reportDetails, setReportDetails] = useState("");
  const [reportEmail, setReportEmail] = useState("");
  const [reportStatus, setReportStatus] = useState("");
  const [reporting, setReporting] = useState(false);
  const [fitContext, setFitContext] = useState(null);
  const [fitLoading, setFitLoading] = useState(false);
  const [fitError, setFitError] = useState("");
  const tailoredCvId = new URLSearchParams(location.search).get("tailoredCvId") || "";
  const jobId = job?._id;
  const salaryLabel = formatSalaryLabel(job) || "Not specified";
  const workMode = job?.isRemote || job?.isWorldwideRemote || job?.jobType === "Remote"
    ? "Remote"
    : ({
      remote: "Remote",
      hybrid: "Hybrid",
      "on-site": "On-site",
    }[job?.workplaceType] || "");
  const postedDate = job?.pubDate || job?.createdAt;
  const postedTimestamp = postedDate ? new Date(postedDate).getTime() : Number.NaN;
  const postedDays = Number.isNaN(postedTimestamp)
    ? null
    : Math.max(0, Math.floor((Date.now() - postedTimestamp) / 86400000));
  const sourceLabel = job?.sourceName || job?.sourceProvider || (job?.source === "employer" ? "Direct employer" : "External source");
  const isExternalListing = job?.source !== "employer" && job?.isDirectPosting !== true;
  const remoteScope = job?.locationRestriction || job?.location || "";
  const isGlobalRemote = job?.eligibilityScope === "worldwide"
    || /\b(worldwide|global(?:ly)?|anywhere|any location)\b/i.test(remoteScope);
  const remoteEligibilityLabel = isGlobalRemote
    ? "Global"
    : remoteScope && !/\bremote\b/i.test(remoteScope)
      ? remoteScope
      : "eligibility not specified";
  const remoteEligibility = job?.isRemote || job?.workplaceType === "remote" || job?.jobType === "Remote"
    ? `Remote – ${remoteEligibilityLabel}`
    : "";
  const eligibilityLabel = {
    worldwide: "Worldwide / global",
    africa_friendly: "Africa-friendly",
    region_restricted: "Region-restricted",
    unspecified: "Eligibility not specified",
  }[job?.eligibilityScope] || "Eligibility not specified";
  const timezoneLabel = {
    africa_eu_friendly: "Africa / EU-friendly hours",
    flexible_async: "Flexible / async",
    specific_timezone: "Specific timezone stated",
  }[job?.timezonePolicy];
  const descriptionParts = [job?.fullDescription, job?.description]
    .map(normalizeJobText)
    .filter((text, index, parts) => text
      && parts.indexOf(text) === index
      && !parts.some((other) => other.length > text.length && other.includes(text)));
  const externalApplicationLink = safeExternalUrl(job?.applicationLink);
  const sourceUrl = safeExternalUrl(job?.sourceUrl);
  const fullJobDescription = descriptionParts.join("\n\n") || job?.excerpt || "";

  useEffect(() => {
    setLoading(true);
    api
      .get(`/jobs/${id}`)
      .then((res) => {
        setJob(res.data);
        const title = `${res.data.title} at ${res.data.companyName} | JobBridge Africa`;
        const description = String(res.data.excerpt || res.data.fullDescription || res.data.description || "")
          .replace(/\s+/g, " ")
          .slice(0, 155);
        updatePageMetadata({
          title,
          description: description || `View ${res.data.title} at ${res.data.companyName} on JobBridge Africa.`,
          path: location.pathname,
        });
        setLoading(false);
        // Auto-open the application form when arriving from a listing CTA.
        const isDirectPosting = res.data.source === "employer"
          || (res.data.source == null && res.data.isDirectPosting !== false);
        if (isDirectPosting && location.hash === "#apply" && isAuthenticated && user) {
          setShowApplicationModal(true);
        }
      })
      .catch((err) => {
        console.error(err);
        setError("Failed to load job details. Please try again.");
        setLoading(false);
      });
  }, [id, location.hash, location.pathname, isAuthenticated, user, navigate]);

  useEffect(() => {
    let active = true;
    if (!jobId || !isAuthenticated || user?.role !== "job_seeker") {
      setFitContext(null);
      setFitError("");
      return () => { active = false; };
    }
    setFitLoading(true);
    setFitError("");
    api.get(`/ai/match?jobId=${encodeURIComponent(jobId)}`)
      .then(({ data }) => {
        if (active) setFitContext(Array.isArray(data) ? data[0]?.fit_context || null : null);
      })
      .catch((requestError) => {
        if (active) {
          setFitError(requestError.response?.data?.message || "Your job-fit context could not be loaded.");
        }
      })
      .finally(() => {
        if (active) setFitLoading(false);
      });
    return () => { active = false; };
  }, [jobId, isAuthenticated, user?.role]);

  const handleApplyClick = () => {
    if (job && job.source !== "employer" && job.isDirectPosting !== true) return;
    if (!isAuthenticated) {
      alert("Please login to apply for jobs");
      navigate("/login");
      return;
    }

    if (user.role !== "job_seeker") {
      alert("Only job seeker accounts can apply through JobBridge.");
      return;
    }

    setShowApplicationModal(true);
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file type
      const allowedTypes = [
        "application/pdf",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      ];
      if (!allowedTypes.includes(file.type)) {
        alert("Please upload a PDF or Word document for your resume");
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        alert("Resume file size must be less than 10MB");
        return;
      }
      setApplicationData((current) => ({ ...current, resume: file }));
    }
  };

  const handleSubmitApplication = async (e) => {
    e.preventDefault();

    if (!applicationData.resume && !user?.resumeUrl && !tailoredCvId) {
      alert("Please upload your resume/CV");
      return;
    }

    setSubmitting(true);

    try {
      const body = applicationData.resume ? new FormData() : {
        jobId: id,
        coverLetter: applicationData.coverLetter,
        tailoredCvId,
      };
      if (applicationData.resume) {
        body.append("jobId", id);
        body.append("coverLetter", applicationData.coverLetter);
        body.append("resume", applicationData.resume);
        if (tailoredCvId) body.append("tailoredCvId", tailoredCvId);
      }
      const { data } = await api.post("/applications", body);

      setApplied(true);
      setApplicationData({ coverLetter: "", resume: null });
      if (applicationResumeInputRef.current) applicationResumeInputRef.current.value = "";
      setShowApplicationModal(false);
      setSubmitting(false);
      alert(data.notificationSent
        ? "✅ Application submitted successfully!\n\nThe employer has been notified and can review your profile and resume."
        : "✅ Your application was saved. Email notification could not be delivered, but the employer can review it in their dashboard.");
      // Redirect to My Jobs page
      navigate("/my-jobs");
    } catch (err) {
      console.error(err);
      const errorMessage =
        err.response?.data?.message ||
        "Failed to submit application. Please try again.";
      alert(errorMessage);
      setSubmitting(false);
    }
  };

  const handleReportSubmit = async (event) => {
    event.preventDefault();
    setReporting(true);
    setReportStatus("");
    try {
      const { data } = await api.post(`/jobs/${id}/report`, {
        reason: reportReason,
        details: reportDetails,
        email: reportEmail,
      });
      setReportStatus(data.message);
      setReportReason("inaccurate");
      setReportDetails("");
      setReportEmail("");
    } catch (requestError) {
      setReportStatus(requestError.response?.data?.message || "We couldn't submit this report. Please try again.");
    } finally {
      setReporting(false);
    }
  };

  if (loading)
    return <div className="max-w-4xl mx-auto p-6">Loading job details...</div>;
  if (error)
    return <div className="max-w-4xl mx-auto p-6 text-red-600">{error}</div>;
  if (!job) return <div className="max-w-4xl mx-auto p-6">Job not found</div>;

  return (
    <section className="max-w-4xl mx-auto p-6">
      <PageBreadcrumb to="/jobs" label="Back to Jobs" />

      <div className="bg-white rounded-lg shadow-md p-8">
        <h1 className="text-4xl font-bold text-primary mb-2">{job.title}</h1>
        <p className="text-xl text-gray-700 mb-2">{job.companyName}</p>
        <div className="flex flex-wrap gap-4 mb-6 text-sm text-gray-600">
          <span>📍 {job.location}</span>
          <span>💼 Work arrangement: {workMode || "Not specified"}</span>
          {remoteEligibility && <span>{remoteEligibility}</span>}
          <span className={job.eligibilityScope === "region_restricted" ? "font-semibold text-rose-800" : "font-semibold text-emerald-800"}>
            Eligibility: {eligibilityLabel}
          </span>
          {timezoneLabel && <span>Timezone: {timezoneLabel}</span>}
          {job.jobType && job.jobType !== "Remote" && <span>Employment: {job.jobType}</span>}
          <span>💰 Compensation: {salaryLabel}</span>
          {job.seniority && <span>Seniority: {job.seniority}</span>}
          {job.categories?.length > 0 && <span>Category: {job.categories.join(", ")}</span>}
          {postedDays !== null && <span>Posted {postedDays} {postedDays === 1 ? "day" : "days"} ago</span>}
          <span className={`rounded-full px-3 py-1 font-semibold ${
            isExternalListing ? "bg-amber-100 text-amber-950" : "bg-emerald-100 text-emerald-950"
          }`}>
            {isExternalListing ? `Aggregated · ${sourceLabel}` : "Direct employer posting"}
          </span>
          {job.expiryDate && (
            <span>
              ⏰ Apply by: {new Date(job.expiryDate).toLocaleDateString()}
            </span>
          )}
        </div>
        {job.sourceProvider === "jobbridge-fallback" ? (
          <p className="mb-6 rounded-lg bg-slate-100 p-4 text-sm text-slate-800">
            This is a sample listing shown while the external job feed is unavailable. It is not an active vacancy and cannot accept applications.
          </p>
        ) : isExternalListing && (
          <p className="mb-6 rounded-lg bg-amber-50 p-4 text-sm text-amber-950">
            This is an external listing from {sourceLabel}. Applications are handled on the official employer or source site.
          </p>
        )}

        {isAuthenticated && user?.role === "job_seeker" && (
          <section className="mb-6 rounded-xl border border-sky-200 bg-sky-50 p-4">
            <h2 className="font-bold text-sky-950">Your job-fit context</h2>
            {fitLoading && <p className="mt-2 text-sm text-sky-900">Checking your profile against this role…</p>}
            {fitError && <p role="status" className="mt-2 text-sm text-amber-900">{fitError}</p>}
            {fitContext && (
              <>
                <p className="mt-2 text-sm text-sky-900">Weighted recommendation score: {fitContext.overall_score}% — guidance only, not a hiring decision.</p>
                <div className="mt-3 grid gap-3 text-sm text-sky-950 sm:grid-cols-3">
                  <p><strong>Skills:</strong> {fitContext.skills.score}% ({fitContext.skills.matched.length}/{fitContext.skills.required.length || "n/a"} recognized requirements)</p>
                  <p><strong>Experience:</strong> {fitContext.experience.status.replaceAll("_", " ")}. {fitContext.experience.notes}</p>
                  <p><strong>Logistics &amp; eligibility:</strong> {fitContext.logistics.status.replaceAll("_", " ")}. {fitContext.logistics.notes.join(" ") || "Confirm work location, schedule, and authorization with the employer."}</p>
                </div>
                {fitContext.must_have_gaps.length > 0 && (
                  <p className="mt-3 text-sm text-sky-950"><strong>Top requirements to review:</strong> {fitContext.must_have_gaps.map((gap) => gap.skill).join("; ")}</p>
                )}
              </>
            )}
          </section>
        )}

        <div className="mb-6">
          <h2 className="text-2xl font-bold mb-3">Full Job Description</h2>
          {isExternalListing && (
            <p className="mb-3 rounded-lg bg-slate-50 p-3 text-sm text-slate-700">
              Summary provided by source feed — view full role details on the official listing.
            </p>
          )}
          <FormattedJobText text={fullJobDescription} />
        </div>

        {job.requirements && (
          <div className="mb-6">
            <h2 className="text-2xl font-bold mb-3">Requirements</h2>
            <FormattedJobText text={job.requirements} />
          </div>
        )}

        {job.qualifications && (
          <div className="mb-6">
            <h2 className="text-2xl font-bold mb-3">Qualifications</h2>
            <FormattedJobText text={job.qualifications} />
          </div>
        )}

        {job.responsibilities && (
          <div className="mb-6">
            <h2 className="text-2xl font-bold mb-3">Responsibilities</h2>
            <FormattedJobText text={job.responsibilities} />
          </div>
        )}

        {job.benefits && (
          <div className="mb-6">
            <h2 className="text-2xl font-bold mb-3">Benefits</h2>
            <FormattedJobText text={job.benefits} />
          </div>
        )}

        {(job.applicationInstructions || job.applicationEmail) && (
          <div className="mb-6">
            <h2 className="mb-2 text-2xl font-bold">How to Apply</h2>
            {job.applicationInstructions && <FormattedJobText text={job.applicationInstructions} />}
            {job.applicationEmail && (
              <p className="text-gray-600">
                Send your application to{" "}
                <a href={`mailto:${job.applicationEmail}`} className="text-primary hover:underline">
                  {job.applicationEmail}
                </a>
              </p>
            )}
          </div>
        )}
        {externalApplicationLink && (
          <div className="mb-6 break-all text-sm text-gray-600">
            <ExternalJobLink jobId={job._id} href={externalApplicationLink}>
              Application link: {externalApplicationLink}
            </ExternalJobLink>
          </div>
        )}
        {sourceUrl && (
          <div className="mb-6 text-sm text-gray-600">
            <ExternalJobLink jobId={job._id} href={sourceUrl} linkType="source" className="text-primary underline">
              Source listing: {sourceLabel} ↗
            </ExternalJobLink>
          </div>
        )}

        <div className="flex flex-wrap gap-4">
          <Link
            to={`/ai-cv-tool?jobId=${encodeURIComponent(job._id)}`}
            className="rounded border border-primary px-6 py-3 font-semibold text-primary hover:bg-primary/10"
          >
            Check my CV fit
          </Link>
          {isExternalListing ? (
            externalApplicationLink ? (
              <ExternalJobLink
                jobId={job._id}
                href={externalApplicationLink}
                className="rounded bg-accent px-8 py-3 font-semibold text-white transition hover:bg-red-700"
              >
                Apply on official site ↗
              </ExternalJobLink>
            ) : (
              <p className="text-sm text-gray-600">
                {job.sourceProvider === "jobbridge-fallback"
                  ? "Sample listings cannot accept applications."
                  : "The external application link is unavailable."}
              </p>
            )
          ) : (
            <button
              onClick={handleApplyClick}
              disabled={applied}
              className={`px-8 py-3 rounded font-semibold transition ${
                applied
                  ? "bg-gray-300 text-gray-600 cursor-not-allowed"
                  : "bg-accent text-white hover:bg-red-700"
              }`}
            >
              {applied ? "Applied ✓" : "Apply through JobBridge"}
            </button>
          )}
          <Link
            to="/jobs"
            className="px-8 py-3 rounded font-semibold bg-gray-200 text-gray-700 hover:bg-gray-300 transition"
          >
            Browse More Jobs
          </Link>
        </div>
        <button type="button" onClick={() => setReportOpen(true)} className="mt-6 text-sm font-semibold text-red-700 underline hover:text-red-900">
          Report this job
        </button>
      </div>

      {reportOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/60 p-4">
          <section role="dialog" aria-modal="true" aria-labelledby="job-report-title" className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 id="job-report-title" className="text-2xl font-bold">Report this job</h2>
                <p className="mt-1 text-sm text-slate-600">Tell us what should be reviewed.</p>
              </div>
              <button type="button" onClick={() => setReportOpen(false)} aria-label="Close report dialog" className="text-2xl text-slate-500">×</button>
            </div>
            {reportStatus && <p role="status" className="mt-4 rounded-lg bg-slate-100 p-3 text-sm">{reportStatus}</p>}
            <form onSubmit={handleReportSubmit} className="mt-4 space-y-4">
              <label className="block text-sm font-semibold">
                Reason
                <select value={reportReason} onChange={(event) => setReportReason(event.target.value)} className="mt-1 w-full rounded-lg border p-3">
                  <option value="inaccurate">Inaccurate information</option>
                  <option value="scam">Possible scam or unsafe request</option>
                  <option value="misleading">Misleading or discriminatory</option>
                  <option value="expired">Expired or no longer available</option>
                  <option value="other">Other</option>
                </select>
              </label>
              <label className="block text-sm font-semibold">
                Details (optional)
                <textarea value={reportDetails} onChange={(event) => setReportDetails(event.target.value)} maxLength={2000} rows={4} className="mt-1 w-full rounded-lg border p-3" />
              </label>
              <label className="block text-sm font-semibold">
                Email for follow-up (optional)
                <input type="email" value={reportEmail} onChange={(event) => setReportEmail(event.target.value)} className="mt-1 w-full rounded-lg border p-3" />
              </label>
              <button type="submit" disabled={reporting} className="rounded-lg bg-red-700 px-5 py-3 font-semibold text-white disabled:opacity-60">
                {reporting ? "Submitting…" : "Submit report"}
              </button>
            </form>
          </section>
        </div>
      )}

      {/* Application Modal */}
      {showApplicationModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold">Apply for {job.title}</h2>
                <button
                  onClick={() => setShowApplicationModal(false)}
                  className="text-gray-500 hover:text-gray-700 text-2xl"
                >
                  ×
                </button>
              </div>

              <form onSubmit={handleSubmitApplication} className="space-y-6">
                {/* Resume Upload */}
                <div>
                  {tailoredCvId && (
                    <p className="mb-3 rounded-lg border border-violet-200 bg-violet-50 p-3 text-sm text-violet-950">
                      Your saved, job-specific tailored CV will be included with this application. You can still attach a different resume below.
                    </p>
                  )}
                  <label className="block text-sm font-medium mb-2">
                    Resume/CV {!tailoredCvId && <span className="text-red-500">*</span>}
                  </label>
                  {user?.resumeUrl && !applicationData.resume && (
                    <div className="mb-3 flex items-center justify-between rounded-lg border border-emerald-200 bg-emerald-50 p-3">
                      <span className="text-sm text-emerald-900">Use the resume saved on your profile</span>
                      <a href={user.resumeUrl} target="_blank" rel="noopener noreferrer" className="font-semibold text-emerald-800 underline">Preview</a>
                    </div>
                  )}
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                    <input
                      ref={applicationResumeInputRef}
                      type="file"
                      id="resume-upload"
                      accept=".pdf,.doc,.docx"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                    <label
                      htmlFor="resume-upload"
                      className="cursor-pointer inline-block"
                    >
                      <div className="text-4xl mb-2">📄</div>
                      <p className="text-sm font-medium mb-1">
                        {applicationData.resume
                          ? `Selected: ${applicationData.resume.name}`
                          : user?.resumeUrl || tailoredCvId ? "Choose a different resume (optional)" : "Click to upload your resume/CV"}
                      </p>
                      <p className="text-xs text-gray-500">
                        Supported formats: PDF, DOC, DOCX (Max 10MB). The tailored CV or saved profile resume is used by default.
                      </p>
                    </label>
                  </div>
                </div>

                {/* Cover Letter */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Cover Letter{" "}
                    <span className="text-gray-500">(Optional)</span>
                  </label>
                  <textarea
                    value={applicationData.coverLetter}
                    onChange={(e) =>
                      setApplicationData({
                        ...applicationData,
                        coverLetter: e.target.value,
                      })
                    }
                    rows="8"
                    className="w-full border rounded px-4 py-2"
                    placeholder="Introduce yourself and explain why you're a great fit for this role..."
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Tip: Highlight your relevant skills and experience that
                    match the job requirements.
                  </p>
                </div>

                {/* User Info Display */}
                <div className="bg-gray-50 p-4 rounded">
                  <h3 className="font-semibold mb-2">Your Information</h3>
                  <p className="text-sm text-gray-700">
                    <strong>Name:</strong> {user?.name}
                  </p>
                  <p className="text-sm text-gray-700">
                    <strong>Email:</strong> {user?.email}
                  </p>
                  {user?.phone && <p className="text-sm text-gray-700"><strong>Phone:</strong> {user.phone}</p>}
                  {user?.country && <p className="text-sm text-gray-700"><strong>Country:</strong> {user.country}</p>}
                  {user?.bio && <p className="mt-2 text-sm text-gray-700"><strong>Summary:</strong> {user.bio}</p>}
                  {user?.skills?.length > 0 && <p className="mt-2 text-sm text-gray-700"><strong>Skills:</strong> {user.skills.join(", ")}</p>}
                  <p className="text-xs text-gray-500 mt-2">
                    This information will be sent to the employer along with
                    your application.
                  </p>
                </div>

                {/* Submit Buttons */}
                <div className="flex gap-4">
                  <button
                    type="submit"
                    disabled={submitting}
                    className={`flex-1 py-3 rounded font-semibold transition ${
                      submitting
                        ? "bg-gray-400 text-gray-200 cursor-not-allowed"
                        : "bg-accent text-white hover:bg-red-700"
                    }`}
                  >
                    {submitting ? "Submitting..." : tailoredCvId ? "Apply with this CV" : "Submit Application"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowApplicationModal(false)}
                    disabled={submitting}
                    className="px-6 py-3 rounded font-semibold bg-gray-200 text-gray-700 hover:bg-gray-300 transition disabled:opacity-50"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default JobDetails;
