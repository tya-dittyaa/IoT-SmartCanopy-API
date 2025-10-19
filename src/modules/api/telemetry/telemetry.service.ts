import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/core/modules/prisma/prisma.service';
import { TelemetryPointDto } from './dto/telemetry-point.dto';

@Injectable()
export class TelemetryService {
  constructor(private readonly prismaService: PrismaService) {}

  private ensureMinutesBound(minutes?: number) {
    if (minutes === undefined || minutes === null) return 30;
    if (minutes <= 0) return 30;
    return Math.floor(minutes);
  }

  private async findDeviceIdByKey(deviceKey: string) {
    const device = await this.prismaService.device.findUnique({
      where: { deviceKey },
      select: { id: true },
    });
    return device?.id ?? null;
  }

  private mapToTelemetryPoints(
    rows: Array<{
      createdAt: Date;
      temperature?: number | null;
      humidity?: number | null;
    }>,
    valueKey: 'temperature' | 'humidity',
  ) {
    return rows.map((r) => {
      const value = valueKey === 'temperature' ? r.temperature : r.humidity;
      return new TelemetryPointDto(r.createdAt, value ?? 0);
    });
  }

  async getTemperatureSeries(deviceKey: string, minutes?: number) {
    if (!deviceKey) throw new BadRequestException('deviceKey is required');

    const bounded = this.ensureMinutesBound(minutes);
    const whereStart = new Date(Date.now() - bounded * 60 * 1000);
    const deviceId = await this.findDeviceIdByKey(deviceKey);
    if (!deviceId) {
      return [];
    }

    const rows: Array<{ createdAt: Date; temperature: number }> =
      await this.prismaService.telemetry.findMany({
        where: {
          deviceId,
          createdAt: { gte: whereStart },
        },
        orderBy: { createdAt: 'asc' },
        select: { createdAt: true, temperature: true },
      });

    return this.sampleTelemetryPoints(rows, 'temperature');
  }

  async getHumiditySeries(deviceKey: string, minutes?: number) {
    if (!deviceKey) throw new BadRequestException('deviceKey is required');

    const bounded = this.ensureMinutesBound(minutes);
    const whereStart = new Date(Date.now() - bounded * 60 * 1000);
    const deviceId = await this.findDeviceIdByKey(deviceKey);
    if (!deviceId) {
      return [];
    }

    const rows: Array<{ createdAt: Date; humidity: number }> =
      await this.prismaService.telemetry.findMany({
        where: {
          deviceId,
          createdAt: { gte: whereStart },
        },
        orderBy: { createdAt: 'asc' },
        select: { createdAt: true, humidity: true },
      });

    return this.sampleTelemetryPoints(rows, 'humidity');
  }

  private sampleTelemetryPoints(
    rows: Array<{
      createdAt: Date;
      temperature?: number | null;
      humidity?: number | null;
    }>,
    valueKey: 'temperature' | 'humidity',
  ): TelemetryPointDto[] {
    const cap = 200;
    if (rows.length <= cap) return this.mapToTelemetryPoints(rows, valueKey);

    const bucketSize = rows.length / cap;
    const sampled: TelemetryPointDto[] = [];

    for (let i = 0; i < cap; i++) {
      const start = Math.floor(i * bucketSize);
      const end = Math.floor((i + 1) * bucketSize) || rows.length;
      const bucket = rows.slice(start, end);
      if (bucket.length === 0) continue;

      let sum = 0;
      let count = 0;
      let timeSum = 0;
      for (const item of bucket) {
        const v = valueKey === 'temperature' ? item.temperature : item.humidity;
        if (v === undefined || v === null) continue;
        sum += v;
        count++;
        timeSum += item.createdAt.getTime();
      }
      if (count === 0) continue;
      const avgValue = sum / count;
      const avgTime = new Date(Math.floor(timeSum / count));
      sampled.push(new TelemetryPointDto(avgTime, avgValue));
    }

    return sampled;
  }
}
