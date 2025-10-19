import { Module } from '@nestjs/common';
import { DevicesGateway } from './devices.gateway';

@Module({
  providers: [DevicesGateway],
})
export class DeviceModule {}
