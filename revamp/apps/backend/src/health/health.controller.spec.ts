import { Test, type TestingModule } from '@nestjs/testing';

import { HealthController } from './health.controller';
import { HealthService } from './health.service';

describe('HealthController', () => {
  let controller: HealthController;
  const health = { checkReadiness: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [{ provide: HealthService, useValue: health }],
    }).compile();

    controller = module.get(HealthController);
  });

  it('returns an ok status payload', () => {
    const result = controller.check();
    expect(result.status).toBe('ok');
    expect(result.service).toBe('swat-backend');
    expect(typeof result.timestamp).toBe('string');
    expect(Number.isNaN(Date.parse(result.timestamp))).toBe(false);
  });

  it('delegates readiness to the health service', async () => {
    health.checkReadiness.mockResolvedValue({ status: 'ready', checks: { database: 'up' } });
    await expect(controller.ready()).resolves.toEqual({
      status: 'ready',
      checks: { database: 'up' },
    });
  });
});
