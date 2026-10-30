import Handlebars from 'handlebars';
import { resolveMailTemplatesDir } from '../../mail/templates-dir';
import { readBundledTemplates } from './bundled-templates';
import { deriveText } from './derive-text';
import {
  PUSH_BODY_MAX,
  pushTitleFrom,
  stripGreeting,
  truncateForPush,
} from './push-copy';

/**
 * Every bundled template, as a browser notification.
 *
 * Push copy is derived rather than authored, so nobody writing an email
 * template is thinking about what it looks like on a lock screen. These run
 * against the rows the import actually stores — drips already split per stage,
 * which is why this reads `readBundledTemplates` rather than the files — and
 * fail on the two ways derived copy goes wrong silently: a notification with
 * no title, which renders as the bare site name, and a body that spends its
 * first line greeting someone who can see their own screen.
 */
describe('push copy, across the whole catalog', () => {
  const PLATFORM = 'Go Collab';
  const templates = readBundledTemplates(resolveMailTemplatesDir());

  /** Enough to satisfy any template's placeholders; values do not matter. */
  const context = {
    platformName: PLATFORM,
    recipientName: 'Ananya R',
    senderName: 'Acme Beauty',
    brandName: 'Acme Beauty',
    creatorName: 'Ananya R',
    agencyName: 'North Star',
    orderId: 'ord_8f21c4',
    packageName: 'Standard — 3 reels',
    unreadCount: 3,
    messagePreview: 'Could you reshoot the opening line?',
    actionUrl: 'https://app.gocollab.io/x',
    amount: '₹12,000',
    revisionNumber: 1,
  };

  function toPush(template: {
    subjectHbs: string;
    textHbs: string | null;
    htmlHbs: string;
  }) {
    const subject = Handlebars.compile(template.subjectHbs)(context);
    const text = template.textHbs
      ? Handlebars.compile(template.textHbs)(context)
      : deriveText(Handlebars.compile(template.htmlHbs)(context));
    return {
      title: pushTitleFrom(subject, PLATFORM),
      body: truncateForPush(stripGreeting(text)),
    };
  }

  it('covers every row the import writes', () => {
    expect(templates).toHaveLength(46);
  });

  it.each(templates.map((t) => [t.name, t] as const))(
    '%s renders a usable notification',
    (name, template) => {
      const { title, body } = toPush(template);

      // An empty title shows as the site name and nothing else, which tells
      // the recipient less than not sending would.
      expect(`${name} title:${title.trim().length > 0}`).toBe(
        `${name} title:true`,
      );
      expect(`${name} body:${body.trim().length > 0}`).toBe(
        `${name} body:true`,
      );
      // The email greeting must not survive into the notification.
      expect(`${name}:${/^(hi|hello|hey|dear)\b/i.test(body)}`).toBe(
        `${name}:false`,
      );
      // The trailing sign-off must not survive. Not "the platform name must
      // be absent": a few subjects name the product inside the sentence
      // ("Reset your Go Collab password"), where it belongs.
      const signOff = new RegExp(`\\s[—–-]\\s[^—–]*${PLATFORM}[^—–]*$`);
      expect(`${name}:${signOff.test(title)}`).toBe(`${name}:false`);
      expect(body.length).toBeLessThanOrEqual(PUSH_BODY_MAX + 1);
    },
  );
});
