import { useAuth } from "../context/AuthContext";
import { Link, useNavigate } from "react-router-dom";

const Dashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/login");
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  // Calculate profile completion percentage for job seekers
  const calculateProfileCompletion = () => {
    if (!user || user.role !== "job_seeker") return 100;

    let completed = 0;
    const total = 7;

    if (user.profileImageUrl) completed++;
    if (user.resumeUrl) completed++;
    if (user.country) completed++;
    if (user.bio) completed++;
    if (user.education && user.education.length > 0) completed++;
    if (user.experience && user.experience.length > 0) completed++;
    if (user.skills && user.skills.length > 0) completed++;

    return Math.round((completed / total) * 100);
  };

  const completionPercentage = calculateProfileCompletion();

  if (!user) {
    return (
      <div className="max-w-7xl mx-auto p-8 text-center">
        <h2 className="text-2xl font-bold mb-4">
          Please log in to access your dashboard
        </h2>
        <Link to="/login" className="text-primary hover:underline">
          Go to Login
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Welcome, {user.name}!</h1>
        <button
          onClick={handleLogout}
          className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700 transition"
        >
          Logout
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Link
          to="/jobs"
          className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition"
        >
          <div className="text-4xl mb-3">🔍</div>
          <h3 className="text-xl font-semibold mb-2">Search Jobs</h3>
          <p className="text-gray-600">Find your dream job across Africa</p>
        </Link>

        <Link
          to="/my-jobs"
          className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition"
        >
          <div className="text-4xl mb-3">📋</div>
          <h3 className="text-xl font-semibold mb-2">My Jobs</h3>
          <p className="text-gray-600">Track applications and interviews</p>
        </Link>

        <Link
          to="/profile"
          className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition"
        >
          <div className="text-4xl mb-3">👤</div>
          <h3 className="text-xl font-semibold mb-2">Profile</h3>
          <p className="text-gray-600">Manage your profile and resume</p>
        </Link>
      </div>

      {user.role === "job_seeker" && (
        <>
          {/* Profile Completion Card */}
          <div className="bg-gradient-to-r from-primary to-yellow-500 p-6 rounded-lg shadow-lg mb-6 text-white">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold">Profile Strength</h2>
              <span className="text-4xl font-bold">
                {completionPercentage}%
              </span>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-white/30 rounded-full h-4 mb-4 overflow-hidden">
              <div
                className="bg-white h-full rounded-full transition-all duration-500"
                style={{ width: `${completionPercentage}%` }}
              ></div>
            </div>

            {completionPercentage === 100 ? (
              <p className="text-white/90 flex items-center gap-2">
                <span>✅</span> Your profile is complete! Start applying for
                jobs.
              </p>
            ) : (
              <div>
                <p className="text-white/90 mb-2">
                  Complete your profile to unlock all features:
                </p>
                <ul className="text-sm text-white/80 space-y-1 mb-3">
                  {!user.profileImageUrl && <li>• Upload profile photo</li>}
                  {!user.resumeUrl && <li>• Upload resume/CV</li>}
                  {!user.country && <li>• Add your country</li>}
                  {!user.bio && <li>• Write a bio</li>}
                  {(!user.education || user.education.length === 0) && (
                    <li>• Add education</li>
                  )}
                  {(!user.experience || user.experience.length === 0) && (
                    <li>• Add work experience</li>
                  )}
                  {(!user.skills || user.skills.length === 0) && (
                    <li>• Add skills</li>
                  )}
                </ul>
                <Link
                  to="/profile"
                  className="inline-block bg-white text-primary px-6 py-2 rounded-md hover:bg-gray-100 transition font-semibold"
                >
                  Complete Profile →
                </Link>
              </div>
            )}
          </div>

          <div className="bg-white p-6 rounded-lg shadow mb-6">
            <h2 className="text-xl font-bold mb-4">Quick Actions</h2>
            <div className="space-y-3">
              <Link
                to="/profile"
                className="w-full bg-primary text-black px-4 py-3 rounded-md hover:brightness-95 transition font-semibold text-left block"
              >
                📄 Upload Resume
              </Link>
              <Link
                to="/profile"
                className="w-full bg-secondary text-white px-4 py-3 rounded-md hover:brightness-95 transition font-semibold text-left block"
              >
                ✉️ Subscribe to Job Alerts
              </Link>
            </div>
          </div>
        </>
      )}

      {user.role === "employer" && (
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-bold mb-4">Employer Dashboard</h2>
          <div className="flex gap-4">
            <Link
              to="/post-job"
              className="bg-accent text-white px-6 py-3 rounded-md hover:bg-red-700 transition font-semibold"
            >
              Post a Job
            </Link>
            <Link
              to="/employer-dashboard"
              className="bg-primary text-black px-6 py-3 rounded-md hover:brightness-95 transition font-semibold"
            >
              Manage Applications
            </Link>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
