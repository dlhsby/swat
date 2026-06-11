'use client';

import { type ColumnDef } from '@tanstack/react-table';
import { MoreVertical, Pencil, Trash2 } from 'lucide-react';
import { useState } from 'react';

import { ThemeToggle } from '@/components/theme/ThemeToggle';
import {
  Alert,
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
  Avatar,
  AvatarFallback,
  Badge,
  Breadcrumb,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Checkbox,
  Combobox,
  DataTable,
  DatePicker,
  DescriptionList,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Dropzone,
  EmptyState,
  Input,
  Label,
  NumberInput,
  Pagination,
  Progress,
  RadioGroup,
  RadioGroupItem,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Sheet,
  SheetBody,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  Skeleton,
  StatusPill,
  Stepper,
  Switch,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Textarea,
  TimePicker,
  Toaster,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
  notify,
} from '@/components/ui';

interface VehicleRow {
  plate: string;
  model: string;
  odometer: number;
  status: string;
}

const ROWS: VehicleRow[] = [
  { plate: 'L 1234 AB', model: 'Hino Dutro', odometer: 84210, status: 'GOOD' },
  { plate: 'L 5678 CD', model: 'Mitsubishi Canter', odometer: 120340, status: 'MINOR_DAMAGE' },
  { plate: 'L 9012 EF', model: 'Isuzu Elf', odometer: 45110, status: 'MAJOR_DAMAGE' },
];

const COLUMNS: ColumnDef<VehicleRow>[] = [
  { accessorKey: 'plate', header: 'Nomor Polisi', meta: { label: 'Nomor Polisi' } },
  { accessorKey: 'model', header: 'Model', meta: { label: 'Model' } },
  {
    accessorKey: 'odometer',
    header: 'Odometer',
    meta: { label: 'Odometer' },
    cell: ({ getValue }) => (
      <span className="tnum">{(getValue() as number).toLocaleString('id-ID')} km</span>
    ),
  },
  {
    accessorKey: 'status',
    header: 'Kondisi',
    meta: { label: 'Kondisi' },
    cell: ({ getValue }) => <StatusPill domain="vehicle" value={getValue() as string} />,
  },
];

function Story({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3 rounded-lg border border-border p-lg">
      <h3 className="text-h3 text-foreground">{title}</h3>
      {children}
    </section>
  );
}

/**
 * Dev-only component showcase (design-system §3 acceptance: "a states story per
 * component"). Renders every library component across its variants/states so the
 * library can be eyeballed in light + dark. Not part of the production surface.
 */
