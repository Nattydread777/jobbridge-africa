import PageBreadcrumb from "../components/PageBreadcrumb";

const Cookies = () => (
  <main className="mx-auto max-w-4xl px-4 py-10 text-slate-800 sm:px-6">
    <PageBreadcrumb />
    <article className="rounded-3xl bg-white p-7 shadow-sm md:p-10">
      <p className="text-sm font-bold uppercase tracking-wide text-terracotta">Your choices</p>
      <h1 className="mt-2 text-4xl font-black text-charcoal">Cookie Notice</h1>
      <p className="mt-3 text-sm text-slate-500">Last updated: 19 November 2026</p>
      <div className="mt-8 space-y-6 leading-7 text-slate-700">
        <section>
          <h2 className="text-xl font-bold text-slate-900">What we use</h2>
          <p className="mt-2">JobBridge Africa uses essential browser storage and cookies to support account sessions, security, and your saved cookie preference. The application does not currently run analytics or advertising cookies.</p>
        </section>
        <section>
          <h2 className="text-xl font-bold text-slate-900">Your controls</h2>
          <p className="mt-2">Essential storage is needed for the service and cannot be disabled in the banner. You can choose whether optional analytics or marketing cookies may be used if those features are introduced. They are off unless you opt in, and changing a preference does not enable any tracking that is not actually active.</p>
          <button
            type="button"
            onClick={() => window.dispatchEvent(new Event("cookie-preferences-open"))}
            className="mt-4 rounded-lg bg-terracotta px-5 py-3 font-semibold text-white hover:bg-terracotta-dark"
          >
            Manage cookie preferences
          </button>
        </section>
        <section>
          <h2 className="text-xl font-bold text-slate-900">Browser controls and contact</h2>
          <p className="mt-2">You can also clear or block cookies in your browser settings. Blocking essential cookies may prevent sign-in or other account features from working. For questions, email <a className="font-semibold text-terracotta underline" href="mailto:info@jobbridgeafrica.com">info@jobbridgeafrica.com</a>.</p>
        </section>
      </div>
    </article>
  </main>
);

export default Cookies;
