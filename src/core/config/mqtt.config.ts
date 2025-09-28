import { registerAs } from '@nestjs/config';

export default registerAs('mqtt', () => ({
  host: process.env.MQTT_HOST ?? 'localhost',
  port: parseInt(process.env.MQTT_PORT ?? '1883', 10),
  username: process.env.MQTT_USERNAME ?? 'guest',
  password: process.env.MQTT_PASSWORD ?? 'guest',
  clientId: `api-client-${Math.random().toString(16).slice(3)}`,
}));
