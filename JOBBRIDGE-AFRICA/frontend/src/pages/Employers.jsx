import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import PageBreadcrumb from "../components/PageBreadcrumb";
import api from "../services/api";

const Employers = () => {
  const { isAuthenticated, loading, user } = useAuth();
  const [showSignupModal, setShowSignupModal] = useState(false);
  const [featuredEmployers, setFeaturedEmployers] = useState([]);
  const [employerLoadError, setEmployerLoadError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    api.get("/jobs?limit=30")
      .then(({ data }) => {
        const seen = new Set();
        const employers = (data.jobs || [])
          .filter((job) => job.source === "employer" && job.companyName && !seen.has(job.companyName) && seen.add(job.companyName))
          .slice(0, 8)
          .map((job) => ({
            name: job.companyName,
            logo: job.companyLogoUrl || job.companyLogo || "",
          }));
        setFeaturedEmployers(employers);
      })
      .catch(() => setEmployerLoadError("Featured employer examples are temporarily unavailable."));
  }, []);

  const handlePostJob = () => {
    if (loading) return;
    if (isAuthenticated && user?.role === "employer") {
      navigate("/post-job");
      return;
    }
    setShowSignupModal(true);
  };

  return (
    <>
    <PageBreadcrumb />
    <main className="w-full px-4 pb-16 pt-8 sm:px-6 md:px-10 xl:px-14">
      <div className="mx-auto max-w-screen-2xl">
        <section className="grid gap-8 overflow-hidden rounded-3xl bg-charcoal p-7 text-white shadow-lg md:grid-cols-[1.2fr_0.8fr] md:p-12">
          <div className="self-center">
            <p className="mb-4 inline-flex rounded-full bg-amber-300/15 px-4 py-2 text-sm font-bold text-amber-300">
              Built for Africa’s growing workforce
            </p>
            <h1 className="text-4xl font-black tracking-tight md:text-5xl">
              Hire the talent building Africa’s future
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-relaxed text-stone-200">
              Reach skilled professionals across the continent with local-first
              job listings and relevant candidate matching.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handlePostJob}
                disabled={loading}
                className="rounded-xl bg-amber-400 px-5 py-3 font-bold text-charcoal transition hover:bg-amber-300"
              >
                {loading ? "Checking access..." : "Post a job"}
              </button>
              <Link
                to="/contact"
                className="rounded-xl border border-white/30 px-5 py-3 font-semibold text-white transition hover:bg-white/10"
              >
                Talk to our team
              </Link>
            </div>
          </div>
          <aside className="grid gap-4 sm:grid-cols-2 md:grid-cols-1">
            {[
              ["🌍", "Pan-African reach", "Connect with talent across African markets."],
              ["🎯", "Relevant matching", "Surface candidates aligned with role requirements."],
              ["📈", "Decent work impact", "Support productive employment and SDG 8."],
            ].map(([icon, title, description]) => (
              <article
                key={title}
                className="rounded-2xl border border-white/10 bg-white/5 p-5"
              >
                <span className="text-2xl" aria-hidden="true">{icon}</span>
                <h2 className="mt-2 font-bold text-amber-200">{title}</h2>
                <p className="mt-1 text-sm leading-relaxed text-stone-300">{description}</p>
              </article>
            ))}
          </aside>
        </section>

        <section className="mt-8 grid gap-6 md:grid-cols-2">
          <article className="rounded-2xl bg-white p-6 shadow-sm">
            <h2 className="text-2xl font-bold text-charcoal">Why post with JobBridge Africa?</h2>
            <ul className="mt-4 list-disc space-y-2 pl-6 leading-6 text-slate-700">
              <li>Reach job seekers searching across African markets and remote roles.</li>
              <li>Publish full responsibilities, requirements, salary information, and application steps.</li>
              <li>Choose applications through your dashboard or direct applicants to your official careers site.</li>
            </ul>
          </article>
          <article className="rounded-2xl bg-white p-6 shadow-sm">
            <h2 className="text-2xl font-bold text-charcoal">Employer verification and trust</h2>
            <p className="mt-3 leading-6 text-slate-700">Register with a company name and working business email. Before a role is promoted or a concern is resolved, our team may ask for your official website, business registration or other evidence, and confirmation that you can represent the organization. We do not currently issue a verified-employer badge; candidates should confirm offers through official company channels.</p>
            <Link to="/contact?subject=Employer%20verification" className="mt-4 inline-block font-semibold text-terracotta underline">Ask about verification</Link>
          </article>
          <article className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6">
            <h2 className="text-xl font-bold text-emerald-950">Posting costs and refunds</h2>
            <p className="mt-2 leading-6 text-emerald-950">Job posting is free during launch. We do not currently collect employer posting fees. Any future paid service will show its price, delivery, cancellation, and refund terms before payment; no payment is due unless those terms are accepted.</p>
            <Link to="/pricing" className="mt-3 inline-block font-semibold text-emerald-900 underline">See launch pricing</Link>
          </article>
          <article className="rounded-2xl bg-amber-50 p-6">
            <h2 className="text-xl font-bold text-charcoal">What happens next?</h2>
            <ol className="mt-3 list-decimal space-y-2 pl-6 leading-6 text-slate-700">
              <li>Create or sign in to an employer account.</li>
              <li>Submit a complete role, location, and application route.</li>
              <li>Review direct applications from your dashboard or receive applicants through your own site.</li>
            </ol>
            <button type="button" onClick={handlePostJob} disabled={loading} className="mt-4 rounded-lg bg-terracotta px-4 py-2 font-semibold text-white disabled:opacity-60">Start a job post</button>
          </article>
        </section>

        <section className="mt-8 rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="text-2xl font-bold text-charcoal">Employer logos in current listings</h2>
          {employerLoadError && <p role="status" className="mt-3 text-sm text-slate-600">{employerLoadError}</p>}
          {featuredEmployers.length > 0 ? (
            <ul className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {featuredEmployers.map(({ name, logo }) => (
                <li key={name} className="flex min-h-20 items-center gap-3 rounded-xl border border-slate-200 p-4">
                  {logo ? <img src={logo} alt={`${name} logo`} className="h-10 w-10 object-contain" /> : <span aria-hidden="true" className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 font-bold text-slate-700">{name[0]?.toUpperCase()}</span>}
                  <span className="font-semibold text-slate-800">{name}</span>
                </li>
              ))}
            </ul>
          ) : !employerLoadError ? <p className="mt-3 text-sm text-slate-600">Employer examples will appear here when direct job listings are available.</p> : null}
        </section>

        <section className="mt-8 rounded-2xl bg-slate-50 p-6">
          <h2 className="text-2xl font-bold text-charcoal">Employer FAQs</h2>
          <div className="mt-4 space-y-3">
            {[
              ["Are job posts reviewed?", "Listings may be reviewed for completeness, legitimacy concerns, and policy compliance. We may request additional information or decline a listing."],
              ["What information should a job include?", "Provide a clear title, company, location and remote eligibility, responsibilities, requirements, compensation where available, and application instructions."],
              ["Do you charge candidates?", "No. Job seekers are never charged by JobBridge Africa to apply. Do not request application fees from candidates."],
            ].map(([question, answer]) => <details key={question} className="rounded-xl border border-slate-200 bg-white p-4"><summary className="cursor-pointer font-semibold">{question}</summary><p className="mt-2 text-sm leading-6 text-slate-700">{answer}</p></details>)}
          </div>
        </section>
      </div>
    </main>
    {showSignupModal && (
      <div
        className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/60 p-4"
        onMouseDown={(event) => {
          if (event.target === event.currentTarget) setShowSignupModal(false);
        }}
      >
        <section
          role="dialog"
          aria-modal="true"
          aria-labelledby="employer-signup-title"
          className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl sm:p-8"
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-bold uppercase tracking-wide text-terracotta">Employer access</p>
              <h2 id="employer-signup-title" className="mt-2 text-2xl font-black text-charcoal">
                {isAuthenticated ? "Employer account required" : "Ready to hire?"}
              </h2>
            </div>
            <button
              type="button"
              onClick={() => setShowSignupModal(false)}
              aria-label="Close employer sign-up dialog"
              className="rounded-lg px-3 py-1 text-2xl text-slate-500 hover:bg-slate-100"
            >
              ×
            </button>
          </div>
          <p className="mt-3 leading-relaxed text-slate-600">
            {isAuthenticated
              ? "Job posting is available to employer accounts. Contact our team if you need help setting up your organization."
              : "Create a free employer account to post a role and connect with African talent."}
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            {!isAuthenticated && (
              <Link
                to="/register?role=employer"
                onClick={() => setShowSignupModal(false)}
                className="rounded-xl bg-terracotta px-5 py-3 text-center font-bold text-white hover:bg-terracotta-dark"
              >
                Sign up as an employer
              </Link>
            )}
            {isAuthenticated ? (
              <Link to="/contact" onClick={() => setShowSignupModal(false)} className="rounded-xl bg-terracotta px-5 py-3 text-center font-bold text-white hover:bg-terracotta-dark">
                Contact support
              </Link>
            ) : (
              <Link to="/login" onClick={() => setShowSignupModal(false)} className="rounded-xl border border-slate-300 px-5 py-3 text-center font-semibold text-slate-700 hover:bg-slate-50">
                I already have an account
              </Link>
            )}
          </div>
        </section>
      </div>
    )}
  </>
  );
};

export default Employers;
