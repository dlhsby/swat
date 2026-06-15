/* eslint-disable import/no-named-as-default-member -- pdfmake's CJS default
   export is the printer instance; its methods are non-enumerable, so the named
   imports the rule suggests are undefined at runtime. The default import works. */
import { Injectable } from '@nestjs/common';
import pdfMake from 'pdfmake';
import { type Content, type TDocumentDefinitions } from 'pdfmake/interfaces';

import { DLH_ORG } from './base-report.builder';

/**
 * Server-side PDF generation via pdfmake (0.3 unified API → `getBuffer()`).
 * Uses the built-in Helvetica fonts (no TTF bundling — PDFKit resolves the 14
 * standard fonts itself), and exposes small layout helpers (header / table /
 * KPI cards) so each report builder only assembles content blocks.
 */
const DLH_GREEN = '#006633';
const DLH_GREEN_HEX = '006633';

const FONTS = {
  Roboto: {
    normal: 'Helvetica',
    bold: 'Helvetica-Bold',
    italics: 'Helvetica-Oblique',
    bolditalics: 'Helvetica-BoldOblique',
  },
};

@Injectable()
export class PdfGeneratorService {
  constructor() {
    pdfMake.setFonts(FONTS);
  }

  /** DLH-branded header block (org line + report title + period). */
  header(title: string, period: string): Content {
    return {
      stack: [
        { text: DLH_ORG, style: 'org' },
        { text: title, style: 'title' },
        { text: period, style: 'period' },
      ],
      margin: [0, 0, 0, 12],
    };
  }

  /** A row of KPI "cards" (label + value), laid out in equal columns. */
  kpiCards(cards: Array<{ label: string; value: string }>): Content {
    return {
      columns: cards.map((c) => ({
        table: {
          widths: ['*'],
          body: [[{ text: c.value, style: 'kpiValue' }], [{ text: c.label, style: 'kpiLabel' }]],
        },
        layout: 'noBorders',
        margin: [0, 0, 6, 0],
      })),
      margin: [0, 0, 0, 12],
    };
  }

  /** Striped table with a DLH-green header row; values are right/left aligned. */
  table(
    headers: string[],
    rows: Array<Array<string | number>>,
    widths?: Array<string | number>,
  ): Content {
    const headerCells = headers.map((h) => ({ text: h, style: 'th' }));
    const bodyRows = rows.map((r) => r.map((cell) => ({ text: String(cell), style: 'td' })));
    return {
      table: {
        headerRows: 1,
        widths: widths ?? headers.map(() => '*'),
        body: [headerCells, ...bodyRows],
      },
      layout: {
        fillColor: (rowIndex: number) =>
          rowIndex === 0 ? DLH_GREEN_HEX : rowIndex % 2 === 0 ? '#F2F7F4' : null,
        hLineColor: () => '#DDDDDD',
        vLineColor: () => '#DDDDDD',
      },
      margin: [0, 0, 0, 10],
    };
  }

  async generate(content: Content[]): Promise<Buffer> {
    const docDefinition: TDocumentDefinitions = {
      pageSize: 'A4',
      pageMargins: [40, 50, 40, 50],
      defaultStyle: { font: 'Roboto', fontSize: 9 },
      footer: (currentPage: number, pageCount: number) => ({
        columns: [
          { text: `Dicetak: ${new Date().toISOString().slice(0, 10)}`, style: 'footer' },
          { text: `Halaman ${currentPage} / ${pageCount}`, alignment: 'right', style: 'footer' },
        ],
        margin: [40, 10, 40, 0],
      }),
      content,
      styles: {
        org: { bold: true, fontSize: 14, color: DLH_GREEN },
        title: { bold: true, fontSize: 12, margin: [0, 2, 0, 0] },
        period: { fontSize: 9, color: '#555555', margin: [0, 2, 0, 0] },
        th: { bold: true, color: '#FFFFFF', fontSize: 9 },
        td: { fontSize: 8 },
        kpiValue: { bold: true, fontSize: 14, color: DLH_GREEN, alignment: 'center' },
        kpiLabel: { fontSize: 8, color: '#555555', alignment: 'center' },
        footer: { fontSize: 7, color: '#888888' },
        signature: { fontSize: 9, margin: [0, 40, 0, 0] },
      },
    };
    return pdfMake.createPdf(docDefinition).getBuffer();
  }
}
