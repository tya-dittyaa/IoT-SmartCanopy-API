import { BadRequestException, Controller, Get, Query } from '@nestjs/common';
import { TelemetryPointDto } from './dto/telemetry-point.dto';
import { TelemetryQueryDto } from './dto/telemetry-query.dto';
import { TelemetriesService } from './telemetries.service';

@Controller('telemetries')
export class TelemetriesController {
  constructor(private readonly telemetriesService: TelemetriesService) {}

  @Get('temperature')
  async getTemperature(
    @Query() query: TelemetryQueryDto,
  ): Promise<TelemetryPointDto[]> {
    const deviceKey = query.deviceKey;
    const rawMinutes = (query as unknown as Record<string, any>)['minutes'];
    const minutes =
      typeof rawMinutes === 'number' ? rawMinutes : Number(rawMinutes);
    if (!Number.isFinite(minutes)) {
      throw new BadRequestException('Minutes must be a number');
    }
    return this.telemetriesService.getTemperatureSeries(deviceKey, minutes);
  }

  @Get('humidity')
  async getHumidity(
    @Query() query: TelemetryQueryDto,
  ): Promise<TelemetryPointDto[]> {
    const deviceKey = query.deviceKey;
    const rawMinutes = (query as unknown as Record<string, any>)['minutes'];
    const minutes =
      typeof rawMinutes === 'number' ? rawMinutes : Number(rawMinutes);
    if (!Number.isFinite(minutes)) {
      throw new BadRequestException('Minutes must be a number');
    }
    return this.telemetriesService.getHumiditySeries(deviceKey, minutes);
  }
}
