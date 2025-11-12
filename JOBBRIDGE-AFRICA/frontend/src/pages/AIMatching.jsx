import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";

// Demo AI matching function
function matchJobs(userProfile, jobs) {
  // Simple score: +1 for each matching skill, +1 for matching location
  return jobs
    .map((job) => {
      let score = 0;
      if (userProfile.skills && job.requirements) {
        userProfile.skills.forEach((skill) => {
          if (job.requirements.toLowerCase().includes(skill.toLowerCase()))
            score++;
        });
      }
      if (userProfile.location && job.location) {
        if (
          job.location
            .toLowerCase()
            .includes(userProfile.location.toLowerCase())
        )
          score++;
      }
      return { ...job, matchScore: score };
    })
    .sort((a, b) => b.matchScore - a.matchScore);
}

const demoJobs = [
  {
    title: "Frontend Developer",
    companyName: "Lagos Tech",
    location: "Lagos, Nigeria",
    requirements: "JavaScript, React, CSS",
    salaryRange: "$1200/mo",
  },
  {
    title: "Backend Engineer",
    companyName: "Nairobi Cloud",
    location: "Nairobi, Kenya",
    requirements: "Node.js, MongoDB, Express",
    salaryRange: "$1500/mo",
  },
  {
    title: "Full Stack Developer",
    companyName: "Cape Town Startups",
    location: "Cape Town, South Africa",
    requirements: "React, Node.js, TypeScript",
    salaryRange: "$1800/mo",
  },
];

const demoProfile = {
  name: "Jane Doe",
  location: "Lagos, Nigeria",
  skills: ["JavaScript", "React", "Node.js", "CSS"],
};

