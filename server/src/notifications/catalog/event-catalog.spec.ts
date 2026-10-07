import { EmailTemplateKey } from '../../mail/mail.types';
import {
  EVENTS_NOT_IN_CATALOG,
  NOTIFICATION_EVENTS_BY_KEY,
  NOTIFICATION_EVENT_KEYS,
  defaultWhatsAppTemplateName,
  getEventDefinition,
} from './event-catalog';
import { ALWAYS_RELEVANT, supportsDelay } from './define-events';

describe('notification event catalog', () => {
  const legacyKeys = Object.values(EmailTemplateKey) as string[];

  it('covers every legacy EmailTemplateKey exactly once', () => {
    const covered = [
      ...NOTIFICATION_EVENT_KEYS,
      ...EVENTS_NOT_IN_CATALOG,
    ].sort();
    expect(covered).toEqual([...legacyKeys].sort());
  });

  it('defines no event that is not a legacy template key', () => {
    // A key with no template would render nothing, so the two sets must agree.
    expect(
      NOTIFICATION_EVENT_KEYS.filter((k) => !legacyKeys.includes(k)),
    ).toEqual([]);
  });

  it('declares recipientName and actionUrl on every event', () => {
    // Both are part of the universal contract: the mail shell greets by name,
    // and the WhatsApp bridge uses actionUrl as the button target.
    for (const [key, def] of Object.entries(NOTIFICATION_EVENTS_BY_KEY)) {
      expect(Object.keys(def.vars)).toContain('recipientName');
      expect(`${key}:${Object.keys(def.vars).includes('actionUrl')}`).toBe(
        `${key}:true`,
      );
    }
  });

  it('gives every declared var a type and a non-empty example', () => {
    // Examples are what template validation renders against before saving.
    for (const [key, def] of Object.entries(NOTIFICATION_EVENTS_BY_KEY)) {
      for (const [name, spec] of Object.entries(def.vars)) {
        expect({ key, name, type: spec.type }).toEqual({
          key,
          name,
          type: expect.any(String) as unknown as string,
        });
        expect(spec.example.length).toBeGreaterThan(0);
      }
    }
  });

  it('marks no event alwaysSend — only password-reset bypasses opt-in, and it is not in the catalog', () => {
    const bypassing = NOTIFICATION_EVENT_KEYS.filter(
      (k) => NOTIFICATION_EVENTS_BY_KEY[k].alwaysSend,
    );
    expect(bypassing).toEqual([]);
  });

  it('lets every event take a delayed row', () => {
    // supportsDelay is what the admin API checks before saving a row with an
    // offset, and it is simply "does this event declare stillRelevant". Every
    // event answers that question now — some with a real check, the rest with
    // ALWAYS_RELEVANT — so the admin can schedule any of them without a code
    // change, which is the whole point of the catalog owning the condition.
    const undelayable = NOTIFICATION_EVENT_KEYS.filter(
      (k) => !supportsDelay(NOTIFICATION_EVENTS_BY_KEY[k]),
    );

    expect(undelayable).toEqual([]);
  });

  it('names the events whose delayed send must stop once the person acts', () => {
    // The ones with a real condition, as opposed to ALWAYS_RELEVANT. Pinned by
    // name because the failure is silent either way: a nudge that keeps firing
    // tells someone to do what they already did, and a notice wrongly given a
    // condition just never arrives. A new event defaults to neither — it has to
    // be chosen — and this is what makes that choice visible in review.
    const conditional = NOTIFICATION_EVENT_KEYS.filter(
      (k) =>
        supportsDelay(NOTIFICATION_EVENTS_BY_KEY[k]) &&
        NOTIFICATION_EVENTS_BY_KEY[k].stillRelevant !== ALWAYS_RELEVANT,
    ).sort();

    expect(conditional).toEqual([
      'creator-profile-completion-reminder',
      'creator-profile-resubmit-reminder',
      'order-brief-accepted-for-brand',
      'order-brief-submitted-for-creator',
      'order-content-delivered-for-brand',
      'order-dispute-opened-for-brand',
      'order-dispute-opened-for-creator',
      'order-product-shipped-for-creator',
      'order-revision-requested-for-creator',
      'social-connection-expired',
    ]);
  });

  it('derives WhatsApp template names the way the existing bridge does', () => {
    expect(
      defaultWhatsAppTemplateName('order-brief-submitted-for-creator'),
    ).toBe('order_brief_submitted_for_creator');
    // Meta requires ^[a-z0-9_]+$ for template names.
    for (const key of NOTIFICATION_EVENT_KEYS) {
      expect(defaultWhatsAppTemplateName(key)).toMatch(/^[a-z0-9_]+$/);
    }
  });

  it('returns null for an unknown key rather than throwing', () => {
    expect(getEventDefinition('not-an-event')).toBeNull();
  });
});
