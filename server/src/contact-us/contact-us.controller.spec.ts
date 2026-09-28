import { Test, TestingModule } from '@nestjs/testing';
import { ContactUsController } from './contact-us.controller';
import { ContactUsService } from './contact-us.service';

describe('ContactUsController', () => {
  let controller: ContactUsController;
  let service: { sendToSlack: jest.Mock };

  const form = {
    name: 'Ananya R',
    email: 'ananya@example.com',
    role: 'CREATOR',
    subject: 'Payout question',
    message: 'When do payouts land?',
  };

  beforeEach(async () => {
    service = { sendToSlack: jest.fn().mockResolvedValue({ ok: true }) };

    // ContactUsService reaches out to Slack over HTTP, so the controller is
    // tested against a mock rather than the real provider.
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ContactUsController],
      providers: [{ provide: ContactUsService, useValue: service }],
    }).compile();

    controller = module.get<ContactUsController>(ContactUsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('forwards the submitted form to the service unchanged', async () => {
    await controller.submitContactUsForm(form);

    expect(service.sendToSlack).toHaveBeenCalledTimes(1);
    expect(service.sendToSlack).toHaveBeenCalledWith(form);
  });

  it('returns whatever the service returns', async () => {
    service.sendToSlack.mockResolvedValue({ ok: true, ts: '1727500000.0001' });

    await expect(controller.submitContactUsForm(form)).resolves.toEqual({
      ok: true,
      ts: '1727500000.0001',
    });
  });

  it('propagates a service failure instead of swallowing it', async () => {
    service.sendToSlack.mockRejectedValue(new Error('slack unreachable'));

    await expect(controller.submitContactUsForm(form)).rejects.toThrow(
      'slack unreachable',
    );
  });
});
