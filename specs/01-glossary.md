# 01 — Glossary & Naming Contract

This is the **authoritative source of truth** for naming. Every legacy Indonesian term maps to a
single **English code name** (used in backend code, Prisma models, DB tables, API resources) and a
single **Indonesian UI label** (used in the Next.js UI). When any other spec or code disagrees with
this table, this table wins.

> Rule: **English in code, Indonesian in the UI.** Never invent a synonym — reuse the names here.

## 1. Domain terms

| Legacy / Indonesian | Meaning | English code name | Indonesian UI label |
|---------------------|---------|-------------------|---------------------|
| DLH (Dinas Lingkungan Hidup) | City Environment Agency (owner) | — | Dinas Lingkungan Hidup |
| Pengangkutan sampah | Solid waste transportation | wasteTransport | Pengangkutan Sampah |
| Kendaraan | Vehicle / truck | `Vehicle` | Kendaraan |
| Pengemudi / Sopir | Driver | `Driver` | Pengemudi |
| Pengguna | System user | `User` | Pengguna |
| Hak akses | Role / access right | `Role` | Hak Akses |
| Spot | Site (a physical location) | `Site` | Lokasi / Spot |
| TPS (Tempat Pembuangan Sementara) | Temporary waste collection point | site type `TPS` | TPS |
| TPA (Tempat Pembuangan Akhir) | Final landfill / disposal site | site type `TPA` | TPA |
| Pool | Depot / motor pool | site type `POOL` | Pool |
| SPBU | Fuel station | site type `SPBU` | SPBU |
| Rute | Route (origin site → destination site) | `Route` | Rute |
| Trayek | One leg of a daily journey (e.g. pickup from TPS, disposal at TPA, refuel at SPBU) | `Trip` | Trayek |
| Ritase | Number of trip legs completed in a haul/day | tripCount | Ritase |
| Tonase | Tonnage (weight of waste) | tonnage | Tonase |
| Sumber sampah | Waste source category | `WasteSource` | Sumber Sampah |
| Bahan bakar (BBM) | Fuel | `Fuel` | Bahan Bakar |
| Jatah kitir / Kitir | Fuel quota voucher issued to a vehicle for a date range; the code is matched at the weighbridge during weighing | `FuelQuota` | Jatah Kitir |
| Retribusi | Waste-collection fee / levy | `Levy` | Retribusi |
| Riwayat perawatan | Maintenance history | `MaintenanceRecord` | Riwayat Perawatan |
| SIM | Driver's license | `DriverLicense` (entity); `LicenseClass` (classification) | SIM |
| Jembatan timbang | Weighbridge (at TPA) | weighbridge | Jembatan Timbang |
| Timbangan / Berat | Weighing / weight | weighing / weight | Timbangan / Berat |
| Berat kotor | Gross weight (vehicle + waste, recorded at weighbridge) | grossWeight | Berat Kotor |
| Berat kosong | Tare weight (empty vehicle, recorded at weighbridge) | tareWeight | Berat Kosong |
| Berat bersih | Net weight (gross − tare = waste tonnage) | netWeight | Berat Bersih |
| Volume sampah | Waste volume | wasteVolume | Volume Sampah |
| PT. Surveyor Indonesia | Landfill operations vendor (runs the final sanitary landfill) | — | PT. Surveyor Indonesia |

## 2. Core transaction-lifecycle entities & templates

**Transaction hierarchy** (4 levels: the runtime operation chain):

| Legacy table | English entity | Meaning |
|--------------|----------------|---------|
| `haritransaksi` | `TransactionDay` | One operational date; groups all hauls that day |
| `transaksiangkutsampah` | `Haul` | One vehicle's work for one transaction day |
| `detailtransaksiangkutsampah` | `HaulAssignment` | A driver assigned to the haul, with depart/return KM & time (target vs actual) |
| `trayek` | `Trip` | A single leg (e.g. pickup, disposal), with route, time, KM, weights, fuel |

**Scheduling templates** (pre-defined schedules for operations):

| Legacy table | English entity | Meaning |
|--------------|----------------|---------|
| `masterdetailtransaksiangkutsampah` | `CrewSchedule` | Template: vehicle + driver + depart/return time |
| `mastertrayek` | `TripTemplate` | Template: route + target time + fuel request |

## 3. Master / reference entities

| Legacy table | English entity |
|--------------|----------------|
| `kendaraan` | `Vehicle` |
| `kategorikendaraan` | `VehicleModel` (merk + specs) |
| `aplikasikendaraan` | `VehicleApplication` (body/function type) |
| `bahanbakar` | `Fuel` |
| `kategoribahanbakar` | `FuelCategory` |
| `pengemudi` | `Driver` |
| `sim` | `LicenseClass` |
| `kepemilikansim` | `DriverLicense` (driver↔class, number, expiry) |
| `spot` | `Site` |
| `kategorispot` | `SiteType` (enum) |
| `rute` | `Route` |
| `kategorirute` | `RouteCategory` (enum — leg type) |
| `kategorisumbersampah` | `WasteSource` |
| `kategorisumbersampahkendaraan` | `VehicleWasteSource` (M:N) |
| `sampahmasuktpa` | `TpaInboundLog` (weighbridge log) |
| `tonase` | `DailyTonnage` (aggregate) |
| `konversi_si_swat` | `LegacyNameMap` (import helper) |
| `pengguna` | `User` |
| `hakakses` | `Role` |
| `menu` / `hakaksesmenu` | replaced by `Permission` / `RolePermission` (see auth spec) |
| `riwayatperawatan` / `detailriwayatperawatan` | `MaintenanceRecord` / `MaintenanceItem` |
| `dokumentasi*` | `*Photo` (attachment relations) |

## 4. Enumerations (replace legacy `status*` / `kategori*` lookup tables)

