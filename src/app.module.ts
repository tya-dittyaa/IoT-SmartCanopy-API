import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import appConfig from './core/config/app.config';
import databaseConfig from './core/config/database.config';
import { PrismaModule } from './core/modules/prisma/prisma.module';
import { DevicesModule } from './modules/api/devices/devices.module';
import { TelemetriesModule } from './modules/api/telemetries/telemetries.module';
import { DeviceModule } from './modules/websocket/devices/devices.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: `.env`,
      load: [appConfig, databaseConfig],
    }),
    PrismaModule,
    DeviceModule,
    TelemetriesModule,
    DevicesModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
