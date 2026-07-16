import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import {
  NotificationEmailStatus,
  Prisma,
} from '../../prisma/generated/client.cjs';
import { MailService } from '../mail/mail.service';
import { PrismaService } from '../prisma/prisma.service';
import { PublicAccessCodeService } from '../public-access/public-access-code.service';

const POLL_INTERVAL_MS = 5_000;
const STALE_PROCESSING_MS = 10 * 60 * 1_000;
const MAX_ATTEMPTS = 5;
const MAX_EMAILS_PER_DRAIN = 25;

const queuedEmailInclude = {
  notification: {
    select: { recipientId: true, vehicleCheckId: true },
  },
} satisfies Prisma.NotificationEmailInclude;

type QueuedEmail = Prisma.NotificationEmailGetPayload<{
  include: typeof queuedEmailInclude;
}>;

@Injectable()
export class NotificationEmailWorkerService
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(NotificationEmailWorkerService.name);
  private drainScheduled = false;
  private isDraining = false;
  private pollTimer?: NodeJS.Timeout;

  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
    private readonly publicAccessCodeService: PublicAccessCodeService,
  ) {}

  onModuleInit() {
    this.pollTimer = setInterval(() => this.kick(), POLL_INTERVAL_MS);
    this.pollTimer.unref();
    this.kick();
  }

  onModuleDestroy() {
    if (this.pollTimer) clearInterval(this.pollTimer);
  }

  kick() {
    if (this.drainScheduled || this.isDraining) return;
    this.drainScheduled = true;
    setImmediate(() => {
      this.drainScheduled = false;
      void this.drain();
    });
  }

  private async drain() {
    if (this.isDraining) return;
    this.isDraining = true;
    try {
      for (let index = 0; index < MAX_EMAILS_PER_DRAIN; index += 1) {
        const email = await this.claimNext();
        if (!email) break;
        await this.deliver(email);
      }
    } catch (error) {
      this.logger.error(
        `Email outbox worker failed: ${this.errorMessage(error)}`,
      );
    } finally {
      this.isDraining = false;
    }
  }

  private async claimNext() {
    const now = new Date();
    const staleBefore = new Date(now.getTime() - STALE_PROCESSING_MS);
    return this.prisma.$transaction(async (tx) => {
      await tx.notificationEmail.updateMany({
        where: {
          processingStartedAt: { lt: staleBefore },
          status: NotificationEmailStatus.PROCESSING,
        },
        data: {
          lastError: 'Delivery interrupted before completion',
          nextAttemptAt: now,
          processingStartedAt: null,
          status: NotificationEmailStatus.FAILED,
        },
      });

      const candidate = await tx.notificationEmail.findFirst({
        where: {
          attempts: { lt: MAX_ATTEMPTS },
          OR: [
            { status: NotificationEmailStatus.PENDING },
            {
              status: NotificationEmailStatus.FAILED,
              nextAttemptAt: { lte: now },
            },
          ],
        },
        orderBy: { createdAt: 'asc' },
        select: { id: true, status: true },
      });
      if (!candidate) return null;

      const claimed = await tx.notificationEmail.updateMany({
        where: { id: candidate.id, status: candidate.status },
        data: {
          attempts: { increment: 1 },
          nextAttemptAt: null,
          processingStartedAt: now,
          status: NotificationEmailStatus.PROCESSING,
        },
      });
      if (!claimed.count) return null;

      return tx.notificationEmail.findUnique({
        where: { id: candidate.id },
        include: queuedEmailInclude,
      });
    });
  }

  private async deliver(email: QueuedEmail) {
    try {
      const personalAccessCode = email.notification.vehicleCheckId
        ? await this.personalCodeForNotification(
            email.notification.recipientId,
            email.notification.vehicleCheckId,
          )
        : null;
      const content = personalAccessCode
        ? this.appendPersonalCode(email, personalAccessCode)
        : email;
      await this.mailService.sendMail({
        html: content.html,
        subject: email.subject,
        text: content.text,
        to: email.recipientEmail,
      });
      await this.prisma.notificationEmail.updateMany({
        where: { id: email.id, status: NotificationEmailStatus.PROCESSING },
        data: {
          lastError: null,
          nextAttemptAt: null,
          processingStartedAt: null,
          sentAt: new Date(),
          status: NotificationEmailStatus.SENT,
        },
      });
    } catch (error) {
      await this.prisma.notificationEmail.updateMany({
        where: { id: email.id, status: NotificationEmailStatus.PROCESSING },
        data: {
          lastError: this.errorMessage(error).slice(0, 1000),
          nextAttemptAt: new Date(Date.now() + this.retryDelay(email.attempts)),
          processingStartedAt: null,
          status: NotificationEmailStatus.FAILED,
        },
      });
    }
  }

  private async personalCodeForNotification(
    recipientId: string,
    vehicleCheckId: string,
  ) {
    const publicShare = await this.prisma.vehicleCheckDecisionShare.findUnique({
      where: {
        vehicleCheckId_managerId: {
          managerId: recipientId,
          vehicleCheckId,
        },
      },
      select: { isEnabled: true },
    });
    return publicShare?.isEnabled
      ? this.publicAccessCodeService.getOrCreatePersonalCode(recipientId)
      : null;
  }

  private appendPersonalCode(
    email: { html: string; text: string },
    personalAccessCode: string,
  ) {
    const text = `${email.text}\n\nVOTRE CODE PERSONNEL PERMANENT\n${personalAccessCode}\nCe code reste identique pour toutes vos demandes.`;
    const codeBlock = [
      '<div style="margin:18px 0 0;padding:16px;text-align:center;background:#f0fdfa;border:2px solid #0f766e;border-radius:10px">',
      '<p style="margin:0 0 6px;font-size:11px;font-weight:700;letter-spacing:.8px;text-transform:uppercase;color:#0f766e">Votre code personnel permanent</p>',
      `<p style="margin:0;font-family:Arial,sans-serif;font-size:26px;line-height:1.2;font-weight:800;letter-spacing:4px;color:#0f172a">${this.escapeHtml(personalAccessCode)}</p>`,
      '<p style="margin:8px 0 0;font-size:11px;color:#64748b">Ce code reste identique pour toutes vos demandes.</p>',
      '</div>',
    ].join('');
    const closingIndex = email.html.lastIndexOf('</div>');
    const html =
      closingIndex >= 0
        ? `${email.html.slice(0, closingIndex)}${codeBlock}${email.html.slice(closingIndex)}`
        : `${email.html}${codeBlock}`;
    return { html, text };
  }

  private retryDelay(attempts: number) {
    return Math.min(15_000 * 2 ** Math.max(0, attempts - 1), 15 * 60_000);
  }

  private errorMessage(error: unknown) {
    return error instanceof Error ? error.message : String(error);
  }

  private escapeHtml(value: string) {
    return value
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }
}
