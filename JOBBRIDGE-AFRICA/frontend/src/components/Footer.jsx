import { Link, NavLink } from "react-router-dom";

const Footer = () => (
  <footer className="bg-slate-950 text-white">
    <div className="mx-auto max-w-7xl px-5 py-7 sm:px-6 lg:px-8">
      <div className="grid gap-7 sm:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1fr_1fr] lg:gap-10">
        <div>
          <Link to="/" aria-label="JobBridge Africa home" className="inline-flex items-center gap-3">
            <img src="/logo.png" alt="" className="h-11 w-11 object-contain" />
            <span className="text-lg font-extrabold tracking-tight text-amber-400">JobBridge Africa</span>
          </Link>
          <p className="mt-3 max-w-sm text-sm leading-6 text-slate-400">
            Connecting African talent with meaningful work and opportunity worldwide.
          </p>
          <p className="mt-4 rounded-xl border border-amber-300/40 bg-amber-300/10 p-3 text-sm font-semibold leading-6 text-amber-100">
            Scam warning: JobBridge Africa never charges candidates an application fee.
          </p>
          <div className="mt-3 flex gap-4 text-sm font-medium text-slate-400">
            <a href="https://facebook.com" target="_blank" rel="noreferrer" className="hover:text-amber-300">Facebook</a>
            <a href="https://twitter.com" target="_blank" rel="noreferrer" className="hover:text-amber-300">X</a>
            <a href="https://linkedin.com" target="_blank" rel="noreferrer" className="hover:text-amber-300">LinkedIn</a>
          </div>
        </div>

        <FooterLinks
          title="Job seekers"
          links={[
            ["Browse jobs", "/jobs"],
            ["Create account", "/register"],
            ["Upload resume", "/upload-resume"],
            ["Career resources", "/career-resources"],
          ]}
        />
        <FooterLinks
          title="Employers"
          links={[
            ["Post a job", "/employers"],
            ["Browse candidates", "/employer-dashboard"],
            ["Pricing plans", "/pricing"],
          ]}
        />
        <div>
          <FooterLinks
            title="Company"
            links={[
              ["About us", "/about"],
              ["Contact", "/contact"],
              ["Privacy policy", "/privacy"],
              ["Terms of service", "/terms"],
            ]}
          />
          <div className="mt-3 space-y-1 text-xs text-slate-400">
            <p>+234 807 320 8945</p>
            <a href="mailto:info@jobbridgeafrica.com" className="hover:text-amber-300">info@jobbridgeafrica.com</a>
          </div>
        </div>
      </div>

      <div className="mt-6 flex flex-col gap-2 border-t border-white/10 pt-4 text-xs text-slate-400 sm:flex-row sm:items-center sm:justify-between">
        <p>© {new Date().getFullYear()} JobBridge Africa. All rights reserved.</p>
        <Link
          to="/sdg-impact"
          className="inline-flex w-fit rounded-full border border-emerald-300/30 bg-emerald-300/10 px-3 py-1 font-semibold text-emerald-200 hover:bg-emerald-300/20"
        >
          SDG 8 · Driving Decent Work &amp; Economic Growth across Africa
        </Link>
        <p>By <NavLink to="/about" className="font-medium hover:text-white">Nathaniel Usikpedo</NavLink></p>
      </div>
    </div>
  </footer>
);

const FooterLinks = ({ title, links }) => (
  <nav aria-label={title}>
    <h2 className="text-sm font-bold text-white">{title}</h2>
    <ul className="mt-3 space-y-2 text-sm text-slate-400">
      {links.map(([label, path]) => (
        <li key={path}>
          <Link to={path} className="transition hover:text-amber-300">{label}</Link>
        </li>
      ))}
    </ul>
  </nav>
);

export default Footer;
