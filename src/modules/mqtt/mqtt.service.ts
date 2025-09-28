import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';

@Injectable()
export class MqttService {
  constructor(
    @Inject('MQTT_CLIENT') private readonly mqttClient: ClientProxy,
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
}
