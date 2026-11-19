import PageBreadcrumb from "../components/PageBreadcrumb";

const seekerFaqs = [
  ["Is it free to search and apply?", "Yes. Job seekers can search and apply through JobBridge Africa without an application fee. Never pay someone who claims they can guarantee you a job."],
  ["How do I apply for a role?", "Open a job’s details and follow its application instructions. Direct employer roles can accept applications through JobBridge Africa; external listings send you to the employer’s own application page."],
  ["How can I tell whether a job is remote?", "Each listing shows its workplace arrangement and any location restriction supplied by the employer or source. “Remote – Global” means the source describes the role as worldwide or global; always confirm eligibility in the original posting."],
  ["Can I use the CV Refinisher?", "Yes. The tool compares CV text against a job description with rule-based keyword matching. It is not generative AI, and its score is guidance—not a hiring decision or guarantee."],
  ["What happens to my CV?", "Files selected in the CV Refinisher are read in your browser. Extracted text is sent to JobBridge Africa for temporary processing and is not saved to the app database or Cloudinary by that tool. Profile resumes are stored separately and can be removed from your account."],
  ["How do I delete a saved CV?", "Use the Delete my data action in the CV tool while signed in. It removes the saved profile CV and uploaded CV files attached to your applications from JobBridge-managed storage."],
  ["How do I reset my password or verify my email?", "Use the password reset link on the sign-in page. New accounts receive an email verification link; if you do not receive it, request another from the registration/sign-in screen."],
];

const employerFaqs = [
  ["How do I post a job?", "Create an employer account, complete your company profile, and submit a clear role with location, responsibilities, requirements, and application instructions."],
  ["How are employers verified?", "JobBridge Africa may review company identity, contact details, and the legitimacy of a posting. We can request business or role evidence and remove listings that cannot be verified."],
  ["What does it cost to post?", "Employer posting is free during launch. Any future fee will be shown before purchase; no payment is currently required to post."],
  ["What happens after I post?", "Your job appears in search after submission and review. Applicants who apply through JobBridge Africa are available in your employer dashboard; external-source candidates apply on the employer’s own site."],
  ["Can I edit or close a listing?", "Manage your own listings and applications from the employer dashboard. Contact support if you cannot access a posting."],
];

const FAQGroup = ({ title, items }) => (
  <section className="mt-8">
    <h2 className="text-2xl font-bold text-charcoal">{title}</h2>
    <div className="mt-4 space-y-3">
      {items.map(([question, answer]) => (
        <details key={question} className="rounded-xl border border-slate-200 bg-white p-5">
          <summary className="cursor-pointer font-semibold text-slate-900">{question}</summary>
          <p className="mt-3 leading-6 text-slate-700">{answer}</p>
        </details>
      ))}
    </div>
  </section>
);

const FAQ = () => (
  <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
    <PageBreadcrumb />
    <header className="rounded-3xl bg-charcoal p-8 text-white">
      <p className="text-sm font-bold uppercase tracking-widest text-amber-300">Help centre</p>
      <h1 className="mt-2 text-4xl font-black">Frequently Asked Questions</h1>
      <p className="mt-3 max-w-3xl text-slate-200">Practical answers for job seekers and employers using JobBridge Africa.</p>
    </header>
    <FAQGroup title="For Job Seekers" items={seekerFaqs} />
    <FAQGroup title="For Employers" items={employerFaqs} />
  </main>
);

export default FAQ;
