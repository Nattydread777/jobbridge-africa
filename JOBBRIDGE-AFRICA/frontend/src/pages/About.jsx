import { useState, useEffect } from "react";
import api from "../services/api";
import { FaLinkedin, FaGithub, FaTwitter } from "react-icons/fa";

const About = () => {
  const [teamMembers, setTeamMembers] = useState([]);
  const [loadingTeam, setLoadingTeam] = useState(true);

  useEffect(() => {
    fetchTeamMembers();
  }, []);

  const fetchTeamMembers = async () => {
    try {
      const { data } = await api.get("/team");
      setTeamMembers(data);
    } catch (error) {
      console.error("Failed to fetch team members:", error);
    } finally {
      setLoadingTeam(false);
    }
  };

  return (
    <>
      <div className="px-6 py-10 md:py-14 max-w-4xl mx-auto text-slate-800">
        <header className="mb-8">
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-2">
            About JobBridge Africa
          </h1>
          <p className="text-base md:text-lg text-slate-600">
            Empowering Africa’s Workforce • Advancing SDG&nbsp;8
          </p>
        </header>
        <section className="space-y-4 mb-8">
          <p>
            JobBridge Africa is a Pan‑African initiative inspired by the Power
            Learn Project (PLP) Africa. Built on a strong foundation in MERN
            full‑stack development and digital innovation, we use AI to connect
            talent with opportunity across the continent.
          </p>
        </section>
        <section className="mb-10">
          <h2 className="text-xl md:text-2xl font-bold mb-3">Mission</h2>
          <p>
            We empower Africa’s workforce through AI‑driven job matching and
            career enablement, aligning with the United Nations Sustainable
            Development Goal 8 (SDG&nbsp;8): promoting sustained, inclusive
            economic growth, productive employment, and decent work for all.
          </p>
        </section>
        <section className="mb-10">
          <h2 className="text-xl md:text-2xl font-bold mb-3">Our Story</h2>
          <p className="mb-3">
            JobBridge Africa began as a passion project during PLP training and
            has grown into a platform designed to address one of Africa’s most
            urgent challenges: youth unemployment.
          </p>
          <p>
            By combining collaboration, innovation, and technology, we bridge
            the gap between job seekers, employers, and career development
            opportunities across Africa.
          </p>
        </section>
        <section className="mb-10">
          <h2 className="text-xl md:text-2xl font-bold mb-3">What We Do</h2>
          <ul className="list-disc pl-5 space-y-2">
            <li>
              <span className="font-medium">AI job matching:</span> Connects
              candidates to relevant roles across African markets.
            </li>
            <li>
              <span className="font-medium">Employer solutions:</span>{" "}
              Streamlined posting and talent discovery for organizations.
            </li>
            <li>
              <span className="font-medium">Career resources:</span> Practical
              tools and guidance to build employability.
            </li>
            <li>
              <span className="font-medium">Community:</span> A growing network
              of partners, mentors, and advocates for inclusive growth.
            </li>
          </ul>
        </section>
        <section className="mb-16">
          <h2 className="text-3xl md:text-4xl font-extrabold mb-10 text-primary text-center tracking-tight">
            Meet Our Team
          </h2>
          <div className="max-w-6xl mx-auto px-2 py-6 bg-white/60 rounded-xl shadow grid grid-cols-1 sm:grid-cols-2 gap-8">
            {/* Team Member 1 */}
            <div className="bg-white rounded-2xl shadow-lg p-8 flex flex-col items-center text-center hover:shadow-xl transition">
              <div className="w-28 h-28 rounded-full bg-gradient-to-br from-primary to-orange-400 flex items-center justify-center mb-4 overflow-hidden">
                <img
                  src="/team/nathaniel.jpg"
                  alt="Nathaniel Usikpedo"
                  className="w-full h-full object-cover rounded-full"
                />
              </div>
              <h3 className="font-bold text-lg text-gray-900 mb-1">
                Nathaniel Usikpedo
              </h3>
              <p className="text-primary font-medium mb-2">
                Founder, Project Manager & Software Developer
              </p>
              <p className="text-gray-600 text-sm mb-3">
                Certified MERN Full‑Stack Developer and SDG&nbsp;8 advocate,
                leading the strategic and technical direction of JobBridge
                Africa.
              </p>
            </div>
            {/* Team Member 2 */}
            <div className="bg-white rounded-2xl shadow-lg p-8 flex flex-col items-center text-center hover:shadow-xl transition">
              <div className="w-28 h-28 rounded-full bg-gradient-to-br from-primary to-orange-400 flex items-center justify-center mb-4 overflow-hidden">
                <img
                  src="/team/oghogho.jpg"
                  alt="Barr. Nathaniel‑Usikpedo Oghogho"
                  className="w-full h-full object-cover rounded-full"
                />
              </div>
              <h3 className="font-bold text-lg text-gray-900 mb-1">
                Barr. Nathaniel‑Usikpedo Oghogho
              </h3>
              <p className="text-primary font-medium mb-2">Legal Adviser</p>
              <p className="text-gray-600 text-sm mb-3">
                Ensures transparent operations, ethical compliance, and data
                protection best practices.
              </p>
            </div>
            {/* Team Member 3 */}
            <div className="bg-white rounded-2xl shadow-lg p-8 flex flex-col items-center text-center hover:shadow-xl transition">
              <div className="w-28 h-28 rounded-full bg-gradient-to-br from-primary to-orange-400 flex items-center justify-center mb-4 overflow-hidden">
                <img
                  src="/team/dedan.jpg"
                  alt="Dedan Okware"
                  className="w-full h-full object-cover rounded-full"
                />
              </div>
              <h3 className="font-bold text-lg text-gray-900 mb-1">
                Dedan Okware
              </h3>
              <p className="text-primary font-medium mb-2">
                Module Lead, MERN Stack Specialization, PLP
                <br />
                Software Engineer, ICP Blockchain Specialist, Coding
              </p>
              <p className="text-gray-600 text-sm mb-3">
                Mentor and early contributor who guided software architecture
                and development best practices.
              </p>
            </div>
            {/* Team Member 4 (Obesa Victory) */}
            <div className="bg-white rounded-2xl shadow-lg p-8 flex flex-col items-center text-center hover:shadow-xl transition">
              <div className="w-28 h-28 rounded-full bg-gradient-to-br from-primary to-orange-400 flex items-center justify-center mb-4 overflow-hidden">
                <img
                  src="/team/obesa.jpg"
                  alt="Obesa Victory"
                  className="w-full h-full object-cover rounded-full"
                />
              </div>
              <h3 className="font-bold text-lg text-gray-900 mb-1">
                Obesa Victory
              </h3>
              <p className="text-primary font-medium mb-2">
                Database Administrator
              </p>
              <p className="text-gray-600 text-sm mb-3">
                Professional database administrator working across the United
                States for over a decade. Early contributor to JobBridge
                Africa’s data infrastructure.
              </p>
            </div>
          </div>
          <div className="max-w-2xl mx-auto mt-10 px-2 py-6 bg-white/80 rounded-xl shadow flex flex-col items-center text-center">
            <div className="w-28 h-28 rounded-full bg-gradient-to-br from-primary to-orange-400 flex items-center justify-center mb-4 overflow-hidden">
              <img
                src="/team/plp.jpg"
                alt="PLP Africa"
                className="w-full h-full object-cover rounded-full"
              />
            </div>
            <h3 className="font-bold text-lg text-gray-900 mb-1">PLP Africa</h3>
            <p className="text-primary font-medium mb-2">
              Support & Inspiration
            </p>
            <p className="text-gray-600 text-sm mb-3">
              We acknowledge the continued support of PLP Africa, whose mission
              to empower one million African youth with tech skills inspires our
              work.
            </p>
          </div>
        </section>
        <section className="mb-10">
          <h2 className="text-xl md:text-2xl font-bold mb-3">Our Commitment</h2>
          <p>
            We believe technology can close the opportunity gap. We are
            committed to leveraging AI, data, and human‑centered design to help
            every young person across Africa access meaningful work and
            sustainable livelihoods.
          </p>
        </section>
        <section>
          <h2 className="text-xl md:text-2xl font-bold mb-3">Learn More</h2>
          <ul className="space-y-2">
            <li>
              <a
                className="text-blue-600 hover:underline"
                href="https://www.jobbridgeafrica.org"
                target="_blank"
                rel="noreferrer"
              >
                www.jobbridgeafrica.org
              </a>
            </li>
            <li>
              <a
                className="text-blue-600 hover:underline"
                href="mailto:info@jobbridgeafrica.org"
              >
                info@jobbridgeafrica.org
              </a>
            </li>
            <li>Follow us: LinkedIn, X, Instagram, Facebook</li>
          </ul>
        </section>
      </div>
    </>
  );
};

export default About;
