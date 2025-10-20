import { ConfigService } from '@nestjs/config';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';

export function buildMqttOptions(config: ConfigService): MicroserviceOptions {
  const url = config.get<string>('mqtt.url') || 'mqtt://localhost:1883';
  const username = config.get<string>('mqtt.username') || undefined;
  const password = config.get<string>('mqtt.password') || undefined;
  const clientId = config.get<string>('mqtt.clientId') || 'default';

  return {
    transport: Transport.MQTT,
    options: {
      url,
      username,
      password,
      clientId,
    },
  };
}
