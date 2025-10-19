import { Module } from '@nestjs/common';
import { TelemetriesController } from './telemetries.controller';
import { TelemetriesService } from './telemetries.service';

@Module({
  controllers: [TelemetriesController],
  providers: [TelemetriesService],
})
export class TelemetriesModule {}
