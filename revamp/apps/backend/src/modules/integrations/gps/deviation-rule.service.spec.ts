import { UnprocessableEntityException } from '@nestjs/common';

import { type DeviationRuleRepository } from './deviation-rule.repository';
import { DEFAULT_DEVIATION_RULES, DeviationRuleService } from './deviation-rule.service';

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

  it('ensures the default rules at boot without overwriting operator edits', async () => {
    await service.onModuleInit();
    expect(repo.upsert).toHaveBeenCalledTimes(DEFAULT_DEVIATION_RULES.length);
    // Empty update → existing rows are preserved (create-only semantics).
    for (const call of repo.upsert.mock.calls) {
      expect(call[2]).toEqual({});
    }
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

  it('clears the threshold when null is sent (null !== undefined → update)', async () => {
    await service.upsert('off_corridor', { threshold: null });
    expect(repo.upsert).toHaveBeenCalledWith(
      'off_corridor',
      expect.objectContaining({ threshold: null }),
      expect.objectContaining({ threshold: null }),
    );
  });

  it('leaves the threshold untouched when it is omitted (undefined)', async () => {
    await service.upsert('off_corridor', { hysteresisSec: 40 });
    const updateArg = repo.upsert.mock.calls[0][2] as Record<string, unknown>;
    expect(updateArg).not.toHaveProperty('threshold');
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
