import { useEffect, useState } from "react";
import { useLocation, useSearchParams } from "react-router-dom";
import api from "../services/api";
import JobCard from "../components/JobCard";
import locations from "../data/africaLocations";

const Jobs = () => {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchParams, setSearchParams] = useSearchParams();

  // Filter states
  const [filters, setFilters] = useState({
    search: searchParams.get("search") || "",
    country: searchParams.get("country") || "",
    city: searchParams.get("city") || "",
    jobType: searchParams.get("jobType") || "",
    salary: searchParams.get("salary") || "",
    datePosted: searchParams.get("datePosted") || "",
    experience: searchParams.get("experience") || "",
  });

  const [email, setEmail] = useState("");
  const { search } = useLocation();

  useEffect(() => {
    setLoading(true);
    const params = search || "";
    api
      .get(`/jobs${params}`)
      .then((res) => {
        setJobs(res.data);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, [search]);

  const handleFilterChange = (key, value) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);

    // Update URL params
    const params = new URLSearchParams();
    Object.entries(newFilters).forEach(([k, v]) => {
      if (v) params.set(k, v);
    });
    setSearchParams(params);
  };

  const handleNewsletterSubscribe = (e) => {
    e.preventDefault();
    alert(`Subscribed with email: ${email}`);
    setEmail("");
  };

  if (loading) {
    return <div className="p-6 text-center">Loading jobs...</div>;
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Filters Sidebar */}
        <aside className="lg:col-span-1 space-y-6">
          {/* Location Filter */}
          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="font-bold mb-3">📍 Location</h3>
            <select
              value={filters.country}
              onChange={(e) => handleFilterChange("country", e.target.value)}
              className="w-full p-2 border rounded mb-2"
            >
              <option value="">All Countries</option>
              {locations.map((loc) => (
                <option key={loc.country} value={loc.country}>
                  {loc.country}
                </option>
              ))}
            </select>
            {filters.country && (
              <select
                value={filters.city}
                onChange={(e) => handleFilterChange("city", e.target.value)}
                className="w-full p-2 border rounded"
              >
                <option value="">All Cities</option>
                {locations
                  .find((l) => l.country === filters.country)
                  ?.cities?.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
              </select>
            )}
          </div>

          {/* Salary Filter */}
          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="font-bold mb-3">💰 Salary</h3>
            <select
              value={filters.salary}
              onChange={(e) => handleFilterChange("salary", e.target.value)}
              className="w-full p-2 border rounded"
            >
              <option value="">All Ranges</option>
              <option value="hourly">Hourly</option>
              <option value="monthly">Monthly</option>
              <option value="yearly">Yearly</option>
            </select>
          </div>

          {/* Date Posted Filter */}
          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="font-bold mb-3">📅 Date Posted</h3>
            <select
              value={filters.datePosted}
              onChange={(e) => handleFilterChange("datePosted", e.target.value)}
              className="w-full p-2 border rounded"
            >
              <option value="">All Time</option>
              <option value="24h">Last 24 Hours</option>
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last Month</option>
            </select>
          </div>

          {/* Work Experience Filter */}
          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="font-bold mb-3">🎓 Work Experience</h3>
            <select
              value={filters.experience}
              onChange={(e) => handleFilterChange("experience", e.target.value)}
              className="w-full p-2 border rounded"
            >
              <option value="">Any Experience</option>
              <option value="internship">Internship</option>
              <option value="entry">Entry Level</option>
              <option value="mid">Mid Level</option>
              <option value="senior">Senior Level</option>
            </select>
          </div>

          {/* Job Type Filter */}
          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="font-bold mb-3">💼 Job Type</h3>
            <select
              value={filters.jobType}
              onChange={(e) => handleFilterChange("jobType", e.target.value)}
              className="w-full p-2 border rounded"
            >
              <option value="">All Types</option>
              <option value="Full-Time">Full-Time</option>
              <option value="Part-Time">Part-Time</option>
              <option value="Contract">Contract</option>
              <option value="Remote">Remote</option>
              <option value="Internship">Internship</option>
            </select>
          </div>

          {/* Newsletter Subscription */}
          <div className="bg-primary/10 p-4 rounded-lg shadow">
            <h3 className="font-bold mb-2">✉️ Email Latest Jobs</h3>
            <p className="text-sm text-gray-600 mb-3">
              Subscribe our Newsletter for latest job updates
            </p>
            <form onSubmit={handleNewsletterSubscribe}>
              <input
                type="email"
                placeholder="Your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full p-2 border rounded mb-2"
                required
              />
              <button
                type="submit"
                className="w-full bg-primary text-black px-4 py-2 rounded hover:brightness-95 transition font-semibold"
              >
                Subscribe
              </button>
            </form>
          </div>

          {/* Resume Upload */}
          <div className="bg-secondary/10 p-4 rounded-lg shadow">
            <h3 className="font-bold mb-2">📄 Get Noticed Faster</h3>
            <p className="text-sm text-gray-600 mb-3">
              Upload your resume here to get noticed faster by Top Companies.
            </p>
            <button className="w-full bg-secondary text-white px-4 py-2 rounded hover:brightness-95 transition font-semibold">
              Upload Resume
            </button>
          </div>
        </aside>

        {/* Jobs List */}
        <main className="lg:col-span-3">
          <h2 className="text-2xl font-bold mb-4">
            Available Jobs {jobs.length > 0 && `(${jobs.length})`}
          </h2>
          {jobs.length === 0 ? (
            <p className="text-gray-600">No jobs available at the moment.</p>
          ) : (
            <div className="grid gap-6 md:grid-cols-2">
              {jobs.map((job) => (
                <JobCard key={job._id} job={job} />
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default Jobs;
