import { ConfigService } from '@nestjs/config';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';

export function buildMqttOptions(config: ConfigService): MicroserviceOptions {
  const host = config.get<string>('mqtt.host') ?? 'localhost';
  const port = config.get<number>('mqtt.port') ?? 1883;
  const clientId = `nestjs_api_${Math.random().toString(16).slice(3)}`;

  return {
    transport: Transport.MQTT,
    options: {
      url: `mqtt://${host}:${port}`,
      clientId,
    },
  };
}
