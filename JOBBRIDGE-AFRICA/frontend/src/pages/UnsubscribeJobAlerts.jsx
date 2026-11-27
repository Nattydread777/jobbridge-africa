import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import api from "../services/api";

const UnsubscribeJobAlerts = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || "";
  const [status, setStatus] = useState({ loading: false, message: "", success: false });

  const handleUnsubscribe = async () => {
    setStatus({ loading: true, message: "", success: false });
    try {
      const { data } = await api.post("/job-alerts/unsubscribe", { token });
      setStatus({ loading: false, message: data.message, success: true });
    } catch (error) {
      setStatus({
        loading: false,
        message: error.response?.data?.message || "We couldn't process this unsubscribe link. You can turn alerts off in your profile.",
        success: false,
      });
    }
  };

  return (
    <main className="mx-auto flex min-h-[60vh] max-w-2xl items-center px-4 py-12">
      <section className="w-full rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-lg">
        <h1 className="text-3xl font-black text-slate-950">Personalized job alerts</h1>
        {status.message ? (
          <p role={status.success ? "status" : "alert"} className={`mt-4 rounded-lg p-4 text-sm ${status.success ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-800"}`}>
            {status.message}
          </p>
        ) : (
          <>
            <p className="mt-4 text-slate-600">Confirm below to stop profile-matched job digest emails. This page does not change your alert settings until you confirm.</p>
            <button
              type="button"
              onClick={handleUnsubscribe}
              disabled={!token || status.loading}
              className="mt-6 rounded-lg bg-slate-900 px-5 py-3 font-semibold text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {status.loading ? "Updating…" : "Unsubscribe from email alerts"}
            </button>
            {!token && <p className="mt-3 text-sm text-red-700" role="alert">This unsubscribe link is missing its confirmation token.</p>}
          </>
        )}
        <p className="mt-6 text-sm text-slate-600">
          You can manage preferences in your <Link to="/profile" className="font-semibold text-amber-800 underline">profile</Link>.
        </p>
      </section>
    </main>
  );
};

export default UnsubscribeJobAlerts;
