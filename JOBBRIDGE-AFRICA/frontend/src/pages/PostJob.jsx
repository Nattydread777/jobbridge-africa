import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import api from "../services/api";

const PostJob = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    title: "",
    companyName: user?.companyName || "",
    location: "",
    jobType: "Full-Time",
    workplaceType: "on-site",
    salaryRange: "",
    description: "",
    requirements: "",
    responsibilities: "",
    benefits: "",
    expiryDate: "",
    applicationEmail: user?.email || "",
  });

  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const jobData = {
        title: formData.title,
        companyName: formData.companyName,
        location: formData.location,
        jobType: formData.jobType,
        workplaceType: formData.workplaceType,
        salaryRange: formData.salaryRange,
        description: formData.description,
        requirements: formData.requirements,
        responsibilities: formData.responsibilities,
        benefits: formData.benefits,
        expiryDate: formData.expiryDate,
        applicationEmail: formData.applicationEmail,
      };

      await api.post("/jobs", jobData);
      alert("Job posted successfully!");
      navigate("/dashboard");
    } catch (error) {
      console.error("Error posting job:", error);
      alert(
        error.response?.data?.message || "Failed to post job. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  if (!user || user.role !== "employer") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Only employers can post jobs. Please login as an employer.</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="max-w-3xl mx-auto bg-white p-8 rounded-lg shadow">
        <h1 className="text-3xl font-bold mb-8">Post a New Job</h1>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Job Title */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Job Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              required
              className="w-full border rounded px-4 py-2"
              placeholder="e.g., Senior Software Engineer"
            />
          </div>

          {/* Company Name */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Company Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="companyName"
              value={formData.companyName}
              onChange={handleChange}
              required
              className="w-full border rounded px-4 py-2"
            />
          </div>

          <div>
            <label htmlFor="job-location" className="mb-2 block text-sm font-medium">
              Location <span className="text-red-500">*</span>
            </label>
            <input
              id="job-location"
              type="text"
              name="location"
              value={formData.location}
              onChange={handleChange}
              required
              className="w-full rounded border px-4 py-2"
              placeholder="e.g., Lagos, Nigeria · London, UK · Worldwide"
            />
          </div>

          <div>
            <label htmlFor="workplace-type" className="mb-2 block text-sm font-medium">
              Workplace arrangement <span className="text-red-500">*</span>
            </label>
            <select
              id="workplace-type"
              name="workplaceType"
              value={formData.workplaceType}
              onChange={handleChange}
              required
              className="w-full rounded border px-4 py-2"
            >
              <option value="on-site">On-site</option>
              <option value="hybrid">Hybrid</option>
              <option value="remote">Remote</option>
            </select>
          </div>

          {/* Job Type */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Employment type <span className="text-red-500">*</span>
            </label>
            <select
              name="jobType"
              value={formData.jobType}
              onChange={handleChange}
              required
              className="w-full border rounded px-4 py-2"
            >
              <option value="Full-Time">Full-Time</option>
              <option value="Part-Time">Part-Time</option>
              <option value="Contract">Contract</option>
              <option value="Internship">Internship</option>
            </select>
          </div>

          {/* Salary Range */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Salary Range
            </label>
            <input
              type="text"
              name="salaryRange"
              value={formData.salaryRange}
              onChange={handleChange}
              className="w-full border rounded px-4 py-2"
              placeholder="e.g., $50,000 - $70,000 per year"
            />
          </div>

          {/* Job Description */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Job Description <span className="text-red-500">*</span>
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              required
              rows="5"
              className="w-full border rounded px-4 py-2"
              placeholder="Provide a detailed description of the job..."
            />
          </div>

          {/* Requirements */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Requirements <span className="text-red-500">*</span>
            </label>
            <textarea
              name="requirements"
              value={formData.requirements}
              onChange={handleChange}
              required
              rows="4"
              className="w-full border rounded px-4 py-2"
              placeholder="List the required qualifications, skills, and experience..."
            />
          </div>

          {/* Responsibilities */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Key Responsibilities <span className="text-red-500">*</span>
            </label>
            <textarea
              name="responsibilities"
              value={formData.responsibilities}
              onChange={handleChange}
              required
              rows="4"
              className="w-full border rounded px-4 py-2"
              placeholder="Describe the main responsibilities of this role..."
            />
          </div>

          {/* Benefits */}
          <div>
            <label className="block text-sm font-medium mb-2">Benefits</label>
            <textarea
              name="benefits"
              value={formData.benefits}
              onChange={handleChange}
              rows="3"
              className="w-full border rounded px-4 py-2"
              placeholder="e.g., Health insurance, Remote work, Professional development..."
            />
          </div>

          {/* Expiry Date */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Application Deadline <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              name="expiryDate"
              value={formData.expiryDate}
              onChange={handleChange}
              required
              min={new Date().toISOString().split("T")[0]}
              className="w-full border rounded px-4 py-2"
            />
          </div>

          {/* Application Email */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Application Email <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              name="applicationEmail"
              value={formData.applicationEmail}
              onChange={handleChange}
              required
              className="w-full border rounded px-4 py-2"
              placeholder="Where should applications be sent?"
            />
          </div>

          {/* Submit Button */}
          <div className="flex gap-4 pt-4">
            <button
              type="submit"
              disabled={loading}
              className={`px-8 py-3 rounded font-semibold transition ${
                loading
                  ? "bg-gray-400 text-gray-200 cursor-not-allowed"
                  : "bg-primary text-white hover:bg-yellow-600"
              }`}
            >
              {loading ? "Posting..." : "Post Job"}
            </button>
            <button
              type="button"
              onClick={() => navigate("/dashboard")}
              disabled={loading}
              className="bg-gray-300 text-gray-700 px-8 py-3 rounded hover:bg-gray-400 transition disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PostJob;
