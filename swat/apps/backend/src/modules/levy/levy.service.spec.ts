import { NotFoundException } from '@nestjs/common';

import { type LevyRepository } from './levy.repository';
import { LevyService } from './levy.service';

function buildLevy(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: '00000000-0000-0000-0000-000000000042',
    legacyId: null,
    categoryName: 'Rumah Tangga',
    date: new Date('2026-06-01T00:00:00Z'),
    amount: 15_000_000n,
    notes: null,
    createdAt: new Date('2026-06-01T00:00:00Z'),
    updatedAt: new Date('2026-06-01T00:00:00Z'),
    createdById: null,
    updatedById: null,
    ...overrides,
  };
}

describe('LevyService', () => {
  let repo: {
    list: jest.Mock;
    findById: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    remove: jest.Mock;
  };
  let service: LevyService;

  beforeEach(() => {
    jest.clearAllMocks();
    repo = {
      list: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      remove: jest.fn().mockResolvedValue(undefined),
    };
    service = new LevyService(repo as unknown as LevyRepository);
  });

  const dto = { categoryName: 'Komersial', date: '2026-06-15', amount: 28_000_000 };

  it('create() writes scalar fields only (no createdBy connect) and serializes amount to a number', async () => {
    repo.create.mockResolvedValue(buildLevy({ categoryName: 'Komersial', amount: 28_000_000n }));

    const result = await service.create({ ...dto, notes: 'Q2' });

    const arg = repo.create.mock.calls[0][0];
    expect(arg.categoryName).toBe('Komersial');
    expect(arg.amount).toBe(28_000_000n);
    expect(arg.date).toEqual(new Date('2026-06-15T00:00:00.000Z'));
    expect(arg.notes).toBe('Q2');
    // Audit middleware stamps the scalar createdById — service must not connect a relation.
    expect(arg.createdBy).toBeUndefined();
    expect(arg.createdById).toBeUndefined();
    expect(typeof result.amount).toBe('number');
    expect(result.amount).toBe(28_000_000);
    expect(result.date).toBe('2026-06-01');
  });

  it('create() omits notes when not provided', async () => {
    repo.create.mockResolvedValue(buildLevy());
    await service.create(dto);
    expect(repo.create.mock.calls[0][0].notes).toBeUndefined();
  });

  it('list() forwards category + date-range filters and maps rows to DTOs', async () => {
    repo.list.mockResolvedValue({ rows: [buildLevy()], total: 1 });

    const res = await service.list({
      page: 1,
      limit: 20,
      categoryName: 'Rumah',
      dateFrom: '2026-01-01',
      dateTo: '2026-12-31',
    });

    const arg = repo.list.mock.calls[0][0];
    expect(arg.categoryName).toBe('Rumah');
    expect(arg.dateFrom).toEqual(new Date('2026-01-01T00:00:00.000Z'));
    expect(arg.dateTo).toEqual(new Date('2026-12-31T00:00:00.000Z'));
    expect(res.meta).toEqual({ total: 1, page: 1, limit: 20 });
    expect(res.data[0]?.amount).toBe(15_000_000);
  });

  it('update() applies only provided fields and 404s on a missing record', async () => {
    repo.findById.mockResolvedValueOnce(buildLevy());
    repo.update.mockResolvedValue(buildLevy({ amount: 9_000_000n }));

    await service.update('00000000-0000-0000-0000-000000000042', { amount: 9_000_000 });
    const arg = repo.update.mock.calls[0][1];
    expect(arg.amount).toBe(9_000_000n);
    expect(arg.categoryName).toBeUndefined();
    expect(arg.date).toBeUndefined();

    repo.findById.mockResolvedValueOnce(null);
    await expect(service.update('missing', { amount: 1 })).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('remove() 404s on a missing record', async () => {
    repo.findById.mockResolvedValueOnce(null);
    await expect(service.remove('missing')).rejects.toBeInstanceOf(NotFoundException);
  });
});
