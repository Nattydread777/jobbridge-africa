import { Link } from "react-router-dom";
import PageBreadcrumb from "../components/PageBreadcrumb";

const SDGImpact = () => {
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
                  JobBridge Africa is committed to advancing the United Nations Sustainable
                  Development Goal 8, promoting sustained, inclusive, and sustainable
                  economic growth, full and productive employment, and decent work for all.
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
                We ensure all job listings meet standards for fair employment, competitive
                compensation, and professional growth.
              </p>
              <ul className="ml-6 space-y-1 text-gray-600">
                <li>• Transparent salary ranges</li>
                <li>• Clear job requirements and responsibilities</li>
                <li>• Equal opportunity employer verification</li>
                <li>• Safe working conditions standards</li>
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
                <li>• Supporting 5,000+ African companies</li>
                <li>• Facilitating 10,000+ job placements annually</li>
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

          <h2 className="md:col-span-2 mt-8 mb-4 text-2xl font-bold">Impact metrics</h2>
          <div className="md:col-span-2 mb-4 grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-lg bg-gradient-to-br from-primary to-yellow-600 p-6 text-white">
              <div className="mb-2 text-4xl font-bold">50,000+</div>
              <p className="text-lg">Job seekers empowered</p>
            </div>
            <div className="rounded-lg bg-gradient-to-br from-secondary to-green-700 p-6 text-white">
              <div className="mb-2 text-4xl font-bold">5,000+</div>
              <p className="text-lg">Companies served</p>
            </div>
            <div className="rounded-lg bg-gradient-to-br from-accent to-red-700 p-6 text-white">
              <div className="mb-2 text-4xl font-bold">54</div>
              <p className="text-lg">Countries connected</p>
            </div>
            <div className="rounded-lg bg-gradient-to-br from-blue-500 to-blue-700 p-6 text-white">
              <div className="mb-2 text-4xl font-bold">10,000+</div>
              <p className="text-lg">Active job listings</p>
            </div>
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
            <h3 className="mb-2 text-lg font-bold">Join the movement</h3>
            <p className="mb-4 text-gray-700">
              Be part of Africa’s sustainable economic growth. Find decent work or help
              create opportunities for others.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link
                to="/jobs"
                className="inline-block rounded bg-primary px-6 py-3 text-white transition hover:bg-yellow-600"
              >
                Find jobs
              </Link>
              <Link
                to="/post-job"
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
