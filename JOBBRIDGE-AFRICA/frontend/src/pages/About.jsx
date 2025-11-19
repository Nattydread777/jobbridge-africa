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
          By combining collaboration, innovation, and technology, we bridge the
          gap between job seekers, employers, and career development
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
            <span className="font-medium">Employer solutions:</span> Streamlined
            posting and talent discovery for organizations.
          </li>
          <li>
            <span className="font-medium">Career resources:</span> Practical
            tools and guidance to build employability.
          </li>
          <li>
            <span className="font-medium">Community:</span> A growing network of
            partners, mentors, and advocates for inclusive growth.
          </li>
        </ul>
      </section>

      <section className="mb-10">
        <h2 className="text-xl md:text-2xl font-bold mb-6">Our Team</h2>

        {loadingTeam ? (
          <p className="text-gray-600">Loading team members...</p>
        ) : teamMembers.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {teamMembers.map((member) => (
              <div
                key={member._id}
                className="bg-white rounded-lg shadow-md p-6 text-center"
              >
                {member.photoUrl ? (
                  <img
                    src={member.photoUrl}
                    alt={member.name}
                    className="w-24 h-24 rounded-full mx-auto mb-4 object-cover"
                  />
                ) : (
                  <div className="w-24 h-24 rounded-full bg-blue-100 mx-auto mb-4 flex items-center justify-center text-blue-600 text-3xl font-bold">
                    {member.name.charAt(0)}
                  </div>
                )}
                <h3 className="font-semibold text-lg mb-1">{member.name}</h3>
                <p className="text-blue-600 text-sm mb-3">{member.role}</p>
                {member.bio && (
                  <p className="text-gray-600 text-sm mb-4">{member.bio}</p>
                )}

                <div className="flex justify-center gap-3">
                  {member.linkedIn && (
                    <a
                      href={member.linkedIn}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-700 hover:text-blue-900"
                      aria-label="LinkedIn"
                    >
                      <FaLinkedin size={20} />
                    </a>
                  )}
                  {member.github && (
                    <a
                      href={member.github}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-gray-700 hover:text-gray-900"
                      aria-label="GitHub"
                    >
                      <FaGithub size={20} />
                    </a>
                  )}
                  {member.twitter && (
                    <a
                      href={member.twitter}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-400 hover:text-blue-600"
                      aria-label="Twitter"
                    >
                      <FaTwitter size={20} />
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : null}

        {!loadingTeam && teamMembers.length === 0 && (
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold">
                Nathaniel Usikpedo (Nigeria) — Founder, Project Manager &
                Software Developer
              </h3>
              <p>
                A certified MERN Full‑Stack Developer and SDG&nbsp;8 advocate,
                Nathaniel leads the strategic and technical direction of
                JobBridge Africa.
              </p>
            </div>
            <div>
              <h3 className="font-semibold">
                Barr. Nathaniel‑Usikpedo Oghogho (Nigeria) — Legal Adviser
              </h3>
              <p>
                Ensures transparent operations, ethical compliance, and data
                protection best practices.
              </p>
            </div>
            <div>
              <h3 className="font-semibold">
                Dedan Okware (Kenya) — Module Lead, MERN Stack Specialization,
                PLP
              </h3>
              <p>
                A mentor and early contributor who guided software architecture
                and development best practices.
              </p>
            </div>
            <div>
              <h3 className="font-semibold">PLP Africa</h3>
              <p>
                We acknowledge the continued support of PLP Africa, whose
                mission to empower one million African youth with tech skills
                inspires our work.
              </p>
            </div>
          </div>
        )}
      </section>

      <section className="mb-10">
        <h2 className="text-xl md:text-2xl font-bold mb-3">Our Commitment</h2>
        <p>
          We believe technology can close the opportunity gap. We are committed
          to leveraging AI, data, and human‑centered design to help every young
          person across Africa access meaningful work and sustainable
          livelihoods.
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
  );
};

export default About;
