import { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import CvOptimizerModal from "../components/CvOptimizerModal";

const AICvTool = () => {
  const navigate = useNavigate();
  const closeModal = useCallback(() => navigate("/"), [navigate]);

  return <CvOptimizerModal onClose={closeModal} />;
};

export default AICvTool;
