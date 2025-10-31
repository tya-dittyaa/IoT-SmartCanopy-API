import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import nodemailer, { SendMailOptions, Transporter } from 'nodemailer';
import type SMTPTransport from 'nodemailer/lib/smtp-transport';

interface QueuedMailJob {
  options: SendMailOptions;
  resolve: (value: nodemailer.SentMessageInfo) => void;
  reject: (reason?: any) => void;
}

@Injectable()
export class NodemailerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(NodemailerService.name);
  private transporter: Transporter | null = null;

  private readonly RECIPIENT_THRESHOLD_MS = 60_000;
  private lastSent = new Map<string, number>();

  private readonly RATE_LIMIT_COUNT = 3;
  private readonly RATE_LIMIT_WINDOW_MS = 60_000;
  private mailQueue: QueuedMailJob[] = [];
  private sendTimestamps: number[] = [];
  private isProcessingQueue = false;

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

      void this.processQueue();
    } catch (error) {
      this.logger.error(
        'Failed to initialize nodemailer transporter',
        error as Error,
      );
      this.transporter = null;
    }
  }

  onModuleDestroy(): void {
    if (!this.transporter) return;

    this.mailQueue = [];
    this.isProcessingQueue = false;

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

  async sendMail(
    options: SendMailOptions,
  ): Promise<nodemailer.SentMessageInfo> {
    if (!this.transporter) {
      this.logger.error(
        'Mail transporter is not initialized. Email was not queued.',
      );
      throw new Error('Mail transporter is not initialized');
    }

    return new Promise((resolve, reject) => {
      this.mailQueue.push({ options, resolve, reject });
      void this.processQueue();
    });
  }

  private async processQueue(): Promise<void> {
    if (
      this.isProcessingQueue ||
      this.mailQueue.length === 0 ||
      !this.transporter
    ) {
      return;
    }

    this.isProcessingQueue = true;

    try {
      const now = Date.now();
      this.sendTimestamps = this.sendTimestamps.filter(
        (ts) => now - ts < this.RATE_LIMIT_WINDOW_MS,
      );

      if (this.sendTimestamps.length >= this.RATE_LIMIT_COUNT) {
        const oldestTimestamp = this.sendTimestamps[0];
        const timeToWait =
          this.RATE_LIMIT_WINDOW_MS - (now - oldestTimestamp) + 1;

        this.logger.log(
          `Global rate limit hit (${this.RATE_LIMIT_COUNT}/${this.RATE_LIMIT_WINDOW_MS}ms). Waiting ${timeToWait}ms...`,
        );

        await new Promise((res) => setTimeout(res, timeToWait));
        this.isProcessingQueue = false;
        void this.processQueue();
        return;
      }

      const job = this.mailQueue.shift();
      if (!job) {
        this.isProcessingQueue = false;
        return;
      }

      const { options, resolve, reject } = job;

      const defaultAddress =
        process.env.MAIL_FROM ??
        `no-reply@${process.env.SMTP_HOST ?? 'localhost'}`;
      const defaultName = process.env.MAIL_FROM_NAME;
      const from: SendMailOptions['from'] =
        options.from ??
        (defaultName
          ? { name: defaultName, address: defaultAddress }
          : defaultAddress);

      const toAddrs = this.extractAddresses(options.to);
      const ccAddrs = this.extractAddresses(options.cc);
      const bccAddrs = this.extractAddresses(options.bcc);

      const currentTimestamp = Date.now();
      const isAllowed = (addr: string) => {
        const last = this.lastSent.get(addr);
        if (!last) return true;
        return currentTimestamp - last >= this.RECIPIENT_THRESHOLD_MS;
      };

      const allowedTo = toAddrs.filter(isAllowed);
      const allowedCc = ccAddrs.filter(isAllowed);
      const allowedBcc = bccAddrs.filter(isAllowed);

      if (
        allowedTo.length === 0 &&
        allowedCc.length === 0 &&
        allowedBcc.length === 0
      ) {
        const all = [...toAddrs, ...ccAddrs, ...bccAddrs];
        const uniq = Array.from(new Set(all));
        const errorMsg = `Mail suppressed by per-recipient threshold (${
          this.RECIPIENT_THRESHOLD_MS
        }ms) for: ${uniq.join(', ')}`;

        this.logger.warn(errorMsg);
        reject(new Error(errorMsg));

        this.isProcessingQueue = false;
        void this.processQueue();
        return;
      }

      const filteredOptions: SendMailOptions = {
        ...options,
        from,
        to: allowedTo,
        cc: allowedCc.length > 0 ? allowedCc : undefined,
        bcc: allowedBcc.length > 0 ? allowedBcc : undefined,
      };

      try {
        const result = await this.transporter.sendMail(filteredOptions);
        const sentTo = [...allowedTo, ...allowedCc, ...allowedBcc];
        const sentTimestamp = Date.now();

        this.logger.log(`Email sent to ${sentTo.join(', ')}`);

        this.sendTimestamps.push(sentTimestamp);

        for (const r of sentTo) {
          this.lastSent.set(r, sentTimestamp);
        }

        resolve(result);
      } catch (sendError) {
        this.logger.error(
          'Failed to send email from queue',
          sendError as Error,
        );
        reject(sendError);
      }
    } catch (processingError) {
      this.logger.error(
        'Critical error in mail queue processor',
        processingError as Error,
      );
      const job = this.mailQueue.shift();
      job?.reject(processingError);
    } finally {
      this.isProcessingQueue = false;
      void this.processQueue();
    }
  }

  private extractAddresses(field: unknown): string[] {
    if (!field && field !== '') return [];

    const normalizeOne = (r: unknown): string | null => {
      if (typeof r === 'string') return r;
      if (r && typeof r === 'object') {
        const maybe = r as { address?: string; name?: string };
        if (typeof maybe.address === 'string') return maybe.address;
        try {
          return JSON.stringify(r);
        } catch {
          return null;
        }
      }
      return String(r);
    };

    if (Array.isArray(field)) {
      return (field as unknown[])
        .map(normalizeOne)
        .filter((x): x is string => !!x)
        .flatMap((s) => s.split(',').map((p) => p.trim()))
        .filter(Boolean);
    }

    const single = normalizeOne(field);
    if (!single) return [];
    return single
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  }
}
