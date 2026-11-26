import { useEffect, useRef, useState } from "react";
import api from "../services/api";

const ResendVerification = ({ initialEmail = "" }) => {
  const [email, setEmail] = useState(initialEmail);
  const [feedback, setFeedback] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const emailInput = useRef(null);

  useEffect(() => setEmail(initialEmail), [initialEmail]);

  const submit = async () => {
    if (!emailInput.current?.reportValidity()) return;

    const trimmedEmail = email.trim();
    setFeedback(null);
    setSubmitting(true);
    try {
      const { data } = await api.post("/auth/resend-verification", { email: trimmedEmail });
      setFeedback({
        type: "success",
        message: data?.message || `A verification link has been sent to ${trimmedEmail}. Check your inbox and spam folder.`,
      });
    } catch (error) {
      const message = error.response?.status === 429
        ? error.response?.data?.message || "Too many verification requests. Please wait before trying again."
        : error.response?.data?.message || "We couldn't send a verification link. Check your connection and try again.";
      setFeedback({ type: "error", message });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
      <label htmlFor="verification-email" className="block text-sm font-semibold text-slate-700">Resend email verification link</label>
      <div className="mt-2 flex flex-col gap-2 sm:flex-row">
        <input ref={emailInput} id="verification-email" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2" />
        <button type="button" onClick={submit} disabled={submitting} aria-busy={submitting} className="rounded-lg bg-slate-800 px-4 py-2 font-semibold text-white disabled:cursor-wait disabled:opacity-60">{submitting ? "Sending…" : "Resend link"}</button>
      </div>
      {submitting && <p role="status" className="mt-3 text-sm text-slate-700">Sending verification link…</p>}
      {feedback && (
        <p role={feedback.type === "error" ? "alert" : "status"} className={`mt-3 text-sm ${feedback.type === "error" ? "text-red-700" : "text-emerald-700"}`}>
          {feedback.message}
        </p>
      )}
    </div>
  );
};

export default ResendVerification;
