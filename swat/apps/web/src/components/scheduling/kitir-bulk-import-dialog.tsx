'use client';

import { Download } from 'lucide-react';
import { useState } from 'react';

import {
  Alert,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Dropzone,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  notify,
} from '@/components/ui';
import { ApiError } from '@/lib/api-error';
import { parseCsv, toCsv } from '@/lib/csv';
import { type SiteDto, type VehicleDto } from '@/lib/master-api';
import {
  type BulkDisposalPermitRow,
  type BulkImportResult,
  bulkImportDisposalPermits,
} from '@/lib/operations-api';

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export interface KitirBulkImportDialogProps {
  open: boolean;
  vehicles: VehicleDto[];
  sites: SiteDto[];
  onOpenChange: (open: boolean) => void;
  onImported: () => void;
}

interface ParseError {
  row: number;
  reason: string;
}

/** Resolve a CSV row to a bulk-import row, accepting id or plate/name columns. */
function mapRow(
  raw: Record<string, string>,
  plateToId: Map<string, string>,
  nameToId: Map<string, string>,
): { row?: BulkDisposalPermitRow; error?: string } {
  const vehicleId = raw.vehicleId
    ? raw.vehicleId
    : plateToId.get((raw.plateNumber ?? '').toUpperCase());
  const siteId = raw.siteId ? raw.siteId : nameToId.get((raw.siteName ?? '').toLowerCase());
  if (!vehicleId) {
    return { error: 'Kendaraan tidak dikenali (vehicleId/plateNumber).' };
  }
  if (!siteId) {
    return { error: 'Lokasi tidak dikenali (siteId/siteName).' };
  }
  if (!DATE_REGEX.test(raw.validFrom ?? '') || !DATE_REGEX.test(raw.validTo ?? '')) {
    return { error: 'Tanggal harus berformat YYYY-MM-DD.' };
  }
  const status =
    raw.status === 'INACTIVE' ? 'INACTIVE' : raw.status === 'ACTIVE' ? 'ACTIVE' : undefined;
  return {
    row: {
      ...(raw.legacyId ? { legacyId: Number(raw.legacyId) } : {}),
      ...(raw.code ? { code: raw.code } : {}),
      vehicleId,
      siteId,
      validFrom: raw.validFrom ?? '',
      validTo: raw.validTo ?? '',
      ...(status ? { status } : {}),
    },
  };
}

