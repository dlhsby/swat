---
title: Akun Layanan
sidebar_label: Akun Layanan
sidebar_position: 3
---

# Akun Layanan

Halaman **Akun Layanan** digunakan untuk membuat dan mengelola kredensial API bagi sistem eksternal atau klien native (seperti aplikasi desktop .NET). Akun layanan menggunakan **API key** (token autentikasi) bukan username/password.

![Daftar Akun Layanan](/img/web/service-accounts.png)

## Konsep dasar

- **Akun layanan**: identitas untuk sistem eksternal (bukan pengguna manusia).
- **API key**: kredensial unik yang digunakan untuk mengakses API (ditampilkan hanya satu kali saat dibuat).
- **Peran**: akun layanan diberi peran seperti pengguna biasa, yang menentukan izin/akses.
- **Batas laju**: jumlah permintaan API yang diizinkan per menit (rate limiting).
- **IP yang diizinkan**: pembatasan IP asal permintaan (opsional; kosongkan untuk membolehkan semua IP).
- **Status**: "Aktif" = dapat digunakan; "Dicabut" = tidak dapat digunakan lagi (permanen).

## Tugas utama

### Membuat akun layanan baru

1. Klik tombol **Tambah Akun Layanan**.
2. Isi form:
   - **Nama**: deskripsi akun (contoh: "Klien Timbang TPA Jembatan", "Sistem Integrasi GPS").
   - **Peran**: pilih peran yang sesuai dengan hak akses yang diperlukan.
   - **Batas permintaan / menit**: jumlah maksimal API call per menit (contoh: 500).
   - **Daftar IP yang diizinkan**: (opsional) masukkan IP asal yang diizinkan, pisahkan dengan koma. Kosongkan untuk membolehkan semua IP (contoh: `10.0.0.5, 10.0.0.6`).
3. Klik **Simpan**.
4. Sistem akan menampilkan **API key** baru (hanya sekali). Salin dan simpan di tempat aman.
5. Bagikan API key ke sistem/klien yang membutuhkan.

:::danger API key ditampilkan sekali saja
Jangan menutup dialog sebelum menyalin API key. Jika hilang, Anda harus membuat akun layanan baru.
:::

### Mengubah detail akun layanan

1. Cari akun layanan di daftar.
2. Klik ikon **Edit**.
3. Ubah:
   - Nama akun.
   - Peran (hak akses).
   - Batas permintaan per menit.
   - Daftar IP yang diizinkan.
4. Klik **Simpan**.

**Catatan**: API key lama tetap valid setelah perubahan kecuali akun dicabut.

### Mencabut akun layanan

Jika akun sudah tidak digunakan atau ada masalah keamanan:

1. Cari akun di daftar.
2. Klik ikon **Edit** (atau **Lainnya** → **Cabut**).
3. Klik tombol **Cabut**.
4. Konfirmasi.

Setelah dicabut:

- API key tidak dapat digunakan lagi.
- Status berubah menjadi "Dicabut" (merah).
- Tindakan ini **tidak dapat dibatalkan**.

### Melihat log audit API

Untuk melihat riwayat penggunaan API dan detail permintaan:

1. Klik tombol **Log Audit API** di bagian atas halaman.
2. Tinjau entri log yang menampilkan:
   - Akun layanan mana yang digunakan.
   - Endpoint API apa yang dipanggil.
   - Waktu permintaan.
   - Status respons (sukses/error).

## Informasi kolom

| Kolom                | Keterangan                                                        |
| -------------------- | ----------------------------------------------------------------- |
| **Nama**             | Nama akun layanan.                                                |
| **API Key**          | Awalan kunci (hanya karakter pertama ditampilkan untuk keamanan). |
| **Peran**            | Peran yang ditetapkan (menentukan hak akses).                     |
| **Batas/menit**      | Jumlah maksimal permintaan per menit.                             |
| **Status**           | "Aktif" = dapat digunakan; "Dicabut" = tidak valid.               |
| **Terakhir dipakai** | Tanggal terakhir API key digunakan.                               |

## Izin yang diperlukan

Anda memerlukan izin `service-account:read` untuk melihat halaman ini. Tindakan spesifik membutuhkan:

- **Membuat akun layanan**: `service-account:create`
- **Mengubah akun**: `service-account:update`
- **Mencabut akun**: `service-account:delete`
- **Melihat log audit**: `service-account:read`

Jika tombol atau menu tidak muncul, hubungi administrator untuk menambahkan izin ke peran Anda. Lihat [Peran & Hak Akses](/memulai/peran-akses) untuk informasi lebih lanjut.

## Keamanan

:::warning API key adalah rahasia
Jangan bagikan API key dengan siapa pun yang tidak perlu. Perlakukan seperti password.
:::

:::tip Rotasi kredensial secara berkala
Jika Anda curiga API key telah dikompromikan:

1. Buat akun layanan baru dengan API key baru.
2. Perbarui sistem/klien untuk menggunakan key baru.
3. Cabut akun lama.
   :::

:::note Pantau penggunaan
Gunakan kolom "Terakhir dipakai" untuk memastikan akun masih aktif digunakan. Cabut akun yang tidak lagi diperlukan.
:::

## Tips

- **Beri nama deskriptif**: gunakan nama yang jelas tentang apa sistem/klien yang akan menggunakan akun ini.
- **Batas laju yang tepat**: tetapkan batas yang cukup untuk kebutuhan tetapi tidak berlebihan.
- **IP whitelist jika memungkinkan**: batasi ke IP asal yang diketahui untuk keamanan tambahan.
