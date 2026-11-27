import { useAuth } from "../context/AuthContext";
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import api from "../services/api";
import { getJobPath } from "../utils/jobUrl";

const MyJobs = () => {
  const { user } = useAuth();
  const [appliedJobs, setAppliedJobs] = useState([]);
  const [externalApplications, setExternalApplications] = useState([]);
  const [activeTab, setActiveTab] = useState("applied");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchApplications = async () => {
      try {
        setLoading(true);
        const [applicationsResponse, externalApplicationsResponse] = await Promise.all([
          api.get("/applications/my-applications"),
          api.get("/applications/my-external-applications"),
        ]);
        setAppliedJobs(applicationsResponse.data);
        setExternalApplications(externalApplicationsResponse.data);
        setError("");
      } catch (error) {
        console.error("Error fetching applications:", error);
        setError(
          error.response?.data?.message || "Failed to load applications"
        );
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchApplications();
    }
  }, [user]);

  if (!user) {
    return (
      <div className="max-w-7xl mx-auto p-8 text-center">
        <h2 className="text-2xl font-bold mb-4">
          Please log in to view your jobs
        </h2>
        <Link to="/login" className="text-primary hover:underline">
          Go to Login
        </Link>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto p-8 text-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        <p className="mt-4 text-gray-600">Loading your applications...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto p-8">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
        <Link to="/jobs" className="text-primary hover:underline">
          ← Back to Jobs
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-8">
      <div className="mb-6">
        <Link
          to="/profile-view"
          className="text-primary hover:underline inline-flex items-center gap-2 mb-4"
        >
          ← Back to Dashboard
        </Link>
        <h1 className="text-3xl font-bold">My Applications</h1>
      </div>

      <div className="flex gap-4 mb-6 border-b">
        <button
          onClick={() => setActiveTab("applied")}
          className={`px-4 py-2 font-semibold ${
            activeTab === "applied"
              ? "text-primary border-b-2 border-primary"
              : "text-gray-600"
          }`}
        >
          Applied ({appliedJobs.length + externalApplications.length})
        </button>
        <button
          onClick={() => setActiveTab("saved")}
          className={`px-4 py-2 font-semibold ${
            activeTab === "saved"
              ? "text-primary border-b-2 border-primary"
              : "text-gray-600"
          }`}
        >
          Saved (0)
        </button>
        <button
          onClick={() => setActiveTab("interviews")}
          className={`px-4 py-2 font-semibold ${
            activeTab === "interviews"
              ? "text-primary border-b-2 border-primary"
              : "text-gray-600"
          }`}
        >
          Interviews (1)
        </button>
      </div>

      <div className="space-y-4">
        {activeTab === "applied" && appliedJobs.length === 0 && externalApplications.length === 0 && (
          <div className="text-center py-12 bg-white rounded-lg shadow">
            <p className="text-gray-600 mb-4">
              You haven't applied to any jobs yet
            </p>
            <Link to="/jobs" className="text-primary hover:underline">
              Browse Jobs
            </Link>
          </div>
        )}

        {activeTab === "applied" &&
          appliedJobs.map((application) => (
            <div
              key={application._id}
              className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition"
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-xl font-bold mb-2">
                    {application.job.title}
                  </h3>
                  <p className="text-gray-600">{application.job.company}</p>
                  <p className="text-gray-500 text-sm">
                    📍 {application.job.location}
                  </p>
                </div>
                <span
                  className={`px-3 py-1 rounded-full text-sm font-medium ${
                    application.status === "shortlisted"
                      ? "bg-green-100 text-green-700"
                      : application.status === "accepted"
                      ? "bg-blue-100 text-blue-700"
                      : application.status === "rejected"
                      ? "bg-red-100 text-red-700"
                      : application.status === "reviewed"
                      ? "bg-yellow-100 text-yellow-700"
                      : "bg-gray-100 text-gray-700"
                  }`}
                >
                  {application.status.charAt(0).toUpperCase() +
                    application.status.slice(1)}
                </span>
              </div>
              <div className="flex justify-between items-center text-sm text-gray-600 mb-3">
                <p>
                  Applied:{" "}
                  {new Date(application.createdAt).toLocaleDateString()}
                </p>
                <Link
                  to={getJobPath(application.job)}
                  className="text-primary hover:underline"
                >
                  View Job Details →
                </Link>
              </div>
              {application.coverLetter && (
                <div className="border-t pt-3 mt-3">
                  <p className="text-sm font-semibold text-gray-700 mb-1">
                    Cover Letter:
                  </p>
                  <p className="text-sm text-gray-600 line-clamp-2">
                    {application.coverLetter}
                  </p>
                </div>
              )}
              {application.resumeUrl && (
                <div className="border-t pt-3 mt-3">
                  <a
                    href={application.resumeUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-primary hover:underline"
                  >
                    📄 View Resume
                  </a>
                </div>
              )}
            </div>
          ))}

        {activeTab === "applied" &&
          externalApplications.map((application) => (
            <div
              key={`external-${application._id}`}
              className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition"
            >
              <div className="flex flex-wrap justify-between items-start gap-3 mb-4">
                <div>
                  <h3 className="text-xl font-bold mb-2">
                    {application.job?.title || application.jobTitle}
                  </h3>
                  <p className="text-gray-600">
                    {application.job?.companyName || application.companyName}
                  </p>
                  <p className="text-gray-500 text-sm">
                    📍 {application.job?.location || application.location || "Location not specified"}
                  </p>
                </div>
                <span className="rounded-full bg-amber-100 px-3 py-1 text-sm font-medium text-amber-900">
                  Applied externally
                </span>
              </div>
              <div className="flex flex-wrap justify-between items-center gap-3 text-sm text-gray-600">
                <p>Tracked: {new Date(application.appliedAt).toLocaleDateString()}</p>
                {application.job?._id && (
                  <Link
                    to={getJobPath(application.job)}
                    className="text-primary hover:underline"
                  >
                    View Job Details →
                  </Link>
                )}
              </div>
              <a
                href={application.applicationLink}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-block text-sm font-semibold text-primary underline"
              >
                Open official application listing ↗
              </a>
            </div>
          ))}

        {activeTab === "saved" && (
          <div className="text-center py-12 bg-white rounded-lg shadow">
            <p className="text-gray-600 mb-4">No saved jobs</p>
            <Link to="/jobs" className="text-primary hover:underline">
              Browse Jobs
            </Link>
          </div>
        )}

        {activeTab === "interviews" && (
          <div className="space-y-4">
            {appliedJobs.filter(
              (application) =>
                application.status === "shortlisted" ||
                application.status === "accepted"
            ).length === 0 ? (
              <div className="text-center py-12 bg-white rounded-lg shadow">
                <p className="text-gray-600 mb-4">
                  No interviews scheduled yet
                </p>
                <Link to="/jobs" className="text-primary hover:underline">
                  Keep Applying to Jobs
                </Link>
              </div>
            ) : (
              appliedJobs
                .filter(
                  (application) =>
                    application.status === "shortlisted" ||
                    application.status === "accepted"
                )
                .map((application) => (
                  <div
                    key={application._id}
                    className="bg-white p-6 rounded-lg shadow"
                  >
                    <h3 className="text-xl font-bold mb-2">
                      {application.job.title}
                    </h3>
                    <p className="text-gray-600 mb-2">
                      {application.job.company}
                    </p>
                    <p className="text-gray-500 text-sm mb-2">
                      📍 {application.job.location}
                    </p>
                    <p className="text-green-600 font-semibold">
                      ✅ Status:{" "}
                      {application.status === "shortlisted"
                        ? "Shortlisted"
                        : "Accepted"}
                    </p>
                    {application.job.applicationEmail && (
                      <p className="text-sm text-gray-600 mt-2">
                        Contact: {application.job.applicationEmail}
                      </p>
                    )}
                  </div>
                ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default MyJobs;
