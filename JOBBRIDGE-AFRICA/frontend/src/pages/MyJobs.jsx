import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";
import { getJobPath } from "../utils/jobUrl";

const STAGES = [
  { value: "applied", label: "Applied" },
  { value: "interviewing", label: "Interviewing" },
  { value: "in_review", label: "Saved / In Review" },
  { value: "offer", label: "Offer" },
  { value: "rejected", label: "Rejected" },
];
const STAGE_LABELS = Object.fromEntries(STAGES.map(({ value, label }) => [value, label]));
const FEED_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

const getListingState = (job) => {
  if (!job) return "Listing unavailable";
  if (job.expiryDate && new Date(job.expiryDate).getTime() <= Date.now()) return "Expired";
  if (job.isActive === false || job.isApproved === false
    || ["closed", "expired", "inactive", "draft", "rejected", "filled", "archived", "paused"]
      .includes(String(job.status || "").toLowerCase())) {
    return "Closed or inactive";
  }
  if (job.source && job.source !== "employer") {
    const lastSeen = job.lastSeenAt || job.pubDate || job.createdAt;
    if (!lastSeen || Date.now() - new Date(lastSeen).getTime() > FEED_MAX_AGE_MS) {
      return "Stale source listing";
    }
  }
  return "";
};

const formatDate = (date) => {
  if (!date) return "Date unavailable";
  const parsed = new Date(date);
  return Number.isNaN(parsed.getTime()) ? "Date unavailable" : parsed.toLocaleDateString();
};

