---
title: Sumber Sampah
sidebar_label: Sumber Sampah
sidebar_position: 4
---

# Sumber Sampah

Kelola daftar sumber sampah yang dapat ditangani oleh armada. Setiap sumber sampah memiliki kode unik dan deskripsi untuk identifikasi di lapangan.

![Halaman sumber sampah](/img/web/waste-sources.png)

## Menambah sumber sampah

1. Klik tombol **Tambah Sumber Sampah** di bagian atas halaman.
2. Isi data sumber sampah:
   - **Kode** — kode singkat sumber sampah (max 5 karakter), contoh: D, R, PS, PU, PL, S
     - **D** — Domisili (rumah tangga)
     - **R** — Rumah Sakit
     - **PS** — Pasar Sampah
     - **PU** — Pabrik/Unit Industri
     - **PL** — Pabrik Lainnya
     - **S** — Sekolah
   - **Nama** — nama lengkap sumber sampah (max 128 karakter)
   - **Catatan** (opsional) — keterangan tambahan tentang sumber sampah

3. Klik **Simpan** untuk menyelesaikan pendaftaran.

Sistem akan mencegah jika kode sudah terdaftar. Pastikan kode unik.

## Mengubah sumber sampah

1. Dari daftar sumber sampah, klik ikon **Edit** di baris sumber yang ingin diubah.
2. Perbarui data yang diperlukan.
3. Klik **Simpan** untuk menyimpan perubahan.

## Menghapus sumber sampah

1. Klik ikon **Hapus** di baris sumber sampah.
2. Konfirmasi penghapusan.

Sumber sampah hanya dapat dihapus jika tidak digunakan oleh kendaraan manapun. Jika masih digunakan, Anda akan mendapat pesan bahwa sumber sampah tidak dapat dihapus dan menunjukkan berapa banyak kendaraan yang menggunakannya.

## Melihat detail

Klik ikon **Lihat** di baris sumber sampah untuk melihat semua data dalam mode baca-saja.

## Mencari sumber sampah

Gunakan kotak pencarian untuk menemukan sumber sampah berdasarkan kode atau nama.

## Kolom di daftar

| Kolom       | Penjelasan                                                                   |
| ----------- | ---------------------------------------------------------------------------- |
| **Kode**    | Kode unik singkat sumber sampah (ditampilkan dengan latar belakang berwarna) |
| **Nama**    | Nama lengkap sumber sampah                                                   |
| **Catatan** | Keterangan tambahan jika ada                                                 |

## Menghubungkan ke kendaraan

Setelah membuat sumber sampah, Anda dapat menghubungkannya ke kendaraan di halaman [Kendaraan](/data-master/kendaraan):

1. Edit kendaraan yang ingin ditambahkan sumber sampah.
2. Buka tab **Sumber Sampah**.
3. Centang sumber sampah mana saja yang dapat diolah kendaraan ini.
4. Simpan.

Satu kendaraan dapat menangani beberapa sumber sampah, dan satu sumber sampah dapat ditangani oleh beberapa kendaraan.

## Izin yang diperlukan

- **Melihat daftar** — izin `waste-source:read`
- **Menambah sumber sampah** — izin `waste-source:create`
- **Mengubah sumber sampah** — izin `waste-source:update`
- **Menghapus sumber sampah** — izin `waste-source:delete`

Lihat [Peran & Hak Akses](/memulai/peran-akses) untuk informasi lebih lanjut tentang izin pengguna.
