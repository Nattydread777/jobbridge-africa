import { NavLink, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";

const Header = () => {
  const { pathname } = useLocation();
  const [elevated, setElevated] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      setElevated(window.scrollY > 40);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
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
          <div className="flex space-x-3">
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
        </div>
      </div>
    </header>
  );
};

export default Header;
