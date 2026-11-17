import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import PageBreadcrumb from "../components/PageBreadcrumb";

const Employers = () => {
  const { isAuthenticated, loading, user } = useAuth();
  const [showSignupModal, setShowSignupModal] = useState(false);
  const navigate = useNavigate();

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
