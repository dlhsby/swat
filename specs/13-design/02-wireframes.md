# 02 — Wireframes

Low-fidelity functional wireframes using ASCII/box-drawing. Each wireframe includes layout, interaction notes, and Indonesian labels (from glossary). Reusable patterns defined once, referenced across screens.

---

## Reusable Pattern: CRUD List Page

**All master-data entities follow this template:**

```
┌─────────────────────────────────────────────────────────────┐
│ Dinas Lingkungan Hidup                                       │
├──────────────┬──────────────────────────────────────────────┤
│ > Master     │ Kendaraan                                     │
│   > Kendaraan│                                               │
│   > Pengemudi│ [Buat Baru]  [Cari...........] [Filter] [Cols]│
│              │                                                │
│              │ ┌──────────────────────────────────────────┐ │
│              │ │ Nopol    │ Merek      │ Status   │ Aksi  │ │
│              │ ├──────────────────────────────────────────┤ │
│              │ │ AB 1234  │ Hino       │ Baik     │ ⋮    │ │
│              │ │ AB 5678  │ Isuzu      │ R.Ringan │ ⋮    │ │
│              │ │ AB 9012  │ Hyundai    │ Hilang   │ ⋮    │ │
│              │ │ [Page 1 of 10 | 25 rows ▼]                │ │
│              │ └──────────────────────────────────────────┘ │
└──────────────┴──────────────────────────────────────────────┘
```

**Components:**
- **Breadcrumb** (optional): > Master Data > Kendaraan
- **Page title** (h1): Entity name (e.g., "Kendaraan")
- **Action bar:** 
  - "Buat Baru" button (primary, green)
  - Search box (placeholder "Cari...")
  - Filter dropdown (entity-specific columns)
  - Column toggle (show/hide fields)
- **Table:**
  - Sortable headers (click to sort, ↑/↓ icon)
  - Alternating row backgrounds
  - Last column: row actions menu (⋮ dropdown)
    - Edit (pencil icon)
    - View (eye icon)
    - Delete (trash icon)
- **Pagination:** "Halaman 1 dari 10 | 25 rows ▼"

**Empty state:**
```
┌──────────────────────────────────┐
│         📄 Belum ada data        │
│                                  │
│        [Buat Baru]               │
└──────────────────────────────────┘
```

**Loading state:** 10 skeleton rows (gray bars, height ~48px each)

**Error state:**
```
┌──────────────────────────────────┐
│         ⚠️ Gagal memuat data     │
│                                  │
│        [Coba Lagi]               │
└──────────────────────────────────┘
```

---

## Reusable Pattern: Create/Edit Modal

**Applied to: Vehicle, Driver, Site, Route, Fuel, etc.**

```
┌───────────────────────────────────────────────────┐
│ Tambah Kendaraan                              [✕] │
├───────────────────────────────────────────────────┤
│                                                   │
│ Nopol *              ┌─────────────────────────┐ │
│                      │ AB 1234                 │ │
│                      └─────────────────────────┘ │
│ Merek *              ┌─────────────────────────┐ │
│                      │ [Dropdown]              │ │
│                      └─────────────────────────┘ │
│ Tahun Pembuatan *    ┌─────────────────────────┐ │
│                      │ 2020                    │ │
│                      └─────────────────────────┘ │
│ Catatan              ┌─────────────────────────┐ │
│                      │                         │ │
│                      │                         │ │
│                      └─────────────────────────┘ │
│ ⚠️ Nomor polisi sudah ada                       │
│                                                   │
├───────────────────────────────────────────────────┤
│                              [Batal] [Simpan]    │
└───────────────────────────────────────────────────┘
```

**Behavior:**
- Modal title: "Tambah {Entity}" (create) or "Edit {Entity}" (edit)
- Form fields: organized into sections (cards inside modal)
- Validation: real-time, inline error messages (red text below field)
- Required asterisk: `*` in primary color next to label
- Submit bar: sticky at bottom, [Batal] (secondary gray), [Simpan] (primary green)
- Submit button: disabled while loading, shows spinner
- On success: toast "Berhasil ditambahkan" / "Berhasil diperbarui", close modal
- On error: toast "Gagal: {message}" (user-friendly, not technical)

---

## Reusable Pattern: Delete Confirmation

```
┌───────────────────────────────────────────────────┐
│ Konfirmasi Penghapusan                        [✕] │
├───────────────────────────────────────────────────┤
│                                                   │
│ Yakin ingin menghapus                           │
│ Kendaraan "AB 1234"?                            │
│                                                   │
│ Tindakan ini tidak dapat dibatalkan.            │
│                                                   │
├───────────────────────────────────────────────────┤
│                    [Batal] [Hapus]               │
│                           (red)                  │
└───────────────────────────────────────────────────┘
```

**Behavior:**
- Destructive action confirmation
- Button [Hapus] is red (danger variant)
- On confirm: soft-delete (set `deletedAt`), toast "Berhasil dihapus"
- On error: toast "Gagal menghapus"

---

## Screen 1: Login

```
┌──────────────────────────────────────────────────┐
│                                                  │
│                      SWAT                        │
│       Dinas Lingkungan Hidup Kota Surabaya     │
│                                                  │
│ ┌──────────────────────────────────────────────┐ │
│ │ Masuk                                        │ │
│ ├──────────────────────────────────────────────┤ │
│ │                                              │ │
│ │ Nama pengguna *                              │ │
│ │ ┌────────────────────────────────────────┐  │ │
│ │ │                                        │  │ │
│ │ └────────────────────────────────────────┘  │ │
│ │                                              │ │
│ │ Kata sandi *                                 │ │
│ │ ┌────────────────────────────────────────┐  │ │
│ │ │                                        │  │ │
│ │ └────────────────────────────────────────┘  │ │
│ │                                              │ │
│ │ [Masuk]                                      │ │
│ │                                              │ │
│ │ ⚠️ Nama pengguna atau kata sandi salah      │ │
│ │                                              │ │
│ └──────────────────────────────────────────────┘ │
│                                                  │
│ © Dinas Lingkungan Hidup Kota Surabaya         │
└──────────────────────────────────────────────────┘
```

