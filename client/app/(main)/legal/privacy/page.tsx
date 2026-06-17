import type { Metadata } from "next";
import { LegalPageHeader } from "@/components/legal/legal-page-header";
import {
  TableOfContents,
  type TocItem,
} from "@/components/legal/table-of-contents";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "Read GoCollab's Privacy Policy to learn how we collect, use, store, share, and protect your personal information on our UGC marketplace platform.",
};

const TOC_ITEMS: TocItem[] = [
  { id: "who-this-policy-applies-to", label: "Who This Applies To" },
  { id: "information-we-collect", label: "Information We Collect" },
  { id: "how-we-use-your-information", label: "How We Use Your Info" },
  { id: "legal-basis-for-processing", label: "Legal Basis" },
  { id: "how-we-share-information", label: "How We Share Info" },
  { id: "creator-profiles-and-public-information", label: "Creator Profiles" },
  { id: "brand-and-agency-briefs", label: "Brand & Agency Briefs" },
  { id: "uploaded-content-and-deliverables", label: "Uploaded Content" },
  { id: "dispute-and-refund-review-data", label: "Dispute & Refund Data" },
  { id: "cookies-and-tracking", label: "Cookies & Tracking" },
  { id: "marketing-communications", label: "Marketing" },
  { id: "data-security", label: "Data Security" },
  { id: "data-retention", label: "Data Retention" },
  { id: "your-rights", label: "Your Rights" },
  { id: "account-deletion", label: "Account Deletion" },
  { id: "childrens-privacy", label: "Children's Privacy" },
  { id: "international-data-transfers", label: "International Transfers" },
  { id: "third-party-links", label: "Third-Party Links" },
  { id: "third-party-integrations", label: "Third-Party Integrations" },
  { id: "user-responsibilities", label: "User Responsibilities" },
  { id: "changes-to-this-privacy-policy", label: "Changes to Policy" },
  { id: "grievance-officer-contact", label: "Contact / Grievance" },
];


const sectionClass = "scroll-mt-24 mb-12 last:mb-0";
const h2Class =
  "text-xl font-bold tracking-tight sm:text-2xl mb-4 pb-3 border-b border-border";
const h3Class = "text-lg font-semibold tracking-tight mb-3 mt-6";
const pClass = "mb-4 leading-relaxed text-muted-foreground";
const ulClass =
  "mb-4 list-disc space-y-2 pl-6 text-muted-foreground leading-relaxed";