export default function ComponentsPage() {
  const [combo, setCombo] = useState('');
  const [date, setDate] = useState<string | undefined>('2026-03-15');
  const [time, setTime] = useState('08:00');
  const [qty, setQty] = useState(8);
  const [page, setPage] = useState(3);
  const [confirmOpen, setConfirmOpen] = useState(false);

  return (
    <TooltipProvider>
      <Toaster />
      <main className="mx-auto max-w-5xl space-y-xl px-lg py-2xl">
        <header className="flex items-center justify-between">
          <div>
            <Breadcrumb items={[{ label: 'Dev', href: '#' }, { label: 'Komponen' }]} />
            <h1 className="mt-1 text-h1 text-foreground">SWAT — Component Library</h1>
          </div>
          <ThemeToggle />
        </header>

        <Story title="Button — variants · sizes · states">
          <div className="flex flex-wrap items-center gap-2">
            <Button>Primary</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="outline">Outline</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="destructive">Destructive</Button>
            <Button variant="link">Link</Button>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm">Small</Button>
            <Button size="md">Medium</Button>
            <Button size="lg">Large</Button>
            <Button loading>Memuat</Button>
            <Button disabled>Disabled</Button>
          </div>
        </Story>

        <Story title="Badge & Status Pill">
          <div className="flex flex-wrap gap-2">
            <StatusPill domain="trip" value="IN_PROGRESS" />
            <StatusPill domain="trip" value="DONE" />
            <StatusPill domain="trip" value="VERIFIED" />
            <StatusPill domain="vehicle" value="MAJOR_DAMAGE" />
            <Badge appearance="count">3/5</Badge>
            <Badge appearance="outline" variant="blue">
              Outline
            </Badge>
          </div>
        </Story>

        <Story title="Inputs">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="i1" required>
                Nomor Polisi
              </Label>
              <Input id="i1" placeholder="mis. L 1234 AB" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="i2">Dengan error</Label>
              <Input id="i2" error defaultValue="salah" />
            </div>
            <div className="space-y-1.5">
              <Label>Jumlah (stepper)</Label>
              <NumberInput steppers value={qty} min={0} max={10} unit="L" onValueChange={setQty} />
            </div>
            <div className="space-y-1.5">
              <Label>Catatan</Label>
              <Textarea placeholder="Catatan…" />
            </div>
            <div className="space-y-1.5">
              <Label>Tipe Lokasi</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih…" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TPS">TPS</SelectItem>
                  <SelectItem value="TPA">TPA</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Kendaraan (combobox)</Label>
              <Combobox
                value={combo}
                onValueChange={setCombo}
                options={ROWS.map((r) => ({ value: r.plate, label: `${r.plate} — ${r.model}` }))}
                placeholder="Pilih kendaraan"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Tanggal</Label>
              <DatePicker value={date} onValueChange={setDate} />
            </div>
            <div className="space-y-1.5">
              <Label>Jam</Label>
              <TimePicker value={time} onValueChange={setTime} />
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-6">
            <label className="flex items-center gap-2 text-body-sm">
              <Checkbox defaultChecked /> Aktif
            </label>
            <label className="flex items-center gap-2 text-body-sm">
              <Switch defaultChecked /> Status
            </label>
            <RadioGroup defaultValue="a" className="flex gap-4">
              <label className="flex items-center gap-2 text-body-sm">
                <RadioGroupItem value="a" /> Opsi A
              </label>
              <label className="flex items-center gap-2 text-body-sm">
                <RadioGroupItem value="b" /> Opsi B
              </label>
            </RadioGroup>
          </div>
        </Story>

        <Story title="Feedback — Alert · Toast · Progress · Tooltip · Avatar · Skeleton">
          <Alert variant="success" title="Berhasil">
            Data tersimpan.
          </Alert>
          <Alert variant="warning" title="Peringatan">
            Periksa kembali isian.
          </Alert>
          <Alert variant="danger" title="Gagal">
            Terjadi kesalahan.
          </Alert>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              variant="secondary"
              onClick={() => notify.success('Berhasil', 'Tersimpan')}
            >
              Toast sukses
            </Button>
            <Button size="sm" variant="secondary" onClick={() => notify.error('Gagal memuat')}>
              Toast error
            </Button>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button size="sm" variant="outline">
                  Hover saya
                </Button>
              </TooltipTrigger>
              <TooltipContent>Tooltip token-driven</TooltipContent>
            </Tooltip>
            <Avatar>
              <AvatarFallback>WT</AvatarFallback>
            </Avatar>
          </div>
          <Progress value={64} aria-label="contoh" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-4 w-1/3" />
          </div>
        </Story>

        <Story title="Stepper">
          <Stepper
            current={1}
            steps={[{ label: 'Pilih Rute' }, { label: 'Catat' }, { label: 'Konfirmasi' }]}
          />
        </Story>

        <Story title="Overlays — Dialog · Confirm · Sheet · Dropdown">
          <div className="flex flex-wrap gap-2">
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline">Buka Dialog</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Ubah kendaraan</DialogTitle>
                  <DialogDescription>Perbarui data kendaraan.</DialogDescription>
                </DialogHeader>
                <Input placeholder="Nomor polisi" />
                <DialogFooter>
                  <Button variant="secondary">Batal</Button>
                  <Button>Simpan</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
              <AlertDialogTrigger asChild>
                <Button variant="destructive">Hapus…</Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Hapus kendaraan?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Yakin ingin menghapus <strong>L 1234 AB</strong>? Tindakan ini tidak dapat
                    dibatalkan.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Batal</AlertDialogCancel>
                  <AlertDialogAction onClick={() => setConfirmOpen(false)}>Hapus</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline">Buka Sheet</Button>
              </SheetTrigger>
              <SheetContent>
                <SheetHeader>
                  <SheetTitle>Trip Sheet</SheetTitle>
                </SheetHeader>
                <SheetBody>Rincian rit kendaraan.</SheetBody>
              </SheetContent>
            </Sheet>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Aksi">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem>
                  <Pencil /> Ubah
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem destructive>
                  <Trash2 /> Hapus
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </Story>

        <Story title="Tabs & Description List">
          <Tabs defaultValue="data">
            <TabsList>
              <TabsTrigger value="data">Data Pribadi</TabsTrigger>
              <TabsTrigger value="sim">SIM</TabsTrigger>
            </TabsList>
            <TabsContent value="data">
              <DescriptionList
                items={[
                  { term: 'Nama', value: 'Budi Santoso' },
                  { term: 'NIK', value: '3578xxxxxxxxxxxx', mono: true },
                  { term: 'Odometer', value: '84.210 km', numeric: true },
                ]}
              />
            </TabsContent>
            <TabsContent value="sim">
              <DescriptionList items={[{ term: 'Golongan', value: 'B II Umum' }]} />
            </TabsContent>
          </Tabs>
        </Story>

        <Story title="DataTable — toolbar · sort · states · pagination">
          <DataTable columns={COLUMNS} data={ROWS} searchPlaceholder="Cari… (mis. nomor polisi)" />
          <div className="grid gap-4 md:grid-cols-2">
            <Card variant="outlined">
              <CardHeader>
                <CardTitle>Loading</CardTitle>
              </CardHeader>
              <CardContent>
                <DataTable columns={COLUMNS} data={[]} loading enableColumnToggle={false} />
              </CardContent>
            </Card>
            <Card variant="outlined">
              <CardHeader>
                <CardTitle>Empty</CardTitle>
              </CardHeader>
              <CardContent>
                <EmptyState
                  illustration="empty"
                  title="Belum ada data"
                  action={<Button size="sm">Buat Baru</Button>}
                />
              </CardContent>
            </Card>
          </div>
        </Story>

        <Story title="Pagination & Dropzone">
          <Pagination page={page} totalPages={10} onPageChange={setPage} />
          <Dropzone onFilesAccepted={() => notify.info('Berkas diterima')} />
        </Story>
      </main>
    </TooltipProvider>
  );
}
