import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../services/api";

const RecommendedRoles = () => {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadMatches = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const { data } = await api.get("/ai/match");
      setMatches(Array.isArray(data) ? data.slice(0, 5) : []);
    } catch (requestError) {
      setError(requestError.response?.data?.message || "We couldn't load profile-matched roles.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadMatches();
  }, [loadMatches]);

  return (
    <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm" aria-labelledby="recommended-roles-heading">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-bold uppercase tracking-wider text-amber-700">Profile-powered matching</p>
          <h2 id="recommended-roles-heading" className="mt-1 text-2xl font-bold text-slate-950">Roles that fit your profile</h2>
          <p className="mt-1 text-sm text-slate-600">Ranked using your skills, experience, target roles, preferences, and role eligibility.</p>
        </div>
        <Link to="/profile" className="text-sm font-semibold text-amber-800 hover:underline">Update my profile</Link>
      </div>

      {loading && <p className="mt-5 text-sm text-slate-600" role="status">Finding roles that fit your profile…</p>}
      {error && (
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800" role="alert">
          <span>{error}</span>
          <button type="button" onClick={loadMatches} className="font-semibold underline">Try again</button>
        </div>
      )}
      {!loading && !error && matches.length === 0 && (
        <div className="mt-5 rounded-lg bg-slate-50 p-4 text-sm text-slate-700">
          <p>No suitable active matches yet. Add target roles, skills, or experience to improve your recommendations. We’ll keep your profile private.</p>
          <Link to="/profile" className="mt-2 inline-block font-semibold text-amber-800 hover:underline">Add profile details</Link>
        </div>
      )}
      {!loading && !error && matches.length > 0 && (
        <ul className="mt-5 grid gap-3 md:grid-cols-2">
          {matches.map(({ job, score }) => (
            <li key={job._id} className="rounded-xl border border-slate-200 p-4 transition hover:border-amber-300 hover:shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <Link to={`/jobs/${job._id}`} className="font-bold text-slate-900 hover:text-amber-800 hover:underline">{job.title}</Link>
                  <p className="mt-1 text-sm text-slate-600">{job.companyName || "Company not listed"} · {job.location || "Location not specified"}</p>
                </div>
                <span className="shrink-0 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-800">{Math.round(score * 100)}% fit</span>
              </div>
              <p className="mt-3 text-xs text-slate-500">{job.workplaceType || (job.isRemote ? "Remote" : "Work mode not specified")} · {job.jobType || "Type not specified"}</p>
            </li>
          ))}
        </ul>
      )}
      <Link to="/ai-matching" className="mt-5 inline-block text-sm font-semibold text-amber-800 hover:underline">Explore all matching tools →</Link>
    </section>
  );
};

export default RecommendedRoles;
