import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { MqttController } from './mqtt.controller';
import { MqttService } from './mqtt.service';

@Module({
  imports: [
    ClientsModule.registerAsync([
      {
        name: 'MQTT_CLIENT',
        imports: [ConfigModule],
        useFactory: (configService: ConfigService) => ({
          transport: Transport.MQTT,
          options: {
            url: `mqtt://${configService.get('MQTT_HOST', 'localhost')}:${configService.get('MQTT_PORT', 1883)}`,
            clientId: `smart-canopy-api-${Date.now()}`,
            clean: true,
            connectTimeout: 4000,
            username: configService.get<string>('MQTT_USERNAME'),
            password: configService.get<string>('MQTT_PASSWORD'),
            reconnectPeriod: 1000,
          },
        }),
        inject: [ConfigService],
      },
    ]),
  ],
  controllers: [MqttController],
  providers: [MqttService],
  exports: [ClientsModule],
})
export class MqttModule {}
