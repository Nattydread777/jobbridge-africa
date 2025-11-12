import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { Link } from "react-router-dom";
import api from "../services/api";

const EmployerDashboard = () => {
  const { user } = useAuth();
  const [myJobs, setMyJobs] = useState([]);
  const [selectedJob, setSelectedJob] = useState(null);
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchMyJobs();
  }, []);

  const fetchMyJobs = async () => {
    try {
      setLoading(true);
      // Get all jobs and filter by current user as employer
      const response = await api.get("/jobs");
      const userJobs = response.data.filter((job) => job.employer === user._id);
      setMyJobs(userJobs);
      setError("");
    } catch (error) {
      console.error("Error fetching jobs:", error);
      setError(error.response?.data?.message || "Failed to load jobs");
    } finally {
      setLoading(false);
    }
  };

  const fetchApplications = async (jobId) => {
    try {
      const response = await api.get(`/applications/job/${jobId}`);
      setApplications(response.data);
      setSelectedJob(jobId);
    } catch (error) {
      console.error("Error fetching applications:", error);
      alert(error.response?.data?.message || "Failed to load applications");
    }
  };

  const updateApplicationStatus = async (applicationId, newStatus) => {
    try {
      await api.put(`/applications/${applicationId}/status`, {
        status: newStatus,
      });
      // Refresh applications
      fetchApplications(selectedJob);
      alert(`Application ${newStatus} successfully`);
    } catch (error) {
      console.error("Error updating application:", error);
      alert(error.response?.data?.message || "Failed to update application");
    }
  };

  if (!user || user.role !== "employer") {
    return (
      <div className="max-w-7xl mx-auto p-8 text-center">
        <h2 className="text-2xl font-bold mb-4">Access Denied</h2>
        <p className="text-gray-600 mb-4">This page is only for employers</p>
        <Link to="/" className="text-primary hover:underline">
          Go to Home
        </Link>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto p-8 text-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        <p className="mt-4 text-gray-600">Loading dashboard...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto p-8">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
        <button onClick={fetchMyJobs} className="text-primary hover:underline">
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Employer Dashboard</h1>
        <Link
          to="/post-job"
          className="bg-primary text-white px-6 py-2 rounded-lg hover:bg-orange-600 transition"
        >
          Post New Job
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Jobs List */}
        <div className="lg:col-span-1 bg-white rounded-lg shadow p-4">
          <h2 className="text-xl font-bold mb-4">My Jobs ({myJobs.length})</h2>
          {myJobs.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-600 mb-4">No jobs posted yet</p>
              <Link to="/post-job" className="text-primary hover:underline">
                Post Your First Job
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {myJobs.map((job) => (
                <div
                  key={job._id}
                  onClick={() => fetchApplications(job._id)}
                  className={`p-3 rounded cursor-pointer transition ${
                    selectedJob === job._id
                      ? "bg-primary text-white"
                      : "bg-gray-50 hover:bg-gray-100"
                  }`}
                >
                  <h3 className="font-semibold">{job.title}</h3>
                  <p
                    className={`text-sm ${
                      selectedJob === job._id
                        ? "text-white/90"
                        : "text-gray-600"
                    }`}
                  >
                    {job.company}
                  </p>
                  <p
                    className={`text-xs ${
                      selectedJob === job._id
                        ? "text-white/80"
                        : "text-gray-500"
                    }`}
                  >
                    Posted: {new Date(job.createdAt).toLocaleDateString()}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Applications List */}
        <div className="lg:col-span-2 bg-white rounded-lg shadow p-6">
          {!selectedJob ? (
            <div className="text-center py-12">
              <p className="text-gray-600">Select a job to view applications</p>
            </div>
          ) : applications.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-600">No applications yet for this job</p>
            </div>
          ) : (
            <>
              <h2 className="text-xl font-bold mb-4">
                Applications ({applications.length})
              </h2>
              <div className="space-y-4">
                {applications.map((application) => (
                  <div
                    key={application._id}
                    className="border rounded-lg p-4 hover:shadow-md transition"
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="font-bold text-lg">
                          {application.applicant.name}
                        </h3>
                        <p className="text-gray-600 text-sm">
                          {application.applicant.email}
                        </p>
                        <p className="text-gray-500 text-xs mt-1">
                          Applied:{" "}
                          {new Date(application.createdAt).toLocaleDateString()}
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

                    {application.coverLetter && (
                      <div className="mb-3">
                        <p className="font-semibold text-sm text-gray-700 mb-1">
                          Cover Letter:
                        </p>
                        <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded">
                          {application.coverLetter}
                        </p>
                      </div>
                    )}

                    {application.resumeUrl && (
                      <div className="mb-3">
                        <a
                          href={application.resumeUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center text-sm text-primary hover:underline"
                        >
                          📄 View Resume
                        </a>
                      </div>
                    )}

                    <div className="flex gap-2 pt-3 border-t">
                      <button
                        onClick={() =>
                          updateApplicationStatus(application._id, "reviewed")
                        }
                        disabled={application.status === "reviewed"}
                        className="px-3 py-1 text-sm bg-yellow-100 text-yellow-700 rounded hover:bg-yellow-200 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Mark Reviewed
                      </button>
                      <button
                        onClick={() =>
                          updateApplicationStatus(
                            application._id,
                            "shortlisted"
                          )
                        }
                        disabled={
                          application.status === "shortlisted" ||
                          application.status === "accepted"
                        }
                        className="px-3 py-1 text-sm bg-green-100 text-green-700 rounded hover:bg-green-200 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Shortlist
                      </button>
                      <button
                        onClick={() =>
                          updateApplicationStatus(application._id, "accepted")
                        }
                        disabled={application.status === "accepted"}
                        className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Accept
                      </button>
                      <button
                        onClick={() =>
                          updateApplicationStatus(application._id, "rejected")
                        }
                        disabled={application.status === "rejected"}
                        className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default EmployerDashboard;
