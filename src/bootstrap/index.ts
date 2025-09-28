import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { buildMqttOptions } from './mqtt.options';

const logger = new Logger('Bootstrap');

export async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);

  app.enableShutdownHooks();

  const config = app.get(ConfigService);
  const port = config.get<number>('app.port') ?? 3000;
  const nodeEnv = process.env.NODE_ENV ?? 'development';

  const mqttOptions = buildMqttOptions(config);
  app.connectMicroservice(mqttOptions);

  await Promise.all([app.listen(port), app.startAllMicroservices()]);

  logger.log(`Application running in ${nodeEnv} mode`);
  logger.log(`HTTP Server listening on port ${port}`);

  const opts = mqttOptions.options as Record<string, unknown> | undefined;
  const mqttUrl = opts?.url as string | undefined;
  if (mqttUrl) logger.log(`MQTT microservice connected to ${mqttUrl}`);
}
