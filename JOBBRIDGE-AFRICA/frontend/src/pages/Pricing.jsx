import { Link } from "react-router-dom";

const plans = [
  {
    name: "Free",
    usd: "$0",
    ngn: "₦0",
    cadence: "forever",
    description: "Find and apply to opportunities across Africa and beyond.",
    features: [
      "Search and filter all job listings",
      "Apply through direct external links",
    ],
    action: "Browse jobs",
    to: "/jobs",
  },
  {
    name: "Job Seeker Pro",
    usd: "$9",
    ngn: "₦7,500",
    cadence: "per month",
    description: "Stay ahead with personalized job discovery and alerts.",
    features: [
      "Instant WhatsApp and email job alerts",
      "Priority job matching",
      "Automated resume distribution",
    ],
    action: "Get started",
    to: "/register",
    highlighted: true,
  },
  {
    name: "AI Career Suite",
    usd: "$19",
    ngn: "₦15,000",
    cadence: "per month",
    description: "Practical AI-assisted tools for every stage of your search.",
    features: [
      "Everything in Job Seeker Pro",
      "Unlimited AI CV / resume refiner",
      "AI cover letter generator",
      "Interview coach",
    ],
    action: "Explore career tools",
    to: "/ai-cv-tool",
  },
];

const Pricing = () => (
  <div className="min-h-[70vh] bg-offwhite px-4 py-16 text-charcoal md:px-8">
    <header className="mx-auto mb-12 max-w-3xl text-center">
      <span className="rounded-full bg-amber-100 px-4 py-2 text-sm font-bold text-terracotta-dark">
        Simple, transparent pricing
      </span>
      <h1 className="mt-6 text-4xl font-black tracking-tight md:text-5xl">
        Invest in your next opportunity
      </h1>
      <p className="mt-4 text-stone-600">
        Start for free. Upgrade when you need more support. Prices are shown in USD and NGN.
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
              <p className="text-3xl font-black">{plan.usd}<span className="text-base font-medium"> / mo</span></p>
              <p className={`mt-1 text-sm ${plan.highlighted ? "text-stone-300" : "text-stone-500"}`}>
                {plan.ngn} / {plan.cadence === "forever" ? "forever" : "month"}
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
      Paid-plan checkout and subscription billing are not enabled yet. Contact JobBridge Africa to discuss early access.
    </p>
  </div>
);

export default Pricing;
