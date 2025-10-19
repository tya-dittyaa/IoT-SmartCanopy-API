import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/core/modules/prisma/prisma.service';
import { TelemetryPointDto } from './dto/telemetry-point.dto';

@Injectable()
export class TelemetryService {
  constructor(private readonly prismaService: PrismaService) {}

  private readonly CAP = 200;
  private readonly THRESHOLD_FACTOR = 20;

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

  private async runAggregation(
    deviceId: string,
    whereStart: Date,
    valueKey: 'temperature' | 'humidity',
  ): Promise<TelemetryPointDto[] | null> {
    const cap = this.CAP;
    const field = valueKey === 'temperature' ? 'temperature' : 'humidity';

    const pipeline = [
      {
        $match: {
          deviceId: { $oid: deviceId },
          createdAt: { $gte: whereStart },
        },
      },
      { $sort: { createdAt: 1 } },
      {
        $bucketAuto: {
          groupBy: '$createdAt',
          buckets: cap,
          output: {
            avgValue: { $avg: `$${field}` },
            avgTime: { $avg: { $toLong: '$createdAt' } },
          },
        },
      },
    ];

    try {
      const res = (await this.prismaService.$runCommandRaw({
        aggregate: 'telemetries',
        pipeline,
        cursor: {},
      })) as any;

      const firstBatch = res?.cursor?.firstBatch ?? res;
      if (!Array.isArray(firstBatch)) return null;

      const points = firstBatch
        .map((b: any) => {
          const avgTime = b?.avgTime ?? null;
          const avgValue = b?.avgValue ?? null;
          if (avgTime == null || avgValue == null) return null;
          const timeNum =
            typeof avgTime === 'number' ? avgTime : Number(avgTime);
          return new TelemetryPointDto(new Date(timeNum), Number(avgValue));
        })
        .filter(Boolean) as TelemetryPointDto[];

      return points;
    } catch (error) {
      console.warn(
        'DB aggregation failed, falling back to app sampling',
        error,
      );
      return null;
    }
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

  private async fetchAndSample(
    deviceId: string,
    whereStart: Date,
    valueKey: 'temperature' | 'humidity',
  ): Promise<TelemetryPointDto[]> {
    const select =
      valueKey === 'temperature'
        ? { createdAt: true, temperature: true }
        : { createdAt: true, humidity: true };

    const rows = await this.prismaService.telemetry.findMany({
      where: { deviceId, createdAt: { gte: whereStart } },
      orderBy: { createdAt: 'asc' },
      select,
    });

    const normalized = rows as unknown as Array<{
      createdAt: Date;
      temperature?: number | null;
      humidity?: number | null;
    }>;

    return this.sampleTelemetryPoints(normalized, valueKey);
  }

  async getTemperatureSeries(deviceKey: string, minutes?: number) {
    if (!deviceKey) throw new BadRequestException('deviceKey is required');

    const bounded = this.ensureMinutesBound(minutes);
    const whereStart = new Date(Date.now() - bounded * 60 * 1000);
    const deviceId = await this.findDeviceIdByKey(deviceKey);
    if (!deviceId) {
      return [];
    }

    const cap = this.CAP;
    const threshold = cap * this.THRESHOLD_FACTOR;

    const total = await this.prismaService.telemetry.count({
      where: { deviceId, createdAt: { gte: whereStart } },
    });

    if (total > threshold) {
      const points = await this.runAggregation(
        deviceId,
        whereStart,
        'temperature',
      );
      if (points && points.length > 0) return points;
    }

    return this.fetchAndSample(deviceId, whereStart, 'temperature');
  }

  async getHumiditySeries(deviceKey: string, minutes?: number) {
    if (!deviceKey) throw new BadRequestException('deviceKey is required');

    const bounded = this.ensureMinutesBound(minutes);
    const whereStart = new Date(Date.now() - bounded * 60 * 1000);
    const deviceId = await this.findDeviceIdByKey(deviceKey);
    if (!deviceId) {
      return [];
    }

    const cap = this.CAP;
    const threshold = cap * this.THRESHOLD_FACTOR;

    const total = await this.prismaService.telemetry.count({
      where: { deviceId, createdAt: { gte: whereStart } },
    });

    if (total > threshold) {
      const points = await this.runAggregation(
        deviceId,
        whereStart,
        'humidity',
      );
      if (points && points.length > 0) return points;
    }

    return this.fetchAndSample(deviceId, whereStart, 'humidity');
  }
}
