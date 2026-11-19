import { Link } from "react-router-dom";
import PageBreadcrumb from "../components/PageBreadcrumb";

const plans = [
  {
    name: "Free",
    ngn: "₦0",
    cadence: "during launch",
    description: "The essentials to explore opportunities and build your profile.",
    features: [
      "Core job search and filters",
      "Basic candidate profile",
    ],
    action: "Browse jobs",
    to: "/jobs",
  },
  {
    name: "Job Seeker Pro",
    ngn: "₦7,500",
    cadence: "per month",
    description: "Stay ahead with personalized job discovery and alerts.",
    features: [
      "Personalized job discovery",
      "Job alerts",
    ],
    action: "Request early access",
    to: "/contact?subject=Early%20access%20-%20Job%20Seeker%20Pro",
    highlighted: true,
  },
  {
    name: "AI Career Suite",
    ngn: "₦12,500",
    cadence: "per month",
    description: "Practical AI-assisted tools for every stage of your search.",
    features: [
      "Everything in Job Seeker Pro",
      "CV Refinisher access",
      "Custom skill recommendations",
      "Direct recruiter visibility",
    ],
    action: "Request early access",
    to: "/contact?subject=Early%20access%20-%20AI%20Career%20Suite",
  },
];

const Pricing = () => (
  <div className="min-h-[70vh] bg-offwhite px-4 py-16 text-charcoal md:px-8">
    <PageBreadcrumb />
    <header className="mx-auto mb-12 max-w-3xl text-center">
      <span className="rounded-full bg-amber-100 px-4 py-2 text-sm font-bold text-terracotta-dark">
        Simple, transparent pricing
      </span>
      <h1 className="mt-6 text-4xl font-black tracking-tight md:text-5xl">
        Invest in your next opportunity
      </h1>
      <p className="mt-4 text-stone-600">
        Free during launch. Job seekers are never charged to search or apply. Proposed paid tiers are shown in Nigerian Naira and are not available yet.
      </p>
    </header>

    <div className="mx-auto grid max-w-6xl items-stretch gap-6 lg:grid-cols-3">
      {plans.map((plan) => (
        <article
          key={plan.name}
          className={`flex flex-col rounded-3xl border p-7 shadow-sm ${
            plan.highlighted
              ? "border-terracotta bg-charcoal text-white shadow-xl"
              : "border-stone-200 bg-white"
          }`}
        >
          <div className="flex-1">
            {plan.highlighted && (
              <p className="mb-4 text-xs font-bold uppercase tracking-widest text-amber-300">
                Most popular
              </p>
            )}
            <h2 className="text-2xl font-extrabold">{plan.name}</h2>
            <p className={`mt-3 text-sm ${plan.highlighted ? "text-stone-300" : "text-stone-600"}`}>
              {plan.description}
            </p>
            <div className="my-6">
              <p className="text-3xl font-black">{plan.ngn}</p>
              <p className={`mt-1 text-sm ${plan.highlighted ? "text-stone-300" : "text-stone-500"}`}>
                {plan.cadence === "during launch" ? "Free during launch" : "per month · planned, not available"}
              </p>
            </div>
            <ul className="space-y-3">
              {plan.features.map((feature) => (
                <li key={feature} className="flex gap-3 text-sm">
                  <span aria-hidden="true" className="font-bold text-amber-500">✓</span>
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
          </div>
          <Link
            to={plan.to}
            className={`mt-8 rounded-xl px-5 py-3 text-center font-bold transition ${
              plan.highlighted
                ? "bg-amber-400 text-charcoal hover:bg-amber-300"
                : "bg-terracotta text-white hover:bg-terracotta-dark"
            }`}
          >
            {plan.action}
          </Link>
        </article>
      ))}
    </div>
    <p className="mx-auto mt-6 max-w-6xl text-xs text-stone-500">
      Employer job posting is free during launch. No employer charge is currently collected. If paid employer services are introduced, the price, delivery, cancellation, and refund terms will be shown before checkout; no payment is due unless those terms are accepted. Contact support promptly about an incorrect charge or service not delivered.
    </p>
    <p className="mx-auto mt-3 max-w-6xl text-xs text-stone-500">
      The ₦7,500 and ₦12,500 job-seeker tiers are proposals only; paid checkout is not enabled. Do not send payment details by email.
    </p>
  </div>
);

export default Pricing;
