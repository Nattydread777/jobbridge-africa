import { Link, useNavigate } from "react-router-dom";
import PropTypes from "prop-types";
import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { getJobPath } from "../utils/jobUrl";

const getRelativePostedTime = (value) => {
  const postedDate = new Date(value);
  if (Number.isNaN(postedDate.getTime())) return "Posted date unavailable";

  const elapsedSeconds = Math.max(0, Math.floor((Date.now() - postedDate.getTime()) / 1000));
  const units = [
    ["year", 31536000],
    ["month", 2592000],
    ["week", 604800],
    ["day", 86400],
    ["hour", 3600],
    ["minute", 60],
  ];
  const [unit, secondsPerUnit] = units.find(([, seconds]) => elapsedSeconds >= seconds) || ["minute", 60];
  const elapsed = Math.floor(elapsedSeconds / secondsPerUnit);
  return `Posted ${new Intl.RelativeTimeFormat("en", { numeric: "auto" }).format(-elapsed, unit)}`;
};

const getDeadlineLabel = (value) => {
  const deadline = value ? new Date(value) : null;
  return deadline && !Number.isNaN(deadline.getTime())
    ? deadline.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })
    : null;
};

const JobCard = ({ job }) => {
  const [logoFailed, setLogoFailed] = useState(false);
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const isSampleListing = job.sourceProvider === "jobbridge-fallback";
  const isDirectPosting = job.source === "employer"
    || (job.source == null && job.isDirectPosting !== false);
  const postedDate = job.pubDate || job.createdAt;
  const deadlineLabel = getDeadlineLabel(job.expiryDate);
  const companyInitial = job.companyName?.trim()?.[0]?.toUpperCase() || "?";
  const companyLogo = job.companyLogoUrl || job.companyLogo;
  const jobPath = getJobPath(job);
  const jobUrl = `${window.location.origin}${jobPath}`;
  const shareText = `${job.title} at ${job.companyName} - ${jobUrl}`;
  const workMode = {
    remote: "Remote",
    hybrid: "Hybrid",
    "on-site": "On-site",
  }[job.workplaceType] || job.jobType;
  const remoteScope = job.locationRestriction || job.location || "";
  const isGlobalRemote = /\b(worldwide|global(?:ly)?|anywhere|any location)\b/i.test(remoteScope);
  const remoteEligibility = isGlobalRemote
    ? "Global"
    : remoteScope && !/\bremote\b/i.test(remoteScope)
      ? remoteScope
      : "eligibility not specified";
  const locationEligibility = workMode === "Remote"
    ? `Remote · ${remoteEligibility}`
    : `${workMode} · ${job.locationRestriction || job.location}`;
  const sourceLabel = job.sourceName || job.sourceProvider || (isDirectPosting ? "Direct employer" : "External source");
  const salaryLabel = [job.salary, job.salaryRange]
    .map((value) => String(value || "").trim())
    .find((value) => value && !/^competitive$/i.test(value)) || "";

  const handleApply = () => {
    if (!isAuthenticated) {
      alert("Please login to apply for jobs");
      navigate("/login");
      return;
    }
    // Redirect to job details page to submit full application
    navigate(`${jobPath}#apply`);
  };

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-start gap-3">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-slate-100 text-lg font-bold text-slate-600">
          {companyLogo && !logoFailed
            ? <img src={companyLogo} alt={`${job.companyName} logo`} className="h-full w-full object-contain" onError={() => setLogoFailed(true)} />
            : companyInitial}
        </div>
        <div className="min-w-0">
          <h3 className="text-lg font-semibold leading-snug text-primary">{job.title}</h3>
          <p className="mt-1 text-sm text-slate-700">{job.companyName}</p>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2 text-xs font-medium">
        <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-700">📍 {job.location}</span>
        <span className="rounded-full bg-blue-50 px-3 py-1 text-blue-900">
          {workMode === "Remote" ? locationEligibility : workMode}
        </span>
        {job.jobType && job.jobType !== workMode && (
          <span className="rounded-full bg-violet-50 px-3 py-1 text-violet-900">
            {job.jobType}
          </span>
        )}
      </div>
      {isSampleListing ? (
        <p className="mt-2 inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
          Sample listing · external feed backup
        </p>
      ) : isDirectPosting ? (
        <p className="mt-2 inline-flex rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-900">
          Direct employer · JobBridge matching
        </p>
      ) : (
        <p className="mt-2 inline-flex rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-terracotta-dark">
          {locationEligibility} · {sourceLabel}
        </p>
      )}
      {salaryLabel && (
        <p className="mt-2 inline-flex rounded-lg bg-emerald-50 px-3 py-1.5 text-sm font-semibold text-emerald-900">
          💰 {salaryLabel}
        </p>
      )}
      <div className="mt-3 flex flex-wrap gap-2 text-xs font-medium">
        <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-700">
          {getRelativePostedTime(postedDate)}
        </span>
        {deadlineLabel && (
          <span className="rounded-full bg-amber-50 px-3 py-1 text-amber-900">
            Application deadline: {deadlineLabel}
          </span>
        )}
      </div>
      <p className="mt-2 text-gray-700">
        {job.description.length > 150
          ? `${job.description.slice(0, 150)}...`
          : job.description}
      </p>
      <div className="mt-4 flex gap-3">
        <Link
          to={jobPath}
          className="text-accent hover:underline font-medium"
        >
          View Details →
        </Link>
        {!isSampleListing && !isDirectPosting && job.applicationLink ? (
          <a
            href={job.applicationLink}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded bg-accent px-4 py-2 font-semibold text-white transition hover:bg-red-700"
          >
            Apply on official site
          </a>
        ) : isDirectPosting && !isSampleListing ? (
          <button
            onClick={handleApply}
            className="rounded bg-accent px-4 py-2 font-semibold text-white transition hover:bg-red-700"
          >
            Apply Now
          </button>
        ) : null}
      </div>
      <a
        href={`https://wa.me/?text=${encodeURIComponent(shareText)}`}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`Share ${job.title} on WhatsApp`}
        className="mt-3 inline-flex rounded-lg border border-emerald-200 px-3 py-2 text-sm font-semibold text-emerald-800 transition hover:bg-emerald-50"
      >
        Share on WhatsApp
      </a>
    </article>
  );
};

JobCard.propTypes = {
  job: PropTypes.shape({
    _id: PropTypes.string.isRequired,
    title: PropTypes.string.isRequired,
    companyName: PropTypes.string.isRequired,
    companyLogo: PropTypes.string,
    companyLogoUrl: PropTypes.string,
    location: PropTypes.string.isRequired,
    jobType: PropTypes.string,
    workplaceType: PropTypes.string,
    salaryRange: PropTypes.string,
    description: PropTypes.string.isRequired,
    source: PropTypes.string,
    sourceProvider: PropTypes.string,
    isDirectPosting: PropTypes.bool,
    isWorldwideRemote: PropTypes.bool,
    applicationLink: PropTypes.string,
    pubDate: PropTypes.oneOfType([PropTypes.string, PropTypes.number, PropTypes.instanceOf(Date)]),
    createdAt: PropTypes.oneOfType([PropTypes.string, PropTypes.number, PropTypes.instanceOf(Date)]),
    expiryDate: PropTypes.oneOfType([PropTypes.string, PropTypes.number, PropTypes.instanceOf(Date)]),
  }).isRequired,
};

export default JobCard;
