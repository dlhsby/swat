---
title: Kendaraan
sidebar_label: Kendaraan
sidebar_position: 1
---

# Kendaraan

Kelola seluruh armada kendaraan yang digunakan untuk pengangkutan sampah. Halaman ini menampilkan daftar kendaraan dengan status kondisi, lokasi pool, odometer, dan tanggal kadaluarsa STNK serta pajak.

![Halaman kendaraan](/img/web/vehicles.png)

## Menambah kendaraan

1. Klik tombol **Tambah Kendaraan** di bagian atas halaman.
2. Isi data dasar kendaraan:
   - **Nomor Polisi** — format: 1-2 huruf + spasi + 1-4 angka + spasi + 1-3 huruf (contoh: `L 1234 AB`)
   - **Nomor Chassis** — nomor rangka dari dokumen BPKB
   - **Nomor Mesin** — nomor mesin kendaraan
   - **Tahun Pembuatan** (opsional)
   - **Odometer Sekarang** — pembacaan kilometer saat ini
   - **Berat Kosong Sekarang** — berat kendaraan tanpa muatan (kg)
   - **Pool** — lokasi pool dimana kendaraan disimpan
   - **Status** — BAIK, KERUSAKAN RINGAN, KERUSAKAN BERAT, atau HILANG

3. Lanjut ke tab **Model & Spesifikasi**:
   - **Aplikasi** — tipe bodi kendaraan (Kompactor, Dump Truck, Arm Roll, dll)
   - **Model** — pilih model sesuai aplikasi (akan mengisi otomatis brand, kapasitas tangki, dan berat kosong standar)
   - **Rasio Bahan Bakar Sekarang** — efisiensi bahan bakar saat ini (km per liter), dapat disesuaikan jika kondisi kendaraan berubah
   - **Kadaluarsa STNK** — tanggal kadaluarsa pajak kendaraan
   - **Kadaluarsa Pajak** — tanggal kadaluarsa pajak tahunan

   :::warning Perhatian tanggal kadaluarsa
   Sistem akan menampilkan peringatan kuning jika tanggal kadaluarsa kurang dari 30 hari. Pastikan untuk memperbarui dokumen sebelum kadaluarsa.
   :::

4. Tab **Sumber Sampah** — pilih sumber sampah mana saja yang dapat diolah kendaraan ini (Domisili, Rumah Sakit, Pasar Sampah, Pabrik, dll).

5. Tab **Foto** — unggah foto kendaraan untuk dokumentasi (opsional).

6. Klik **Simpan** untuk menyelesaikan pendaftaran.

Sistem akan mencegah jika nomor polisi sudah terdaftar. Periksa kembali format dan nomor Anda.

## Mengubah kendaraan

1. Dari daftar kendaraan, klik ikon **Edit** di baris kendaraan yang ingin diubah.
2. Perbarui data yang diperlukan — Anda dapat mengubah semua field kecuali nomor polisi.
3. Klik **Simpan** untuk menyimpan perubahan.

Ubah odometer, berat kosong, dan status kendaraan sesuai kondisi terkini.

## Menghapus kendaraan

1. Klik ikon **Hapus** di baris kendaraan.
2. Konfirmasi penghapusan.

Kendaraan akan dihapus dari sistem namun riwayat transaksi yang merujuk kendaraan ini tetap terjaga untuk audit.

## Melihat detail kendaraan

Klik ikon **Lihat** di baris kendaraan untuk melihat semua data kendaraan dalam mode baca-saja. Anda tidak dapat mengubah data di mode ini.

## Mencari dan menyaring

- **Kotak pencarian** — cari berdasarkan nomor polisi, nomor chassis, atau nomor mesin.
- **Saring status** — tampilkan hanya kendaraan dengan status tertentu (BAIK, KERUSAKAN RINGAN, dll).
- **Saring pool** — tampilkan hanya kendaraan di pool tertentu.

## Kolom di daftar

| Kolom                | Penjelasan                                           |
| -------------------- | ---------------------------------------------------- |
| **Nomor Polisi**     | Identitas unik kendaraan                             |
| **Model / Brand**    | Merek dan model kendaraan                            |
| **Status**           | Kondisi kendaraan saat ini (warna merah jika HILANG) |
| **Pool**             | Lokasi pool tempat kendaraan disimpan                |
| **Odometer**         | Pembacaan kilometer terakhir                         |
| **Berat Kosong**     | Berat kendaraan tanpa muatan (kg)                    |
| **Kadaluarsa STNK**  | Tanggal kadaluarsa STNK (kuning jika ≤30 hari)       |
| **Kadaluarsa Pajak** | Tanggal kadaluarsa pajak (kuning jika ≤30 hari)      |

## Izin yang diperlukan

- **Melihat daftar** — izin `vehicle:read`
- **Menambah kendaraan** — izin `vehicle:create`
- **Mengubah kendaraan** — izin `vehicle:update`
- **Menghapus kendaraan** — izin `vehicle:delete`

Lihat [Peran & Hak Akses](/memulai/peran-akses) untuk informasi lebih lanjut tentang izin pengguna.

## Tab lain di halaman Kendaraan

Halaman ini juga berisi tab untuk mengelola data terkait armada:

- **Tipe Kendaraan** — tipe bodi/aplikasi (Kompactor, Dump Truck, Arm Roll, dll)
- **Model Kendaraan** — spesifikasi teknis model (brand, kapasitas tangki, berat kosong standar)
- **Bahan Bakar** — jenis bahan bakar yang tersedia (Premium, Solar, Pertalite, dll) dan harga per liter
