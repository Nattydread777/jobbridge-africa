import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import ForgotPasswordModal from "../components/ForgotPasswordModal";
import africaLocations from "../data/jobLocations";
import { extractResumeText, parseResumeText } from "../utils/resumeParser";
import GoogleSignInButton from "../components/GoogleSignInButton";
import ResendVerification from "../components/ResendVerification";

const emptyParsed = {
  name: "",
  email: "",
  phone: "",
  bio: "",
  skills: [],
  education: [],
  experience: [],
};

const Register = () => {
  const [searchParams] = useSearchParams();
  const [form, setForm] = useState({
    name: "", email: "", password: "", role: searchParams.get("role") === "employer" ? "employer" : "job_seeker",
    companyName: "", country: "", phone: "", bio: "", targetRoles: "",
  });
  const [resume, setResume] = useState(null);
  const [parsed, setParsed] = useState(emptyParsed);
  const [pastedText, setPastedText] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [hasRegistered, setHasRegistered] = useState(false);
  const [verificationSent, setVerificationSent] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [jobAlertsEnabled, setJobAlertsEnabled] = useState(false);
  const [jobAlertFrequency, setJobAlertFrequency] = useState("daily");
  const [forgotPasswordOpen, setForgotPasswordOpen] = useState(false);
  const { register, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated && !hasRegistered) navigate("/profile-view", { replace: true });
  }, [hasRegistered, isAuthenticated, navigate]);

  const updateField = (event) =>
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));

  const applyParsedDetails = (details) => {
    setParsed(details);
    setForm((current) => ({
      ...current,
      name: details.name || current.name,
      email: details.email || current.email,
      phone: details.phone || current.phone,
      bio: details.bio || current.bio,
    }));
  };

  const handleResume = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setError("");
    setResume(file);
    try {
      const text = await extractResumeText(file);
      applyParsedDetails(parseResumeText(text));
      setPastedText("");
    } catch (parseError) {
      setError(`${parseError.message} You can paste the resume text below instead.`);
    }
  };

  const parsePastedText = () => {
    try {
      applyParsedDetails(parseResumeText(pastedText));
      setError("");
    } catch (parseError) {
      setError(parseError.message);
    }
  };

  const handleRegister = async (event) => {
    event.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const profileData = form.role === "job_seeker" ? {
        country: form.country,
        phone: form.phone,
        bio: form.bio,
        skills: parsed.skills,
        education: parsed.education,
        experience: parsed.experience,
        targetRoles: form.targetRoles.split(",").map((role) => role.trim()).filter(Boolean),
        jobAlertsEnabled,
        jobAlertFrequency,
      } : {};
      await register({
        ...form,
        ...profileData,
        termsAccepted,
        privacyAccepted,
      });
      setHasRegistered(true);
      setVerificationSent(true);
    } catch (registrationError) {
      const message = registrationError.response?.data?.message || "We couldn't create your account. Check your connection and try again.";
      setError(message);
      if (registrationError.response?.status === 503 && message.toLowerCase().includes("account was created")) {
        setHasRegistered(true);
        setVerificationSent(true);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="mx-auto grid max-w-7xl gap-8 px-4 py-8 md:grid-cols-[0.8fr_1.2fr] md:px-8">
      <section className="flex flex-col justify-between rounded-3xl bg-slate-950 p-8 text-white shadow-xl md:p-10">
        <Link to="/" className="w-fit text-lg font-black">JobBridge <span className="text-amber-400">Africa</span></Link>
        <div className="my-8">
          <p className="mb-4 text-sm font-bold uppercase tracking-widest text-amber-300">Opportunity meets talent</p>
          <h1 className="text-4xl font-extrabold leading-tight">Build a profile that brings your next role closer.</h1>
          <p className="mt-5 leading-7 text-slate-300">Create a free account to discover trusted roles, share your experience, and apply directly to employers.</p>
        </div>
        <p className="text-sm text-slate-400">Advancing decent work and economic growth · UN SDG 8</p>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-lg md:p-9">
        <div className="mb-6">
          <h2 className="text-3xl font-bold text-slate-900">Create your account</h2>
          <p className="mt-2 text-slate-600">Resume suggestions are editable in your profile after registration.</p>
        </div>
        {error && <div role="alert" className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>}
        {verificationSent && (
          <div className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
            <p className="font-semibold">Account created. Verify your email before signing in.</p>
            <p className="mt-1">We sent a one-time verification link to {form.email}. If you don’t see it, check your spam folder or request another link.</p>
            <ResendVerification initialEmail={form.email} />
          </div>
        )}

        {form.role === "job_seeker" && (
          <div className="mb-7 rounded-2xl border border-amber-200 bg-amber-50/60 p-5">
            <h3 className="font-bold text-slate-900">Add your CV to prefill your profile</h3>
            <p className="mt-1 text-sm text-slate-600">PDF, DOCX, or TXT. Text is extracted in your browser; the file itself is not uploaded until you choose to add it to your profile after verifying your account.</p>
            <label htmlFor="registration-resume" className="mt-4 flex cursor-pointer items-center justify-center rounded-xl border-2 border-dashed border-amber-400 bg-white px-4 py-5 text-center font-semibold text-amber-900 hover:bg-amber-50">
              {resume ? `Selected: ${resume.name}` : "Choose a resume file"}
              <input id="registration-resume" type="file" accept=".pdf,.docx,.txt" onChange={handleResume} className="sr-only" />
            </label>
            {parsed.skills.length > 0 && (
              <div className="mt-3 text-sm text-slate-700">
                <p><strong>Detected skills:</strong> {parsed.skills.join(", ")}</p>
                {parsed.education.length > 0 && (
                  <div className="mt-2">
                    <strong>Education preview:</strong>
                    {parsed.education.map((entry, index) => (
                      <p key={`education-${index}`} className="mt-1">{[entry.degree, entry.field, entry.school, entry.startYear, entry.endYear].filter(Boolean).join(" · ")}</p>
                    ))}
                  </div>
                )}
                {parsed.experience.length > 0 && (
                  <div className="mt-2">
                    <strong>Experience text detected:</strong>
                    {parsed.experience.slice(0, 3).map((entry, index) => (
                      <p key={`experience-${index}`} className="mt-1">{entry.position}</p>
                    ))}
                  </div>
                )}
              </div>
            )}
            <details className="mt-4">
              <summary className="cursor-pointer text-sm font-semibold text-slate-700">Or paste resume text</summary>
              <textarea
                value={pastedText}
                onChange={(event) => setPastedText(event.target.value)}
                rows={4}
                className="mt-3 w-full rounded-xl border border-slate-300 p-3 text-sm"
                placeholder="Paste the text from your CV here..."
              />
              <button type="button" onClick={parsePastedText} className="mt-2 rounded-lg bg-slate-800 px-4 py-2 text-sm font-semibold text-white">Extract profile details</button>
            </details>
          </div>
        )}

        <form onSubmit={handleRegister} className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label htmlFor="register-role" className="mb-1.5 block text-sm font-semibold text-slate-700">I am joining as</label>
            <select id="register-role" name="role" value={form.role} onChange={updateField} className="w-full rounded-xl border border-slate-300 px-4 py-3">
              <option value="job_seeker">Job seeker</option>
              <option value="employer">Employer</option>
            </select>
          </div>
          <div>
            <label htmlFor="register-name" className="mb-1.5 block text-sm font-semibold text-slate-700">{form.role === "employer" ? "Your name" : "Full name"}</label>
            <input id="register-name" name="name" value={form.name} onChange={updateField} autoComplete="name" required className="w-full rounded-xl border border-slate-300 px-4 py-3 focus:border-amber-500 focus:outline-none focus:ring-4 focus:ring-amber-100" />
          </div>
          <div>
            <label htmlFor="register-email" className="mb-1.5 block text-sm font-semibold text-slate-700">Email address</label>
            <input id="register-email" name="email" type="email" value={form.email} onChange={updateField} autoComplete="email" required className="w-full rounded-xl border border-slate-300 px-4 py-3 focus:border-amber-500 focus:outline-none focus:ring-4 focus:ring-amber-100" />
          </div>
          <div>
            <label htmlFor="register-password" className="mb-1.5 block text-sm font-semibold text-slate-700">Password</label>
            <input id="register-password" name="password" type="password" value={form.password} onChange={updateField} autoComplete="new-password" minLength={8} required className="w-full rounded-xl border border-slate-300 px-4 py-3 focus:border-amber-500 focus:outline-none focus:ring-4 focus:ring-amber-100" />
            <button
              type="button"
              onClick={() => setForgotPasswordOpen(true)}
              className="mt-2 text-sm font-semibold text-amber-700 hover:underline"
            >
              Forgot password?
            </button>
          </div>
          {form.role === "employer" ? (
            <div>
              <label htmlFor="register-company" className="mb-1.5 block text-sm font-semibold text-slate-700">Company name</label>
              <input id="register-company" name="companyName" value={form.companyName} onChange={updateField} required className="w-full rounded-xl border border-slate-300 px-4 py-3" />
            </div>
          ) : (
            <>
              <div>
                <label htmlFor="register-phone" className="mb-1.5 block text-sm font-semibold text-slate-700">Phone (optional)</label>
                <input id="register-phone" name="phone" type="tel" value={form.phone} onChange={updateField} autoComplete="tel" className="w-full rounded-xl border border-slate-300 px-4 py-3" />
              </div>
              <div>
                <label htmlFor="register-country" className="mb-1.5 block text-sm font-semibold text-slate-700">Country</label>
                <select id="register-country" name="country" value={form.country} onChange={updateField} className="w-full rounded-xl border border-slate-300 px-4 py-3">
                  <option value="">Select your country</option>
                  {africaLocations.map(({ country }) => <option key={country} value={country}>{country}</option>)}
                </select>
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="register-bio" className="mb-1.5 block text-sm font-semibold text-slate-700">Professional summary (optional)</label>
                <textarea id="register-bio" name="bio" value={form.bio} onChange={updateField} rows={3} maxLength={1200} className="w-full rounded-xl border border-slate-300 px-4 py-3" placeholder="A concise introduction to your experience and goals" />
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="register-target-roles" className="mb-1.5 block text-sm font-semibold text-slate-700">Target roles (optional)</label>
                <input id="register-target-roles" name="targetRoles" value={form.targetRoles} onChange={updateField} className="w-full rounded-xl border border-slate-300 px-4 py-3" placeholder="Operations Manager, Business Analyst" />
              </div>
              <div className="sm:col-span-2 rounded-xl border border-slate-200 p-4">
                <label className="flex items-start gap-3 text-sm leading-6 text-slate-700">
                  <input type="checkbox" checked={jobAlertsEnabled} onChange={(event) => setJobAlertsEnabled(event.target.checked)} className="mt-1" />
                  <span><strong className="block">Email me personalized role matches</strong>This is optional. We’ll only send profile-matched roles after you verify your email. Recommendations remain available on your dashboard if you leave this off.</span>
                </label>
                {jobAlertsEnabled && (
                  <label htmlFor="register-alert-frequency" className="mt-3 grid gap-1 text-sm font-semibold text-slate-700">
                    Email frequency
                    <select id="register-alert-frequency" value={jobAlertFrequency} onChange={(event) => setJobAlertFrequency(event.target.value)} className="rounded-xl border border-slate-300 px-4 py-3 font-normal">
                      <option value="instant">As new matches are found</option>
                      <option value="daily">Daily digest</option>
                      <option value="weekly">Weekly digest</option>
                    </select>
                  </label>
                )}
              </div>
            </>
          )}
          <div className="grid gap-3 sm:col-span-2">
            <label className="flex items-start gap-2 text-sm leading-6 text-slate-700">
              <input type="checkbox" checked={termsAccepted} onChange={(event) => setTermsAccepted(event.target.checked)} required className="mt-1" />
              <span>I agree to the <Link to="/terms" className="font-semibold text-amber-700 underline">Terms of Use</Link>.</span>
            </label>
            <label className="flex items-start gap-2 text-sm leading-6 text-slate-700">
              <input type="checkbox" checked={privacyAccepted} onChange={(event) => setPrivacyAccepted(event.target.checked)} required className="mt-1" />
              <span>I acknowledge the <Link to="/privacy" className="font-semibold text-amber-700 underline">Privacy Policy</Link>.</span>
            </label>
          </div>
          <button type="submit" disabled={submitting || verificationSent || !termsAccepted || !privacyAccepted} aria-busy={submitting} className="mt-2 inline-flex items-center justify-center gap-2 rounded-xl bg-amber-500 px-5 py-3 font-bold text-slate-950 transition hover:bg-amber-400 disabled:cursor-wait disabled:opacity-60 sm:col-span-2">
            {submitting && <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-950/30 border-t-slate-950" aria-hidden="true" />}
            {submitting ? "Creating your account..." : "Create free account"}
          </button>
          <p aria-live="polite" className="sr-only sm:col-span-2">
            {submitting ? "Creating your account." : ""}
          </p>
        </form>
        <div className="mt-6 border-t border-slate-200 pt-5">
          <p className="mb-3 text-center text-sm font-semibold text-slate-600">Or continue with Google</p>
          <GoogleSignInButton
            role={form.role}
            companyName={form.companyName}
            termsAccepted={termsAccepted}
            privacyAccepted={privacyAccepted}
            enabled={termsAccepted && privacyAccepted && (form.role !== "employer" || Boolean(form.companyName.trim()))}
            onComplete={() => navigate("/profile-view", { replace: true })}
          />
        </div>
        <p className="mt-5 text-center text-sm text-slate-600">Already have an account? <Link to="/login" className="font-bold text-amber-700 hover:underline">Sign in</Link></p>
      </section>
      {forgotPasswordOpen && (
        <ForgotPasswordModal
          initialEmail={form.email}
          onClose={() => setForgotPasswordOpen(false)}
        />
      )}
    </main>
  );
};

export default Register;
