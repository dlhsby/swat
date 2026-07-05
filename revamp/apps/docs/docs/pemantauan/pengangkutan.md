---
title: Pengangkutan Sampah
sidebar_label: Pengangkutan Sampah
sidebar_position: 3
---

![Pengangkutan Sampah](/img/web/monitoring-hauling.png)

## Apa itu Pengangkutan Sampah?

Halaman **Pengangkutan Sampah** memantau aktivitas operasional armada secara real-time dan historis. Anda dapat melihat rute aktif, peta lokasi, detail perjalanan, serta performa waktu dan jarak per kendaraan. Halaman ini sangat berguna untuk overseer dan supervisor yang perlu memantau tempo operasional dan kepatuhan rute.

Halaman ini membantu Anda:

- Memantau rute aktif dan jumlah perjalanan harian
- Melihat peta lokasi pengambilan dan pembuangan sampah
- Melacak posisi kendaraan secara real-time (jika GPS tersedia)
- Menganalisis kepatuhan waktu dan jarak target per perjalanan
- Mengidentifikasi perjalanan yang terlambat atau bermasalah
- Mengekspor laporan ke Excel atau PDF

## Cara Mengakses

Pilih **Pemantauan** → **Pengangkutan Sampah** di menu utama. Halaman ini memerlukan akses `monitoring:read` (lihat [Peran & Akses](/memulai/peran-akses)). Jika opsi menu tidak tampak, minta admin untuk memberikan izin.

## Fitur Utama

### Tab Peta

Menampilkan visualisasi geografis rute dan kendaraan dalam periode yang dipilih:

**Elemen Peta**

- **Lokasi TPS (Titik Pengumpulan Sampah)**: Ditampilkan sebagai pin di peta
- **Lokasi TPA (Tempat Pembuangan Akhir)**: Ditampilkan sebagai pin khusus di peta
- **Garis Rute**: Garis yang menghubungkan TPS → TPA, menunjukkan rute yang dijalankan
- **Posisi Kendaraan Real-Time**: Jika sistem GPS aktif dan Anda memiliki akses `tracking:read`, kendaraan akan ditampilkan sebagai ikon dengan posisi terkini

**Interaksi Peta**

- Zoom masuk/keluar untuk detail lokasi
- Hover di pin untuk melihat nama lokasi dan tonnase
- Klik pin untuk melihat detail rute atau lokasi

**Panel Samping** (jika tersedia)

- Menampilkan **Pusat Alert** untuk deviasi rute (jika akses `deviation-alert:read` diberikan)
- Alert menunjukkan kendaraan yang menyimpang dari rute yang direncanakan

### Tab Operasional

Menampilkan detail perjalanan dalam bentuk tabel dengan informasi lengkap:

**Kolom Tabel**

- **Tanggal**: Tanggal pelaksanaan perjalanan
- **Kendaraan**: Plat nomor kendaraan (terlihat jelas/monospace)
- **Pengemudi**: Nama pengemudi/operator
- **Rute**: Nama rute (lokasi → lokasi)
- **KM Target**: Jarak yang seharusnya ditempuh (km)
- **KM Aktual**: Jarak yang benar-benar ditempuh (km)
- **Waktu Target**: Durasi yang seharusnya (jam:menit)
- **Waktu Aktual**: Durasi yang benar-benar dihabiskan (jam:menit)
- **Status**: Status perjalanan (Rencana, Dalam Proses, Selesai, Terverifikasi)

**Filter & Pencarian**

- Gunakan kotak pencarian untuk menemukan kendaraan atau pengemudi tertentu
- Tekan filter status (jika tersedia) untuk menampilkan hanya perjalanan dengan status tertentu

### Tab Rekapitulasi

Menampilkan ringkasan rute dengan statistik agregat:

**Kolom Tabel**

- **Rute**: Asal → Tujuan (TPS → TPA)
- **Kategori**: Jenis rute (Pengangkutan, Pengisian, dll.)
- **Jarak**: Jarak total rute dalam km
- **Perjalanan**: Jumlah perjalanan di rute ini dalam periode

