import { type PrismaService } from '../../prisma/prisma.service';
import { type GpsActivityRepository } from '../gps/gps-activity.repository';

import { TpaInboundLogService, type TpaInboundLogInput } from './tpa-inbound-log.service';

const input: TpaInboundLogInput = {
  dateLabel: '2026-07-03',
  date: new Date('2026-07-03T05:00:00.000Z'),
  plateNumber: 'L8048SP',
  depot: null,
  grossWeight: 12000,
  tareWeight: 5000,
  netWeight: 7000,
  cctvReference: null,
  tripId: 'trip-1',
};

function build(): {
  svc: TpaInboundLogService;
  prisma: { tpaInboundLog: { create: jest.Mock } };
  activity: { writeWeighForTrip: jest.Mock };
} {
  const prisma = { tpaInboundLog: { create: jest.fn().mockResolvedValue({ id: 'log-1' }) } };
  const activity = { writeWeighForTrip: jest.fn().mockResolvedValue(undefined) };
  const svc = new TpaInboundLogService(
    prisma as unknown as PrismaService,
    activity as unknown as GpsActivityRepository,
  );
  return { svc, prisma, activity };
}

describe('TpaInboundLogService.create', () => {
  it('writes the log and emits a WEIGH activity event for the trip', async () => {
    const { svc, activity } = build();
    const row = await svc.create(input);
    expect(row).toEqual({ id: 'log-1' });
    expect(activity.writeWeighForTrip).toHaveBeenCalledWith('trip-1', input.date);
  });

  it('still returns the log when the activity write fails (best-effort)', async () => {
    const { svc, activity } = build();
    activity.writeWeighForTrip.mockRejectedValue(new Error('boom'));
    const row = await svc.create(input);
    expect(row).toEqual({ id: 'log-1' });
  });
});
