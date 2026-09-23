import { TemplateRendererService } from './template-renderer.service';
import { EmailTemplateKey } from './mail.types';

function makeConfig(overrides: Record<string, string> = {}) {
  const values: Record<string, string> = {
    FRONTEND_URL: 'https://app.gocollab.io',
    ...overrides,
  };
  return {
    get: jest.fn((key: string, defaultValue?: string) =>
      key in values ? values[key] : defaultValue,
    ),
  };
}

function build(overrides?: Record<string, string>): TemplateRendererService {
  const service = new TemplateRendererService(makeConfig(overrides) as never);
  service.onModuleInit();
  return service;
}

describe('TemplateRendererService', () => {
  let service: TemplateRendererService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = build();
  });

  it('renders the password-reset CTA with a clickable, absolute reset link', () => {
    const token = 'gzwE8_eP3-IUzJV9feae6VjpkTbvnpa7IZwEtcZhw7o';
    const actionUrl = `https://app.gocollab.io/reset-password?token=${token}`;

    const { html } = service.render(EmailTemplateKey.PASSWORD_RESET, {
      recipientName: 'Mohit',
      actionUrl,
      expiresInMinutes: 60,
    });

    const href = html.match(/<a href="([^"]*)"[^>]*>\s*Reset password/s)?.[1];

    // The button must carry the full absolute link, not an empty/relative href.
    expect(href).toBe(actionUrl);
    // Regression guard: the query separator `=` must stay literal. When it is
    // HTML-entity-encoded to `&#x3D;`, Gmail refuses to make the button
    // clickable — the symptom that made the reset link appear "not attached".
    expect(html).not.toContain('token&#x3D;');
    expect(href).toMatch(/^https:\/\//);
    expect(href).toContain(`token=${token}`);
  });

  it('renders the logo image when EMAIL_TEMPLATE_LOGO is set', () => {
    const svc = build({ EMAIL_TEMPLATE_LOGO: 'https://cdn.gocollab.io/logo.png' });

    const { html } = svc.render(EmailTemplateKey.PASSWORD_RESET, {
      recipientName: 'Mohit',
      actionUrl: 'https://app.gocollab.io/reset-password?token=abc',
      expiresInMinutes: 60,
    });

    expect(html).toContain('<img');
    expect(html).toContain('src="https://cdn.gocollab.io/logo.png"');
  });

  it('falls back to a text wordmark (no broken image) when the logo is unset', () => {
    const { html } = service.render(EmailTemplateKey.PASSWORD_RESET, {
      recipientName: 'Mohit',
      actionUrl: 'https://app.gocollab.io/reset-password?token=abc',
      expiresInMinutes: 60,
    });

    // No empty-src image that renders as a broken-image icon.
    expect(html).not.toContain('src=""');
    expect(html).not.toMatch(/<img[^>]*\bsrc="\s*"/);
    // Brand name still shown in the header.
    expect(html).toContain('Go Collab');
  });

  describe('creator-profile-completion-reminder', () => {
    const actionUrl = 'https://app.gocollab.io/creator/settings/profile';

    function renderStage(stage: 1 | 2 | 3 | 4) {
      return service.render(
        EmailTemplateKey.CREATOR_PROFILE_COMPLETION_REMINDER,
        {
          recipientName: 'Anuj',
          actionUrl,
          isStage1: stage === 1,
          isStage2: stage === 2,
          isStage3: stage === 3,
          isStage4: stage === 4,
        },
      );
    }

    // The drip is four emails (30min / 24h / day 3 / day 7); every stage must
    // produce its own subject + a working CTA. A stage the template forgot
    // renders an empty subject and a body with no button, which is exactly the
    // failure this guards.
    it.each([
      [1, 'Your Go Collab profile is almost ready 👀', 'Complete My Profile'],
      [2, "You started it. Don't leave it halfway 👀", 'Complete My Profile'],
      [
        3,
        'What if a brand is looking for someone like you?',
        'Get Listed on Go Collab',
      ],
      [4, 'Still want to be listed on Go Collab?', 'Complete My Profile'],
    ] as const)(
      'renders stage %i with its own subject and CTA',
      (stage, subjectLine, ctaLabel) => {
        const { subject, html, text } = renderStage(stage);

        expect(subject).toBe(subjectLine);
        expect(html).toContain(`href="${actionUrl}"`);
        expect(html).toContain(ctaLabel);
        expect(text).toContain(actionUrl);
        // No unresolved Handlebars left in either body.
        expect(html).not.toContain('{{');
        expect(text).not.toContain('{{');
      },
    );

    it('shows only the copy for the stage being sent', () => {
      const { html } = renderStage(1);

      expect(html).toContain('just a few minutes left to get it live');
      expect(html).not.toContain("You started it. Don't leave it halfway");
      expect(html).not.toContain('What if a brand is looking for someone');
      expect(html).not.toContain('Still want to be listed on');
    });
  });
});
