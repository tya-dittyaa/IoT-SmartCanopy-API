import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import path from 'path';

import type { PrismaClient as PrismaClientType } from '../../../../generated/prisma/client';

const getPrismaClient = (): typeof PrismaClientType => {
  const root = process.cwd();
  const clientPath = path.join(root, 'generated', 'prisma', 'client');

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const required = require(clientPath);

  return (required?.PrismaClient ??
    required?.default ??
    required) as typeof PrismaClientType;
};

const BasePrismaClient = getPrismaClient();

@Injectable()
export class PrismaService
  extends BasePrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    super();
  }

  async onModuleInit() {
    try {
      await this.$connect();
      this.logger.log('Database connected');
    } catch (error) {
      this.logger.error('Failed to connect to database', error);
    }
  }

  async onModuleDestroy() {
    try {
      await this.$disconnect();
      this.logger.log('Database disconnected');
    } catch (error) {
      this.logger.error('Failed to disconnect from database', error);
    }
  }
}
