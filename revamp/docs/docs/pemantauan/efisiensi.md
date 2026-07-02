---
title: Efisiensi
sidebar_label: Efisiensi
sidebar_position: 5
---

![Efisiensi](/img/web/monitoring-efficiency.png)

## Apa itu Efisiensi?

Halaman **Efisiensi** mengukur performa operasional armada melalui indikator kepatuhan rute, pemborosan bahan bakar, keterlambatan waktu, deviasi rute, dan cakupan GPS. Halaman ini menggabungkan data dari pencatatan aktivitas dan tracking GPS untuk memberikan gambaran holistik tentang efisiensi operasional setiap kendaraan.

Halaman ini membantu Anda:

- Mengukur kepatuhan kendaraan terhadap rute yang direncanakan
- Mendeteksi pemborosan bahan bakar per perjalanan
- Mengidentifikasi perjalanan yang terlambat
- Memantau deviasi rute (penyimpangan dari koridor yang disetujui)
- Melihat cakupan GPS dan status konektivitas perangkat GPS
- Membandingkan performa antar kendaraan dan periode

## Cara Mengakses

Pilih **Pemantauan** → **Efisiensi** di menu utama. Halaman ini memerlukan akses `monitoring:read` (lihat [Peran & Akses](/memulai/peran-akses)). Data efisiensi membutuhkan sistem GPS aktif dan pencatatan aktivitas yang akurat. Jika opsi menu tidak tampak, minta admin untuk memberikan izin.

## Fitur Utama

### KPI Cards

Ditampilkan di atas tabel untuk memberikan ringkasan performa armada:

- **Kepatuhan Rute**: Persentase rata-rata kepatuhan kendaraan terhadap rute yang direncanakan (%)
  - Nilai 100% = sempurna mengikuti rute
  - Nilai &lt;100% = ada penyimpangan dari rute
- **BBM Terbuang**: Total liter bahan bakar yang diperkirakan terbuang karena inefisiensi operasional (L)
  - Termasuk konsumsi berlebih akibat deviasi rute, pemberhentian lama, dll.
- **Waktu Telat**: Total menit keterlambatan di seluruh perjalanan dalam periode (menit)
  - Agregasi dari semua perjalanan yang melebihi waktu target
- **Total Deviasi**: Jumlah total peristiwa deviasi rute yang terdeteksi oleh sistem GPS
- **Cakupan GPS**: Persentase waktu kendaraan dengan sinyal GPS aktif selama periode (%)
  - Nilai 100% = GPS aktif sepanjang waktu
  - Nilai &lt;100% = ada periode offline/tidak terdeteksi
- **Perangkat Offline**: Jumlah perangkat GPS yang offline (tidak terkoneksi) beserta persentasenya (%)

### Tabel Efisiensi Detail

Menampilkan metrik efisiensi untuk setiap perjalanan per kendaraan:

**Kolom Tabel**

- **Tanggal**: Tanggal pelaksanaan perjalanan
- **Kendaraan**: Plat nomor kendaraan
- **Sumber**: Asal data lokasi (GPS = dari sistem GPS real-time, Tercatat = dari pencatatan manual)
- **Rencana (km)**: Jarak rute yang seharusnya ditempuh dalam km
- **Aktual (km)**: Jarak yang benar-benar ditempuh berdasarkan odometer atau GPS
- **Kepatuhan**: Persentase kepatuhan rute (aktual ÷ rencana × 100%)
- **Telat (mnt)**: Menit keterlambatan jika perjalanan melebihi waktu target
- **BBM Boros (L)**: Liter bahan bakar yang diperkirakan terbuang
- **Deviasi**: Jumlah deviasi rute yang terdeteksi

**Interpretasi Kolom**

- **Kepatuhan**:
  - 100% = mengikuti rute sempurna
  - > 100% = menempuh jarak lebih (detour atau rute tambahan)
  - &lt;100% = menempuh jarak lebih sedikit (tidak lengkap atau shortcut)
- **Telat**:
  - 0 mnt = tepat waktu atau lebih cepat dari target
  - > 0 mnt = keterlambatan (operator perlu dijelaskan)
- **BBM Boros**:
  - 0 L = efisien
  - > 0 L = ada pemborosan yang terdeteksi
- **Deviasi**:
  - 0 = tidak ada penyimpangan dari rute
  - > 0 = ada penyimpangan (alert untuk supervisor)

## Kontrol & Filter

**Rentang Tanggal**

