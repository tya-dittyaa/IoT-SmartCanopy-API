import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import nodemailer, { SendMailOptions, Transporter } from 'nodemailer';
import type SMTPTransport from 'nodemailer/lib/smtp-transport';

@Injectable()
export class NodemailerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(NodemailerService.name);
  private transporter: Transporter | null = null;

  /**
   * Initialize transporter from environment variables.
   * Required: SMTP_HOST
   * Optional: SMTP_PORT, SMTP_SECURE, SMTP_USER, SMTP_PASS
   */
  async onModuleInit(): Promise<void> {
    const host = process.env.SMTP_HOST;
    const port = process.env.SMTP_PORT
      ? Number(process.env.SMTP_PORT)
      : undefined;
    const secure = process.env.SMTP_SECURE === 'true';
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;

    if (!host) {
      this.logger.warn('SMTP_HOST not set — Nodemailer disabled');
      return;
    }

    try {
      // Typed transport options to avoid passing `any` to createTransport
      const transportOptions: SMTPTransport.Options & {
        auth?: { user?: string; pass?: string };
      } = {
        host,
        port,
        secure,
      };

      if (user || pass) {
        transportOptions.auth = { user, pass };
      }

      this.transporter = nodemailer.createTransport(transportOptions);
      await this.transporter.verify();
      this.logger.log('Nodemailer transporter ready');
    } catch (error) {
      this.logger.error(
        'Failed to initialize nodemailer transporter',
        error as Error,
      );
      this.transporter = null;
    }
  }

  /**
   * Close transporter if supported. The `close` method is not defined in
   * the TypeScript typings for all transports, so access it via a safe cast.
   */
  onModuleDestroy(): void {
    if (!this.transporter) return;

    const transportWithClose = this.transporter as Transporter & {
      close?: () => void;
    };
    if (typeof transportWithClose.close === 'function') {
      try {
        transportWithClose.close();
        this.logger.log('Nodemailer transporter closed');
      } catch (error) {
        this.logger.error(
          'Error closing nodemailer transporter',
          error as Error,
        );
      }
    }
  }

  /**
   * Send an email. Caller may provide `options.from`. If omitted the
   * service will build one from MAIL_FROM and MAIL_FROM_NAME environment vars.
   */
  async sendMail(
    options: SendMailOptions,
  ): Promise<nodemailer.SentMessageInfo> {
    if (!this.transporter) {
      throw new Error('Mail transporter is not initialized');
    }

    // Build typed default "from" value
    const defaultAddress =
      process.env.MAIL_FROM ??
      `no-reply@${process.env.SMTP_HOST ?? 'localhost'}`;
    const defaultName = process.env.MAIL_FROM_NAME;

    const from: SendMailOptions['from'] =
      options.from ??
      (defaultName
        ? { name: defaultName, address: defaultAddress }
        : defaultAddress);

    try {
      const result = await this.transporter.sendMail({ ...options, from });

      // Create a safe, human-readable recipient list for logs.
      const toField = options.to;
      const stringifyRecipient = (r: unknown): string => {
        if (typeof r === 'string') return r;
        if (r && typeof r === 'object') {
          // try common address shapes
          const maybe = r as { address?: string; name?: string };
          if (typeof maybe.address === 'string') return maybe.address;
          try {
            return JSON.stringify(r);
          } catch {
            return '[object]';
          }
        }
        return String(r);
      };

      let toString: string;
      if (Array.isArray(toField)) {
        toString = toField.map(stringifyRecipient).join(', ');
      } else {
        toString = stringifyRecipient(toField as unknown);
      }

      this.logger.log(`Email sent to ${toString}`);
      return result;
    } catch (error) {
      this.logger.error('Failed to send email', error as Error);
      throw error;
    }
  }
}
