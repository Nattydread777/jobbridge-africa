import { useEffect, useState } from "react";
import api from "../services/api";

const ForgotPasswordModal = ({ initialEmail, onClose }) => {
  const [email, setEmail] = useState(initialEmail || "");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    setMessage("");
    try {
      const response = await api.post("/auth/forgot-password", { email: email.trim() });
      setMessage(response.data.message);
    } catch (requestError) {
      setError(requestError.response?.data?.message || "We couldn’t submit your request. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/60 p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section role="dialog" aria-modal="true" aria-labelledby="forgot-password-title" className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="forgot-password-title" className="text-xl font-bold text-slate-900">Forgot your password?</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">Enter the email on your account and we’ll send a secure reset link if an account matches.</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close password reset dialog" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div>
            <label htmlFor="forgot-password-email" className="mb-1.5 block text-sm font-semibold text-slate-700">Email address</label>
            <input
              id="forgot-password-email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-amber-500 focus:ring-4 focus:ring-amber-100"
            />
          </div>
          {message && <p role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{message}</p>}
          {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>}
          <div className="flex justify-end gap-3">
            <button type="button" onClick={onClose} className="rounded-xl border border-slate-300 px-4 py-2.5 font-semibold text-slate-700 hover:bg-slate-50">Cancel</button>
            <button type="submit" disabled={submitting} className="rounded-xl bg-amber-500 px-4 py-2.5 font-bold text-slate-950 hover:bg-amber-400 disabled:cursor-wait disabled:opacity-60">
              {submitting ? "Sending…" : "Send reset link"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
};

export default ForgotPasswordModal;
