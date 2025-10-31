import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class DiscordService {
  private readonly logger = new Logger(DiscordService.name);

  async sendWebhook(
    content: string | Record<string, any>,
    options?: { username?: string; avatarUrl?: string },
  ): Promise<any> {
    const url = process.env.DISCORD_WEBHOOK_URL;
    if (!url) {
      throw new Error('DISCORD_WEBHOOK_URL is not configured');
    }

    const payload: Record<string, any> =
      typeof content === 'string' ? { content } : { ...content };
    if (options?.username) payload.username = options.username;
    if (options?.avatarUrl) payload.avatar_url = options.avatarUrl;

    try {
      const res = await axios.post(url, payload);
      return res.data;
    } catch (err: any) {
      // Log response body if available for easier debugging
      this.logger.error(
        'Failed to send Discord webhook',
        err?.response?.data ?? err?.message ?? err,
      );
      throw err;
    }
  }
}
