import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import appConfig from './core/config/app.config';
import databaseConfig from './core/config/database.config';
import { PrismaModule } from './core/modules/prisma/prisma.module';
import { TelemetriesModule } from './modules/api/telemetries/telemetries.module';
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
    TelemetriesModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
