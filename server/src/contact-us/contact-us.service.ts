import { Injectable, InternalServerErrorException } from '@nestjs/common';

@Injectable()
export class ContactUsService {
  async sendToSlack(data: {
    name: string;
    email: string;
    role: string;
    subject: string;
    message: string;
  }) {
    const slackUrl = 'https://slack.com/api/chat.postMessage';
    const token = process.env.SLACK_BOT_TOKEN;
    const channelId = process.env.SLACK_SUPPORT_CHANNEL_ID;

    const messageBlock = [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: `New Contact Query: ${data.subject}`,
        },
      },
      {
        type: 'section',
        fields: [
          { type: 'mrkdwn', text: `*Name:*\n${data.name}` },
          { type: 'mrkdwn', text: `*Email:*\n${data.email}` },
        ],
      },
      {
        type: 'section',
        fields: [{ type: 'mrkdwn', text: `*Role:*\n${data.role}` }],
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Message:*\n> ${data.message.replace(/\n/g, '\n> ')}`,
        },
      },
      { type: 'divider' },
    ];

    try {
      const response = await fetch(slackUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          channel: channelId,
          blocks: messageBlock,
        }),
      });
      const result = await response.json();
      if (!result.ok) {
        throw new Error(`Slack API Error: ${result.error}`);
      }
      return { success: true, message: 'Message send to Slack successfully' };
    } catch (error) {
      console.error('Failed to send message to Slack:', error);
      throw new InternalServerErrorException(
        'Failed to process contact request',
      );
    }
  }
}
