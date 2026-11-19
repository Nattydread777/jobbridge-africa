import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { updatePageMetadata } from "../utils/pageMetadata";
const pages = {
  "/": ["JobBridge Africa | Find Jobs Across Africa", "Discover job opportunities across Africa and worldwide with JobBridge Africa."],
  "/jobs": ["Find Jobs Across Africa | JobBridge Africa", "Search jobs by keyword, location, work arrangement, job type, and category."],
  "/sdg-impact": ["Our SDG 8 Impact | JobBridge Africa", "Learn how JobBridge Africa supports access to decent work and economic opportunity."],
  "/mission": ["Our SDG 8 Impact | JobBridge Africa", "Learn how JobBridge Africa supports access to decent work and economic opportunity."],
  "/ai-cv-tool": ["CV Refinisher | JobBridge Africa", "Review your CV against a job description with a privacy-conscious keyword tool."],
  "/royal-merchant": ["Royal Merchant Cooperative Study Support | JobBridge Africa", "Explore Royal Merchant MPCS cooperative membership and training-support information."],
  "/employers": ["Hire African Talent | JobBridge Africa", "Post opportunities and connect with job seekers across African markets."],
  "/about": ["About JobBridge Africa", "Our story, team, partners, and commitment to decent work across Africa."],
  "/contact": ["Contact JobBridge Africa", "Get support from JobBridge Africa by email, phone, or contact form."],
  "/career-resources": ["Career Resources | JobBridge Africa", "Explore practical career tools and guidance for your job search."],
  "/ai-matching": ["AI Job Matching | JobBridge Africa", "Discover job recommendations based on your profile and preferences."],
  "/pan-african-network": ["Pan-African Job Network | JobBridge Africa", "Explore employment opportunities across African markets."],
  "/pricing": ["Pricing | JobBridge Africa", "JobBridge Africa launch pricing, included features, and employer fee information."],
  "/privacy": ["Privacy Policy | JobBridge Africa", "How JobBridge Africa processes, stores, and protects personal information and CV data."],
  "/terms": ["Terms of Use | JobBridge Africa", "Terms for job seekers, employers, and users of JobBridge Africa tools."],
  "/cookies": ["Cookie Notice | JobBridge Africa", "Learn about cookies and manage your optional cookie preferences."],
  "/faq": ["Frequently Asked Questions | JobBridge Africa", "Answers for job seekers and employers using JobBridge Africa."],
  "/login": ["Sign In | JobBridge Africa", "Sign in to your JobBridge Africa account."],
  "/register": ["Create an Account | JobBridge Africa", "Create a JobBridge Africa account as a job seeker or employer."],
  "/upload-resume": ["Upload Your Resume | JobBridge Africa", "Manage the resume associated with your JobBridge Africa profile."],
};
const privatePaths = new Set([
  "/login", "/register", "/dashboard", "/employer-dashboard", "/profile",
  "/profile-view", "/my-jobs", "/post-job", "/upload-resume", "/admin/team", "/admin/users",
]);

const RouteMetadata = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    const exactPage = pages[pathname];
    const isJob = /^\/jobs\/[^/]+$/.test(pathname);
    const isResetPassword = pathname.startsWith("/reset-password/");
    const isVerifyEmail = pathname.startsWith("/verify-email/");
    const isKnownPage = Boolean(exactPage) || isJob || isResetPassword || isVerifyEmail
      || pathname.startsWith("/admin/")
      || privatePaths.has(pathname);
    const [title, description] = exactPage || (isJob
      ? ["Job Details | JobBridge Africa", "Explore this job opportunity and application details on JobBridge Africa."]
      : isKnownPage
        ? ["Account | JobBridge Africa", "Manage your JobBridge Africa account."]
        : ["Page Not Found | JobBridge Africa", "The requested JobBridge Africa page could not be found."]);
    updatePageMetadata({
      title,
      description,
      path: pathname,
      noIndex: privatePaths.has(pathname)
        || pathname.startsWith("/admin/")
        || isResetPassword
        || isVerifyEmail
        || !isKnownPage,
    });
  }, [pathname]);

  return null;
};

export default RouteMetadata;
