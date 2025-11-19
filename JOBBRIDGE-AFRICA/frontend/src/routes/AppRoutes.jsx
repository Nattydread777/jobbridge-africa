import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Header from "../components/Header";
import Footer from "../components/Footer";
import Home from "../pages/Home";
import Jobs from "../pages/Jobs";
import JobDetails from "../pages/JobDetails";
import About from "../pages/About";
import Contact from "../pages/Contact";
import Login from "../pages/Login";
import Register from "../pages/Register";
import TeamManagement from "../pages/admin/TeamManagement";
import UserAdmin from "../pages/admin/UserAdmin";

const AppRoutes = () => (
  <Router>
    <Header />
    <main className="pt-20 min-h-screen bg-neutral text-text">
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/jobs" element={<Jobs />} />
        <Route path="/jobs/:id" element={<JobDetails />} />
        <Route path="/about" element={<About />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/admin/team" element={<TeamManagement />} />
        <Route path="/admin/users" element={<UserAdmin />} />
      </Routes>
    </main>
    <Footer />
  </Router>
);

export default AppRoutes;
