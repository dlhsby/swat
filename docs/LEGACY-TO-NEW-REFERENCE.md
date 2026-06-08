# Legacy → SWAT reference (T-169)

Maps `old_swat` terms/screens to the new SWAT menu so existing staff can find
their workflows. Indonesian labels match the new UI.

## Screen / menu mapping

| Legacy (`old_swat`) | SWAT menu | Path |
|---------------------|-----------|------|
| Master Kendaraan | Master Data → Kendaraan | `/kendaraan` |
| Kategori Kendaraan | Master Data → Model Kendaraan | `/model-kendaraan` |
| Aplikasi Kendaraan | Master Data → Aplikasi Kendaraan | `/aplikasi-kendaraan` |
| Bahan Bakar | Master Data → Bahan Bakar | `/bahan-bakar` |
| Master Pengemudi (+ SIM) | Master Data → Pengemudi (tab SIM) | `/pengemudi` |
| Spot / Rute | Master Data → Spot & Rute (tabbed) | `/spot-rute` |
| Sumber Sampah | Master Data → Sumber Sampah | `/sumber-sampah` |
| Master Penjadwalan | Penjadwalan → Jadwal Kru (+ Trayek) | `/jadwal-kru` |
| Jatah Kitir (+ impor) | Penjadwalan → Jatah Kitir (+ Impor Massal) | `/jatah-kitir` |
| Transaksi Angkut Sampah | Transaksi → Hari Transaksi → Haul Board | `/hari-transaksi` |
| Pengisian Bahan Bakar | Transaksi → Pengisian Bahan Bakar | `/pengisian-bbm` |
| Pemeriksaan Kendaraan | Transaksi → Pemeriksaan Kendaraan | `/pemeriksaan` |
| Riwayat Perawatan | Transaksi → Perawatan | `/perawatan` |
| Hak Akses / Menu | Pengguna & Akses → Hak Akses | `/hak-akses` |
| Pengguna | Pengguna & Akses → Pengguna | `/pengguna` |

## Concept / term mapping

| Legacy term | SWAT term | Note |
|-------------|-----------|------|
| `haritransaksi` | Hari Transaksi / TransactionDay | dibuat otomatis 03:00 (cron) |
| `transaksiangkutsampah` | Haul | satu per kendaraan per hari |
| `detailtransaksiangkutsampah` | Haul Assignment | per shift kru |
| `trayek` | Trip / Trayek | satu per template rute |
| `jatahkitir` | Fuel Quota (Kitir) | kode tetap kredensial TPA |
| `sampahmasuktpa` | TPA Inbound Log | |
| `tonase` | Daily Tonnage | |
| `retribusi` | Levy | |
| Status `1/2/3` | IN_PROGRESS / DONE / VERIFIED | enum string, bukan angka |
| Password MD5 | Argon2id + ganti wajib | hash lama **tidak** dipindahkan |

## What changed for users

- **Login & kata sandi:** semua pengguna mulai dengan kata sandi sementara + ganti
  wajib (hash lama tidak ikut pindah). Tidak ada lagi MD5.
- **Hak akses:** menu disembunyikan bila tak punya izin (bukan ditampilkan lalu ditolak).
- **Berat bersih** dihitung server (gross − tara) dan ditolak bila negatif.
- **Verifikasi trip** mengunci data; perubahan setelah verifikasi butuh izin override.
