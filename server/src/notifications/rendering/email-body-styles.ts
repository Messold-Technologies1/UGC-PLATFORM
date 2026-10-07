/**
 * The email palette and block styles, fixed in code.
 *
 * Email clients strip <style> blocks, so every rule has to be inline on the
 * element — which is why these live here as strings rather than in a stylesheet.
 * They are deliberately NOT editable from admin: the visual editor chooses a
 * block's ROLE (headline, body copy, callout) and this decides what that role
 * looks like, so no amount of editing can produce an email that is off-brand or
 * unreadable in Outlook. Every value is lifted from the hand-written templates
 * in src/mail/templates, so rendered output matches what already ships.
 */

export const EMAIL_PALETTE = {
  heading: '#111827',
  body: '#374151',
  muted: '#6b7280',
  ink: '#181313',
  accent: '#ff5da2',
  link: '#e11d48',
} as const;

/** Background tints a callout can carry. Named by intent, not by colour. */
export const CALLOUT_TONES = {
  neutral: '#fafafa',
  brand: '#fdf2f8',
  info: '#eff6ff',
  success: '#f0fdf4',
  warning: '#fffbeb',
  caution: '#fff7ed',
} as const;

export type CalloutTone = keyof typeof CALLOUT_TONES;

export const isCalloutTone = (v: unknown): v is CalloutTone =>
  typeof v === 'string' && v in CALLOUT_TONES;

const FONT =
  "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";

export const BLOCK_STYLES = {
  /** Greeting line above the headline. */
  lead: `margin:0 0 8px;font-size:15px;line-height:1.5;color:${EMAIL_PALETTE.muted};`,
  /** The one big line. */
  headline: `margin:0 0 16px;font-size:26px;font-weight:800;line-height:1.2;color:${EMAIL_PALETTE.heading};letter-spacing:-0.02em;`,
  /** A smaller section heading inside the body. */
  subheading: `margin:0 0 16px;font-size:22px;font-weight:800;line-height:1.25;color:${EMAIL_PALETTE.heading};letter-spacing:-0.02em;`,
  /** All-caps label, used above a detail block. */
  eyebrow: `margin:0 0 6px;font-size:13px;font-weight:700;color:${EMAIL_PALETTE.heading};text-transform:uppercase;letter-spacing:0.04em;`,
  /** Ordinary copy. */
  paragraph: `margin:0 0 16px;font-size:16px;line-height:1.6;color:${EMAIL_PALETTE.body};`,
  /** Quieter copy — sign-offs, asides. */
  note: `margin:0 0 12px;font-size:14px;line-height:1.5;color:${EMAIL_PALETTE.muted};`,
  list: `margin:0 0 16px;padding-left:20px;font-size:16px;line-height:1.6;color:${EMAIL_PALETTE.body};`,
  listItem: 'margin:0 0 6px;',
  link: `color:${EMAIL_PALETTE.link};text-decoration:underline;`,
  calloutText: `margin:0;font-size:14px;line-height:1.55;color:${EMAIL_PALETTE.body};`,
  calloutHeading: `margin:0 0 8px;font-size:14px;line-height:1.55;color:${EMAIL_PALETTE.heading};font-weight:700;`,
} as const;

export const calloutWrapperStyle = (tone: CalloutTone): string =>
  `margin:0 0 20px;padding:14px 16px;background:${CALLOUT_TONES[tone]};border:2px solid ${EMAIL_PALETTE.ink};border-radius:12px;`;

/**
 * The CTA, as a one-cell table. A styled <a> alone collapses to plain blue text
 * in Outlook, which is why the colour is repeated on both the cell and the link.
 */
export const buttonHtml = (url: string, label: string): string =>
  [
    '<div style="margin:0 0 24px;">',
    '<table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:0;">',
    '<tr>',
    `<td align="left" bgcolor="${EMAIL_PALETTE.accent}" style="border-radius:999px;background-color:${EMAIL_PALETTE.accent};border:2px solid ${EMAIL_PALETTE.ink};">`,
    `<a href="${url}" target="_blank" rel="noopener noreferrer" style="display:inline-block;padding:14px 28px;font-family:${FONT};font-size:15px;font-weight:700;line-height:1.25;color:#ffffff;text-decoration:none;border-radius:999px;background-color:${EMAIL_PALETTE.accent};border:2px solid ${EMAIL_PALETTE.ink};">`,
    label,
    '</a>',
    '</td>',
    '</tr>',
    '</table>',
    '</div>',
  ].join('');
