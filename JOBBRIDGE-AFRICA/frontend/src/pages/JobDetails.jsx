import { useParams, Link, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";

const JobDetails = () => {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
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

  useEffect(() => {
    setLoading(true);
    api
      .get(`/jobs/${id}`)
      .then((res) => {
        setJob(res.data);
        setLoading(false);
        // Auto-open modal if hash is #apply and user is authenticated
        if (location.hash === "#apply" && isAuthenticated && user) {
          // Check profile completion before auto-opening
          if (user.role === "job_seeker") {
            if (
              !user.profileImageUrl ||
              !user.resumeUrl ||
              !user.country ||
              !user.bio
            ) {
              if (
                window.confirm(
                  "Please complete your profile (upload photo, upload resume, add country and bio) before applying.\n\nGo to profile now?"
                )
              ) {
                navigate("/profile");
              }
              return;
            }
          }
          setShowApplicationModal(true);
        }
      })
      .catch((err) => {
        console.error(err);
        setError("Failed to load job details. Please try again.");
        setLoading(false);
      });
  }, [id, location.hash, isAuthenticated, user, navigate]);

  const handleApplyClick = () => {
    if (!isAuthenticated) {
      alert("Please login to apply for jobs");
      navigate("/login");
      return;
    }

    // Check if job seeker has completed profile
    if (user.role === "job_seeker") {
      // Check if user has uploaded a profile photo
      if (!user.profileImageUrl) {
        if (
          window.confirm(
            "Please upload your profile photo before applying for jobs.\n\nWould you like to go to your profile now?"
          )
        ) {
          navigate("/profile");
        }
        return;
      }

      // Check if user has uploaded a resume
      if (!user.resumeUrl) {
        if (
          window.confirm(
            "Please complete your profile and upload your resume before applying for jobs.\n\nWould you like to go to your profile now?"
          )
        ) {
          navigate("/profile");
        }
        return;
      }

      // Check if user has filled basic info
      if (!user.country || !user.bio) {
        if (
          window.confirm(
            "Please complete your profile information (country and bio) before applying for jobs.\n\nWould you like to go to your profile now?"
          )
        ) {
          navigate("/profile");
        }
        return;
      }
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
      // Validate file size (5MB max)
      if (file.size > 5 * 1024 * 1024) {
        alert("Resume file size must be less than 5MB");
        return;
      }
      setApplicationData({ ...applicationData, resume: file });
    }
  };

  const handleSubmitApplication = async (e) => {
    e.preventDefault();

    if (!applicationData.resume) {
      alert("Please upload your resume/CV");
      return;
    }

    setSubmitting(true);

    try {
      // Send application to backend with FormData
      const formData = new FormData();
      formData.append("jobId", id);
      formData.append("coverLetter", applicationData.coverLetter);
      formData.append("resume", applicationData.resume);

      const response = await api.post("/applications", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      setApplied(true);
      setShowApplicationModal(false);
      setSubmitting(false);
      alert(
        "✅ Application submitted successfully!\n\nThe employer will review your application and contact you via email."
      );
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

  if (loading)
    return <div className="max-w-4xl mx-auto p-6">Loading job details...</div>;
  if (error)
    return <div className="max-w-4xl mx-auto p-6 text-red-600">{error}</div>;
  if (!job) return <div className="max-w-4xl mx-auto p-6">Job not found</div>;

  return (
    <section className="max-w-4xl mx-auto p-6">
      <Link
        to="/jobs"
        className="text-primary hover:underline mb-4 inline-block"
      >
        ← Back to Jobs
      </Link>

      <div className="bg-white rounded-lg shadow-md p-8">
        <h1 className="text-4xl font-bold text-primary mb-2">{job.title}</h1>
        <p className="text-xl text-gray-700 mb-2">{job.companyName}</p>
        <div className="flex flex-wrap gap-4 mb-6 text-sm text-gray-600">
          <span>📍 {job.location}</span>
          <span>💼 {job.jobType}</span>
          {job.salaryRange && <span>💰 {job.salaryRange}</span>}
          {job.expiryDate && (
            <span>
              ⏰ Apply by: {new Date(job.expiryDate).toLocaleDateString()}
            </span>
          )}
        </div>

        <div className="mb-6">
          <h2 className="text-2xl font-bold mb-3">Job Description</h2>
          <p className="text-gray-700 whitespace-pre-line">{job.description}</p>
        </div>

        {job.requirements && (
          <div className="mb-6">
            <h2 className="text-2xl font-bold mb-3">Requirements</h2>
            <p className="text-gray-700 whitespace-pre-line">
              {job.requirements}
            </p>
          </div>
        )}

        {job.responsibilities && (
          <div className="mb-6">
            <h2 className="text-2xl font-bold mb-3">Responsibilities</h2>
            <p className="text-gray-700 whitespace-pre-line">
              {job.responsibilities}
            </p>
          </div>
        )}

        {job.benefits && (
          <div className="mb-6">
            <h2 className="text-2xl font-bold mb-3">Benefits</h2>
            <p className="text-gray-700 whitespace-pre-line">{job.benefits}</p>
          </div>
        )}

        {job.applicationEmail && (
          <div className="mb-6">
            <p className="text-gray-600">
              <strong>How to Apply:</strong> Send your application to{" "}
              <a
                href={`mailto:${job.applicationEmail}`}
                className="text-primary hover:underline"
              >
                {job.applicationEmail}
              </a>
            </p>
          </div>
        )}

        <div className="flex gap-4">
          <button
            onClick={handleApplyClick}
            disabled={applied}
            className={`px-8 py-3 rounded font-semibold transition ${
              applied
                ? "bg-gray-300 text-gray-600 cursor-not-allowed"
                : "bg-accent text-white hover:bg-red-700"
            }`}
          >
            {applied ? "Applied ✓" : "Apply Now"}
          </button>
          <Link
            to="/jobs"
            className="px-8 py-3 rounded font-semibold bg-gray-200 text-gray-700 hover:bg-gray-300 transition"
          >
            Browse More Jobs
          </Link>
        </div>
      </div>

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
                  <label className="block text-sm font-medium mb-2">
                    Resume/CV <span className="text-red-500">*</span>
                  </label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                    <input
                      type="file"
                      id="resume-upload"
                      accept=".pdf,.doc,.docx"
                      onChange={handleFileChange}
                      required
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
                          : "Click to upload your resume/CV"}
                      </p>
                      <p className="text-xs text-gray-500">
                        Supported formats: PDF, DOC, DOCX (Max 5MB)
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
                    {submitting ? "Submitting..." : "Submit Application"}
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
