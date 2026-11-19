import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import PageBreadcrumb from "../components/PageBreadcrumb";
import api from "../services/api";

const SDGImpact = () => {
  const [metrics, setMetrics] = useState(null);
  const [metricsError, setMetricsError] = useState("");

  useEffect(() => {
    api.get("/impact")
      .then(({ data }) => setMetrics(data))
      .catch(() => setMetricsError("Live metrics are temporarily unavailable."));
  }, []);

  return (
    <main className="w-full px-4 pb-16 text-slate-800 sm:px-6 md:px-10 xl:px-14">
      <PageBreadcrumb />

      <div className="mx-auto max-w-screen-2xl py-8">
        <div className="grid gap-8 rounded-3xl bg-white p-6 shadow-md md:grid-cols-2 md:p-10">
          <div className="grid gap-8 md:col-span-2 md:grid-cols-[1.3fr_0.7fr] md:rounded-3xl md:bg-charcoal md:p-10">
            <div>
              <h1 className="mb-6 text-4xl font-bold text-white">
                SDG 8: Decent Work & Economic Growth
              </h1>

              <div className="prose max-w-none">
                <p className="mb-6 text-lg text-slate-200">
                    JobBridge Africa supports the aims of United Nations Sustainable Development Goal 8 by helping users discover work opportunities and career resources. We are an independent platform and are not affiliated with or endorsed by the United Nations.
                </p>
              </div>
            </div>

            <aside className="flex flex-col justify-center rounded-2xl border border-white/10 bg-white/5 p-6">
              <span className="text-5xl" aria-hidden="true">
                🌍
              </span>
              <h2 className="mt-4 text-2xl font-bold text-amber-300">
                A continent-wide mission
              </h2>
              <p className="mt-3 leading-relaxed text-stone-200">
                Reducing youth unemployment and skills mismatch by connecting African talent to
                decent local work and accessible global opportunities.
              </p>
            </aside>
          </div>

          <div className="md:col-span-2 mb-2 rounded-r-2xl border-l-4 border-blue-500 bg-blue-50 p-6">
            <h2 className="mb-2 text-xl font-bold">SDG 8 target</h2>
            <p className="text-gray-700">
              “Promote sustained, inclusive and sustainable economic growth, full and
              productive employment and decent work for all.”
            </p>
          </div>

          <h2 className="md:col-span-2 mt-8 mb-4 text-2xl font-bold">Our contribution</h2>

          <div className="md:col-span-2 mb-4 grid gap-6 md:grid-cols-2">
            <div className="rounded-lg border p-6">
              <h3 className="mb-3 flex items-center gap-2 text-lg font-bold">
                <span className="text-2xl">👔</span> Decent work opportunities
              </h3>
              <p className="mb-3 text-gray-700">
                JobBridge Africa aims to make job information easier to discover and compare. Listings are supplied by employers and external sources, so candidates should review the original terms and report inaccurate or unsafe postings.
              </p>
              <ul className="ml-6 space-y-1 text-gray-600">
                <li>• Transparent salary ranges</li>
                <li>• Clear job requirements and responsibilities</li>
                <li>• A report option for job listings</li>
                <li>• Clear source and application information where available</li>
              </ul>
            </div>

            <div className="rounded-lg border p-6">
              <h3 className="mb-3 flex items-center gap-2 text-lg font-bold">
                <span className="text-2xl">📈</span> Economic growth
              </h3>
              <p className="mb-3 text-gray-700">
                By connecting talent with opportunities, we fuel Africa’s economic
                development and productivity.
              </p>
              <ul className="ml-6 space-y-1 text-gray-600">
                <li>• Publishing active job opportunities from direct employers and external feeds</li>
                <li>• Connecting users to employer application channels</li>
                <li>• Enabling cross-border employment</li>
                <li>• Promoting skills development</li>
              </ul>
            </div>

            <div className="rounded-lg border p-6">
              <h3 className="mb-3 flex items-center gap-2 text-lg font-bold">
                <span className="text-2xl">🌍</span> Inclusive employment
              </h3>
              <p className="mb-3 text-gray-700">
                We prioritize accessibility and equal opportunities for all African job
                seekers.
              </p>
              <ul className="ml-6 space-y-1 text-gray-600">
                <li>• Gender equality in job recommendations</li>
                <li>• Youth employment programs</li>
                <li>• Support for persons with disabilities</li>
                <li>• Rural and urban connectivity</li>
              </ul>
            </div>

            <div className="rounded-lg border p-6">
              <h3 className="mb-3 flex items-center gap-2 text-lg font-bold">
                <span className="text-2xl">💼</span> Skills development
              </h3>
              <p className="mb-3 text-gray-700">
                Empowering job seekers with resources and guidance for career advancement.
              </p>
              <ul className="ml-6 space-y-1 text-gray-600">
                <li>• Profile optimization tools</li>
                <li>• Career guidance resources</li>
                <li>• Industry insights and trends</li>
                <li>• Professional networking opportunities</li>
              </ul>
            </div>
          </div>

          <h2 className="md:col-span-2 mt-8 mb-1 text-2xl font-bold">Platform metrics</h2>
          <p className="md:col-span-2 text-sm text-gray-600">
            {metrics?.asOf ? `Snapshot as of ${new Date(metrics.asOf).toLocaleDateString()}.` : metricsError || "Loading current platform counts…"}
          </p>
          <div className="md:col-span-2 mb-4 grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
            {[
              ["Jobs listed", metrics?.jobsListed],
              ["Job-seeker profiles", metrics?.candidates],
              ["Countries represented", metrics?.countries],
              ["Placements", metrics ? "Not tracked" : null],
            ].map(([label, value]) => (
              <div key={label} className="rounded-lg bg-gradient-to-br from-primary to-yellow-600 p-6 text-white">
                <div className="mb-2 text-4xl font-bold">{typeof value === "number" ? value.toLocaleString() : value || "—"}</div>
                <p className="text-lg">{label}</p>
              </div>
            ))}
          </div>
          <div className="md:col-span-2 mb-4 rounded-xl border border-slate-200 bg-slate-50 p-5 text-sm leading-6 text-slate-700">
            <h3 className="font-bold text-slate-900">Counting methodology</h3>
            <p className="mt-2">Jobs are active, non-expired records currently in our database. Candidate and country counts come from job-seeker profiles with no explicit unverified status; a country is counted from the profile’s country field. Placements are not currently recorded, so no placement total is claimed.</p>
            <a href="/funder-one-pager.txt" download className="mt-3 inline-flex font-semibold text-terracotta underline">Download the funder one-pager</a>
          </div>

          <h2 className="md:col-span-2 mt-8 mb-4 text-2xl font-bold">
            Alignment with SDG targets
          </h2>

          <div className="md:col-span-2 mb-8 grid gap-4 md:grid-cols-2">
            <div className="flex items-start gap-3">
              <span className="text-xl font-bold text-secondary">8.3</span>
              <p className="text-gray-700">
                Promote development-oriented policies that support productive activities,
                decent job creation, entrepreneurship, creativity and innovation.
              </p>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-xl font-bold text-secondary">8.5</span>
              <p className="text-gray-700">
                Achieve full and productive employment and decent work for all women and men,
                including for young people and persons with disabilities.
              </p>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-xl font-bold text-secondary">8.6</span>
              <p className="text-gray-700">
                Substantially reduce the proportion of youth not in employment, education or
                training.
              </p>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-xl font-bold text-secondary">8.8</span>
              <p className="text-gray-700">
                Protect labour rights and promote safe and secure working environments for all
                workers.
              </p>
            </div>
          </div>

          <div className="md:col-span-2 mt-2 rounded-r-2xl border-l-4 border-accent bg-gray-50 p-6">
            <h3 className="mb-2 text-lg font-bold">United Nations SDG 8 attribution</h3>
            <p className="mb-4 text-gray-700">
              “Decent Work and Economic Growth” is the official title of UN Sustainable Development Goal 8. JobBridge Africa references the goal to describe its mission; no UN logo is used and this page does not imply UN endorsement.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link
                to="/jobs"
                className="inline-block rounded bg-primary px-6 py-3 text-white transition hover:bg-yellow-600"
              >
                Find jobs
              </Link>
              <Link
                to="/employers"
                className="inline-block rounded bg-secondary px-6 py-3 text-white transition hover:bg-green-700"
              >
                Post jobs
              </Link>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
};

export default SDGImpact;
