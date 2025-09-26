import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  const logger = new Logger('Bootstrap');

  const port = configService.get<number>('app.port')!;
  const nodeEnv = process.env.NODE_ENV || 'development';

  await app.listen(port);

  logger.log(`Application running in ${nodeEnv} mode`);
  logger.log(`Server listening on port ${port}`);
}
void bootstrap();
