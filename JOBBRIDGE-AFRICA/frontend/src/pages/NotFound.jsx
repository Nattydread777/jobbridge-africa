import { Link } from "react-router-dom";

const NotFound = () => (
  <main className="mx-auto flex min-h-[65vh] max-w-5xl flex-col items-center justify-center px-4 py-16 text-center">
    <p className="text-sm font-bold uppercase tracking-[0.2em] text-terracotta">404 · Page not found</p>
    <h1 className="mt-4 text-5xl font-black text-charcoal">This page took a wrong turn.</h1>
    <p className="mt-4 max-w-xl text-lg leading-7 text-slate-600">The page may have moved or the link may be incorrect. You can return to the homepage or continue browsing current opportunities.</p>
    <div className="mt-8 flex flex-wrap justify-center gap-3">
      <Link to="/" className="rounded-xl bg-charcoal px-6 py-3 font-semibold text-white hover:bg-slate-800">Go to Home</Link>
      <Link to="/jobs" className="rounded-xl bg-terracotta px-6 py-3 font-semibold text-white hover:bg-terracotta-dark">Browse Jobs</Link>
    </div>
  </main>
);

export default NotFound;