**Behavior:**
- Centered card (400px wide on desktop, full on mobile)
- Fields: username (text), password (password input)
- Submit: POST `/api/auth/login`
- On success: redirect to `/dashboard` (or referrer)
- On error: inline red text "Nama pengguna atau kata sandi salah"
- Keyboard: Enter submits form

---

## Screen 2: Change Password (forced)

```
┌──────────────────────────────────────────────────┐
│ [Pengguna] > Ubah Kata Sandi                    │
├──────────────────────────────────────────────────┤
│                                                  │
│ Anda harus mengubah kata sandi untuk melanjutkan│
│                                                  │
│ ┌──────────────────────────────────────────────┐ │
│ │ Kata sandi saat ini *                        │ │
│ │ ┌────────────────────────────────────────┐  │ │
│ │ │                                        │  │ │
│ │ └────────────────────────────────────────┘  │ │
│ │                                              │ │
│ │ Kata sandi baru *                            │ │
│ │ ┌────────────────────────────────────────┐  │ │
│ │ │                                        │  │ │
│ │ └────────────────────────────────────────┘  │ │
│ │ ▮▮▮▮▮▮▮ Kekuatan: Kuat                      │ │
│ │                                              │ │
│ │ Konfirmasi kata sandi baru *                 │ │
│ │ ┌────────────────────────────────────────┐  │ │
│ │ │                                        │  │ │
│ │ └────────────────────────────────────────┘  │ │
│ │                                              │ │
│ │                        [Ubah] [Batal]       │ │
│ │                                              │ │
│ └──────────────────────────────────────────────┘ │
│                                                  │
└──────────────────────────────────────────────────┘
```

**Behavior:**
- Auto-redirect if `mustChangePassword = true`
- Fields: current password, new password (with strength bar), confirm new
- Validation: passwords match, strength requirements shown inline
- Submit: POST `/api/auth/change-password`
- On success: toast "Berhasil", redirect to `/dashboard`

---

## Screen 3: Dashboard / Home

```
┌─────────────────────────────────────────────────────┐
│ SWAT DLH Surabaya                   [👤] [🌐] [🚪]  │
├──────────────┬────────────────────────────────────┤
│ > Dashboard  │ Dasbor                              │
│   > Master   │                                     │
│   > Jadwal   │ Selamat datang, {Nama Pengguna}    │
│   > Transaksi│                                     │
│              │ ┌─────────────┬─────────────┐      │
│              │ │ 📦 Kendaraan│ 🚚 Haul Hari│      │
│              │ │    142 unit │    28 aktif │      │
│              │ └─────────────┴─────────────┘      │
│              │ ┌──────────────────────────┐       │
│              │ │ ⛽ BBM Hari ini          │       │
│              │ │  1,245 L                 │       │
│              │ └──────────────────────────┘       │
│              │ ┌──────────────────────────┐       │
│              │ │ 📊 Tonase Hari ini      │       │
│              │ │  87.5 ton                │       │
│              │ └──────────────────────────┘       │
│              │                                     │
└──────────────┴────────────────────────────────────┘
```

**Behavior:**
- Minimal Phase 1; metric cards (4 per row desktop, 1 mobile)
- Cards show: icon, metric title (small), value (large number), optional trend
- No charts Phase 1; Phase 2+ adds tonnage trends, route analytics

---

## Screen 4: App Shell (Layout reference)

```
┌────────────────────────────────────────────────────────┐
│ SWAT DLH [Title]                  👤 Dropdown | 🌐 | 🚪 │
├────────────────────┬──────────────────────────────────┤
│ Menu               │                                  │
│ > Dashboard        │ [Page content area]              │
│ > Master Data      │                                  │
│   > Kendaraan      │ max-width: 1400px                │
│   > Pengemudi      │ padding: 32px                    │
│   > Lokasi         │                                  │
│   > Rute           │ [Tables, forms, cards fill]      │
│ > Jadwal           │                                  │
│   > Jadwal Kru     │                                  │
│   > Jatah Kitir    │                                  │
│ > Transaksi        │                                  │
│   > Hari Transaksi │                                  │
│   > Pengambilan    │                                  │
│   > Pembuangan     │                                  │
│ > Pengguna         │                                  │
│ > Keluar           │                                  │
│                    │                                  │
└────────────────────┴──────────────────────────────────┘
```

**Sidebar:**
- Width: 256px (desktop), collapse on <1024px
- Items: role-based visibility (derived from permissions)
- Active item: left border 3px green, background light green
- Hover: background light gray

**Topbar:**
- Height: **76px** (`--hf-topbar-h`; per `01-design-system.md` §2.1 / `03-hifi-spec.md`)
- Brand mark + title (left); theme toggle + notification bell + user menu (right)
- Sticky; `z-sticky` (100). Recessed content canvas below (`neutral-100` light / `neutral-50` dark).

---

## Screen 5: Master Data — Kendaraan (Vehicle) List

*(Follows CRUD List Pattern above)*

