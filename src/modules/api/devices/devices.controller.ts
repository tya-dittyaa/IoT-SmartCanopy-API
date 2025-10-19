import { Controller, Get } from '@nestjs/common';
import { DevicesService } from './devices.service';
import { DeviceDto } from './dto/device.dto';

@Controller('devices')
export class DevicesController {
  constructor(private readonly devicesService: DevicesService) {}

  @Get()
  async listAll(): Promise<DeviceDto[]> {
    return this.devicesService.listAll();
  }
}
