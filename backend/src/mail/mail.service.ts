import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import nodemailer, { type Transporter } from 'nodemailer';

type SendMailInput = {
  attachments?: Array<{
    content: Buffer;
    contentType?: string;
    filename: string;
  }>;
  html?: string;
  replyTo?: string;
  subject: string;
  text: string;
  to: string | string[];
};

@Injectable()
export class MailService {
  private readonly defaultFromName = 'Buy back control';
  private transporter?: Transporter;

  constructor(private readonly configService: ConfigService) {}

  async sendMail(input: SendMailInput) {
    const transporter = this.getTransporter();
    const from = this.getSender();

    try {
      return await transporter.sendMail({
        attachments: input.attachments,
        from,
        html: input.html,
        replyTo: input.replyTo,
        subject: input.subject,
        text: input.text,
        to: input.to,
      });
    } catch (error) {
      if (this.isAuthenticationError(error)) {
        throw new ServiceUnavailableException(
          'Email authentication failed. Check NODEMAILER_USER, NODEMAILER_PASS and SMTP AUTH settings.',
        );
      }

      throw error;
    }
  }

  private getTransporter() {
    if (this.transporter) {
      return this.transporter;
    }

    const user = this.configService.get<string>('NODEMAILER_USER');
    const pass = this.configService.get<string>('NODEMAILER_PASS');

    if (!user || !pass) {
      throw new ServiceUnavailableException('Email service is not configured');
    }

    const host = this.configService.get<string>('NODEMAILER_HOST');
    const port = Number(this.configService.get<string>('NODEMAILER_PORT') ?? 587);
    const secure = this.configService.get<string>('NODEMAILER_SECURE') === 'true';
    const service = this.configService.get<string>('NODEMAILER_SERVICE');

    this.transporter = nodemailer.createTransport(
      host
        ? {
            auth: { pass, user },
            host,
            port,
            secure,
          }
        : service
          ? {
              auth: { pass, user },
              service,
            }
          : {
              auth: { pass, user },
              host: 'smtp.office365.com',
              port: 587,
              secure: false,
            },
    );

    return this.transporter;
  }

  private getSender() {
    const configuredFrom = this.configService.get<string>('NODEMAILER_FROM')?.trim();
    if (configuredFrom) {
      return configuredFrom;
    }

    const address = this.configService.get<string>('NODEMAILER_USER')?.trim();
    const name = this.configService.get<string>('NODEMAILER_FROM_NAME')?.trim() || this.defaultFromName;

    if (!address) {
      throw new ServiceUnavailableException('Email sender is not configured');
    }

    return { address, name };
  }

  private isAuthenticationError(error: unknown) {
    return (
      typeof error === 'object' &&
      error !== null &&
      ('code' in error || 'responseCode' in error) &&
      ((error as { code?: string }).code === 'EAUTH' || (error as { responseCode?: number }).responseCode === 535)
    );
  }
}
