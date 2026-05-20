import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { OrderChatMessageType } from '@prisma/client';
import { OrderChatService } from './order-chat.service';

describe('OrderChatService', () => {
  const orderId = 'order-1';
  const brandUserId = 'brand-user';
  const creatorUserId = 'creator-user';
  const outsiderUserId = 'outsider';

  const prisma = {
    order: { findUnique: jest.fn() },
    orderChatMessage: {
      findMany: jest.fn(),
      create: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
    },
    orderChatReadState: { findMany: jest.fn(), upsert: jest.fn() },
  };

  const storage = {
    buildCdnUrl: jest.fn((key: string) => `https://cdn.example.com/${key}`),
    buildObjectKey: jest.fn(),
    createPresignedPutUpload: jest.fn(),
    isOrderChatVoiceKeyForUser: jest.fn(),
    mimeTypeFromObjectKey: jest.fn(),
  };

  const realtime = {
    emitChatMessage: jest.fn(),
    emitReadUpdated: jest.fn(),
  };

  const brandAccess = {
    resolveBrandActorUserIdForProfile: jest.fn(),
  };

  let service: OrderChatService;

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.order.findUnique.mockResolvedValue({
      brand: { id: 'brand-profile-1' },
      creator: { userId: creatorUserId },
    });
    brandAccess.resolveBrandActorUserIdForProfile.mockResolvedValue(brandUserId);
    service = new OrderChatService(
      prisma as any,
      storage as any,
      realtime as any,
      brandAccess as any,
    );
  });

  describe('presignVoiceUpload', () => {
    it('returns presigned upload for order participant', async () => {
      storage.buildObjectKey.mockReturnValue('order-chat-voice/order-1/brand-user/a.webm');
      storage.createPresignedPutUpload.mockResolvedValue({
        key: 'order-chat-voice/order-1/brand-user/a.webm',
        uploadUrl: 'https://signed',
        headers: { 'Content-Type': 'audio/webm' },
        expiresInSeconds: 900,
        cdnUrl: 'https://cdn.example.com/order-chat-voice/order-1/brand-user/a.webm',
      });

      const result = await service.presignVoiceUpload({
        orderId,
        senderUserId: brandUserId,
        contentType: 'audio/webm',
        contentLength: 1000,
      });

      expect(result.uploadUrl).toBe('https://signed');
      expect(storage.buildObjectKey).toHaveBeenCalledWith({
        kind: 'order_chat_voice_message',
        userId: brandUserId,
        orderId,
        contentType: 'audio/webm',
      });
    });

    it('rejects non-participants', async () => {
      await expect(
        service.presignVoiceUpload({
          orderId,
          senderUserId: outsiderUserId,
          contentType: 'audio/webm',
        }),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });
  });

  describe('sendVoiceMessage', () => {
    const voiceRow = {
      id: 'msg-voice',
      orderId,
      senderUserId: brandUserId,
      type: OrderChatMessageType.VOICE,
      text: null,
      audioKey: 'order-chat-voice/order-1/brand-user/a.webm',
      audioDurationMs: 5000,
      audioMimeType: 'audio/webm',
      clientMessageId: null,
      createdAt: new Date('2026-05-19T10:00:00.000Z'),
    };

    it('creates a voice message and emits realtime event', async () => {
      storage.isOrderChatVoiceKeyForUser.mockReturnValue(true);
      storage.mimeTypeFromObjectKey.mockReturnValue('audio/webm');
      prisma.orderChatMessage.create.mockResolvedValue(voiceRow);

      const result = await service.sendVoiceMessage({
        orderId,
        senderUserId: brandUserId,
        audioKey: voiceRow.audioKey,
        audioDurationMs: 5000,
      });

      expect(result.type).toBe(OrderChatMessageType.VOICE);
      expect(result.text).toBeNull();
      expect(result.audioUrl).toBe(`https://cdn.example.com/${voiceRow.audioKey}`);
      expect(result.audioDurationMs).toBe(5000);
      expect(realtime.emitChatMessage).toHaveBeenCalledWith({
        orderId,
        message: expect.objectContaining({
          type: OrderChatMessageType.VOICE,
          audioUrl: result.audioUrl,
        }),
      });
    });

    it('rejects invalid audioKey', async () => {
      storage.isOrderChatVoiceKeyForUser.mockReturnValue(false);

      await expect(
        service.sendVoiceMessage({
          orderId,
          senderUserId: brandUserId,
          audioKey: 'wrong-key',
          audioDurationMs: 1000,
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('sendMessage', () => {
    it('creates a text message with type TEXT', async () => {
      const textRow = {
        id: 'msg-text',
        orderId,
        senderUserId: brandUserId,
        type: OrderChatMessageType.TEXT,
        text: 'Hello',
        audioKey: null,
        audioDurationMs: null,
        audioMimeType: null,
        clientMessageId: null,
        createdAt: new Date('2026-05-19T10:00:00.000Z'),
      };
      prisma.orderChatMessage.create.mockResolvedValue(textRow);

      const result = await service.sendMessage({
        orderId,
        senderUserId: brandUserId,
        text: 'Hello',
      });

      expect(result.type).toBe(OrderChatMessageType.TEXT);
      expect(result.text).toBe('Hello');
      expect(result.audioUrl).toBeNull();
      expect(prisma.orderChatMessage.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            type: OrderChatMessageType.TEXT,
            text: 'Hello',
          }),
        }),
      );
    });
  });

  describe('listMessagesForAdmin', () => {
    it('returns formatted voice and text messages', async () => {
      prisma.orderChatMessage.findMany.mockResolvedValue([
        {
          id: 'v1',
          orderId,
          senderUserId: brandUserId,
          type: OrderChatMessageType.VOICE,
          text: null,
          audioKey: 'order-chat-voice/order-1/brand-user/a.webm',
          audioDurationMs: 3000,
          audioMimeType: 'audio/webm',
          clientMessageId: null,
          createdAt: new Date(),
        },
        {
          id: 't1',
          orderId,
          senderUserId: creatorUserId,
          type: OrderChatMessageType.TEXT,
          text: 'Hi',
          audioKey: null,
          audioDurationMs: null,
          audioMimeType: null,
          clientMessageId: null,
          createdAt: new Date(),
        },
      ]);

      const { items } = await service.listMessagesForAdmin({
        orderId,
        limit: 20,
      });

      expect(items).toHaveLength(2);
      expect(items[0].type).toBe(OrderChatMessageType.VOICE);
      expect(items[0].audioUrl).toContain('order-chat-voice');
      expect(items[1].type).toBe(OrderChatMessageType.TEXT);
      expect(items[1].text).toBe('Hi');
    });
  });
});
