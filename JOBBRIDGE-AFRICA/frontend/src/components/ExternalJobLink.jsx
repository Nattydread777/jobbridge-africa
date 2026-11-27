import { useState } from "react";
import { Link } from "react-router-dom";
import PropTypes from "prop-types";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";

const getSafeExternalUrl = (value) => {
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol) ? url.href : "";
  } catch {
    return "";
  }
};

const ExternalJobLink = ({ jobId, href, linkType = "application", className = "", children }) => {
  const { isAuthenticated, user } = useAuth();
  const [clicked, setClicked] = useState(false);
  const [tracking, setTracking] = useState(false);
  const [tracked, setTracked] = useState(false);
  const [trackingError, setTrackingError] = useState("");
  const safeHref = getSafeExternalUrl(href);

  if (!safeHref) return null;

  const handleClick = () => {
    setClicked(true);
    api.post(`/jobs/${encodeURIComponent(jobId)}/outbound-click`, { linkType }).catch((error) => {
      console.error(
        "Could not record outbound job click:",
        error.response?.data?.message || error.message,
      );
    });
  };

  const handleTrackApplication = async () => {
    setTracking(true);
    setTrackingError("");
    try {
      await api.post(`/applications/external/${encodeURIComponent(jobId)}`);
      setTracked(true);
    } catch (error) {
      setTrackingError(
        error.response?.data?.message || "We couldn't update your application tracker. Please try again.",
      );
    } finally {
      setTracking(false);
    }
  };

  return (
    <div className="flex flex-col items-start gap-2">
      <span className="inline-flex rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-950">
        External listing · opens outside JobBridge Africa
      </span>
      <a
        href={safeHref}
        target="_blank"
        rel="noopener noreferrer"
        onClick={handleClick}
        className={className}
      >
        {children}
      </a>
      {clicked && linkType === "application" && (
        <div className="text-sm text-slate-700" aria-live="polite">
          {tracked ? (
            <p>
              Added to your application tracker.{" "}
              <Link to="/my-jobs" className="font-semibold text-primary underline">View My Applications</Link>
            </p>
          ) : isAuthenticated && user?.role === "job_seeker" ? (
            <div className="flex flex-wrap items-center gap-2">
              <span>Did you apply?</span>
              <button
                type="button"
                onClick={handleTrackApplication}
                disabled={tracking}
                className="font-semibold text-primary underline disabled:opacity-60"
              >
                {tracking ? "Saving…" : "Add to My Applications"}
              </button>
            </div>
          ) : isAuthenticated ? (
            <p>Application tracking is available to job seekers.</p>
          ) : (
            <p>
              Did you apply?{" "}
              <Link to="/login" className="font-semibold text-primary underline">Sign in to track it</Link>
            </p>
          )}
          {trackingError && <p role="alert" className="mt-1 text-red-700">{trackingError}</p>}
        </div>
      )}
    </div>
  );
};

ExternalJobLink.propTypes = {
  jobId: PropTypes.string.isRequired,
  href: PropTypes.string.isRequired,
  linkType: PropTypes.oneOf(["application", "source"]),
  className: PropTypes.string,
  children: PropTypes.node.isRequired,
};

export default ExternalJobLink;