**Interpretasi**

- Rute dengan jumlah perjalanan tinggi menunjukkan volume pengangkutan tinggi
- Rute dengan jarak jauh memerlukan lebih banyak waktu dan bahan bakar

## KPI Cards

Ditampilkan di atas semua tab:

- **Rute Aktif**: Jumlah rute yang memiliki ≥1 perjalanan dalam periode
- **Total Perjalanan**: Total jumlah perjalanan di semua rute

## Kontrol & Filter

**Rentang Tanggal**

- Tekan tombol di sebelah kiri (mis. "5 Hari Terakhir", "Bulan Ini", "Kustom")
- Pilih **Kustom** untuk menetapkan tanggal mulai dan akhir spesifik
- Tekan **Terapkan** untuk memperbarui peta, tabel operasional, dan rekapitulasi

**Ekspor**

- Tekan tombol **Ekspor** di kanan atas
- Pilih **Excel** atau **PDF** untuk mengunduh laporan
- File akan berisi ringkasan KPI, detail operasional, dan rekapitulasi rute untuk periode yang dipilih

## Interpretasi Data

**Perbandingan KM Target vs Aktual**

- **Aktual > Target**: Kendaraan menempuh jarak lebih jauh dari rencana (mungkin ada rute tambahan atau detour)
- **Aktual < Target**: Kendaraan mungkin tidak menyelesaikan rute penuh
- **Aktual ≈ Target**: Kendaraan mengikuti rute sesuai rencana (ideal)

**Perbandingan Waktu Target vs Aktual**

- **Aktual > Target**: Perjalanan memakan waktu lebih lama (macet, banyak pemberhentian, dll.)
- **Aktual < Target**: Perjalanan lebih cepat dari rencana (efisien, kondisi lalu lintas baik)
- **Aktual ≈ Target**: Kepatuhan waktu baik

**Status Perjalanan**

- **Rencana**: Perjalanan dijadwalkan tapi belum dimulai
- **Dalam Proses**: Perjalanan sedang berlangsung
- **Selesai**: Perjalanan sudah selesai tapi belum diverifikasi supervisor
- **Terverifikasi**: Perjalanan sudah diverifikasi dan data final

## Contoh Skenario

**Skenario 1: Pantau Operasi Harian**

1. Buka halaman **Pengangkutan Sampah**
2. Pastikan rentang tanggal adalah "Hari Ini"
3. Buka tab **Peta** untuk melihat rute aktif dan posisi kendaraan
4. Buka tab **Operasional** untuk melihat detail perjalanan individual

**Skenario 2: Identifikasi Bottleneck**

1. Buka tab **Rekapitulasi**
2. Cari rute dengan jumlah perjalanan tinggi
3. Bandingkan jarak rute dengan waktu aktual rata-rata
4. Jika waktu rata-rata lama, pertimbangkan optimasi rute atau alokasi kendaraan tambahan

**Skenario 3: Investigasi Perjalanan Terlambat**

1. Buka tab **Operasional**
2. Cari perjalanan dengan **Waktu Aktual > Waktu Target** secara signifikan
3. Catat plat nomor, tanggal, dan pengemudi
4. Tanya pengemudi atau supervisor tentang penyebab keterlambatan
5. Ambil tindakan korektif jika ada pola sistemik

## Catatan Penting

- Data pengangkutan didasarkan pada **Perjalanan (Trip)** yang statusnya **Selesai** atau **Terverifikasi**
- Perjalanan dalam status **Dalam Proses** tidak disertakan dalam rekapitulasi
- Posisi kendaraan real-time memerlukan sistem GPS aktif dan izin `tracking:read` untuk dilihat
- Akses halaman ini memerlukan izin `monitoring:read`. Hubungi admin jika menu tersembunyi
- Alert deviasi rute memerlukan izin `deviation-alert:read` untuk ditampilkan

---

**Perlu bantuan?** Lihat [FAQ](/faq) atau hubungi tim dukungan Anda.
