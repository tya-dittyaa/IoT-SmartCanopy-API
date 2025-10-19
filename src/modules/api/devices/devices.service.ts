import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../core/modules/prisma/prisma.service';
import { DeviceDto } from './dto/device.dto';

@Injectable()
export class DevicesService {
  constructor(private readonly prisma: PrismaService) {}

  async listAll(): Promise<DeviceDto[]> {
    const devices = await this.prisma.device.findMany({
      orderBy: { createdAt: 'desc' },
    });

    return devices.map((d) => ({
      id: d.id,
      deviceKey: d.deviceKey,
      deviceName: d.deviceName,
      createdAt: d.createdAt,
      updatedAt: d.updatedAt,
    }));
  }
}
