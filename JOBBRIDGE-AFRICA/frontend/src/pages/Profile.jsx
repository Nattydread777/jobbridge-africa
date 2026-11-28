import { useState, useEffect, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate, Link } from "react-router-dom";
import api from "../services/api";
import africaLocations from "../data/jobLocations";
import {
  extractResumeText,
  mapParsedResumeToProfile,
  parseResumeText,
} from "../utils/resumeParser";

// Common skills database for AI matching
const COMMON_SKILLS = [
  // Programming Languages
  "JavaScript",
  "Python",
  "Java",
  "C++",
  "C#",
  "PHP",
  "Ruby",
  "Swift",
  "Kotlin",
  "TypeScript",
  "Go",
  "Rust",
  "Scala",
  "R",
  "MATLAB",
  "Perl",
  "HTML",
  "CSS",
  "SQL",
  // Frameworks & Libraries
  "React",
  "Angular",
  "Vue.js",
  "Node.js",
  "Express.js",
  "Django",
  "Flask",
  "Spring Boot",
  "Laravel",
  "Ruby on Rails",
  "ASP.NET",
  "Next.js",
  "Nuxt.js",
  "jQuery",
  "Bootstrap",
  "Tailwind CSS",
  // Databases
  "MongoDB",
  "MySQL",
  "PostgreSQL",
  "SQLite",
  "Oracle",
  "Redis",
  "Cassandra",
  "DynamoDB",
  "Firebase",
  "Elasticsearch",
  // Cloud & DevOps
  "AWS",
  "Azure",
  "Google Cloud",
  "Docker",
  "Kubernetes",
  "Jenkins",
  "Git",
  "GitHub",
  "GitLab",
  "CI/CD",
  "Terraform",
  "Ansible",
  "Linux",
  "Nginx",
  "Apache",
  // Data Science & AI
  "Machine Learning",
  "Deep Learning",
  "TensorFlow",
  "PyTorch",
  "Scikit-learn",
  "Pandas",
  "NumPy",
  "Data Analysis",
  "Data Analytics",
  "Data Visualization",
  "NLP",
  "Computer Vision",
  "Big Data",
  // Mobile Development
  "React Native",
  "Flutter",
  "iOS Development",
  "Android Development",
  "Xamarin",
  // Design
  "UI/UX Design",
  "Figma",
  "Adobe XD",
  "Sketch",
  "Photoshop",
  "Illustrator",
  "InDesign",
  "Wireframing",
  "Prototyping",
  "Graphic Design",
  // Business & Management
  "Project Management",
  "Agile",
  "Scrum",
  "Kanban",
  "Product Management",
  "Business Analysis",
  "Strategic Planning",
  "Leadership",
  "Team Management",
  "Stakeholder Management",
  // Marketing & Sales
  "Digital Marketing",
  "SEO",
  "SEM",
  "Content Marketing",
  "Social Media Marketing",
  "Email Marketing",
  "Google Analytics",
  "Marketing Strategy",
  "Sales",
  "CRM",
  // Finance & Accounting
  "Financial Analysis",
  "Accounting",
  "Budgeting",
  "Financial Modeling",
  "Excel",
  "QuickBooks",
  "SAP",
  "Auditing",
  "Tax Preparation",
  // Soft Skills
  "Communication",
  "Problem Solving",
  "Critical Thinking",
  "Teamwork",
  "Time Management",
  "Adaptability",
  "Creativity",
  "Attention to Detail",
  "Customer Service",
  "Negotiation",
  "Public Speaking",
  "Writing",
  "Research",
  // Other Technical
  "Cybersecurity",
  "Network Administration",
  "IT Support",
  "Quality Assurance",
  "Testing",
  "REST API",
  "GraphQL",
  "Microservices",
  "Blockchain",
  "IoT",
  "AR/VR",
];

const SKILL_GROUPS = [
  ["core", "Core / domain skills"],
  ["tools", "Tools / platforms"],
  ["technical", "Technical / analytics"],
];
const PROFILE_SECTIONS = [
  ["basic", "Overview"],
  ["experience", "Experience"],
  ["education", "Education"],
  ["skills", "Skills"],
  ["credentials", "Certifications & Projects"],
  ["preferences", "Work Preferences"],
  ["resume", "Resume Management"],
  ["photo", "Profile Photo"],
  ["alerts", "Job Alerts"],
];
const uniqueValues = (values) => [...new Set((values || [])
  .filter((value) => typeof value === "string" && value.trim())
  .map((value) => value.trim()))];
const normalizeSkillGroups = (groups = {}, skills = []) => {
  const normalized = {
    core: uniqueValues(groups.core),
    tools: uniqueValues(groups.tools),
    technical: uniqueValues(groups.technical),
  };
  const known = new Set(Object.values(normalized).flat().map((skill) => skill.toLowerCase()));
  normalized.core = uniqueValues([
    ...normalized.core,
    ...skills.filter((skill) => !known.has(String(skill).toLowerCase())),
  ]);
  return normalized;
};
const emptyWorkPreferences = () => ({
  workModes: [],
  targetRoles: [],
  preferredLocations: [],
  willingToRelocate: false,
});
const commaSeparatedValues = (value) => uniqueValues(value.split(","));
const normalizeProfileItems = (items) => (Array.isArray(items) ? items : [])
  .filter((item) => item && typeof item === "object")
  .map((item) => Object.fromEntries(Object.entries(item).map(([key, value]) => [
    key,
    typeof value === "string" ? value.trim() : value,
  ])))
  .filter((item) => Object.values(item).some((value) => (
    typeof value === "string" ? value.length > 0 : value !== undefined && value !== null
  )));
const profileStateFromUser = (source = {}) => ({
  name: source.name || "",
  email: source.email || "",
  phone: source.phone || "",
  country: source.country || "",
  bio: source.bio || "",
  skills: uniqueValues(source.skills || []),
  skillGroups: normalizeSkillGroups(source.skillGroups, source.skills),
  education: normalizeProfileItems(source.education),
  experience: normalizeProfileItems(source.experience),
  certifications: normalizeProfileItems(source.certifications),
  projects: normalizeProfileItems(source.projects),
  workPreferences: { ...emptyWorkPreferences(), ...(source.workPreferences || {}) },
  languages: source.languages || [],
});

