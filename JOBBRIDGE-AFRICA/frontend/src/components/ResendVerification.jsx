import { useEffect, useState } from "react";
import api from "../services/api";

const ResendVerification = ({ initialEmail = "" }) => {
  const [email, setEmail] = useState(initialEmail);
  const [status, setStatus] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => setEmail(initialEmail), [initialEmail]);

  const submit = async (event) => {
    event.preventDefault();
    setStatus("");
    setSubmitting(true);
    try {
      const { data } = await api.post("/auth/resend-verification", { email: email.trim() });
      setStatus(data.message);
    } catch (error) {
      const status = error.response?.status === 429
        ? "rate_limited"
        : "error";
      setStatus(error.response?.data?.message || (status === "rate_limited"
        ? "Too many verification requests. Please wait before trying again."
        : "We couldn't send a verification link. Check your connection and try again."));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={submit} className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
      <label htmlFor="verification-email" className="block text-sm font-semibold text-slate-700">Resend email verification link</label>
      <div className="mt-2 flex flex-col gap-2 sm:flex-row">
        <input id="verification-email" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2" />
        <button type="submit" disabled={submitting} className="rounded-lg bg-slate-800 px-4 py-2 font-semibold text-white disabled:opacity-60">{submitting ? "Sending…" : "Resend link"}</button>
      </div>
      {status && <p role={status.startsWith("Too many") || status.startsWith("We couldn't") ? "alert" : "status"} className="mt-3 text-sm text-slate-700">{status}</p>}
    </form>
  );
};

export default ResendVerification;
