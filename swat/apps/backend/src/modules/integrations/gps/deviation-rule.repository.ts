import { Injectable } from '@nestjs/common';
import { type DeviationRule, type DeviationType, type Prisma } from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class DeviationRuleRepository {
  constructor(private readonly prisma: PrismaService) {}

  list(): Promise<DeviationRule[]> {
    return this.prisma.deviationRule.findMany({ orderBy: { deviationType: 'asc' } });
  }

  upsert(
    deviationType: DeviationType,
    create: Prisma.DeviationRuleCreateInput,
    update: Prisma.DeviationRuleUpdateInput,
  ): Promise<DeviationRule> {
    return this.prisma.deviationRule.upsert({ where: { deviationType }, create, update });
  }
}
