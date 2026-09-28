import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { NotificationChannel, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import {
  NOTIFICATION_EVENTS_BY_KEY,
  defaultWhatsAppTemplateName,
  getEventDefinition,
} from '../catalog/event-catalog';
import type { NotificationVarSpec } from '../catalog/define-events';
import { TemplateValidatorService } from '../rendering/template-validator.service';
import { NotificationTemplateRenderer } from '../rendering/notification-template-renderer.service';
import { NotificationQueueService } from '../queues/notification-queue.service';
import type {
  BackfillDto,
  ReplaceScheduleDto,
  SaveTemplateDto,
  UpdateEventDto,
} from './dto/notifications-admin.dto';

@Injectable()
export class NotificationsAdminService {
  private readonly logger = new Logger(NotificationsAdminService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly validator: TemplateValidatorService,
    private readonly renderer: NotificationTemplateRenderer,
    private readonly queues: NotificationQueueService,
  ) {}

  // ---------------------------------------------------------------- events

  async listEvents() {
    const rows = await this.prisma.notificationEvent.findMany({
      orderBy: { key: 'asc' },
      select: {
        key: true,
        label: true,
        description: true,
        recipient: true,
        isActive: true,
        deprecated: true,
        supportsDelay: true,
        alwaysSend: true,
        whatsappTemplateName: true,
        emailTemplate: { select: { id: true, name: true } },
        schedule: {
          orderBy: { offsetMinutes: 'asc' },
          select: { offsetMinutes: true, channels: true, isActive: true },
        },
      },
    });

    return rows.map((row) => ({
      ...row,
      whatsappTemplateName:
        row.whatsappTemplateName ?? defaultWhatsAppTemplateName(row.key),
      scheduleCount: row.schedule.length,
    }));
  }

  async getEvent(key: string) {
    const row = await this.prisma.notificationEvent.findUnique({
      where: { key },
      select: {
        key: true,
        label: true,
        description: true,
        recipient: true,
        vars: true,
        isActive: true,
        deprecated: true,
        supportsDelay: true,
        alwaysSend: true,
        emailTemplateId: true,
        whatsappTemplateName: true,
        emailTemplate: { select: { id: true, name: true } },
        schedule: {
          orderBy: { offsetMinutes: 'asc' },
          select: {
            id: true,
            offsetMinutes: true,
            channels: true,
            isActive: true,
            templateOverrideId: true,
            whatsappTemplateOverride: true,
            templateOverride: { select: { id: true, name: true } },
          },
        },
      },
    });
    if (!row) throw new NotFoundException(`Unknown event ${key}`);

    return {
      ...row,
      whatsappTemplateName:
        row.whatsappTemplateName ?? defaultWhatsAppTemplateName(row.key),
    };
  }

  async updateEvent(key: string, dto: UpdateEventDto) {
    await this.getEvent(key);

    if (dto.emailTemplateId) {
      const exists = await this.prisma.notificationTemplate.findUnique({
        where: { id: dto.emailTemplateId },
        select: { id: true },
      });
      if (!exists) throw new BadRequestException('Unknown template');
    }

    await this.prisma.notificationEvent.update({
      where: { key },
      data: {
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
        ...(dto.emailTemplateId !== undefined
          ? { emailTemplateId: dto.emailTemplateId }
          : {}),
        ...(dto.whatsappTemplateName !== undefined
          ? { whatsappTemplateName: dto.whatsappTemplateName }
          : {}),
      },
    });
    return this.getEvent(key);
  }

  /**
   * Replace the whole schedule in one transaction.
   *
   * Replace-all rather than per-row edits because the offset identifies a row:
   * retiming 24h to 48h one row at a time would collide with an existing 48h
   * row halfway through. Doing it as a set means there is no intermediate state.
   */
  async replaceSchedule(key: string, dto: ReplaceScheduleDto) {
    const event = await this.prisma.notificationEvent.findUnique({
      where: { key },
      select: { key: true, supportsDelay: true, label: true },
    });
    if (!event) throw new NotFoundException(`Unknown event ${key}`);

    const offsets = dto.rows.map((r) => r.offsetMinutes);
    if (new Set(offsets).size !== offsets.length) {
      throw new BadRequestException(
        'Two rows share an offset. Each send time appears once.',
      );
    }

    // The guard from the plan: a delayed row on an event with no relevance
    // check would fire unconditionally — "you haven't accepted the brief" to
    // someone who accepted an hour ago. Refused rather than warned about.
    if (!event.supportsDelay && offsets.some((o) => o > 0)) {
      throw new UnprocessableEntityException(
        `${key} can only send immediately. A delayed row needs a stillRelevant ` +
          `check in the event catalog, otherwise it would notify people who have ` +
          `already acted. Add one in code, then this row can be saved.`,
      );
    }

    for (const row of dto.rows) {
      if (row.templateOverrideId) {
        const exists = await this.prisma.notificationTemplate.findUnique({
          where: { id: row.templateOverrideId },
          select: { id: true },
        });
        if (!exists) {
          throw new BadRequestException(
            `Unknown template for the +${row.offsetMinutes}m row`,
          );
        }
      }
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.notificationSchedule.deleteMany({ where: { eventKey: key } });
      if (dto.rows.length === 0) return;
      await tx.notificationSchedule.createMany({
        data: dto.rows.map((row, i) => ({
          eventKey: key,
          offsetMinutes: row.offsetMinutes,
          channels: row.channels,
          templateOverrideId: row.templateOverrideId ?? null,
          whatsappTemplateOverride: row.whatsappTemplateOverride ?? null,
          isActive: row.isActive ?? true,
          sortOrder: i,
        })),
      });
    });

    return this.getEvent(key);
  }

  /**
   * Apply a newly added row to entities that already fired this event.
   *
   * New rows are not retro-applied by default — adding a +7d row today does
   * nothing for yesterday's orders — which reliably produces a "why did nothing
   * happen" question. The log already records every entity that fired the
   * event, so the backfill is a query over it rather than new bookkeeping.
   */
  async backfill(key: string, dto: BackfillDto) {
    const event = await this.prisma.notificationEvent.findUnique({
      where: { key },
      select: {
        schedule: {
          where: { offsetMinutes: dto.offsetMinutes, isActive: true },
          select: { offsetMinutes: true, channels: true },
        },
      },
    });
    if (!event) throw new NotFoundException(`Unknown event ${key}`);

    const row = event.schedule[0];
    if (!row) {
      throw new BadRequestException(
        `No active row at +${dto.offsetMinutes}m on ${key}`,
      );
    }

    const since = new Date(
      Date.now() - (dto.withinDays ?? 7) * 24 * 60 * 60_000,
    );
    // The immediate row is the record that the event happened for an entity.
    const fired = await this.prisma.notificationLog.findMany({
      where: { eventKey: key, offsetMinutes: 0, queuedAt: { gte: since } },
      distinct: ['entityId', 'occurrenceKey'],
      select: { entityId: true, occurrenceKey: true, queuedAt: true },
    });

    if (dto.dryRun) return { matched: fired.length, enqueued: 0 };

    for (const item of fired) {
      await this.queues.enqueueStep({
        eventKey: key,
        entityId: item.entityId,
        occurrenceKey: item.occurrenceKey,
        // Measured from when the event actually happened, so a 7-day row on a
        // 3-day-old order fires in 4 days, not 7.
        occurredAt: item.queuedAt.toISOString(),
        offsetMinutes: row.offsetMinutes,
        channels: row.channels,
      });
    }

    this.logger.log(
      `backfilled ${key} +${dto.offsetMinutes}m for ${fired.length} entit(ies)`,
    );
    return { matched: fired.length, enqueued: fired.length };
  }

  // ------------------------------------------------------------- templates

  async listTemplates() {
    return this.prisma.notificationTemplate.findMany({
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        description: true,
        isActive: true,
        version: true,
        updatedAt: true,
        updatedByUserId: true,
        _count: { select: { versions: true } },
      },
    });
  }

  async getTemplate(id: string) {
    const row = await this.prisma.notificationTemplate.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        description: true,
        subjectHbs: true,
        htmlHbs: true,
        textHbs: true,
        referencedVars: true,
        isActive: true,
        version: true,
        updatedAt: true,
        updatedByUserId: true,
      },
    });
    if (!row) throw new NotFoundException('Unknown template');
    return row;
  }

  /** The union of declared vars across every event that uses this template. */
  private async varsForTemplate(
    templateId: string | null,
    templateName: string,
  ): Promise<Record<string, NotificationVarSpec>> {
    const usingEvents = await this.prisma.notificationEvent.findMany({
      where: {
        OR: [
          ...(templateId
            ? [
                { emailTemplateId: templateId },
                { schedule: { some: { templateOverrideId: templateId } } },
              ]
            : []),
          { key: templateName },
        ],
      },
      select: { key: true },
    });

    // A template not yet attached to anything is validated against the event
    // it is named after, which is how the seeded ones line up.
    const keys = usingEvents.map((e) => e.key);
    const merged: Record<string, NotificationVarSpec> = {};
    for (const key of keys.length > 0 ? keys : [templateName]) {
      const def = getEventDefinition(key);
      if (!def) continue;
      Object.assign(merged, def.vars);
    }
    return merged;
  }

  async saveTemplate(
    dto: SaveTemplateDto,
    userId: string,
    id?: string,
  ): Promise<{ id: string; version: number }> {
    const existing = id ? await this.getTemplate(id) : null;

    if (!existing) {
      const clash = await this.prisma.notificationTemplate.findUnique({
        where: { name: dto.name },
        select: { id: true },
      });
      if (clash)
        throw new ConflictException(`A template named ${dto.name} exists`);
    }

    const vars = await this.varsForTemplate(id ?? null, dto.name);
    const result = this.validator.validate(dto, vars);
    if (!result.ok) {
      // A bad template fails silently at send time, so it never gets saved.
      throw new UnprocessableEntityException({
        message: 'Template did not validate',
        issues: result.issues,
      });
    }

    const data = {
      name: dto.name,
      description: dto.description ?? null,
      subjectHbs: dto.subjectHbs,
      htmlHbs: dto.htmlHbs,
      textHbs: dto.textHbs ?? null,
      referencedVars: result.referencedVars,
      updatedByUserId: userId,
    };

    if (!existing) {
      const created = await this.prisma.notificationTemplate.create({
        data,
        select: { id: true, version: true },
      });
      return created;
    }

    const saved = await this.prisma.$transaction(async (tx) => {
      // Snapshot what is being replaced, so a bad edit is one click from undo.
      await tx.notificationTemplateVersion.create({
        data: {
          templateId: existing.id,
          version: existing.version,
          subjectHbs: existing.subjectHbs,
          htmlHbs: existing.htmlHbs,
          textHbs: existing.textHbs,
          note: dto.note ?? null,
          createdByUserId: userId,
        },
      });
      return tx.notificationTemplate.update({
        where: { id: existing.id },
        // Bumping the version invalidates the renderer's compiled cache, so the
        // edit is live on the next send without a restart.
        data: { ...data, version: { increment: 1 } },
        select: { id: true, version: true },
      });
    });

    this.renderer.invalidate();
    return saved;
  }

  async listVersions(id: string) {
    await this.getTemplate(id);
    return this.prisma.notificationTemplateVersion.findMany({
      where: { templateId: id },
      orderBy: { version: 'desc' },
      select: {
        id: true,
        version: true,
        note: true,
        createdAt: true,
        createdByUserId: true,
      },
    });
  }

  async revert(id: string, version: number, userId: string) {
    const snapshot = await this.prisma.notificationTemplateVersion.findUnique({
      where: { templateId_version: { templateId: id, version } },
      select: { subjectHbs: true, htmlHbs: true, textHbs: true },
    });
    if (!snapshot) throw new NotFoundException(`No version ${version}`);

    const current = await this.getTemplate(id);
    // Reverting goes through save, so the restored content is validated too —
    // the event's variables may have changed since it was written.
    return this.saveTemplate(
      {
        name: current.name,
        description: current.description,
        subjectHbs: snapshot.subjectHbs,
        htmlHbs: snapshot.htmlHbs,
        textHbs: snapshot.textHbs,
        note: `Reverted to version ${version}`,
      },
      userId,
      id,
    );
  }

  /** Render with the event's declared examples, so nothing real is needed. */
  async preview(id: string, eventKey?: string) {
    const template = await this.getTemplate(id);
    const vars = await this.varsForTemplate(id, eventKey ?? template.name);

    const context: Record<string, string> = {};
    for (const [name, spec] of Object.entries(vars)) {
      context[name] = spec.example;
    }

    const rendered = await this.renderer.render({
      templateId: id,
      templateName: eventKey ?? template.name,
      context,
    });
    return { ...rendered, context };
  }

  // ------------------------------------------------------------------ logs

  async listLogs(query: {
    eventKey?: string;
    recipientUserId?: string;
    status?: string;
    channel?: NotificationChannel;
    take?: number;
    cursor?: string;
  }) {
    const where: Prisma.NotificationLogWhereInput = {
      ...(query.eventKey ? { eventKey: query.eventKey } : {}),
      ...(query.recipientUserId
        ? { recipientUserId: query.recipientUserId }
        : {}),
      ...(query.status
        ? { status: query.status as Prisma.NotificationLogWhereInput['status'] }
        : {}),
      ...(query.channel ? { channel: query.channel } : {}),
    };

    const take = Math.min(Math.max(query.take ?? 50, 1), 200);
    const rows = await this.prisma.notificationLog.findMany({
      where,
      orderBy: { queuedAt: 'desc' },
      take: take + 1,
      ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
      select: {
        id: true,
        eventKey: true,
        entityId: true,
        occurrenceKey: true,
        offsetMinutes: true,
        channel: true,
        status: true,
        toAddress: true,
        renderedSubject: true,
        providerMessageId: true,
        errorMessage: true,
        skippedReason: true,
        queuedAt: true,
        sentAt: true,
        deliveredAt: true,
      },
    });

    const hasMore = rows.length > take;
    return {
      items: hasMore ? rows.slice(0, take) : rows,
      nextCursor: hasMore ? rows[take - 1].id : null,
    };
  }

  /** Catalog keys, for the admin variable picker and template attach dropdown. */
  catalogKeys(): Array<{ key: string; label: string; vars: string[] }> {
    return Object.entries(NOTIFICATION_EVENTS_BY_KEY).map(([key, def]) => ({
      key,
      label: def.label,
      vars: Object.keys(def.vars).sort(),
    }));
  }
}
