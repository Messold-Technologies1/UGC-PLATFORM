import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationEventsService } from '../notifications/dispatch/notification-events.service';
import { RECONCILE_BACKSTOP_CRON } from '../util/reconcile-schedule';
import { OrdersService } from './orders.service';

/** Orders claimed per page while draining the due set. */
const AUTO_ACCEPT_BATCH = 25;
/**
 * Safety bound so one run cannot spin unbounded — on the first sweep after the
 * backfill, or if something keeps re-arming deadlines in the past.
 */
const AUTO_ACCEPT_MAX_PER_RUN = 500;

/**
 * How far ahead of the deadline the brand is warned.
 *
 * Two days leaves room to actually watch the content and write revision notes;
 * a warning that arrives the same morning is an announcement, not a chance.
 */
const REMINDER_LEAD_DAYS = 2;
/** Orders warned per run. Generous — a reminder is one enqueue, not a send. */
const REMINDER_MAX_PER_RUN = 500;

/**
 * Closes orders whose brand never reviewed the delivered content.
 *
 * The deadline lives on the row (`Order.autoAcceptAt`), computed when the order
 * becomes reviewable and cleared whenever the wait moves to somebody else, so
 * this sweep is a plain query over database truth rather than a schedule of its
 * own. That is deliberate: a per-order delayed job would have to survive five
 * days in Redis — the failure mode {@link RECONCILE_BACKSTOP_CRON} exists to
 * cover — and every revision, dispute and withdrawal would become a cancel-and-
 * reschedule, with Redis and Postgres free to disagree about whether an order
 * is still waiting. Here a revision request writes NULL and the order simply
 * stops matching.
 *
 * Shares the hourly backstop expression so it rides the same database wake as
 * the other sweeps; see that constant before giving it a schedule of its own.
 */
@Injectable()
export class OrderAutoAcceptService {
  private readonly logger = new Logger(OrderAutoAcceptService.name);
  private running = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly orders: OrdersService,
    private readonly events: NotificationEventsService,
  ) {}

  @Cron(RECONCILE_BACKSTOP_CRON)
  async run(): Promise<void> {
    // Warn first, accept second. Within one tick that ordering only matters at
    // the margin, but it is the one that cannot surprise anyone: an order can
    // never be accepted by a run that had not yet reached the warning step.
    await this.remindBeforeDeadline();
    await this.acceptOverdueOrders();
  }

  /**
   * Tell brands whose deadline is approaching, once per deadline.
   *
   * The window is every order inside the lead time, not just the ones that
   * crossed into it this hour, so a run missed to a deploy or an outage does
   * not silently cost a brand its warning. That means re-emitting hourly until
   * the deadline falls; `occurrenceKey` is what makes that safe — it is the
   * deadline being warned about, so the notification log's unique constraint
   * collapses the repeats into one send, and a clock restarted by a revision
   * gets a new key and therefore a fresh warning.
   */
  async remindBeforeDeadline(): Promise<void> {
    const until = new Date(Date.now() + REMINDER_LEAD_DAYS * 86_400_000);
    const soon = await this.prisma.order.findMany({
      where: {
        autoAcceptAt: { lte: until },
        acceptedAt: null,
        status: { in: ['DELIVERED', 'REVISION_SUBMITTED'] },
      },
      orderBy: { autoAcceptAt: 'asc' },
      take: REMINDER_MAX_PER_RUN,
      select: { id: true, autoAcceptAt: true },
    });

    for (const order of soon) {
      if (!order.autoAcceptAt) continue;
      await this.events.emit('order-auto-accept-reminder-for-brand', {
        entityId: order.id,
        occurrenceKey: order.autoAcceptAt.toISOString(),
      });
    }
  }

  async acceptOverdueOrders(): Promise<void> {
    // Cheap guard against this process overlapping itself on a slow run. It is
    // NOT the correctness mechanism: @Cron fires in the API and the worker
    // (both load AppModule) and in every API replica, so several sweeps run
    // concurrently by design. The conditional claim inside
    // `autoAcceptDueOrder` is what makes that safe.
    if (this.running) return;
    this.running = true;

    const startedAt = Date.now();
    let accepted = 0;
    let seen = 0;

    try {
      while (seen < AUTO_ACCEPT_MAX_PER_RUN) {
        // Re-read `now` each page: a long run must not accept an order whose
        // deadline passed while the run was in progress on the strength of a
        // timestamp taken at the top.
        const due = await this.prisma.order.findMany({
          where: {
            autoAcceptAt: { lte: new Date() },
            acceptedAt: null,
            status: { in: ['DELIVERED', 'REVISION_SUBMITTED'] },
          },
          // Oldest deadline first, so a backlog clears in the order it aged
          // rather than by whatever the planner returns.
          orderBy: { autoAcceptAt: 'asc' },
          take: AUTO_ACCEPT_BATCH,
          select: { id: true },
        });
        if (due.length === 0) break;

        const acceptedBeforePage = accepted;
        for (const order of due) {
          seen += 1;
          try {
            if (await this.orders.autoAcceptDueOrder(order.id)) accepted += 1;
          } catch (err) {
            // One bad order must not strand the rest of the backlog. It keeps
            // its deadline, so the next run tries it again.
            this.logger.error(
              `[auto-accept] order=${order.id} failed: ${
                err instanceof Error ? err.message : String(err)
              }`,
            );
          }
        }

        // Every claimed order clears its own `autoAcceptAt`, so the next query
        // returns the following page with no cursor to carry. The exception is
        // a row that threw: it keeps its deadline and would be handed back
        // forever, so a page that accepted nothing ends the run rather than
        // retrying the same failures until the per-run bound stops it.
        if (due.length < AUTO_ACCEPT_BATCH) break;
        if (accepted === acceptedBeforePage) {
          this.logger.warn(
            `[auto-accept] a full page of ${due.length} due order(s) accepted none; stopping this run`,
          );
          break;
        }
      }

      if (accepted > 0) {
        this.logger.log(
          `[auto-accept] accepted ${accepted} of ${seen} due order(s) in ${
            Date.now() - startedAt
          }ms`,
        );
      }
    } finally {
      this.running = false;
    }
  }
}
