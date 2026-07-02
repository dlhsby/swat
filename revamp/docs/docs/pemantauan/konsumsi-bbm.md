---
title: Konsumsi BBM
sidebar_label: Konsumsi BBM
sidebar_position: 2
---

![Konsumsi BBM](/img/web/monitoring-fuel.png)

## Apa itu Konsumsi BBM?

Halaman **Konsumsi BBM** memantau penggunaan bahan bakar (bensin, solar, etc.) di seluruh armada. Halaman ini membandingkan **BBM yang diminta** dengan **BBM yang disetujui** untuk setiap kendaraan, membantu Anda mendeteksi anomali seperti pemborosan atau pencurian bahan bakar.

Halaman ini membantu Anda:

- Memantau efisiensi konsumsi BBM per kendaraan
- Mendeteksi varians (selisih) antara permintaan dan persetujuan BBM
- Menganalisis jenis bahan bakar yang paling banyak digunakan
- Mengakses log pengisian bahan bakar historis
- Mengekspor laporan ke Excel atau PDF

## Cara Mengakses

Pilih **Pemantauan** → **Konsumsi BBM** di menu utama. Halaman ini memerlukan akses `monitoring:read` (lihat [Peran & Akses](/memulai/peran-akses)). Jika opsi menu tidak tampak, minta admin untuk memberikan izin.

## Fitur Utama

### Tab Ringkasan

Menampilkan gambaran konsumsi BBM dalam periode yang dipilih:

**KPI Cards**

- **BBM Disetujui**: Total liter BBM yang disetujui dalam periode
- **BBM Diminta**: Total liter BBM yang diminta dalam periode
- **Jumlah Kendaraan**: Berapa banyak kendaraan yang tercatat menggunakan BBM
- **Bendera Merah**: Jumlah kendaraan dengan varians negatif (permintaan > persetujuan lebih dari 5%)

**Grafik & Tabel**

- **Grafik Batang Banding**: Menampilkan perbandingan BBM diminta vs disetujui per kendaraan
  - Batang terang = BBM diminta
  - Batang gelap = BBM disetujui
  - Jika disetujui < diminta sebesar >5%, kendaraan ditandai dengan indikator merah
- **Tabel Detail Kendaraan**: Daftar setiap kendaraan dengan kolom:
  - Plat nomor
  - BBM diminta (L)
  - BBM disetujui (L)
  - Varians (%)
  - Status flag (OK / Bendera Merah)

### Tab Berdasarkan Jenis

Analisis konsumsi BBM menurut tipe bahan bakar:

- **Grafik Batang Banding**: Perbandingan diminta vs disetujui per jenis BBM (Bensin, Solar, dll.)
- **Tabel Jenis Bahan Bakar**: Ringkasan konsumsi per jenis dengan total permintaan dan persetujuan

### Tab Riwayat

Menampilkan log pengisian bahan bakar historis dengan detail setiap pengisian, termasuk:

- Tanggal pengisian
- Kendaraan (plat)
- Jumlah liter
- Jenis bahan bakar
- Catatan

## Kontrol & Filter

**Rentang Tanggal**

- Tekan tombol di sebelah kiri (mis. "7 Hari Terakhir", "Bulan Ini", "Kustom")
- Pilih **Kustom** untuk menetapkan tanggal mulai dan akhir spesifik
- Tekan **Terapkan** untuk memperbarui grafik dan tabel

**Ekspor**

- Tekan tombol **Ekspor** di kanan atas
- Pilih **Excel** atau **PDF** untuk mengunduh laporan
- File akan berisi ringkasan KPI, grafik, dan tabel detail untuk periode yang dipilih

## Interpretasi Data

**Varians BBM**

- **Varians Positif** (permintaan < persetujuan): Disetujui lebih banyak dari yang diminta (normal jika ada buffer)
- **Varians Negatif** (permintaan > persetujuan): Disetujui lebih sedikit dari yang diminta
  - Jika **>5%**, ditandai **Bendera Merah** — tunjukkan ke supervisor untuk investigasi
- **Nol Varians**: Permintaan dan persetujuan sama (normal)

**BBM Diminta vs Disetujui**

- **BBM Diminta**: Jumlah yang diajukan operator berdasarkan rencana rute
- **BBM Disetujui**: Jumlah yang benar-benar diberikan setelah persetujuan supervisor
- Perbedaan bisa terjadi karena alasan operasional atau audit

## Contoh Skenario

**Skenario 1: Deteksi Anomali BBM**

1. Buka tab **Ringkasan**
2. Lihat kartu KPI **Bendera Merah** — jika >0, ada kendaraan dengan varians tinggi
3. Scroll ke bawah ke **Tabel Detail Kendaraan**
4. Cari kendaraan dengan status flag "Bendera Merah"
5. Investigasi dengan supervisor kendaraan tersebut untuk mengidentifikasi penyebabnya

**Skenario 2: Analisis per Jenis Bahan Bakar**

1. Buka tab **Berdasarkan Jenis**
2. Lihat grafik perbandingan untuk setiap jenis BBM
3. Identifikasi jenis dengan konsumsi tertinggi
4. Gunakan insight untuk merencanakan stok BBM

**Skenario 3: Laporan Bulanan**

1. Pilih rentang **Bulan Ini**
2. Tekan tombol **Ekspor** → **PDF**
3. File akan berisi ringkasan KPI dan detail kendaraan untuk laporan kepada manajemen

## Catatan Penting

- Data BBM didasarkan pada **Perjalanan (Trip)** dengan kategori **Pengisian Bahan Bakar** yang statusnya **Selesai** atau **Terverifikasi**
- Perjalanan dalam status **Dalam Proses** tidak disertakan dalam total konsumsi
- Akses halaman ini memerlukan izin `monitoring:read`. Hubungi admin jika menu tersembunyi
- Varians >5% menandakan kemungkinan anomali — segera lakukan investigasi dengan tim operasional

---

**Perlu bantuan?** Lihat [FAQ](/faq) atau hubungi tim dukungan Anda.
