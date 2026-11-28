import { useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";
import RecommendedRoles from "../components/RecommendedRoles";

const PROFILE_TABS = [
  { id: "overview", label: "Overview" },
  { id: "experience", label: "Experience" },
  { id: "education", label: "Education" },
  { id: "skills", label: "Skills" },
  { id: "credentials", label: "Certifications & Projects" },
  { id: "preferences", label: "Work Preferences" },
  { id: "resume", label: "Resume Management" },
];

const countEntries = (value) => (
  Array.isArray(value)
    ? value.length
    : value && typeof value === "object"
      ? Object.keys(value).length
      : 0
);
const countUniqueSkills = (user) => new Set([
  ...(Array.isArray(user.skills) ? user.skills : []),
  ...Object.values(user.skillGroups || {}).flatMap((skills) => Array.isArray(skills) ? skills : []),
].filter((skill) => typeof skill === "string" && skill.trim()).map((skill) => skill.trim().toLowerCase())).size;

const ProfileView = () => {
  const { user, logout, refreshUser, deleteAccount } = useAuth();
  const navigate = useNavigate();
  const resumeInput = useRef(null);
  const [activeTab, setActiveTab] = useState("overview");
  const [resumePreviewOpen, setResumePreviewOpen] = useState(false);
  const [uploadingResume, setUploadingResume] = useState(false);
  const [resumeError, setResumeError] = useState("");
  const [deleteAccountOpen, setDeleteAccountOpen] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [deleteAccountError, setDeleteAccountError] = useState("");
  const [deletingAccount, setDeletingAccount] = useState(false);

  if (!user) {
    return (
      <div className="mx-auto max-w-7xl p-8 text-center">
        <h2 className="mb-4 text-2xl font-bold">Please log in to view your profile</h2>
        <Link to="/login" className="text-primary hover:underline">Go to Login</Link>
      </div>
    );
  }

  const isJobSeeker = user.role === "job_seeker";
  const resumeViewUrl = api.getUri({ url: "/auth/resume" });
  const resumeDownloadUrl = api.getUri({
    url: "/auth/resume",
    params: { download: "1" },
  });
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
  const resumeIsPdf = user.resumeMimeType === "application/pdf"
    || /\.pdf(?:$|[?#])/i.test(user.resumeFileName || user.resumeUrl || "");

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/login");
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const handleDeleteAccount = async (event) => {
    event.preventDefault();
    if (deleteConfirmation !== "DELETE") return;

    setDeletingAccount(true);
    setDeleteAccountError("");
    try {
      const { message } = await deleteAccount();
      navigate("/login", {
        replace: true,
        state: { accountDeleted: true, message },
      });
    } catch (error) {
      setDeleteAccountError(
        error.response?.data?.message || "We couldn't delete your account. Please try again.",
      );
    } finally {
      setDeletingAccount(false);
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
      } else {
        setResumePreviewOpen(false);
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
                <ul className="mt-3 list-disc space-y-1 pl-5 text-sm leading-6 text-slate-600">
                  {experience.description.split(/\r?\n/).map((bullet) => bullet.trim()).filter(Boolean).map((bullet, bulletIndex) => <li key={`${bullet}-${bulletIndex}`}>{bullet.replace(/^(?:[-*•]|\d+[.)])\s*/, "")}</li>)}
                </ul>
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
      {(user.skillGroups && Object.values(user.skillGroups).some((skills) => skills?.length)) ? (
        <div className="space-y-4">
          {[["core", "Core / domain skills"], ["tools", "Tools / platforms"], ["technical", "Technical / analytics"]].map(([key, title]) => (
            <div key={key}>
              <h3 className="mb-2 text-sm font-semibold text-slate-700">{title}</h3>
              <div className="flex flex-wrap gap-2">
                {(user.skillGroups[key] || []).map((skill, index) => <span key={`${skill}-${index}`} className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-sm font-medium text-amber-900">{skill}</span>)}
              </div>
            </div>
          ))}
        </div>
      ) : user.skills?.length ? (
        <div className="flex flex-wrap gap-2">
          {user.skills.map((skill, index) => <span key={`${skill}-${index}`} className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-sm font-medium text-amber-900">{skill}</span>)}
        </div>
      ) : (
        <EmptyState text="Add relevant skills to improve your visibility in candidate searches." />
      )}
    </section>
  );

  const renderCredentials = () => (
    <div className="grid gap-5 lg:grid-cols-2">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-5 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Certifications &amp; training</h2>
            <p className="mt-1 text-sm text-slate-500">Programs and credentials, separate from employment.</p>
          </div>
          <Link to="/profile" className="text-sm font-semibold text-amber-800 hover:underline">Edit</Link>
        </div>
        {user.certifications?.length ? user.certifications.map((certification, index) => (
          <article key={`${certification.name}-${index}`} className="mb-3 rounded-xl border border-slate-200 p-4">
            <h3 className="font-semibold text-slate-900">{certification.name || "Certification"}</h3>
            <p className="mt-1 text-sm text-slate-600">{[certification.issuer, certification.issueDate].filter(Boolean).join(" · ")}</p>
            {certification.credentialUrl && <a href={certification.credentialUrl} target="_blank" rel="noopener noreferrer" className="mt-2 inline-block text-sm font-semibold text-amber-800 underline">View credential</a>}
          </article>
        )) : <EmptyState text="Add courses, programs, and certifications to show your ongoing learning." />}
      </section>
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-5 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Portfolio &amp; projects</h2>
            <p className="mt-1 text-sm text-slate-500">Showcase relevant work and outcomes.</p>
          </div>
          <Link to="/profile" className="text-sm font-semibold text-amber-800 hover:underline">Edit</Link>
        </div>
        {user.projects?.length ? user.projects.map((project, index) => (
          <article key={`${project.name}-${index}`} className="mb-3 rounded-xl border border-slate-200 p-4">
            <h3 className="font-semibold text-slate-900">{project.name || "Project"}</h3>
            {project.description && <p className="mt-2 whitespace-pre-line text-sm leading-6 text-slate-600">{project.description}</p>}
            {project.url && <a href={project.url} target="_blank" rel="noopener noreferrer" className="mt-2 inline-block text-sm font-semibold text-amber-800 underline">View project</a>}
          </article>
        )) : <EmptyState text="Add portfolio links or projects related to your target roles." />}
      </section>
    </div>
  );

  const renderPreferences = () => (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-5 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Work preferences</h2>
          <p className="mt-1 text-sm text-slate-500">Your preferred roles, locations, and work arrangements.</p>
        </div>
        <Link to="/profile" className="text-sm font-semibold text-amber-800 hover:underline">Edit preferences</Link>
      </div>
      <dl className="grid gap-4 sm:grid-cols-2">
        <div><dt className="text-sm text-slate-500">Work arrangement</dt><dd className="mt-1 font-medium text-slate-900">{user.workPreferences?.workModes?.join(", ") || "Not specified"}</dd></div>
        <div><dt className="text-sm text-slate-500">Target roles</dt><dd className="mt-1 font-medium text-slate-900">{user.workPreferences?.targetRoles?.join(", ") || "Not specified"}</dd></div>
        <div><dt className="text-sm text-slate-500">Preferred locations</dt><dd className="mt-1 font-medium text-slate-900">{user.workPreferences?.preferredLocations?.join(", ") || "Not specified"}</dd></div>
        <div><dt className="text-sm text-slate-500">Relocation</dt><dd className="mt-1 font-medium text-slate-900">{user.workPreferences?.willingToRelocate ? "Open to relocation" : "Not specified"}</dd></div>
      </dl>
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
              <p className="font-semibold text-slate-900">{user.resumeFileName || "Resume / CV uploaded"}</p>
              <button type="button" onClick={() => setResumePreviewOpen((open) => !open)} aria-expanded={resumePreviewOpen} className="mt-1 text-sm font-medium text-amber-800 underline underline-offset-2">
                {resumePreviewOpen ? "Hide preview" : "Preview document"}
              </button>
            </div>
          </div>
          <button type="button" onClick={() => resumeInput.current?.click()} disabled={uploadingResume} className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700 disabled:opacity-60">
            {uploadingResume ? "Uploading…" : "Replace CV"}
          </button>
          <div className="flex w-full flex-wrap gap-4 border-t border-slate-200 pt-4">
            <a href={resumeViewUrl} target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-amber-800 underline">
              View resume
            </a>
            <a href={resumeDownloadUrl} className="text-sm font-semibold text-amber-800 underline">
              Download original
            </a>
          </div>
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
      {resumePreviewOpen && user.resumeUrl && (
        <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-3 sm:p-5">
          <div className="mb-3 flex items-center justify-between gap-3">
            <p className="text-sm font-semibold text-slate-800">Resume preview</p>
            <a href={resumeViewUrl} target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-amber-800 underline">Open in new tab</a>
          </div>
          {resumeIsPdf
            ? <iframe title="Uploaded resume preview" src={resumeViewUrl} loading="lazy" className="h-[70vh] min-h-96 w-full rounded-lg border border-slate-300 bg-white" />
            : <p className="rounded-lg bg-white p-4 text-sm text-slate-700">This Word document opens in a new tab; in-page preview is available for PDF files.</p>}
        </div>
      )}
    </section>
  );

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:py-10">
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="h-28 bg-gradient-to-r from-slate-900 via-slate-800 to-amber-600 sm:h-36" />
        <div className="px-5 pb-6 pt-5 sm:px-8">
          <div className="flex flex-wrap items-center justify-between gap-5">
            <div className="flex min-w-0 items-center gap-4">
              <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-amber-50 text-4xl shadow-sm sm:h-24 sm:w-24">
                {user.profileImageUrl ? (
                  <img src={user.profileImageUrl} alt="" className="h-full w-full object-cover" />
                ) : <span aria-hidden="true">👤</span>}
              </div>
              <div className="min-w-0">
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
          <div className="mt-6">
            <RecommendedRoles />
          </div>
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
                    {user.bio || "Add a professional summary of your experience, strengths, and career goals."}
                  </p>
                  {user.resumeUrl && (
                    <button type="button" onClick={() => { setActiveTab("resume"); setResumePreviewOpen(true); }} className="mt-5 inline-flex items-center gap-2 font-semibold text-amber-800 hover:underline">
                    📄 Preview Resume/CV
                    </button>
                  )}
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <h2 className="text-lg font-bold text-slate-900">Profile at a glance</h2>
                  <dl className="mt-4 space-y-3 text-sm">
                    <div><dt className="text-slate-500">Experience</dt><dd className="font-semibold text-slate-800">{countEntries(user.experience)} {countEntries(user.experience) === 1 ? "role" : "roles"}</dd></div>
                    <div><dt className="text-slate-500">Education</dt><dd className="font-semibold text-slate-800">{countEntries(user.education)} {countEntries(user.education) === 1 ? "entry" : "entries"}</dd></div>
                    <div><dt className="text-slate-500">Skills</dt><dd className="font-semibold text-slate-800">{countUniqueSkills(user)} {countUniqueSkills(user) === 1 ? "skill" : "skills"}</dd></div>
                    <div><dt className="text-slate-500">Resume</dt><dd className="font-semibold text-slate-800">{user.resumeUrl ? "1 document uploaded" : "0 documents uploaded"}</dd></div>
                  </dl>
                </div>
              </section>
            )}
            {activeTab === "experience" && renderExperience()}
            {activeTab === "education" && renderEducation()}
            {activeTab === "skills" && renderSkills()}
            {activeTab === "credentials" && renderCredentials()}
            {activeTab === "preferences" && renderPreferences()}
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
          <section className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-6">
            <h2 className="text-lg font-bold text-red-950">Danger Zone</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-red-900">
              Deleting your account removes your profile, CV files, tailored CVs, external application tracker entries, and job alerts. Submitted applications remain only as anonymized employer records; your cover letters and attached CVs are removed.
            </p>
            <button
              type="button"
              onClick={() => {
                setDeleteConfirmation("");
                setDeleteAccountError("");
                setDeleteAccountOpen(true);
              }}
              className="mt-4 rounded-lg bg-red-700 px-4 py-2 font-semibold text-white hover:bg-red-800"
            >
              Delete account
            </button>
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

      {deleteAccountOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/60 p-4">
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-account-title"
            className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl"
          >
            <h2 id="delete-account-title" className="text-2xl font-bold text-red-900">
              Permanently delete your account?
            </h2>
            <p className="mt-3 text-sm leading-6 text-slate-700">
              This action cannot be undone. Type <strong>DELETE</strong> to confirm. Your submitted application history will be retained only in anonymized form.
            </p>
            {deleteAccountError && (
              <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-800">
                {deleteAccountError}
              </p>
            )}
            <form onSubmit={handleDeleteAccount} className="mt-5 space-y-4">
              <label htmlFor="delete-account-confirmation" className="block text-sm font-semibold text-slate-800">
                Confirmation
                <input
                  id="delete-account-confirmation"
                  value={deleteConfirmation}
                  onChange={(event) => setDeleteConfirmation(event.target.value)}
                  autoComplete="off"
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                />
              </label>
              <div className="flex flex-wrap justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setDeleteAccountOpen(false)}
                  disabled={deletingAccount}
                  className="rounded-lg border border-slate-300 px-4 py-2 font-semibold text-slate-700 disabled:opacity-60"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={deleteConfirmation !== "DELETE" || deletingAccount}
                  className="rounded-lg bg-red-700 px-4 py-2 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {deletingAccount ? "Deleting account…" : "Permanently delete account"}
                </button>
              </div>
            </form>
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