- Tekan tombol di sebelah kiri (mis. "5 Hari Terakhir", "Bulan Ini", "Kustom")
- Pilih **Kustom** untuk menetapkan tanggal mulai dan akhir spesifik
- Tekan **Terapkan** untuk memperbarui KPI dan tabel

**Pencarian**

- Gunakan kotak pencarian untuk menemukan kendaraan berdasarkan plat nomor

## Interpretasi Data

**Kepatuhan Rute**

- Mengukur seberapa baik operator mengikuti rute yang direncanakan
- Kepatuhan rendah mungkin menandakan:
  - Operator tidak familiar dengan rute
  - Detour karena kondisi lalu lintas
  - Rute yang tidak optimal di aplikasi
- **Target**: Minimal 95% kepatuhan

**BBM Terbuang**

- Agregasi dari semua faktor inefisiensi (detour, idle, akselerasi buruk, dll.)
- BBM terbuang tinggi berarti ada optimasi yang diperlukan
- **Target**: Meminimalkan dengan meningkatkan kepatuhan rute

**Waktu Telat**

- Menunjukkan total keterlambatan kumulatif dalam periode
- Penyebab umum: macet, pemberhentian lama, rute suboptimal
- **Target**: Minimal keterlambatan atau sesuai buffer yang ditetapkan

**Cakupan GPS**

- Vital untuk tracking real-time dan efisiensi
- Cakupan &lt;90% menandakan masalah konektivitas atau perangkat
- Perlu investigasi dan maintenance perangkat GPS

**Deviasi Rute**

- Setiap deviasi berarti kendaraan menyimpang dari koridor yang disetujui
- Beberapa deviasi mungkin sah (lalu lintas), namun pola berkelanjutan perlu ditangani
- Deviasi sering dikaitkan dengan pemborosan bahan bakar

## Contoh Skenario

**Skenario 1: Identifikasi Kendaraan Tidak Efisien**

1. Buka halaman **Efisiensi**
2. Lihat KPI **Kepatuhan Rute** — jika &lt;95%, ada masalah sistemik
3. Scroll ke tabel dan cari baris dengan:
   - Kepatuhan &lt;90%
   - BBM Boros >10 L
   - Deviasi >3
4. Investigasi kendaraan-kendaraan tersebut dengan supervisor

**Skenario 2: Analisis Kehilangan Bahan Bakar**

1. Filter rentang tanggal ke "Bulan Ini"
2. Lihat KPI **BBM Terbuang** untuk total kerugian bahan bakar
3. Buka tabel dan cari baris dengan **BBM Boros** tertinggi
4. Bandingkan dengan penyebab (deviasi, telat, kepatuhan)
5. Ambil aksi korektif (pelatihan, optimasi rute, maintenance)

**Skenario 3: Diagnosis Masalah GPS**

1. Lihat KPI **Cakupan GPS** — jika &lt;90%, ada masalah
2. Lihat KPI **Perangkat Offline** untuk jumlah dan persentase
3. Buka tabel dan identifikasi kendaraan dengan **Sumber** = "Tercatat" (tidak menggunakan GPS)
4. Investigasi alasan offline (baterai, sinyal, hardware rusak)
5. Koordinasi dengan tim IT/fleet untuk maintenance

**Skenario 4: Laporan Efisiensi Mingguan**

1. Pilih rentang **7 Hari Terakhir**
2. Buka tab **Efisiensi** untuk melihat ringkasan KPI
3. Identifikasi top 3 kendaraan dengan masalah (kepatuhan rendah, BBM boros, deviasi tinggi)
4. Lapor ke supervisor untuk tindakan lanjut
5. Monitor kembali minggu berikutnya untuk improvement

## Catatan Penting

- Data efisiensi membutuhkan **sistem GPS aktif dan terintegrasi** dengan aplikasi
- Data juga bergantung pada **pencatatan aktivitas yang akurat** (waktu start/end, odometer)
- Kepatuhan rute dihitung dari rencana rute vs jarak aktual (GPS atau odometer)
- BBM terbuang adalah estimasi berdasarkan model konsumsi, bukan pengukuran langsung
- Deviasi rute memerlukan **koridor rute yang didefinisikan** di master data
- Akses halaman memerlukan izin `monitoring:read`. Hubungi admin jika menu tersembunyi
- Untuk investigasi detail deviasi, lihat halaman [Pengangkutan Sampah](/pemantauan/pengangkutan) yang memiliki Alert Center

---

**Perlu bantuan?** Lihat [FAQ](/faq) atau hubungi tim dukungan Anda.
