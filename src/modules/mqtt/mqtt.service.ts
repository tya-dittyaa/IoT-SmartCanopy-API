import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/core/modules/prisma/prisma.service';
import { SensorTelemetryDto } from './dto/sensor-telemetry.dto';

@Injectable()
export class MqttService {
  private readonly logger = new Logger(MqttService.name);

  constructor(private readonly prismaService: PrismaService) {}

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
}
