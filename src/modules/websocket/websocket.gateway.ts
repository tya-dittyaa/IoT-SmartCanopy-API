import { Logger } from '@nestjs/common';
import {
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server } from 'socket.io';
import { PrismaService } from 'src/core/modules/prisma/prisma.service';
import { SensorTelemetryDto } from './dto/sensor-telemetry.dto';
import { ISensorTelemetry } from './interfaces/ISensorTelemetry';

@WebSocketGateway(27925, {
  cors: {
    origin: '*',
  },
})
export class WebsocketGateway {
  private readonly logger = new Logger(WebsocketGateway.name);

  @WebSocketServer()
  server: Server;

  constructor(private readonly prismaService: PrismaService) {}

  private async ensureDeviceExists(deviceKey: string): Promise<string | null> {
    const existing = await this.prismaService.device.findUnique({
      where: { deviceKey: deviceKey },
    });
    if (!existing) return null;
    return existing.id;
  }

  @SubscribeMessage('devices/telemetry')
  async handleTelemetry(@MessageBody() data: SensorTelemetryDto) {
    const deviceKey = data?.deviceKey;
    const sensorData: ISensorTelemetry | undefined = (data as any)?.sensorData;
    if (!deviceKey || !sensorData) return;

    this.logger.log(`🌡️ Telemetry — device=${deviceKey}`, sensorData);

    try {
      const deviceObjectId = await this.ensureDeviceExists(deviceKey);

      if (!deviceObjectId) {
        this.logger.warn(
          `Device key not found, ignoring telemetry: ${deviceKey}`,
        );
        return;
      }

      await this.prismaService.telemetry.create({
        data: {
          deviceId: deviceObjectId,
          humidity: sensorData.humidity,
          temperature: sensorData.temperature,
          rainStatus: sensorData.rainStatus,
          servoStatus: sensorData.servoStatus,
          mode: sensorData.mode,
        },
      });

      this.logger.log(
        `Telemetry saved for device: ${deviceKey} (id=${deviceObjectId})`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to save telemetry for device ${deviceKey}:`,
        error,
      );
      return;
    }
  }
}