```
┌──────────────────────────────────────────────────────┐
│ > Master > Kendaraan                                 │
├──────────────────────────────────────────────────────┤
│                                                      │
│ [Buat Baru] [Cari...] [Filter ▼] [Kolom ▼]        │
│                                                      │
│ Nopol ↑  │ Merek    │ Aplikasi  │ Status  │ Aksi  │
│──────────┼──────────┼───────────┼─────────┼───────│
│ AB 1234  │ Hino     │ Compactor │ Baik    │ ⋮ Edit│
│ AB 5678  │ Isuzu    │ Dump      │ R.Ringan│ ⋮ View│
│ AB 9012  │ Hyundai  │ Arm Roll  │ Hilang  │ ⋮ Del │
│ ...      │ ...      │ ...       │ ...     │ ...   │
│                                                      │
│ Halaman 1 dari 8 | Tampil 1–25 dari 200 | [25 ▼]  │
└──────────────────────────────────────────────────────┘
```

**Columns:** Nopol, Merek (VehicleModel), Aplikasi, Status, Actions
**Interactions:**
- Click [Buat Baru]: open modal "Tambah Kendaraan"
- Search: filter by plate number, brand name
- Filter: status dropdown (Baik / Rusak Ringan / Rusak Berat / Hilang)
- Row ⋮ menu: Edit, View, Delete

---

## Screen 6: Master Data — Create/Edit Kendaraan

*(Follows Create/Edit Modal Pattern)*

**Form sections:**
1. **Data Dasar:** Nopol, Merek, Aplikasi, Tahun Pembuatan
2. **Dimensi Kendaraan:** Berat Kosong Saat Ini, Odometer Saat Ini
3. **Berlaku Pajak:** Masa berlaku STNK, Masa berlaku Pajak STNK
4. **Catatan:** Text area for notes

**Validation:**
- Nopol: required, unique (backend check)
- Merek, Aplikasi: dropdown, required
- Tahun: number 1990–2030
- Berat: decimal kg
- Tanggal: date picker, format dd/MM/yyyy
- All required fields marked with `*`

---

## Screen 7: Transaksi — Hari Transaksi List

```
┌──────────────────────────────────────────────────────┐
│ > Transaksi > Hari Transaksi                         │
├──────────────────────────────────────────────────────┤
│                                                      │
│ [Inisiasi Hari] [Cari...] [Filter ▼] [Kolom ▼]    │
│                                                      │
│ Tanggal ↑ │ Status     │ Kendaraan │ Tonase  │ Aksi│
│───────────┼────────────┼───────────┼─────────┼─────│
│ 05/06/26  │ Belum Selesai (amber) │ 28      │ View│
│ 04/06/26  │ Selesai    (blue)     │ 27      │ View│
│ 03/06/26  │ Selesai    (blue)     │ 25      │ View│
│                                                      │
│ Halaman 1 dari 5 | Tampil 1–25 dari 85 | [25 ▼]   │
└──────────────────────────────────────────────────────┘
```

**Button behavior:**
- [Inisiasi Hari]: POST `/api/transaction-days` with date (creates TransactionDay for today)
  - If already exists for date: fetch existing (idempotent)
  - Seeds Hauls (one per CrewSchedule) + HaulAssignments from active CrewSchedules
  - On success: navigate to `/transaksi/hari-transaksi/{date}` (haul board)

**Table columns:**
- Tanggal: transaction date, sortable
- Status: badge (Belum Selesai = `IN_PROGRESS`, Selesai = `DONE`)
- Kendaraan: count of active vehicle assignments (hauls) for that day
- Tonase: total tonnage (gross weight from all DISPOSAL trips recorded that day)
- Aksi: [View] navigate to haul board

---

## Screen 8: Transaksi — Haul Board (Daily)

```
┌──────────────────────────────────────────────────────┐
│ > Transaksi > Hari Transaksi > 05 Juni 2026         │
├──────────────────────────────────────────────────────┤
│                                                      │
│ Haul Hari 05 Juni 2026                              │
│ Status: Belum Selesai | 28 kendaraan aktif          │
│                                                      │
│ Nopol    │ Pengemudi  │ Berangkat    │ Kembali │ Aksi
│          │            │ Target/Aktual│ T./Aktual│
│──────────┼────────────┼──────────────┼──────────┼─────
│ AB 1234  │ Budi       │ 06:00 / 06:05│ 14:00 / -│ Edit
│          │            │ 3/5 Terverif. │          │ Lihat
│          │            │ (green badge)│          │
│ AB 5678  │ Citra      │ 06:30 / -    │ 14:30 / -│ Edit
│          │            │ 0/4 Terverif. │          │ Lihat
│          │            │ (amber badge)│          │
│ ...      │ ...        │ ...          │ ...      │ ...
│                                                      │
│ Tampil 1-28 dari 28 | [25 ▼]                        │
└──────────────────────────────────────────────────────┘
```

**Columns:**
- Nopol (vehicle plate number)
- Pengemudi (driver name)
- Berangkat (departure time: target / actual from HaulAssignment)
- Kembali (return time: target / actual from HaulAssignment)
- Verified trip badge: "X/Y Terverifikasi" (count of verified trips / total trips)
- Aksi (Actions)

**Interactions:**
- [Edit]: opens "Rekalibrasi Berangkat/Kembali" modal to reconcile HaulAssignment depart/return times and odometers
- [Lihat]: navigates to trip list for that haul (shows PICKUP, DISPOSAL, REFUEL trips)
- Trip progress badge: displays green (>75% verified) or amber (<75% verified)

---

## Screen 9: Transaksi — Record Pengambilan Sampah (Pickup form)

