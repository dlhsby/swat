import { WeighbridgeValidationService } from './weighbridge-validation.service';

describe('WeighbridgeValidationService', () => {
  const service = new WeighbridgeValidationService();
  const limits = { maxNetLoad: 8000, maxNetVolume: 12 };

  it('computes net = gross - tare server-side', () => {
    const result = service.validateWeighing(6200, 4200, 10, limits);
    expect(result.valid).toBe(true);
    expect(result.netWeight).toBe(2000);
    expect(result.warnings).toHaveLength(0);
  });

  it('rejects gross < tare', () => {
    const result = service.validateWeighing(4000, 4200, undefined, limits);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Berat kotor');
  });

  it('rejects negative weights', () => {
    expect(service.validateWeighing(-1, 0, undefined, limits).valid).toBe(false);
    expect(service.validateWeighing(100, -5, undefined, limits).valid).toBe(false);
  });

  it('rejects non-finite weights', () => {
    expect(service.validateWeighing(Number.NaN, 100, undefined, limits).valid).toBe(false);
  });

  it('warns (but allows) when net exceeds max load', () => {
    const result = service.validateWeighing(20000, 4200, undefined, limits);
    expect(result.valid).toBe(true);
    expect(result.netWeight).toBe(15800);
    expect(result.warnings.join(' ')).toContain('muatan maksimum');
  });

  it('warns when volume exceeds max volume', () => {
    const result = service.validateWeighing(6200, 4200, 20, limits);
    expect(result.valid).toBe(true);
    expect(result.warnings.join(' ')).toContain('volume maksimum');
  });

  it('does not warn on capacity when limits are zero (unknown)', () => {
    const result = service.validateWeighing(99999, 0, 9999, { maxNetLoad: 0, maxNetVolume: 0 });
    expect(result.valid).toBe(true);
    expect(result.warnings).toHaveLength(0);
  });
});
