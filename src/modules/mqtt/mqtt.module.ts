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
            url: configService.get<string>('mqtt.url'),
            clientId: configService.get<string>('mqtt.clientId'),
            username: configService.get<string>('mqtt.username'),
            password: configService.get<string>('mqtt.password'),
            clean: true,
            connectTimeout: 4000,
            reconnectPeriod: 1000,
          },
        }),
        inject: [ConfigService],
      },
    ]),
  ],
  providers: [MqttService],
  controllers: [MqttController],
})
export class MqttModule {}
