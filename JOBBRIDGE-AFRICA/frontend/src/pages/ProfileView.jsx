import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";

const PROFILE_TABS = [
  { id: "overview", label: "Overview" },
  { id: "experience", label: "Experience" },
  { id: "education", label: "Education" },
  { id: "skills", label: "Skills" },
  { id: "resume", label: "Resume Management" },
];

const ProfileView = () => {
  const { user, logout, refreshUser } = useAuth();
  const navigate = useNavigate();
  const resumeInput = useRef(null);
  const [activeTab, setActiveTab] = useState("overview");
  const [resumeOpen, setResumeOpen] = useState(false);
  const [uploadingResume, setUploadingResume] = useState(false);
  const [resumeError, setResumeError] = useState("");

  useEffect(() => {
    if (!resumeOpen) return undefined;
    const handleKeyDown = (event) => {
      if (event.key === "Escape") setResumeOpen(false);
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [resumeOpen]);

  if (!user) {
    return (
      <div className="mx-auto max-w-7xl p-8 text-center">
        <h2 className="mb-4 text-2xl font-bold">Please log in to view your profile</h2>
        <Link to="/login" className="text-primary hover:underline">Go to Login</Link>
      </div>
    );
  }

  const isJobSeeker = user.role === "job_seeker";
  const completionFields = [
    Boolean(user.profileImageUrl),
    Boolean(user.resumeUrl),
    Boolean(user.country),
    Boolean(user.bio),
    Boolean(user.education?.length),
    Boolean(user.experience?.length),
    Boolean(user.skills?.length),
  ];
  const completionPercentage = isJobSeeker
    ? Math.round((completionFields.filter(Boolean).length / completionFields.length) * 100)
    : 100;
  const resumeIsPdf = /\.pdf(?:$|[?#])/i.test(user.resumeUrl || "");

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/login");
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const handleResumeUpload = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!/\.(pdf|doc|docx)$/i.test(file.name)) {
      setResumeError("Choose a PDF, DOC, or DOCX file.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setResumeError("Resume files must be 10 MB or smaller.");
      return;
    }

    setUploadingResume(true);
    setResumeError("");
    try {
      const formData = new FormData();
      formData.append("resume", file);
      await api.post("/auth/upload-resume", formData);
      const refreshedUser = await refreshUser();
      if (!refreshedUser) {
        setResumeError("Your resume was uploaded, but your profile could not refresh. Reload the page to view it.");
      }
    } catch (error) {
      console.error("Resume upload failed:", error);
      setResumeError(
        error.response?.data?.message || error.message || "Resume upload failed. Please try again.",
      );
    } finally {
      setUploadingResume(false);
    }
  };

  const renderExperience = () => (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Experience</h2>
          <p className="mt-1 text-sm text-slate-500">Your professional journey and impact.</p>
        </div>
        <Link to="/profile" className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold hover:bg-slate-50">
          Edit experience
        </Link>
      </div>
      {user.experience?.length ? (
        <div className="space-y-4">
          {user.experience.map((experience, index) => (
            <article key={`${experience.company}-${experience.position}-${index}`} className="border-l-2 border-amber-400 pl-4">
              <h3 className="font-semibold text-slate-900">{experience.position || "Position"}</h3>
              <p className="mt-1 text-slate-700">
                {experience.company || "Company"}{experience.location ? ` · ${experience.location}` : ""}
              </p>
              {(experience.startDate || experience.endDate) && (
                <p className="mt-1 text-sm text-slate-500">
                  {experience.startDate || "—"} – {experience.endDate || "Present"}
                </p>
              )}
              {experience.description && (
                <p className="mt-3 whitespace-pre-line text-sm leading-6 text-slate-600">{experience.description}</p>
              )}
            </article>
          ))}
        </div>
      ) : (
        <EmptyState text="Add your work history to help employers understand your experience." />
      )}
    </section>
  );

  const renderEducation = () => (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Education</h2>
          <p className="mt-1 text-sm text-slate-500">Academic qualifications and professional learning.</p>
        </div>
        <Link to="/profile" className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold hover:bg-slate-50">
          Edit education
        </Link>
      </div>
      {user.education?.length ? (
        <div className="space-y-4">
          {user.education.map((education, index) => (
            <article key={`${education.school}-${education.degree}-${index}`} className="rounded-xl border border-slate-200 p-4">
              <h3 className="font-semibold text-slate-900">{education.school || "School"}</h3>
              <p className="mt-1 text-slate-700">
                {[education.degree, education.field].filter(Boolean).join(" · ") || "Degree / Field"}
              </p>
              {(education.startYear || education.endYear) && (
                <p className="mt-1 text-sm text-slate-500">{education.startYear || "—"} – {education.endYear || "—"}</p>
              )}
            </article>
          ))}
        </div>
      ) : (
        <EmptyState text="Add your education to complete your professional profile." />
      )}
    </section>
  );

  const renderSkills = () => (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Skills</h2>
          <p className="mt-1 text-sm text-slate-500">The expertise you bring to your next opportunity.</p>
        </div>
        <Link to="/profile" className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold hover:bg-slate-50">
          Edit skills
        </Link>
      </div>
      {user.skills?.length ? (
        <div className="flex flex-wrap gap-2">
          {user.skills.map((skill, index) => (
            <span key={`${skill}-${index}`} className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-sm font-medium text-amber-900">
              {skill}
            </span>
          ))}
        </div>
      ) : (
        <EmptyState text="Add relevant skills to improve your visibility in candidate searches." />
      )}
    </section>
  );

  const renderResume = () => (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-5">
        <h2 className="text-xl font-bold text-slate-900">Resume management</h2>
        <p className="mt-1 text-sm text-slate-500">Keep the document you share with employers up to date.</p>
      </div>
      {user.resumeUrl ? (
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <div className="flex items-center gap-3">
            <span aria-hidden="true" className="flex h-11 w-11 items-center justify-center rounded-lg bg-white text-xl shadow-sm">📄</span>
            <div>
              <p className="font-semibold text-slate-900">Resume / CV uploaded</p>
              <button type="button" onClick={() => setResumeOpen(true)} className="mt-1 text-sm font-medium text-amber-800 underline underline-offset-2">
                Preview document
              </button>
            </div>
          </div>
          <button type="button" onClick={() => resumeInput.current?.click()} disabled={uploadingResume} className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700 disabled:opacity-60">
            {uploadingResume ? "Uploading…" : "Replace CV"}
          </button>
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center">
          <p className="font-semibold text-slate-800">No resume uploaded yet</p>
          <p className="mt-1 text-sm text-slate-500">Upload a PDF or Word document (maximum 10 MB).</p>
          <button type="button" onClick={() => resumeInput.current?.click()} disabled={uploadingResume} className="mt-4 rounded-lg bg-amber-500 px-4 py-2 font-semibold text-slate-950 hover:bg-amber-400 disabled:opacity-60">
            {uploadingResume ? "Uploading…" : "Upload resume"}
          </button>
        </div>
      )}
      {resumeError && <p role="alert" className="mt-3 text-sm text-red-700">{resumeError}</p>}
      <input
        ref={resumeInput}
        type="file"
        accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        onChange={handleResumeUpload}
        className="hidden"
      />
    </section>
  );

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:py-10">
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="h-28 bg-gradient-to-r from-slate-900 via-slate-800 to-amber-600 sm:h-36" />
        <div className="px-5 pb-6 sm:px-8">
          <div className="-mt-12 flex flex-wrap items-end justify-between gap-4">
            <div className="flex items-end gap-4">
              <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-2xl border-4 border-white bg-amber-50 text-4xl shadow-sm">
                {user.profileImageUrl ? (
                  <img src={user.profileImageUrl} alt="" className="h-full w-full object-cover" />
                ) : <span aria-hidden="true">👤</span>}
              </div>
              <div className="pb-1">
                <h1 className="text-2xl font-bold text-slate-950 sm:text-3xl">{user.name}</h1>
                <p className="mt-1 text-sm text-slate-600">
                  {isJobSeeker ? "Job seeker" : user.role === "employer" ? "Employer" : "Administrator"}
                  {user.companyName ? ` · ${user.companyName}` : ""}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link to="/profile" className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-amber-400">
                Edit profile
              </Link>
              <button type="button" onClick={handleLogout} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                Log out
              </button>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm text-slate-600">
            {user.country && <span>📍 {user.country}</span>}
            {user.email && <span>✉ {user.email}</span>}
          </div>
          {isJobSeeker && (
            <div className="mt-6 rounded-xl bg-slate-50 p-4">
              <div className="mb-2 flex items-center justify-between gap-4">
                <p className="text-sm font-semibold text-slate-800">Profile completeness</p>
                <span className="text-sm font-bold text-slate-900">{completionPercentage}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-slate-200">
                <div className="h-full rounded-full bg-amber-500 transition-all" style={{ width: `${completionPercentage}%` }} />
              </div>
            </div>
          )}
        </div>
      </section>

      {isJobSeeker ? (
        <>
          <nav aria-label="Profile sections" className="mt-6 overflow-x-auto border-b border-slate-200">
            <div role="tablist" className="flex min-w-max gap-1">
              {PROFILE_TABS.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={activeTab === tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`border-b-2 px-4 py-3 text-sm font-semibold transition ${
                    activeTab === tab.id
                      ? "border-amber-500 text-slate-950"
                      : "border-transparent text-slate-500 hover:text-slate-900"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </nav>
          <div className="mt-5" role="tabpanel">
            {activeTab === "overview" && (
              <section className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_18rem]">
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <div className="flex items-center justify-between gap-4">
                    <h2 className="text-xl font-bold text-slate-900">About</h2>
                    <Link to="/profile" className="text-sm font-semibold text-amber-800 hover:underline">Edit profile</Link>
                  </div>
                  <p className="mt-4 whitespace-pre-line leading-7 text-slate-700">
                    {user.bio || "Add a concise introduction about your experience, strengths, and career goals."}
                  </p>
                  {user.resumeUrl && (
                    <button type="button" onClick={() => setResumeOpen(true)} className="mt-5 inline-flex items-center gap-2 font-semibold text-amber-800 hover:underline">
                      📄 View Resume/CV
                    </button>
                  )}
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <h2 className="text-lg font-bold text-slate-900">Profile at a glance</h2>
                  <dl className="mt-4 space-y-3 text-sm">
                    <div><dt className="text-slate-500">Experience</dt><dd className="font-semibold text-slate-800">{user.experience?.length || 0} roles</dd></div>
                    <div><dt className="text-slate-500">Education</dt><dd className="font-semibold text-slate-800">{user.education?.length || 0} entries</dd></div>
                    <div><dt className="text-slate-500">Skills</dt><dd className="font-semibold text-slate-800">{user.skills?.length || 0} skills</dd></div>
                    <div><dt className="text-slate-500">Resume</dt><dd className="font-semibold text-slate-800">{user.resumeUrl ? "Uploaded" : "Not uploaded"}</dd></div>
                  </dl>
                </div>
              </section>
            )}
            {activeTab === "experience" && renderExperience()}
            {activeTab === "education" && renderEducation()}
            {activeTab === "skills" && renderSkills()}
            {activeTab === "resume" && renderResume()}
          </div>
          <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900">Your next step</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <QuickAction to="/jobs" title="Browse jobs" description="Explore current opportunities" />
              <QuickAction to="/my-jobs" title="My applications" description="Track your applications" />
              <QuickAction to="/ai-matching" title="AI job matching" description="Find roles that fit your profile" />
            </div>
          </section>
        </>
      ) : (
        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-bold text-slate-900">Account overview</h2>
          <p className="mt-2 text-slate-600">{user.bio || "Manage your account details and professional information."}</p>
          <div className="mt-5 flex flex-wrap gap-3">
            {user.role === "employer" && <QuickAction to="/post-job" title="Post a job" description="Reach qualified candidates" />}
            <QuickAction to="/dashboard" title="Open dashboard" description="Manage your JobBridge account" />
          </div>
        </section>
      )}

      {resumeOpen && user.resumeUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setResumeOpen(false);
          }}
        >
          <section role="dialog" aria-modal="true" aria-labelledby="resume-dialog-title" tabIndex={-1} className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
            <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
              <div>
                <h2 id="resume-dialog-title" className="font-bold text-slate-900">Resume / CV</h2>
                <p className="text-sm text-slate-500">Preview or replace the document attached to your profile.</p>
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={() => resumeInput.current?.click()} disabled={uploadingResume} className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-amber-400 disabled:opacity-60">
                  {uploadingResume ? "Uploading…" : "Replace CV"}
                </button>
                <button type="button" onClick={() => setResumeOpen(false)} aria-label="Close resume preview" className="rounded-lg border border-slate-300 px-3 py-2 text-slate-700 hover:bg-slate-50">✕</button>
              </div>
            </header>
            {resumeError && <p role="alert" className="mx-5 mt-3 text-sm text-red-700">{resumeError}</p>}
            <div className="min-h-0 flex-1 bg-slate-100 p-3 sm:p-5">
              {resumeIsPdf ? (
                <iframe title="Uploaded resume preview" src={user.resumeUrl} className="h-[65vh] w-full rounded-lg border border-slate-300 bg-white" />
              ) : (
                <div className="flex h-full min-h-64 flex-col items-center justify-center rounded-lg border border-slate-200 bg-white p-8 text-center">
                  <span aria-hidden="true" className="text-4xl">📄</span>
                  <p className="mt-3 font-semibold text-slate-900">Word documents open in your document viewer</p>
                  <p className="mt-1 max-w-md text-sm text-slate-600">Preview is available for PDF files. Open this DOC/DOCX in a new tab or replace it with a PDF for an in-page preview.</p>
                  <a href={user.resumeUrl} target="_blank" rel="noopener noreferrer" className="mt-4 rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50">Open document</a>
                </div>
              )}
            </div>
          </section>
        </div>
      )}
    </main>
  );
};

const EmptyState = ({ text }) => (
  <p className="rounded-xl bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">{text}</p>
);

const QuickAction = ({ to, title, description }) => (
  <Link to={to} className="block rounded-xl border border-slate-200 p-4 transition hover:border-amber-400 hover:bg-amber-50/50">
    <h3 className="font-semibold text-slate-900">{title}</h3>
    <p className="mt-1 text-sm text-slate-500">{description}</p>
  </Link>
);

export default ProfileView;
