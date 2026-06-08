import { Global, Module } from '@nestjs/common';

import { PrismaService } from './prisma.service';

/**
 * Global Prisma module. Exposes a single {@link PrismaService} to every feature
 * module's repository layer without each importing it explicitly.
 */
@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
