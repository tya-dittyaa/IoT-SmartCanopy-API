import { registerAs } from '@nestjs/config';

export default registerAs('mqtt', () => ({
  url: process.env.MQTT_URL || 'mqtt://localhost:1883',
  username: process.env.MQTT_USERNAME || '',
  password: process.env.MQTT_PASSWORD || '',
  clientId: `smartcanopy-api-client-${Math.random().toString(16).slice(3)}`,
}));
