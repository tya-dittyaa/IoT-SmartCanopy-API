import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from 'src/core/modules/prisma/prisma.module';
import { DevicesGateway } from './devices.gateway';

@Module({
  imports: [PrismaModule, ConfigModule],
  providers: [DevicesGateway],
})
export class DeviceModule {}
