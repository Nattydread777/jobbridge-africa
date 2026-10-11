import { useEffect, useState } from "react";
import { useLocation, useSearchParams, Link } from "react-router-dom";
import api from "../services/api";
import JobCard from "../components/JobCard";
import locations from "../data/africaLocations";

const Jobs = () => {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0, nextCursor: null });
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
        const data = res.data;
        setJobs(Array.isArray(data) ? data : data.jobs || []);
        setPagination({
          page: data.page || 1,
          totalPages: data.totalPages || 1,
          total: data.total ?? data.length ?? 0,
          nextCursor: data.nextCursor || null,
        });
        setError("");
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setError(err.response?.data?.message || "Failed to load jobs. Please try again.");
        setLoading(false);
      });
  }, [search]);

  const handleFilterChange = (key, value) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);

    // Update URL params
    const params = new URLSearchParams();
    Object.entries(newFilters).forEach(([k, v]) => {
      if (v && k !== "experience") params.set(k, v);
    });
    if (newFilters.experience) {
      const seniority = {
        entry: "entry",
        mid: "mid",
        senior: "senior",
      }[newFilters.experience];
      if (seniority) params.set("seniority", seniority);
      if (newFilters.experience === "internship") params.set("jobType", "Internship");
    }
    params.set("page", "1");
    setSearchParams(params);
  };

  const handleNewsletterSubscribe = (e) => {
    e.preventDefault();
    alert(`Subscribed with email: ${email}`);
    setEmail("");
  };

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Back to Dashboard Link */}
      <Link
        to="/dashboard"
        className="text-primary hover:underline mb-4 inline-flex items-center gap-2 font-medium"
      >
        <span>←</span> Back to Dashboard
      </Link>

      <h1 className="text-3xl font-bold mb-2 text-charcoal">Find Your Dream Job</h1>
      <p className="mb-6 text-sm text-stone-600">
        Browse local and remote roles. Remote listings are credited to{" "}
        <a href="https://himalayas.app/" target="_blank" rel="noopener noreferrer" className="font-semibold text-terracotta underline">
          Himalayas
        </a>.
      </p>

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
            Available Jobs {!loading && `(${pagination.total})`}
          </h2>
          {error ? (
            <p role="alert" className="rounded-lg bg-red-50 p-4 text-red-700">{error}</p>
          ) : loading ? (
            <p className="text-gray-600">Loading jobs...</p>
          ) : jobs.length === 0 ? (
            <p className="text-gray-600">No jobs available at the moment.</p>
          ) : (
            <>
              <div className="grid gap-6 md:grid-cols-2">
                {jobs.map((job) => (
                  <JobCard key={job._id} job={job} />
                ))}
              </div>
              {pagination.totalPages > 1 && (
                <nav aria-label="Job pages" className="mt-8 flex items-center justify-center gap-4">
                  <button
                    type="button"
                    disabled={pagination.page <= 1}
                    onClick={() => {
                      const params = new URLSearchParams(searchParams);
                      params.set("page", String(pagination.page - 1));
                      setSearchParams(params);
                    }}
                    className="rounded-lg border px-4 py-2 font-semibold disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <span className="text-sm text-stone-600">
                    Page {pagination.page} of {pagination.totalPages}
                  </span>
                  <button
                    type="button"
                    disabled={pagination.page >= pagination.totalPages}
                    onClick={() => {
                      const params = new URLSearchParams(searchParams);
                      params.set("page", String(pagination.page + 1));
                      setSearchParams(params);
                    }}
                    className="rounded-lg border px-4 py-2 font-semibold disabled:opacity-50"
                  >
                    Next
                  </button>
                </nav>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
};

export default Jobs;
