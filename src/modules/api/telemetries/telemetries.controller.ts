import { BadRequestException, Controller, Get, Query } from '@nestjs/common';
import { TelemetryPointDto } from './dto/telemetry-point.dto';
import { TelemetryQueryDto } from './dto/telemetry-query.dto';
import { TelemetriesService } from './telemetries.service';

@Controller('telemetries')
export class TelemetriesController {
  constructor(private readonly telemetriesService: TelemetriesService) {}

  private parseMinutes(query: TelemetryQueryDto): number {
    const rawMinutes = (query as unknown as Record<string, any>)['minutes'];
    const minutes =
      typeof rawMinutes === 'number' ? rawMinutes : Number(rawMinutes);
    if (!Number.isFinite(minutes)) {
      throw new BadRequestException('Minutes must be a number');
    }
    return minutes;
  }

  @Get('temperature')
  async getTemperature(
    @Query() query: TelemetryQueryDto,
  ): Promise<TelemetryPointDto[]> {
    const deviceKey = query.deviceKey;
    const minutes = this.parseMinutes(query);
    return this.telemetriesService.getTemperatureSeries(deviceKey, minutes);
  }

  @Get('humidity')
  async getHumidity(
    @Query() query: TelemetryQueryDto,
  ): Promise<TelemetryPointDto[]> {
    const deviceKey = query.deviceKey;
    const minutes = this.parseMinutes(query);
    return this.telemetriesService.getHumiditySeries(deviceKey, minutes);
  }

  @Get('rain')
  async getRain(
    @Query() query: TelemetryQueryDto,
  ): Promise<TelemetryPointDto[]> {
    const deviceKey = query.deviceKey;
    const minutes = this.parseMinutes(query);
    return this.telemetriesService.getRainSeries(deviceKey, minutes);
  }

  @Get('servo')
  async getServo(
    @Query() query: TelemetryQueryDto,
  ): Promise<TelemetryPointDto[]> {
    const deviceKey = query.deviceKey;
    const minutes = this.parseMinutes(query);
    return this.telemetriesService.getServoSeries(deviceKey, minutes);
  }

  @Get('light')
  async getLight(
    @Query() query: TelemetryQueryDto,
  ): Promise<TelemetryPointDto[]> {
    const deviceKey = query.deviceKey;
    const minutes = this.parseMinutes(query);
    return this.telemetriesService.getLightSeries(deviceKey, minutes);
  }
}
