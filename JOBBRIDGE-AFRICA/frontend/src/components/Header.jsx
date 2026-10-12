import { NavLink, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";

const Header = () => {
  const { pathname } = useLocation();
  const [elevated, setElevated] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      setElevated(window.scrollY > 40);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, [pathname]);

  // Close mobile menu when route changes
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  const base =
    "fixed top-0 inset-x-0 z-50 transition-all duration-300 backdrop-blur-md";
  const transparent = "bg-charcoal/80";
  const elevatedStyles = elevated ? "shadow-md bg-charcoal/95" : transparent;

  return (
    <header className={`${base} ${elevatedStyles}`}>
      <div className="mx-auto max-w-7xl px-4 py-2.5 sm:px-6">
        <div className="flex justify-between items-center">
          <NavLink
            to="/"
            onClick={() => setMobileMenuOpen(false)}
            aria-label="JobBridge Africa home"
            className="flex min-w-0 items-center gap-2 md:gap-3"
          >
            <img
              src="/logo.png"
              alt=""
              className="h-10 w-10 shrink-0 md:h-12 md:w-12"
            />
            <span className="text-base font-extrabold uppercase tracking-wide text-primary sm:text-lg lg:text-xl">
              JOBBRIDGE AFRICA
            </span>
          </NavLink>

          {/* Desktop Navigation */}
          <nav className="hidden items-center gap-4 text-sm font-medium text-white xl:flex 2xl:gap-5">
            <NavLink
              to="/"
              className={({ isActive }) =>
                isActive
                  ? "font-semibold border-b-2 border-white pb-1 cursor-pointer"
                  : "hover:text-gray-200 transition cursor-pointer"
              }
            >
              Home
            </NavLink>
            <NavLink
              to="/jobs"
              className={({ isActive }) =>
                isActive
                  ? "font-semibold border-b-2 border-white pb-1 cursor-pointer"
                  : "hover:text-gray-200 transition cursor-pointer"
              }
            >
              Find Jobs
            </NavLink>
            <NavLink
              to="/sdg-impact"
              className={({ isActive }) =>
                isActive ? "font-semibold border-b-2 border-white pb-1" : "hover:text-gray-200 transition"
              }
            >
              Mission
            </NavLink>
            <NavLink
              to="/ai-cv-tool"
              className={({ isActive }) =>
                isActive ? "font-semibold border-b-2 border-white pb-1" : "hover:text-gray-200 transition"
              }
            >
              AI CV Tool
            </NavLink>
            <a href="/#royal-merchant" className="hover:text-gray-200 transition">
              Upskilling loans
            </a>
            <NavLink
              to="/employers"
              className={({ isActive }) =>
                isActive
                  ? "font-semibold border-b-2 border-white pb-1 cursor-pointer"
                  : "hover:text-gray-200 transition cursor-pointer"
              }
            >
              For Employers
            </NavLink>
            <NavLink
              to="/about"
              className={({ isActive }) =>
                isActive
                  ? "font-semibold border-b-2 border-white pb-1 cursor-pointer"
                  : "hover:text-gray-200 transition cursor-pointer"
              }
            >
              About
            </NavLink>
            <NavLink
              to="/contact"
              className={({ isActive }) =>
                isActive
                  ? "font-semibold border-b-2 border-white pb-1 cursor-pointer"
                  : "hover:text-gray-200 transition cursor-pointer"
              }
            >
              Contact
            </NavLink>
          </nav>

          {/* Desktop Auth Buttons */}
          <div className="hidden shrink-0 items-center gap-2 xl:flex">
            <NavLink
              to="/pricing"
              className="whitespace-nowrap rounded-lg bg-amber-400 px-3 py-2 text-sm font-semibold text-charcoal transition hover:bg-amber-300"
            >
              Upgrade to Pro
            </NavLink>
            <NavLink
              to="/login"
              className="whitespace-nowrap rounded-lg bg-white/90 px-3 py-2 text-sm font-semibold text-primary transition hover:bg-white"
            >
              Login
            </NavLink>
            <NavLink
              to="/register"
              className="whitespace-nowrap rounded-lg bg-terracotta px-3 py-2 text-sm font-semibold text-white transition hover:bg-terracotta-dark"
            >
              Sign Up
            </NavLink>
          </div>

          {/* Mobile Hamburger Button */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen((open) => !open)}
            className="rounded-lg p-2 text-white transition hover:bg-white/10 xl:hidden"
            aria-label="Toggle menu"
            aria-expanded={mobileMenuOpen}
            aria-controls="mobile-navigation"
          >
            {mobileMenuOpen ? (
              // Close icon
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            ) : (
              // Hamburger icon
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            )}
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <nav id="mobile-navigation" className="mt-3 space-y-2 border-t border-white/20 bg-charcoal pb-3 pt-3 text-white xl:hidden">
            <NavLink
              to="/"
              onClick={() => setMobileMenuOpen(false)}
              className={({ isActive }) =>
                `block px-4 py-2 rounded transition cursor-pointer ${
                  isActive ? "bg-white/15 font-semibold text-amber-300" : "text-white hover:bg-white/10 hover:text-amber-200"
                }`
              }
            >
              Home
            </NavLink>
            <NavLink
              to="/jobs"
              onClick={() => setMobileMenuOpen(false)}
              className={({ isActive }) =>
                `block px-4 py-2 rounded transition cursor-pointer ${
                  isActive ? "bg-white/15 font-semibold text-amber-300" : "text-white hover:bg-white/10 hover:text-amber-200"
                }`
              }
            >
              Find Jobs
            </NavLink>
            <NavLink
              to="/sdg-impact"
              onClick={() => setMobileMenuOpen(false)}
              className={({ isActive }) =>
                `block px-4 py-2 rounded transition ${isActive ? "bg-white/15 font-semibold text-amber-300" : "text-white hover:bg-white/10 hover:text-amber-200"}`
              }
            >
              Mission (SDG 8)
            </NavLink>
            <NavLink
              to="/ai-cv-tool"
              onClick={() => setMobileMenuOpen(false)}
              className={({ isActive }) =>
                `block px-4 py-2 rounded transition ${isActive ? "bg-white/15 font-semibold text-amber-300" : "text-white hover:bg-white/10 hover:text-amber-200"}`
              }
            >
              AI CV Tool
            </NavLink>
            <a href="/#royal-merchant" onClick={() => setMobileMenuOpen(false)} className="block rounded px-4 py-2 text-white transition hover:bg-white/10 hover:text-amber-200">
              Royal Merchant loans
            </a>
            <NavLink
              to="/employers"
              onClick={() => setMobileMenuOpen(false)}
              className={({ isActive }) =>
                `block px-4 py-2 rounded transition cursor-pointer ${
                  isActive ? "bg-white/15 font-semibold text-amber-300" : "text-white hover:bg-white/10 hover:text-amber-200"
                }`
              }
            >
              For Employers
            </NavLink>
            <NavLink
              to="/about"
              onClick={() => setMobileMenuOpen(false)}
              className={({ isActive }) =>
                `block px-4 py-2 rounded transition cursor-pointer ${
                  isActive ? "bg-white/15 font-semibold text-amber-300" : "text-white hover:bg-white/10 hover:text-amber-200"
                }`
              }
            >
              About
            </NavLink>
            <NavLink
              to="/contact"
              onClick={() => setMobileMenuOpen(false)}
              className={({ isActive }) =>
                `block px-4 py-2 rounded transition cursor-pointer ${
                  isActive ? "bg-white/15 font-semibold text-amber-300" : "text-white hover:bg-white/10 hover:text-amber-200"
                }`
              }
            >
              Contact
            </NavLink>
            <div className="flex flex-col space-y-2 pt-2 border-t border-white/20">
              <NavLink
                to="/pricing"
                onClick={() => setMobileMenuOpen(false)}
                className="px-4 py-2 bg-amber-400 text-charcoal rounded-md hover:bg-amber-300 transition font-bold text-center"
              >
                Upgrade to Pro
              </NavLink>
              <NavLink
                to="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="px-4 py-2 bg-white/90 text-primary rounded-md hover:bg-white transition font-semibold text-center cursor-pointer"
              >
                Login
              </NavLink>
              <NavLink
                to="/register"
                onClick={() => setMobileMenuOpen(false)}
                className="px-4 py-2 bg-terracotta text-white rounded-md hover:bg-terracotta-dark transition font-semibold text-center cursor-pointer"
              >
                Sign Up
              </NavLink>
            </div>
          </nav>
        )}
      </div>
    </header>
  );
};

export default Header;
