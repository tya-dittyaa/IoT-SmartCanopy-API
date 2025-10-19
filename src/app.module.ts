import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import appConfig from './core/config/app.config';
import databaseConfig from './core/config/database.config';
import { PrismaModule } from './core/modules/prisma/prisma.module';
import { DeviceGateway } from './modules/websocket/device/device.gateway';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: `.env`,
      load: [appConfig, databaseConfig],
    }),
    PrismaModule,
    DeviceGateway,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
