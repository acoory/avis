import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import {
  createCipheriv,
  createDecipheriv,
  createHash,
  createHmac,
  randomBytes,
} from 'node:crypto';
import type { Request, Response } from 'express';
import {
  Prisma,
  Role,
  VehicleCheckStatus,
} from '../../prisma/generated/client.cjs';
import type { CurrentUserPayload } from '../common/decorators/current-user.decorator';
import { MailService } from '../mail/mail.service';
import { PrismaService } from '../prisma/prisma.service';

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const CODE_LENGTH = 8;
const MAX_CODE_ATTEMPTS = 5;
const LOCK_DURATION_MS = 15 * 60 * 1000;
const EMAIL_COOLDOWN_MS = 60 * 1000;
const EMAIL_WINDOW_MS = 60 * 60 * 1000;
const MAX_EMAILS_PER_WINDOW = 5;

type AccessMode = 'APPLICATION' | 'PERSONAL_CODE';

type GrantedAccess = {
  mode: AccessMode;
  user: CurrentUserPayload;
};

@Injectable()
export class PublicAccessCodeService {
  private readonly encryptionKey: Buffer;
  private readonly fingerprintKey: Buffer;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly mailService: MailService,
  ) {
    const configuredSecret =
      configService.get<string>('PUBLIC_ACCESS_CODE_ENCRYPTION_KEY')?.trim() ||
      configService.getOrThrow<string>('JWT_ACCESS_SECRET');
    this.encryptionKey = createHash('sha256')
      .update(`encryption:${configuredSecret}`)
      .digest();
    this.fingerprintKey = createHash('sha256')
      .update(`fingerprint:${configuredSecret}`)
      .digest();
  }

  async inspect(token: string, request: Request) {
    const share = await this.findShare(token);
    const access = await this.resolveAccess(share, request);
    return this.accessResponse(share, access);
  }

  async requireAccess(token: string, request: Request) {
    const share = await this.findShare(token);
    const access = await this.resolveAccess(share, request);
    if (!access) {
      throw new UnauthorizedException('Personal access code required');
    }
    return { ...access, vehicleCheckId: share.vehicleCheckId };
  }

  async verify(
    token: string,
    code: string,
    request: Request,
    response: Response,
  ) {
    const share = await this.findShare(token);
    const manager = share.manager;
    const now = new Date();

    if (
      manager.publicAccessCodeLockedUntil &&
      manager.publicAccessCodeLockedUntil > now
    ) {
      throw new HttpException(
        'Trop de tentatives. Reessayez dans quelques minutes.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    if (!manager.publicAccessCodeHash || !manager.publicAccessCodeEncrypted) {
      throw new BadRequestException(
        "Le code personnel n'a pas encore ete envoye.",
      );
    }

    const valid = await bcrypt.compare(
      this.normalizeCode(code),
      manager.publicAccessCodeHash,
    );
    if (!valid) {
      const failedAttempt = await this.prisma.user.update({
        where: { id: manager.id },
        data: {
          publicAccessCodeFailedAttempts: { increment: 1 },
        },
        select: { publicAccessCodeFailedAttempts: true },
      });
      const shouldLock =
        failedAttempt.publicAccessCodeFailedAttempts >= MAX_CODE_ATTEMPTS;
      if (shouldLock) {
        await this.prisma.user.update({
          where: { id: manager.id },
          data: {
            publicAccessCodeFailedAttempts: 0,
            publicAccessCodeLockedUntil: new Date(
              now.getTime() + LOCK_DURATION_MS,
            ),
          },
        });
        throw new HttpException(
          'Trop de tentatives. Reessayez dans 15 minutes.',
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
      throw new UnauthorizedException('Code personnel incorrect');
    }

    await this.prisma.user.update({
      where: { id: manager.id },
      data: {
        publicAccessCodeFailedAttempts: 0,
        publicAccessCodeLockedUntil: null,
      },
    });
    const rawSessionToken = randomBytes(32).toString('base64url');
    const sessionDays = this.sessionDays();
    await this.prisma.publicAccessSession.create({
      data: {
        codeVersion: manager.publicAccessCodeVersion,
        expiresAt: new Date(now.getTime() + sessionDays * 24 * 60 * 60 * 1000),
        tokenHash: this.hashSessionToken(rawSessionToken),
        userAgentHash: this.userAgentHash(request),
        userId: manager.id,
      },
    });
    this.setSessionCookie(response, manager.id, rawSessionToken, sessionDays);

    return this.accessResponse(share, {
      mode: 'PERSONAL_CODE',
      user: this.currentUser(manager),
    });
  }

  async forget(token: string, request: Request, response: Response) {
    const share = await this.findShare(token);
    const cookieName = this.cookieName(share.managerId);
    const rawToken = this.readCookie(request, cookieName);
    if (rawToken) {
      await this.prisma.publicAccessSession.updateMany({
        where: {
          tokenHash: this.hashSessionToken(rawToken),
          userId: share.managerId,
          revokedAt: null,
        },
        data: { revokedAt: new Date() },
      });
    }
    response.clearCookie(cookieName, this.cookieOptions());
    return this.accessResponse(share, null);
  }

  async sendCode(token: string) {
    const share = await this.findShare(token);
    const code = await this.getOrCreatePersonalCode(share.managerId);
    await this.reserveEmailDelivery(share.managerId);
    const managerName =
      `${share.manager.firstName} ${share.manager.lastName}`.trim();
    const publicUrl = new URL(
      `/public/decision/${share.token}`,
      this.frontendUrl(),
    ).toString();
    await this.mailService.sendMail({
      subject: 'Votre code personnel pour les demandes avis',
      text: [
        `Bonjour ${managerName},`,
        '',
        'VOTRE CODE PERSONNEL PERMANENT',
        code,
        '',
        'Ce code reste identique pour toutes vos demandes avis. Ne le partagez pas.',
        '',
        `Ouvrir la demande : ${publicUrl}`,
      ].join('\n'),
      html: [
        '<div style="font-family:Arial,sans-serif;color:#111827;line-height:1.5;max-width:560px;margin:auto;padding:24px">',
        `<p>Bonjour ${this.escapeHtml(managerName)},</p>`,
        '<p>Voici votre code personnel permanent pour les demandes avis.</p>',
        '<div style="margin:18px 0;padding:16px;text-align:center;background:#f0fdfa;border:2px solid #0f766e;border-radius:10px">',
        '<p style="margin:0 0 6px;font-size:11px;font-weight:700;letter-spacing:.8px;text-transform:uppercase;color:#0f766e">Votre code personnel permanent</p>',
        `<p style="margin:0;font-family:Arial,sans-serif;font-size:26px;line-height:1.2;font-weight:800;letter-spacing:4px;color:#0f172a">${this.escapeHtml(code)}</p>`,
        '<p style="margin:8px 0 0;font-size:11px;color:#64748b">Ce code reste identique pour toutes vos demandes. Ne le partagez pas.</p>',
        '</div>',
        `<p><a href="${this.escapeHtml(publicUrl)}" style="color:#0f766e">Ouvrir la demande</a></p>`,
        '</div>',
      ].join(''),
      to: share.manager.email,
    });
    return { maskedEmail: this.maskEmail(share.manager.email), success: true };
  }

  async getOrCreatePersonalCode(
    userId: string,
    transaction?: Prisma.TransactionClient,
  ) {
    if (transaction) {
      return this.getOrCreatePersonalCodeInTransaction(transaction, userId);
    }
    for (let attempt = 0; attempt < 5; attempt += 1) {
      try {
        return await this.prisma.$transaction((tx) =>
          this.getOrCreatePersonalCodeInTransaction(tx, userId),
        );
      } catch (error) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === 'P2002'
        ) {
          continue;
        }
        throw error;
      }
    }
    throw new ServiceUnavailableException(
      'Unable to generate a unique access code',
    );
  }

  private async getOrCreatePersonalCodeInTransaction(
    tx: Prisma.TransactionClient,
    userId: string,
  ) {
    await tx.$queryRaw(
      Prisma.sql`SELECT "id" FROM "User" WHERE "id" = ${userId} FOR UPDATE`,
    );
    const user = await tx.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        publicAccessCodeEncrypted: true,
        publicAccessCodeHash: true,
      },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    if (user.publicAccessCodeEncrypted && user.publicAccessCodeHash) {
      return this.formatCode(this.decryptCode(user.publicAccessCodeEncrypted));
    }

    const rawCode = await this.generateUniqueCode(tx);
    await tx.user.update({
      where: { id: userId },
      data: {
        publicAccessCodeEncrypted: this.encryptCode(rawCode),
        publicAccessCodeFailedAttempts: 0,
        publicAccessCodeFingerprint: this.codeFingerprint(rawCode),
        publicAccessCodeHash: await bcrypt.hash(rawCode, 12),
        publicAccessCodeIssuedAt: new Date(),
        publicAccessCodeLockedUntil: null,
        publicAccessCodeVersion: { increment: 1 },
      },
    });
    return this.formatCode(rawCode);
  }

  private async findShare(token: string) {
    const share = await this.prisma.vehicleCheckDecisionShare.findUnique({
      where: { token },
      select: {
        isEnabled: true,
        managerId: true,
        token: true,
        vehicleCheckId: true,
        manager: {
          select: {
            email: true,
            firstName: true,
            id: true,
            isActive: true,
            lastName: true,
            publicAccessCodeEncrypted: true,
            publicAccessCodeHash: true,
            publicAccessCodeLockedUntil: true,
            publicAccessCodeVersion: true,
            role: true,
          },
        },
        vehicleCheck: {
          select: {
            collaboratorId: true,
            status: true,
            conversation: {
              select: {
                participants: { select: { userId: true } },
              },
            },
          },
        },
      },
    });
    if (
      !share?.isEnabled ||
      !share.manager.isActive ||
      share.vehicleCheck.status === VehicleCheckStatus.DRAFT
    ) {
      throw new NotFoundException('Public decision request not found');
    }
    const activeAssignment = await this.prisma.userManagerAssignment.findFirst({
      where: {
        collaboratorId: share.vehicleCheck.collaboratorId,
        isActive: true,
        managerId: share.managerId,
      },
      select: { id: true },
    });
    if (!activeAssignment) {
      throw new NotFoundException('Public decision request not found');
    }
    return share;
  }

  private async resolveAccess(
    share: Awaited<ReturnType<PublicAccessCodeService['findShare']>>,
    request: Request,
  ): Promise<GrantedAccess | null> {
    const applicationUser = await this.applicationUser(request);
    if (applicationUser) {
      const participantIds =
        share.vehicleCheck.conversation?.participants.map(
          (participant) => participant.userId,
        ) ?? [];
      if (
        applicationUser.role === Role.ADMIN ||
        applicationUser.sub === share.managerId ||
        applicationUser.sub === share.vehicleCheck.collaboratorId ||
        participantIds.includes(applicationUser.sub)
      ) {
        return { mode: 'APPLICATION', user: applicationUser };
      }
    }

    const rawSessionToken = this.readCookie(
      request,
      this.cookieName(share.managerId),
    );
    if (!rawSessionToken) {
      return null;
    }
    const now = new Date();
    const session = await this.prisma.publicAccessSession.findUnique({
      where: { tokenHash: this.hashSessionToken(rawSessionToken) },
      include: { user: true },
    });
    if (
      !session ||
      session.userId !== share.managerId ||
      session.revokedAt ||
      session.expiresAt <= now ||
      !session.user.isActive ||
      session.codeVersion !== session.user.publicAccessCodeVersion
    ) {
      return null;
    }
    if (now.getTime() - session.lastUsedAt.getTime() > 60 * 60 * 1000) {
      void this.prisma.publicAccessSession.update({
        where: { id: session.id },
        data: { lastUsedAt: now },
      });
    }
    return {
      mode: 'PERSONAL_CODE',
      user: this.currentUser(session.user),
    };
  }

  private async applicationUser(request: Request) {
    const authorization = request.headers.authorization;
    if (!authorization?.startsWith('Bearer ')) {
      return null;
    }
    try {
      const payload = await this.jwtService.verifyAsync<{ sub: string }>(
        authorization.slice(7),
        {
          secret: this.configService.getOrThrow<string>('JWT_ACCESS_SECRET'),
        },
      );
      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
        select: { email: true, id: true, isActive: true, role: true },
      });
      if (!user?.isActive) {
        throw new UnauthorizedException('User is inactive');
      }
      return this.currentUser(user);
    } catch {
      throw new UnauthorizedException('Invalid access token');
    }
  }

  private accessResponse(
    share: Awaited<ReturnType<PublicAccessCodeService['findShare']>>,
    access: GrantedAccess | null,
  ) {
    return {
      actorId: access?.user.sub ?? null,
      authenticated: Boolean(access),
      hasPersonalCode: Boolean(
        share.manager.publicAccessCodeEncrypted &&
        share.manager.publicAccessCodeHash,
      ),
      maskedEmail: this.maskEmail(share.manager.email),
      mode: access?.mode ?? null,
    };
  }

  private async reserveEmailDelivery(userId: string) {
    await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw(
        Prisma.sql`SELECT "id" FROM "User" WHERE "id" = ${userId} FOR UPDATE`,
      );
      const user = await tx.user.findUniqueOrThrow({
        where: { id: userId },
        select: {
          publicAccessCodeEmailCount: true,
          publicAccessCodeEmailWindowAt: true,
          publicAccessCodeLastEmailedAt: true,
        },
      });
      const now = new Date();
      if (
        user.publicAccessCodeLastEmailedAt &&
        now.getTime() - user.publicAccessCodeLastEmailedAt.getTime() <
          EMAIL_COOLDOWN_MS
      ) {
        throw new HttpException(
          'Un email vient deja etre envoye. Patientez une minute.',
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
      const inCurrentWindow = Boolean(
        user.publicAccessCodeEmailWindowAt &&
        now.getTime() - user.publicAccessCodeEmailWindowAt.getTime() <
          EMAIL_WINDOW_MS,
      );
      if (
        inCurrentWindow &&
        user.publicAccessCodeEmailCount >= MAX_EMAILS_PER_WINDOW
      ) {
        throw new HttpException(
          "Limite d'envoi atteinte. Reessayez plus tard.",
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
      await tx.user.update({
        where: { id: userId },
        data: {
          publicAccessCodeEmailCount: inCurrentWindow ? { increment: 1 } : 1,
          publicAccessCodeEmailWindowAt: inCurrentWindow
            ? user.publicAccessCodeEmailWindowAt
            : now,
          publicAccessCodeLastEmailedAt: now,
        },
      });
    });
  }

  private async generateUniqueCode(tx: Prisma.TransactionClient) {
    for (let attempt = 0; attempt < 20; attempt += 1) {
      const bytes = randomBytes(CODE_LENGTH);
      const code = Array.from(bytes, (byte) => CODE_ALPHABET[byte & 31]).join(
        '',
      );
      const exists = await tx.user.findFirst({
        where: { publicAccessCodeFingerprint: this.codeFingerprint(code) },
        select: { id: true },
      });
      if (!exists) return code;
    }
    throw new ServiceUnavailableException('Unable to generate access code');
  }

  private encryptCode(code: string) {
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', this.encryptionKey, iv);
    const encrypted = Buffer.concat([
      cipher.update(code, 'utf8'),
      cipher.final(),
    ]);
    const tag = cipher.getAuthTag();
    return [
      'v1',
      iv.toString('base64url'),
      tag.toString('base64url'),
      encrypted.toString('base64url'),
    ].join('.');
  }

  private decryptCode(value: string) {
    try {
      const [version, iv, tag, encrypted] = value.split('.');
      if (version !== 'v1' || !iv || !tag || !encrypted) throw new Error();
      const decipher = createDecipheriv(
        'aes-256-gcm',
        this.encryptionKey,
        Buffer.from(iv, 'base64url'),
      );
      decipher.setAuthTag(Buffer.from(tag, 'base64url'));
      return Buffer.concat([
        decipher.update(Buffer.from(encrypted, 'base64url')),
        decipher.final(),
      ]).toString('utf8');
    } catch {
      throw new ServiceUnavailableException(
        'Personal access-code encryption key is invalid',
      );
    }
  }

  private codeFingerprint(code: string) {
    return createHmac('sha256', this.fingerprintKey).update(code).digest('hex');
  }

  private normalizeCode(code: string) {
    return code.toUpperCase().replace(/[^A-HJ-NP-Z2-9]/g, '');
  }

  private formatCode(code: string) {
    const normalized = this.normalizeCode(code);
    return `${normalized.slice(0, 4)}-${normalized.slice(4)}`;
  }

  private hashSessionToken(token: string) {
    return createHash('sha256').update(token).digest('hex');
  }

  private userAgentHash(request: Request) {
    const userAgent = request.headers['user-agent'];
    return userAgent
      ? createHash('sha256').update(userAgent).digest('hex')
      : null;
  }

  private cookieName(userId: string) {
    return `avis_public_${createHash('sha256').update(userId).digest('hex').slice(0, 16)}`;
  }

  private readCookie(request: Request, name: string) {
    const cookie = request.headers.cookie
      ?.split(';')
      .map((entry) => entry.trim())
      .find((entry) => entry.startsWith(`${name}=`));
    return cookie ? decodeURIComponent(cookie.slice(name.length + 1)) : null;
  }

  private setSessionCookie(
    response: Response,
    userId: string,
    token: string,
    days: number,
  ) {
    response.cookie(this.cookieName(userId), token, {
      ...this.cookieOptions(),
      maxAge: days * 24 * 60 * 60 * 1000,
    });
  }

  private cookieOptions() {
    return {
      httpOnly: true,
      path: '/',
      sameSite: 'lax' as const,
      secure: this.configService.get<string>('NODE_ENV') === 'production',
    };
  }

  private sessionDays() {
    const configured = Number(
      this.configService.get<string>('PUBLIC_ACCESS_SESSION_DAYS') ?? 90,
    );
    return Number.isFinite(configured) && configured > 0
      ? Math.min(configured, 365)
      : 90;
  }

  private currentUser(user: { email: string; id: string; role: Role }) {
    return {
      email: user.email,
      role: user.role,
      sub: user.id,
    } satisfies CurrentUserPayload;
  }

  private maskEmail(email: string) {
    const [local, domain] = email.split('@');
    if (!domain) return '***';
    return `${local.slice(0, Math.min(2, local.length))}${'*'.repeat(Math.max(3, local.length - 2))}@${domain}`;
  }

  private frontendUrl() {
    return (
      this.configService.get<string>('FRONTEND_PUBLIC_URL') ??
      this.configService.get<string>('FRONTEND_URL') ??
      'http://localhost:3000'
    )
      .split(',')[0]
      .trim();
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
