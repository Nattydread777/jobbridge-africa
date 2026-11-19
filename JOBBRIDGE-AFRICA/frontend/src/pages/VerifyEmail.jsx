import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import api from "../services/api";

const VerifyEmail = () => {
  const { token } = useParams();
  const [status, setStatus] = useState({ loading: true, message: "" });

  useEffect(() => {
    let active = true;
    api.post(`/auth/verify-email/${token}`)
      .then(({ data }) => active && setStatus({ loading: false, message: data.message }))
      .catch((error) => active && setStatus({
        loading: false,
        message: error.response?.data?.message || "Email verification failed. Request a new link and try again.",
      }));
    return () => { active = false; };
  }, [token]);

  return (
    <main className="mx-auto flex min-h-[60vh] max-w-2xl items-center px-4 py-12">
      <section className="w-full rounded-3xl bg-white p-8 text-center shadow-lg">
        <h1 className="text-3xl font-black text-charcoal">Email verification</h1>
        <p role="status" className="mt-4 text-slate-700">{status.loading ? "Verifying your email…" : status.message}</p>
        {!status.loading && <Link to="/login" className="mt-6 inline-block rounded-lg bg-terracotta px-5 py-3 font-semibold text-white">Continue to sign in</Link>}
      </section>
    </main>
  );
};

export default VerifyEmail;
