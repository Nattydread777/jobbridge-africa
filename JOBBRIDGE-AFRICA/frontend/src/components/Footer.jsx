import { Link, NavLink } from "react-router-dom";

const Footer = () => {
  return (
    <footer className="bg-gray-900 text-white">
      <div className="max-w-7xl mx-auto px-6 md:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-3 mb-4">
              <img
                src="/logo.svg"
                alt="JobBridge Africa logo"
                className="w-8 h-8"
              />
              <h3 className="text-xl font-extrabold uppercase tracking-wide text-primary">
                JOBBRIDGE AFRICA
              </h3>
            </div>
            <p className="text-gray-400 text-sm leading-relaxed">
              Empowering Africa's workforce with AI-driven job matching —
              connecting talent with opportunity across the continent.
            </p>
            <div className="flex items-center gap-4 mt-5 text-gray-400">
              <a
                href="https://facebook.com"
                target="_blank"
                rel="noreferrer"
                className="hover:text-primary transition-colors"
                aria-label="Facebook"
              >
                <svg
                  className="w-5 h-5"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M24 12.073C24 5.446 18.627.073 12 .073 5.373.073 0 5.446 0 12.073c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                </svg>
              </a>
              <a
                href="https://twitter.com"
                target="_blank"
                rel="noreferrer"
                className="hover:text-primary transition-colors"
                aria-label="Twitter"
              >
                <svg
                  className="w-5 h-5"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z" />
                </svg>
              </a>
              <a
                href="https://linkedin.com"
                target="_blank"
                rel="noreferrer"
                className="hover:text-primary transition-colors"
                aria-label="LinkedIn"
              >
                <svg
                  className="w-5 h-5"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                </svg>
              </a>
            </div>
          </div>

          {/* Job Seekers */}
          <div>
            <h3 className="text-lg font-semibold mb-4">For Job Seekers</h3>
            <ul className="space-y-2 text-gray-400 text-sm">
              <li>
                <Link
                  to="/jobs"
                  className="hover:text-primary transition-colors"
                >
                  Browse Jobs
                </Link>
              </li>
              <li>
                <Link
                  to="/register"
                  className="hover:text-primary transition-colors"
                >
                  Create Account
                </Link>
              </li>
              <li>
                <a href="#" className="hover:text-primary transition-colors">
                  Upload Resume
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-primary transition-colors">
                  Career Resources
                </a>
              </li>
            </ul>
          </div>

          {/* Employers */}
          <div>
            <h3 className="text-lg font-semibold mb-4">For Employers</h3>
            <ul className="space-y-2 text-gray-400 text-sm">
              <li>
                <Link
                  to="/employers"
                  className="hover:text-primary transition-colors"
                >
                  Post a Job
                </Link>
              </li>
              <li>
                <a href="#" className="hover:text-primary transition-colors">
                  Browse Candidates
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-primary transition-colors">
                  Pricing Plans
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-primary transition-colors">
                  Employer Resources
                </a>
              </li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Company</h3>
            <ul className="space-y-2 text-gray-400 text-sm">
              <li>
                <Link
                  to="/about"
                  className="hover:text-primary transition-colors"
                >
                  About Us
                </Link>
              </li>
              <li>
                <Link
                  to="/contact"
                  className="hover:text-primary transition-colors"
                >
                  Contact
                </Link>
              </li>
              <li>
                <a href="#" className="hover:text-primary transition-colors">
                  Privacy Policy
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-primary transition-colors">
                  Terms of Service
                </a>
              </li>
            </ul>
            <div className="mt-4 text-gray-400 text-xs space-y-1">
              <p>📞 +2348073208945</p>
              <p>📧 info@jobbridgeafrica.org</p>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-gray-800 mt-10 pt-6 flex flex-col md:flex-row justify-between items-center text-sm text-gray-400">
          <p>
            © {new Date().getFullYear()}{" "}
            <span className="font-semibold uppercase">JOBBRIDGE AFRICA</span>.
            All rights reserved.
          </p>
          <div className="flex gap-4 mt-2 md:mt-0">
            <NavLink to="/privacy" className="hover:text-white transition">
              Privacy Policy
            </NavLink>
            <span>•</span>
            <NavLink to="/terms" className="hover:text-white transition">
              Terms of Service
            </NavLink>
          </div>
          <p className="mt-2 md:mt-0">
            Supporting UN SDG 8 — Decent Work and Economic Growth
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
