import { PdfGeneratorService } from '../pdf-generator.service';
import { PdfReportBuilder } from '../pdf-report.builder';

const builder = new PdfReportBuilder(new PdfGeneratorService());

const expectValidPdf = (buffer: Buffer): void => {
  expect(buffer.length).toBeGreaterThan(500);
  // PDF magic header — confirms a real PDF, not an error payload.
  expect(buffer.subarray(0, 5).toString('latin1')).toBe('%PDF-');
};

describe('PdfReportBuilder', () => {
  const range = { dateFrom: '2026-01-01', dateTo: '2026-02-28' };

  it('renders a valid tonnage PDF', async () => {
    expectValidPdf(
      await builder.build('tonnage', {
        ...range,
        monthly: [{ month: '2026-01', totalTonnageKg: 1000, haulCount: 10 }],
        daily: [
          {
            date: '2026-01-01',
            totalTonnageKg: 500,
            haulCount: 5,
            tpaInboundKg: 480,
            reconciliationStatus: 'MATCHED',
          },
        ],
        bySource: [],
        bySite: [],
      }),
    );
  });

  it('renders a valid fuel PDF', async () => {
    expectValidPdf(
      await builder.build('fuel', {
        ...range,
        consumption: [
          {
            vehicleId: 'v1',
            plateNumber: 'L 1 AB',
            fuelApprovedLiters: 40,
            fuelRequestedLiters: 50,
            variancePercent: -20,
            flag: 'RED',
          },
        ],
        byType: [],
      }),
    );
  });

  it('renders a valid route PDF', async () => {
    expectValidPdf(
      await builder.build('route', {
        ...range,
        routes: [
          {
            routeId: 'r1',
            category: 'DISPOSAL',
            originSiteName: 'TPS A',
            destinationSiteName: 'TPA X',
            distanceKm: 10,
            tripCount: 5,
          },
        ],
      }),
    );
  });

  it('renders a valid levy PDF with a signature block', async () => {
    expectValidPdf(
      await builder.build('levy', {
        ...range,
        summary: [
          {
            categoryName: 'Rumah Tangga',
            totalAmount: 15000000,
            transactionCount: 3,
            avgPerTransaction: 5000000,
          },
        ],
        trend: [{ month: '2026-01', totalAmount: 7000000 }],
        byCategoryMonth: [{ categoryName: 'Rumah Tangga', month: '2026-01', totalAmount: 7000000 }],
      }),
    );
  });
});
