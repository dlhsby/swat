---
title: Pencatatan Aktivitas
sidebar_label: Pencatatan Aktivitas
sidebar_position: 2
---

# Pencatatan Aktivitas

![Pencatatan Aktivitas](/img/web/record.png)

## Tujuan

Layar **Pencatatan Aktivitas** adalah antarmuka tunggal untuk mencatat semua aktivitas operasional perjalanan (Perjalanan) dalam satu hari. Dari sini, operator mencatat waktu sebenarnya dan odometer untuk setiap tahap perjalanan: keberangkatan dari pool, pengisian bahan bakar, pengambilan sampah, pengiriman sampah ke TPA, dan kepulangan ke pool.

## Tugas Utama

### Memilih Tanggal Rekap

Di bagian atas layar, gunakan **Rekap Tanggal** untuk memilih hari mana yang ingin dicatat atau ditinjau. Secara default, sistem menampilkan tanggal hari ini. Anda dapat memilih tanggal lampau (untuk meninjau catatan sebelumnya) atau bahkan hari-hari mendatang (untuk persiapan).

### Empat Tab Pencatatan

Aktivitas diorganisir dalam empat tab, sesuai urutan operasional harian:

#### 1. **Pool** (Keberangkatan & Kepulangan Pool)

Catat waktu saat kendaraan meninggalkan pool di pagi hari dan saat kembali ke pool. Setiap pencatatan mencakup:

- **Waktu Realisasi:** waktu sebenarnya (tidak waktu rencana)
- **Odometer:** pembacaan odometer kendaraan pada saat tersebut
- **Catatan:** opsional, untuk mencatat kondisi khusus atau kendala

#### 2. **Refuel** (Pengisian Bahan Bakar)

Catat setiap kali kendaraan mengisi bahan bakar. Data yang dicatat:

- **Waktu Realisasi:** saat pengisian dilakukan
- **Odometer:** pembacaan odometer saat pengisian
- **Jumlah BBM:** liter bahan bakar yang diminta dan liter yang disetujui (tidak boleh melebihi yang diminta)

#### 3. **Pickup** (Pengambilan Sampah)

Catat setiap kali kendaraan mengambil sampah dari sumber pembuangan (TPS, pasar, rumah sakit, dll). Data:

- **Waktu Realisasi:** saat pengambilan selesai
- **Odometer:** pembacaan odometer setelah pengambilan

#### 4. **Disposal** (Pengiriman ke TPA)

Catat setiap kali kendaraan mengoperkan sampah ke Tempat Pembuangan Akhir (TPA). Data yang dicatat:

- **Waktu Realisasi:** waktu sebenarnya saat pembongkaran selesai
- **Odometer:** pembacaan odometer di TPA
- **Berat Kotor (Bruto):** berat total kendaraan + sampah (dalam kg)
- **Berat Kosong (Tara):** berat kendaraan tanpa sampah (diisi otomatis dari data terakhir kendaraan; dapat disesuaikan jika diketahui berbeda)
- **Volume Sampah:** volume sampah dalam meter kubik (m³)

Sistem otomatis menghitung **Berat Bersih (Neto)** = Berat Kotor − Berat Kosong.

## Antarmuka Pencatatan

Setiap tab menampilkan **board entri cepat** (Quick Entry Board) dengan daftar semua perjalanan untuk hari dan jenis aktivitas tersebut. Untuk setiap perjalanan, Anda dapat:

- **Klik untuk membuka formulir:** memasukkan atau menyunting waktu dan odometer
- **Melihat status:** `IN_PROGRESS` (belum selesai), `DONE` (selesai dicatat), atau `VERIFIED` (diverifikasi dan terkunci)
- **Melihat catatan:** opsional, ditulis oleh operator untuk keperluan dokumentasi

## Validasi dan Aturan

- **Odometer tidak boleh menurun:** Odometer untuk setiap perjalanan harus sama atau lebih besar dari perjalanan sebelumnya dalam satu haul.
- **Berat kotor ≥ berat kosong:** Sistem akan menolak jika berat kotor lebih kecil dari berat kosong.
- **Waktu harus sesuai:** Waktu realisasi harus masuk akal dalam konteks urutan operasional (tidak bisa mundur waktu dalam satu hari).

## Informasi Penting

Layar ini adalah tempat **operator dan petugas TPA mencatat data operasional**. Data yang dicatat di sini menjadi sumber kebenaran untuk laporan dan analisis efisiensi kendaraan. Pastikan semua waktu dan odometer dicatat dengan akurat.

Verifikasi data dilakukan di layar lain (oleh pemeriksa) setelah semua pencatatan selesai. Saat data diverifikasi, perjalanan akan terkunci dan tidak dapat disunting lagi.

## Izin Akses

Halaman ini memerlukan izin **`trip:read`** untuk melihat pencatatan. Untuk mencatat atau menyunting data, diperlukan izin tambahan sesuai peran Anda:

- **Operator / Petugas TPA:** dapat mencatat aktivitas
- **Pemeriksa:** dapat memverifikasi dan mengunci perjalanan
- **Supervisor:** dapat melihat semua catatan dan laporan

Lihat [Peran & Akses](/memulai/peran-akses) untuk detail lengkap tentang izin di SWAT.
