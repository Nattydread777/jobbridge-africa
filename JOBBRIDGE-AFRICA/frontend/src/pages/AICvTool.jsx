import { useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import CvOptimizerModal from "../components/CvOptimizerModal";

const AICvTool = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const closeModal = useCallback(() => navigate("/"), [navigate]);
  const jobId = new URLSearchParams(location.search).get("jobId") || "";

  return <CvOptimizerModal onClose={closeModal} jobId={jobId} />;
};

export default AICvTool;
