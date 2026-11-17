import PageBreadcrumb from "../components/PageBreadcrumb";

const About = () => {
  return (
    <main className="w-full px-4 pb-16 text-slate-800 sm:px-6 md:px-10 xl:px-14">
      <PageBreadcrumb />

      <div className="mx-auto max-w-screen-2xl">
        <header className="mb-10">
          <p className="mb-4 inline-flex rounded-full bg-amber-100 px-4 py-2 text-sm font-bold text-terracotta-dark">
            African-led · Opportunity-focused · SDG 8 aligned
          </p>
          <h1 className="mb-3 text-4xl font-extrabold tracking-tight text-charcoal md:text-6xl">
            About JobBridge Africa
          </h1>
          <p className="text-lg text-slate-600 md:text-xl">
            Empowering Africa’s workforce • Advancing decent work for all
          </p>
        </header>

        <section className="mb-10 grid gap-8 rounded-3xl bg-charcoal p-7 text-white shadow-lg md:grid-cols-[1.4fr_0.6fr] md:p-10">
          <p className="self-center text-lg leading-relaxed text-stone-200">
            JobBridge Africa is a Pan-African initiative inspired by the Power Learn
            Project (PLP) Africa. Built on a strong foundation in MERN full-stack
            development and digital innovation, we connect talent directly with employers,
            skills programs, and opportunity pipelines across the continent.
          </p>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <h2 className="mb-3 text-xl font-bold text-amber-300 md:text-2xl">
              Our mission
            </h2>
            <p className="leading-relaxed text-stone-200">
              We empower Africa’s workforce through AI-driven job matching and career
              enablement, aligning with the United Nations Sustainable Development Goal 8
              (SDG 8): promoting sustained, inclusive economic growth, productive
              employment, and decent work for all.
            </p>
          </div>
        </section>

        <section className="mb-10 grid gap-8 rounded-3xl bg-white p-7 shadow-sm md:grid-cols-2 md:p-10">
          <div>
            <h2 className="mb-3 text-xl font-bold md:text-2xl">Our story</h2>
            <p className="mb-3 text-slate-700">
              JobBridge Africa began as a passion project during PLP training and has grown
              into a platform designed to address one of Africa’s most urgent challenges:
              youth unemployment.
            </p>
            <p className="text-slate-700">
              By combining collaboration, innovation, and technology, we bridge the gap
              between job seekers, employers, and career development opportunities across
              Africa.
            </p>
          </div>

          <aside className="flex flex-col justify-center rounded-2xl bg-amber-50 p-7">
            <span className="text-4xl" aria-hidden="true">
              🤝
            </span>
            <h3 className="mt-3 text-xl font-bold text-charcoal">
              Local opportunity, global reach
            </h3>
            <p className="mt-2 leading-relaxed text-slate-600">
              African employers and direct local roles remain central to the platform;
              partner feeds broaden access to carefully selected remote work.
            </p>
          </aside>
        </section>

        <section className="mb-10">
          <h2 className="mb-3 text-xl font-bold md:text-2xl">What we do</h2>
          <ul className="list-disc space-y-2 pl-5 text-slate-700">
            <li>
              <span className="font-medium text-slate-900">AI job matching:</span> Connects
              candidates to relevant roles across African markets.
            </li>
            <li>
              <span className="font-medium text-slate-900">Employer solutions:</span> Streamlined
              posting and talent discovery for organizations.
            </li>
            <li>
              <span className="font-medium text-slate-900">Career resources:</span> Practical
              tools and guidance to build employability.
            </li>
            <li>
              <span className="font-medium text-slate-900">Community:</span> A growing network of
              partners, mentors, and advocates for inclusive growth.
            </li>
          </ul>
        </section>

        <section className="mb-16">
          <h2 className="mb-10 text-center text-3xl font-extrabold tracking-tight text-primary md:text-4xl">
            Meet our team
          </h2>

          <div className="grid grid-cols-1 gap-6 rounded-3xl bg-white/60 p-4 shadow md:grid-cols-2 xl:grid-cols-4">
            <div className="flex flex-col items-center rounded-2xl bg-white p-8 text-center shadow-lg transition hover:shadow-xl">
              <div className="mb-4 h-28 w-28 overflow-hidden rounded-full bg-gradient-to-br from-primary to-orange-400">
                <img src="/team/nathaniel.jpg" alt="Nathaniel Usikpedo" className="h-full w-full object-cover" />
              </div>
              <h3 className="mb-1 text-lg font-bold text-gray-900">Nathaniel Usikpedo</h3>
              <p className="mb-2 font-medium text-primary">Founder, Project Manager & Software Developer</p>
              <p className="text-sm text-gray-600">
                Certified MERN full-stack developer and SDG 8 advocate, leading the
                strategic and technical direction of JobBridge Africa.
              </p>
            </div>

            <div className="flex flex-col items-center rounded-2xl bg-white p-8 text-center shadow-lg transition hover:shadow-xl">
              <div className="mb-4 h-28 w-28 overflow-hidden rounded-full bg-gradient-to-br from-primary to-orange-400">
                <img src="/team/oghogho.jpg" alt="Barr. Nathaniel-Usikpedo Oghogho" className="h-full w-full object-cover" />
              </div>
              <h3 className="mb-1 text-lg font-bold text-gray-900">Barr. Nathaniel-Usikpedo Oghogho</h3>
              <p className="mb-2 font-medium text-primary">Legal Adviser</p>
              <p className="text-sm text-gray-600">
                Ensures transparent operations, ethical compliance, and data protection
                best practices.
              </p>
            </div>

            <div className="flex flex-col items-center rounded-2xl bg-white p-8 text-center shadow-lg transition hover:shadow-xl">
              <div className="mb-4 h-28 w-28 overflow-hidden rounded-full bg-gradient-to-br from-primary to-orange-400">
                <img src="/team/dedan.jpg" alt="Dedan Okware" className="h-full w-full object-cover" />
              </div>
              <h3 className="mb-1 text-lg font-bold text-gray-900">Dedan Okware</h3>
              <p className="mb-2 font-medium text-primary">
                Module Lead, MERN Stack Specialization, PLP
              </p>
              <p className="text-sm text-gray-600">
                Mentor and early contributor guiding software architecture and development
                best practices.
              </p>
            </div>

            <div className="flex flex-col items-center rounded-2xl bg-white p-8 text-center shadow-lg transition hover:shadow-xl">
              <div className="mb-4 h-28 w-28 overflow-hidden rounded-full bg-gradient-to-br from-primary to-orange-400">
                <img src="/team/obesa.jpg" alt="Obesa Victory" className="h-full w-full object-cover" />
              </div>
              <h3 className="mb-1 text-lg font-bold text-gray-900">Obesa Victory</h3>
              <p className="mb-2 font-medium text-primary">Database Administrator</p>
              <p className="text-sm text-gray-600">
                Professional database administrator and early contributor to JobBridge
                Africa’s data infrastructure.
              </p>
            </div>
          </div>

          <div className="mt-10">
            <h3 className="mb-5 text-center text-2xl font-extrabold text-charcoal">Our educational and cooperative partners</h3>
            <div className="grid gap-5 md:grid-cols-2">
              <article className="rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50 text-3xl" aria-hidden="true">🎓</div>
                <h4 className="text-lg font-bold text-charcoal">Power Learn Project (PLP) Africa</h4>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">
                  An educational inspiration and skills-development partner whose work to expand technology skills for African youth informs our mission.
                </p>
              </article>
              <article className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-center shadow-sm">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-white text-3xl" aria-hidden="true">🤝</div>
                <h4 className="text-lg font-bold text-charcoal">Royal Merchant MPCS</h4>
                <p className="mt-2 text-sm leading-relaxed text-slate-700">
                  A cooperative partner supporting pathways to micro-loans and short-course upskilling. Eligibility, availability, and terms are set by the partner.
                </p>
              </article>
            </div>
          </div>
        </section>

        <section className="mb-10">
          <h2 className="mb-3 text-xl font-bold md:text-2xl">Our commitment</h2>
          <p className="text-slate-700">
            We believe technology can close the opportunity gap. We are committed to
            leveraging AI, data, and human-centered design to help every young person
            across Africa access meaningful work and sustainable livelihoods.
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-xl font-bold md:text-2xl">Learn more</h2>
          <ul className="space-y-2 text-slate-700">
            <li>
              <a className="text-blue-600 hover:underline" href="https://jobbridgeafrica.com" target="_blank" rel="noreferrer">
                jobbridgeafrica.com
              </a>
            </li>
            <li>
              <a className="text-blue-600 hover:underline" href="mailto:info@jobbridgeafrica.com">
                info@jobbridgeafrica.com
              </a>
            </li>
            <li>Follow us: LinkedIn, X, Instagram, Facebook</li>
          </ul>
        </section>
      </div>
    </main>
  );
};

export default About;
