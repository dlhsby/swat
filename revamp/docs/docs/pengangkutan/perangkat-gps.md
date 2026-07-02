---
title: Perangkat GPS
sidebar_label: Perangkat GPS
sidebar_position: 4
---

# Perangkat GPS

![Perangkat GPS](/img/web/tracking-devices.png)

## Tujuan

**Perangkat GPS** adalah titik integrasi untuk mendaftarkan dan mengelola pelacak lokasi (GPS tracker) yang dipasang di kendaraan. Setiap kendaraan dapat memiliki satu atau lebih perangkat pelacak (hardware GPS dari GPS.id atau aplikasi ponsel di masa depan). Layar ini memungkinkan Anda untuk mendaftarkan perangkat baru, mencocokkan IMEI dengan kendaraan, dan mengelola status perangkat.

## Mengapa Perangkat GPS Penting?

Perangkat GPS memungkinkan SWAT untuk:

- **Melacak lokasi kendaraan secara real-time** saat melakukan pengangkutan sampah
- **Mendeteksi penyimpangan rute:** Jika kendaraan keluar dari rute yang direncanakan, sistem akan memberi tahu
- **Mengukur efisiensi:** Menghitung waktu terbuang, jarak terbuang, dan bahan bakar terbuang
- **Memberikan visibilitas operasional:** Supervisor dapat melihat posisi seluruh armada dalam satu peta

## Tugas Utama

### Melihat Daftar Perangkat GPS

Tabel menampilkan semua perangkat GPS yang terdaftar dengan kolom:

- **Kendaraan:** Nomor plat dan model kendaraan
- **IMEI / ID:** Nomor identitas perangkat (IMEI untuk hardware GPS, atau ID aplikasi untuk ponsel)
- **Jenis:** Tipe perangkat (`Perangkat keras GPS` atau `Aplikasi ponsel`)
- **Penyedia:** Penyedia layanan pelacakan (misal: `gpsid` untuk GPS.id)
- **Prioritas:** Angka prioritas (lebih rendah = lebih disukai; hardware biasanya 0, ponsel 10)
- **Aktif:** Apakah perangkat saat ini aktif atau tidak
- **Status:** `Online` (menerima sinyal) atau `Offline` (tidak ada sinyal terbaru)
- **Aksi:** Tombol untuk menyunting atau menghapus

### Mendaftarkan Perangkat GPS Baru

Klik tombol **+ Daftarkan Perangkat** (jika Anda memiliki izin yang tepat) untuk membuka formulir pendaftaran.

Formulir akan meminta:

1. **Kendaraan** (wajib): Pilih kendaraan dari dropdown. Telusuri dengan mengetikkan nomor plat atau nama model.
2. **ID Perangkat** (wajib): Nomor unik perangkat, misal IMEI untuk hardware GPS (6–20 digit angka). Tidak dapat diubah setelah pendaftaran.
3. **IMEI** (opsional): Jika perangkat adalah hardware GPS, IMEI biasanya di-copy otomatis dari ID Perangkat. Anda dapat mengubahnya jika perlu.
4. **Jenis Perangkat** (wajib): Pilih `Perangkat keras GPS` atau `Aplikasi ponsel`
5. **Penyedia** (wajib): Nama penyedia layanan, misal `gpsid` untuk GPS.id
6. **Prioritas** (wajib): Angka 0–100, semakin rendah semakin disukai
   - **Hardware GPS:** gunakan 0
   - **Aplikasi ponsel:** gunakan 10 atau lebih tinggi
7. **Aktif** (wajib): Toggle untuk mengaktifkan atau menonaktifkan perangkat

**Contoh:**

- Kendaraan: `B-1234-ABC`
- ID Perangkat: `867555040123456`
- Jenis: `Perangkat keras GPS`
- Penyedia: `gpsid`
- Prioritas: `0`
- Aktif: `Ya`

Setelah berhasil didaftarkan, perangkat akan mulai mengirim data lokasi ke SWAT (jika sudah dikonfigurasi di sisi hardware).

### Menyunting Perangkat GPS

Klik **Sunting** pada baris perangkat untuk membuka formulir suntingan. Anda dapat mengubah:

- **IMEI:** Jika hardware diubah atau diperbaharui
- **Penyedia:** Jika mengalih ke penyedia baru
- **Prioritas:** Jika menambah perangkat baru (misal, menambah aplikasi ponsel ke hardware yang ada)
- **Aktif:** Menonaktifkan perangkat tanpa menghapusnya

Field **Kendaraan** dan **ID Perangkat** tidak dapat disunting untuk menjaga integritas referensi.

### Menghapus Perangkat GPS

Klik **Hapus** pada baris perangkat untuk menghapusnya dari sistem. Sistem akan menampilkan konfirmasi sebelum penghapusan. Tindakan ini tidak dapat dibatalkan.

### Mencocokkan Perangkat yang Belum Terdaftar

Jika perangkat hardware GPS mengirim sinyal tetapi belum terdaftar (nomor IMEI tidak dikenal), sistem akan mencatat sebagai **perangkat yang belum cocok** (unmatched device) di antrian operasi.

Untuk mencocokkan:

1. Klik tombol **Perangkat Belum Cocok** (jika tombol ini tersedia)
2. Sistem akan menampilkan daftar perangkat yang mengirim sinyal tetapi IMEI-nya tidak terdaftar
3. Untuk setiap perangkat, pilih **Kendaraan** yang sesuai
4. Klik **Cocokkan** untuk menghubungkan IMEI ke kendaraan

Setelah dicocokkan, perangkat akan langsung aktif melacak posisi kendaraan.

## Aturan Penting

- **Satu hardware GPS aktif per kendaraan:** Sistem memastikan hanya satu perangkat hardware GPS aktif per kendaraan pada suatu waktu. Jika menambah perangkat baru, nonaktifkan perangkat lama terlebih dahulu.
- **Ponsel dapat ditambah nanti:** Arsitektur mendukung menambah aplikasi ponsel (prioritas lebih tinggi) nanti tanpa mengubah hardware yang ada.
- **Prioritas untuk pemilihan sumber:** Saat kendaraan memiliki beberapa perangkat, sistem memilih sumber dengan prioritas **paling rendah** yang masih online. Jika hardware offline, sistem akan beralih ke ponsel.
- **Status online/offline:** Ditentukan oleh waktu sinyal terakhir diterima. Jika sinyal tidak diterima dalam `GPS_DEVICE_OFFLINE_MINUTES` (biasanya 5–10 menit), perangkat dianggap offline.

## Alur Integrasi GPS.id

1. **Pasang hardware** di kendaraan
2. **Konfigurasi di portal GPS.id** untuk mengirim sinyal ke SWAT webhook
3. **Daftarkan perangkat** di SWAT dengan nomor IMEI
4. **Verifikasi status**: Tunggu status menjadi `Online` di layar ini
5. **Sistem mulai melacak**: SWAT menerima posisi real-time dan mulai membandingkan dengan rute yang direncanakan

## Izin Akses

- **`gps-device:read`** — Melihat daftar perangkat GPS
- **`gps-device:create`** — Mendaftarkan perangkat baru
- **`gps-device:update`** — Menyunting perangkat yang ada

Lihat [Peran & Akses](/memulai/peran-akses) untuk detail lengkap tentang izin di SWAT.
