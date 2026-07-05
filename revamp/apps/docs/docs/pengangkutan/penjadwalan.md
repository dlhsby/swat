---
title: Penjadwalan
sidebar_label: Penjadwalan
sidebar_position: 1
---

# Penjadwalan

![Penjadwalan](/img/web/scheduling.png)

## Tujuan

Layar **Penjadwalan** adalah pusat koordinasi harian untuk menginisialisasi dan memantau jadwal pengangkutan sampah setiap hari. Dari sini Anda melihat daftar semua hari transaksi (operational days) dan dapat membuat jadwal untuk hari ini atau melihat detail jadwal hari-hari lainnya.

## Tugas Utama

### Membuat Jadwal Hari Ini

Saat hari baru dimulai (setelah jam 05:00 WIB, konfigurabel), tombol **Buat Jadwal Hari Ini** menjadi aktif di bagian atas layar. Klik tombol ini untuk:

- Menginisialisasi jadwal operasional untuk hari ini
- Mengunduh Pengangkutan Sampah (Haul) dari template jadwal kru yang aktif
- Membuat penugasan pengemudi untuk setiap Pengangkutan Sampah
- Menyusun rute dan target waktu perjalanan

Operasi ini idempoten, artinya cukup aman untuk diklik berkali-kali — sistem hanya akan membuat jadwal hari ini sekali. Tombol otomatis tersembunyi setelah jadwal hari ini dibuat.

### Melihat Daftar Hari Transaksi

Tabel menampilkan semua hari transaksi dengan kolom:

- **Tanggal:** Tanggal operasional (format: DD Bulan YYYY)
- **Status:** `IN_PROGRESS` (sedang berjalan) atau `DONE` (selesai)
- **Kendaraan:** Jumlah kendaraan yang menjadi bagian dari jadwal hari tersebut
- **Tonase:** Total berat sampah yang dikangkut dalam kilogram (diisi saat hari selesai)
- **Aksi:** Tombol "Lihat Board" untuk melihat detail jadwal hari tersebut

Gunakan fitur pencarian di bawah tabel untuk menemukan tanggal spesifik dengan cepat.

### Membuka Detail Jadwal Harian

Klik **Lihat Board** pada baris hari tertentu untuk membuka papan jadwal harian (Daily Haul Board). Di sana Anda dapat:

- Melihat semua kendaraan yang dijadwalkan untuk hari tersebut
- Melihat pengemudi yang ditugaskan
- Mencatat waktu keberangkatan dan kepulangan (actual times)
- Mencatat odometer awal dan akhir
- Melihat semua perjalanan (rute) yang direncanakan
- Memverifikasi status setiap rute

## Informasi Penting

Inisialisasi jadwal **hanya mendukung hari ini** — tidak dapat membuat jadwal untuk hari lampau atau hari di masa depan. Jadwal yang sudah tersimpan dapat ditinjau dan diperbarui kapan saja melalui tombol "Lihat Board".

## Izin Akses

Halaman ini memerlukan izin **`transaction-day:read`** untuk melihat jadwal. Untuk membuat jadwal hari ini, diperlukan izin tambahan **`transaction-day:manage`**.

Lihat [Peran & Akses](/memulai/peran-akses) untuk detail lengkap tentang izin di SWAT.
