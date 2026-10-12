import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import api from "../services/api";

const ResetPassword = () => {
  const { token } = useParams();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setSuccess("");
    if (password !== confirmPassword) {
      setError("The passwords do not match.");
      return;
    }
    setSubmitting(true);
    try {
      const response = await api.post(`/auth/reset-password/${encodeURIComponent(token || "")}`, { password });
      setSuccess(response.data.message);
    } catch (requestError) {
      setError(requestError.response?.data?.message || "We couldn’t reset your password. Request a new reset link and try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="mx-auto flex min-h-[calc(100vh-7rem)] max-w-6xl items-center justify-center px-4 py-10">
      <section className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-lg md:p-9">
        <h1 className="text-3xl font-bold text-slate-900">Choose a new password</h1>
        <p className="mt-2 text-slate-600">Use at least 8 characters. Reset links expire after 60 minutes and can only be used once.</p>
        {success ? (
          <div role="status" className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-900">
            <p>{success}</p>
            <Link to="/login" className="mt-3 inline-block font-bold underline">Return to sign in</Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label htmlFor="reset-password" className="mb-1.5 block text-sm font-semibold text-slate-700">New password</label>
              <input
                id="reset-password"
                type="password"
                autoComplete="new-password"
                minLength={8}
                maxLength={128}
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-amber-500 focus:ring-4 focus:ring-amber-100"
              />
            </div>
            <div>
              <label htmlFor="reset-password-confirm" className="mb-1.5 block text-sm font-semibold text-slate-700">Confirm new password</label>
              <input
                id="reset-password-confirm"
                type="password"
                autoComplete="new-password"
                minLength={8}
                maxLength={128}
                required
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-amber-500 focus:ring-4 focus:ring-amber-100"
              />
            </div>
            {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>}
            <button type="submit" disabled={submitting} className="w-full rounded-xl bg-amber-500 px-5 py-3 font-bold text-slate-950 hover:bg-amber-400 disabled:cursor-wait disabled:opacity-60">
              {submitting ? "Updating password…" : "Reset password"}
            </button>
          </form>
        )}
      </section>
    </main>
  );
};

export default ResetPassword;
