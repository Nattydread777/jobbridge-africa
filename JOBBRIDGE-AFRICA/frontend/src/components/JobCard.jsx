import { Link, useNavigate } from "react-router-dom";
import PropTypes from "prop-types";
import { useAuth } from "../context/AuthContext";

const JobCard = ({ job }) => {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const isDirectPosting = job.source === "employer"
    || (job.source == null && job.isDirectPosting !== false);

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
      {isDirectPosting ? (
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
        {!isDirectPosting && job.applicationLink ? (
          <a
            href={job.applicationLink}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded bg-accent px-4 py-2 font-semibold text-white transition hover:bg-red-700"
          >
            Apply on official site
          </a>
        ) : isDirectPosting ? (
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
  }).isRequired,
};

export default JobCard;
