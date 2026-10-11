import { Link } from "react-router-dom";
import PageBreadcrumb from "../components/PageBreadcrumb";

const Employers = () => (
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
              <Link
                to="/post-job"
                className="rounded-xl bg-amber-400 px-5 py-3 font-bold text-charcoal transition hover:bg-amber-300"
              >
                Post a job
              </Link>
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
  </>
);

export default Employers;
