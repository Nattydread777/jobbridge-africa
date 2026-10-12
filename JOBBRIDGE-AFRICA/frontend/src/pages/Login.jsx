import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import ForgotPasswordModal from "../components/ForgotPasswordModal";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [forgotPasswordOpen, setForgotPasswordOpen] = useState(false);
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated) navigate("/profile-view", { replace: true });
  }, [isAuthenticated, navigate]);

  const handleLogin = async (event) => {
    event.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await login(email.trim(), password);
      navigate("/profile-view", { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || "We couldn't sign you in. Check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="mx-auto grid min-h-[calc(100vh-7rem)] max-w-6xl items-stretch gap-8 px-4 py-10 md:grid-cols-[1.05fr_0.95fr] md:px-8">
      <section className="flex flex-col justify-between rounded-3xl bg-slate-950 p-8 text-white shadow-xl md:p-12">
        <Link to="/" className="w-fit text-lg font-black tracking-tight">
          JobBridge <span className="text-amber-400">Africa</span>
        </Link>
        <div className="my-10">
          <p className="mb-4 inline-flex rounded-full border border-amber-400/40 px-3 py-1 text-sm font-semibold text-amber-300">
            Decent work. More opportunity.
          </p>
          <h1 className="max-w-xl text-4xl font-extrabold leading-tight md:text-5xl">
            Your next opportunity starts with a stronger connection.
          </h1>
          <p className="mt-5 max-w-lg leading-7 text-slate-300">
            Find roles that fit your skills, build a profile employers can trust, and move your career forward.
          </p>
        </div>
        <p className="text-sm text-slate-400">Building pathways to decent work across Africa · UN SDG 8</p>
      </section>

      <section className="flex items-center justify-center rounded-3xl border border-slate-200 bg-white p-6 shadow-lg md:p-10">
        <form onSubmit={handleLogin} className="w-full max-w-md space-y-5">
          <div>
            <h2 className="text-3xl font-bold text-slate-900">Welcome back</h2>
            <p className="mt-2 text-slate-600">Sign in to continue to your JobBridge account.</p>
          </div>
          {error && (
            <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
              {error}
            </div>
          )}
          <div>
            <label htmlFor="login-email" className="mb-1.5 block text-sm font-semibold text-slate-700">Email address</label>
            <input
              id="login-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-amber-500 focus:ring-4 focus:ring-amber-100"
              required
            />
          </div>
          <div>
            <label htmlFor="login-password" className="mb-1.5 block text-sm font-semibold text-slate-700">Password</label>
            <input
              id="login-password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-amber-500 focus:ring-4 focus:ring-amber-100"
              required
            />
            <button
              type="button"
              onClick={() => setForgotPasswordOpen(true)}
              className="mt-2 block text-sm font-semibold text-amber-700 hover:underline"
            >
              Forgot password?
            </button>
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-xl bg-amber-500 px-5 py-3 font-bold text-slate-950 transition hover:bg-amber-400 disabled:cursor-wait disabled:opacity-60"
          >
            {submitting ? "Signing you in..." : "Sign in"}
          </button>
          <p className="text-center text-sm text-slate-600">
            New to JobBridge Africa? <Link to="/register" className="font-bold text-amber-700 hover:underline">Create an account</Link>
          </p>
        </form>
      </section>
      {forgotPasswordOpen && (
        <ForgotPasswordModal
          initialEmail={email}
          onClose={() => setForgotPasswordOpen(false)}
        />
      )}
    </main>
  );
};

export default Login;
