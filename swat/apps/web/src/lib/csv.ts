/**
 * Minimal RFC-4180-ish CSV parser for client-side bulk-import previews.
 * Handles quoted fields, embedded commas/quotes (""), and CR/LF line endings.
 * Not a full streaming parser — adequate for the import file sizes we preview.
 */
export interface ParsedCsv {
  readonly headers: string[];
  readonly rows: Array<Record<string, string>>;
}

function splitLine(line: string): string[] {
  const fields: string[] = [];
  let field = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      fields.push(field);
      field = '';
    } else {
      field += ch;
    }
  }
  fields.push(field);
  return fields;
}

/** Parse CSV text into headers + keyed rows. Blank lines are skipped. */
export function parseCsv(text: string): ParsedCsv {
  const lines = text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n')
    .filter((l) => l.trim() !== '');
  if (lines.length === 0) {
    return { headers: [], rows: [] };
  }
  const headers = splitLine(lines[0] ?? '').map((h) => h.trim());
  const rows = lines.slice(1).map((line) => {
    const cells = splitLine(line);
    const row: Record<string, string> = {};
    headers.forEach((h, i) => {
      row[h] = (cells[i] ?? '').trim();
    });
    return row;
  });
  return { headers, rows };
}

/** Serialize an array of objects to CSV (used for the error-log download). */
export function toCsv(headers: string[], rows: Array<Record<string, string | number>>): string {
  const escape = (v: string | number): string => {
    const s = String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const head = headers.map(escape).join(',');
  const body = rows.map((r) => headers.map((h) => escape(r[h] ?? '')).join(',')).join('\n');
  return `${head}\n${body}`;
}
