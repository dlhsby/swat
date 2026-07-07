'use client';

import { RefreshCw } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

import { PageHead } from '@/components/shell/page-head';
import { GasificationPhotoCell } from '@/components/transactions/gasification-photo-cell';
import {
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Spinner,
  notify,
} from '@/components/ui';
import {
  type CandidateTrip,
  type GasificationEntry,
  type GasificationStatus,
  gasificationApi,
} from '@/lib/gasification-api';

/** Today's date in WIB (UTC+7) as YYYY-MM-DD, for the default filter. */
function todayWib(): string {
  return new Date(Date.now() + 7 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

function formatDateTime(iso: string | null): string {
  return iso ? new Date(iso).toLocaleString('id-ID') : '—';
}

const STATUS_OPTIONS: Array<{ value: '' | GasificationStatus; label: string }> = [
  { value: '', label: 'Semua status' },
  { value: 'UNMATCHED', label: 'Belum cocok' },
  { value: 'MATCHED', label: 'Tercocok' },
  { value: 'IGNORED', label: 'Diabaikan' },
];

export default function GasifikasiPage(): JSX.Element {
  const [date, setDate] = useState(todayWib());
  const [status, setStatus] = useState<'' | GasificationStatus>('');
  const [entries, setEntries] = useState<GasificationEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [matchEntry, setMatchEntry] = useState<GasificationEntry | null>(null);
  const [candidates, setCandidates] = useState<CandidateTrip[] | null>(null);

  const load = useCallback(async (): Promise<void> => {
    setLoading(true);
    try {
      const res = await gasificationApi.list({
        date,
        ...(status ? { status } : {}),
        limit: 100,
      });
      setEntries(res.data);
    } catch {
      notify.error('Gagal memuat data gasifikasi.');
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }, [date, status]);

  useEffect(() => {
    void load();
  }, [load]);

  const syncNow = async (): Promise<void> => {
    setSyncing(true);
    try {
      const result = await gasificationApi.syncNow({ date });
      notify.success(
        `Sinkron selesai: ${result.upserted} catatan, ${result.matched} tercocok baru.`,
      );
      await load();
    } catch {
      notify.error('Sinkronisasi gagal. Pastikan kredensial PTSI sudah diatur.');
    } finally {
      setSyncing(false);
    }
  };

  const openMatch = async (entry: GasificationEntry): Promise<void> => {
    setMatchEntry(entry);
    setCandidates(null);
    try {
      setCandidates(await gasificationApi.candidates(entry.id));
    } catch {
      notify.error('Gagal memuat kandidat perjalanan.');
      setCandidates([]);
    }
  };

  const doMatch = async (tripId: string): Promise<void> => {
    if (!matchEntry) {
      return;
    }
    try {
      await gasificationApi.match(matchEntry.id, tripId);
      notify.success('Catatan gasifikasi berhasil dicocokkan.');
      setMatchEntry(null);
      await load();
    } catch {
      notify.error('Gagal mencocokkan. Perjalanan mungkin sudah tercocok dengan catatan lain.');
    }
  };

  const doUnmatch = async (entry: GasificationEntry): Promise<void> => {
    try {
      await gasificationApi.unmatch(entry.id);
      notify.success('Pencocokan dilepas.');
      await load();
    } catch {
      notify.error('Gagal melepas pencocokan.');
    }
  };

  return (
    <div>
      <PageHead
        title="Armada Masuk Gasifikasi"
        description="Data armada masuk gasifikasi dari PT Surveyor Indonesia, dicocokkan ke aktivitas pembuangan sampah."
        actions={
          <Button onClick={() => void syncNow()} disabled={syncing}>
            <RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} aria-hidden />
            Sinkron sekarang
          </Button>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="w-44"
          aria-label="Tanggal"
        />
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as '' | GasificationStatus)}
          className="h-10 rounded-base border border-neutral-200 bg-white px-3 text-body-sm dark:border-neutral-700 dark:bg-neutral-900"
          aria-label="Status"
        >
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Spinner />
        </div>
      ) : entries.length === 0 ? (
        <p className="py-12 text-center text-body-sm text-neutral-500">
          Tidak ada data gasifikasi untuk tanggal ini.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-base border border-neutral-200 dark:border-neutral-700">
          <table className="w-full text-body-sm">
            <thead className="bg-neutral-50 text-left dark:bg-neutral-800">
              <tr>
                <th className="px-3 py-2 font-medium">No Polisi</th>
                <th className="px-3 py-2 font-medium">Jam Masuk</th>
                <th className="px-3 py-2 font-medium">Petugas Tally</th>
                <th className="px-3 py-2 font-medium">Foto</th>
                <th className="px-3 py-2 font-medium">Status</th>
                <th className="px-3 py-2 font-medium">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <tr key={entry.id} className="border-t border-neutral-100 dark:border-neutral-800">
                  <td className="px-3 py-2 font-medium">{entry.vendorNopol}</td>
                  <td className="px-3 py-2 tabular-nums">{formatDateTime(entry.enteredAt)}</td>
                  <td className="px-3 py-2">{entry.userTally ?? '—'}</td>
                  <td className="px-3 py-2">
                    <GasificationPhotoCell
                      photoUrl={entry.photoUrl}
                      enteredAt={entry.enteredAt}
                      userTally={entry.userTally}
                    />
                  </td>
                  <td className="px-3 py-2">
                    {entry.status === 'MATCHED' ? (
                      <span className="inline-flex rounded-base bg-primary-700 px-2 py-0.5 text-tiny font-medium text-white">
                        Tercocok
                      </span>
                    ) : (
                      <span className="inline-flex rounded-base bg-neutral-100 px-2 py-0.5 text-tiny font-medium text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">
                        Belum cocok
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    {entry.status === 'MATCHED' ? (
                      <Button variant="secondary" size="sm" onClick={() => void doUnmatch(entry)}>
                        Lepas
                      </Button>
                    ) : (
                      <Button variant="secondary" size="sm" onClick={() => void openMatch(entry)}>
                        Cocokkan
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={matchEntry !== null} onOpenChange={(o) => !o && setMatchEntry(null)}>
        <DialogContent className="max-w-[560px]">
          <DialogHeader>
            <DialogTitle>Cocokkan ke perjalanan pembuangan</DialogTitle>
          </DialogHeader>
          {candidates === null ? (
            <div className="flex justify-center py-6">
              <Spinner />
            </div>
          ) : candidates.length === 0 ? (
            <p className="py-4 text-body-sm text-neutral-500">
              Tidak ada perjalanan pembuangan dengan plat yang sama pada tanggal ini.
            </p>
          ) : (
            <ul className="divide-y divide-neutral-100 dark:divide-neutral-800">
              {candidates.map((c) => (
                <li key={c.tripId} className="flex items-center justify-between gap-3 py-2">
                  <span className="text-body-sm">
                    {c.plateNumber} · {formatDateTime(c.disposalTime)}
                    {c.disposalDestination === 'GASIFICATION' ? ' · sudah gasifikasi' : ''}
                  </span>
                  <Button
                    size="sm"
                    disabled={c.disposalDestination === 'GASIFICATION'}
                    onClick={() => void doMatch(c.tripId)}
                  >
                    Pilih
                  </Button>
                </li>
              ))}
            </ul>
          )}
          <DialogFooter>
            <Button variant="secondary" onClick={() => setMatchEntry(null)}>
              Tutup
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
