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
  const transparent = "bg-gray-900/30";
  const elevatedStyles = elevated ? "shadow-md bg-gray-900/50" : transparent;

  return (
    <header className={`${base} ${elevatedStyles}`}>
      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <img
              src="/logo.svg"
              alt="JobBridge Africa logo"
              className="w-8 h-8"
            />
            <h1 className="text-2xl font-extrabold uppercase tracking-wide">
              JOBBRIDGE AFRICA
            </h1>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex space-x-6 items-center text-white">
            <NavLink
              to="/"
              className={({ isActive }) =>
                isActive
                  ? "font-semibold border-b-2 border-white pb-1"
                  : "hover:text-gray-200 transition"
              }
            >
              Home
            </NavLink>
            <NavLink
              to="/jobs"
              className={({ isActive }) =>
                isActive
                  ? "font-semibold border-b-2 border-white pb-1"
                  : "hover:text-gray-200 transition"
              }
            >
              Find Jobs
            </NavLink>
            <NavLink
              to="/employers"
              className={({ isActive }) =>
                isActive
                  ? "font-semibold border-b-2 border-white pb-1"
                  : "hover:text-gray-200 transition"
              }
            >
              For Employers
            </NavLink>
            <NavLink
              to="/about"
              className={({ isActive }) =>
                isActive
                  ? "font-semibold border-b-2 border-white pb-1"
                  : "hover:text-gray-200 transition"
              }
            >
              About
            </NavLink>
            <NavLink
              to="/contact"
              className={({ isActive }) =>
                isActive
                  ? "font-semibold border-b-2 border-white pb-1"
                  : "hover:text-gray-200 transition"
              }
            >
              Contact
            </NavLink>
          </nav>

          {/* Desktop Auth Buttons */}
          <div className="hidden md:flex space-x-3">
            <NavLink
              to="/login"
              className="px-4 py-2 bg-white/90 text-primary rounded-md hover:bg-white transition font-semibold"
            >
              Login
            </NavLink>
            <NavLink
              to="/register"
              className="px-4 py-2 bg-accent text-white rounded-md hover:bg-red-700 transition font-semibold"
            >
              Sign Up
            </NavLink>
          </div>

          {/* Mobile Hamburger Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden text-white p-2 hover:bg-white/10 rounded transition"
            aria-label="Toggle menu"
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
          <nav className="md:hidden mt-4 pb-4 border-t border-white/20 pt-4 space-y-3">
            <NavLink
              to="/"
              className={({ isActive }) =>
                `block px-4 py-2 rounded transition ${
                  isActive ? "bg-white/20 font-semibold" : "hover:bg-white/10"
                }`
              }
            >
              Home
            </NavLink>
            <NavLink
              to="/jobs"
              className={({ isActive }) =>
                `block px-4 py-2 rounded transition ${
                  isActive ? "bg-white/20 font-semibold" : "hover:bg-white/10"
                }`
              }
            >
              Find Jobs
            </NavLink>
            <NavLink
              to="/employers"
              className={({ isActive }) =>
                `block px-4 py-2 rounded transition ${
                  isActive ? "bg-white/20 font-semibold" : "hover:bg-white/10"
                }`
              }
            >
              For Employers
            </NavLink>
            <NavLink
              to="/about"
              className={({ isActive }) =>
                `block px-4 py-2 rounded transition ${
                  isActive ? "bg-white/20 font-semibold" : "hover:bg-white/10"
                }`
              }
            >
              About
            </NavLink>
            <NavLink
              to="/contact"
              className={({ isActive }) =>
                `block px-4 py-2 rounded transition ${
                  isActive ? "bg-white/20 font-semibold" : "hover:bg-white/10"
                }`
              }
            >
              Contact
            </NavLink>
            <div className="flex flex-col space-y-2 pt-2 border-t border-white/20">
              <NavLink
                to="/login"
                className="px-4 py-2 bg-white/90 text-primary rounded-md hover:bg-white transition font-semibold text-center"
              >
                Login
              </NavLink>
              <NavLink
                to="/register"
                className="px-4 py-2 bg-accent text-white rounded-md hover:bg-red-700 transition font-semibold text-center"
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
