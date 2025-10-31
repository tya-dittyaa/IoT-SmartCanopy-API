import { Injectable, Logger } from '@nestjs/common';
import { DiscordService } from 'src/core/modules/discord/discord.service';
import { NodemailerService } from 'src/core/modules/nodemailer/nodemailer.service';
import { PrismaService } from 'src/core/modules/prisma/prisma.service';
import { SensorTelemetryDto } from './dto/sensor-telemetry.dto';

type TelemetryRecord = SensorTelemetryDto & {
  id: string;
  createdAt: Date | string;
};

@Injectable()
export class MqttService {
  private readonly logger = new Logger(MqttService.name);

  constructor(
    private readonly prismaService: PrismaService,
    private readonly nodemailerService: NodemailerService,
    private readonly discordService: DiscordService,
  ) {}

  async getDeviceIdByKey(deviceKey: string): Promise<string | null> {
    const existing = await this.prismaService.device.findUnique({
      where: { deviceKey: deviceKey },
    });
    if (!existing) return null;
    return existing.id;
  }

  async saveTelemetry(
    deviceId: string,
    data: SensorTelemetryDto,
  ): Promise<void> {
    try {
      await this.prismaService.telemetry.create({
        data: {
          deviceId: deviceId,
          humidity: data.humidity,
          temperature: data.temperature,
          lightIntensity: data.lightIntensity,
          rainStatus: data.rainStatus,
          servoStatus: data.servoStatus,
          mode: data.mode,
        },
      });

      this.logger.log(`Telemetry saved for device: ${deviceId}`);
    } catch (error) {
      this.logger.error(
        `Failed to save telemetry for device ${deviceId}:`,
        error,
      );
      return;
    }
  }

  public async notifyTelemetryChange(deviceId: string): Promise<void> {
    try {
      const lastTwo: TelemetryRecord[] =
        await this.prismaService.telemetry.findMany({
          where: { deviceId },
          orderBy: { createdAt: 'desc' },
          take: 2,
        });

      // nothing to compare
      if (lastTwo.length < 2) return;

      const newest = lastTwo[0];
      const previous = lastTwo[1];

      // Only notify when newest mode is AUTO
      if (newest.mode !== 'AUTO') return;

      const rainChanged = previous.rainStatus !== newest.rainStatus;
      const servoChanged = previous.servoStatus !== newest.servoStatus;

      if (!rainChanged && !servoChanged) return;

      const rawRecipients = process.env.ALERT_EMAIL;
      if (!rawRecipients) {
        this.logger.warn(
          'Alert email recipient not configured (set ALERT_EMAIL) — skipping notification',
        );
        return;
      }

      const recipients = rawRecipients
        .split(';')
        .map((s) => s.trim())
        .filter(Boolean);

      if (recipients.length === 0) {
        this.logger.warn(
          'ALERT_EMAIL is empty after parsing — skipping notification',
        );
        return;
      }

      const device = await this.prismaService.device.findUnique({
        where: { id: deviceId },
      });

      const deviceLabel = device
        ? `${device.deviceName} (${device.deviceKey})`
        : deviceId;

      const { subject, html } = this.composeAlertEmail({
        deviceLabel,
        newest,
        previous,
        rainChanged,
        servoChanged,
      });

      try {
        await this.nodemailerService.sendMail({
          to: recipients,
          subject,
          html,
        });
        this.logger.log(
          `Alert email sent to ${recipients.join(', ')} for device ${deviceId}`,
        );
      } catch (err) {
        this.logger.error('Failed to send alert email', err as Error);
      }

      try {
        const discordPayload = this.composeAlertWebhook({
          deviceLabel,
          newest,
          previous,
          rainChanged,
          servoChanged,
        });
        await this.discordService.sendWebhook(discordPayload);
        this.logger.log(`Discord webhook sent for device ${deviceId}`);
      } catch (err) {
        this.logger.error('Failed to send Discord webhook', err as Error);
      }
    } catch (err) {
      this.logger.error(
        'Error comparing last two telemetry entries',
        err as Error,
      );
    }
  }

