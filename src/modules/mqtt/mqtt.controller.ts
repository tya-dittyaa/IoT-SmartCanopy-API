import { Controller } from '@nestjs/common';
import {
  Ctx,
  MessagePattern,
  MqttContext,
  Payload,
} from '@nestjs/microservices';
import { SensorTelemetryDto } from './dto/sensor-telemetry.dto';
import { MqttService } from './mqtt.service';

@Controller()
export class MqttController {
  constructor(private readonly mqttService: MqttService) {}

  @MessagePattern('mqtt/devices/+/telemetry')
  async handleTelemetry(
    @Ctx() context: MqttContext,
    @Payload() data: SensorTelemetryDto,
  ) {
    const topic = context.getTopic();

    const match = topic.match(/^mqtt\/devices\/([^/]+)\/telemetry$/);
    if (!match) return { status: 'error', message: 'Invalid topic format' };

    const deviceKey = match[1];
    const deviceId = await this.mqttService.getDeviceIdByKey(deviceKey);

    if (!deviceId) return { status: 'error', message: 'Device not found' };

    await this.mqttService.saveTelemetry(deviceId, data);
    await this.mqttService.notifyTelemetryChange(deviceId);
  }
}
