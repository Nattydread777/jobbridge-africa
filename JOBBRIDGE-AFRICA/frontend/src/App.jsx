import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import Header from "./components/Header";
import Footer from "./components/Footer";
import Home from "./pages/Home";
import Jobs from "./pages/Jobs";
import JobDetails from "./pages/JobDetails";
import About from "./pages/About";
import Employers from "./pages/Employers";
import Contact from "./pages/Contact";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ResetPassword from "./pages/ResetPassword";
import Dashboard from "./pages/Dashboard";
import MyJobs from "./pages/MyJobs";
import Profile from "./pages/Profile";
import ProfileView from "./pages/ProfileView";
import PostJob from "./pages/PostJob";
import AIMatching from "./pages/AIMatching";
import PanAfricanNetwork from "./pages/PanAfricanNetwork";
import SDGImpact from "./pages/SDGImpact";
import EmployerDashboard from "./pages/EmployerDashboard";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsOfService from "./pages/TermsOfService";
import UploadResume from "./pages/UploadResume";
import CareerResources from "./pages/CareerResources";
import Pricing from "./pages/Pricing";
import AICvTool from "./pages/AICvTool";
import RouteMetadata from "./components/RouteMetadata";
import CookieConsentBanner from "./components/CookieConsentBanner";
import Cookies from "./pages/Cookies";
import FAQ from "./pages/FAQ";
import RoyalMerchant from "./pages/RoyalMerchant";
import NotFound from "./pages/NotFound";
import VerifyEmail from "./pages/VerifyEmail";
import UnsubscribeJobAlerts from "./pages/UnsubscribeJobAlerts";

export const AppContent = () => (
  <div className="min-h-screen flex flex-col">
    <RouteMetadata />
    <Header />
    <main className="flex-1 pt-20">
      <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/jobs" element={<Jobs />} />
              <Route path="/jobs/:id" element={<JobDetails />} />
              <Route path="/about" element={<About />} />
              <Route path="/employers" element={<Employers />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/verify-email/:token" element={<VerifyEmail />} />
              <Route path="/unsubscribe-job-alerts" element={<UnsubscribeJobAlerts />} />
              <Route path="/reset-password/:token" element={<ResetPassword />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/profile-view" element={<ProfileView />} />
              <Route path="/my-jobs" element={<MyJobs />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/post-job" element={<PostJob />} />
              <Route
                path="/employer-dashboard"
                element={<EmployerDashboard />}
              />
              <Route path="/ai-matching" element={<AIMatching />} />
              <Route
                path="/pan-african-network"
                element={<PanAfricanNetwork />}
              />
              <Route path="/sdg-impact" element={<SDGImpact />} />
              <Route path="/mission" element={<SDGImpact />} />
              <Route path="/privacy" element={<PrivacyPolicy />} />
              <Route path="/terms" element={<TermsOfService />} />
              <Route path="/upload-resume" element={<UploadResume />} />
              <Route path="/career-resources" element={<CareerResources />} />
              <Route path="/pricing" element={<Pricing />} />
              <Route path="/ai-cv-tool" element={<AICvTool />} />
              <Route path="/royal-merchant" element={<RoyalMerchant />} />
              <Route path="/cookies" element={<Cookies />} />
              <Route path="/faq" element={<FAQ />} />
              <Route path="*" element={<NotFound />} />
      </Routes>
    </main>
    <Footer />
    <CookieConsentBanner />
  </div>
);

function App() {
  return (
    <AuthProvider>
      <Router>
        <AppContent />
      </Router>
    </AuthProvider>
  );
}

export default App;
