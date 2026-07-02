---
title: Tonase Sampah
sidebar_label: Tonase Sampah
sidebar_position: 1
---

![Tonase Sampah](/img/web/monitoring-volume.png)

## Apa itu Tonase Sampah?

Halaman **Tonase Sampah** menampilkan data pengangkutan sampah dalam kilogram atau ton selama periode tertentu. Anda dapat memantau volume harian, bulanan, serta memecah data berdasarkan sumber sampah (D, R, PS, PU, Swasta) dan lokasi pengambilan (TPS).

Halaman ini membantu Anda:

- Memverifikasi volume pengangkutan target harian dan bulanan
- Mengidentifikasi lokasi dengan volume tinggi untuk alokasi kendaraan
- Membandingkan performa antar periode
- Mengekspor data ke Excel atau PDF untuk laporan

## Cara Mengakses

Pilih **Pemantauan** → **Tonase Sampah** di menu utama. Halaman ini memerlukan akses `monitoring:read` (lihat [Peran & Akses](/memulai/peran-akses)). Jika opsi menu tidak tampak, minta admin untuk memberikan izin yang diperlukan.

## Fitur Utama

### Tab Ringkasan

Menampilkan gambaran umum tonnase dalam periode yang dipilih:

**KPI Cards**

- **Total Tonnase**: Jumlah sampah yang diangkut dalam periode (ton)
- **Pengangkutan Sampah**: Jumlah haul (pengangkutan) yang dilakukan
- **Rata-rata per Pengangkutan**: Rata-rata tonnase per haul
- **Jumlah Sumber**: Berapa banyak sumber sampah terlibat

**Grafik & Tabel**

- **Grafik Harian**: Tren tonnase 5 hari terakhir dalam bentuk batang
- **Komposisi Sumber**: Pie chart menunjukkan distribusi sampah per sumber
  - Tekan tombol **Semua**, **Non-Swasta**, atau **Swasta** untuk menyaring sumber
  - Semua = seluruh sumber
  - Non-Swasta = sumber D, R, PS, PU
  - Swasta = sumber S
- **Tren Bulanan**: Grafik tonnase bulanan (bulan ini vs bulan sebelumnya)
- **Ringkasan Harian**: Tabel detail per hari (tanggal, tonnase, jumlah haul, total TPA)

### Tab Rekapitulasi

Menampilkan detail tonnase dalam format tabel untuk analisis mendalam:

- **Tabel per Sumber**: Tonnase dan jumlah haul untuk setiap sumber sampah
- **Tabel per Lokasi**: Lokasi TPS dengan tonnase tertinggi

## Kontrol & Filter

**Rentang Tanggal**

- Tekan tombol di sebelah kiri (mis. "5 Hari Terakhir", "Bulan Ini", "Kustom")
- Pilih **Kustom** untuk menetapkan tanggal mulai dan akhir spesifik
- Tekan **Terapkan** untuk memperbarui grafik dan tabel

**Ekspor**

- Tekan tombol **Ekspor** di kanan atas
- Pilih **Excel** atau **PDF** untuk mengunduh laporan dalam format yang dipilih
- File akan berisi ringkasan KPI dan tabel detail untuk periode yang dipilih

## Interpretasi Data

- **Tonnase Nol pada Hari Tertentu**: Jika tidak ada haul yang selesai atau data belum terekam, tonnase akan menunjukkan 0 kg
- **Total TPA (Referensi)**: Kolom "Total TPA" menampilkan data dari timbangan di lokasi pembuangan. Kolom ini bersifat informasional dan mungkin berbeda dari tonnase harian karena sumber data berbeda
- **Pembulatan**: Tonnase ditampilkan dalam ton (1 ton = 1.000 kg) dengan pembulatan standar

## Contoh Skenario

**Skenario 1: Verifikasi Target Harian**

1. Buka tab **Ringkasan**
2. Pastikan rentang tanggal adalah "5 Hari Terakhir"
3. Lihat kartu KPI **Total Tonnase** untuk total periode
4. Bandingkan dengan target mingguan/bulanan Anda

**Skenario 2: Analisis Kontribusi Sumber**

1. Buka tab **Ringkasan**
2. Di grafik komposisi sumber, tekan tombol **Non-Swasta** untuk melihat kontribusi sumber lokal
3. Buka tab **Rekapitulasi** untuk melihat detail per sumber dalam tabel

**Skenario 3: Identifikasi TPS Prioritas**

1. Buka tab **Rekapitulasi**
2. Cari **Tabel per Lokasi** (TPS dengan tonnase tertinggi)
3. Alokasikan kendaraan tambahan ke TPS dengan volume tinggi

## Catatan Penting

- Data tonnase didasarkan pada pencatatan **Perjalanan (Trip)** yang statusnya **Selesai** atau **Terverifikasi**
- Perjalanan dalam status **Dalam Proses** tidak disertakan dalam total tonnase
- Akses halaman ini memerlukan izin `monitoring:read`. Hubungi admin jika menu tersembunyi

---

**Perlu bantuan?** Lihat [FAQ](/faq) atau hubungi tim dukungan Anda.
