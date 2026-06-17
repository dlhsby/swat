import { QuickEntryBoard } from '@/components/transactions/quick-entry-board';

/** Focused TPS-pickup recording (legacy transaksi/pengambilansampah). */
export default function RecordPickupPage(): JSX.Element {
  return (
    <QuickEntryBoard
      categories={['PICKUP']}
      title="Catat Pengambilan Sampah"
      description="Pilih kendaraan, lalu catat pengambilan sampah di TPS."
      breadcrumbLabel="Pengambilan Sampah"
      allowAdHoc
    />
  );
}