const Profile = () => {
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();
  const resumeInputRef = useRef(null);
  const profileImageInputRef = useRef(null);
  const [activeTab, setActiveTab] = useState("basic");
  const [resumeFile, setResumeFile] = useState(null);
  const [profileImagePreview, setProfileImagePreview] = useState(
    user?.profileImageUrl || null
  );
  const [uploadingImage, setUploadingImage] = useState(false);

  // Job Seeker Profile State
  const [profile, setProfile] = useState({
    name: user?.name || "",
    email: user?.email || "",
    phone: "",
    country: user?.country || "",
    bio: user?.bio || "",
    skills: [],
    skillGroups: normalizeSkillGroups(),
    education: [],
    experience: [],
    certifications: [],
    projects: [],
    workPreferences: emptyWorkPreferences(),
    languages: [],
  });

  const [newSkill, setNewSkill] = useState("");
  const [newSkillGroup, setNewSkillGroup] = useState("core");
  const [skillSuggestions, setSkillSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [emailNotifications, setEmailNotifications] = useState(false);
  const [jobAlertStatus, setJobAlertStatus] = useState(null);
  const [jobAlertSubmitting, setJobAlertSubmitting] = useState(false);
  const [jobDigestPreferences, setJobDigestPreferences] = useState({ enabled: false, frequency: "daily" });
  const [jobDigestStatus, setJobDigestStatus] = useState(null);
  const [jobDigestSubmitting, setJobDigestSubmitting] = useState(false);
  const [profileSaveStatus, setProfileSaveStatus] = useState(null);
  const [profileSaving, setProfileSaving] = useState(false);
  const [targetRolesText, setTargetRolesText] = useState("");
  const [preferredLocationsText, setPreferredLocationsText] = useState("");
  const [parsing, setParsing] = useState(false);

  // Load user data into profile state when user changes
  useEffect(() => {
    if (user) {
      setProfile(profileStateFromUser(user));
      setTargetRolesText((user.workPreferences?.targetRoles || []).join(", "));
      setPreferredLocationsText((user.workPreferences?.preferredLocations || []).join(", "));
      setJobDigestPreferences({
        enabled: Boolean(user.jobAlertPreferences?.enabled),
        frequency: user.jobAlertPreferences?.frequency || "daily",
      });
    }
  }, [user]);

  const handleResumeUpload = async (e) => {
    const file = e.target.files[0];
    if (file) {
      setResumeFile(file);
      setParsing(true);

      try {
        const extension = file.name.split(".").pop()?.toLowerCase();
        let resumeText;
        if (extension === "doc") {
          const formData = new FormData();
          formData.append("resume", file);
          const { data } = await api.post("/auth/parse-legacy-resume", formData);
          resumeText = data.text;
        } else {
          resumeText = await extractResumeText(file);
        }
        const parsedData = parseResumeText(resumeText);
        const nextProfile = mapParsedResumeToProfile(parsedData, profile, africaLocations);
        setProfile(nextProfile);
        setTargetRolesText((nextProfile.workPreferences.targetRoles || []).join(", "));
        setPreferredLocationsText((nextProfile.workPreferences.preferredLocations || []).join(", "));
        const formData = new FormData();
        formData.append("resume", file);
        await api.post("/auth/upload-resume", formData);
        const { data: savedProfile } = await api.put("/auth/profile", {
          name: nextProfile.name,
          email: nextProfile.email,
          phone: nextProfile.phone,
          country: nextProfile.country,
          bio: nextProfile.bio,
          skills: nextProfile.skills,
          skillGroups: nextProfile.skillGroups,
          education: normalizeProfileItems(nextProfile.education),
          experience: normalizeProfileItems(nextProfile.experience),
          certifications: normalizeProfileItems(nextProfile.certifications),
          projects: normalizeProfileItems(nextProfile.projects),
          workPreferences: nextProfile.workPreferences,
        });
        const refreshedUser = await refreshUser();
        const saved = refreshedUser || savedProfile;
        setProfile(profileStateFromUser(saved));
        setTargetRolesText((saved.workPreferences?.targetRoles || []).join(", "));
        setPreferredLocationsText((saved.workPreferences?.preferredLocations || []).join(", "));
        setResumeFile(null);
        if (resumeInputRef.current) resumeInputRef.current.value = "";
        setActiveTab("basic");
        alert("Resume uploaded. Readable profile details were extracted and saved across your profile sections.");
      } catch (error) {
        console.error("Error uploading resume:", error);
        alert(error.response?.data?.message || error.message || "Failed to upload or read resume");
        setResumeFile(null);
        if (resumeInputRef.current) resumeInputRef.current.value = "";
        setParsing(false);
        return;
      }
      setParsing(false);
    }
  };

  // Handle profile photo upload
  const handleProfileImageUpload = async (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file type
      const allowedTypes = [
        "image/jpeg",
        "image/jpg",
        "image/png",
        "image/webp",
      ];
      if (!allowedTypes.includes(file.type)) {
        alert("Please upload a JPG, PNG, or WebP image");
        return;
      }

      // Validate file size (2MB max for profile photos)
      if (file.size > 2 * 1024 * 1024) {
        alert("Image size must be less than 2MB");
        return;
      }

      const previewUrl = URL.createObjectURL(file);
      setProfileImagePreview(previewUrl);
      setUploadingImage(true);

      try {
        // Upload image to Cloudinary via backend
        const formData = new FormData();
        formData.append("profileImage", file);

        // Call backend to upload to Cloudinary
        const uploadResponse = await api.post(
          "/auth/upload-profile-image",
          formData,
          {
            headers: {
              "Content-Type": "multipart/form-data",
            },
          }
        );

        const { profileImageUrl, profileImagePublicId } = uploadResponse.data;

        // Update user profile with image URL
        await api.put("/auth/profile", {
          profileImageUrl,
          profileImagePublicId,
        });

        // Refresh user data from server
        const refreshedUser = await refreshUser();
        const uploadedImageUrl = refreshedUser?.profileImageUrl || profileImageUrl;
        URL.revokeObjectURL(previewUrl);
        setProfileImagePreview(uploadedImageUrl);
        if (profileImageInputRef.current) profileImageInputRef.current.value = "";

        alert("✅ Profile photo uploaded successfully!");
        setUploadingImage(false);
      } catch (error) {
        console.error("Error uploading profile image:", error);
        if (profileImageInputRef.current) profileImageInputRef.current.value = "";
        URL.revokeObjectURL(previewUrl);
        alert(
          error.response?.data?.message || "Failed to upload profile image"
        );
        setUploadingImage(false);
        setProfileImagePreview(user?.profileImageUrl || null);
      }
    }
  };

  // Handle skill input change with AI matching
  const handleSkillInputChange = (e) => {
    const value = e.target.value;
    setNewSkill(value);

    if (value.trim().length > 0) {
      // Filter skills that match the input (case-insensitive)
      const matches = COMMON_SKILLS.filter(
        (skill) =>
          skill.toLowerCase().includes(value.toLowerCase()) &&
          !profile.skills.includes(skill)
      ).slice(0, 10); // Limit to 10 suggestions

      setSkillSuggestions(matches);
      setShowSuggestions(true);
    } else {
      setSkillSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const handleAddSkill = (skillToAdd = null) => {
    const skill = (skillToAdd || newSkill).trim();
    if (skill) {
      const currentGroup = profile.skillGroups[newSkillGroup] || [];
      const alreadyAdded = currentGroup.some(
        (existingSkill) => existingSkill.toLowerCase() === skill.toLowerCase()
      );
      if (!alreadyAdded) {
        const skillGroups = {
          ...profile.skillGroups,
          [newSkillGroup]: [...currentGroup, skill],
        };
        setProfile({
          ...profile,
          skillGroups,
          skills: uniqueValues(Object.values(skillGroups).flat()),
        });
      }
      setNewSkill("");
      setShowSuggestions(false);
      setSkillSuggestions([]);
    }
  };

  const handleRemoveSkill = (group, index) => {
    const skillGroups = {
      ...profile.skillGroups,
      [group]: profile.skillGroups[group].filter((_, itemIndex) => itemIndex !== index),
    };
    setProfile({
      ...profile,
      skillGroups,
      skills: uniqueValues(Object.values(skillGroups).flat()),
    });
  };

  const handleAddEducation = () => {
    setProfile({
      ...profile,
      education: [
        ...profile.education,
        {
          school: "",
          degree: "",
          field: "",
          startYear: "",
          endYear: "",
        },
      ],
    });
  };

  const handleAddExperience = () => {
    setProfile({
      ...profile,
      experience: [
        ...profile.experience,
        {
          company: "",
          position: "",
          location: "",
          startDate: "",
          endDate: "",
          description: "",
        },
      ],
    });
  };

  const handleAddCertification = () => {
    setProfile({
      ...profile,
      certifications: [...profile.certifications, {
        name: "",
        issuer: "",
        issueDate: "",
        credentialUrl: "",
      }],
    });
  };

  const handleAddProject = () => {
    setProfile({
      ...profile,
      projects: [...profile.projects, { name: "", description: "", url: "" }],
    });
  };

  const handleSaveProfile = async () => {
    setProfileSaveStatus(null);
    setProfileSaving(true);
    try {
      const { data: savedProfile } = await api.put("/auth/profile", {
        name: profile.name,
        email: profile.email,
        phone: profile.phone,
        country: profile.country,
        bio: profile.bio,
        education: normalizeProfileItems(profile.education),
        experience: normalizeProfileItems(profile.experience),
        skills: profile.skills,
        skillGroups: profile.skillGroups,
        certifications: normalizeProfileItems(profile.certifications),
        projects: normalizeProfileItems(profile.projects),
        workPreferences: profile.workPreferences,
      });

      const refreshedUser = await refreshUser();
      const saved = refreshedUser || savedProfile;
      setProfile(profileStateFromUser(saved));
      setTargetRolesText((saved.workPreferences?.targetRoles || []).join(", "));
      setPreferredLocationsText((saved.workPreferences?.preferredLocations || []).join(", "));
      setNewSkill("");
      setNewSkillGroup("core");
      setSkillSuggestions([]);
      setShowSuggestions(false);
      setResumeFile(null);
      if (resumeInputRef.current) resumeInputRef.current.value = "";
      setProfileImagePreview(saved.profileImageUrl || null);
      const currentIndex = PROFILE_SECTIONS.findIndex(([tab]) => tab === activeTab);
      const nextSection = PROFILE_SECTIONS[currentIndex + 1];
      if (nextSection) {
        setActiveTab(nextSection[0]);
        setProfileSaveStatus({
          type: "success",
          message: `Profile saved. Moving to ${nextSection[1]}.`,
        });
      } else {
        setProfileSaveStatus({ type: "success", message: "Profile saved successfully." });
      }
    } catch (error) {
      console.error("Error saving profile:", error);
      setProfileSaveStatus({ type: "error", message: error.response?.data?.message || "Failed to save profile." });
    } finally {
      setProfileSaving(false);
    }
  };

  const handleSubscribeAlerts = async () => {
    setJobAlertStatus(null);
    if (!profile.email) {
      setJobAlertStatus({ type: "error", message: "Add an email address to your profile before subscribing." });
      return;
    }
    if (!emailNotifications) {
      setJobAlertStatus({ type: "error", message: "Choose to receive job alert emails before subscribing." });
      return;
    }
    setJobAlertSubmitting(true);
    try {
      const { data } = await api.post("/job-alerts", {
        email: profile.email,
        location: profile.country,
        consent: true,
      });
      setEmailNotifications(false);
      setJobAlertStatus({ type: "success", message: data.message || "Your job alert subscription is saved." });
    } catch (error) {
      setJobAlertStatus({
        type: "error",
        message: error.response?.data?.message || "We couldn't save your job alerts. Please try again.",
      });
    } finally {
      setJobAlertSubmitting(false);
    }
  };

  const handleSaveJobDigestPreferences = async () => {
    setJobDigestStatus(null);
    setJobDigestSubmitting(true);
    try {
      const { data } = await api.put("/job-alerts/preferences", jobDigestPreferences);
      setJobDigestStatus({ type: "success", message: data.message || "Your personalized alert preferences are saved." });
      await refreshUser();
    } catch (error) {
      setJobDigestStatus({
        type: "error",
        message: error.response?.data?.message || "We couldn't save your personalized alert preferences.",
      });
    } finally {
      setJobDigestSubmitting(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Please login to access your profile.</p>
      </div>
    );
  }

  // Check profile completion for job seekers
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

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="max-w-5xl mx-auto">
        <div className="mb-6">
          <Link
            to="/profile-view"
            className="text-primary hover:underline inline-flex items-center gap-2 mb-4"
          >
            ← Back to Dashboard
          </Link>
        </div>

        <div className="mb-8 flex flex-col gap-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-amber-50 text-2xl">
              {user.profileImageUrl
                ? <img src={user.profileImageUrl} alt="" className="h-full w-full object-cover" />
                : <span aria-hidden="true">👤</span>}
            </div>
            <div className="min-w-0">
              <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">{user.name}</h1>
              <p className="mt-1 text-sm text-gray-500">Edit your professional profile</p>
            </div>
          </div>

          {/* Profile Completion Badge */}
          {user.role === "job_seeker" && (
            <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-lg shadow">
              <span className="text-sm font-medium text-gray-700">
                Profile Completion:
              </span>
              <div className="flex items-center gap-2">
                <div className="w-24 bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-full rounded-full ${
                      isProfileComplete ? "bg-green-500" : "bg-primary"
                    }`}
                    style={{ width: `${completionPercentage}%` }}
                  ></div>
                </div>
                <span
                  className={`text-lg font-bold ${
                    isProfileComplete ? "text-green-600" : "text-primary"
                  }`}
                >
                  {completionPercentage}%
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Profile Completion Alert for Job Seekers */}
        {user.role === "job_seeker" && !isProfileComplete && (
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg
                  className="h-5 w-5 text-yellow-400"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-yellow-700">
                  <span className="font-medium">
                    Complete your profile to apply for jobs!
                  </span>
                  <br />
                  Required: {!user.profileImageUrl && "Upload Profile Photo"}
                  {!user.profileImageUrl &&
                    (!user.resumeUrl || !user.country || !user.bio) &&
                    ", "}
                  {!user.resumeUrl && "Upload Resume"}
                  {!user.resumeUrl && (!user.country || !user.bio) && ", "}
                  {!user.country && "Add Country"}
                  {!user.country && !user.bio && ", "}
                  {!user.bio && "Add Bio"}
                </p>
              </div>
            </div>
          </div>
        )}

        {user.role === "job_seeker" && (
          <section className="mb-6 flex flex-col gap-4 rounded-xl border border-amber-200 bg-amber-50 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-bold text-slate-900">Start with your CV or enter details manually</h2>
              <p className="mt-1 text-sm text-slate-600">Auto-fill saves matching details across your profile. You can review and edit every section afterward.</p>
            </div>
            <div className="flex shrink-0 flex-wrap gap-3">
              <button
                type="button"
                onClick={() => resumeInputRef.current?.click()}
                disabled={parsing || profileSaving}
                className="rounded-lg bg-amber-500 px-4 py-2 font-semibold text-slate-950 hover:bg-amber-400 disabled:cursor-wait disabled:opacity-60"
              >
                {parsing ? "Reading CV…" : "Auto-fill from CV"}
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("basic")}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 font-semibold text-slate-800 hover:bg-slate-100"
              >
                Manual entry
              </button>
            </div>
          </section>
        )}

        <input
          ref={resumeInputRef}
          type="file"
          id="resume-upload"
          accept=".pdf,.doc,.docx,.txt"
          onChange={handleResumeUpload}
          disabled={parsing}
          className="hidden"
        />

        {/* Tabs */}
        <nav aria-label="Profile sections" className="mb-6 overflow-x-auto border-b">
          <div role="tablist" className="flex min-w-max gap-5">
            {PROFILE_SECTIONS.map(([tab, label]) => (
              <button
                key={tab}
                type="button"
                role="tab"
                aria-selected={activeTab === tab}
                onClick={() => setActiveTab(tab)}
                disabled={profileSaving}
                className={`border-b-2 px-2 py-3 font-medium transition ${
                  activeTab === tab
                    ? "border-primary text-primary"
                    : "border-transparent text-gray-600 hover:text-gray-800"
                } disabled:cursor-wait disabled:opacity-60`}
              >
                {label}
              </button>
            ))}
          </div>
        </nav>
        {profileSaveStatus && (
          <p role={profileSaveStatus.type === "error" ? "alert" : "status"} className={`mb-5 rounded-lg border p-3 text-sm ${profileSaveStatus.type === "error" ? "border-red-200 bg-red-50 text-red-800" : "border-emerald-200 bg-emerald-50 text-emerald-800"}`}>
            {profileSaveStatus.message}
          </p>
        )}

        {/* Profile Photo Tab */}
        {activeTab === "photo" && (
          <div className="bg-white p-8 rounded-lg shadow">
            <h2 className="text-2xl font-bold mb-4">Profile Photo</h2>
            <p className="text-gray-600 mb-6">
              Upload a professional profile photo. This will be visible to
              employers and displayed on your dashboard.
            </p>

            {uploadingImage && (
              <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center gap-3">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                <div>
                  <p className="font-semibold text-blue-900">
                    Uploading your photo...
                  </p>
                  <p className="text-sm text-blue-700">Please wait</p>
                </div>
              </div>
            )}

            <div className="flex flex-col items-center gap-6">
              {/* Photo Preview */}
              <div className="relative">
                <div className="w-48 h-48 rounded-full border-4 border-gray-200 overflow-hidden bg-gray-100 flex items-center justify-center">
                  {profileImagePreview ? (
                    <img
                      src={profileImagePreview}
                      alt="Profile preview"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-6xl text-gray-400">👤</span>
                  )}
                </div>
                {profileImagePreview && !uploadingImage && (
                  <button
                    onClick={() => {
                      if (confirm("Remove profile photo?")) {
                        setProfileImagePreview(null);
                      }
                    }}
                    className="absolute bottom-0 right-0 bg-red-600 text-white rounded-full p-2 hover:bg-red-700"
                  >
                    <svg
                      className="w-5 h-5"
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
                  </button>
                )}
              </div>

              {/* Upload Button */}
              <div>
                <input
                  ref={profileImageInputRef}
                  type="file"
                  id="profile-image-upload"
                  accept="image/jpeg,image/jpg,image/png,image/webp"
                  onChange={handleProfileImageUpload}
                  disabled={uploadingImage}
                  className="hidden"
                />
                <label
                  htmlFor="profile-image-upload"
                  className={`inline-block px-6 py-3 rounded-lg font-semibold transition cursor-pointer ${
                    uploadingImage
                      ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                      : "bg-primary text-white hover:bg-yellow-600"
                  }`}
                >
                  {profileImagePreview ? "Change Photo" : "Upload Photo"}
                </label>
                <p className="text-sm text-gray-500 mt-2 text-center">
                  JPG, PNG, or WebP (Max 2MB)
                </p>
              </div>

              {profileImagePreview && !uploadingImage && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 w-full max-w-md">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">✅</span>
                    <div>
                      <p className="font-semibold text-green-900">
                        Profile photo uploaded!
                      </p>
                      <p className="text-sm text-green-700">
                        Your photo is now visible on your profile
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end mt-8">
              <button
                type="button"
                onClick={handleSaveProfile}
                disabled={profileSaving}
                className="bg-secondary text-white px-6 py-2 rounded hover:bg-green-700 font-semibold"
              >
                {profileSaving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        )}

        {/* Resume Upload Tab */}
        {activeTab === "resume" && (
          <div className="bg-white p-8 rounded-lg shadow">
            <h2 className="text-2xl font-bold mb-4">Resume Management</h2>
            <p className="text-gray-600 mb-6">
              Upload your resume and we'll automatically populate your profile
              (LinkedIn-style auto-fill).
            </p>
            {user.resumeUrl && (
              <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-gray-200 bg-gray-50 p-4">
                <span className="font-medium text-gray-800">{user.resumeFileName || "A resume is currently attached to your profile."}</span>
                <div className="flex flex-wrap gap-4">
                  <a href={api.getUri({ url: "/auth/resume" })} target="_blank" rel="noopener noreferrer" className="font-semibold text-primary hover:underline">
                    View current resume
                  </a>
                  <a href={api.getUri({ url: "/auth/resume", params: { download: "1" } })} className="font-semibold text-primary hover:underline">
                    Download original
                  </a>
                </div>
              </div>
            )}

            {parsing && (
              <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center gap-3">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                <div>
                  <p className="font-semibold text-blue-900">
                    Parsing your resume...
                  </p>
                  <p className="text-sm text-blue-700">
                    This may take a few seconds
                  </p>
                </div>
              </div>
            )}

            <div
              className={`border-2 border-dashed rounded-lg p-12 text-center ${
                parsing ? "border-primary bg-primary/5" : "border-gray-300"
              }`}
            >
              <label
                htmlFor="resume-upload"
                className={`inline-block ${
                  parsing ? "cursor-not-allowed opacity-50" : "cursor-pointer"
                }`}
              >
                <div className="text-4xl mb-4">📄</div>
                <p className="text-lg font-medium mb-2">
                  {resumeFile
                    ? `Uploaded: ${resumeFile.name}`
                    : user.resumeUrl ? "Click to replace your resume" : "Click to upload your resume"}
                </p>
                <p className="text-sm text-gray-500">
                  Supported formats: PDF, DOC, DOCX, TXT (up to 10MB)
                </p>
              </label>
            </div>

            {resumeFile && !parsing && (
              <div className="mt-6 flex items-center justify-between bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">✅</span>
                  <div>
                    <p className="font-semibold text-green-900">
                      Resume processed successfully!
                    </p>
                    <p className="text-sm text-green-700">
                      Check the other tabs to review auto-filled information
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setResumeFile(null);
                    if (
                      confirm(
                        "Are you sure you want to remove the uploaded resume? This won't delete the auto-filled data."
                      )
                    ) {
                      setResumeFile(null);
                    }
                  }}
                  className="text-accent hover:underline font-medium"
                >
                  Remove file
                </button>
              </div>
            )}

            {resumeFile && !parsing && (
              <div className="flex justify-end mt-6">
                <button
                  onClick={() => setActiveTab("basic")}
                  className="bg-primary text-white px-6 py-2 rounded hover:bg-yellow-600 transition"
                >
                  Review profile details →
                </button>
              </div>
            )}
          </div>
        )}

        {/* Basic Info Tab */}
        {activeTab === "basic" && (
          <div className="bg-white p-8 rounded-lg shadow">
            <h2 className="text-2xl font-bold mb-6">Basic Information</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Name</label>
                <input
                  type="text"
                  value={profile.name}
                  onChange={(e) =>
                    setProfile({ ...profile, name: e.target.value })
                  }
                  className="w-full border rounded px-4 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Email</label>
                <input
                  type="email"
                  value={profile.email}
                  onChange={(e) =>
                    setProfile({ ...profile, email: e.target.value })
                  }
                  className="w-full border rounded px-4 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Phone</label>
                <input
                  type="tel"
                  value={profile.phone}
                  onChange={(e) =>
                    setProfile({ ...profile, phone: e.target.value })
                  }
                  className="w-full border rounded px-4 py-2"
                  placeholder="+234 123 456 7890"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">
                  Country{" "}
                  <span className="text-red-500">
                    * Required to apply for jobs
                  </span>
                </label>
                <select
                  value={profile.country}
                  onChange={(e) =>
                    setProfile({ ...profile, country: e.target.value })
                  }
                  className="w-full border rounded px-4 py-2"
                  required
                >
                  <option value="">Select your country</option>
                  {africaLocations.map((location) => (
                    <option key={location.country} value={location.country}>
                      {location.country}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">
                  Professional Bio{" "}
                  <span className="text-red-500">
                    * Required to apply for jobs
                  </span>
                </label>
                <textarea
                  value={profile.bio}
                  onChange={(e) =>
                    setProfile({ ...profile, bio: e.target.value })
                  }
                  rows="4"
                  className="w-full border rounded px-4 py-2"
                  placeholder="Brief overview of your professional background and career goals..."
                  maxLength={1500}
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  {profile.bio.length}/1500 characters
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={handleSaveProfile}
                  disabled={profileSaving}
                  className="bg-gray-600 text-white px-6 py-2 rounded hover:bg-gray-700 transition"
                >
                  {profileSaving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Education Tab */}
        {activeTab === "education" && (
          <div className="bg-white p-8 rounded-lg shadow">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">Education</h2>
              <button
                onClick={handleAddEducation}
                className="bg-primary text-white px-4 py-2 rounded hover:bg-yellow-600 transition"
              >
                + Add Education
              </button>
            </div>

            {profile.education.length === 0 ? (
              <p className="text-gray-500">
                No education added yet. Upload your resume to auto-fill this
                section.
              </p>
            ) : (
              <div className="space-y-6">
                {profile.education.map((edu, index) => (
                  <div key={index} className="border p-4 rounded">
                    <div className="grid md:grid-cols-2 gap-4">
                      <input
                        type="text"
                        placeholder="School/University"
                        value={edu.school}
                        onChange={(e) => {
                          const updated = [...profile.education];
                          updated[index].school = e.target.value;
                          setProfile({ ...profile, education: updated });
                        }}
                        className="border rounded px-3 py-2"
                      />
                      <input
                        type="text"
                        placeholder="Degree"
                        value={edu.degree}
                        onChange={(e) => {
                          const updated = [...profile.education];
                          updated[index].degree = e.target.value;
                          setProfile({ ...profile, education: updated });
                        }}
                        className="border rounded px-3 py-2"
                      />
                      <input
                        type="text"
                        placeholder="Field of Study"
                        value={edu.field}
                        onChange={(e) => {
                          const updated = [...profile.education];
                          updated[index].field = e.target.value;
                          setProfile({ ...profile, education: updated });
                        }}
                        className="border rounded px-3 py-2"
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="number"
                          placeholder="Start Year"
                          value={edu.startYear}
                          onChange={(e) => {
                            const updated = [...profile.education];
                            updated[index].startYear = e.target.value;
                            setProfile({ ...profile, education: updated });
                          }}
                          className="border rounded px-3 py-2"
                        />
                        <input
                          type="number"
                          placeholder="End Year"
                          value={edu.endYear}
                          onChange={(e) => {
                            const updated = [...profile.education];
                            updated[index].endYear = e.target.value;
                            setProfile({ ...profile, education: updated });
                          }}
                          className="border rounded px-3 py-2"
                        />
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        const updated = profile.education.filter(
                          (_, i) => i !== index
                        );
                        setProfile({ ...profile, education: updated });
                      }}
                      className="mt-3 text-accent hover:underline text-sm"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div className="flex gap-3 mt-6">
              <button
                type="button"
                onClick={handleSaveProfile}
                disabled={profileSaving}
                className="bg-primary text-white px-6 py-2 rounded hover:bg-yellow-600 transition ml-auto"
              >
                {profileSaving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        )}

        {/* Experience Tab */}
        {activeTab === "experience" && (
          <div className="bg-white p-8 rounded-lg shadow">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">Work Experience</h2>
              <button
                onClick={handleAddExperience}
                className="bg-primary text-white px-4 py-2 rounded hover:bg-yellow-600 transition"
              >
                + Add Experience
              </button>
            </div>

            {profile.experience.length === 0 ? (
              <p className="text-gray-500">
                No experience added yet. Upload your resume to auto-fill this
                section.
              </p>
            ) : (
              <div className="space-y-6">
                {profile.experience.map((exp, index) => (
                  <div key={index} className="border p-4 rounded">
                    <div className="space-y-3">
                      <input
                        type="text"
                        placeholder="Company Name"
                        value={exp.company}
                        onChange={(e) => {
                          const updated = [...profile.experience];
                          updated[index].company = e.target.value;
                          setProfile({ ...profile, experience: updated });
                        }}
                        className="w-full border rounded px-3 py-2"
                      />
                      <input
                        type="text"
                        placeholder="Position/Title"
                        value={exp.position}
                        onChange={(e) => {
                          const updated = [...profile.experience];
                          updated[index].position = e.target.value;
                          setProfile({ ...profile, experience: updated });
                        }}
                        className="w-full border rounded px-3 py-2"
                      />
                      <input
                        type="text"
                        placeholder="Location"
                        value={exp.location}
                        onChange={(e) => {
                          const updated = [...profile.experience];
                          updated[index].location = e.target.value;
                          setProfile({ ...profile, experience: updated });
                        }}
                        className="w-full border rounded px-3 py-2"
                      />
                      <div className="grid md:grid-cols-2 gap-3">
                        <input
                          type="month"
                          placeholder="Start Date"
                          value={exp.startDate}
                          onChange={(e) => {
                            const updated = [...profile.experience];
                            updated[index].startDate = e.target.value;
                            setProfile({ ...profile, experience: updated });
                          }}
                          className="border rounded px-3 py-2"
                        />
                        <input
                          type="month"
                          placeholder="End Date (leave empty if current)"
                          value={exp.endDate}
                          onChange={(e) => {
                            const updated = [...profile.experience];
                            updated[index].endDate = e.target.value;
                            setProfile({ ...profile, experience: updated });
                          }}
                          className="border rounded px-3 py-2"
                        />
                      </div>
                      <textarea
                        placeholder="Impact bullets, one per line (include results and measurable outcomes where available)..."
                        rows="3"
                        value={exp.description}
                        onChange={(e) => {
                          const updated = [...profile.experience];
                          updated[index].description = e.target.value;
                          setProfile({ ...profile, experience: updated });
                        }}
                        className="w-full border rounded px-3 py-2"
                      />
                    </div>
                    <button
                      onClick={() => {
                        const updated = profile.experience.filter(
                          (_, i) => i !== index
                        );
                        setProfile({ ...profile, experience: updated });
                      }}
                      className="mt-3 text-accent hover:underline text-sm"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div className="flex gap-3 mt-6">
              <button
                type="button"
                onClick={handleSaveProfile}
                disabled={profileSaving}
                className="bg-primary text-white px-6 py-2 rounded hover:bg-yellow-600 transition ml-auto"
              >
                {profileSaving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        )}

        {/* Skills Tab */}
        {activeTab === "skills" && (
          <div className="bg-white p-8 rounded-lg shadow">
            <h2 className="text-2xl font-bold mb-6">Skills</h2>

            <div className="mb-6 relative">
              <label htmlFor="skill-picker" className="block text-sm font-medium mb-2">
                Type to search for skills or add your own
              </label>
              <div className="flex gap-3">
                <select
                  aria-label="Skill category"
                  value={newSkillGroup}
                  onChange={(event) => setNewSkillGroup(event.target.value)}
                  className="rounded border px-3 py-2"
                >
                  {SKILL_GROUPS.map(([group, label]) => <option key={group} value={group}>{label}</option>)}
                </select>
                <div className="flex-1 relative">
                  <input
                    id="skill-picker"
                    type="text"
                    value={newSkill}
                    onChange={handleSkillInputChange}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddSkill();
                      }
                    }}
                    onFocus={() => newSkill && setShowSuggestions(true)}
                    placeholder="Type a skill (e.g., JavaScript, Project Management)"
                    className="w-full border rounded px-4 py-2"
                  />

                  {/* Autocomplete Dropdown */}
                  {showSuggestions && skillSuggestions.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-60 overflow-y-auto">
                      {skillSuggestions.map((skill) => (
                        <button
                          key={skill}
                          type="button"
                          onClick={() => handleAddSkill(skill)}
                          className="w-full text-left px-4 py-2 hover:bg-primary hover:text-white transition"
                        >
                          {skill}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* No matches message */}
                  {showSuggestions &&
                    newSkill &&
                    skillSuggestions.length === 0 && (
                      <div className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg px-4 py-3">
                        <p className="text-gray-600 text-sm">
                          No matches found. Click "Add" to add "{newSkill}" as a
                          custom skill.
                        </p>
                      </div>
                    )}
                </div>
                <button
                  onClick={() => handleAddSkill()}
                  className="bg-primary text-white px-6 py-2 rounded hover:bg-yellow-600 transition"
                >
                  Add
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                💡 Start typing and we'll suggest matching skills, or add your
                own custom skill
              </p>
            </div>

            <div className="space-y-5">
              {SKILL_GROUPS.map(([group, label]) => (
                <section key={group}>
                  <h3 className="mb-2 font-semibold text-slate-800">{label}</h3>
                  {profile.skillGroups[group].length ? (
                    <div className="flex flex-wrap gap-2">
                      {profile.skillGroups[group].map((skill, index) => (
                        <span key={`${skill}-${index}`} className="flex items-center gap-2 rounded-full bg-gray-100 px-4 py-2">
                          {skill}
                          <button type="button" aria-label={`Remove ${skill} from ${label}`} onClick={() => handleRemoveSkill(group, index)} className="font-bold text-red-500 hover:text-red-700">×</button>
                        </span>
                      ))}
                    </div>
                  ) : <p className="text-sm text-gray-500">No {label.toLowerCase()} added yet.</p>}
                </section>
              ))}
            </div>
            <div className="flex gap-3 mt-6">
              <button
                type="button"
                onClick={handleSaveProfile}
                disabled={profileSaving}
                className="bg-primary text-white px-6 py-2 rounded hover:bg-yellow-600 transition ml-auto"
              >
                {profileSaving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        )}

        {activeTab === "credentials" && (
          <div className="space-y-6 rounded-lg bg-white p-8 shadow">
            <section>
              <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-2xl font-bold">Certifications &amp; training</h2>
                  <p className="mt-1 text-sm text-gray-600">Keep courses, certificates, and credentials separate from work history.</p>
                </div>
                <button type="button" onClick={handleAddCertification} className="rounded bg-primary px-4 py-2 font-semibold text-white hover:bg-yellow-600">Add certification</button>
              </div>
              {profile.certifications.length === 0 && <p className="text-sm text-gray-500">No certifications added yet.</p>}
              <div className="space-y-4">
                {profile.certifications.map((certification, index) => (
                  <fieldset key={`certification-${index}`} className="grid gap-3 rounded-xl border p-4 md:grid-cols-2">
                    <legend className="px-1 text-sm font-semibold">Certification {index + 1}</legend>
                    {[
                      ["name", "Certification or program"],
                      ["issuer", "Issuing organization"],
                      ["issueDate", "Issue date"],
                      ["credentialUrl", "Credential URL"],
                    ].map(([key, label]) => (
                      <label key={key} className="grid gap-1 text-sm font-medium">
                        {label}
                        <input type={key === "credentialUrl" ? "url" : "text"} value={certification[key] || ""} onChange={(event) => setProfile((current) => ({ ...current, certifications: current.certifications.map((item, itemIndex) => itemIndex === index ? { ...item, [key]: event.target.value } : item) }))} className="rounded border px-3 py-2" />
                      </label>
                    ))}
                    <button type="button" onClick={() => setProfile((current) => ({ ...current, certifications: current.certifications.filter((_, itemIndex) => itemIndex !== index) }))} className="w-fit text-sm font-semibold text-red-700 hover:underline">Remove certification</button>
                  </fieldset>
                ))}
              </div>
            </section>
            <section className="border-t pt-6">
              <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-bold">Portfolio &amp; projects</h2>
                  <p className="mt-1 text-sm text-gray-600">Add portfolio links or projects relevant to your target roles.</p>
                </div>
                <button type="button" onClick={handleAddProject} className="rounded bg-slate-800 px-4 py-2 font-semibold text-white hover:bg-slate-700">Add project</button>
              </div>
              {profile.projects.length === 0 && <p className="text-sm text-gray-500">No projects added yet.</p>}
              <div className="space-y-4">
                {profile.projects.map((project, index) => (
                  <fieldset key={`project-${index}`} className="grid gap-3 rounded-xl border p-4 md:grid-cols-2">
                    <legend className="px-1 text-sm font-semibold">Project {index + 1}</legend>
                    <label className="grid gap-1 text-sm font-medium">Project name<input value={project.name || ""} onChange={(event) => setProfile((current) => ({ ...current, projects: current.projects.map((item, itemIndex) => itemIndex === index ? { ...item, name: event.target.value } : item) }))} className="rounded border px-3 py-2" /></label>
                    <label className="grid gap-1 text-sm font-medium">Portfolio / project URL<input type="url" value={project.url || ""} onChange={(event) => setProfile((current) => ({ ...current, projects: current.projects.map((item, itemIndex) => itemIndex === index ? { ...item, url: event.target.value } : item) }))} className="rounded border px-3 py-2" /></label>
                    <label className="grid gap-1 text-sm font-medium md:col-span-2">Project details<textarea rows={3} value={project.description || ""} onChange={(event) => setProfile((current) => ({ ...current, projects: current.projects.map((item, itemIndex) => itemIndex === index ? { ...item, description: event.target.value } : item) }))} className="rounded border px-3 py-2" /></label>
                    <button type="button" onClick={() => setProfile((current) => ({ ...current, projects: current.projects.filter((_, itemIndex) => itemIndex !== index) }))} className="w-fit text-sm font-semibold text-red-700 hover:underline">Remove project</button>
                  </fieldset>
                ))}
              </div>
            </section>
            <div className="flex justify-end border-t pt-5">
              <button type="button" onClick={handleSaveProfile} disabled={profileSaving} className="rounded bg-primary px-6 py-2 font-semibold text-white hover:bg-yellow-600 disabled:opacity-60">{profileSaving ? "Saving..." : "Save Changes"}</button>
            </div>
          </div>
        )}

        {activeTab === "preferences" && (
          <section className="space-y-6 rounded-lg bg-white p-8 shadow">
            <div>
              <h2 className="text-2xl font-bold">Work preferences</h2>
              <p className="mt-1 text-sm text-gray-600">Tell employers which roles and work arrangements you are considering.</p>
            </div>
            <fieldset>
              <legend className="mb-2 text-sm font-semibold">Work arrangement</legend>
              <div className="flex flex-wrap gap-4">
                {["Remote", "Hybrid", "On-site"].map((mode) => (
                  <label key={mode} className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm">
                    <input type="checkbox" checked={profile.workPreferences.workModes.includes(mode)} onChange={(event) => setProfile((current) => ({ ...current, workPreferences: { ...current.workPreferences, workModes: event.target.checked ? uniqueValues([...current.workPreferences.workModes, mode]) : current.workPreferences.workModes.filter((item) => item !== mode) } }))} />
                    {mode}
                  </label>
                ))}
              </div>
            </fieldset>
            <label className="grid gap-1 text-sm font-semibold">Target roles <span className="font-normal text-gray-500">Separate multiple titles with commas.</span><input value={targetRolesText} onChange={(event) => { setTargetRolesText(event.target.value); setProfile((current) => ({ ...current, workPreferences: { ...current.workPreferences, targetRoles: commaSeparatedValues(event.target.value) } })); }} className="rounded border px-3 py-2 font-normal" placeholder="Product Designer, UX Researcher" /></label>
            <label className="grid gap-1 text-sm font-semibold">Preferred locations <span className="font-normal text-gray-500">Separate cities or countries with commas.</span><input value={preferredLocationsText} onChange={(event) => { setPreferredLocationsText(event.target.value); setProfile((current) => ({ ...current, workPreferences: { ...current.workPreferences, preferredLocations: commaSeparatedValues(event.target.value) } })); }} className="rounded border px-3 py-2 font-normal" placeholder="Lagos, Nigeria" /></label>
            <label className="flex items-start gap-2 text-sm"><input type="checkbox" checked={profile.workPreferences.willingToRelocate} onChange={(event) => setProfile((current) => ({ ...current, workPreferences: { ...current.workPreferences, willingToRelocate: event.target.checked } }))} /><span>Open to relocation</span></label>
            <div className="flex justify-end border-t pt-5">
              <button type="button" onClick={handleSaveProfile} disabled={profileSaving} className="rounded bg-primary px-6 py-2 font-semibold text-white hover:bg-yellow-600 disabled:opacity-60">{profileSaving ? "Saving..." : "Save Changes"}</button>
            </div>
          </section>
        )}

        {/* Job Alerts Tab */}
        {activeTab === "alerts" && (
          <div className="bg-white p-8 rounded-lg shadow">
            <h2 className="text-2xl font-bold mb-6">
              Job Alerts & Notifications
            </h2>

            <div className="space-y-6">
              <section className="rounded-xl border border-amber-200 bg-amber-50/60 p-5">
                <h3 className="font-bold text-slate-900">Personalized role digest</h3>
                <p className="mt-1 text-sm text-slate-600">Get suitable roles selected from your skills, experience, target roles, and work preferences. Dashboard recommendations do not depend on this email setting.</p>
                <label className="mt-4 flex items-start gap-3 text-sm">
                  <input
                    type="checkbox"
                    checked={jobDigestPreferences.enabled}
                    onChange={(event) => setJobDigestPreferences((current) => ({ ...current, enabled: event.target.checked }))}
                    className="mt-1 h-4 w-4 accent-amber-600"
                  />
                  <span><strong className="block">Email me matching roles</strong>Optional. You can turn this off here at any time or unsubscribe from a digest email.</span>
                </label>
                <label className="mt-4 grid max-w-sm gap-1 text-sm font-semibold">
                  Frequency
                  <select
                    value={jobDigestPreferences.frequency}
                    onChange={(event) => setJobDigestPreferences((current) => ({ ...current, frequency: event.target.value }))}
                    disabled={!jobDigestPreferences.enabled}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-2 font-normal disabled:bg-slate-100"
                  >
                    <option value="instant">As new matches are found</option>
                    <option value="daily">Daily digest</option>
                    <option value="weekly">Weekly digest</option>
                  </select>
                </label>
                {jobDigestStatus && (
                  <p role={jobDigestStatus.type === "error" ? "alert" : "status"} className={`mt-3 rounded-lg border p-3 text-sm ${jobDigestStatus.type === "error" ? "border-red-200 bg-red-50 text-red-800" : "border-emerald-200 bg-emerald-50 text-emerald-800"}`}>
                    {jobDigestStatus.message}
                  </p>
                )}
                <button
                  type="button"
                  onClick={handleSaveJobDigestPreferences}
                  disabled={jobDigestSubmitting}
                  className="mt-4 rounded-lg bg-amber-700 px-5 py-2 font-semibold text-white hover:bg-amber-800 disabled:cursor-wait disabled:opacity-60"
                >
                  {jobDigestSubmitting ? "Saving…" : "Save personalized alerts"}
                </button>
              </section>

              <label className="flex items-start gap-3 rounded-lg border p-4 text-sm">
                <input type="checkbox" checked={emailNotifications} onChange={(event) => setEmailNotifications(event.target.checked)} className="mt-1 h-4 w-4 accent-amber-600" />
                <span><strong className="block">General job newsletter</strong>This is a separate, optional subscription for general latest-job notices at {profile.email || "the email address on my profile"}.</span>
              </label>

              <div className="border-t pt-6">
                <h3 className="font-semibold mb-4">Subscribe to Latest Jobs</h3>
                <p className="text-gray-600 mb-4">
                  Get weekly emails with the latest job opportunities matching
                  your interests at <strong>{profile.email || "your profile email"}</strong>.
                </p>
                {jobAlertStatus && (
                  <p role={jobAlertStatus.type === "error" ? "alert" : "status"} className={`mb-4 rounded-lg border p-3 text-sm ${jobAlertStatus.type === "error" ? "border-red-200 bg-red-50 text-red-800" : "border-emerald-200 bg-emerald-50 text-emerald-800"}`}>
                    {jobAlertStatus.message}
                  </p>
                )}
                <button
                  onClick={handleSubscribeAlerts}
                  disabled={jobAlertSubmitting}
                  className="rounded bg-secondary px-6 py-2 text-white transition hover:bg-green-700 disabled:cursor-wait disabled:opacity-60"
                >
                  {jobAlertSubmitting ? "Saving…" : jobAlertStatus?.type === "success" ? "Update subscription" : "Subscribe Now"}
                </button>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                type="button"
                onClick={() => navigate("/dashboard")}
                className="bg-primary text-white px-6 py-2 rounded hover:bg-yellow-600 transition ml-auto"
              >
                ✓ Done - Go to Dashboard
              </button>
            </div>
          </div>
        )}
        <nav aria-label="Profile section navigation" className="mt-6 flex items-center justify-between gap-4 rounded-lg border bg-white p-4 shadow-sm">
          <button
            type="button"
            onClick={() => {
              const index = PROFILE_SECTIONS.findIndex(([tab]) => tab === activeTab);
              if (index > 0) setActiveTab(PROFILE_SECTIONS[index - 1][0]);
              setProfileSaveStatus(null);
            }}
            disabled={profileSaving || activeTab === PROFILE_SECTIONS[0][0]}
            className="rounded border border-slate-300 px-4 py-2 font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            ← Previous
          </button>
          <span className="text-center text-sm text-slate-500">
            Section {PROFILE_SECTIONS.findIndex(([tab]) => tab === activeTab) + 1} of {PROFILE_SECTIONS.length}
          </span>
          <button
            type="button"
            onClick={() => {
              const index = PROFILE_SECTIONS.findIndex(([tab]) => tab === activeTab);
              if (index < PROFILE_SECTIONS.length - 1) setActiveTab(PROFILE_SECTIONS[index + 1][0]);
              setProfileSaveStatus(null);
            }}
            disabled={profileSaving || activeTab === PROFILE_SECTIONS[PROFILE_SECTIONS.length - 1][0]}
            className="rounded bg-primary px-4 py-2 font-semibold text-white hover:bg-yellow-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Next →
          </button>
        </nav>
      </div>
    </div>
  );
};

export default Profile;
