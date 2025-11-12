import { Link, useNavigate } from "react-router-dom";
import PropTypes from "prop-types";
import { useState } from "react";
import { useAuth } from "../context/AuthContext";

const JobCard = ({ job }) => {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [applied, setApplied] = useState(false);

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
      <p className="text-sm text-gray-600 mt-1">{job.jobType}</p>
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
        <button
          onClick={handleApply}
          disabled={applied}
          className={`px-4 py-2 rounded font-semibold transition ${
            applied
              ? "bg-gray-300 text-gray-600 cursor-not-allowed"
              : "bg-accent text-white hover:bg-red-700"
          }`}
        >
          {applied ? "Applied ✓" : "Apply Now"}
        </button>
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
    salaryRange: PropTypes.string,
    description: PropTypes.string.isRequired,
  }).isRequired,
};

export default JobCard;
