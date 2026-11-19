import { useEffect, useRef, useState } from "react";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

const GoogleSignInButton = ({
  role = "job_seeker",
  companyName = "",
  termsAccepted = false,
  privacyAccepted = false,
  enabled = true,
  onComplete = () => {},
}) => {
  const buttonRef = useRef(null);
  const callbackRef = useRef(null);
  const [message, setMessage] = useState("");
  const [scriptReady, setScriptReady] = useState(false);
  const { refreshUser } = useAuth();

  useEffect(() => {
    callbackRef.current = async (response) => {
      setMessage("");
      try {
        await api.post("/auth/google", {
          credential: response.credential,
          role,
          companyName,
          termsAccepted,
          privacyAccepted,
        });
        await refreshUser();
        onComplete();
      } catch (error) {
        setMessage(error.response?.data?.message || "Google sign-in failed. Please try again.");
      }
    };
  }, [role, companyName, termsAccepted, privacyAccepted, onComplete, refreshUser]);

  useEffect(() => {
    if (!CLIENT_ID || !enabled) return undefined;
    let active = true;
    const scriptId = "google-identity-services";
    let script = document.getElementById(scriptId);
    const handleError = () => setMessage("Google sign-in could not load. Please use email and password.");
    const initialize = () => {
      if (!active || !window.google?.accounts?.id || !buttonRef.current) return;
      window.google.accounts.id.initialize({
        client_id: CLIENT_ID,
        callback: (response) => callbackRef.current?.(response),
      });
      buttonRef.current.replaceChildren();
      window.google.accounts.id.renderButton(buttonRef.current, {
        theme: "outline",
        size: "large",
        shape: "rectangular",
        text: "continue_with",
        width: 320,
      });
      setScriptReady(true);
    };

    if (window.google?.accounts?.id) {
      initialize();
    } else {
      if (!script) {
        script = document.createElement("script");
        script.id = scriptId;
        script.src = "https://accounts.google.com/gsi/client";
        script.async = true;
        script.defer = true;
        document.head.appendChild(script);
      }
      script.addEventListener("load", initialize);
      script.addEventListener("error", handleError);
    }
    return () => {
      active = false;
      script?.removeEventListener("load", initialize);
      script?.removeEventListener("error", handleError);
    };
  }, [enabled]);

  if (!CLIENT_ID) {
    return <p className="text-center text-sm text-slate-500">Google sign-in is unavailable until a Google client ID is configured.</p>;
  }
  if (!enabled) {
    return <p className="text-center text-sm text-slate-500">Accept the Terms of Use and Privacy Policy first to continue with Google.</p>;
  }

  return (
    <div className="grid justify-items-center gap-2">
      <div ref={buttonRef} aria-label="Continue with Google" />
      {message && <p role="alert" className="text-sm text-red-700">{message}</p>}
      {!scriptReady && !message && <p className="text-xs text-slate-500">Loading Google sign-in…</p>}
    </div>
  );
};

export default GoogleSignInButton;
