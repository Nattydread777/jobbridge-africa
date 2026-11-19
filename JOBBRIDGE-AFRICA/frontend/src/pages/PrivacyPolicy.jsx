const PrivacyPolicy = () => {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-md p-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-6">
          Privacy Policy
        </h1>
        <p className="text-sm text-gray-600 mb-8">
          Last Updated: November 19, 2026
        </p>

        <div className="space-y-8 text-gray-700">
          {/* Introduction */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              1. Introduction
            </h2>
            <p className="mb-4">
              Welcome to JobBridge Africa. We are committed to protecting your
              personal information and your right to privacy. In line with{" "}
              <strong>SDG 8 (Decent Work and Economic Growth)</strong>, we
              ensure that all data practices promote transparency, fairness, and
              equal opportunity for all African job seekers and employers.
            </p>
            <p>
              This Privacy Policy explains how we collect, use, disclose, and
              safeguard your information when you use our platform. By using
              JobBridge Africa, you agree to the collection and use of
              information in accordance with this policy.
            </p>
          </section>

          {/* Information We Collect */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              2. Information We Collect
            </h2>

            <h3 className="text-xl font-medium text-gray-800 mb-3">
              2.1 Personal Information
            </h3>
            <ul className="list-disc pl-6 space-y-2 mb-4">
              <li>
                <strong>Job Seekers:</strong> Full name, email address, phone
                number, location (country/city), professional bio, education
                history, work experience, skills, resume/CV, and profile photo
              </li>
              <li>
                <strong>Employers:</strong> Company name, contact person, email,
                phone number, company description, and posted job details
              </li>
            </ul>

            <h3 className="text-xl font-medium text-gray-800 mb-3">
              2.2 Automatically Collected Information
            </h3>
            <ul className="list-disc pl-6 space-y-2 mb-4">
              <li>IP address, browser type, and device information</li>
              <li>Limited technical and request information processed by our hosting and security providers to operate and protect the platform</li>
              <li>Essential cookies and stored preferences; analytics and advertising tracking are not currently active</li>
            </ul>

            <h3 className="text-xl font-medium text-gray-800 mb-3">
              2.3 AI Matching Data
            </h3>
            <p>
              Our AI-enabled matching system analyzes your profile data (skills,
              experience, education) to connect you with relevant job
              opportunities. This processing is done securely and in accordance
              with SDG 8's goal of promoting inclusive and sustainable
              employment.
            </p>
          </section>

          {/* How We Use Your Information */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              3. How We Use Your Information
            </h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                <strong>Job Matching:</strong> To connect qualified candidates
                with suitable employers across Africa
              </li>
              <li>
                <strong>Profile Completion:</strong> To encourage comprehensive
                profiles that improve employment opportunities (SDG 8.5 - Full
                and productive employment)
              </li>
              <li>
                <strong>Communication:</strong> To send account and application
                messages and, if enabled, job-alert emails
              </li>
              <li>
                <strong>Platform Improvement:</strong> To analyze usage patterns
                and enhance user experience
              </li>
              <li>
                <strong>Security:</strong> To prevent fraud, unauthorized
                access, and maintain platform integrity
              </li>
              <li>
                <strong>Compliance:</strong> To meet legal obligations and
                enforce our Terms of Service
              </li>
            </ul>
          </section>

          {/* Information Sharing */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              4. How We Share Your Information
            </h2>

            <h3 className="text-xl font-medium text-gray-800 mb-3">
              4.1 With Employers
            </h3>
            <p className="mb-4">
              When you apply for a job, your profile information (name, resume,
              education, experience, skills) is shared with the respective
              employer. You have full control over which jobs you apply to.
            </p>

            <h3 className="text-xl font-medium text-gray-800 mb-3">
              4.2 With Service Providers
            </h3>
            <p className="mb-4">
              We may share data with trusted third-party services:
            </p>
            <ul className="list-disc pl-6 space-y-2 mb-4">
              <li>
                <strong>Cloud Storage:</strong> Cloudinary (for resume and photo
                storage)
              </li>
              <li>
                <strong>Database:</strong> MongoDB Atlas (for secure data
                storage)
              </li>
              <li>
                <strong>Hosting:</strong> Vercel (for platform hosting)
              </li>
              <li><strong>API hosting:</strong> Render (for backend requests and application processing)</li>
              <li><strong>Sign-in and verification:</strong> Google Identity Services when you choose Google sign-in, Google reCAPTCHA when enabled on the contact form, and Resend or the configured SMTP provider (such as Zoho Mail) to deliver account or contact messages</li>
            </ul>

            <h3 className="text-xl font-medium text-gray-800 mb-3">
              4.3 Legal Requirements
            </h3>
            <p>
              We may disclose your information if required by law, court order,
              or government request, or to protect the rights and safety of
              JobBridge Africa, our users, or the public.
            </p>

            <h3 className="text-xl font-medium text-gray-800 mb-3">
              4.4 No Sale of Data
            </h3>
            <p>
              We do <strong>NOT</strong> sell, rent, or trade your personal
              information to third parties for marketing purposes.
            </p>
          </section>

          {/* Data Security */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              5. Data Security
            </h2>
            <p className="mb-4">
              We implement industry-standard security measures to protect your
              personal information:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                <strong>Encryption:</strong> All data transmitted is encrypted
                using HTTPS/TLS protocols
              </li>
              <li>
                <strong>Authentication:</strong> Secure JWT-based authentication
                with httpOnly cookies
              </li>
              <li>
                <strong>Access Control:</strong> Role-based access restrictions
                (job seekers, employers, admins)
              </li>
              <li>
                <strong>Regular Audits:</strong> Periodic security reviews and
                vulnerability assessments
              </li>
            </ul>
            <p className="mt-4 text-sm italic">
              However, no method of transmission over the internet is 100%
              secure. While we strive to protect your data, we cannot guarantee
              absolute security.
            </p>
          </section>

          {/* Your Rights */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              6. Your Privacy Rights
            </h2>
            <p className="mb-4">You have the right to:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                <strong>Access:</strong> Request a copy of your personal data we
                hold
              </li>
              <li>
                <strong>Update:</strong> Modify your profile information at any
                time via your dashboard
              </li>
              <li>
                <strong>Delete:</strong> Request deletion of your account and
                associated data
              </li>
              <li>
                <strong>Opt-Out:</strong> Unsubscribe from job alert emails by contacting us at the address below
              </li>
              <li>
                <strong>Data Portability:</strong> Request your data in a
                machine-readable format
              </li>
              <li>
                <strong>Withdraw Consent:</strong> Revoke permissions for data
                processing (may limit platform functionality)
              </li>
            </ul>
            <p className="mt-4">
              To exercise these rights, contact us at{" "}
              <strong>info@jobbridgeafrica.com</strong>
            </p>
          </section>

          {/* Cookies */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              7. Cookies and Tracking
            </h2>
            <p className="mb-4">
              We use cookies and similar technologies to enhance your
              experience:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                <strong>Essential Cookies:</strong> Required for authentication
                and basic platform functionality
              </li>
              <li>
                <strong>Optional Cookies:</strong> Analytics and marketing cookies are not currently active; the cookie banner lets you record preferences if these categories are introduced
              </li>
              <li>
                <strong>Preference Cookies:</strong> Remember your settings and
                choices
              </li>
            </ul>
            <p className="mt-4">
              You can control cookies through your browser settings, but
              disabling essential cookies may affect platform functionality.
            </p>
          </section>

          {/* Data Retention */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              8. Data Retention
            </h2>
            <p>
              We retain your personal information for as long as your account is
              active or as needed to provide services. You may request account
              deletion by contacting us at the address below; we aim to remove
              account data within <strong>30 days</strong>, except where
              retention is required by law or reasonably needed for fraud
              prevention and dispute resolution.
            </p>
          </section>

          {/* Children's Privacy */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              9. Children's Privacy
            </h2>
            <p>
              JobBridge Africa is not intended for individuals under the age of{" "}
              <strong>16</strong>. We do not knowingly collect personal
              information from children. If you believe we have inadvertently
              collected such information, please contact us immediately.
            </p>
          </section>

          {/* International Data Transfers */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              10. International Data Transfers
            </h2>
            <p>
              Your information may be transferred to and processed in countries
              outside your own, including servers in the United States and
              Europe. We ensure that such transfers comply with applicable data
              protection laws and that your data receives adequate protection.
            </p>
          </section>

          {/* Changes to Privacy Policy */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              11. Changes to This Privacy Policy
            </h2>
            <p>
              We may update this Privacy Policy from time to time. We will
              notify you of any significant changes by posting the new policy on
              this page and updating the "Last Updated" date. Continued use of
              the platform after changes constitutes acceptance of the updated
              policy.
            </p>
          </section>

          {/* Contact */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              12. Contact Us
            </h2>
            <p className="mb-2">
              If you have questions, concerns, or requests regarding this
              Privacy Policy, please contact us:
            </p>
            <div className="bg-green-50 border-l-4 border-green-600 p-4 mt-4">
              <p className="font-medium">JobBridge Africa</p>
              <p>
                📧 Email:{" "}
                <a
                  href="mailto:info@jobbridgeafrica.com"
                  className="text-green-600 hover:underline"
                >
                  info@jobbridgeafrica.com
                </a>
              </p>
              <p>
                📞 Phone:{" "}
                <a
                  href="tel:+2348073208945"
                  className="text-green-600 hover:underline"
                >
                  +2348073208945
                </a>
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              CV tools, uploads, and deletion
            </h2>
            <p className="mb-3">
              The CV Refinisher reads selected PDF, DOCX, and text files in your browser. Its free diagnostic sends the extracted CV and job information to our backend for rule-based analysis; we do not retain the request text after the analysis request. Optional AI review is disabled unless you separately opt in. If you do, direct contact information and the detected candidate name are redacted before the remaining CV/job text is sent to OpenAI to generate suggested edits. OpenAI API abuse-monitoring retention is generally up to 30 days, subject to OpenAI's current policies and any account-specific data controls; JobBridge Africa does not control provider retention. Do not enable AI review if you do not agree. Redaction reduces exposure but cannot guarantee that all identifying information is removed.
            </p>
            <p className="mb-3">
              CV text and files submitted to the CV Refinisher are not saved to your account or application records by this tool. Text remains in your open browser page until you clear it or leave; backend request handling is transient. A resume separately uploaded to your account is stored with Cloudinary while linked to your profile or application. Use the CV tool’s “Delete my data” action while signed in to remove your saved profile resume and CV files attached to applications from JobBridge-managed storage. Application details remain in your account, with resume links removed. Employers who already received an application may retain a copy they received; contact the employer separately to request its deletion.
            </p>
            <p className="mb-3">
              AI-generated summaries or rewrites are not verified facts, hiring decisions, or guarantees of employment. Review every suggestion and only use statements that are accurate and supported by your actual experience.
            </p>
            <p className="mb-3">
              To enforce daily free usage limits, the backend stores a one-way hash of your account identifier or IP address and a daily request count; these usage records are scheduled to expire after 35 days. CV contents are not stored in these records.
            </p>
            <p>
              Account data is otherwise subject to the retention terms described above. For access, correction, or deletion requests, contact{" "}
              <a href="mailto:info@jobbridgeafrica.com" className="font-semibold text-green-700 underline">info@jobbridgeafrica.com</a>.
            </p>
          </section>

          {/* SDG Commitment */}
          <section className="bg-gradient-to-r from-green-50 to-yellow-50 p-6 rounded-lg border border-green-200">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              Our Commitment to SDG 8
            </h2>
            <p>
              JobBridge Africa is dedicated to promoting{" "}
              <strong>Decent Work and Economic Growth</strong> across Africa.
              Our privacy practices ensure that:
            </p>
            <ul className="list-disc pl-6 space-y-2 mt-3">
              <li>
                All job seekers have equal access to opportunities regardless of
                background (SDG 8.5)
              </li>
              <li>
                Youth employment is promoted through inclusive matching
                algorithms (SDG 8.6)
              </li>
              <li>
                Data is used ethically to empower individuals, not exploit them
              </li>
              <li>Transparency and fairness guide all our operations</li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicy;
