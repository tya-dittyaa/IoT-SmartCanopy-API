import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import appConfig from './core/config/app.config';
import databaseConfig from './core/config/database.config';
import { PrismaModule } from './core/modules/prisma/prisma.module';
import { TelemetryModule } from './modules/api/telemetry/telemetry.module';
import { DevicesGateway } from './modules/websocket/devices/devices.gateway';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: `.env`,
      load: [appConfig, databaseConfig],
    }),
    PrismaModule,
    DevicesGateway,
    TelemetryModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
