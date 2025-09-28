import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import appConfig from './core/config/app.config';
import databaseConfig from './core/config/database.config';
import mqttConfig from './core/config/mqtt.config';
import { MqttModule } from './modules/mqtt/mqtt.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: `.env`,
      load: [appConfig, databaseConfig, mqttConfig],
    }),
    MqttModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
