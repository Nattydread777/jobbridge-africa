import { Link } from "react-router-dom";
import PageBreadcrumb from "../components/PageBreadcrumb";

const RoyalMerchant = () => (
  <main className="mx-auto max-w-5xl px-4 py-10 text-slate-800 sm:px-6">
    <PageBreadcrumb />
    <header className="rounded-3xl bg-charcoal p-8 text-white md:p-12">
      <p className="inline-flex rounded-full bg-amber-300/15 px-4 py-2 text-sm font-bold text-amber-200">Cooperative education-support partner</p>
      <h1 className="mt-5 text-4xl font-black md:text-5xl">Royal Merchant MPCS Study-Now-Pay-Later Support</h1>
      <p className="mt-4 max-w-3xl text-lg leading-7 text-slate-200">A cooperative pathway for eligible members seeking support for approved digital-skills, vocational, or further-education programs.</p>
    </header>

    <section className="mt-8 rounded-2xl border border-amber-200 bg-amber-50 p-6">
      <h2 className="text-2xl font-bold text-slate-900">About the cooperative</h2>
      <p className="mt-3 leading-7">Royal Merchant Multipurpose Cooperative Society Ltd Ughelli reports that it was registered with the Delta State Trade and Commerce, Asaba, on 9 January 2023. Cooperative-reported figures supplied to JobBridge Africa as of 19 November 2026 are 60 active members, a capital base above ₦40,000,000, and more than ₦25,000,000 in loans issued with positive repayment reported. These are partner-supplied figures and have not been independently audited by JobBridge Africa.</p>
    </section>

    <section className="mt-8 rounded-2xl bg-white p-6 shadow-sm">
      <h2 className="text-2xl font-bold text-slate-900">Membership and eligibility</h2>
      <ul className="mt-4 list-disc space-y-2 pl-6 leading-7">
        <li>Create a JobBridge Africa profile and apply to register as an active Royal Merchant MPCS member, completing the cooperative’s KYC checks.</li>
        <li>Published joining contribution: ₦11,000, described by the cooperative as a ₦10,000 non-refundable entrance fee plus a ₦1,000 referral allocation. Confirm the recipient, current fees, and official payment details with the cooperative before paying.</li>
        <li>Minimum monthly subscription: ₦7,000. The cooperative states members may qualify to apply for a member loan after six months of committed contributions.</li>
        <li>For the cooperative’s member-loan product, the stated ceiling is up to three times the member’s accumulated contribution, subject to approval. The stated interest is 10% for one year and is deducted before disbursement. Confirm the calculation, total repayment, and written agreement before accepting an offer.</li>
      </ul>
    </section>

    <section className="mt-8 rounded-2xl bg-white p-6 shadow-sm">
      <h2 className="text-2xl font-bold text-slate-900">How training support works</h2>
      <ol className="mt-4 list-decimal space-y-3 pl-6 leading-7">
        <li><strong>Join and complete KYC:</strong> register with the cooperative and meet its active-member requirements.</li>
        <li><strong>Choose an approved course:</strong> submit course and admission details for review by the cooperative and program partners.</li>
        <li><strong>Provide a guarantor:</strong> at least one credible guarantor is required—a salaried professional with verifiable employment, a registered business owner, or a Royal Merchant MPCS member in good standing. The cooperative requires government ID, proof of address or employment, and a signed guarantor indemnity.</li>
        <li><strong>Sign the agreement:</strong> review the approved amount, repayment schedule, fees, and obligations before signing the cooperative training-support agreement.</li>
        <li><strong>Provider payment:</strong> approved support is paid directly to the accredited training provider, not given to the applicant as cash.</li>
      </ol>
    </section>

    <section className="mt-8 rounded-2xl bg-white p-6 shadow-sm">
      <h2 className="text-2xl font-bold text-slate-900">Repayment and important notice</h2>
      <ul className="mt-4 list-disc space-y-2 pl-6 leading-7">
        <li>No repayments are due while the participant is actively studying, under the described program terms.</li>
        <li>A one-to-three-month transition buffer after graduation is described before repayments begin.</li>
        <li>Repayment is described as income-triggered once the participant secures employment or reaches the minimum monthly income threshold agreed in the written terms. Installments are set over six to eighteen months.</li>
        <li>Payments are made by bank standing order or automated transfer to the designated cooperative account. The cooperative states there is no penalty for early completion.</li>
        <li>Ask for and read the complete signed agreement, applicable fees, qualifying income threshold, total amount due, and payment instructions. The written agreement and the cooperative’s official disclosures govern; this page is an overview, not an offer or financial advice.</li>
      </ul>
      <p className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 font-semibold leading-7 text-red-950">Cooperative membership or training support does not guarantee a job, interview, income, or loan approval. JobBridge Africa provides career matching and program information; Royal Merchant MPCS makes its own membership, course-support, and credit decisions.</p>
    </section>

    <div className="mt-8 flex flex-wrap gap-3">
      <Link to="/contact?subject=Royal%20Merchant%20MPCS%20program" className="rounded-xl bg-terracotta px-5 py-3 font-bold text-white hover:bg-terracotta-dark">Ask about the program</Link>
      <Link to="/jobs" className="rounded-xl border border-slate-300 px-5 py-3 font-semibold text-slate-800 hover:bg-white">Browse jobs</Link>
    </div>
  </main>
);

export default RoyalMerchant;
