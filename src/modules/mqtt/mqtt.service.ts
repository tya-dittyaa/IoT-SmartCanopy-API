import { Inject, Injectable, Logger } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { PrismaService } from 'src/core/modules/prisma/prisma.service';
import { HeartbeatDto } from './dto/heartbeat.dto';
import { SensorTelemetryDto } from './dto/sensor-telemetry.dto';

@Injectable()
export class MqttService {
  private readonly logger = new Logger(MqttService.name);

  constructor(
    @Inject('MQTT_CLIENT') private readonly mqttClient: ClientProxy,
    private readonly prismaService: PrismaService,
  ) {}

  /**
   * Check if device ID is allowed
   */
  isDeviceAllowed(deviceId: string): boolean {
    const allowedDevices = new Set(['raph_device']);
    return allowedDevices.has(deviceId);
  }

  /**
   * Parse device ID from MQTT topic
   */
  parseDeviceIdFromTopic(topic: string): string | null {
    const match = topic.match(/^devices\/([^/]+)\//);
    return match ? match[1] : null;
  }

  /**
   * Send command to device
   */
  sendDeviceCommand(deviceId: string, commandType: string, payload: any): void {
    if (!this.isDeviceAllowed(deviceId)) {
      throw new Error(`Device ${deviceId} is not allowed`);
    }

    const topic = `devices/${deviceId}/command/${commandType}`;
    this.mqttClient.emit(topic, payload);
  }

  /**
   * Save heartbeat data to database
   */
  async saveHeartbeat(
    deviceId: string,
    heartbeatData: HeartbeatDto,
  ): Promise<void> {
    try {
      // Ensure device exists
      await this.ensureDeviceExists(deviceId);

      // Save heartbeat
      await this.prismaService.heartbeat.create({
        data: {
          deviceId: deviceId,
          timestamp: BigInt(heartbeatData.timestamp),
          uptime: heartbeatData.uptime,
          rssi: heartbeatData.rssi,
        },
      });

      this.logger.log(`Heartbeat saved for device: ${deviceId}`);
    } catch (error) {
      this.logger.error(
        `Failed to save heartbeat for device ${deviceId}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Save telemetry data to database
   */
  async saveTelemetry(
    deviceId: string,
    telemetryData: SensorTelemetryDto,
  ): Promise<void> {
    try {
      // Ensure device exists
      await this.ensureDeviceExists(deviceId);

      // Save telemetry
      await this.prismaService.telemetry.create({
        data: {
          deviceId: deviceId,
          humidity: telemetryData.humidity,
          temperature: telemetryData.temperature,
          rainStatus: telemetryData.rainStatus,
          servoStatus: telemetryData.servoStatus,
          mode: telemetryData.mode,
        },
      });

      this.logger.log(`Telemetry saved for device: ${deviceId}`);
    } catch (error) {
      this.logger.error(
        `Failed to save telemetry for device ${deviceId}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Ensure device exists in database
   * Throw error if not exists
   */
  private async ensureDeviceExists(deviceId: string): Promise<void> {
    try {
      const existingDevice = await this.prismaService.device.findUnique({
        where: { deviceKey: deviceId },
      });

      if (!existingDevice) {
        throw new Error(`Device ${deviceId} not registered`);
      }
    } catch (error) {
      this.logger.error(`Device check failed: ${deviceId}`, error);
      throw error;
    }
  }
}
