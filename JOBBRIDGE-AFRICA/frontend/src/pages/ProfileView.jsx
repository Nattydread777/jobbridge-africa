import { useAuth } from "../context/AuthContext";
import { Link, useNavigate } from "react-router-dom";

const ProfileView = () => {
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
    if (user.role !== "job_seeker") return 100;

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
  const isProfileComplete = completionPercentage === 100;

  if (!user) {
    return (
      <div className="max-w-7xl mx-auto p-8 text-center">
        <h2 className="text-2xl font-bold mb-4">
          Please log in to view your profile
        </h2>
        <Link to="/login" className="text-primary hover:underline">
          Go to Login
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto p-6">
      {/* Profile Header Card */}
      <div className="bg-white rounded-lg shadow-lg overflow-hidden mb-6">
        {/* Cover Photo */}
        <div className="h-32 bg-gradient-to-r from-primary to-secondary"></div>

        {/* Profile Info */}
        <div className="px-8 pb-8">
          {/* Profile Picture */}
          <div className="flex items-start -mt-16 mb-4">
            <div className="w-32 h-32 rounded-full bg-white border-4 border-white shadow-lg flex items-center justify-center text-6xl">
              {user.profileImageUrl ? (
                <img
                  src={user.profileImageUrl}
                  alt={user.name}
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                <span className="text-primary">👤</span>
              )}
            </div>
            <div className="ml-auto mt-16 flex gap-3">
              <Link
                to="/profile"
                className="bg-primary text-white px-6 py-2 rounded-full hover:bg-yellow-600 transition font-semibold"
              >
                ✏️ Edit Profile
              </Link>
              <button
                onClick={handleLogout}
                className="bg-gray-600 text-white px-6 py-2 rounded-full hover:bg-gray-700 transition font-semibold"
              >
                Logout
              </button>
            </div>
          </div>

          {/* Name & Title */}
          <div className="mt-4">
            <h1 className="text-3xl font-bold text-gray-900">{user.name}</h1>
            <p className="text-xl text-gray-600 mt-1">
              {user.role === "job_seeker"
                ? "Job Seeker"
                : user.role === "employer"
                ? "Employer"
                : "Administrator"}
              {user.companyName && ` at ${user.companyName}`}
            </p>
            {user.country && (
              <p className="text-gray-500 mt-2 flex items-center gap-2">
                <span>📍</span> {user.country}
              </p>
            )}
            {user.email && (
              <p className="text-gray-500 mt-1 flex items-center gap-2">
                <span>✉️</span> {user.email}
              </p>
            )}
          </div>

          {/* Profile Completion Indicator for Job Seekers */}
          {user.role === "job_seeker" && (
            <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-200">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-gray-800">
                  Profile Completion
                </h3>
                <span
                  className={`text-2xl font-bold ${
                    isProfileComplete ? "text-green-600" : "text-primary"
                  }`}
                >
                  {completionPercentage}%
                </span>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-gray-200 rounded-full h-3 mb-3 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    isProfileComplete
                      ? "bg-gradient-to-r from-green-500 to-green-600"
                      : "bg-gradient-to-r from-primary to-yellow-500"
                  }`}
                  style={{ width: `${completionPercentage}%` }}
                ></div>
              </div>

              {/* Status Message */}
              {isProfileComplete ? (
                <p className="text-sm text-green-700 font-medium flex items-center gap-2">
                  <span>✅</span> Your profile is 100% complete! You can now
                  apply for jobs.
                </p>
              ) : (
                <div>
                  <p className="text-sm text-gray-700 mb-2">
                    Complete your profile to start applying for jobs:
                  </p>
                  <ul className="text-sm text-gray-600 space-y-1">
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
                    className="inline-block mt-3 text-primary hover:underline font-semibold text-sm"
                  >
                    Complete your profile →
                  </Link>
                </div>
              )}
            </div>
          )}

          {/* Bio */}
          {user.bio && (
            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <h3 className="font-semibold text-gray-700 mb-2">About</h3>
              <p className="text-gray-700 leading-relaxed">{user.bio}</p>
            </div>
          )}

          {/* Resume Download */}
          {user.resumeUrl && (
            <div className="mt-4">
              <a
                href={user.resumeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-primary hover:underline font-semibold"
              >
                📄 View Resume/CV
              </a>
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions - Job Seeker */}
      {user.role === "job_seeker" && (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-bold mb-4">Quick Actions</h2>
          <div className="grid md:grid-cols-3 gap-4">
            <Link
              to="/jobs"
              className="p-4 border rounded-lg hover:border-primary hover:bg-primary/5 transition text-center"
            >
              <div className="text-3xl mb-2">🔍</div>
              <h3 className="font-semibold">Browse Jobs</h3>
            </Link>
            <Link
              to="/my-jobs"
              className="p-4 border rounded-lg hover:border-primary hover:bg-primary/5 transition text-center"
            >
              <div className="text-3xl mb-2">📋</div>
              <h3 className="font-semibold">My Applications</h3>
            </Link>
            <Link
              to="/ai-matching"
              className="p-4 border rounded-lg hover:border-primary hover:bg-primary/5 transition text-center"
            >
              <div className="text-3xl mb-2">🤖</div>
              <h3 className="font-semibold">AI Job Matching</h3>
            </Link>
          </div>
        </div>
      )}

      {/* Quick Actions - Employer */}
      {user.role === "employer" && (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-bold mb-4">Quick Actions</h2>
          <div className="grid md:grid-cols-3 gap-4">
            <Link
              to="/post-job"
              className="p-4 border rounded-lg hover:border-primary hover:bg-primary/5 transition text-center"
            >
              <div className="text-3xl mb-2">➕</div>
              <h3 className="font-semibold">Post a Job</h3>
            </Link>
            <Link
              to="/employer-dashboard"
              className="p-4 border rounded-lg hover:border-primary hover:bg-primary/5 transition text-center"
            >
              <div className="text-3xl mb-2">📊</div>
              <h3 className="font-semibold">Manage Applications</h3>
            </Link>
            <Link
              to="/jobs"
              className="p-4 border rounded-lg hover:border-primary hover:bg-primary/5 transition text-center"
            >
              <div className="text-3xl mb-2">👥</div>
              <h3 className="font-semibold">Find Candidates</h3>
            </Link>
          </div>
        </div>
      )}

      {/* Education */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Education</h2>
          <Link to="/profile" className="text-primary hover:underline text-sm">
            + Add Education
          </Link>
        </div>
        {Array.isArray(user.education) && user.education.length > 0 ? (
          <ul className="space-y-4">
            {user.education.map((edu, idx) => (
              <li key={idx} className="border rounded p-4">
                <div className="font-semibold text-secondary">
                  {edu.school || "School"}
                </div>
                <div className="text-gray-700">
                  {[edu.degree, edu.field].filter(Boolean).join(" • ") ||
                    "Degree / Field"}
                </div>
                {(edu.startYear || edu.endYear) && (
                  <div className="text-sm text-gray-500">
                    {edu.startYear || "—"} – {edu.endYear || "—"}
                  </div>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-gray-500 text-center py-8">
            Add your education details to complete your profile
          </p>
        )}
      </div>

      {/* Work Experience */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Work Experience</h2>
          <Link to="/profile" className="text-primary hover:underline text-sm">
            + Add Experience
          </Link>
        </div>
        {Array.isArray(user.experience) && user.experience.length > 0 ? (
          <ul className="space-y-4">
            {user.experience.map((exp, idx) => (
              <li key={idx} className="border rounded p-4">
                <div className="font-semibold text-secondary">
                  {exp.position || "Position"}
                </div>
                <div className="text-gray-700">
                  {exp.company || "Company"}
                  {exp.location ? ` • ${exp.location}` : ""}
                </div>
                {(exp.startDate || exp.endDate) && (
                  <div className="text-sm text-gray-500">
                    {exp.startDate || "—"} – {exp.endDate || "—"}
                  </div>
                )}
                {exp.description && (
                  <p className="text-gray-700 mt-2 whitespace-pre-line">
                    {exp.description}
                  </p>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-gray-500 text-center py-8">
            Add your work experience to complete your profile
          </p>
        )}
      </div>

      {/* Skills */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Skills</h2>
          <Link to="/profile" className="text-primary hover:underline text-sm">
            + Add Skills
          </Link>
        </div>
        {Array.isArray(user.skills) && user.skills.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {user.skills.map((skill, idx) => (
              <span
                key={idx}
                className="inline-block bg-primary/10 text-primary border border-primary/30 px-3 py-1 rounded-full text-sm font-medium"
              >
                {skill}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 text-center py-8">
            Add your skills to help employers find you
          </p>
        )}
      </div>
    </div>
  );
};

export default ProfileView;
