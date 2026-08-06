import { TemplateRendererService } from './template-renderer.service';
import { EmailTemplateKey } from './mail.types';

describe('TemplateRendererService', () => {
  const configMock = {
    get: jest.fn((key: string, defaultValue?: string) => {
      if (key === 'FRONTEND_URL') return 'https://app.gocollab.io';
      return defaultValue;
    }),
  };

  let service: TemplateRendererService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new TemplateRendererService(configMock as never);
    service.onModuleInit();
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
});
