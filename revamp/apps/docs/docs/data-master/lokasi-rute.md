---
title: Lokasi & Rute
sidebar_label: Lokasi & Rute
sidebar_position: 3
---

# Lokasi & Rute

Kelola lokasi strategis (pool, SPBU, TPS, TPA) dan rute perjalanan kendaraan antar lokasi. Rute membentuk rangkaian perjalanan harian dari keberangkatan pool hingga kembali.

![Halaman lokasi & rute](/img/web/sites-routes.png)

## Tab Lokasi

### Menambah lokasi

1. Pilih tab **Lokasi** dan klik tombol **Tambah Lokasi**.
2. Isi data lokasi:
   - **Jenis Lokasi** — pilih salah satu:
     - **Pool** — tempat penyimpanan dan keberangkatan kendaraan
     - **SPBU** — stasiun pengisian bahan bakar
     - **TPS** — tempat pemungutan sementara sampah
     - **TPA** — tempat pemrosesan akhir sampah
   - **Nama** — nama lokasi (contoh: "Pool Utama", "SPBU Jalan Merdeka")
   - **Alamat** (opsional) — alamat lengkap lokasi

3. Tambahkan koordinat (opsional):
   - **Lintang & Bujur** — manual masukkan atau gunakan peta interaktif
   - **Peta interaktif** — klik pada peta untuk menempatkan pin lokasi, atau gunakan pencarian alamat

4. Klik **Simpan**.

:::tip Gunakan peta untuk akurasi
Klik pin pada peta untuk menentukan lokasi dengan akurat. Koordinat akan ditampilkan saat kendaraan melakukan GPS tracking.
:::

### Mengubah dan menghapus lokasi

- **Edit** — klik ikon edit untuk mengubah data lokasi.
- **Hapus** — klik ikon hapus untuk menghapus lokasi (hanya jika lokasi tidak digunakan di rute manapun).

### Mencari lokasi

Gunakan kotak pencarian untuk menemukan lokasi berdasarkan nama.

## Tab Rute

Rute menghubungkan dua lokasi dalam urutan tertentu. Setiap rute memiliki kategori yang menentukan tujuan perjalanan.

### Jenis rute

| Jenis Rute         | Asal           | Tujuan | Penjelasan                                                     |
| ------------------ | -------------- | ------ | -------------------------------------------------------------- |
| **Berangkat Pool** | Pool           | —      | Keberangkatan dari pool (destinasi otomatis ke pool yang sama) |
| **Isi BBM**        | Lokasi manapun | SPBU   | Berhenti untuk mengisi bahan bakar                             |
| **Ambil Sampah**   | Lokasi manapun | TPS    | Mengambil sampah dari TPS                                      |
| **Buang ke TPA**   | Lokasi manapun | TPA    | Membuang sampah ke TPA                                         |
| **Kembali Pool**   | Lokasi manapun | Pool   | Kembali ke pool untuk parkir                                   |

### Menambah rute

1. Pilih tab **Rute** dan klik tombol **Tambah Rute**.
2. Isi data rute:
   - **Jenis Rute** — pilih kategori (Berangkat Pool, Isi BBM, Ambil Sampah, Buang ke TPA, Kembali Pool)
   - **Lokasi Asal** — lokasi awal (tipe lokasi ditentukan otomatis oleh kategori)
   - **Lokasi Tujuan** — lokasi akhir (tidak ditampilkan jika "Berangkat Pool")

   Sistem akan membatasi pilihan lokasi berdasarkan jenis rute Anda pilih. Misalnya, "Isi BBM" hanya memungkinkan SPBU sebagai tujuan.

3. **Jarak** — jarak antar lokasi dihitung otomatis dari koridor rute (jika sudah ditentukan).

4. Klik **Simpan**.

### Mengatur koridor rute

Koridor adalah garis referensi rute di peta yang digunakan untuk:

- Menghitung jarak antar lokasi
- Memvalidasi deviation kendaraan saat GPS tracking

Setelah membuat rute:

1. Di daftar rute, klik menu **Koridor** di baris rute.
2. Panel editor koridor terbuka dengan peta interaktif.
3. Gambar/edit garis koridor dengan:
   - **Klik di peta** — tambah titik koridor
   - **Drag titik** — pindahkan titik
   - **Hapus titik** — klik titik lalu hapus
4. Klik **Simpan Koridor** untuk menyimpan.

Jarak rute akan diperbarui otomatis berdasarkan panjang koridor yang Anda gambar.

### Mencari dan menyaring rute

- **Kotak pencarian** — cari berdasarkan nama lokasi asal atau tujuan.
- **Filter jenis rute** — tampilkan hanya rute dengan jenis tertentu (Berangkat Pool, Isi BBM, dll).

### Mengubah dan menghapus rute

- **Edit** — klik ikon edit untuk mengubah data rute.
- **Hapus** — klik ikon hapus untuk menghapus rute.

## Kolom di daftar Lokasi

| Kolom         | Penjelasan                                    |
| ------------- | --------------------------------------------- |
| **Nama**      | Nama lokasi                                   |
| **Jenis**     | Jenis lokasi (Pool/SPBU/TPS/TPA)              |
| **Alamat**    | Alamat lengkap (jika ada)                     |
| **Koordinat** | Lintang & bujur; klik pin untuk lihat di peta |

## Kolom di daftar Rute

| Kolom             | Penjelasan                                   |
| ----------------- | -------------------------------------------- |
| **Lokasi Asal**   | Tempat awal perjalanan                       |
| **Lokasi Tujuan** | Tempat akhir perjalanan                      |
| **Jenis**         | Kategori rute (Berangkat Pool, Isi BBM, dll) |
| **Jarak**         | Jarak antar lokasi dalam km                  |

## Izin yang diperlukan

- **Melihat daftar** — izin `site:read`
- **Menambah/mengubah lokasi** — izin `site:create` atau `site:update`
- **Menghapus lokasi** — izin `site:delete`
- **Menambah/mengubah rute** — izin `route:create` atau `route:update`
- **Menghapus rute** — izin `route:delete`
- **Mengelola koridor** — izin `route-geometry:manage`

Lihat [Peran & Hak Akses](/memulai/peran-akses) untuk informasi lebih lanjut tentang izin pengguna.

## Catatan penting

- Lokasi asal dan tujuan harus berbeda, kecuali untuk rute "Berangkat Pool" dan "Kembali Pool" yang merujuk pool yang sama.
- Koordinat jika ditambahkan, harus ada untuk kedua lintang dan bujur (tidak boleh separuh saja).
- Rute tidak boleh dihapus jika masih digunakan oleh template jadwal atau jadwal harian.