const AIMatching = () => {
  const { user, isAuthenticated } = useAuth();
  const [showDemo, setShowDemo] = useState(false);
  const matchedDemoJobs = matchJobs(demoProfile, demoJobs);
  const [loading, setLoading] = useState(false);
  const [aiMatches, setAiMatches] = useState([]);
  const [error, setError] = useState("");

  const runAiMatching = async () => {
    if (!isAuthenticated) {
      setError("Please login to get personalized AI matches.");
      return;
    }
    try {
      setLoading(true);
      setError("");
      const { data } = await api.get("/ai/match");
      setAiMatches(data);
    } catch (e) {
      setError(e.response?.data?.message || "Failed to fetch AI matches");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="max-w-4xl mx-auto">
        <Link
          to="/profile-view"
          className="text-primary hover:underline mb-6 inline-block"
        >
          ← Back to Dashboard
        </Link>

        <div className="bg-white rounded-lg shadow-md p-8">
          <h1 className="text-4xl font-bold mb-6 text-gray-800">
            AI-Powered Job Matching
          </h1>

          <div className="prose max-w-none">
            <p className="text-lg text-gray-700 mb-6">
              JobBridge Africa uses cutting-edge artificial intelligence to
              connect job seekers with their perfect opportunities across the
              African continent.{" "}
              <span className="font-bold text-primary">
                Free AI matching included!
              </span>
            </p>
            <div className="mb-6">
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  className="bg-primary text-white px-6 py-2 rounded hover:bg-yellow-600 font-semibold shadow"
                  onClick={() => setShowDemo((v) => !v)}
                >
                  {showDemo ? "Hide" : "Try"} AI Matching Demo
                </button>
                <button
                  className="bg-secondary text-white px-6 py-2 rounded hover:bg-green-700 font-semibold shadow"
                  onClick={runAiMatching}
                >
                  Use My Profile to Get Matches
                </button>
              </div>
              <span className="ml-4 text-sm text-gray-500">
                Powered by our own engine.{" "}
                <span className="font-bold text-accent">
                  Kim K2 upgrade coming soon!
                </span>
              </span>
            </div>
            {showDemo && (
              <div className="bg-primary/10 border border-primary rounded-lg p-6 mb-8">
                <h3 className="text-xl font-bold mb-2 text-primary">
                  Your Profile
                </h3>
                <ul className="mb-4">
                  <li>
                    <b>Name:</b> {demoProfile.name}
                  </li>
                  <li>
                    <b>Location:</b> {demoProfile.location}
                  </li>
                  <li>
                    <b>Skills:</b> {demoProfile.skills.join(", ")}
                  </li>
                </ul>
                <h3 className="text-xl font-bold mb-2 text-primary">
                  Top Job Matches
                </h3>
                <ul>
                  {matchedDemoJobs.map((job, idx) => (
                    <li
                      key={idx}
                      className="mb-3 p-3 bg-white rounded shadow flex flex-col md:flex-row md:items-center justify-between"
                    >
                      <div>
                        <span className="font-bold text-lg text-secondary">
                          {job.title}
                        </span>{" "}
                        <span className="text-gray-600">
                          @ {job.companyName}
                        </span>
                        <div className="text-sm text-gray-700">
                          {job.location}
                        </div>
                        <div className="text-sm text-gray-700">
                          Requirements: {job.requirements}
                        </div>
                        <div className="text-sm text-gray-700">
                          Salary: {job.salaryRange}
                        </div>
                      </div>
                      <div className="mt-2 md:mt-0">
                        <span className="inline-block bg-primary text-white px-3 py-1 rounded-full text-sm font-semibold">
                          Match Score: {job.matchScore}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Real AI Matches */}
            {loading && (
              <div className="p-4 bg-white rounded border mb-6">
                Fetching your AI matches...
              </div>
            )}
            {error && (
              <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded mb-6">
                {error}
              </div>
            )}
            {aiMatches.length > 0 && (
              <div className="bg-white rounded-lg shadow p-6 mb-8">
                <h3 className="text-xl font-bold mb-4">
                  Your AI-Recommended Jobs
                </h3>
                <ul className="divide-y">
                  {aiMatches.map(({ job, score }) => (
                    <li
                      key={job._id}
                      className="py-4 flex items-start justify-between gap-4"
                    >
                      <div>
                        <div className="text-lg font-semibold text-secondary">
                          {job.title}
                        </div>
                        <div className="text-gray-600">{job.companyName}</div>
                        <div className="text-sm text-gray-500">
                          {job.location} • {job.jobType}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="inline-block bg-primary text-white px-3 py-1 rounded-full text-sm font-semibold mb-2">
                          Match: {(score * 100).toFixed(0)}%
                        </div>
                        <div>
                          <Link
                            to={`/jobs/${job._id}`}
                            className="text-primary hover:underline"
                          >
                            View Details →
                          </Link>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <h2 className="text-2xl font-bold mt-8 mb-4">How It Works</h2>
            <div className="space-y-4 mb-8">
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-12 h-12 bg-primary rounded-full flex items-center justify-center text-white font-bold">
                  1
                </div>
                <div>
                  <h3 className="font-semibold text-lg">Build Your Profile</h3>
                  <p className="text-gray-600">
                    Complete your professional profile with your skills,
                    education, experience, and career preferences.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex-shrink-0 w-12 h-12 bg-primary rounded-full flex items-center justify-center text-white font-bold">
                  2
                </div>
                <div>
                  <h3 className="font-semibold text-lg">AI Analysis</h3>
                  <p className="text-gray-600">
                    Our intelligent algorithms analyze your profile and match it
                    with thousands of job postings in real-time.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex-shrink-0 w-12 h-12 bg-primary rounded-full flex items-center justify-center text-white font-bold">
                  3
                </div>
                <div>
                  <h3 className="font-semibold text-lg">
                    Smart Recommendations
                  </h3>
                  <p className="text-gray-600">
                    Receive personalized job recommendations that match your
                    skills, experience level, and location preferences.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex-shrink-0 w-12 h-12 bg-primary rounded-full flex items-center justify-center text-white font-bold">
                  4
                </div>
                <div>
                  <h3 className="font-semibold text-lg">Continuous Learning</h3>
                  <p className="text-gray-600">
                    The more you interact with the platform, the better our AI
                    understands your preferences and improves recommendations.
                  </p>
                </div>
              </div>
            </div>

            <h2 className="text-2xl font-bold mt-8 mb-4">Key Features</h2>
            <ul className="space-y-3 mb-8">
              <li className="flex items-start gap-3">
                <span className="text-secondary text-xl">✓</span>
                <span>
                  <strong>Skills Matching:</strong> Automatically matches your
                  skills with job requirements
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-secondary text-xl">✓</span>
                <span>
                  <strong>Experience Level Detection:</strong> Filters jobs
                  appropriate for your career stage
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-secondary text-xl">✓</span>
                <span>
                  <strong>Location Preferences:</strong> Prioritizes jobs in
                  your preferred cities and countries
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-secondary text-xl">✓</span>
                <span>
                  <strong>Salary Alignment:</strong> Matches opportunities with
                  your expected compensation range
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-secondary text-xl">✓</span>
                <span>
                  <strong>Industry Focus:</strong> Learns your industry
                  preferences and highlights relevant opportunities
                </span>
              </li>
            </ul>

            <div className="bg-gray-50 border-l-4 border-primary p-6 mt-8">
              <h3 className="font-bold text-lg mb-2">Get Started Today</h3>
              <p className="text-gray-700 mb-4">
                Upload your resume and let our AI create a comprehensive profile
                for you instantly - just like LinkedIn's auto-fill feature!
              </p>
              <Link
                to="/register"
                className="inline-block bg-primary text-white px-6 py-3 rounded hover:bg-yellow-600 transition"
              >
                Create Your Profile
              </Link>
              <div className="mt-6">
                <button className="bg-accent text-white px-6 py-2 rounded shadow hover:bg-red-700 font-semibold">
                  Upgrade to Premium (Coming Soon)
                </button>
                <span className="ml-3 text-sm text-gray-500">
                  Unlock advanced AI (Kim K2), career guidance, and more!
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIMatching;