export function KitirBulkImportDialog({
  open,
  vehicles,
  sites,
  onOpenChange,
  onImported,
}: KitirBulkImportDialogProps): JSX.Element {
  const [rows, setRows] = useState<BulkDisposalPermitRow[]>([]);
  const [parseErrors, setParseErrors] = useState<ParseError[]>([]);
  const [fileName, setFileName] = useState('');
  const [strategy, setStrategy] = useState<'UPSERT' | 'SKIP'>('UPSERT');
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<BulkImportResult | null>(null);

  const reset = (): void => {
    setRows([]);
    setParseErrors([]);
    setFileName('');
    setResult(null);
  };

  const onFile = async (files: File[]): Promise<void> => {
    const file = files[0];
    if (!file) return;
    reset();
    setFileName(file.name);
    const plateToId = new Map(vehicles.map((v) => [v.plateNumber.toUpperCase(), v.id]));
    const nameToId = new Map(sites.map((s) => [s.name.toLowerCase(), s.id]));
    try {
      const { rows: rawRows } = parseCsv(await file.text());
      const ok: BulkDisposalPermitRow[] = [];
      const errs: ParseError[] = [];
      rawRows.forEach((raw, i) => {
        const { row, error } = mapRow(raw, plateToId, nameToId);
        if (row) {
          ok.push(row);
        } else {
          errs.push({ row: i + 1, reason: error ?? 'Baris tidak valid.' });
        }
      });
      setRows(ok);
      setParseErrors(errs);
    } catch {
      notify.error('Gagal membaca berkas CSV.');
    }
  };

  const onImport = async (): Promise<void> => {
    if (rows.length === 0) return;
    setImporting(true);
    try {
      const res = await bulkImportDisposalPermits({ strategy, rows });
      setResult(res);
      notify.success(`Impor selesai: ${res.imported} baru, ${res.updated} diperbarui.`);
      onImported();
    } catch (err) {
      notify.error(err instanceof ApiError ? err.message : 'Gagal mengimpor kitir.');
    } finally {
      setImporting(false);
    }
  };

  const downloadErrors = (): void => {
    if (!result || result.errors.length === 0) return;
    const csv = toCsv(
      ['row', 'reason'],
      result.errors.map((e) => ({ row: e.row, reason: e.reason })),
    );
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'kitir-import-errors.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) reset();
        onOpenChange(o);
      }}
    >
      <DialogContent className="max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Impor Massal Kitir</DialogTitle>
          <DialogDescription>
            Unggah CSV dengan kolom vehicleId/plateNumber, siteId/siteName, validFrom, validTo,
            status (opsional code, legacyId).
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[60vh] space-y-4 overflow-y-auto px-0.5">
          {result ? (
            <div className="space-y-3">
              <Alert variant="success">
                {result.imported} baru · {result.updated} diperbarui · {result.skipped} dilewati ·{' '}
                {result.errorCount} gagal (dari {result.total} baris).
              </Alert>
              {result.errors.length > 0 ? (
                <Button variant="outline" size="sm" onClick={downloadErrors}>
                  <Download className="h-4 w-4" aria-hidden />
                  Unduh log galat
                </Button>
              ) : null}
            </div>
          ) : (
            <>
              <Dropzone
                accept="text/csv,.csv"
                multiple={false}
                onFilesAccepted={(f) => void onFile(f)}
              />
              {fileName ? (
                <p className="text-body-sm text-neutral-500">
                  {fileName} — <span className="text-neutral-900">{rows.length}</span> baris valid
                  {parseErrors.length > 0 ? `, ${parseErrors.length} dilewati` : ''}.
                </p>
              ) : null}

              {parseErrors.length > 0 ? (
                <Alert variant="warning">
                  {parseErrors.length} baris tidak dapat dibaca (mis. baris {parseErrors[0]?.row}:{' '}
                  {parseErrors[0]?.reason}).
                </Alert>
              ) : null}

              {rows.length > 0 ? (
                <div className="overflow-x-auto rounded-base border border-neutral-200">
                  <table className="w-full text-tiny">
                    <thead className="bg-neutral-50 text-neutral-500">
                      <tr>
                        <th className="px-2 py-1 text-left">Kendaraan</th>
                        <th className="px-2 py-1 text-left">Lokasi</th>
                        <th className="px-2 py-1 text-left">Dari</th>
                        <th className="px-2 py-1 text-left">Sampai</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.slice(0, 10).map((r, i) => (
                        <tr key={i} className="border-t border-neutral-100">
                          <td className="px-2 py-1 tabular-nums">{r.vehicleId}</td>
                          <td className="px-2 py-1 tabular-nums">{r.siteId}</td>
                          <td className="px-2 py-1">{r.validFrom}</td>
                          <td className="px-2 py-1">{r.validTo}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : null}

              <div className="space-y-1.5">
                <Label>Strategi</Label>
                <Select value={strategy} onValueChange={(v) => setStrategy(v as 'UPSERT' | 'SKIP')}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="UPSERT">Perbarui bila ada (legacyId)</SelectItem>
                    <SelectItem value="SKIP">Lewati bila ada (legacyId)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
            {result ? 'Tutup' : 'Batal'}
          </Button>
          {!result ? (
            <Button
              onClick={() => void onImport()}
              loading={importing}
              disabled={rows.length === 0}
            >
              Impor {rows.length > 0 ? `(${rows.length})` : ''}
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
