import { Link } from "react-router-dom";

const PanAfricanNetwork = () => {
  return (
    <div className="container mx-auto px-4 py-12">
      <div className="max-w-4xl mx-auto">
        <Link to="/" className="text-primary hover:underline mb-6 inline-block">
          ← Back to Home
        </Link>

        <div className="bg-white rounded-lg shadow-md p-8">
          <h1 className="text-4xl font-bold mb-6 text-gray-800">
            Pan-African Job Network
          </h1>

          <div className="prose max-w-none">
            <p className="text-lg text-gray-700 mb-6">
              JobBridge Africa connects talent and opportunities across all 54
              African nations, creating the continent's largest professional
              network.
            </p>

            <h2 className="text-2xl font-bold mt-8 mb-4">
              Continental Coverage
            </h2>
            <div className="grid md:grid-cols-3 gap-6 mb-8">
              <div className="bg-gray-50 p-6 rounded-lg">
                <div className="text-4xl font-bold text-primary mb-2">54</div>
                <p className="text-gray-700">African Countries</p>
              </div>
              <div className="bg-gray-50 p-6 rounded-lg">
                <div className="text-4xl font-bold text-secondary mb-2">
                  200+
                </div>
                <p className="text-gray-700">Major Cities</p>
              </div>
              <div className="bg-gray-50 p-6 rounded-lg">
                <div className="text-4xl font-bold text-accent mb-2">10k+</div>
                <p className="text-gray-700">Active Jobs</p>
              </div>
            </div>

            <h2 className="text-2xl font-bold mt-8 mb-4">Regional Hubs</h2>
            <div className="space-y-6 mb-8">
              <div className="border-l-4 border-primary pl-4">
                <h3 className="font-bold text-lg mb-2">West Africa</h3>
                <p className="text-gray-700 mb-2">
                  <strong>Focus:</strong> Nigeria, Ghana, Senegal, Côte d'Ivoire
                </p>
                <p className="text-gray-600">
                  Thriving tech ecosystem with major hubs in Lagos, Accra, and
                  Dakar. Growing fintech, e-commerce, and digital services
                  sectors.
                </p>
              </div>

              <div className="border-l-4 border-secondary pl-4">
                <h3 className="font-bold text-lg mb-2">East Africa</h3>
                <p className="text-gray-700 mb-2">
                  <strong>Focus:</strong> Kenya, Tanzania, Uganda, Rwanda,
                  Ethiopia
                </p>
                <p className="text-gray-600">
                  Innovation leader with Nairobi's Silicon Savannah. Strong
                  mobile money, agriculture tech, and renewable energy sectors.
                </p>
              </div>

              <div className="border-l-4 border-accent pl-4">
                <h3 className="font-bold text-lg mb-2">Southern Africa</h3>
                <p className="text-gray-700 mb-2">
                  <strong>Focus:</strong> South Africa, Botswana, Namibia,
                  Zimbabwe
                </p>
                <p className="text-gray-600">
                  Established financial services, mining, tourism, and emerging
                  tech sectors centered in Johannesburg and Cape Town.
                </p>
              </div>

              <div className="border-l-4 border-primary pl-4">
                <h3 className="font-bold text-lg mb-2">North Africa</h3>
                <p className="text-gray-700 mb-2">
                  <strong>Focus:</strong> Egypt, Morocco, Tunisia, Algeria
                </p>
                <p className="text-gray-600">
                  Diverse economy with strengths in manufacturing, tourism,
                  energy, and growing digital transformation initiatives.
                </p>
              </div>

              <div className="border-l-4 border-secondary pl-4">
                <h3 className="font-bold text-lg mb-2">Central Africa</h3>
                <p className="text-gray-700 mb-2">
                  <strong>Focus:</strong> Cameroon, DRC, Gabon, Republic of
                  Congo
                </p>
                <p className="text-gray-600">
                  Rich in natural resources with growing opportunities in
                  infrastructure, energy, and telecommunications.
                </p>
              </div>
            </div>

            <h2 className="text-2xl font-bold mt-8 mb-4">Why Pan-African?</h2>
            <ul className="space-y-3 mb-8">
              <li className="flex items-start gap-3">
                <span className="text-secondary text-xl">✓</span>
                <span>
                  <strong>Cross-Border Opportunities:</strong> Access jobs
                  across multiple countries without language or platform
                  barriers
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-secondary text-xl">✓</span>
                <span>
                  <strong>Regional Expertise:</strong> We understand local job
                  markets, work cultures, and hiring practices
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-secondary text-xl">✓</span>
                <span>
                  <strong>Remote-First Economy:</strong> Connect with African
                  companies hiring remote workers continent-wide
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-secondary text-xl">✓</span>
                <span>
                  <strong>Diaspora Connection:</strong> Bridge African
                  professionals abroad with opportunities back home
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-secondary text-xl">✓</span>
                <span>
                  <strong>AfCFTA Ready:</strong> Aligned with the African
                  Continental Free Trade Area vision for integrated markets
                </span>
              </li>
            </ul>

            <div className="bg-gray-50 border-l-4 border-secondary p-6 mt-8">
              <h3 className="font-bold text-lg mb-2">
                Join Africa's Largest Job Network
              </h3>
              <p className="text-gray-700 mb-4">
                Whether you're looking locally or exploring opportunities across
                the continent, JobBridge Africa connects you with the right
                employers.
              </p>
              <Link
                to="/jobs"
                className="inline-block bg-secondary text-white px-6 py-3 rounded hover:bg-green-700 transition"
              >
                Explore Jobs
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PanAfricanNetwork;
