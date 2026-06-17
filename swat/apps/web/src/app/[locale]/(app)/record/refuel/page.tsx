import { QuickEntryBoard } from '@/components/transactions/quick-entry-board';

/** Focused SPBU-refuel recording (legacy transaksi/pengisianbahanbakar). */
export default function RecordRefuelPage(): JSX.Element {
  return (
    <QuickEntryBoard
      categories={['REFUEL']}
      title="Catat Pengisian Bahan Bakar"
      description="Pilih kendaraan, lalu catat pengisian bahan bakar di SPBU."
      breadcrumbLabel="Pengisian BBM"
      allowAdHoc
    />
  );
}
