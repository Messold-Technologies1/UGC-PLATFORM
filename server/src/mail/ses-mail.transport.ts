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
  private readonly client: SESv2Client;

  constructor(private readonly config: ConfigService) {
    this.client = new SESv2Client({
      region: this.config.get<string>('AWS_REGION'),
      credentials: {
        accessKeyId: this.config.get<string>('AWS_ACCESS_KEY_ID')!,
        secretAccessKey: this.config.get<string>('AWS_SECRET_ACCESS_KEY')!,
      },
    });
  }

  async send(params: SesSendParams): Promise<void> {
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
