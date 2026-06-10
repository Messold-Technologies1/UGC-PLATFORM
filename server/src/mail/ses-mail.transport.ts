import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  SESv2Client,
  SendEmailCommand,
  type SendEmailCommandInput,
} from '@aws-sdk/client-sesv2';

export type SesSendParams = {
  to: string;
  subject: string;
  html: string;
  text: string;
};

@Injectable()
export class SesMailTransport {
  private readonly logger = new Logger(SesMailTransport.name);
  private readonly client: SESv2Client | null;

  constructor(private readonly config: ConfigService) {
    const accessKeyId = this.config.get<string>('AWS_SES_ACCESS_KEY_ID')?.trim();
    const secretAccessKey = this.config
      .get<string>('AWS_SES_SECRET_ACCESS_KEY')
      ?.trim();

    if (!accessKeyId || !secretAccessKey) {
      this.logger.warn(
        'AWS_SES_ACCESS_KEY_ID / AWS_SES_SECRET_ACCESS_KEY not set; outbound email disabled',
      );
      this.client = null;
      return;
    }

    this.client = new SESv2Client({
      region: this.config.get<string>('AWS_REGION'),
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });
  }

  async send(params: SesSendParams): Promise<void> {
    if (!this.client) {
      throw new Error(
        'AWS_SES_ACCESS_KEY_ID and AWS_SES_SECRET_ACCESS_KEY are required to send email',
      );
    }

    const from = this.config.get<string>('SES_FROM_EMAIL')?.trim();
    if (!from) {
      throw new Error('SES_FROM_EMAIL is not configured');
    }

    const input: SendEmailCommandInput = {
      FromEmailAddress: from,
      Destination: { ToAddresses: [params.to] },
      Content: {
        Simple: {
          Subject: { Data: params.subject, Charset: 'UTF-8' },
          Body: {
            Html: { Data: params.html, Charset: 'UTF-8' },
            Text: { Data: params.text, Charset: 'UTF-8' },
          },
        },
      },
    };

    await this.client.send(new SendEmailCommand(input));
    this.logger.log(`sent email to=${params.to} subject="${params.subject}"`);
  }
}
