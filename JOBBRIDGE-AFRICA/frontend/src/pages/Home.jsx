import { useState, useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import heroImg from "../assets/hero.jpg";
import locations from "../data/africaLocations";

const Home = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [country, setCountry] = useState("");
  const [city, setCity] = useState("");
  const [jobType, setJobType] = useState("All");
  const [currentSlide, setCurrentSlide] = useState(0);
  const [statsVisible, setStatsVisible] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const navigate = useNavigate();
  const statsRef = useRef(null);
  const slides = 2; // Total number of hero slides

  const handleSearch = (e) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (searchTerm) params.set("search", searchTerm);
    if (country) params.set("country", country);
    if (city) params.set("city", city);
    if (jobType && jobType !== "All") params.set("jobType", jobType);
    navigate(`/jobs?${params.toString()}`);
  };

  useEffect(() => {
    // when country changes, reset city to first in list
    const entry = locations.find((l) => l.country === country);
    setCity(entry?.cities?.[0] || "");
  }, [country]);

  // Auto-rotate carousel
  useEffect(() => {
    if (isPaused) return;

    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides);
    }, 30000); // Change slide every 30 seconds

    return () => clearInterval(interval);
  }, [isPaused]); // Intersection Observer for stats animation
  useEffect(() => {
    const observerOptions = {
      threshold: 0.2,
      rootMargin: "0px 0px -100px 0px",
    };

    const statsObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting && !statsVisible) {
          setStatsVisible(true);
        }
      });
    }, observerOptions);

    if (statsRef.current) statsObserver.observe(statsRef.current);

    return () => {
      if (statsRef.current) statsObserver.unobserve(statsRef.current);
    };
  }, [statsVisible]);

  const goToSlide = (index) => {
    setCurrentSlide(index);
  };

  const scrollToFeatures = () => {
    const featuresSection = document.getElementById("features-section");
    featuresSection?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="bg-neutral">
      {/* Hero Carousel Container */}
      <section
        className="relative overflow-hidden min-h-[85vh]"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
      >
        {/* Slides Container */}
        <div
          className="flex transition-transform duration-700 ease-in-out min-h-[85vh] w-full"
          style={{
            transform: `translateX(-${currentSlide * 100}%)`,
            width: `${slides * 100}%`,
          }}
        >
          {/* Slide 1: Job Search Hero */}
          <div
            className="min-w-full flex-shrink-0 relative text-white flex items-center"
            style={{
              backgroundImage: `url(${heroImg})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
          >
            <div
              className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black/20"
              aria-hidden="true"
            />
            <div
              className="pointer-events-none absolute inset-0 opacity-20"
              aria-hidden="true"
              style={{
                backgroundImage:
                  "radial-gradient(rgba(255,255,255,0.15) 1px, transparent 1px)",
                backgroundSize: "24px 24px",
              }}
            />
            <div className="relative w-full px-6 md:px-8 z-10">
              <div className="max-w-6xl mx-auto text-center pt-24 md:pt-28 pb-16">
                <h1 className="text-4xl md:text-6xl font-extrabold mb-5 drop-shadow">
                  Find Your Dream Job in Africa
                </h1>
                <p className="text-base md:text-xl mb-10 text-gray-100 max-w-3xl mx-auto">
                  AI-powered matching connecting African youth and professionals
                  with decent work opportunities across the continent.
                </p>
                <form
                  onSubmit={handleSearch}
                  className="bg-white/90 backdrop-blur-md rounded-xl shadow-2xl p-4 md:p-6 max-w-4xl mx-auto"
                >
                  {/* Job type chips */}
                  <div className="flex flex-wrap justify-center gap-2 mb-4">
                    {[
                      "All",
                      "Full-Time",
                      "Part-Time",
                      "Contract",
                      "Remote",
                      "Internship",
                    ].map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setJobType(t)}
                        className={`px-3 py-1 rounded-full text-sm font-medium ${
                          jobType === t
                            ? "bg-primary text-black"
                            : "bg-white/60 text-gray-700"
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
                    <label className="flex items-center md:border-r md:border-gray-300 md:pr-4">
                      <span className="sr-only">Job title or keyword</span>
                      <span className="text-gray-400 text-2xl mr-3" aria-hidden>
                        🔍
                      </span>
                      <input
                        type="text"
                        placeholder="Job title or keyword"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full outline-none text-gray-700 placeholder-gray-400 bg-transparent"
                      />
                    </label>

                    <div className="md:border-r md:border-gray-300 md:pr-4">
                      <label className="sr-only">Country</label>
                      <select
                        value={country}
                        onChange={(e) => setCountry(e.target.value)}
                        className="w-full p-2 rounded bg-white/80 text-gray-800"
                      >
                        {locations.map((loc) => (
                          <option key={loc.country} value={loc.country}>
                            {loc.country}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="sr-only">City</label>
                      <select
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        className="w-full p-2 rounded bg-white/80 text-gray-800"
                      >
                        {locations
                          .find((l) => l.country === country)
                          ?.cities?.map((c) => (
                            <option key={c} value={c}>
                              {c}
                            </option>
                          ))}
                      </select>
                    </div>

                    <button
                      type="submit"
                      className="bg-accent text-white px-6 md:px-8 py-3 rounded-md hover:bg-red-700 transition font-semibold text-lg"
                    >
                      Search Jobs
                    </button>
                  </div>

                  <div className="mt-3 text-xs md:text-sm text-gray-600">
                    Trending:{" "}
                    <button
                      type="button"
                      onClick={() => setSearchTerm("Software Engineer")}
                      className="underline hover:text-gray-800"
                    >
                      Software Engineer
                    </button>{" "}
                    •{" "}
                    <button
                      type="button"
                      onClick={() => setSearchTerm("Data Analyst")}
                      className="underline hover:text-gray-800"
                    >
                      Data Analyst
                    </button>{" "}
                    •{" "}
                    <button
                      type="button"
                      onClick={() => setSearchTerm("Product Manager")}
                      className="underline hover:text-gray-800"
                    >
                      Product Manager
                    </button>
                  </div>
                </form>
                <div className="mt-8 flex items-center justify-center gap-4">
                  <Link
                    to="/jobs"
                    className="inline-flex items-center px-6 py-3 rounded-md bg-primary text-black font-semibold hover:brightness-95 transition"
                  >
                    Browse Jobs
                  </Link>
                  <Link
                    to="/employers"
                    className="inline-flex items-center px-6 py-3 rounded-md border border-white/70 text-white hover:bg-white/10 transition"
                  >
                    Post a Job
                  </Link>
                </div>
              </div>
            </div>
          </div>

          {/* Slide 2: Mission Statement */}
          <div
            className="min-w-full flex-shrink-0 relative text-white flex items-center"
            style={{
              backgroundImage: `url(${heroImg})`,
              backgroundSize: "cover",
              backgroundPosition: "bottom center",
            }}
          >
            <div
              className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/50 to-black/70"
              aria-hidden="true"
            />
            <div className="relative w-full px-6 md:px-12 z-10">
              <div className="max-w-5xl mx-auto text-center py-20">
                <h2 className="text-3xl md:text-5xl font-extrabold mb-6 leading-tight drop-shadow-lg">
                  Connecting Africa's Talent with Meaningful Work
                </h2>
                <p className="text-lg md:text-2xl mb-6 text-gray-100 leading-relaxed max-w-4xl mx-auto">
                  JobBridge Africa — a youth empowerment initiative born from
                  the Power Learn Project (PLP) of Africa — is connecting
                  Africa's talent with meaningful work through AI‑driven job
                  matching.
                </p>
                <p className="text-base md:text-xl text-gray-200 max-w-3xl mx-auto">
                  The platform advances{" "}
                  <span className="font-semibold text-primary">UN SDG 8</span>{" "}
                  by promoting sustainable employment and inclusive economic
                  growth across the continent.
                </p>
                <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
                  <Link
                    to="/about"
                    className="inline-flex items-center px-8 py-3 rounded-md bg-white text-gray-900 font-semibold hover:bg-gray-100 transition shadow-lg"
                  >
                    Learn More About Us
                  </Link>
                  <Link
                    to="/sdg-impact"
                    className="inline-flex items-center px-8 py-3 rounded-md border-2 border-white/80 text-white hover:bg-white/10 transition"
                  >
                    Our SDG 8 Impact
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Dots */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-3 z-20">
          {[...Array(slides)].map((_, index) => (
            <button
              key={index}
              onClick={() => goToSlide(index)}
              className={`w-3 h-3 rounded-full transition-all duration-300 ${
                currentSlide === index
                  ? "bg-white w-8"
                  : "bg-white/50 hover:bg-white/75"
              }`}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>

        {/* Scroll Down Indicator */}
        <button
          onClick={scrollToFeatures}
          className="absolute bottom-20 left-1/2 -translate-x-1/2 text-white/80 hover:text-white transition-all animate-bounce cursor-pointer z-20"
          aria-label="Scroll to features"
        >
          <svg
            className="w-8 h-8"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 14l-7 7m0 0l-7-7m7 7V3"
            />
          </svg>
        </button>
      </section>

      {/* Features Section */}
      <section id="features-section" className="max-w-7xl mx-auto py-16 px-8">
        <h2 className="text-3xl font-bold text-center mb-12 text-primary">
          Why Choose JobBridge Africa?
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <Link
            to="/ai-matching"
            className="bg-white p-6 rounded-lg shadow-md text-center hover:shadow-xl transition-shadow"
          >
            <div className="text-5xl mb-4">🎯</div>
            <h3 className="text-xl font-semibold mb-2">AI-Powered Matching</h3>
            <p className="text-gray-600 mb-3">
              Our intelligent system matches your skills with the perfect
              opportunities.
            </p>
            <span className="text-primary font-medium hover:underline">
              Learn More →
            </span>
          </Link>
          <Link
            to="/pan-african-network"
            className="bg-white p-6 rounded-lg shadow-md text-center hover:shadow-xl transition-shadow"
          >
            <div className="text-5xl mb-4">🌍</div>
            <h3 className="text-xl font-semibold mb-2">Pan-African Network</h3>
            <p className="text-gray-600 mb-3">
              Access opportunities across all African countries in one platform.
            </p>
            <span className="text-primary font-medium hover:underline">
              Learn More →
            </span>
          </Link>
          <Link
            to="/sdg-impact"
            className="bg-white p-6 rounded-lg shadow-md text-center hover:shadow-xl transition-shadow"
          >
            <div className="text-5xl mb-4">💼</div>
            <h3 className="text-xl font-semibold mb-2">Decent Work (SDG 8)</h3>
            <p className="text-gray-600 mb-3">
              Supporting sustainable employment and economic growth.
            </p>
            <span className="text-primary font-medium hover:underline">
              Learn More →
            </span>
          </Link>
        </div>
      </section>

      {/* Stats Section */}
      <section
        ref={statsRef}
        className={`bg-secondary text-white py-12 transition-all duration-1000 ${
          statsVisible ? "opacity-100" : "opacity-0"
        }`}
      >
        <div className="max-w-7xl mx-auto px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 text-center">
            <StatCard
              end={10000}
              suffix="+"
              label="Active Jobs"
              isVisible={statsVisible}
            />
            <StatCard
              end={5000}
              suffix="+"
              label="Companies"
              isVisible={statsVisible}
            />
            <StatCard
              end={50000}
              suffix="+"
              label="Job Seekers"
              isVisible={statsVisible}
            />
            <StatCard
              end={54}
              suffix=""
              label="African Countries"
              isVisible={statsVisible}
            />
          </div>
        </div>
      </section>
    </div>
  );
};

// Stat card component with counter animation
const StatCard = ({ end, suffix, label, isVisible }) => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!isVisible) return;

    let startTime;
    const duration = 2000;

    const step = (timestamp) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      setCount(Math.floor(progress * end));

      if (progress < 1) {
        requestAnimationFrame(step);
      }
    };

    requestAnimationFrame(step);
  }, [end, isVisible]);

  return (
    <div>
      <div className="text-4xl font-bold">
        {count.toLocaleString()}
        {suffix}
      </div>
      <div className="text-gray-200 mt-2">{label}</div>
    </div>
  );
};

export default Home;
