import { EmailTemplateKey } from '../../mail/mail.types';
import {
  EVENTS_NOT_IN_CATALOG,
  NOTIFICATION_EVENTS_BY_KEY,
  NOTIFICATION_EVENT_KEYS,
  defaultWhatsAppTemplateName,
  getEventDefinition,
} from './event-catalog';
import { supportsDelay } from './define-events';

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

  it('only allows delayed rows for events that can say whether they are still relevant', () => {
    // supportsDelay is what the admin API checks before saving a row with an
    // offset. The two reminder drips are the events that need it.
    const delayable = NOTIFICATION_EVENT_KEYS.filter((k) =>
      supportsDelay(NOTIFICATION_EVENTS_BY_KEY[k]),
    ).sort();

    expect(delayable).toEqual([
      'creator-profile-completion-reminder',
      'creator-profile-resubmit-reminder',
      'order-brief-submitted-for-creator',
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