```
┌──────────────────────────────────────────────────────┐
│ Catat Pengambilan Sampah                         [✕] │
├──────────────────────────────────────────────────────┤
│                                                      │
│ Kendaraan: AB 1234 (Hino Compactor)                 │
│ Pengemudi: Budi                                     │
│                                                      │
│ Pilih Trayek                                        │
│ ┌────────────────────────────────────────────────┐ │
│ │ Pengambilan dari TPS Ketintang ke TPA         │ │
│ │ Target: 07:30                                  │ │
│ │ [Pilih]                                        │ │
│ └────────────────────────────────────────────────┘ │
│                                                      │
│ ─── atau ─── [Tambah Trayek Baru]                  │
│                                                      │
│ Waktu Aktual *                    ┌────────────────┐ │
│                                   │ 07:32          │ │
│                                   └────────────────┘ │
│                                   [Sekarang]        │
│                                                      │
│ Odometer Aktual (km) *            ┌────────────────┐ │
│                                   │ 50240          │ │
│                                   └────────────────┘ │
│                                                      │
│ Sumber Sampah *                   ┌────────────────┐ │
│                                   │ [Dropdown]     │ │
│                                   └────────────────┘ │
│                                                      │
│ Catatan                           ┌────────────────┐ │
│                                   │                │ │
│                                   │                │ │
│                                   └────────────────┘ │
│                                                      │
├──────────────────────────────────────────────────────┤
│                              [Batal] [Simpan]        │
└──────────────────────────────────────────────────────┘
```

**Behavior:**
- Step 1: select PICKUP trip from haul (or create new)
- Step 2: record actuals (time, odometer, waste source, notes)
- Validation: odometer >= last odometer, time in valid range
- Submit: PATCH `/api/trips/{tripId}`, set status → DONE
- On success: toast "Berhasil dicatat", close modal, refresh haul board

---

## Screen 10: Transaksi — Record Pembuangan Sampah (Disposal + Weighing)

```
┌──────────────────────────────────────────────────────┐
│ Catat Pembuangan Sampah                          [✕] │
├──────────────────────────────────────────────────────┤
│                                                      │
│ Kendaraan: AB 1234 (Hino Compactor)                 │
│ Pengemudi: Budi                                     │
│                                                      │
│ Pilih Trayek: [Pembuangan ke TPA Jabon]              │
│ Target: 08:45                                       │
│                                                      │
│ ─── Data Timbangan ───                              │
│                                                      │
│ Berat Kosong (kg) *               ┌────────────────┐ │
│                                   │ 5200           │ │
│                                   └────────────────┘ │
│ Help: Dari data kendaraan, bisa diubah              │
│                                                      │
│ Berat Kotor (kg) *                ┌────────────────┐ │
│                                   │ 10850          │ │
│                                   └────────────────┘ │
│                                                      │
│ Berat Bersih (kg)                                    │
│ ✓ 5650 kg                         (read-only)       │
│ (Berat Kotor - Berat Kosong)                        │
│                                                      │
│ ⚠️ Validasi: Berat Kotor harus >= Berat Kosong      │
│                                                      │
│ Volume Sampah (m³)                ┌────────────────┐ │
│ (opsional)                         │ 5.2            │ │
│                                   └────────────────┘ │
│                                                      │
│ ─── Rekalibrasi Perjalanan ───                      │
│                                                      │
│ Waktu Aktual *                    ┌────────────────┐ │
│                                   │ 08:50          │ │
│                                   └────────────────┘ │
│                                                      │
│ Odometer Aktual (km) *            ┌────────────────┐ │
│                                   │ 50350          │ │
│                                   └────────────────┘ │
│                                                      │
│ Catatan                           ┌────────────────┐ │
│                                   │                │ │
│                                   └────────────────┘ │
│                                                      │
├──────────────────────────────────────────────────────┤
│                              [Batal] [Simpan]        │
└──────────────────────────────────────────────────────┘
```

**Behavior:**
- Select DISPOSAL trip
- Record tare (pre-filled from vehicle, editable)
- Record gross (required)
- Berat Bersih auto-computed on blur (gross - tare), displayed read-only
- Validation: gross >= tare, warn if invalid (disable submit)
- Optional fields: volume, waste source (editable)
- Actual time/odometer (as pickup)
- Submit: PATCH `/api/trips/{tripId}` with all fields
- On success: update vehicle currentTareWeight, trip status → DONE

---

## Screen 11: Transaksi — Record Bahan Bakar (Fuel)

```
┌──────────────────────────────────────────────────────┐
│ Catat Pengisian Bahan Bakar                       [✕] │
├──────────────────────────────────────────────────────┤
│                                                      │
│ Kendaraan: AB 1234 (Hino Compactor)                 │
│ Pengemudi: Budi                                     │
│                                                      │
│ Pilih Trayek: [Pengisian Bahan Bakar di SPBU]       │
│ Target: 06:15                                       │
│                                                      │
│ Jenis Bahan Bakar *               ┌────────────────┐ │
│                                   │ Solar          │ │
│                                   └────────────────┘ │
│                                                      │
│ Jumlah Diminta (L) *              ┌────────────────┐ │
│                                   │ 50.00          │ │
│                                   └────────────────┘ │
│                                                      │
│ Jumlah Disetujui (L) *            ┌────────────────┐ │
│                                   │ 50.00          │ │
│                                   └────────────────┘ │
│ Help: Default = Diminta. Edit hanya jika ada approval│
│                                                      │
│ ⚠️ Validasi: Disetujui <= Diminta                   │
│                                                      │
│ Waktu Aktual *                    ┌────────────────┐ │
│                                   │ 06:20          │ │
│                                   └────────────────┘ │
│                                                      │
│ Odometer Aktual (km) *            ┌────────────────┐ │
│                                   │ 50150          │ │
│                                   └────────────────┘ │
│                                                      │
│ Catatan                           ┌────────────────┐ │
│                                   │                │ │
│                                   └────────────────┘ │
│                                                      │
├──────────────────────────────────────────────────────┤
│                              [Batal] [Simpan]        │
└──────────────────────────────────────────────────────┘
```

