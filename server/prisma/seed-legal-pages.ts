import { PrismaClient } from '@prisma/client';

/**
 * Seeds the LegalPage + LegalSection tables with the content previously
 * hardcoded in the Next.js privacy-policy and terms-of-service pages.
 * Idempotent — uses upsert on the slug / (pageId + anchorId) unique keys.
 */
export async function seedLegalPages(prisma: PrismaClient): Promise<void> {
  const db = prisma as any;

  // ───────────────────────────────────────────────────────────────
  // 1. Privacy Policy
  // ───────────────────────────────────────────────────────────────

  const privacyPage = await db.legalPage.upsert({
    where: { slug: 'privacy-policy' },
    update: {},
    create: {
      slug: 'privacy-policy',
      title: 'Privacy Policy',
      description:
        'This Privacy Policy explains how GoCollab collects, uses, stores, shares, and protects personal information when you access or use our platform and related services.',
      effectiveDate: 'June 16, 2026',
    },
    select: { id: true },
  });

  const privacySections = [
    {
      anchorId: 'who-this-policy-applies-to',
      title: 'Who This Policy Applies To',
      tocLabel: 'Who This Applies To',
      sortOrder: 0,
      content: `<p class="mb-4 leading-relaxed text-muted-foreground">This Privacy Policy applies to:</p>
<ul class="mb-4 list-disc space-y-2 pl-6 text-muted-foreground leading-relaxed">
  <li><strong class="text-foreground">Creators</strong> who register, create profiles, upload portfolios, submit content, or provide services through GoCollab.</li>
  <li><strong class="text-foreground">Brands, agencies, business users</strong>, and their representatives who browse creators, place orders, communicate with creators, or use GoCollab services.</li>
  <li><strong class="text-foreground">Visitors</strong> who browse our website.</li>
  <li><strong class="text-foreground">Users</strong> who contact us for support, disputes, refunds, partnerships, or general enquiries.</li>
</ul>
<p class="mb-4 leading-relaxed text-muted-foreground">This Policy applies to personal data, meaning information that can identify an individual directly or indirectly. India&apos;s Digital Personal Data Protection Act, 2023 defines personal data broadly as data about an individual who is identifiable by or in relation to such data.</p>`,
    },
    {
      anchorId: 'information-we-collect',
      title: 'Information We Collect',
      tocLabel: 'Information We Collect',
      sortOrder: 1,
      content: `<p class="mb-4 leading-relaxed text-muted-foreground">We may collect the following types of information:</p>
<h3 class="text-lg font-semibold tracking-tight mb-3 mt-6">A. Account Information</h3>
<p class="mb-4 leading-relaxed text-muted-foreground">When you create an account, we may collect:</p>
<ul class="mb-4 list-disc space-y-2 pl-6 text-muted-foreground leading-relaxed">
  <li>Name, email address, phone number</li>
  <li>Password or login credentials</li>
  <li>User type (creator, brand, agency, or admin)</li>
  <li>Business name or creator name</li>
  <li>Profile photo or logo</li>
  <li>Location, city, state, and country</li>
  <li>Social media handles or portfolio links</li>
</ul>
<h3 class="text-lg font-semibold tracking-tight mb-3 mt-6">B. Creator Profile Information</h3>
<p class="mb-4 leading-relaxed text-muted-foreground">If you register as a creator, we may collect:</p>
<ul class="mb-4 list-disc space-y-2 pl-6 text-muted-foreground leading-relaxed">
  <li>Creator bio, niche/category, languages spoken</li>
  <li>Content samples, portfolio videos or images</li>
  <li>Pricing details and delivery timelines</li>
  <li>Past work examples, ratings, reviews, and performance information</li>
  <li>Payment or payout-related information</li>
  <li>Identity or verification details, where required</li>
</ul>
<h3 class="text-lg font-semibold tracking-tight mb-3 mt-6">C. Brand or Agency Information</h3>
<p class="mb-4 leading-relaxed text-muted-foreground">If you register as a brand or agency, we may collect:</p>
<ul class="mb-4 list-disc space-y-2 pl-6 text-muted-foreground leading-relaxed">
  <li>Business name, brand website, industry or product category</li>
  <li>Contact person details, billing details</li>
  <li>Campaign requirements, creator preferences</li>
  <li>Order details, briefs, scripts, references, product information, and communication records</li>
</ul>
<h3 class="text-lg font-semibold tracking-tight mb-3 mt-6">D. Order and Collaboration Information</h3>
<p class="mb-4 leading-relaxed text-muted-foreground">When you use GoCollab to collaborate, we may collect:</p>
<ul class="mb-4 list-disc space-y-2 pl-6 text-muted-foreground leading-relaxed">
  <li>Order details, accepted briefs, deliverables, uploaded content files</li>
  <li>Messages exchanged between users</li>
  <li>Revision requests, dispute details, refund requests</li>
  <li>Ratings, reviews, and usage rights agreed</li>
</ul>
<h3 class="text-lg font-semibold tracking-tight mb-3 mt-6">E. Payment Information</h3>
<p class="mb-4 leading-relaxed text-muted-foreground">We may collect or process payment-related information such as:</p>
<ul class="mb-4 list-disc space-y-2 pl-6 text-muted-foreground leading-relaxed">
  <li>Billing name, billing address, payment status</li>
  <li>Transaction ID, invoice details, GST/tax details</li>
  <li>Payout information for creators</li>
</ul>
<p class="mb-4 leading-relaxed text-muted-foreground">We may use third-party payment gateways or payment service providers to process payments. GoCollab does not store complete card numbers, UPI credentials, CVV numbers, or sensitive banking authentication information unless specifically required and legally permitted.</p>
<h3 class="text-lg font-semibold tracking-tight mb-3 mt-6">F. Communication Information</h3>
<p class="mb-4 leading-relaxed text-muted-foreground">When you contact us, we may collect:</p>
<ul class="mb-4 list-disc space-y-2 pl-6 text-muted-foreground leading-relaxed">
  <li>Your name, email address, phone number</li>
  <li>Support request details, feedback</li>
  <li>Complaint or dispute information</li>
  <li>Any attachments or evidence you submit</li>
</ul>
<h3 class="text-lg font-semibold tracking-tight mb-3 mt-6">G. Technical and Usage Information</h3>
<p class="mb-4 leading-relaxed text-muted-foreground">When you use our website or platform, we may automatically collect:</p>
<ul class="mb-4 list-disc space-y-2 pl-6 text-muted-foreground leading-relaxed">
  <li>IP address, browser type, device type, operating system</li>
  <li>Pages visited, time spent on pages, referring URLs</li>
  <li>Login activity, approximate location</li>
  <li>Cookies and tracking data, platform usage behaviour</li>
</ul>`,
    },
    {
      anchorId: 'how-we-use-your-information',
      title: 'How We Use Your Information',
      tocLabel: 'How We Use Your Info',
      sortOrder: 2,
      content: `<p class="mb-4 leading-relaxed text-muted-foreground">We use your information to operate, improve, protect, and personalise GoCollab. We may use your information to:</p>
<ul class="mb-4 list-disc space-y-2 pl-6 text-muted-foreground leading-relaxed">
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
</ul>`,
    },
    {
      anchorId: 'legal-basis-for-processing',
      title: 'Legal Basis for Processing',
      tocLabel: 'Legal Basis',
      sortOrder: 3,
      content: `<p class="mb-4 leading-relaxed text-muted-foreground">Depending on your location and applicable law, we may process your information based on:</p>
<ul class="mb-4 list-disc space-y-2 pl-6 text-muted-foreground leading-relaxed">
  <li>Your consent</li>
  <li>Performance of a contract with you</li>
  <li>Compliance with legal obligations</li>
  <li>Legitimate business interests</li>
  <li>Fraud prevention and platform safety</li>
  <li>Dispute resolution and enforcement of platform terms</li>
</ul>
<p class="mb-4 leading-relaxed text-muted-foreground">Where consent is required, we will seek your consent before processing your personal data for that specific purpose. The DPDP framework emphasises notice, consent, and purpose-based processing of personal data.</p>`,
    },
    {
      anchorId: 'how-we-share-information',
      title: 'How We Share Information',
      tocLabel: 'How We Share Info',
      sortOrder: 4,
      content: `<p class="mb-4 leading-relaxed text-muted-foreground font-medium text-foreground">We do not sell your personal information.</p>
<p class="mb-4 leading-relaxed text-muted-foreground">We may share your information in the following cases:</p>
<h3 class="text-lg font-semibold tracking-tight mb-3 mt-6">A. Between Brands/Agencies and Creators</h3>
<p class="mb-4 leading-relaxed text-muted-foreground">To enable collaboration, certain information may be visible to the other party, such as:</p>
<ul class="mb-4 list-disc space-y-2 pl-6 text-muted-foreground leading-relaxed">
  <li>Creator profile information and brand/agency brief details</li>
  <li>Order details, messages, submitted files</li>
  <li>Revision requests, delivery status</li>
  <li>Usage rights and agreed deliverables</li>
</ul>
<h3 class="text-lg font-semibold tracking-tight mb-3 mt-6">B. With Service Providers</h3>
<p class="mb-4 leading-relaxed text-muted-foreground">We may share information with trusted third-party providers who help us operate the platform, including:</p>
<ul class="mb-4 list-disc space-y-2 pl-6 text-muted-foreground leading-relaxed">
  <li>Payment gateways and hosting providers</li>
  <li>Cloud storage providers and analytics tools</li>
  <li>Email and SMS service providers</li>
  <li>Customer support tools and fraud prevention tools</li>
  <li>Legal, tax, or accounting partners</li>
</ul>
<h3 class="text-lg font-semibold tracking-tight mb-3 mt-6">C. For Legal and Safety Reasons</h3>
<p class="mb-4 leading-relaxed text-muted-foreground">We may disclose information if required to:</p>
<ul class="mb-4 list-disc space-y-2 pl-6 text-muted-foreground leading-relaxed">
  <li>Comply with applicable law or respond to lawful requests</li>
  <li>Protect GoCollab&apos;s rights, users, or platform</li>
  <li>Investigate fraud, abuse, disputes, or policy violations</li>
  <li>Enforce our Terms of Service or protect against security threats</li>
</ul>
<h3 class="text-lg font-semibold tracking-tight mb-3 mt-6">D. Business Transfers</h3>
<p class="mb-4 leading-relaxed text-muted-foreground">If GoCollab is involved in a merger, acquisition, restructuring, investment, sale of assets, or transfer of business, user information may be transferred as part of that transaction, subject to appropriate safeguards.</p>`,
    },
    {
      anchorId: 'creator-profiles-and-public-information',
      title: 'Creator Profiles and Public Information',
      tocLabel: 'Creator Profiles',
      sortOrder: 5,
      content: `<p class="mb-4 leading-relaxed text-muted-foreground">Creator profiles may be visible to brands, agencies, and other platform users. Public or semi-public creator profile information may include:</p>
<ul class="mb-4 list-disc space-y-2 pl-6 text-muted-foreground leading-relaxed">
  <li>Name or creator name, profile photo, bio</li>
  <li>Niche/category, portfolio samples, pricing</li>
  <li>Languages, delivery timeline</li>
  <li>Reviews, ratings, and social media links (where provided)</li>
</ul>
<p class="mb-4 leading-relaxed text-muted-foreground">Creators should not upload personal information they do not want to be visible to potential clients or platform users.</p>`,
    },
    {
      anchorId: 'brand-and-agency-briefs',
      title: 'Brand and Agency Briefs',
      tocLabel: 'Brand & Agency Briefs',
      sortOrder: 6,
      content: `<p class="mb-4 leading-relaxed text-muted-foreground">Brands and agencies may upload briefs, product information, campaign details, reference files, scripts, or other materials. These may be shared with selected creators for the purpose of completing orders.</p>
<p class="mb-4 leading-relaxed text-muted-foreground">Brands and agencies are responsible for ensuring that they have the right to upload and share any materials, product information, trademarks, images, videos, or third-party content provided through the platform.</p>`,
    },
    {
      anchorId: 'uploaded-content-and-deliverables',
      title: 'Uploaded Content and Deliverables',
      tocLabel: 'Uploaded Content',
      sortOrder: 7,
      content: `<p class="mb-4 leading-relaxed text-muted-foreground">Creators may upload videos, images, drafts, scripts, thumbnails, voiceovers, or other deliverables. Brands may upload references, product details, campaign notes, and supporting files.</p>
<p class="mb-4 leading-relaxed text-muted-foreground">We may process uploaded files to:</p>
<ul class="mb-4 list-disc space-y-2 pl-6 text-muted-foreground leading-relaxed">
  <li>Enable order completion and support revisions</li>
  <li>Resolve disputes and verify delivery</li>
  <li>Enforce platform policies and maintain transaction records</li>
  <li>Improve platform safety</li>
</ul>
<p class="mb-4 leading-relaxed text-muted-foreground">We do not claim ownership of user content except as required to operate the platform, process orders, provide services, enforce rights, and comply with applicable policies.</p>`,
    },
    {
      anchorId: 'platform-promotional-usage-rights',
      title: 'Platform Promotional Usage Rights',
      tocLabel: 'Promotional Usage Rights',
      sortOrder: 8,
      content: `<p class="mb-4 leading-relaxed text-muted-foreground">By uploading, submitting, or delivering content through LetsCollab, including videos, images, testimonials, campaign deliverables, portfolio samples, or other creative assets, you grant LetsCollab and Messold Technologies a non-exclusive, worldwide, royalty-free license to use, display, reproduce, publish, showcase, and promote such content on the LetsCollab platform, including but not limited to the homepage, creator profiles, case studies, marketing materials, social media channels, presentations, advertisements, emails, and other areas of the platform for the purpose of promoting LetsCollab and its services.</p>
<p class="mb-4 leading-relaxed text-muted-foreground">This license does not transfer ownership of the content to LetsCollab. The creator or rightful owner retains all ownership rights in the content. LetsCollab will make reasonable efforts to attribute content to the relevant creator, brand, or agency where appropriate.</p>
<p class="mb-4 leading-relaxed text-muted-foreground">If a brand, agency, or creator believes certain content should not be used for promotional purposes due to confidentiality obligations or other legitimate concerns, they may submit a written request to LetsCollab for review.</p>`,
    },
    {
      anchorId: 'dispute-and-refund-review-data',
      title: 'Dispute and Refund Review Data',
      tocLabel: 'Dispute & Refund Data',
      sortOrder: 9,
      content: `<p class="mb-4 leading-relaxed text-muted-foreground">If you request a dispute review, refund, cancellation, or payment release review, we may collect and review:</p>
<ul class="mb-4 list-disc space-y-2 pl-6 text-muted-foreground leading-relaxed">
  <li>Order details, accepted brief, communication records</li>
  <li>Submitted files, delivery proof, revision history</li>
  <li>Payment status, reason for dispute, requested resolution</li>
  <li>Supporting evidence from both parties</li>
</ul>
<p class="mb-4 leading-relaxed text-muted-foreground">GoCollab may use this information to make a reasonable marketplace decision, including approval, revision request, refund, credit, rejection of refund, cancellation of refund, or release of payment.</p>`,
    },
    {
      anchorId: 'cookies-and-tracking',
      title: 'Cookies and Tracking Technologies',
      tocLabel: 'Cookies & Tracking',
      sortOrder: 10,
      content: `<p class="mb-4 leading-relaxed text-muted-foreground">We may use cookies, pixels, tags, and similar technologies to:</p>
<ul class="mb-4 list-disc space-y-2 pl-6 text-muted-foreground leading-relaxed">
  <li>Keep users logged in and remember preferences</li>
  <li>Improve website performance and understand user behaviour</li>
  <li>Analyse traffic and improve marketing campaigns</li>
  <li>Prevent fraud and misuse</li>
</ul>
<p class="mb-4 leading-relaxed text-muted-foreground">You can control cookies through your browser settings. However, disabling cookies may affect certain features of the platform.</p>`,
    },
    {
      anchorId: 'marketing-communications',
      title: 'Marketing Communications',
      tocLabel: 'Marketing',
      sortOrder: 11,
      content: `<p class="mb-4 leading-relaxed text-muted-foreground">We may send you emails, SMS, WhatsApp messages, push notifications, or other communications related to:</p>
<ul class="mb-4 list-disc space-y-2 pl-6 text-muted-foreground leading-relaxed">
  <li>Account updates, order updates, platform updates</li>
  <li>Offers and promotions</li>
  <li>Creator opportunities and brand/agency opportunities</li>
  <li>Product announcements and educational content</li>
</ul>
<p class="mb-4 leading-relaxed text-muted-foreground">You may opt out of promotional communications at any time by using the unsubscribe option or contacting us. However, we may still send transactional or service-related communications.</p>`,
    },
    {
      anchorId: 'data-security',
      title: 'Data Security',
      tocLabel: 'Data Security',
      sortOrder: 12,
      content: `<p class="mb-4 leading-relaxed text-muted-foreground">We take reasonable technical and organisational measures to protect personal information against unauthorised access, loss, misuse, disclosure, alteration, or destruction.</p>
<p class="mb-4 leading-relaxed text-muted-foreground">These measures may include:</p>
<ul class="mb-4 list-disc space-y-2 pl-6 text-muted-foreground leading-relaxed">
  <li>Access controls and password protection</li>
  <li>Encryption where appropriate</li>
  <li>Secure hosting and internal access restrictions</li>
  <li>Monitoring for suspicious activity</li>
  <li>Regular review of security practices</li>
</ul>
<p class="mb-4 leading-relaxed text-muted-foreground">However, no online platform can guarantee 100% security. Users are responsible for keeping their login credentials confidential.</p>`,
    },
    {
      anchorId: 'data-retention',
      title: 'Data Retention',
      tocLabel: 'Data Retention',
      sortOrder: 13,
      content: `<p class="mb-4 leading-relaxed text-muted-foreground">We retain personal information only for as long as necessary for the purposes described in this Privacy Policy, including:</p>
<ul class="mb-4 list-disc space-y-2 pl-6 text-muted-foreground leading-relaxed">
  <li>Providing platform services and maintaining user accounts</li>
  <li>Completing orders, processing payments and payouts</li>
  <li>Handling disputes and refunds</li>
  <li>Complying with tax, accounting, and legal obligations</li>
  <li>Preventing fraud and misuse</li>
  <li>Enforcing our Terms of Service</li>
</ul>
<p class="mb-4 leading-relaxed text-muted-foreground">After the retention period ends, we may delete, anonymise, or securely archive the information, unless longer retention is required by law.</p>`,
    },
    {
      anchorId: 'your-rights',
      title: 'Your Rights',
      tocLabel: 'Your Rights',
      sortOrder: 14,
      content: `<p class="mb-4 leading-relaxed text-muted-foreground">Depending on applicable law, you may have the right to:</p>
<ul class="mb-4 list-disc space-y-2 pl-6 text-muted-foreground leading-relaxed">
  <li>Access your personal information</li>
  <li>Correct or update inaccurate information</li>
  <li>Request deletion of your information</li>
  <li>Withdraw consent, where processing is based on consent</li>
  <li>Object to certain types of processing</li>
  <li>Request information about how your data is used</li>
  <li>Request grievance redressal</li>
  <li>Nominate another person to exercise your rights in certain circumstances, where applicable</li>
</ul>
<p class="mb-4 leading-relaxed text-muted-foreground">To exercise your rights, contact us at:</p>
<div class="rounded-lg border border-border bg-muted/30 p-4 text-sm leading-relaxed text-muted-foreground">
  <p><span class="font-medium text-foreground">Email:</span> <a href="mailto:support@gocollab.io" class="text-primary underline underline-offset-2 hover:text-primary/80">support@gocollab.io</a></p>
  <p class="mt-1"><span class="font-medium text-foreground">Subject Line:</span> Privacy Request – GoCollab</p>
</div>
<p class="mb-4 leading-relaxed text-muted-foreground mt-4">We may verify your identity before processing your request.</p>`,
    },
    {
      anchorId: 'account-deletion',
      title: 'Account Deletion',
      tocLabel: 'Account Deletion',
      sortOrder: 15,
      content: `<p class="mb-4 leading-relaxed text-muted-foreground">You may request deletion of your account by contacting us at <a href="mailto:support@gocollab.io" class="text-primary underline underline-offset-2 hover:text-primary/80">support@gocollab.io</a>.</p>
<p class="mb-4 leading-relaxed text-muted-foreground">Please note:</p>
<ul class="mb-4 list-disc space-y-2 pl-6 text-muted-foreground leading-relaxed">
  <li>Some information may be retained for legal, tax, fraud prevention, dispute resolution, or contractual reasons.</li>
  <li>Deleted creator profiles may no longer be visible to brands.</li>
  <li>Deleting your account may not automatically delete completed order records, invoices, payment records, dispute records, or legally required records.</li>
  <li>If you have active orders, disputes, unpaid balances, or pending payouts, deletion may be delayed until those matters are resolved.</li>
</ul>`,
    },
    {
      anchorId: 'childrens-privacy',
      title: "Children's Privacy",
      tocLabel: "Children's Privacy",
      sortOrder: 16,
      content: `<p class="mb-4 leading-relaxed text-muted-foreground">GoCollab is not intended for users below the age of 18 years, unless permitted by applicable law and with appropriate consent from a parent or legal guardian.</p>
<p class="mb-4 leading-relaxed text-muted-foreground">We do not knowingly collect personal information from children. If we become aware that a child has provided personal information without proper consent, we may delete such information and restrict account access.</p>`,
    },
    {
      anchorId: 'international-data-transfers',
      title: 'International Data Transfers',
      tocLabel: 'International Transfers',
      sortOrder: 17,
      content: `<p class="mb-4 leading-relaxed text-muted-foreground">Your information may be stored or processed in countries other than your country of residence, depending on our hosting, payment, analytics, and service providers.</p>
<p class="mb-4 leading-relaxed text-muted-foreground">Where required by law, we will take appropriate steps to protect transferred personal information through contractual, technical, or organisational safeguards.</p>`,
    },
    {
      anchorId: 'third-party-links',
      title: 'Third-Party Links',
      tocLabel: 'Third-Party Links',
      sortOrder: 18,
      content: `<p class="mb-4 leading-relaxed text-muted-foreground">GoCollab may contain links to third-party websites, social media profiles, payment gateways, portfolio links, or external tools.</p>
<p class="mb-4 leading-relaxed text-muted-foreground">We are not responsible for the privacy practices, content, or security of third-party websites. Users should review the privacy policies of those third-party services before sharing information with them.</p>`,
    },
    {
      anchorId: 'third-party-integrations',
      title: 'Third-Party Integrations',
      tocLabel: 'Third-Party Integrations',
      sortOrder: 19,
      content: `<p class="mb-4 leading-relaxed text-muted-foreground">GoCollab may integrate with third-party tools such as payment providers, analytics platforms, communication tools, video hosting services, or social platforms.</p>
<p class="mb-4 leading-relaxed text-muted-foreground">When you use such integrations, your information may also be processed according to the third party&apos;s own terms and privacy policy.</p>`,
    },
    {
      anchorId: 'user-responsibilities',
      title: 'User Responsibilities',
      tocLabel: 'User Responsibilities',
      sortOrder: 20,
      content: `<p class="mb-4 leading-relaxed text-muted-foreground">You agree to:</p>
<ul class="mb-4 list-disc space-y-2 pl-6 text-muted-foreground leading-relaxed">
  <li>Provide accurate and updated information</li>
  <li>Not upload another person&apos;s personal data without authority</li>
  <li>Not share confidential information publicly</li>
  <li>Keep your login details secure</li>
  <li>Use the platform in compliance with applicable laws</li>
  <li>Respect privacy, intellectual property, and communication boundaries of other users</li>
</ul>
<p class="mb-4 leading-relaxed text-muted-foreground">Brands, agencies, and creators are responsible for ensuring that the materials they upload or share do not violate privacy rights, publicity rights, intellectual property rights, or applicable laws.</p>`,
    },
    {
      anchorId: 'changes-to-this-privacy-policy',
      title: 'Changes to This Privacy Policy',
      tocLabel: 'Changes to Policy',
      sortOrder: 21,
      content: `<p class="mb-4 leading-relaxed text-muted-foreground">We may update this Privacy Policy from time to time. If we make material changes, we may notify users through:</p>
<ul class="mb-4 list-disc space-y-2 pl-6 text-muted-foreground leading-relaxed">
  <li>Email</li>
  <li>Platform notification</li>
  <li>Website notice</li>
  <li>Updated &quot;Last Updated&quot; date</li>
</ul>
<p class="mb-4 leading-relaxed text-muted-foreground">Your continued use of GoCollab after the updated Privacy Policy becomes effective means you accept the revised Policy.</p>`,
    },
    {
      anchorId: 'grievance-officer-contact',
      title: 'Grievance Officer / Contact Us',
      tocLabel: 'Contact / Grievance',
      sortOrder: 22,
      content: `<p class="mb-4 leading-relaxed text-muted-foreground">For privacy questions, complaints, account deletion requests, data access requests, or grievance redressal, contact:</p>
<div class="rounded-lg border border-border bg-muted/30 p-5 text-sm leading-relaxed text-muted-foreground">
  <p><span class="font-medium text-foreground">Company:</span> Messold Technologies</p>
  <p class="mt-1"><span class="font-medium text-foreground">Platform:</span> GoCollab</p>
  <p class="mt-1"><span class="font-medium text-foreground">Website:</span> <a href="https://www.messold.com" class="text-primary underline underline-offset-2 hover:text-primary/80" target="_blank" rel="noopener noreferrer">www.messold.com</a></p>
  <p class="mt-1"><span class="font-medium text-foreground">Email:</span> <a href="mailto:support@gocollab.io" class="text-primary underline underline-offset-2 hover:text-primary/80">support@gocollab.io</a></p>
</div>
<p class="mb-4 leading-relaxed text-muted-foreground mt-4">The DPDP Act gives individuals the right to have readily available means of grievance redressal from the data fiduciary.</p>`,
    },
  ];

  for (let i = 0; i < privacySections.length; i++) {
    const s = privacySections[i];
    await db.legalSection.upsert({
      where: {
        pageId_anchorId: {
          pageId: privacyPage.id,
          anchorId: s.anchorId,
        },
      },
      update: {
        title: s.title,
        tocLabel: s.tocLabel,
        content: s.content,
        sortOrder: s.sortOrder,
      },
      create: {
        pageId: privacyPage.id,
        anchorId: s.anchorId,
        title: s.title,
        tocLabel: s.tocLabel,
        content: s.content,
        sortOrder: s.sortOrder,
      },
    });
  }

  console.log(
    `[seed] Legal page "privacy-policy" seeded with ${privacySections.length} sections`,
  );

  // ───────────────────────────────────────────────────────────────
  // 2. Terms of Service
  // ───────────────────────────────────────────────────────────────

  const termsPage = await db.legalPage.upsert({
    where: { slug: 'terms-of-service' },
    update: {},
    create: {
      slug: 'terms-of-service',
      title: 'Terms of Service',
      description:
        'These Terms of Service govern your access to and use of the GoCollab platform. Please read them carefully before using our services.',
      effectiveDate: 'June 16, 2026',
    },
    select: { id: true },
  });

  const termsSections = [
    {
      anchorId: 'introduction-and-acceptance',
      title: 'Introduction and Acceptance',
      tocLabel: 'Introduction & Acceptance',
      sortOrder: 0,
      content: `<p class="mb-4 leading-relaxed text-muted-foreground">These Terms of Service (&quot;Terms&quot;) govern access to and use of the GoCollab website, marketplace, dashboards, communication tools, payment flows, and related services (collectively, the &quot;Platform&quot;).</p>
<p class="mb-4 leading-relaxed text-muted-foreground">The Platform is operated by Messold Technologies, having its registered office at J-6, Block J, Reserve Bank Enclave, Paschim Vihar, Delhi, 110063 (&quot;GoCollab&quot;, &quot;we&quot;, &quot;us&quot;, or &quot;our&quot;).</p>
<p class="mb-4 leading-relaxed text-muted-foreground">By creating an account, browsing the Platform, placing an order, accepting a project, submitting deliverables, or otherwise using the Platform, you agree to be bound by these Terms, our Privacy Policy, Refund and Cancellation Policy, Creator Guidelines, Community Guidelines, and any project-specific order terms accepted through the Platform.</p>
<p class="mb-4 leading-relaxed text-muted-foreground">If you are using the Platform on behalf of a company, agency, brand, client, or other entity, you confirm that you have authority to bind that entity to these Terms.</p>`,
    },
    {
      anchorId: 'key-definitions',
      title: 'Key Definitions',
      tocLabel: 'Key Definitions',
      sortOrder: 1,
      content: `<div class="overflow-x-auto rounded-lg border border-border">
  <table class="w-full text-left text-sm">
    <thead><tr class="border-b border-border bg-muted/50"><th class="whitespace-nowrap px-4 py-3 font-semibold text-foreground">Term</th><th class="px-4 py-3 font-semibold text-foreground">Meaning</th></tr></thead>
    <tbody class="divide-y divide-border text-muted-foreground">
      <tr><td class="whitespace-nowrap px-4 py-3 font-medium text-foreground">Brand / Agency</td><td class="px-4 py-3">A business, agency, advertiser, marketer, ecommerce store, or individual that uses the Platform to find, book, brief, or pay creators for content.</td></tr>
      <tr><td class="whitespace-nowrap px-4 py-3 font-medium text-foreground">Creator</td><td class="px-4 py-3">A user who lists a creator profile, accepts project briefs, produces UGC, and submits deliverables through the Platform.</td></tr>
      <tr><td class="whitespace-nowrap px-4 py-3 font-medium text-foreground">UGC</td><td class="px-4 py-3">User-generated content or creator-generated content, including videos, photos, scripts, voiceovers, raw footage, edits, hooks, testimonials, product demos, unboxings, and related creative assets.</td></tr>
      <tr><td class="whitespace-nowrap px-4 py-3 font-medium text-foreground">Project / Order</td><td class="px-4 py-3">A collaboration initiated through the Platform between a Brand/Agency and Creator, including the agreed brief, deliverables, pricing, timeline, revisions, and usage rights.</td></tr>
      <tr><td class="whitespace-nowrap px-4 py-3 font-medium text-foreground">Deliverables</td><td class="px-4 py-3">The content files, drafts, final edits, source files, captions, scripts, or other materials that a Creator agrees to provide.</td></tr>
      <tr><td class="whitespace-nowrap px-4 py-3 font-medium text-foreground">Platform Fee</td><td class="px-4 py-3">Any commission, service fee, processing fee, subscription fee, or other amount charged by GoCollab for facilitating the marketplace.</td></tr>
      <tr><td class="whitespace-nowrap px-4 py-3 font-medium text-foreground">Usage Rights</td><td class="px-4 py-3">The license or permission granted to use the Deliverables for specified purposes, channels, territories, durations, and formats.</td></tr>
    </tbody>
  </table>
</div>`,
    },
    {
      anchorId: 'eligibility-account-and-agency-authority',
      title: 'Eligibility, Account, and Agency Authority',
      tocLabel: 'Eligibility & Account',
      sortOrder: 2,
      content: `<ul class="mb-4 list-disc space-y-2 pl-6 text-muted-foreground leading-relaxed">
  <li>You must be legally capable of entering into contracts and must provide accurate, current, and complete account information.</li>
  <li>If you are an agency or representative, you confirm that you are authorised to act for your client and to approve budgets, briefs, content use, and payments.</li>
  <li>You are responsible for all activity under your account, including actions by employees, contractors, clients, or team members you invite.</li>
  <li>GoCollab may refuse, suspend, or terminate accounts that provide misleading information, violate these Terms, or create risk for creators, brands, users, or the Platform.</li>
</ul>`,
    },
    {
      anchorId: 'marketplace-role',
      title: 'Marketplace Role of GoCollab',
      tocLabel: 'Marketplace Role',
      sortOrder: 3,
      content: `<p class="mb-4 leading-relaxed text-muted-foreground">GoCollab provides a marketplace and workflow layer to help Brands/Agencies discover creators, review creator profiles, issue project briefs, make payments, communicate, receive deliverables, and manage disputes. Unless expressly stated in writing, GoCollab is not the employer, agent, partner, representative, or manager of any Creator.</p>
<p class="mb-4 leading-relaxed text-muted-foreground">Creators are independent service providers. GoCollab does not guarantee specific creative performance, advertising results, sales, ROAS, engagement, virality, brand lift, or conversion outcomes from UGC.</p>`,
    },
    {
      anchorId: 'brand-briefs-orders-and-responsibilities',
      title: 'Brand Briefs, Orders, and Responsibilities',
      tocLabel: 'Briefs, Orders & Responsibilities',
      sortOrder: 4,
      content: `<p class="mb-4 leading-relaxed text-muted-foreground">Before placing an order, you are responsible for providing a clear and complete brief. A good brief should include:</p>
<ul class="mb-4 list-disc space-y-2 pl-6 text-muted-foreground leading-relaxed">
  <li>Product or service details and key claims</li>
  <li>Content format, length, aspect ratio, language, style, tone, and references</li>
  <li>Mandatory talking points, prohibited claims, and compliance guidelines</li>
  <li>Number of deliverables, revisions, raw files if required, deadlines, and submission format</li>
  <li>Usage rights required, including paid ads, organic social, whitelisting, website use, edits, and duration</li>
  <li>Product shipping, creator access, coupon codes, scripts, and any required brand assets</li>
</ul>
<p class="mb-4 leading-relaxed text-muted-foreground">You confirm that all information, products, claims, references, music, assets, instructions, and materials you provide are accurate, lawful, and do not infringe any third-party rights.</p>`,
    },
    {
      anchorId: 'creator-selection-and-verification',
      title: 'Creator Selection and Verification',
      tocLabel: 'Creator Selection',
      sortOrder: 5,
      content: `<p class="mb-4 leading-relaxed text-muted-foreground">Creator profiles may include portfolios, niches, pricing, sample content, ratings, location, language, delivery timelines, and other creator-supplied information. While GoCollab may use verification, moderation, or quality review processes, you are responsible for evaluating whether a creator is suitable for your brand, product, audience, and campaign requirements.</p>
<p class="mb-4 leading-relaxed text-muted-foreground">GoCollab may remove or restrict profiles that appear misleading, unsafe, inactive, or inconsistent with Platform standards, but we do not guarantee that every creator profile or sample is error-free, continuously updated, or suitable for every use case.</p>`,
    },
    {
      anchorId: 'payments-platform-fees-and-taxes',
      title: 'Payments, Platform Fees, and Taxes',
      tocLabel: 'Payments & Fees',
      sortOrder: 6,
      content: `<ul class="mb-4 list-disc space-y-2 pl-6 text-muted-foreground leading-relaxed">
  <li>You agree to pay all amounts shown at checkout or in the accepted order, including creator fees, Platform Fees, payment processing charges, taxes, shipping reimbursements, usage-rights upgrades, rush fees, and any other agreed charges.</li>
  <li>Unless stated otherwise, payment may be collected upfront and held or processed according to the Platform payment workflow. GoCollab may release payment to the Creator after the project is marked delivered, approved, auto-approved, or otherwise eligible for release under the applicable order terms.</li>
  <li>You are responsible for any applicable taxes, withholding obligations, invoices, and compliance requirements arising from your purchase or use of the Deliverables, except to the extent GoCollab is legally required to collect or remit a specific tax.</li>
</ul>`,
    },
    {
      anchorId: 'refunds-cancellations-and-disputes',
      title: 'Refunds, Cancellations, and Disputes',
      tocLabel: 'Refunds & Disputes',
      sortOrder: 7,
      content: `<p class="mb-4 leading-relaxed text-muted-foreground">Refunds and cancellations are handled under the applicable Refund and Cancellation Policy and the specific facts of the order. In general, a Brand/Agency may be eligible for support, revision, replacement, credit, partial refund, or full refund where a Creator fails to deliver the agreed content, materially misses the accepted brief, submits unusable files, or abandons the order.</p>
<p class="mb-4 leading-relaxed text-muted-foreground">Refunds are not guaranteed merely because the content does not achieve expected ad results, engagement, conversions, sales, or subjective preference if the Creator delivered according to the accepted brief.</p>
<p class="mb-4 leading-relaxed text-muted-foreground">If you request a dispute review, you must provide the order details, accepted brief, communication records, submitted files, reason for dispute, and requested resolution within the timeline shown on the Platform. GoCollab may review evidence and make a reasonable marketplace decision, including approval, revision request, refund, credit, or release of payment. Messold Technologies reserves the right to deny or cancel any refund request at its sole discretion if the submitted evidence is incomplete, insufficient, inconsistent with the accepted brief, or does not reasonably support the dispute claim.</p>`,
    },
    {
      anchorId: 'review-rounds-and-acceptance',
      title: 'Review Rounds and Acceptance',
      tocLabel: 'Review Rounds',
      sortOrder: 8,
      content: `<p class="mb-4 leading-relaxed text-muted-foreground">The number of included revisions will be stated in the order or creator offer. Revisions must relate to the accepted brief and should not introduce materially new requirements, new scripts, new products, new locations, new actors, new formats, or new usage rights unless the Creator agrees and additional fees are paid where applicable.</p>
<p class="mb-4 leading-relaxed text-muted-foreground">Deliverables may be treated as accepted if you approve them, download or use them, fail to request revisions within the stated review period, or otherwise indicate acceptance through the Platform.</p>`,
    },
    {
      anchorId: 'usage-rights-and-intellectual-property',
      title: 'Usage Rights and Intellectual Property',
      tocLabel: 'Usage Rights & IP',
      sortOrder: 9,
      content: `<p class="mb-4 leading-relaxed text-muted-foreground">Unless otherwise stated in the order, Creators retain ownership of their underlying creative work, likeness, raw footage, templates, methods, and pre-existing materials, and Brands/Agencies receive only the Usage Rights expressly purchased or agreed through the Platform.</p>
<p class="mb-4 leading-relaxed text-muted-foreground">You must not use Deliverables outside the agreed scope. Examples of additional rights that may require a separate license or fee include paid advertising, whitelisting/spark ads/creator account boosting, perpetual use, exclusivity, category lockout, TV/OTT, marketplace listings, app store ads, outdoor advertising, use after the license term, or major editing that changes the Creator context or endorsement.</p>
<p class="mb-4 leading-relaxed text-muted-foreground">You are responsible for ensuring that all claims in the final content are legally substantiated, compliant with advertising standards, and suitable for your product category.</p>`,
    },
    {
      anchorId: 'brand-content-product-claims-and-regulated-categories',
      title: 'Brand Content, Product Claims, and Regulated Categories',
      tocLabel: 'Brand Content & Claims',
      sortOrder: 10,
      content: `<p class="mb-4 leading-relaxed text-muted-foreground">You must not request content that is false, misleading, illegal, unsafe, deceptive, discriminatory, infringing, defamatory, sexually exploitative, hateful, or otherwise prohibited by Platform policies. You must not ask Creators to make claims that they cannot honestly make or that require professional, medical, financial, legal, or regulatory substantiation unless you provide lawful and accurate instructions.</p>
<p class="mb-4 leading-relaxed text-muted-foreground">Regulated or sensitive categories, including but not limited to healthcare, supplements, financial services, gambling, alcohol, tobacco/nicotine, adult products, political content, and products aimed at children, may require additional review or may be restricted or prohibited.</p>`,
    },
    {
      anchorId: 'communication-and-off-platform-dealings',
      title: 'Communication and Off-Platform Dealings',
      tocLabel: 'Communication',
      sortOrder: 11,
      content: `<p class="mb-4 leading-relaxed text-muted-foreground">To maintain payment protection, dispute support, order records, and user safety, project communication, approvals, revisions, and payment should take place through the Platform unless GoCollab expressly allows otherwise.</p>
<p class="mb-4 leading-relaxed text-muted-foreground">You must not use the Platform to discover a Creator and then intentionally avoid Platform fees by moving the same or substantially similar transaction off-platform, unless permitted by GoCollab in writing.</p>`,
    },
    {
      anchorId: 'confidentiality',
      title: 'Confidentiality',
      tocLabel: 'Confidentiality',
      sortOrder: 12,
      content: `<p class="mb-4 leading-relaxed text-muted-foreground">You may share confidential product, launch, pricing, campaign, or brand information with a Creator only when necessary for the project. You may request confidentiality obligations in the project brief or separate NDA. GoCollab is not responsible for confidential information you disclose outside the Platform or without appropriate protections.</p>`,
    },
    {
      anchorId: 'platform-use-restrictions',
      title: 'Platform Use Restrictions',
      tocLabel: 'Use Restrictions',
      sortOrder: 13,
      content: `<p class="mb-4 leading-relaxed text-muted-foreground">You must not:</p>
<ul class="mb-4 list-disc space-y-2 pl-6 text-muted-foreground leading-relaxed">
  <li>Interfere with Platform security, scraping controls, account systems, or payment systems.</li>
  <li>Misrepresent your identity, agency authority, product category, campaign purpose, or required usage rights.</li>
  <li>Harass, pressure, threaten, or discriminate against creators.</li>
  <li>Request fake testimonials, undisclosed paid endorsements, unlawful reviews, or misleading before/after claims.</li>
  <li>Upload malware, infringing assets, unlawful content, or personal data that you are not permitted to share.</li>
</ul>`,
    },
    {
      anchorId: 'suspension-and-termination',
      title: 'Suspension and Termination',
      tocLabel: 'Suspension & Termination',
      sortOrder: 14,
      content: `<p class="mb-4 leading-relaxed text-muted-foreground">GoCollab may suspend or terminate your account, cancel orders, restrict features, remove content, withhold or reverse payment releases where legally permitted, or take other reasonable action if you breach these Terms, create risk, engage in fraud, misuse creator content, or violate Platform policies.</p>`,
    },
    {
      anchorId: 'disclaimers',
      title: 'Disclaimers',
      tocLabel: 'Disclaimers',
      sortOrder: 15,
      content: `<p class="mb-4 leading-relaxed text-muted-foreground">The Platform is provided on an &quot;as is&quot; and &quot;as available&quot; basis. GoCollab does not warrant uninterrupted availability, error-free operation, specific creator performance, advertising results, sales, engagement, or that any Deliverable will meet subjective expectations beyond the accepted order scope.</p>`,
    },
    {
      anchorId: 'limitation-of-liability',
      title: 'Limitation of Liability',
      tocLabel: 'Limitation of Liability',
      sortOrder: 16,
      content: `<p class="mb-4 leading-relaxed text-muted-foreground">To the maximum extent permitted by law, GoCollab will not be liable for indirect, incidental, special, consequential, exemplary, or punitive damages, including lost profits, lost revenue, lost data, loss of goodwill, or advertising underperformance. GoCollab&apos;s total liability arising out of or related to an order will not exceed the amount of Platform Fees received by GoCollab for that specific order, unless applicable law requires otherwise.</p>`,
    },
    {
      anchorId: 'indemnity',
      title: 'Indemnity',
      tocLabel: 'Indemnity',
      sortOrder: 17,
      content: `<p class="mb-4 leading-relaxed text-muted-foreground">You agree to indemnify and hold harmless GoCollab, its affiliates, officers, employees, contractors, and partners from claims, losses, liabilities, damages, costs, and expenses arising from your products, claims, instructions, assets, misuse of Deliverables, breach of Usage Rights, breach of these Terms, violation of law, or infringement of third-party rights.</p>`,
    },
    {
      anchorId: 'privacy-and-data',
      title: 'Privacy and Data',
      tocLabel: 'Privacy & Data',
      sortOrder: 18,
      content: `<p class="mb-4 leading-relaxed text-muted-foreground">Your use of the Platform is subject to our Privacy Policy. You must process creator personal data only for the relevant project and in accordance with applicable privacy laws. You must not add creators to marketing lists, share their details with unrelated parties, or use their data for purposes outside the project without permission.</p>`,
    },
    {
      anchorId: 'governing-law-and-dispute-resolution',
      title: 'Governing Law and Dispute Resolution',
      tocLabel: 'Governing Law',
      sortOrder: 19,
      content: `<p class="mb-4 leading-relaxed text-muted-foreground">These Terms are governed by the laws of India, unless another governing law is required by mandatory consumer or platform law. Subject to applicable law, courts located in Delhi, India will have exclusive jurisdiction over disputes that cannot be resolved through Platform support or good-faith negotiation.</p>`,
    },
    {
      anchorId: 'changes-to-these-terms',
      title: 'Changes to These Terms',
      tocLabel: 'Changes to Terms',
      sortOrder: 20,
      content: `<p class="mb-4 leading-relaxed text-muted-foreground">GoCollab may update these Terms from time to time. Updated Terms will be posted on the Platform with a new effective date. Continued use of the Platform after changes become effective means you accept the updated Terms.</p>`,
    },
    {
      anchorId: 'contact',
      title: 'Contact',
      tocLabel: 'Contact',
      sortOrder: 21,
      content: `<p class="mb-4 leading-relaxed text-muted-foreground">For legal, policy, refund, or support questions, contact Messold Technologies.</p>
<div class="rounded-lg border border-border bg-muted/30 p-5 text-sm leading-relaxed text-muted-foreground">
  <p><span class="font-medium text-foreground">Company:</span> Messold Technologies</p>
  <p class="mt-1"><span class="font-medium text-foreground">Platform:</span> GoCollab</p>
  <p class="mt-1"><span class="font-medium text-foreground">Website:</span> <a href="https://www.messold.com" class="text-primary underline underline-offset-2 hover:text-primary/80" target="_blank" rel="noopener noreferrer">www.messold.com</a></p>
  <p class="mt-1"><span class="font-medium text-foreground">Email:</span> <a href="mailto:support@gocollab.io" class="text-primary underline underline-offset-2 hover:text-primary/80">support@gocollab.io</a></p>
</div>`,
    },
  ];

  for (let i = 0; i < termsSections.length; i++) {
    const s = termsSections[i];
    await db.legalSection.upsert({
      where: {
        pageId_anchorId: {
          pageId: termsPage.id,
          anchorId: s.anchorId,
        },
      },
      update: {
        title: s.title,
        tocLabel: s.tocLabel,
        content: s.content,
        sortOrder: s.sortOrder,
      },
      create: {
        pageId: termsPage.id,
        anchorId: s.anchorId,
        title: s.title,
        tocLabel: s.tocLabel,
        content: s.content,
        sortOrder: s.sortOrder,
      },
    });
  }

  console.log(
    `[seed] Legal page "terms-of-service" seeded with ${termsSections.length} sections`,
  );
}
