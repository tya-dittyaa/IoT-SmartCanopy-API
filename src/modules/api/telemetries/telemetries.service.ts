import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/core/modules/prisma/prisma.service';
import { TelemetryPointDto } from './dto/telemetry-point.dto';

@Injectable()
export class TelemetriesService {
  constructor(private readonly prismaService: PrismaService) {}

  private readonly CAP = 200;

  private roundToTwo(value: number) {
    if (!Number.isFinite(value)) return value;
    return Math.round(value * 100) / 100;
  }

  private ensureMinutesBound(minutes: number) {
    if (!Number.isFinite(minutes) || minutes < 1) return 1;
    return Math.floor(minutes);
  }

  private async findDeviceIdByKey(deviceKey: string) {
    const device = await this.prismaService.device.findUnique({
      where: { deviceKey },
      select: { id: true },
    });
    return device?.id ?? null;
  }

  private samplePointsGeneric(
    rows: Array<{ createdAt: Date } & Record<string, any>>,
    valueFn: (r: any) => number,
  ): TelemetryPointDto[] {
    const cap = this.CAP;
    if (rows.length <= cap) {
      return rows
        .map((r) => {
          const raw = valueFn(r);
          const val = this.roundToTwo(raw);
          return new TelemetryPointDto(r.createdAt, val);
        })
        .filter(Boolean);
    }

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
        const v = valueFn(item);
        if (v === undefined || v === null) continue;
        sum += v;
        count++;
        timeSum += item.createdAt.getTime();
      }
      if (count === 0) continue;
      const avgValue = sum / count;
      const rounded = this.roundToTwo(avgValue);
      const avgTime = new Date(Math.floor(timeSum / count));
      sampled.push(new TelemetryPointDto(avgTime, rounded));
    }

    return sampled;
  }

  private async fetchAndSampleGeneric(
    deviceId: string,
    whereStart: Date,
    select: Record<string, boolean>,
    valueFn: (r: any) => number,
  ): Promise<TelemetryPointDto[]> {
    const rows = await this.prismaService.telemetry.findMany({
      where: { deviceId, createdAt: { gte: whereStart } },
      orderBy: { createdAt: 'asc' },
      select,
    });

    const normalized = rows as unknown as Array<
      { createdAt: Date } & Record<string, any>
    >;
    return this.samplePointsGeneric(normalized, valueFn);
  }

  async getTemperatureSeries(deviceKey: string, minutes: number) {
    if (!deviceKey) throw new BadRequestException('deviceKey is required');

    const bounded = this.ensureMinutesBound(minutes);
    const whereStart = new Date(Date.now() - bounded * 60 * 1000);
    const deviceId = await this.findDeviceIdByKey(deviceKey);
    if (!deviceId) return [];

    return this.fetchAndSampleGeneric(
      deviceId,
      whereStart,
      { createdAt: true, temperature: true },
      (r) => r.temperature ?? 0,
    );
  }

  async getHumiditySeries(deviceKey: string, minutes: number) {
    if (!deviceKey) throw new BadRequestException('deviceKey is required');

    const bounded = this.ensureMinutesBound(minutes);
    const whereStart = new Date(Date.now() - bounded * 60 * 1000);
    const deviceId = await this.findDeviceIdByKey(deviceKey);
    if (!deviceId) return [];

    return this.fetchAndSampleGeneric(
      deviceId,
      whereStart,
      { createdAt: true, humidity: true },
      (r) => r.humidity ?? 0,
    );
  }

  async getLightSeries(deviceKey: string, minutes: number) {
    if (!deviceKey) throw new BadRequestException('deviceKey is required');

    const bounded = this.ensureMinutesBound(minutes);
    const whereStart = new Date(Date.now() - bounded * 60 * 1000);
    const deviceId = await this.findDeviceIdByKey(deviceKey);
    if (!deviceId) return [];

    return this.fetchAndSampleGeneric(
      deviceId,
      whereStart,
      { createdAt: true, lightIntensity: true },
      (r) => r.lightIntensity ?? 0,
    );
  }

  async getRainSeries(deviceKey: string, minutes: number) {
    if (!deviceKey) throw new BadRequestException('deviceKey is required');

    const bounded = this.ensureMinutesBound(minutes);
    const whereStart = new Date(Date.now() - bounded * 60 * 1000);
    const deviceId = await this.findDeviceIdByKey(deviceKey);
    if (!deviceId) return [];

    return this.fetchAndSampleGeneric(
      deviceId,
      whereStart,
      { createdAt: true, rainStatus: true },
      (r) => (r.rainStatus === 'RAIN' ? 1 : 0),
    );
  }

  async getServoSeries(deviceKey: string, minutes: number) {
    if (!deviceKey) throw new BadRequestException('deviceKey is required');

    const bounded = this.ensureMinutesBound(minutes);
    const whereStart = new Date(Date.now() - bounded * 60 * 1000);
    const deviceId = await this.findDeviceIdByKey(deviceKey);
    if (!deviceId) return [];

    return this.fetchAndSampleGeneric(
      deviceId,
      whereStart,
      { createdAt: true, servoStatus: true },
      (r) => (r.servoStatus === 'OPEN' ? 1 : 0),
    );
  }

  async getAllSeries(
    deviceKey: string,
    minutes: number,
  ): Promise<{
    temperature: TelemetryPointDto[];
    humidity: TelemetryPointDto[];
    light: TelemetryPointDto[];
    rain: TelemetryPointDto[];
    servo: TelemetryPointDto[];
  }> {
    if (!deviceKey) throw new BadRequestException('deviceKey is required');

    const bounded = this.ensureMinutesBound(minutes);
    const whereStart = new Date(Date.now() - bounded * 60 * 1000);
    const deviceId = await this.findDeviceIdByKey(deviceKey);
    if (!deviceId)
      return {
        temperature: [],
        humidity: [],
        light: [],
        rain: [],
        servo: [],
      };

    const rows = await this.prismaService.telemetry.findMany({
      where: { deviceId, createdAt: { gte: whereStart } },
      orderBy: { createdAt: 'asc' },
      select: {
        createdAt: true,
        temperature: true,
        humidity: true,
        lightIntensity: true,
        rainStatus: true,
        servoStatus: true,
      },
    });

    const normalized = rows as unknown as Array<
      { createdAt: Date } & Record<string, any>
    >;

    const tempFn = (r: any) => r.temperature ?? 0;
    const humFn = (r: any) => r.humidity ?? 0;
    const lightFn = (r: any) => r.lightIntensity ?? 0;
    const rainFn = (r: any) => (r.rainStatus === 'RAIN' ? 1 : 0);
    const servoFn = (r: any) => (r.servoStatus === 'OPEN' ? 1 : 0);

    const temperature = this.samplePointsGeneric(normalized, tempFn);
    const humidity = this.samplePointsGeneric(normalized, humFn);
    const light = this.samplePointsGeneric(normalized, lightFn);
    const rain = this.samplePointsGeneric(normalized, rainFn);
    const servo = this.samplePointsGeneric(normalized, servoFn);

    return { temperature, humidity, light, rain, servo };
  }
}
