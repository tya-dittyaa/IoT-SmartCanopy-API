import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import appConfig from './core/config/app.config';
import databaseConfig from './core/config/database.config';
import mqttConfig from './core/config/mqtt.config';
import { MqttModule } from './core/modules/mqtt/mqtt.module';
import { PrismaModule } from './core/modules/prisma/prisma.module';
import { DevicesModule } from './modules/api/devices/devices.module';
import { TelemetriesModule } from './modules/api/telemetries/telemetries.module';
import { DeviceModule } from './modules/websocket/devices/devices.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: `.env`,
      load: [appConfig, databaseConfig, mqttConfig],
    }),
    PrismaModule,
    DeviceModule,
    TelemetriesModule,
    DevicesModule,
    MqttModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
