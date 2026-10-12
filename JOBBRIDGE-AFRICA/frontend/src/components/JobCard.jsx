import { Link, useNavigate } from "react-router-dom";
import PropTypes from "prop-types";
import { useAuth } from "../context/AuthContext";

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
    : "Not specified";
};

const JobCard = ({ job }) => {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const isSampleListing = job.sourceProvider === "jobbridge-fallback";
  const isDirectPosting = job.source === "employer"
    || (job.source == null && job.isDirectPosting !== false);
  const postedDate = job.pubDate || job.createdAt;

  const handleApply = () => {
    if (!isAuthenticated) {
      alert("Please login to apply for jobs");
      navigate("/login");
      return;
    }
    // Redirect to job details page to submit full application
    navigate(`/jobs/${job._id}#apply`);
  };

  return (
    <div className="border p-4 rounded shadow-sm bg-white hover:shadow-md transition">
      <h3 className="text-xl font-semibold text-primary">{job.title}</h3>
      <p className="text-sm text-text mt-1">
        {job.companyName} – {job.location}
      </p>
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
          {job.isWorldwideRemote
            ? "Worldwide remote"
            : `Remote · ${job.locationRestriction || job.location}`}
          {" · Global Partner Feed"}
        </p>
      )}
      <p className="mt-1 text-sm text-gray-600">
        {job.jobType}
        {job.workplaceType && ` · ${job.workplaceType.replace("-", " ")}`}
      </p>
      {job.salaryRange && (
        <p className="text-sm text-gray-600 mt-1">Salary: {job.salaryRange}</p>
      )}
      <div className="mt-3 flex flex-wrap gap-2 text-xs font-medium">
        <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-700">
          {getRelativePostedTime(postedDate)}
        </span>
        <span className="rounded-full bg-amber-50 px-3 py-1 text-amber-900">
          Application deadline: {getDeadlineLabel(job.expiryDate)}
        </span>
      </div>
      <p className="mt-2 text-gray-700">
        {job.description.length > 150
          ? `${job.description.slice(0, 150)}...`
          : job.description}
      </p>
      <div className="mt-4 flex gap-3">
        <Link
          to={`/jobs/${job._id}`}
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
    </div>
  );
};

JobCard.propTypes = {
  job: PropTypes.shape({
    _id: PropTypes.string.isRequired,
    title: PropTypes.string.isRequired,
    companyName: PropTypes.string.isRequired,
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
