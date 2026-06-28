import { deriveGpsCoverage } from '../gps-coverage';

describe('deriveGpsCoverage', () => {
  it('is untracked with no devices', () => {
    expect(deriveGpsCoverage([])).toBe('untracked');
    expect(deriveGpsCoverage(undefined)).toBe('untracked');
  });

  it('is untracked when the only hardware device is inactive', () => {
    expect(
      deriveGpsCoverage([{ active: false, deviceType: 'gps-hardware', status: 'online' }]),
    ).toBe('untracked');
  });

  it('is tracked-online for an active, online hardware device', () => {
    expect(
      deriveGpsCoverage([{ active: true, deviceType: 'gps-hardware', status: 'online' }]),
    ).toBe('tracked-online');
  });

  it('is tracked-offline for an active hardware device that is not online', () => {
    expect(
      deriveGpsCoverage([{ active: true, deviceType: 'gps-hardware', status: 'offline' }]),
    ).toBe('tracked-offline');
  });

  it('ignores a non-hardware (mobile) source for the hardware coverage badge', () => {
    expect(deriveGpsCoverage([{ active: true, deviceType: 'mobile-app', status: 'online' }])).toBe(
      'untracked',
    );
  });
});
