import { useEffect, useState } from "react";
import { useLocation, useSearchParams, Link } from "react-router-dom";
import api from "../services/api";
import JobCard from "../components/JobCard";
import locations from "../data/jobLocations";

const Jobs = () => {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retryKey, setRetryKey] = useState(0);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0, nextCursor: null });
  const [searchParams, setSearchParams] = useSearchParams();

  // Filter states
  const [filters, setFilters] = useState({
    search: searchParams.get("search") || searchParams.get("q") || "",
    location: searchParams.get("location") || "",
    country: searchParams.get("country") || "",
    city: searchParams.get("city") || "",
    jobType: searchParams.get("jobType") || "",
    isRemote: searchParams.get("isRemote") || "",
    workplaceType: searchParams.get("workplaceType") || "",
    salary: searchParams.get("salary") || "",
    datePosted: searchParams.get("datePosted") || "",
    experience: searchParams.get("experience") || "",
  });

  const [email, setEmail] = useState("");
  const { search } = useLocation();

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    const params = search || "";
    api
      .get(`/jobs${params}`, { signal: controller.signal })
      .then((res) => {
        const data = res.data;
        const loadedJobs = Array.isArray(data) ? data : data?.jobs;
        if (!Array.isArray(loadedJobs)) {
          throw new Error("The jobs service returned an unexpected response.");
        }
        setJobs(loadedJobs);
        setPagination({
          page: data.page || 1,
          totalPages: data.totalPages || 1,
          total: data.total ?? loadedJobs.length,
          nextCursor: data.nextCursor || null,
        });
        setError("");
        setLoading(false);
      })
      .catch((err) => {
        if (controller.signal.aborted || err.code === "ERR_CANCELED") return;
        console.error("Failed to load jobs:", err);
        const message = err.response?.data?.message
          || (err.request
            ? "We couldn’t reach the jobs service. Check your connection and try again."
            : err.message || "Jobs could not be loaded. Please try again."            );
            setJobs([]);
            setError(message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [search, retryKey]);

  const handleFilterChange = (key, value) => {
    const legacyNonRemote = key === "workplaceType" && value === "non-remote";
    const newFilters = {
      ...filters,
      [key]: legacyNonRemote ? "" : value,
      ...(legacyNonRemote ? { isRemote: "false" } : {}),
      ...(key === "country" ? { city: "" } : {}),
      ...(key === "location" ? { country: "", city: "" } : {}),
      ...(key === "location" || key === "country" || key === "city"
        ? { location: key === "location" ? value : "" }
        : {}),
      ...(key === "workplaceType" && !legacyNonRemote ? { isRemote: "" } : {}),
      ...(key === "country" && value === "Worldwide" ? { isRemote: "true" } : {}),
      ...(key === "country" && value !== "Worldwide" && filters.country === "Worldwide"
        ? { isRemote: "" }
        : {}),
    };
    setFilters(newFilters);

    // Update URL params
    const params = new URLSearchParams();
    Object.entries(newFilters).forEach(([k, v]) => {
      if (!v || k === "experience" || k === "isRemote" || k === "country" || k === "city") return;
      params.set(k === "search" ? "q" : k, v);
    });
    if (newFilters.country && !newFilters.location) params.set("country", newFilters.country);
    if (newFilters.city && !newFilters.location) params.set("city", newFilters.city);
    if (newFilters.isRemote && !newFilters.workplaceType) params.set("isRemote", newFilters.isRemote);
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
        to="/"
        className="text-primary hover:underline mb-4 inline-flex items-center gap-2 font-medium"
      >
          <span>←</span> Back to Home
      </Link>

      <h1 className="text-3xl font-bold mb-2 text-charcoal">Find Your Dream Job</h1>
      <p className="mb-6 text-sm text-stone-600">
        Explore active opportunities across Africa and worldwide. Search by any city, country, or
        region, then narrow results by remote, hybrid, or on-site work arrangements.
      </p>
      <p className="mb-6 inline-flex rounded-full bg-amber-100 px-4 py-2 text-sm font-semibold text-terracotta-dark">
        UN SDG 8 · Decent Work and Economic Growth · Africa-first matching
      </p>
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Filters Sidebar */}
        <aside className="lg:col-span-1 space-y-6">
          <div className="bg-white p-4 rounded-lg shadow">
            <label htmlFor="job-search" className="mb-2 block font-bold">Search jobs</label>
            <input
              id="job-search"
              type="search"
              value={filters.search}
              onChange={(event) => handleFilterChange("search", event.target.value)}
              placeholder="Title, company, or keyword"
              className="w-full rounded border p-2"
            />
          </div>

          <div className="bg-white p-4 rounded-lg shadow">
            <label htmlFor="job-location-search" className="mb-2 block font-bold">Search worldwide locations</label>
            <input
              id="job-location-search"
              type="search"
              list="job-location-options"
              value={filters.location}
              onChange={(event) => handleFilterChange("location", event.target.value)}
              placeholder="City, country, or region"
              className="w-full rounded border p-2"
            />
            <datalist id="job-location-options">
              {Array.from(new Set([
                "Africa",
                "Europe",
                "North America",
                "South America",
                "Asia",
                "Asia-Pacific",
                "Middle East",
                "Oceania",
                "Worldwide",
                ...locations.map((item) => item.country),
                ...locations.flatMap((item) => item.cities || []),
              ])).map((option) => <option key={option} value={option} />)}
            </datalist>
            <p className="mt-2 text-xs text-gray-500">Enter any country, city, or region—not only a suggestion.</p>
          </div>

          {/* Location Filter */}
          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="font-bold mb-3">📍 Location</h3>
            <select
              value={filters.country}
              onChange={(e) => handleFilterChange("country", e.target.value)}
              className="w-full p-2 border rounded mb-2"
            >
              <option value="">All locations</option>
              {locations.map((loc) => (
                <option key={loc.country} value={loc.country}>
                  {loc.country}
                </option>
              ))}
              <option value="Worldwide">Worldwide / Global Remote</option>
            </select>
            {filters.country && filters.country !== "Worldwide" && (
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

          <div className="bg-white p-4 rounded-lg shadow">
            <label htmlFor="remote-filter" className="mb-3 block font-bold">Work location</label>
            <select
              id="remote-filter"
              value={filters.workplaceType || (filters.isRemote === "true" ? "remote" : filters.isRemote === "false" ? "non-remote" : "")}
              onChange={(event) => handleFilterChange("workplaceType", event.target.value)}
              className="w-full rounded border p-2"
            >
              <option value="">All arrangements</option>
              <option value="remote">Remote</option>
              <option value="hybrid">Hybrid</option>
              <option value="on-site">On-site</option>
              {filters.isRemote === "false" && !filters.workplaceType && <option value="non-remote">Hybrid / on-site</option>}
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
            <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-800">
              <h3 className="font-bold">Jobs are temporarily unavailable</h3>
              <p className="mt-1 text-sm">{error}</p>
              <button
                type="button"
                onClick={() => {
                  setError("");
                  setLoading(true);
                  setRetryKey((key) => key + 1);
                }}
                className="mt-4 rounded-lg bg-terracotta px-4 py-2 font-semibold text-white hover:bg-terracotta-dark"
              >
                Try again
              </button>
            </div>
          ) : loading ? (
            <div role="status" aria-live="polite" className="flex items-center gap-3 rounded-2xl bg-white p-6 text-stone-700 shadow-sm">
              <span className="h-5 w-5 animate-spin rounded-full border-2 border-stone-300 border-t-terracotta" aria-hidden="true" />
              Loading opportunities…
            </div>
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
