---
title: Pengguna
sidebar_label: Pengguna
sidebar_position: 1
---

# Pengguna

Halaman **Pengguna** memungkinkan administrator mengelola akun pengguna sistem. Anda dapat membuat pengguna baru, mengubah detail pengguna, menetapkan peran, menghapus akun, dan mereset kata sandi.

![Daftar Pengguna](/img/web/users.png)

## Tugas utama

### Membuat pengguna baru

1. Klik tombol **Tambah Pengguna**.
2. Isi form:
   - **Nama**: nama lengkap pengguna (contoh: "Budi Santoso")
   - **Nama Pengguna**: identifier unik (@username), minimal 3 karakter
   - **Peran**: pilih peran dari daftar (misalnya "Operator", "Supervisor")
3. Klik **Simpan**.
4. Sistem akan menampilkan **kata sandi sementara** (hanya sekali saja). Salin dan bagikan dengan aman ke pengguna.
5. Pengguna wajib mengganti kata sandi saat masuk pertama kali.

### Mengubah detail pengguna

1. Cari pengguna di daftar (gunakan kotak pencarian).
2. Klik ikon **Edit** di baris pengguna.
3. Ubah nama dan/atau peran pengguna.
4. Klik **Simpan**.

### Menghapus pengguna

1. Cari pengguna yang ingin dihapus.
2. Klik ikon **Edit** (atau **Lainnya** → **Hapus**).
3. Klik tombol **Hapus** di dialog.
4. Konfirmasi penghapusan.

Penghapusan bersifat permanen dan akan mencegah pengguna untuk masuk.

### Mereset kata sandi

Jika seorang pengguna lupa kata sandi atau Anda ingin memaksa mereka untuk mengubahnya:

1. Cari pengguna di daftar.
2. Klik ikon **Lainnya** (⋮) → **Reset paksa kata sandi**.
3. Konfirmasi tindakan.
4. Sistem akan menampilkan kata sandi sementara baru. Bagikan dengan aman.
5. Status pengguna akan berubah menjadi "Harus Ubah" sampai mereka login dan mengubah kata sandi.

## Informasi kolom

| Kolom             | Keterangan                                                     |
| ----------------- | -------------------------------------------------------------- |
| **Nama**          | Nama lengkap pengguna dengan avatar awal.                      |
| **Nama Pengguna** | Username unik (@) untuk login.                                 |
| **Peran**         | Peran/hak akses yang ditetapkan.                               |
| **Status**        | "Aktif" = normal; "Harus Ubah" = wajib ganti sandi saat login. |

## Izin yang diperlukan

Anda memerlukan izin `user:read` untuk melihat halaman ini. Tindakan spesifik membutuhkan:

- **Membuat pengguna**: `user:create`
- **Mengubah pengguna**: `user:update`
- **Menghapus pengguna**: `user:delete`
- **Reset kata sandi**: `user:manage`

Jika tombol atau menu tidak muncul, hubungi administrator untuk menambahkan izin ke peran Anda. Lihat [Peran & Hak Akses](/memulai/peran-akses) untuk informasi lebih lanjut.

## Tips

:::note
Setiap pengguna baru **wajib** mengubah kata sandi saat login pertama. Jangan bagikan kata sandi yang ditampilkan melalui saluran yang tidak aman.
:::

:::tip
Gunakan kotak pencarian untuk menemukan pengguna dengan cepat berdasarkan nama atau username.
:::
