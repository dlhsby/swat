import { QuickEntryBoard } from '@/components/transactions/quick-entry-board';

/** Focused TPA-disposal recording (legacy transaksi/pembuangansampah). */
export default function RecordDisposalPage(): JSX.Element {
  return (
    <QuickEntryBoard
      categories={['DISPOSAL']}
      title="Catat Pembuangan Sampah"
      description="Pilih kendaraan, lalu catat penimbangan dan pembuangan sampah di TPA."
      breadcrumbLabel="Pembuangan Sampah"
      allowAdHoc
    />
  );
}
