import type { Metadata } from "next";
import { LegalPageHeader } from "@/components/legal/legal-page-header";
import {
  TableOfContents,
  type TocItem,
} from "@/components/legal/table-of-contents";

export const metadata: Metadata = {
  title: "Terms of Service",
  description:
    "Read the Terms of Service for GoCollab — the UGC marketplace connecting brands and creators. Understand your rights and responsibilities.",
};

const TOC_ITEMS: TocItem[] = [
  { id: "introduction-and-acceptance", label: "Introduction & Acceptance" },
  { id: "key-definitions", label: "Key Definitions" },
  { id: "eligibility-account-and-agency-authority", label: "Eligibility & Account" },
  { id: "marketplace-role", label: "Marketplace Role" },
  { id: "brand-briefs-orders-and-responsibilities", label: "Briefs, Orders & Responsibilities" },
  { id: "creator-selection-and-verification", label: "Creator Selection" },
  { id: "payments-platform-fees-and-taxes", label: "Payments & Fees" },
  { id: "refunds-cancellations-and-disputes", label: "Refunds & Disputes" },
  { id: "review-rounds-and-acceptance", label: "Review Rounds" },
  { id: "usage-rights-and-intellectual-property", label: "Usage Rights & IP" },
  { id: "brand-content-product-claims-and-regulated-categories", label: "Brand Content & Claims" },
  { id: "communication-and-off-platform-dealings", label: "Communication" },
  { id: "confidentiality", label: "Confidentiality" },
  { id: "platform-use-restrictions", label: "Use Restrictions" },
  { id: "suspension-and-termination", label: "Suspension & Termination" },
  { id: "disclaimers", label: "Disclaimers" },
  { id: "limitation-of-liability", label: "Limitation of Liability" },
  { id: "indemnity", label: "Indemnity" },
  { id: "privacy-and-data", label: "Privacy & Data" },
  { id: "governing-law-and-dispute-resolution", label: "Governing Law" },
  { id: "changes-to-these-terms", label: "Changes to Terms" },
  { id: "contact", label: "Contact" },
];


const sectionClass =
  "scroll-mt-24 mb-12 last:mb-0";
const h2Class =
  "text-xl font-bold tracking-tight sm:text-2xl mb-4 pb-3 border-b border-border";
const pClass = "mb-4 leading-relaxed text-muted-foreground";
const ulClass =
  "mb-4 list-disc space-y-2 pl-6 text-muted-foreground leading-relaxed";

