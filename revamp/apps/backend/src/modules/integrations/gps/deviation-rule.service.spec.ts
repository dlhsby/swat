import { UnprocessableEntityException } from '@nestjs/common';

import { type DeviationRuleRepository } from './deviation-rule.repository';
import { DeviationRuleService } from './deviation-rule.service';

describe('DeviationRuleService', () => {
  let repo: { list: jest.Mock; upsert: jest.Mock };
  let service: DeviationRuleService;

  beforeEach(() => {
    jest.clearAllMocks();
    repo = {
      list: jest.fn().mockResolvedValue([
        {
          deviationType: 'off_corridor',
          threshold: 150,
          hysteresisSec: 30,
          severity: 'WARNING',
          enabled: true,
        },
      ]),
      upsert: jest.fn().mockImplementation((_type, create) => Promise.resolve({ ...create })),
    };
    service = new DeviationRuleService(repo as unknown as DeviationRuleRepository);
  });

  it('lists rules as DTOs', async () => {
    const rules = await service.list();
    expect(rules).toEqual([
      {
        deviationType: 'off_corridor',
        threshold: 150,
        hysteresisSec: 30,
        severity: 'WARNING',
        enabled: true,
      },
    ]);
  });

  it('rejects an unknown deviation type with 422', async () => {
    await expect(service.upsert('made_up', {})).rejects.toBeInstanceOf(
      UnprocessableEntityException,
    );
    expect(repo.upsert).not.toHaveBeenCalled();
  });

  it('upserts a known type with defaults for a new rule', async () => {
    await service.upsert('dwell_too_long', { threshold: 720 });
    expect(repo.upsert).toHaveBeenCalledWith(
      'dwell_too_long',
      expect.objectContaining({
        deviationType: 'dwell_too_long',
        threshold: 720,
        hysteresisSec: 30,
        enabled: true,
      }),
      expect.objectContaining({ threshold: 720 }),
    );
  });
});
