import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import GoogleSignInButton from "../components/GoogleSignInButton";
import ResendVerification from "../components/ResendVerification";

const Register = () => {
  const [searchParams] = useSearchParams();
  const [form, setForm] = useState({
    name: "", email: "", password: "", role: searchParams.get("role") === "employer" ? "employer" : "job_seeker",
    companyName: "",
  });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [hasRegistered, setHasRegistered] = useState(false);
  const [verificationSent, setVerificationSent] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const { register, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated && !hasRegistered) navigate("/profile-view", { replace: true });
  }, [hasRegistered, isAuthenticated, navigate]);

  const updateField = (event) =>
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));

  const resetRegistrationDraft = (emailAddress) => {
    setRegisteredEmail(emailAddress);
    setForm({
      name: "",
      email: "",
      password: "",
      role: searchParams.get("role") === "employer" ? "employer" : "job_seeker",
      companyName: "",
    });
    setTermsAccepted(false);
    setPrivacyAccepted(false);
  };

  const completeRegistration = (emailAddress) => {
    resetRegistrationDraft(emailAddress);
    setHasRegistered(true);
    setVerificationSent(true);
  };

  const handleRegister = async (event) => {
    event.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const emailAddress = form.email.trim();
      await register({
        name: form.name,
        email: form.email,
        password: form.password,
        role: form.role,
        ...(form.role === "employer" ? { companyName: form.companyName } : {}),
        termsAccepted,
        privacyAccepted,
      });
      completeRegistration(emailAddress);
    } catch (registrationError) {
      const message = registrationError.response?.data?.message || "We couldn't create your account. Check your connection and try again.";
      setError(message);
      if (registrationError.response?.status === 503 && message.toLowerCase().includes("account was created")) {
        completeRegistration(form.email.trim());
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
          <p className="mt-2 text-slate-600">Start with your account details. You can complete your profile after verifying your email.</p>
        </div>
        {error && <div role="alert" className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>}
        {verificationSent && (
          <div className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
            <p className="font-semibold">Account created. Verify your email before signing in.</p>
            <p className="mt-1">We sent a one-time verification link to {registeredEmail}. After verifying and signing in, choose Auto-fill from CV or Manual entry in your profile editor.</p>
            <ResendVerification initialEmail={registeredEmail} />
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
          </div>
          {form.role === "employer" && (
            <div>
              <label htmlFor="register-company" className="mb-1.5 block text-sm font-semibold text-slate-700">Company name</label>
              <input id="register-company" name="companyName" value={form.companyName} onChange={updateField} required className="w-full rounded-xl border border-slate-300 px-4 py-3" />
            </div>
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
    </main>
  );
};

export default Register;
