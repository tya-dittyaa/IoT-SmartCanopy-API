import { Controller } from '@nestjs/common';
import {
  Ctx,
  MessagePattern,
  MqttContext,
  Payload,
} from '@nestjs/microservices';
import { HeartbeatDto } from './dto/heartbeat.dto';
import { SensorTelemetryDto } from './dto/sensor-telemetry.dto';
import { MqttService } from './mqtt.service';

const ALLOWED_DEVICE_IDS = new Set(['raph_device']);

@Controller('mqtt')
export class MqttController {
  constructor(private readonly mqttService: MqttService) {}

  @MessagePattern('devices/+/heartbeat')
  async handleDeviceHeartbeat(
    @Payload() payload: HeartbeatDto,
    @Ctx() context: MqttContext,
  ) {
    const topic = context.getTopic();

    const match = topic.match(/^devices\/([^/]+)\/heartbeat$/);
    if (!match) return;

    const deviceId = match[1];
    if (!ALLOWED_DEVICE_IDS.has(deviceId)) return;

    console.info(`📡 Heartbeat — device=${deviceId}`, {
      timestamp: payload.timestamp,
      uptime: payload.uptime,
      rssi: payload.rssi,
      status: 'ONLINE',
    });

    // Save to database
    try {
      await this.mqttService.saveHeartbeat(deviceId, payload);
    } catch (error) {
      console.error(`Failed to save heartbeat for device ${deviceId}:`, error);
    }
  }

  @MessagePattern('devices/+/telemetry')
  async handleSensorTelemetry(
    @Payload() payload: SensorTelemetryDto,
    @Ctx() context: MqttContext,
  ) {
    const topic = context.getTopic();

    const match = topic.match(/^devices\/([^/]+)\/telemetry$/);
    if (!match) return;

    const deviceId = match[1];
    if (!ALLOWED_DEVICE_IDS.has(deviceId)) return;

    console.info(`🌡️ Telemetry — device=${deviceId}`, {
      humidity: payload.humidity,
      temperature: payload.temperature,
      rainStatus: payload.rainStatus,
      servoStatus: payload.servoStatus,
      mode: payload.mode,
    });

    // Save to database
    try {
      await this.mqttService.saveTelemetry(deviceId, payload);
    } catch (error) {
      console.error(`Failed to save telemetry for device ${deviceId}:`, error);
    }
  }
}