**Behavior:**
- Select REFUEL trip
- Fuel product dropdown (filtered by vehicle's compatible fuels)
- Requested liters (decimal, 2 decimals, required)
- Approved liters (default = requested, editable only if user has approval capability, e.g., DataAdmin role; otherwise disabled)
- Validation: approved <= requested
- Actual time/odometer
- Submit: PATCH `/api/trips/{tripId}` → status DONE

---

## Screen 12: Transaksi — Trip Verification

```
┌──────────────────────────────────────────────────────┐
│ Verifikasi Trayek                                [✕] │
├──────────────────────────────────────────────────────┤
│                                                      │
│ ─── Data Trayek ───                                  │
│ Jenis: Pembuangan Sampah                            │
│ Lokasi: TPS Ketintang → TPA Jabon                   │
│                                                      │
│ ┌────────────────────────────────────────────────┐ │
│ │ Waktu Target: 08:45                            │ │
│ │ Waktu Aktual: 08:50 (5 menit lebih)            │ │
│ │                                                 │ │
│ │ Odometer Target: 45500 km                      │ │
│ │ Odometer Aktual: 45620 km (120 km)            │ │
│ │                                                 │ │
│ │ Berat Kosong: 5200 kg                          │ │
│ │ Berat Kotor: 10850 kg                          │ │
│ │ Berat Bersih: 5650 kg                          │ │
│ │ Volume: 5.2 m³                                 │ │
│ │                                                 │ │
│ │ Dicatat oleh: Administrasi Data (Ali)         │ │
│ │ Tanggal: 05/06/2026 08:52                      │ │
│ └────────────────────────────────────────────────┘ │
│                                                      │
│ Catatan (opsional)                ┌────────────────┐ │
│                                   │                │ │
│                                   │ (for rejection)│ │
│                                   └────────────────┘ │
│                                                      │
│ ✓ Data valid, siap untuk diverifikasi               │
│                                                      │
├──────────────────────────────────────────────────────┤
│                      [Tolak] [Terverifikasi]         │
│                            (green)                   │
└──────────────────────────────────────────────────────┘
```

**Behavior:**
- Read-only display of trip details recorded by the Administrasi Data role
- Only Checker role can verify or reject (other roles cannot see this screen)
- Actions: [Tolak] (secondary, returns trip to DONE status with optional rejection notes), [Terverifikasi] (primary green, sets trip to VERIFIED)
- On verify: PATCH `/api/trips/{tripId}` with status → VERIFIED, set `verifiedById` (checker user ID) and `verifiedAt` (timestamp), toast "Berhasil"
- On reject: PATCH status → DONE, save optional `notes` (reason for rejection); trip can be re-recorded and re-verified
- Verified trips become read-only in UI (Edit/Delete actions hidden or disabled with tooltip "Sudah terverifikasi")

---

## Screen 13: Depart/Return Reconciliation Modal

```
┌──────────────────────────────────────────────────────┐
│ Rekalibrasi Berangkat/Kembali                    [✕] │
├──────────────────────────────────────────────────────┤
│                                                      │
│ Kendaraan: AB 1234 (Hino Compactor)                 │
│ Pengemudi: Budi                                     │
│                                                      │
│ ─── Berangkat dari Pool ───                          │
│                                                      │
│ Waktu Target: 06:00                                 │
│ Waktu Aktual *                    ┌────────────────┐ │
│                                   │ 06:05          │ │
│                                   └────────────────┘ │
│                                                      │
│ Odometer Target: 50000 km                           │
│ Odometer Aktual (km) *            ┌────────────────┐ │
│                                   │ 50000          │ │
│                                   └────────────────┘ │
│                                                      │
│ ─── Kembali ke Pool ───                              │
│                                                      │
│ Waktu Target: 14:00                                 │
│ Waktu Aktual                      ┌────────────────┐ │
│                                   │ 14:15          │ │
│                                   └────────────────┘ │
│                                                      │
│ Odometer Target: 50350 km                           │
│ Odometer Aktual (km)              ┌────────────────┐ │
│                                   │ 50500          │ │
│                                   └────────────────┘ │
│                                                      │
│ Catatan                           ┌────────────────┐ │
│                                   │                │ │
│                                   └────────────────┘ │
│                                                      │
├──────────────────────────────────────────────────────┤
│                              [Batal] [Simpan]        │
└──────────────────────────────────────────────────────┘
```

**Behavior:**
- PATCH `/api/haul-assignments/{id}` with depart/return times and odometers
- Validation: actual >= target (both depart & return)
- On return: update vehicle.currentOdometer to return actual
- On success: refresh haul board

---

## States & Microcopy (Indonesian)

### Common validation messages
- "Nomor polisi sudah ada" (duplicate plate)
- "Tanggal harus sebelum hari ini" (future date)
- "Odometer harus >= {last}" (monotonicity)
- "Berat Kotor harus >= Berat Kosong" (gross >= tare)
- "Kata sandi minimal 8 karakter" (password strength)

### Toast notifications
- **Success:** "Berhasil ditambahkan", "Berhasil diperbarui", "Berhasil dihapus", "Berhasil dicatat"
- **Error:** "Gagal: {message}" (message is user-friendly, e.g., "Nomor polisi sudah ada")
- **Warning:** "Lisensi pengemudi sudah kedaluwarsa" (driver license expiry warning)

### Disabled states
- Submit button during mutation: "Memuat..." (spinner)
- Fields when form locked: gray background, `cursor: not-allowed`
- Actions (Edit/Delete) on verified trips: disabled, tooltip "Sudah terverifikasi"

### Empty states
- "Belum ada data" with [Buat Baru] button
- "Tidak ada hasil pencarian" on empty search

### Loading
- Skeleton rows: 10 placeholder bars, staggered animation
- Data table: "Memuat..." spinner in center

---

# Additional Screens — parity + design completion

These complete coverage to the full IA in `03-hifi-spec.md` (21 designed screens + the legacy-parity
reference masters). Screens 1–13 above remain valid; the items below add the rest. All reuse the
**CRUD List**, **Create/Edit Modal**, and **Delete Confirmation** patterns at the top of this file
unless noted. Labels are Indonesian (glossary); tokens/components per `01-design-system.md`.

## Reference Master CRUD (parity G1–G3) — Model Kendaraan · Aplikasi Kendaraan · Bahan Bakar

Each is a plain **List + Modal** (no bespoke layout):

```
┌ Master Data / {Model Kendaraan | Aplikasi Kendaraan | Bahan Bakar} ─────────┐
│ {Title}                                              [Buat Baru]            │
│ [Cari...]                                                [Filter] [Kolom]   │
│ ┌──────────────────────────────────────────────────────────────────────┐  │
│ │ Nama        │ {specs / kategori / harga}    │ Dipakai │ Aksi          │  │
│ │ Hino FM260  │ Tangki 200 L · Tare 8.500 kg  │ 14      │ ⋮ Ubah/Hapus  │  │
│ └──────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
```
- **Model Kendaraan** (`kategorikendaraan`): Nama/Merek, tangki (L), tare (kg), daya angkut, volume;
  fuel compatibility. **Aplikasi Kendaraan** (`aplikasikendaraan`): Nama (Compactor, Dump Truck, Arm
  Roll, Tipper, Flatbed). **Bahan Bakar** (`bahanbakar`): Nama, **Harga/Liter (Rp)** editable,
  read-only **Kategori** (Bersubsidi / Non-Subsidi).
- Modal: simple fields per above. **Delete blocked when referenced** → "Tidak dapat dihapus: masih
  dipakai oleh {n} {kendaraan/model}." Toasts on save/delete.

## Pengemudi (+ SIM tab)

```
┌ Master Data / Pengemudi ───────────────────────────────────────────────────┐
│ Pengemudi                                              [Buat Baru]          │
│ ⚠ 3 pengemudi memiliki SIM yang segera/sudah kedaluwarsa.                   │
│ [Cari...]  [Pool ▼] [Status ▼]                                  [Kolom]     │
│ ┌──────────────────────────────────────────────────────────────────────┐  │
│ │ Nama        │ KTP(mono) │ Status   │ Pool   │ Kontak │ SIM │ Status SIM │ │
│ │ ●Budi S.    │ 3578...01 │ Satgas   │ Pool 1 │ 0812.. │ 2   │ Segera Habis│ │  ← row tinted yellow
│ │ ●Citra W.   │ 3578...02 │ PNS      │ Pool 2 │ 0813.. │ 1   │ Kedaluwarsa │ │  ← row tinted red
│ └──────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
```
Form = **tabbed dialog (640px)**: **Data Pribadi** (KTP* 16-digit, Nama*, Status kepegawaian, Tgl
lahir, Pool*, Kontak*, alamat asal/sekarang, pelatihan K3) · **Lisensi (SIM)** (sub-table: Kelas /
Nomor / Berlaku s.d. / Status; [Terbitkan SIM] + revoke; empty → `no-results` illustration).

## Spot & Rute (tabbed)

```
┌ Master Data / Spot & Rute ──────────────────────────────────────────────────┐
│ [ Lokasi ] [ Rute ]                                       [Buat Baru]        │
│ — Lokasi tab —                                                               │
│ 🏭 TPS Ketintang   [TPS]   Jl. Ketintang ...    -7.31, 112.72   ⋮           │
│ ⛽ SPBU Wonokromo  [SPBU]  Jl. Wonokromo ...    -7.30, 112.74   ⋮           │
│ — Rute tab —                                                                 │
│ Pool 1 → TPS Ketintang   [PICKUP]    8 km    ⋮                              │
└─────────────────────────────────────────────────────────────────────────────┘
```
Site form: Nama, **Tipe** segmented (POOL/SPBU/TPS/TPA), Alamat, optional Lat/Lng (**both-or-neither**)
+ map-picker dropzone. Route form: Asal / Tujuan / Kategori / Jarak (km), with uniqueness +
distinct-endpoints validation alert.

## Sumber Sampah

```
┌ Master Data / Sumber Sampah ────────────────────────────────────────────────┐
│ Sumber Sampah                                          [Buat Baru]          │
│ Kode │ Nama            │ Catatan        │ Kendaraan │ Aksi                   │
│ [D]  │ Dinas           │ ...            │ 22        │ ⋮                       │
│ [PS] │ Pasar           │ ...            │ 8         │ ⋮                       │
└─────────────────────────────────────────────────────────────────────────────┘
```
Add/edit dialog: Kode (≤5, unique), Nama, Catatan. Kode chip is mono, primary-tinted.

## Jadwal Kru (Penjadwalan)

```
┌ Penjadwalan / Jadwal Kru ───────────────────────────────────────────────────┐
│ Jadwal Kru                                             [Buat Baru]          │
│ Kendaraan │ Pengemudi │ Pool   │ Berangkat │ Kembali │ Trayek │ Status      │
│ L 1234 AB │ Budi S.   │ Pool 1 │ 06:00     │ 14:00   │ 5      │ Aktif       │ → Template Trayek
└─────────────────────────────────────────────────────────────────────────────┘
```
Row → **Template Trayek**; row menu: Kelola Trayek / Hapus.

## Template Trayek

```
┌ Penjadwalan / Jadwal Kru / Template Trayek ─────────────────────────────────┐
│ L 1234 AB · Budi S.                                                          │
│ ┌ Waktu Jadwal ─────────────┐                                               │
│ │ Berangkat [06:00]  Kembali [14:00] │                                      │
│ └────────────────────────────┘                                              │
│ Trayek Terencana                                          [Tambah Trayek]   │
│ # │ Jenis      │ Rute                  │ Target │ BBM(L) │ ⠿               │
│ 1 │ DEPART_POOL│ Pool 1 → —            │ 06:00  │ —      │ ⠿               │
│ 2 │ REFUEL     │ → SPBU Wonokromo      │ 06:15  │ 50     │ ⠿               │
│ 3 │ PICKUP     │ TPS Ketintang         │ 07:30  │ —      │ ⠿               │
│ ℹ Urutan trayek mengikuti urutan penambahan.                                │
└─────────────────────────────────────────────────────────────────────────────┘
```
Drag handle (⠿) reorders. Jenis = RouteCategory pill.

## Jatah Kitir (parity G6)

```
┌ Penjadwalan / Jatah Kitir ──────────────────────────────────────────────────┐
│ Jatah Kitir                            [Impor Massal] [Terbitkan Kitir]     │
│ [Cari...] [Status ▼] [Berlaku pada 📅]                                      │
│ Kode(mono)      │ Kendaraan │ Lokasi      │ Dari      │ Sampai    │ Status   │
│ KT-202606-0042  │ L 1234 AB │ TPA Benowo  │ 01/06/26  │ 30/06/26  │ Berlaku  │
└─────────────────────────────────────────────────────────────────────────────┘
```
Issue dialog (560px): Kendaraan* (GOOD only) · Lokasi* (TPA) · Berlaku Dari* / Sampai* · Status radio
(Berlaku / Tidak Berlaku). Validation: Sampai ≥ Dari; warn on duplicate active kitir. **Impor Massal**
opens a dropzone for spreadsheet bulk issuance.

## Trip Sheet (right-side Sheet, from Haul Board)

```
                                         ┌ Trip · L 1234 AB ─────────────[✕]┐
                                         │ 🟦 inbox  Pengambilan TPS Ket.    │
                                         │           Target 07:30  • Selesai │ [Verifikasi]
                                         │ 🟩 scale  Pembuangan TPA Benowo   │
                                         │           Target 08:45  • Blm sel.│ [Catat]
                                         │ 🟨 fuel   Pengisian BBM SPBU      │
                                         │           Target 06:15  • Terverif.│
                                         └────────────────────────────────────┘
```
Type icon chip per RouteCategory; status pill; contextual action **Catat** (`IN_PROGRESS`) /
**Verifikasi** (`DONE`).

## Pengisian Bahan Bakar — Refuel Log (parity G7)

```
┌ Transaksi / Pengisian Bahan Bakar ──────────────────────────────────────────┐
│ [142 pengisian] [3.250 L disetujui] [Rp 32.500.000] [2 ditandai]            │
│ Waktu  │ Kendaraan │ Pengemudi │ BBM   │ Diminta │ Disetujui │ Biaya │ SPBU │ Status │
│ 06:20  │ L 1234 AB │ Budi      │ Solar │ 50,00   │ 45,00 ⚠   │ Rp .. │ ..   │Ditandai│
│                                                              [Catat Pengisian]│
└─────────────────────────────────────────────────────────────────────────────┘
```
Record dialog: BBM (filtered by vehicle), Diminta L, Disetujui L (**role-gated**), SPBU, waktu,
odometer; **estimated cost** = approved × price/L in a primary panel; gate Disetujui ≤ Diminta.

## Pemeriksaan Kendaraan — Inspection (parity G4)

```
┌ Transaksi / Pemeriksaan Kendaraan ──────────────────────────────────────────┐
│ Pemeriksaan Kendaraan                                  [Periksa]            │
│ Tanggal │ Kendaraan │ Model    │ Pemeriksa │ Lolos │ Hasil                  │
│ 07/06/26│ L 1234 AB │ Hino FM  │ Andi      │ 11/12 │ Perlu Perhatian        │ → detail Sheet
└─────────────────────────────────────────────────────────────────────────────┘
   detail Sheet: [11/12 lolos] + 12-item checklist (✓/⚠/✗ chip + label + status badge)
```
Create dialog: vehicle, date, inspector, **switch per checklist item** (OK/Attention/Fail), notes,
documentation dropzone. Result PASS/ATTENTION/FAIL pill computed from item results.

## Perawatan — Maintenance (parity G5)

```
┌ Transaksi / Perawatan ──────────────────────────────────────────────────────┐
│ [38 total] [4 berjalan] [Rp 18.500.000 bln ini] [6 terjadwal]               │
│ Kode(mono) │ Tanggal │ Kendaraan │ Jenis   │ Pekerjaan │ Bengkel │ Biaya │ Status  │
│ PRW-0042   │ 05/06/26│ L 1234 AB │ Servis  │ Ganti oli │ ..      │ Rp .. │ Berjalan│
│                                                              [Catat Perawatan]│
└─────────────────────────────────────────────────────────────────────────────┘
```
Record/edit dialog: Kendaraan, Tanggal, **Jenis** (Servis/Perbaikan), Odometer, Bengkel, Biaya (Rp),
Uraian Pekerjaan (line items) + documentation dropzone. Status pill Terjadwal/Berjalan/Selesai;
approval status Belum Disetujui/Disetujui.

## Pengguna (Users)

```
┌ Pengguna & Akses / Pengguna ────────────────────────────────────────────────┐
│ Pengguna                                               [Buat Baru]          │
│ Nama          │ Username(mono) │ Peran          │ Status                     │
│ ●Ali R.       │ @ali           │ Administrasi   │ Aktif                      │
│ ●Siti N.      │ @siti          │ Checker        │ Wajib ganti sandi          │
│   row menu: Ubah / Reset paksa kata sandi / Hapus (nonaktifkan)             │
└─────────────────────────────────────────────────────────────────────────────┘
```
Form: Nama*, Nama pengguna*, Peran* select. **No password field** — new users auto
`mustChangePassword`; info alert: "Bagikan kata sandi sementara secara langsung." Delete = soft-delete.

## Hak Akses — RBAC (master-detail)

```
┌ Pengguna & Akses / Hak Akses ───────────────────────────────────────────────┐
│ ┌ Peran (320px) ─┐ ┌ {Peran} ───────────────────────────────────────────┐  │
│ │ 🛡 Administrasi  │ │ Administrasi Data · "Entri transaksi harian"        │  │
│ │   12 izin   <-- │ │ ┌ Kendaraan ──────────────────────────────────────┐ │  │
│ │ Checker          │ │ │ vehicle:read     [ on ●]                          │ │  │
│ │   8 izin         │ │ │ vehicle:create   [○ off]                         │ │  │
│ │ 🛡 Operator Pool │ │ └─────────────────────────────────────────────────┘ │  │
│ └─────────────────┘ │ ℹ Mengubah izin memperbarui menu samping peran ini. │  │
│                     │                                          [Simpan Izin]│  │
└─────────────────────────────────────────────────────────────────────────────┘
```
Permission rows grouped by resource; **Switch** per permission (label + mono key `trip:verify`).

## Profil

```
┌ Profil ─────────────────────────────────────────────────────────────────────┐
│ ┌ Akun ──────────────┐  ┌ Keamanan ──────────────────────────────────────┐ │
│ │ (avatar 64px)       │  │ [Ubah Kata Sandi]                              │ │
│ │ Ali Rahman          │  └────────────────────────────────────────────────┘ │
│ │ @ali · Administrasi │  ┌ Sesi ──────────────────────────────────────────┐ │
│ │ [dropzone foto]     │  │ [Keluar]  (destructive → confirm)              │ │
│ │ Nama [Ali Rahman]   │  └────────────────────────────────────────────────┘ │
│ │ Username @ali (ro)  │                                                      │
│ └─────────────────────┘                                                      │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Monitoring — Volume per Hari (Phase 2 build)

```
┌ Monitoring / Volume per Hari ──────────────[ Total ▾ Dinas / Swasta ] [📅] ─┐
│ [Tonase 7 hari] [Bulan ini vs lalu] [Haul selesai] [Rata-rata/haul]         │
│ ┌ Tonase per Hari (stacked, by sumber) ┐ ┌ Komposisi Sumber (donut+legend) ┐│
│ └───────────────────────────────────────┘ └─────────────────────────────────┘│
│ Peringkat Tonase per TPS  (ranked table)                                     │
│ ℹ Agregasi: leg DISPOSAL, status DONE/VERIFIED, rekonsiliasi TPA tiap malam. │
└─────────────────────────────────────────────────────────────────────────────┘
```
The **Total / Dinas / Swasta** toggle is the legacy source-type split (parity G9).

## Monitoring — Konsumsi BBM (Phase 2 build)

```
┌ Monitoring / Konsumsi BBM ──────────────────────────────────────────[📅] ──┐
│ [Disetujui L] [Diminta L] [Rasio %] [Rata-rata/haul]                        │
│ ┌ Diminta vs Disetujui per Kendaraan (grouped bars; merah bila < −5%) ────┐ │
│ └──────────────────────────────────────────────────────────────────────────┘│
│ Kendaraan │ Diminta │ Disetujui │ Selisih % │ Status (Sesuai/Di bawah/Anomali)│
└─────────────────────────────────────────────────────────────────────────────┘
```

## Laporan — Reports (Phase 3 build)

```
┌ Monitoring / Laporan ───────────────────────────────────────────────────────┐
│ ┌ Tonase ┐ ┌ Konsumsi BBM ┐ ┌ Ringkasan Rute ┐ ┌ Retribusi ┐                │
│ │ Periode│ │ Periode      │ │ Periode        │ │ Periode   │  each: [Hasilkan]│
│ │ xlsx/pdf│ │ xlsx/pdf     │ │ xlsx/pdf       │ │ xlsx/pdf  │                │
│ └────────┘ └──────────────┘ └────────────────┘ └───────────┘                │
│ Riwayat: Laporan │ Format │ Ukuran │ Oleh │ Waktu │ Status [⬇ / spinner]     │
└─────────────────────────────────────────────────────────────────────────────┘
```
Generate dialog: rentang tanggal + format radio (Excel/PDF) + async note. DONE rows → download;
PROCESSING rows → spinner + "Diproses" pill.

## Global — Offline / Install banner & "Segera" placeholder

- **Offline banner** (`.app-banner`, warning): "Anda sedang offline — perubahan disinkronkan saat
  daring." Dismissible; theme-color stays slate-900.
- **"Segera"** placeholder: `maintenance` illustration + "Fitur ini akan segera tersedia." for any
  not-yet-built menu item the role can see.

---

