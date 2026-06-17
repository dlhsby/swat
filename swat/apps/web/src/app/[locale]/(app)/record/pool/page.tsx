import { QuickEntryBoard } from '@/components/transactions/quick-entry-board';

/** Focused pool depart/return recording (legacy transaksi/aktivitaspool). */
export default function RecordPoolPage(): JSX.Element {
  return (
    <QuickEntryBoard
      categories={['DEPART_POOL', 'RETURN_POOL']}
      title="Catat Aktivitas Pool"
      description="Pilih kendaraan, lalu catat keberangkatan dan kepulangan di pool."
      breadcrumbLabel="Aktivitas Pool"
    />
  );
}