const MyJobs = () => {
  const { user, loading: authLoading } = useAuth();
  const [appliedJobs, setAppliedJobs] = useState([]);
  const [externalApplications, setExternalApplications] = useState([]);
  const [dataOwnerId, setDataOwnerId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("all");
  const [drafts, setDrafts] = useState({});
  const [saving, setSaving] = useState({});
  const [trackerErrors, setTrackerErrors] = useState({});

  const fetchApplications = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError("");
    try {
      const [applicationsResponse, externalResponse] = await Promise.all([
        api.get("/applications/my-applications"),
        api.get("/applications/my-external-applications"),
      ]);
      if (!Array.isArray(applicationsResponse.data) || !Array.isArray(externalResponse.data)) {
        throw new Error("The applications response was not in the expected format.");
      }
      setAppliedJobs(applicationsResponse.data);
      setExternalApplications(externalResponse.data);
      setDataOwnerId(user._id);
      setDrafts(Object.fromEntries([
        ...applicationsResponse.data.map((application) => [
          `direct:${application._id}`,
          {
            candidateStage: application.candidateStage || "applied",
            candidateNotes: application.candidateNotes || "",
          },
        ]),
        ...externalResponse.data.map((application) => [
          `external:${application._id}`,
          {
            candidateStage: application.candidateStage || "applied",
            candidateNotes: application.candidateNotes || "",
          },
        ]),
      ]));
    } catch (fetchError) {
      console.error("Error fetching applications:", fetchError);
      setError(
        fetchError.response?.data?.message
          || fetchError.message
          || "Failed to load your applications.",
      );
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!authLoading && user) fetchApplications();
    else if (!authLoading) {
      setLoading(false);
      setAppliedJobs([]);
      setExternalApplications([]);
      setDataOwnerId(null);
      setDrafts({});
    }
  }, [authLoading, user, fetchApplications]);

  const records = useMemo(() => {
    if (!user || dataOwnerId !== user._id) return [];
    return [
      ...appliedJobs.map((application) => ({
        id: `direct:${application._id}`,
        kind: "direct",
        application,
        job: application.job,
      })),
      ...externalApplications.map((application) => ({
        id: `external:${application._id}`,
        kind: "external",
        application,
        job: application.job,
      })),
    ].sort((a, b) => new Date(b.application.appliedAt || b.application.createdAt || 0)
      - new Date(a.application.appliedAt || a.application.createdAt || 0));
  }, [appliedJobs, dataOwnerId, externalApplications, user]);

  const stageFor = (record) => drafts[record.id]?.candidateStage
    || record.application.candidateStage
    || "applied";
  const counts = {
    applied: records.filter((record) => stageFor(record) === "applied").length,
    interviewing: records.filter((record) => stageFor(record) === "interviewing").length,
    in_review: records.filter((record) => stageFor(record) === "in_review").length,
    outcome: records.filter((record) => ["offer", "rejected"].includes(stageFor(record))).length,
  };
  const filteredRecords = records.filter((record) => (
    filter === "all" || (filter === "outcome"
      ? ["offer", "rejected"].includes(stageFor(record))
      : stageFor(record) === filter)
  ));

  const updateDraft = (id, field, value) => {
    setDrafts((current) => ({
      ...current,
      [id]: { ...current[id], [field]: value },
    }));
    setTrackerErrors((current) => ({ ...current, [id]: "" }));
  };

  const saveTracker = async (record) => {
    const draft = drafts[record.id] || {};
    setSaving((current) => ({ ...current, [record.id]: true }));
    setTrackerErrors((current) => ({ ...current, [record.id]: "" }));
    try {
      const endpoint = record.kind === "external"
        ? `/applications/external/${record.application._id}/tracker`
        : `/applications/${record.application._id}/tracker`;
      const { data } = await api.patch(endpoint, {
        candidateStage: draft.candidateStage || record.application.candidateStage || "applied",
        candidateNotes: draft.candidateNotes || "",
      });
      const updated = data.application;
      if (record.kind === "external") {
        setExternalApplications((current) => current.map((item) => (
          item._id === updated._id ? { ...item, ...updated, job: item.job } : item
        )));
      } else {
        setAppliedJobs((current) => current.map((item) => (
          item._id === updated._id ? { ...item, ...updated, job: item.job } : item
        )));
      }
      setDrafts((current) => ({
        ...current,
        [record.id]: {
          candidateStage: updated.candidateStage || "applied",
          candidateNotes: updated.candidateNotes || "",
        },
      }));
    } catch (saveError) {
      setTrackerErrors((current) => ({
        ...current,
        [record.id]: saveError.response?.data?.message || "Could not update this tracker entry. Please retry.",
      }));
    } finally {
      setSaving((current) => ({ ...current, [record.id]: false }));
    }
  };

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-8">
      <header className="mb-6">
        <Link to="/profile-view" className="mb-4 inline-flex items-center gap-2 text-primary hover:underline">
          ← Back to Dashboard
        </Link>
        <h1 className="text-3xl font-bold">My Jobs</h1>
        <p className="mt-2 text-gray-600">Track applications, update your personal stage, and keep notes in one place.</p>
      </header>

      {authLoading && (
        <section role="status" className="rounded-lg bg-white p-8 text-center shadow">
          <p className="text-gray-600">Checking your sign-in status…</p>
        </section>
      )}

      {!authLoading && !user && (
        <section className="rounded-lg bg-white p-8 text-center shadow">
          <h2 className="text-xl font-semibold">Sign in to view your application tracker</h2>
          <p className="mt-2 text-gray-600">You can continue browsing jobs without an account.</p>
          <Link to="/login" className="mt-4 inline-block text-primary hover:underline">Go to Login</Link>
        </section>
      )}

      {!authLoading && user && (
        <>
          <section aria-label="Application stage counts" className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
            {[
              ["applied", "Applied", counts.applied],
              ["interviewing", "Interviewing", counts.interviewing],
              ["in_review", "Saved / In Review", counts.in_review],
              ["outcome", "Offer / Rejected", counts.outcome],
            ].map(([value, label, count]) => (
              <button
                key={value}
                type="button"
                onClick={() => setFilter(filter === value ? "all" : value)}
                aria-pressed={filter === value}
                className={`rounded-xl border p-4 text-left shadow-sm transition ${
                  filter === value ? "border-primary bg-amber-50" : "border-slate-200 bg-white hover:border-primary"
                }`}
              >
                <span className="block text-sm font-medium text-slate-600">{label}</span>
                <span className="mt-1 block text-2xl font-bold text-slate-900">{count}</span>
              </button>
            ))}
          </section>

          {error && (
            <section role="alert" className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-800">
              <p>{error}</p>
              <button type="button" onClick={fetchApplications} disabled={loading} className="font-semibold underline disabled:opacity-60">
                {loading ? "Retrying…" : "Retry"}
              </button>
            </section>
          )}

          {loading && records.length === 0 && (
            <section role="status" className="rounded-lg bg-white p-8 text-center shadow">
              <p className="text-gray-600">Loading your applications and tracked jobs…</p>
            </section>
          )}
          {loading && records.length > 0 && (
            <p role="status" className="mb-4 text-sm text-slate-600">Refreshing your application tracker…</p>
          )}

          {!loading && !error && records.length === 0 && (
            <section className="rounded-lg bg-white py-12 text-center shadow">
              <p className="mb-4 text-gray-600">You haven’t tracked or applied to any jobs yet.</p>
              <Link to="/jobs" className="text-primary hover:underline">Browse Jobs</Link>
            </section>
          )}

          {!loading && records.length > 0 && filteredRecords.length === 0 && (
            <section className="rounded-lg bg-white py-10 text-center shadow">
              <p className="text-gray-600">There are no applications in this stage.</p>
              <button type="button" onClick={() => setFilter("all")} className="mt-3 text-primary underline">Show all applications</button>
            </section>
          )}

          <section aria-label="Tracked applications" className="space-y-4">
            {filteredRecords.map((record) => {
              const { application, job } = record;
              const draft = drafts[record.id] || {};
              const listingState = getListingState(job);
              const title = job?.title || application.jobTitle || "Job listing";
              const company = job?.companyName || application.companyName || "Company unavailable";
              const location = job?.location || application.location;
              return (
                <article key={record.id} className="rounded-xl bg-white p-5 shadow">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h2 className="text-xl font-bold text-slate-900">{title}</h2>
                      <p className="mt-1 text-slate-700">{company}</p>
                      {location && <p className="mt-1 text-sm text-slate-500">{location}</p>}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <span className="rounded-full bg-sky-100 px-3 py-1 text-sm font-semibold text-sky-900">
                        {STAGE_LABELS[stageFor(record)] || "Applied"}
                      </span>
                      {record.kind === "direct" && application.status && (
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-700">
                          Employer update: {application.status}
                        </span>
                      )}
                      {listingState && (
                        <span className="rounded-full bg-rose-100 px-3 py-1 text-sm font-semibold text-rose-900">
                          {listingState}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-sm text-slate-600">
                    <p>{record.kind === "external" ? "Tracked" : "Applied"}: {formatDate(application.appliedAt || application.createdAt)}</p>
                    {job?._id && (
                      <Link to={getJobPath(job)} className="text-primary hover:underline">View listing details</Link>
                    )}
                  </div>

                  {record.kind === "external" && application.applicationLink && (
                    <a href={application.applicationLink} target="_blank" rel="noopener noreferrer" className="mt-3 inline-block text-sm font-semibold text-primary underline">
                      Open official application listing ↗
                    </a>
                  )}
                  {record.kind === "direct" && application.resumeUrl && (
                    <a href={application.resumeUrl} target="_blank" rel="noopener noreferrer" className="mt-3 inline-block text-sm font-semibold text-primary underline">
                      View attached resume
                    </a>
                  )}

                  <div className="mt-5 grid gap-4 border-t pt-4 md:grid-cols-[minmax(12rem,0.7fr)_minmax(16rem,1.3fr)]">
                    <label className="text-sm font-semibold text-slate-700">
                      Your stage
                      <select
                        value={draft.candidateStage || "applied"}
                        onChange={(event) => updateDraft(record.id, "candidateStage", event.target.value)}
                        className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2"
                      >
                        {STAGES.map((stage) => <option key={stage.value} value={stage.value}>{stage.label}</option>)}
                      </select>
                    </label>
                    <label className="text-sm font-semibold text-slate-700">
                      Private notes
                      <textarea
                        value={draft.candidateNotes || ""}
                        onChange={(event) => updateDraft(record.id, "candidateNotes", event.target.value)}
                        maxLength={2000}
                        rows={3}
                        className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 font-normal"
                        placeholder="Add interview details, follow-up reminders, or other notes."
                      />
                    </label>
                    <div className="md:col-start-2">
                      {trackerErrors[record.id] && <p role="alert" className="mb-2 text-sm text-red-700">{trackerErrors[record.id]}</p>}
                      <button
                        type="button"
                        onClick={() => saveTracker(record)}
                        disabled={saving[record.id]}
                        className="rounded-lg bg-primary px-4 py-2 font-semibold text-white disabled:opacity-60"
                      >
                        {saving[record.id] ? "Saving…" : "Save stage and notes"}
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </section>
        </>
      )}
    </main>
  );
};

export default MyJobs;
