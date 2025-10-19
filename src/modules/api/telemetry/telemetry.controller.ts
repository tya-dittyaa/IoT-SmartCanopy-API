import { Controller, Get, Query } from '@nestjs/common';
import { TelemetryPointDto } from './dto/telemetry-point.dto';
import { TelemetryQueryDto } from './dto/telemetry-query.dto';
import { TelemetryService } from './telemetry.service';

@Controller('telemetry')
export class TelemetryController {
  constructor(private readonly telemetryService: TelemetryService) {}

  @Get('temperature')
  async getTemperature(
    @Query() query: TelemetryQueryDto,
  ): Promise<TelemetryPointDto[]> {
    const deviceKey = query.deviceKey;
    const minutes = query.minutes ? parseInt(query.minutes, 10) : undefined;
    return this.telemetryService.getTemperatureSeries(deviceKey, minutes);
  }

  @Get('humidity')
  async getHumidity(
    @Query() query: TelemetryQueryDto,
  ): Promise<TelemetryPointDto[]> {
    const deviceKey = query.deviceKey;
    const minutes = query.minutes ? parseInt(query.minutes, 10) : undefined;
    return this.telemetryService.getHumiditySeries(deviceKey, minutes);
  }
}
