import { Link } from "react-router-dom";

const SDGImpact = () => {
  return (
    <div className="container mx-auto px-4 py-12">
      <div className="max-w-4xl mx-auto">
        <Link to="/" className="text-primary hover:underline mb-6 inline-block">
          ← Back to Home
        </Link>

        <div className="bg-white rounded-lg shadow-md p-8">
          <h1 className="text-4xl font-bold mb-6 text-gray-800">
            SDG 8: Decent Work & Economic Growth
          </h1>

          <div className="prose max-w-none">
            <p className="text-lg text-gray-700 mb-6">
              JobBridge Africa is committed to advancing the United Nations
              Sustainable Development Goal 8, promoting sustained, inclusive,
              and sustainable economic growth, full and productive employment,
              and decent work for all.
            </p>

            <div className="bg-blue-50 border-l-4 border-blue-500 p-6 mb-8">
              <h2 className="font-bold text-xl mb-2">SDG 8 Target</h2>
              <p className="text-gray-700">
                "Promote sustained, inclusive and sustainable economic growth,
                full and productive employment and decent work for all"
              </p>
            </div>

            <h2 className="text-2xl font-bold mt-8 mb-4">Our Contribution</h2>

            <div className="space-y-6 mb-8">
              <div className="border rounded-lg p-6">
                <h3 className="font-bold text-lg mb-3 flex items-center gap-2">
                  <span className="text-2xl">👔</span> Decent Work Opportunities
                </h3>
                <p className="text-gray-700 mb-3">
                  We ensure all job listings meet standards for fair employment,
                  competitive compensation, and professional growth.
                </p>
                <ul className="text-gray-600 space-y-1 ml-6">
                  <li>• Transparent salary ranges</li>
                  <li>• Clear job requirements and responsibilities</li>
                  <li>• Equal opportunity employer verification</li>
                  <li>• Safe working conditions standards</li>
                </ul>
              </div>

              <div className="border rounded-lg p-6">
                <h3 className="font-bold text-lg mb-3 flex items-center gap-2">
                  <span className="text-2xl">📈</span> Economic Growth
                </h3>
                <p className="text-gray-700 mb-3">
                  By connecting talent with opportunities, we fuel Africa's
                  economic development and productivity.
                </p>
                <ul className="text-gray-600 space-y-1 ml-6">
                  <li>• Supporting 5,000+ African companies</li>
                  <li>• Facilitating 10,000+ job placements annually</li>
                  <li>• Enabling cross-border employment</li>
                  <li>• Promoting skills development</li>
                </ul>
              </div>

              <div className="border rounded-lg p-6">
                <h3 className="font-bold text-lg mb-3 flex items-center gap-2">
                  <span className="text-2xl">🌍</span> Inclusive Employment
                </h3>
                <p className="text-gray-700 mb-3">
                  We prioritize accessibility and equal opportunities for all
                  African job seekers.
                </p>
                <ul className="text-gray-600 space-y-1 ml-6">
                  <li>• Gender equality in job recommendations</li>
                  <li>• Youth employment programs</li>
                  <li>• Support for persons with disabilities</li>
                  <li>• Rural and urban connectivity</li>
                </ul>
              </div>

              <div className="border rounded-lg p-6">
                <h3 className="font-bold text-lg mb-3 flex items-center gap-2">
                  <span className="text-2xl">💼</span> Skills Development
                </h3>
                <p className="text-gray-700 mb-3">
                  Empowering job seekers with resources and guidance for career
                  advancement.
                </p>
                <ul className="text-gray-600 space-y-1 ml-6">
                  <li>• Profile optimization tools</li>
                  <li>• Career guidance resources</li>
                  <li>• Industry insights and trends</li>
                  <li>• Professional networking opportunities</li>
                </ul>
              </div>
            </div>

            <h2 className="text-2xl font-bold mt-8 mb-4">Impact Metrics</h2>
            <div className="grid md:grid-cols-2 gap-6 mb-8">
              <div className="bg-gradient-to-br from-primary to-yellow-600 text-white p-6 rounded-lg">
                <div className="text-4xl font-bold mb-2">50,000+</div>
                <p className="text-lg">Job Seekers Empowered</p>
              </div>
              <div className="bg-gradient-to-br from-secondary to-green-700 text-white p-6 rounded-lg">
                <div className="text-4xl font-bold mb-2">5,000+</div>
                <p className="text-lg">Companies Served</p>
              </div>
              <div className="bg-gradient-to-br from-accent to-red-700 text-white p-6 rounded-lg">
                <div className="text-4xl font-bold mb-2">54</div>
                <p className="text-lg">Countries Connected</p>
              </div>
              <div className="bg-gradient-to-br from-blue-500 to-blue-700 text-white p-6 rounded-lg">
                <div className="text-4xl font-bold mb-2">10,000+</div>
                <p className="text-lg">Active Job Listings</p>
              </div>
            </div>

            <h2 className="text-2xl font-bold mt-8 mb-4">
              Alignment with SDG Targets
            </h2>
            <div className="space-y-3 mb-8">
              <div className="flex items-start gap-3">
                <span className="text-secondary text-xl font-bold">8.3</span>
                <p className="text-gray-700">
                  Promote development-oriented policies that support productive
                  activities, decent job creation, entrepreneurship, creativity
                  and innovation
                </p>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-secondary text-xl font-bold">8.5</span>
                <p className="text-gray-700">
                  Achieve full and productive employment and decent work for all
                  women and men, including for young people and persons with
                  disabilities
                </p>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-secondary text-xl font-bold">8.6</span>
                <p className="text-gray-700">
                  Substantially reduce the proportion of youth not in
                  employment, education or training
                </p>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-secondary text-xl font-bold">8.8</span>
                <p className="text-gray-700">
                  Protect labour rights and promote safe and secure working
                  environments for all workers
                </p>
              </div>
            </div>

            <div className="bg-gray-50 border-l-4 border-accent p-6 mt-8">
              <h3 className="font-bold text-lg mb-2">Join the Movement</h3>
              <p className="text-gray-700 mb-4">
                Be part of Africa's sustainable economic growth. Find decent
                work or help create opportunities for others.
              </p>
              <div className="flex gap-4">
                <Link
                  to="/jobs"
                  className="inline-block bg-primary text-white px-6 py-3 rounded hover:bg-yellow-600 transition"
                >
                  Find Jobs
                </Link>
                <Link
                  to="/post-job"
                  className="inline-block bg-secondary text-white px-6 py-3 rounded hover:bg-green-700 transition"
                >
                  Post Jobs
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SDGImpact;