  private composeAlertEmail(params: {
    deviceLabel: string;
    newest: TelemetryRecord;
    previous: TelemetryRecord;
    rainChanged: boolean;
    servoChanged: boolean;
  }): { subject: string; html: string } {
    const { deviceLabel, newest, previous, rainChanged, servoChanged } = params;
    const subject = `Smart Canopy Alert — ${deviceLabel}`;

    const time =
      newest.createdAt instanceof Date
        ? newest.createdAt.toISOString()
        : String(newest.createdAt);

    const changes: string[] = [];
    if (rainChanged) {
      changes.push(`Rain: ${previous.rainStatus} → ${newest.rainStatus}`);
    }
    if (servoChanged) {
      changes.push(`Servo: ${previous.servoStatus} → ${newest.servoStatus}`);
    }

    const html = `
      <html>
        <body style="font-family: Arial, sans-serif; color: #222;">
          <h2 style="margin-bottom:0.2em;">Smart Canopy Alert</h2>
          <p style="margin-top:0.2em;"><strong>Device:</strong> ${deviceLabel}</p>
          <p style="margin-top:0.2em;"><strong>Time:</strong> ${time}</p>
          <h4 style="margin-bottom:0.2em;">Changes</h4>
          <ul>
            ${changes.map((c) => `<li>${c}</li>`).join('')}
          </ul>
          <h4 style="margin-bottom:0.2em;">Latest Telemetry</h4>
          <table cellpadding="6" cellspacing="0" style="border-collapse: collapse;">
            <tr><td style="border:1px solid #ddd;"><strong>Temperature</strong></td><td style="border:1px solid #ddd;">${newest.temperature}</td></tr>
            <tr><td style="border:1px solid #ddd;"><strong>Humidity</strong></td><td style="border:1px solid #ddd;">${newest.humidity}</td></tr>
            <tr><td style="border:1px solid #ddd;"><strong>Light Intensity</strong></td><td style="border:1px solid #ddd;">${newest.lightIntensity ?? '-'}</td></tr>
            <tr><td style="border:1px solid #ddd;"><strong>Mode</strong></td><td style="border:1px solid #ddd;">${newest.mode}</td></tr>
            <tr><td style="border:1px solid #ddd;"><strong>Rain Status</strong></td><td style="border:1px solid #ddd;">${newest.rainStatus}</td></tr>
            <tr><td style="border:1px solid #ddd;"><strong>Servo Status</strong></td><td style="border:1px solid #ddd;">${newest.servoStatus}</td></tr>
          </table>
          <p style="color:#666; font-size:0.9em;">This is an automated notification from Smart Canopy system.</p>
        </body>
      </html>
    `;

    return { subject, html };
  }

  private composeAlertWebhook(params: {
    deviceLabel: string;
    newest: TelemetryRecord;
    previous: TelemetryRecord;
    rainChanged: boolean;
    servoChanged: boolean;
  }): Record<string, any> {
    const { deviceLabel, newest, previous, rainChanged, servoChanged } = params;

    const time =
      newest.createdAt instanceof Date
        ? newest.createdAt.toISOString()
        : String(newest.createdAt ?? new Date().toISOString());

    const changes: string[] = [];
    if (rainChanged)
      changes.push(`Rain: ${previous.rainStatus} → ${newest.rainStatus}`);
    if (servoChanged)
      changes.push(`Servo: ${previous.servoStatus} → ${newest.servoStatus}`);

    const color = rainChanged || servoChanged ? 0xffaa00 : 0x2ecc71;

    const fields = [
      { name: 'Device', value: deviceLabel, inline: true },
      { name: 'Time', value: time, inline: true },
      { name: 'Mode', value: String(newest.mode ?? '-'), inline: true },
      {
        name: 'Temperature',
        value: String(newest.temperature ?? '-'),
        inline: true,
      },
      { name: 'Humidity', value: String(newest.humidity ?? '-'), inline: true },
      {
        name: 'Light Intensity',
        value: String(newest.lightIntensity ?? '-'),
        inline: true,
      },
      {
        name: 'Rain Status',
        value: String(newest.rainStatus ?? '-'),
        inline: true,
      },
      {
        name: 'Servo Status',
        value: String(newest.servoStatus ?? '-'),
        inline: true,
      },
    ];

    if (changes.length > 0) {
      fields.unshift({
        name: 'Changes',
        value: changes.join('\n'),
        inline: false,
      });
    }

    const embed = {
      title: 'Smart Canopy — Alert',
      color,
      fields,
      footer: { text: 'Automated notification from Smart Canopy' },
      timestamp: new Date(time).toISOString(),
    };

    return {
      username: 'Smart Canopy',
      embeds: [embed],
    };
  }
}