export default function TermsOfServicePage() {
  return (
    <>
      <LegalPageHeader
        title="Terms of Service"
        description="These Terms of Service govern your access to and use of the GoCollab platform. Please read them carefully before using our services."
        effectiveDate="June 16, 2026"
      />

      <div className="grid gap-10 lg:grid-cols-[1fr_260px]">
        <article className="min-w-0">

          <section id="introduction-and-acceptance" className={sectionClass}>
            <h2 className={h2Class}>1. Introduction and Acceptance</h2>
            <p className={pClass}>
              These Terms of Service (&quot;Terms&quot;) govern access to and use of the GoCollab website, marketplace, dashboards, communication tools, payment flows, and related services (collectively, the &quot;Platform&quot;).
            </p>
            <p className={pClass}>
              The Platform is operated by Messold Technologies, having its registered office at J-6, Block J, Reserve Bank Enclave, Paschim Vihar, Delhi, 110063 (&quot;GoCollab&quot;, &quot;we&quot;, &quot;us&quot;, or &quot;our&quot;).
            </p>
            <p className={pClass}>
              By creating an account, browsing the Platform, placing an order, accepting a project, submitting deliverables, or otherwise using the Platform, you agree to be bound by these Terms, our Privacy Policy, Refund and Cancellation Policy, Creator Guidelines, Community Guidelines, and any project-specific order terms accepted through the Platform.
            </p>
            <p className={pClass}>
              If you are using the Platform on behalf of a company, agency, brand, client, or other entity, you confirm that you have authority to bind that entity to these Terms.
            </p>
          </section>

          <section id="key-definitions" className={sectionClass}>
            <h2 className={h2Class}>2. Key Definitions</h2>
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="whitespace-nowrap px-4 py-3 font-semibold text-foreground">Term</th>
                    <th className="px-4 py-3 font-semibold text-foreground">Meaning</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border text-muted-foreground">
                  <tr>
                    <td className="whitespace-nowrap px-4 py-3 font-medium text-foreground">Brand / Agency</td>
                    <td className="px-4 py-3">A business, agency, advertiser, marketer, ecommerce store, or individual that uses the Platform to find, book, brief, or pay creators for content.</td>
                  </tr>
                  <tr>
                    <td className="whitespace-nowrap px-4 py-3 font-medium text-foreground">Creator</td>
                    <td className="px-4 py-3">A user who lists a creator profile, accepts project briefs, produces UGC, and submits deliverables through the Platform.</td>
                  </tr>
                  <tr>
                    <td className="whitespace-nowrap px-4 py-3 font-medium text-foreground">UGC</td>
                    <td className="px-4 py-3">User-generated content or creator-generated content, including videos, photos, scripts, voiceovers, raw footage, edits, hooks, testimonials, product demos, unboxings, and related creative assets.</td>
                  </tr>
                  <tr>
                    <td className="whitespace-nowrap px-4 py-3 font-medium text-foreground">Project / Order</td>
                    <td className="px-4 py-3">A collaboration initiated through the Platform between a Brand/Agency and Creator, including the agreed brief, deliverables, pricing, timeline, revisions, and usage rights.</td>
                  </tr>
                  <tr>
                    <td className="whitespace-nowrap px-4 py-3 font-medium text-foreground">Deliverables</td>
                    <td className="px-4 py-3">The content files, drafts, final edits, source files, captions, scripts, or other materials that a Creator agrees to provide.</td>
                  </tr>
                  <tr>
                    <td className="whitespace-nowrap px-4 py-3 font-medium text-foreground">Platform Fee</td>
                    <td className="px-4 py-3">Any commission, service fee, processing fee, subscription fee, or other amount charged by GoCollab for facilitating the marketplace.</td>
                  </tr>
                  <tr>
                    <td className="whitespace-nowrap px-4 py-3 font-medium text-foreground">Usage Rights</td>
                    <td className="px-4 py-3">The license or permission granted to use the Deliverables for specified purposes, channels, territories, durations, and formats.</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section id="eligibility-account-and-agency-authority" className={sectionClass}>
            <h2 className={h2Class}>3. Eligibility, Account, and Agency Authority</h2>
            <ul className={ulClass}>
              <li>You must be legally capable of entering into contracts and must provide accurate, current, and complete account information.</li>
              <li>If you are an agency or representative, you confirm that you are authorised to act for your client and to approve budgets, briefs, content use, and payments.</li>
              <li>You are responsible for all activity under your account, including actions by employees, contractors, clients, or team members you invite.</li>
              <li>GoCollab may refuse, suspend, or terminate accounts that provide misleading information, violate these Terms, or create risk for creators, brands, users, or the Platform.</li>
            </ul>
          </section>

          <section id="marketplace-role" className={sectionClass}>
            <h2 className={h2Class}>4. Marketplace Role of GoCollab</h2>
            <p className={pClass}>
              GoCollab provides a marketplace and workflow layer to help Brands/Agencies discover creators, review creator profiles, issue project briefs, make payments, communicate, receive deliverables, and manage disputes. Unless expressly stated in writing, GoCollab is not the employer, agent, partner, representative, or manager of any Creator.
            </p>
            <p className={pClass}>
              Creators are independent service providers. GoCollab does not guarantee specific creative performance, advertising results, sales, ROAS, engagement, virality, brand lift, or conversion outcomes from UGC.
            </p>
          </section>

          <section id="brand-briefs-orders-and-responsibilities" className={sectionClass}>
            <h2 className={h2Class}>5. Brand Briefs, Orders, and Responsibilities</h2>
            <p className={pClass}>
              Before placing an order, you are responsible for providing a clear and complete brief. A good brief should include:
            </p>
            <ul className={ulClass}>
              <li>Product or service details and key claims</li>
              <li>Content format, length, aspect ratio, language, style, tone, and references</li>
              <li>Mandatory talking points, prohibited claims, and compliance guidelines</li>
              <li>Number of deliverables, revisions, raw files if required, deadlines, and submission format</li>
              <li>Usage rights required, including paid ads, organic social, whitelisting, website use, edits, and duration</li>
              <li>Product shipping, creator access, coupon codes, scripts, and any required brand assets</li>
            </ul>
            <p className={pClass}>
              You confirm that all information, products, claims, references, music, assets, instructions, and materials you provide are accurate, lawful, and do not infringe any third-party rights.
            </p>
          </section>

          <section id="creator-selection-and-verification" className={sectionClass}>
            <h2 className={h2Class}>6. Creator Selection and Verification</h2>
            <p className={pClass}>
              Creator profiles may include portfolios, niches, pricing, sample content, ratings, location, language, delivery timelines, and other creator-supplied information. While GoCollab may use verification, moderation, or quality review processes, you are responsible for evaluating whether a creator is suitable for your brand, product, audience, and campaign requirements.
            </p>
            <p className={pClass}>
              GoCollab may remove or restrict profiles that appear misleading, unsafe, inactive, or inconsistent with Platform standards, but we do not guarantee that every creator profile or sample is error-free, continuously updated, or suitable for every use case.
            </p>
          </section>

          <section id="payments-platform-fees-and-taxes" className={sectionClass}>
            <h2 className={h2Class}>7. Payments, Platform Fees, and Taxes</h2>
            <ul className={ulClass}>
              <li>You agree to pay all amounts shown at checkout or in the accepted order, including creator fees, Platform Fees, payment processing charges, taxes, shipping reimbursements, usage-rights upgrades, rush fees, and any other agreed charges.</li>
              <li>Unless stated otherwise, payment may be collected upfront and held or processed according to the Platform payment workflow. GoCollab may release payment to the Creator after the project is marked delivered, approved, auto-approved, or otherwise eligible for release under the applicable order terms.</li>
              <li>You are responsible for any applicable taxes, withholding obligations, invoices, and compliance requirements arising from your purchase or use of the Deliverables, except to the extent GoCollab is legally required to collect or remit a specific tax.</li>
            </ul>
          </section>

          <section id="refunds-cancellations-and-disputes" className={sectionClass}>
            <h2 className={h2Class}>8. Refunds, Cancellations, and Disputes</h2>
            <p className={pClass}>
              Refunds and cancellations are handled under the applicable Refund and Cancellation Policy and the specific facts of the order. In general, a Brand/Agency may be eligible for support, revision, replacement, credit, partial refund, or full refund where a Creator fails to deliver the agreed content, materially misses the accepted brief, submits unusable files, or abandons the order.
            </p>
            <p className={pClass}>
              Refunds are not guaranteed merely because the content does not achieve expected ad results, engagement, conversions, sales, or subjective preference if the Creator delivered according to the accepted brief.
            </p>
            <p className={pClass}>
              If you request a dispute review, you must provide the order details, accepted brief, communication records, submitted files, reason for dispute, and requested resolution within the timeline shown on the Platform. GoCollab may review evidence and make a reasonable marketplace decision, including approval, revision request, refund, credit, or release of payment. Messold Technologies reserves the right to deny or cancel any refund request at its sole discretion if the submitted evidence is incomplete, insufficient, inconsistent with the accepted brief, or does not reasonably support the dispute claim.
            </p>
          </section>

          <section id="review-rounds-and-acceptance" className={sectionClass}>
            <h2 className={h2Class}>9. Review Rounds and Acceptance</h2>
            <p className={pClass}>
              The number of included revisions will be stated in the order or creator offer. Revisions must relate to the accepted brief and should not introduce materially new requirements, new scripts, new products, new locations, new actors, new formats, or new usage rights unless the Creator agrees and additional fees are paid where applicable.
            </p>
            <p className={pClass}>
              Deliverables may be treated as accepted if you approve them, download or use them, fail to request revisions within the stated review period, or otherwise indicate acceptance through the Platform.
            </p>
          </section>

          <section id="usage-rights-and-intellectual-property" className={sectionClass}>
            <h2 className={h2Class}>10. Usage Rights and Intellectual Property</h2>
            <p className={pClass}>
              Unless otherwise stated in the order, Creators retain ownership of their underlying creative work, likeness, raw footage, templates, methods, and pre-existing materials, and Brands/Agencies receive only the Usage Rights expressly purchased or agreed through the Platform.
            </p>
            <p className={pClass}>
              You must not use Deliverables outside the agreed scope. Examples of additional rights that may require a separate license or fee include paid advertising, whitelisting/spark ads/creator account boosting, perpetual use, exclusivity, category lockout, TV/OTT, marketplace listings, app store ads, outdoor advertising, use after the license term, or major editing that changes the Creator context or endorsement.
            </p>
            <p className={pClass}>
              You are responsible for ensuring that all claims in the final content are legally substantiated, compliant with advertising standards, and suitable for your product category.
            </p>
          </section>

          <section id="brand-content-product-claims-and-regulated-categories" className={sectionClass}>
            <h2 className={h2Class}>11. Brand Content, Product Claims, and Regulated Categories</h2>
            <p className={pClass}>
              You must not request content that is false, misleading, illegal, unsafe, deceptive, discriminatory, infringing, defamatory, sexually exploitative, hateful, or otherwise prohibited by Platform policies. You must not ask Creators to make claims that they cannot honestly make or that require professional, medical, financial, legal, or regulatory substantiation unless you provide lawful and accurate instructions.
            </p>
            <p className={pClass}>
              Regulated or sensitive categories, including but not limited to healthcare, supplements, financial services, gambling, alcohol, tobacco/nicotine, adult products, political content, and products aimed at children, may require additional review or may be restricted or prohibited.
            </p>
          </section>

          <section id="communication-and-off-platform-dealings" className={sectionClass}>
            <h2 className={h2Class}>12. Communication and Off-Platform Dealings</h2>
            <p className={pClass}>
              To maintain payment protection, dispute support, order records, and user safety, project communication, approvals, revisions, and payment should take place through the Platform unless GoCollab expressly allows otherwise.
            </p>
            <p className={pClass}>
              You must not use the Platform to discover a Creator and then intentionally avoid Platform fees by moving the same or substantially similar transaction off-platform, unless permitted by GoCollab in writing.
            </p>
          </section>

          <section id="confidentiality" className={sectionClass}>
            <h2 className={h2Class}>13. Confidentiality</h2>
            <p className={pClass}>
              You may share confidential product, launch, pricing, campaign, or brand information with a Creator only when necessary for the project. You may request confidentiality obligations in the project brief or separate NDA. GoCollab is not responsible for confidential information you disclose outside the Platform or without appropriate protections.
            </p>
          </section>

          <section id="platform-use-restrictions" className={sectionClass}>
            <h2 className={h2Class}>14. Platform Use Restrictions</h2>
            <p className={pClass}>You must not:</p>
            <ul className={ulClass}>
              <li>Interfere with Platform security, scraping controls, account systems, or payment systems.</li>
              <li>Misrepresent your identity, agency authority, product category, campaign purpose, or required usage rights.</li>
              <li>Harass, pressure, threaten, or discriminate against creators.</li>
              <li>Request fake testimonials, undisclosed paid endorsements, unlawful reviews, or misleading before/after claims.</li>
              <li>Upload malware, infringing assets, unlawful content, or personal data that you are not permitted to share.</li>
            </ul>
          </section>

          <section id="suspension-and-termination" className={sectionClass}>
            <h2 className={h2Class}>15. Suspension and Termination</h2>
            <p className={pClass}>
              GoCollab may suspend or terminate your account, cancel orders, restrict features, remove content, withhold or reverse payment releases where legally permitted, or take other reasonable action if you breach these Terms, create risk, engage in fraud, misuse creator content, or violate Platform policies.
            </p>
          </section>

          <section id="disclaimers" className={sectionClass}>
            <h2 className={h2Class}>16. Disclaimers</h2>
            <p className={pClass}>
              The Platform is provided on an &quot;as is&quot; and &quot;as available&quot; basis. GoCollab does not warrant uninterrupted availability, error-free operation, specific creator performance, advertising results, sales, engagement, or that any Deliverable will meet subjective expectations beyond the accepted order scope.
            </p>
          </section>

          <section id="limitation-of-liability" className={sectionClass}>
            <h2 className={h2Class}>17. Limitation of Liability</h2>
            <p className={pClass}>
              To the maximum extent permitted by law, GoCollab will not be liable for indirect, incidental, special, consequential, exemplary, or punitive damages, including lost profits, lost revenue, lost data, loss of goodwill, or advertising underperformance. GoCollab&apos;s total liability arising out of or related to an order will not exceed the amount of Platform Fees received by GoCollab for that specific order, unless applicable law requires otherwise.
            </p>
          </section>

          <section id="indemnity" className={sectionClass}>
            <h2 className={h2Class}>18. Indemnity</h2>
            <p className={pClass}>
              You agree to indemnify and hold harmless GoCollab, its affiliates, officers, employees, contractors, and partners from claims, losses, liabilities, damages, costs, and expenses arising from your products, claims, instructions, assets, misuse of Deliverables, breach of Usage Rights, breach of these Terms, violation of law, or infringement of third-party rights.
            </p>
          </section>

          <section id="privacy-and-data" className={sectionClass}>
            <h2 className={h2Class}>19. Privacy and Data</h2>
            <p className={pClass}>
              Your use of the Platform is subject to our Privacy Policy. You must process creator personal data only for the relevant project and in accordance with applicable privacy laws. You must not add creators to marketing lists, share their details with unrelated parties, or use their data for purposes outside the project without permission.
            </p>
          </section>

          <section id="governing-law-and-dispute-resolution" className={sectionClass}>
            <h2 className={h2Class}>20. Governing Law and Dispute Resolution</h2>
            <p className={pClass}>
              These Terms are governed by the laws of India, unless another governing law is required by mandatory consumer or platform law. Subject to applicable law, courts located in Delhi, India will have exclusive jurisdiction over disputes that cannot be resolved through Platform support or good-faith negotiation.
            </p>
          </section>

          <section id="changes-to-these-terms" className={sectionClass}>
            <h2 className={h2Class}>21. Changes to These Terms</h2>
            <p className={pClass}>
              GoCollab may update these Terms from time to time. Updated Terms will be posted on the Platform with a new effective date. Continued use of the Platform after changes become effective means you accept the updated Terms.
            </p>
          </section>

          <section id="contact" className={sectionClass}>
            <h2 className={h2Class}>22. Contact</h2>
            <p className={pClass}>
              For legal, policy, refund, or support questions, contact Messold Technologies.
            </p>
            <div className="rounded-lg border border-border bg-muted/30 p-5 text-sm leading-relaxed text-muted-foreground">
              <p><span className="font-medium text-foreground">Company:</span> Messold Technologies</p>
              <p className="mt-1"><span className="font-medium text-foreground">Platform:</span> GoCollab</p>
              <p className="mt-1"><span className="font-medium text-foreground">Website:</span>{" "}
                <a href="https://www.messold.com" className="text-primary underline underline-offset-2 hover:text-primary/80" target="_blank" rel="noopener noreferrer">
                  www.messold.com
                </a>
              </p>
              <p className="mt-1"><span className="font-medium text-foreground">Email:</span>{" "}
                <a href="mailto:support@gocollab.io" className="text-primary underline underline-offset-2 hover:text-primary/80">
                  support@gocollab.io
                </a>
              </p>
            </div>
          </section>

        </article>

        <TableOfContents items={TOC_ITEMS} />
      </div>
    </>
  );
}
