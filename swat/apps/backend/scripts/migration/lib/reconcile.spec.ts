import {
  type MigrationReport,
  hasCriticalFailures,
  reconcileRow,
  renderReportMarkdown,
  withinTolerance,
} from './reconcile';

describe('withinTolerance', () => {
  it('passes an exact match and a sub-1% diff', () => {
    expect(withinTolerance(1000, 1000)).toBe(true);
    expect(withinTolerance(1000, 995)).toBe(true); // 0.5%
  });
  it('fails a >1% diff', () => {
    expect(withinTolerance(1000, 980)).toBe(false); // 2%
  });
  it('handles zero legacy (must be zero migrated)', () => {
    expect(withinTolerance(0, 0)).toBe(true);
    expect(withinTolerance(0, 3)).toBe(false);
  });
  it('accounts for documented expected drops (deduped routes)', () => {
    expect(withinTolerance(100, 98, 1, 2)).toBe(true); // target 98, exact
    expect(withinTolerance(100, 90, 1, 2)).toBe(false);
  });
});

describe('reconcileRow', () => {
  it('reports variance and ok flag', () => {
    const row = reconcileRow('site', 934, 934);
    expect(row).toMatchObject({ table: 'site', diff: 0, variancePct: 0, ok: true });
  });
  it('marks an out-of-tolerance row as not ok', () => {
    expect(reconcileRow('vehicle', 1463, 1400).ok).toBe(false);
  });
  it('records expectedDrop for deduped tables', () => {
    const row = reconcileRow('route', 4944, 4902, 1, 42);
    expect(row).toMatchObject({ expectedDrop: 42, ok: true });
  });
});

describe('report rendering', () => {
  const report: MigrationReport = {
    generatedAt: '2026-06-08T00:00:00.000Z',
    source: 'MySQL dkp_swat',
    target: 'PostgreSQL',
    rows: [reconcileRow('site', 934, 934), reconcileRow('vehicle', 1463, 1463)],
    dataQuality: { zeroDatesNulled: 847, gpsNulled: 12 },
    security: { md5PasswordsDropped: 67, allMustChangePassword: true },
    fkIntegrityPassed: true,
  };

  it('flags no critical failures when all rows pass', () => {
    expect(hasCriticalFailures(report)).toBe(false);
  });
  it('flags critical when a row fails or FK integrity fails', () => {
    expect(hasCriticalFailures({ ...report, rows: [reconcileRow('site', 100, 50)] })).toBe(true);
    expect(hasCriticalFailures({ ...report, fkIntegrityPassed: false })).toBe(true);
  });
  it('renders a markdown table', () => {
    const md = renderReportMarkdown(report);
    expect(md).toContain('# Migration verification report');
    expect(md).toContain('| site | 934 | 934 |');
    expect(md).toContain('within tolerance');
  });
});