Legacy numeric IDs are mapped to enum values so old row data can be migrated. The UI displays the Indonesian label for each enum value.

### SiteType (`kategorispot`)
| Legacy ID | Enum value | UI label |
|-----------|-----------|----------|
| 1 | `POOL` | Pool |
| 2 | `SPBU` | SPBU |
| 3 | `TPS` | TPS |
| 4 | `TPA` | TPA |

### RouteCategory (`kategorirute`) — the leg type within a daily journey
| Legacy ID | Enum value | UI label |
|-----------|-----------|----------|
| 1 | `DEPART_POOL` | Berangkat dari Pool |
| 2 | `REFUEL` | Pengisian Bahan Bakar |
| 3 | `PICKUP` | Pengambilan Sampah |
| 4 | `DISPOSAL` | Pembuangan Sampah |
| 5 | `RETURN_POOL` | Kembali ke Pool |

### TripStatus (`statustrayek`)
| Legacy ID | Enum value | UI label |
|-----------|-----------|----------|
| 1 | `IN_PROGRESS` | Belum Selesai |
| 2 | `DONE` | Selesai |
| 3 | `VERIFIED` | Terverifikasi |

### DayStatus (used by TransactionDay, Haul, HaulAssignment)
| Legacy ID | Enum value | UI label |
|-----------|-----------|----------|
| 1 | `IN_PROGRESS` | Belum Selesai |
| 2 | `DONE` | Selesai |

### FuelQuotaStatus (`statusjatahkitir`)
| Legacy ID | Enum value | UI label |
|-----------|-----------|----------|
| 1 | `ACTIVE` | Berlaku |
| 2 | `INACTIVE` | Tidak Berlaku |

### VehicleStatus (`statuskendaraan`)
| Legacy ID | Enum value | UI label |
|-----------|-----------|----------|
| 1 | `GOOD` | Baik |
| 2 | `MINOR_DAMAGE` | Rusak Ringan |
| 3 | `MAJOR_DAMAGE` | Rusak Berat |
| 4 | `LOST` | Hilang |

### EmploymentStatus (`statuskepegawaian`)
| Legacy ID | Enum value | UI label |
|-----------|-----------|----------|
| 1 | `SATGAS` | Satgas |
| 2 | `PNS` | PNS |
| 3 | `HONORER` | Honorer |

### MaintenanceStatus (`statusriwayatperawatan`)
| Legacy ID | Enum value | UI label |
|-----------|-----------|----------|
| 1 | `PENDING_APPROVAL` | Belum Disetujui |
| 2 | `APPROVED` | Disetujui |

### LicenseClass (`sim`) — kept as a small table, values are data
`A`, `BI`, `BI Umum`, `BII`, `BII Umum`, `C`, `D`.

### WasteSource (`kategorisumbersampah`) — kept as a table (code + name + notes)
| Code | Name |
|------|------|
| D | Dinas |
| R | Rekanan |
| PS | Pasar |
| PU | Pintu Air |
| PL | Pelabuhan |
| S | Swasta |

### FuelCategory (`kategoribahanbakar`) — kept as table
Two categories: `Bersubsidi` (subsidized) and `Non-Subsidi` (non-subsidized, legacy ID 2).

### Fuel (`bahanbakar`) — kept as table (name + price/liter, editable over time)
Seed values: Premium, Pertamax, Solar Keekonomian, Solar, Pertalite, Dexlite.

## 5. Legacy roles (mapped to new role+permission model)
Legacy roles: Root, Administrator, Administrasi Data, Checker, Operator Pool, Petugas SPBU, 
Petugas TPS, Petugas TPA, Kepala Dinas, Kepala Bidang Angkutan, Kepala Seksi Angkutan, Walikota,
Sekretaris Daerah, Staff Sekretariat, Staf Kebersihan, Guest, UPTD Kebersihan Saluran Pematusan.

All legacy roles are mapped to a new **Role + Permission** model (fine-grained access control) 
in the new system. Migration details are in [`06-auth-rbac.md`](./06-auth-rbac.md).

## 6. Field-name pattern

Legacy columns are `TABLE_FIELDNAME` (e.g. `KENDARAAN_NOMORPOLISI`). New code drops the table
prefix and uses camelCase: `vehicle.plateNumber`. A few key examples:

| Legacy column | New field |
|---------------|-----------|
| `KENDARAAN_NOMORPOLISI` | `plateNumber` |
| `KENDARAAN_NOMORRANGKA` | `chassisNumber` |
| `KENDARAAN_NOMORMESIN` | `engineNumber` |
| `KENDARAAN_TAHUNPEMBUATAN` | `manufactureYear` |
| `KENDARAAN_BERATKOSONGTERKINI` | `currentTareWeight` |
| `KENDARAAN_KMTERKINI` | `currentOdometer` |
| `KENDARAAN_MASABERLAKUSTNK` | `registrationExpiry` (STNK) |
| `KENDARAAN_MASABERLAKUPAJAKSTNK` | `taxExpiry` |
| `TRAYEK_BERATKOTORTIMBANGAN` | `grossWeight` |
| `TRAYEK_BERATBERSIHSAMPAH` | `netWeight` |
| `TRAYEK_JUMLAHISIBBMDIAJUKAN` | `fuelRequestedLiters` |
| `TRAYEK_JUMLAHISIBBMDISETUJUI` | `fuelApprovedLiters` |
| `*_WAKTUTARGET` | `targetTime` |
| `*_WAKTUREALISASI` | `actualTime` |
| `*_KMTARGET` / `*_KMREALISASI` | `targetOdometer` / `actualOdometer` |

The complete legacy-column-to-new-field mapping for each entity lives in [`03-data-model.md`](./03-data-model.md).