export default function PrivacyPolicyPage() {
  return (
    <>
      <LegalPageHeader
        title="Privacy Policy"
        description="This Privacy Policy explains how GoCollab collects, uses, stores, shares, and protects personal information when you access or use our platform and related services."
        effectiveDate="June 16, 2026"
      />

      <div className="grid gap-10 lg:grid-cols-[1fr_260px]">
        <article className="min-w-0">

          <div className="mb-10 rounded-lg border border-border bg-muted/30 p-5 text-sm leading-relaxed text-muted-foreground">
            <p>
              This Privacy Policy explains how GoCollab, a platform owned and operated by Messold Technologies, collects, uses, stores, shares, and protects personal information when you access or use our website, platform, creator marketplace, brand/agency dashboard, communication tools, payment features, dispute review process, or any related services.
            </p>
            <p className="mt-3">
              For the purpose of this Privacy Policy, &quot;GoCollab,&quot; &quot;we,&quot; &quot;us,&quot; or &quot;our&quot; refers to Messold Technologies, the parent company and operator of GoCollab. Messold Technologies also operates through its official website:{" "}
              <a href="https://www.messold.com" className="text-primary underline underline-offset-2 hover:text-primary/80" target="_blank" rel="noopener noreferrer">www.messold.com</a>.
            </p>
            <p className="mt-3">
              By accessing or using GoCollab, you agree to the collection and use of your information as described in this Privacy Policy.
            </p>
          </div>

          <section id="who-this-policy-applies-to" className={sectionClass}>
            <h2 className={h2Class}>1. Who This Policy Applies To</h2>
            <p className={pClass}>This Privacy Policy applies to:</p>
            <ul className={ulClass}>
              <li><strong className="text-foreground">Creators</strong> who register, create profiles, upload portfolios, submit content, or provide services through GoCollab.</li>
              <li><strong className="text-foreground">Brands, agencies, business users</strong>, and their representatives who browse creators, place orders, communicate with creators, or use GoCollab services.</li>
              <li><strong className="text-foreground">Visitors</strong> who browse our website.</li>
              <li><strong className="text-foreground">Users</strong> who contact us for support, disputes, refunds, partnerships, or general enquiries.</li>
            </ul>
            <p className={pClass}>
              This Policy applies to personal data, meaning information that can identify an individual directly or indirectly. India&apos;s Digital Personal Data Protection Act, 2023 defines personal data broadly as data about an individual who is identifiable by or in relation to such data.
            </p>
          </section>

          <section id="information-we-collect" className={sectionClass}>
            <h2 className={h2Class}>2. Information We Collect</h2>
            <p className={pClass}>We may collect the following types of information:</p>

            <h3 className={h3Class}>A. Account Information</h3>
            <p className={pClass}>When you create an account, we may collect:</p>
            <ul className={ulClass}>
              <li>Name, email address, phone number</li>
              <li>Password or login credentials</li>
              <li>User type (creator, brand, agency, or admin)</li>
              <li>Business name or creator name</li>
              <li>Profile photo or logo</li>
              <li>Location, city, state, and country</li>
              <li>Social media handles or portfolio links</li>
            </ul>

            <h3 className={h3Class}>B. Creator Profile Information</h3>
            <p className={pClass}>If you register as a creator, we may collect:</p>
            <ul className={ulClass}>
              <li>Creator bio, niche/category, languages spoken</li>
              <li>Content samples, portfolio videos or images</li>
              <li>Pricing details and delivery timelines</li>
              <li>Past work examples, ratings, reviews, and performance information</li>
              <li>Payment or payout-related information</li>
              <li>Identity or verification details, where required</li>
            </ul>

            <h3 className={h3Class}>C. Brand or Agency Information</h3>
            <p className={pClass}>If you register as a brand or agency, we may collect:</p>
            <ul className={ulClass}>
              <li>Business name, brand website, industry or product category</li>
              <li>Contact person details, billing details</li>
              <li>Campaign requirements, creator preferences</li>
              <li>Order details, briefs, scripts, references, product information, and communication records</li>
            </ul>

            <h3 className={h3Class}>D. Order and Collaboration Information</h3>
            <p className={pClass}>When you use GoCollab to collaborate, we may collect:</p>
            <ul className={ulClass}>
              <li>Order details, accepted briefs, deliverables, uploaded content files</li>
              <li>Messages exchanged between users</li>
              <li>Revision requests, dispute details, refund requests</li>
              <li>Ratings, reviews, and usage rights agreed</li>
            </ul>

            <h3 className={h3Class}>E. Payment Information</h3>
            <p className={pClass}>We may collect or process payment-related information such as:</p>
            <ul className={ulClass}>
              <li>Billing name, billing address, payment status</li>
              <li>Transaction ID, invoice details, GST/tax details</li>
              <li>Payout information for creators</li>
            </ul>
            <p className={pClass}>
              We may use third-party payment gateways or payment service providers to process payments. GoCollab does not store complete card numbers, UPI credentials, CVV numbers, or sensitive banking authentication information unless specifically required and legally permitted.
            </p>

            <h3 className={h3Class}>F. Communication Information</h3>
            <p className={pClass}>When you contact us, we may collect:</p>
            <ul className={ulClass}>
              <li>Your name, email address, phone number</li>
              <li>Support request details, feedback</li>
              <li>Complaint or dispute information</li>
              <li>Any attachments or evidence you submit</li>
            </ul>

            <h3 className={h3Class}>G. Technical and Usage Information</h3>
            <p className={pClass}>When you use our website or platform, we may automatically collect:</p>
            <ul className={ulClass}>
              <li>IP address, browser type, device type, operating system</li>
              <li>Pages visited, time spent on pages, referring URLs</li>
              <li>Login activity, approximate location</li>
              <li>Cookies and tracking data, platform usage behaviour</li>
            </ul>
          </section>

          <section id="how-we-use-your-information" className={sectionClass}>
            <h2 className={h2Class}>3. How We Use Your Information</h2>
            <p className={pClass}>We use your information to operate, improve, protect, and personalise GoCollab. We may use your information to:</p>
            <ul className={ulClass}>
              <li>Create and manage your account</li>
              <li>Display creator profiles to brands and agencies</li>
              <li>Help brands discover and book creators</li>
              <li>Process orders, payments, refunds, and payouts</li>
              <li>Enable communication between brands, agencies, and creators</li>
              <li>Review submitted briefs, deliverables, revisions, disputes, and refunds</li>
              <li>Verify creator or brand details where required</li>
              <li>Provide customer support</li>
              <li>Send transactional updates (order updates, payment updates, dispute updates, and platform notices)</li>
              <li>Improve website performance and user experience</li>
              <li>Prevent fraud, misuse, spam, fake profiles, or unauthorised activity</li>
              <li>Enforce our Terms of Service, Creator Terms, Brand/Agency Terms, Refund Policy, and Community Guidelines</li>
              <li>Send marketing communications, offers, product updates, and platform announcements, where permitted</li>
              <li>Comply with legal, tax, regulatory, and accounting obligations</li>
            </ul>
          </section>

          <section id="legal-basis-for-processing" className={sectionClass}>
            <h2 className={h2Class}>4. Legal Basis for Processing</h2>
            <p className={pClass}>Depending on your location and applicable law, we may process your information based on:</p>
            <ul className={ulClass}>
              <li>Your consent</li>
              <li>Performance of a contract with you</li>
              <li>Compliance with legal obligations</li>
              <li>Legitimate business interests</li>
              <li>Fraud prevention and platform safety</li>
              <li>Dispute resolution and enforcement of platform terms</li>
            </ul>
            <p className={pClass}>
              Where consent is required, we will seek your consent before processing your personal data for that specific purpose. The DPDP framework emphasises notice, consent, and purpose-based processing of personal data.
            </p>
          </section>

          <section id="how-we-share-information" className={sectionClass}>
            <h2 className={h2Class}>5. How We Share Information</h2>
            <p className={`${pClass} font-medium text-foreground`}>We do not sell your personal information.</p>
            <p className={pClass}>We may share your information in the following cases:</p>

            <h3 className={h3Class}>A. Between Brands/Agencies and Creators</h3>
            <p className={pClass}>To enable collaboration, certain information may be visible to the other party, such as:</p>
            <ul className={ulClass}>
              <li>Creator profile information and brand/agency brief details</li>
              <li>Order details, messages, submitted files</li>
              <li>Revision requests, delivery status</li>
              <li>Usage rights and agreed deliverables</li>
            </ul>

            <h3 className={h3Class}>B. With Service Providers</h3>
            <p className={pClass}>We may share information with trusted third-party providers who help us operate the platform, including:</p>
            <ul className={ulClass}>
              <li>Payment gateways and hosting providers</li>
              <li>Cloud storage providers and analytics tools</li>
              <li>Email and SMS service providers</li>
              <li>Customer support tools and fraud prevention tools</li>
              <li>Legal, tax, or accounting partners</li>
            </ul>

            <h3 className={h3Class}>C. For Legal and Safety Reasons</h3>
            <p className={pClass}>We may disclose information if required to:</p>
            <ul className={ulClass}>
              <li>Comply with applicable law or respond to lawful requests</li>
              <li>Protect GoCollab&apos;s rights, users, or platform</li>
              <li>Investigate fraud, abuse, disputes, or policy violations</li>
              <li>Enforce our Terms of Service or protect against security threats</li>
            </ul>

            <h3 className={h3Class}>D. Business Transfers</h3>
            <p className={pClass}>
              If GoCollab is involved in a merger, acquisition, restructuring, investment, sale of assets, or transfer of business, user information may be transferred as part of that transaction, subject to appropriate safeguards.
            </p>
          </section>

          <section id="creator-profiles-and-public-information" className={sectionClass}>
            <h2 className={h2Class}>6. Creator Profiles and Public Information</h2>
            <p className={pClass}>
              Creator profiles may be visible to brands, agencies, and other platform users. Public or semi-public creator profile information may include:
            </p>
            <ul className={ulClass}>
              <li>Name or creator name, profile photo, bio</li>
              <li>Niche/category, portfolio samples, pricing</li>
              <li>Languages, delivery timeline</li>
              <li>Reviews, ratings, and social media links (where provided)</li>
            </ul>
            <p className={pClass}>
              Creators should not upload personal information they do not want to be visible to potential clients or platform users.
            </p>
          </section>

          <section id="brand-and-agency-briefs" className={sectionClass}>
            <h2 className={h2Class}>7. Brand and Agency Briefs</h2>
            <p className={pClass}>
              Brands and agencies may upload briefs, product information, campaign details, reference files, scripts, or other materials. These may be shared with selected creators for the purpose of completing orders.
            </p>
            <p className={pClass}>
              Brands and agencies are responsible for ensuring that they have the right to upload and share any materials, product information, trademarks, images, videos, or third-party content provided through the platform.
            </p>
          </section>

          <section id="uploaded-content-and-deliverables" className={sectionClass}>
            <h2 className={h2Class}>8. Uploaded Content and Deliverables</h2>
            <p className={pClass}>
              Creators may upload videos, images, drafts, scripts, thumbnails, voiceovers, or other deliverables. Brands may upload references, product details, campaign notes, and supporting files.
            </p>
            <p className={pClass}>We may process uploaded files to:</p>
            <ul className={ulClass}>
              <li>Enable order completion and support revisions</li>
              <li>Resolve disputes and verify delivery</li>
              <li>Enforce platform policies and maintain transaction records</li>
              <li>Improve platform safety</li>
            </ul>
            <p className={pClass}>
              We do not claim ownership of user content except as required to operate the platform, process orders, provide services, enforce rights, and comply with applicable policies.
            </p>
          </section>

          <section id="dispute-and-refund-review-data" className={sectionClass}>
            <h2 className={h2Class}>9. Dispute and Refund Review Data</h2>
            <p className={pClass}>
              If you request a dispute review, refund, cancellation, or payment release review, we may collect and review:
            </p>
            <ul className={ulClass}>
              <li>Order details, accepted brief, communication records</li>
              <li>Submitted files, delivery proof, revision history</li>
              <li>Payment status, reason for dispute, requested resolution</li>
              <li>Supporting evidence from both parties</li>
            </ul>
            <p className={pClass}>
              GoCollab may use this information to make a reasonable marketplace decision, including approval, revision request, refund, credit, rejection of refund, cancellation of refund, or release of payment.
            </p>
          </section>

          <section id="cookies-and-tracking" className={sectionClass}>
            <h2 className={h2Class}>10. Cookies and Tracking Technologies</h2>
            <p className={pClass}>We may use cookies, pixels, tags, and similar technologies to:</p>
            <ul className={ulClass}>
              <li>Keep users logged in and remember preferences</li>
              <li>Improve website performance and understand user behaviour</li>
              <li>Analyse traffic and improve marketing campaigns</li>
              <li>Prevent fraud and misuse</li>
            </ul>
            <p className={pClass}>
              You can control cookies through your browser settings. However, disabling cookies may affect certain features of the platform.
            </p>
          </section>

          <section id="marketing-communications" className={sectionClass}>
            <h2 className={h2Class}>11. Marketing Communications</h2>
            <p className={pClass}>We may send you emails, SMS, WhatsApp messages, push notifications, or other communications related to:</p>
            <ul className={ulClass}>
              <li>Account updates, order updates, platform updates</li>
              <li>Offers and promotions</li>
              <li>Creator opportunities and brand/agency opportunities</li>
              <li>Product announcements and educational content</li>
            </ul>
            <p className={pClass}>
              You may opt out of promotional communications at any time by using the unsubscribe option or contacting us. However, we may still send transactional or service-related communications.
            </p>
          </section>

          <section id="data-security" className={sectionClass}>
            <h2 className={h2Class}>12. Data Security</h2>
            <p className={pClass}>
              We take reasonable technical and organisational measures to protect personal information against unauthorised access, loss, misuse, disclosure, alteration, or destruction.
            </p>
            <p className={pClass}>These measures may include:</p>
            <ul className={ulClass}>
              <li>Access controls and password protection</li>
              <li>Encryption where appropriate</li>
              <li>Secure hosting and internal access restrictions</li>
              <li>Monitoring for suspicious activity</li>
              <li>Regular review of security practices</li>
            </ul>
            <p className={pClass}>
              However, no online platform can guarantee 100% security. Users are responsible for keeping their login credentials confidential.
            </p>
          </section>

          <section id="data-retention" className={sectionClass}>
            <h2 className={h2Class}>13. Data Retention</h2>
            <p className={pClass}>
              We retain personal information only for as long as necessary for the purposes described in this Privacy Policy, including:
            </p>
            <ul className={ulClass}>
              <li>Providing platform services and maintaining user accounts</li>
              <li>Completing orders, processing payments and payouts</li>
              <li>Handling disputes and refunds</li>
              <li>Complying with tax, accounting, and legal obligations</li>
              <li>Preventing fraud and misuse</li>
              <li>Enforcing our Terms of Service</li>
            </ul>
            <p className={pClass}>
              After the retention period ends, we may delete, anonymise, or securely archive the information, unless longer retention is required by law.
            </p>
          </section>

          <section id="your-rights" className={sectionClass}>
            <h2 className={h2Class}>14. Your Rights</h2>
            <p className={pClass}>Depending on applicable law, you may have the right to:</p>
            <ul className={ulClass}>
              <li>Access your personal information</li>
              <li>Correct or update inaccurate information</li>
              <li>Request deletion of your information</li>
              <li>Withdraw consent, where processing is based on consent</li>
              <li>Object to certain types of processing</li>
              <li>Request information about how your data is used</li>
              <li>Request grievance redressal</li>
              <li>Nominate another person to exercise your rights in certain circumstances, where applicable</li>
            </ul>
            <p className={pClass}>To exercise your rights, contact us at:</p>
            <div className="rounded-lg border border-border bg-muted/30 p-4 text-sm leading-relaxed text-muted-foreground">
              <p><span className="font-medium text-foreground">Email:</span>{" "}
                <a href="mailto:support@gocollab.io" className="text-primary underline underline-offset-2 hover:text-primary/80">support@gocollab.io</a>
              </p>
              <p className="mt-1"><span className="font-medium text-foreground">Subject Line:</span> Privacy Request – GoCollab</p>
            </div>
            <p className={`${pClass} mt-4`}>
              We may verify your identity before processing your request.
            </p>
          </section>

          <section id="account-deletion" className={sectionClass}>
            <h2 className={h2Class}>15. Account Deletion</h2>
            <p className={pClass}>
              You may request deletion of your account by contacting us at{" "}
              <a href="mailto:support@gocollab.io" className="text-primary underline underline-offset-2 hover:text-primary/80">support@gocollab.io</a>.
            </p>
            <p className={pClass}>Please note:</p>
            <ul className={ulClass}>
              <li>Some information may be retained for legal, tax, fraud prevention, dispute resolution, or contractual reasons.</li>
              <li>Deleted creator profiles may no longer be visible to brands.</li>
              <li>Deleting your account may not automatically delete completed order records, invoices, payment records, dispute records, or legally required records.</li>
              <li>If you have active orders, disputes, unpaid balances, or pending payouts, deletion may be delayed until those matters are resolved.</li>
            </ul>
          </section>

          <section id="childrens-privacy" className={sectionClass}>
            <h2 className={h2Class}>16. Children&apos;s Privacy</h2>
            <p className={pClass}>
              GoCollab is not intended for users below the age of 18 years, unless permitted by applicable law and with appropriate consent from a parent or legal guardian.
            </p>
            <p className={pClass}>
              We do not knowingly collect personal information from children. If we become aware that a child has provided personal information without proper consent, we may delete such information and restrict account access.
            </p>
          </section>

          <section id="international-data-transfers" className={sectionClass}>
            <h2 className={h2Class}>17. International Data Transfers</h2>
            <p className={pClass}>
              Your information may be stored or processed in countries other than your country of residence, depending on our hosting, payment, analytics, and service providers.
            </p>
            <p className={pClass}>
              Where required by law, we will take appropriate steps to protect transferred personal information through contractual, technical, or organisational safeguards.
            </p>
          </section>

          <section id="third-party-links" className={sectionClass}>
            <h2 className={h2Class}>18. Third-Party Links</h2>
            <p className={pClass}>
              GoCollab may contain links to third-party websites, social media profiles, payment gateways, portfolio links, or external tools.
            </p>
            <p className={pClass}>
              We are not responsible for the privacy practices, content, or security of third-party websites. Users should review the privacy policies of those third-party services before sharing information with them.
            </p>
          </section>

          <section id="third-party-integrations" className={sectionClass}>
            <h2 className={h2Class}>19. Third-Party Integrations</h2>
            <p className={pClass}>
              GoCollab may integrate with third-party tools such as payment providers, analytics platforms, communication tools, video hosting services, or social platforms.
            </p>
            <p className={pClass}>
              When you use such integrations, your information may also be processed according to the third party&apos;s own terms and privacy policy.
            </p>
          </section>

          <section id="user-responsibilities" className={sectionClass}>
            <h2 className={h2Class}>20. User Responsibilities</h2>
            <p className={pClass}>You agree to:</p>
            <ul className={ulClass}>
              <li>Provide accurate and updated information</li>
              <li>Not upload another person&apos;s personal data without authority</li>
              <li>Not share confidential information publicly</li>
              <li>Keep your login details secure</li>
              <li>Use the platform in compliance with applicable laws</li>
              <li>Respect privacy, intellectual property, and communication boundaries of other users</li>
            </ul>
            <p className={pClass}>
              Brands, agencies, and creators are responsible for ensuring that the materials they upload or share do not violate privacy rights, publicity rights, intellectual property rights, or applicable laws.
            </p>
          </section>

          <section id="changes-to-this-privacy-policy" className={sectionClass}>
            <h2 className={h2Class}>21. Changes to This Privacy Policy</h2>
            <p className={pClass}>We may update this Privacy Policy from time to time. If we make material changes, we may notify users through:</p>
            <ul className={ulClass}>
              <li>Email</li>
              <li>Platform notification</li>
              <li>Website notice</li>
              <li>Updated &quot;Last Updated&quot; date</li>
            </ul>
            <p className={pClass}>
              Your continued use of GoCollab after the updated Privacy Policy becomes effective means you accept the revised Policy.
            </p>
          </section>

          <section id="grievance-officer-contact" className={sectionClass}>
            <h2 className={h2Class}>22. Grievance Officer / Contact Us</h2>
            <p className={pClass}>
              For privacy questions, complaints, account deletion requests, data access requests, or grievance redressal, contact:
            </p>
            <div className="rounded-lg border border-border bg-muted/30 p-5 text-sm leading-relaxed text-muted-foreground">
              <p><span className="font-medium text-foreground">Company:</span> Messold Technologies</p>
              <p className="mt-1"><span className="font-medium text-foreground">Platform:</span> GoCollab</p>
              <p className="mt-1"><span className="font-medium text-foreground">Website:</span>{" "}
                <a href="https://www.messold.com" className="text-primary underline underline-offset-2 hover:text-primary/80" target="_blank" rel="noopener noreferrer">www.messold.com</a>
              </p>
              <p className="mt-1"><span className="font-medium text-foreground">Email:</span>{" "}
                <a href="mailto:support@gocollab.io" className="text-primary underline underline-offset-2 hover:text-primary/80">support@gocollab.io</a>
              </p>
            </div>
            <p className={`${pClass} mt-4`}>
              The DPDP Act gives individuals the right to have readily available means of grievance redressal from the data fiduciary.
            </p>
          </section>

        </article>

        <TableOfContents items={TOC_ITEMS} />
      </div>
    </>
  );
}
