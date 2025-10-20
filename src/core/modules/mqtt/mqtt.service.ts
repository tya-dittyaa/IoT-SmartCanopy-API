import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MqttClient, connect } from 'mqtt';

@Injectable()
export class MqttService {
  public readonly mqtt: MqttClient;
  private readonly logger = new Logger(MqttService.name);

  constructor(private readonly config: ConfigService) {
    const url = this.config.get<string>('mqtt.url') || 'mqtt://localhost:1883';
    const username = this.config.get<string>('mqtt.username') || undefined;
    const password = this.config.get<string>('mqtt.password') || undefined;
    const clientId = `smartcanopy-api-client-${Math.random().toString(16).slice(2, 10)}`;

    this.mqtt = connect(url, {
      clientId,
      username,
      password,
      clean: true,
      connectTimeout: 4000,
      reconnectPeriod: 1000,
    });

    this.mqtt.on('connect', () => {
      this.logger.log(`Connected to MQTT server (${url}) as ${clientId}`);
    });

    this.mqtt.on('reconnect', () => {
      this.logger.log('Reconnecting to MQTT server...');
    });

    this.mqtt.on('error', (err) => {
      this.logger.error('MQTT error', err);
    });
  }
}
