---
title: Jatah Kitir
sidebar_label: Jatah Kitir
sidebar_position: 3
---

# Jatah Kitir

![Jatah Kitir](/img/web/disposal-permits.png)

## Tujuan

**Jatah Kitir** (Disposal Permit) adalah perizinan pengoperan sampah yang mengotorisasi kendaraan tertentu untuk membuang sampah ke lokasi tertentu (biasanya TPA) dalam rentang tanggal tertentu. Jatah Kitir adalah **kredensial resmi** yang diverifikasi saat kendaraan tiba di TPA; tanpanya, TPA tidak akan menerima sampah dari kendaraan tersebut.

Layar ini memungkinkan Anda untuk mengelola daftar jatah kitir, membuat jatah baru, mengimpor jatah dari file massal, dan menonaktifkan jatah yang kadaluarsa.

## Tugas Utama

### Melihat Daftar Jatah Kitir

Tabel menampilkan semua jatah kitir dengan kolom:

- **Kendaraan:** Nomor plat kendaraan
- **Lokasi:** Nama TPA atau lokasi pembuangan
- **Status:** `Berlaku` (aktif) atau `Tidak Berlaku` (tidak aktif)
- **Berlaku Dari:** Tanggal mulai periode berlaku
- **Berlaku Sampai:** Tanggal akhir periode berlaku
- **Tanggal Terbit:** Kapan jatah kitir ini dibuat
- **Aksi:** Tombol untuk menyunting atau menghapus

### Filter dan Pencarian

Gunakan toolbar filter untuk menyaring jatah berdasarkan:

- **Status:** Hanya tampilkan jatah aktif, tidak aktif, atau keduanya
- Gunakan kolom **pencarian** untuk menemukan kendaraan berdasarkan nomor plat atau nama TPA

### Membuat Jatah Kitir Baru

Klik tombol **+ Terbitkan Jatah Kitir** (jika Anda memiliki izin yang tepat) untuk membuka formulir pembuatan jatah baru.

Formulir akan meminta:

1. **Kendaraan** (wajib): Pilih dari dropdown daftar kendaraan yang tersedia
2. **Lokasi** (wajib): Pilih TPA atau lokasi pembuangan (biasanya disortir sebagai tipe lokasi "TPA")
3. **Berlaku Dari** (wajib): Tanggal mulai periode berlaku (date picker)
4. **Berlaku Sampai** (wajib): Tanggal akhir periode berlaku (date picker)
5. **Status** (wajib): Pilih `Berlaku` atau `Tidak Berlaku`

**Validasi:**

- Tanggal "Berlaku Sampai" harus sama atau setelah "Berlaku Dari"
- Tanggal "Terbit" tidak boleh setelah "Berlaku Sampai"
- Semua field wajib diisi

Setelah berhasil dibuat, sistem akan menampilkan **kode kitir** yang di-generate otomatis (format: `KT-YYYYMM-NNN`). Kode ini digunakan di TPA untuk verifikasi.

### Menyunting Jatah Kitir

Klik **Sunting** pada baris jatah untuk membuka formulir suntingan. Biasanya, hanya beberapa field yang dapat disunting:

- **Status:** Ubah menjadi Tidak Berlaku untuk menonaktifkan jatah
- **Berlaku Sampai:** Perpanjang atau ubah tanggal akhir

Field lain (Kendaraan, Lokasi, Berlaku Dari) tidak dapat disunting setelah pembuatan untuk menjaga integritas audit.

### Menghapus Jatah Kitir

Klik **Hapus** pada baris jatah untuk menghapusnya. Tindakan ini tidak dapat dibatalkan. Sistem akan menampilkan konfirmasi sebelum penghapusan.

### Impor Massal (Bulk Import)

Jika Anda memiliki data jatah kitir dalam jumlah besar (dari sistem legacy atau file spreadsheet), gunakan **Impor Massal**.

#### Langkah-langkah:

1. Klik tombol **Impor Massal** (jika Anda memiliki izin `disposal-permit:create`)
2. **Unggah file** (CSV atau Excel) dengan kolom:
   - `kendaraan` atau `plateNumber`: Nomor plat kendaraan
   - `lokasi` atau `siteName`: Nama TPA/lokasi
   - `berlakuDari` atau `validFrom`: Tanggal format YYYY-MM-DD
   - `berlakuSampai` atau `validTo`: Tanggal format YYYY-MM-DD
   - `status`: `ACTIVE` atau `INACTIVE`
   - `kode` (opsional): Kode kitir yang sudah ada

3. **Pratinjau:** Sistem menampilkan 10 baris pertama untuk verifikasi
4. **Pilih strategi impor:**
   - **Lewatkan jika ada:** Jangan ubah jatah yang sudah ada
   - **Perbarui jika ada:** Perbarui jatah yang sudah ada berdasarkan `legacyId` atau identitas yang cocok
5. **Impor:** Klik untuk memulai

Sistem akan menampilkan:

- **Progress bar** untuk file besar
- **Ringkasan hasil:** Berapa jatah berhasil diimpor, duplikat, dan error
- **Log error:** File CSV yang dapat diunduh berisi baris yang gagal dan alasannya

## Aturan Bisnis Penting

- **Satu jatah aktif per kendaraan per lokasi:** Sistem tidak memperbolehkan dua jatah aktif untuk kendaraan dan lokasi yang sama pada periode yang tumpang tindih.
- **Pengoperan otomatis:** Jatah dengan **Berlaku Sampai** lebih awal dari hari ini dianggap **kadaluarsa**. TPA akan menolak kendaraan dengan jatah yang kadaluarsa.
- **Verifikasi di TPA:** Saat kendaraan tiba di TPA, petugas TPA akan memindai kode kitir (QR code) atau memasukkan nomor plat untuk memverifikasi bahwa jatah valid dan aktif.

## Izin Akses

- **`disposal-permit:read`** — Melihat daftar jatah kitir
- **`disposal-permit:create`** — Membuat jatah baru dan mengimpor massal
- **`disposal-permit:update`** — Menyunting dan menonaktifkan jatah

Lihat [Peran & Akses](/memulai/peran-akses) untuk detail lengkap tentang izin di SWAT.
