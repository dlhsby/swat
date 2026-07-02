---
title: Peran & Hak Akses
sidebar_label: Peran & Hak Akses
sidebar_position: 3
---

# Peran & Hak Akses

SWAT memakai **RBAC** (kontrol akses berbasis peran). Setiap pengguna diberi satu atau
lebih **peran**, dan tiap peran memuat sekumpulan **izin** (misalnya `vehicle:read`,
`monitoring:read`). Menu dan tombol yang Anda lihat mengikuti izin tersebut.

## Bagaimana ini terlihat di aplikasi

- **Menu tersembunyi** — jika peran Anda tidak punya izin `:read` untuk sebuah modul,
  menunya tidak muncul di sidebar (bukan sekadar dinonaktifkan).
- **Aksi terbatas** — Anda mungkin bisa **melihat** data tetapi tidak bisa
  **mengubah**-nya bila hanya memiliki izin baca. Tombol tambah/ubah/hapus muncul
  hanya bila peran Anda memiliki izin `:create` / `:update` / `:delete`.

## Peran umum

Nama peran mengikuti konfigurasi organisasi Anda. Contoh peran yang lazim:

| Peran             | Fokus kerja                                             |
| ----------------- | ------------------------------------------------------- |
| **Administrator** | Akses penuh, termasuk pengelolaan pengguna & hak akses. |
| **Supervisor**    | Memantau kinerja dan menyetujui/meninjau data.          |
| **Operator**      | Mencatat aktivitas pengangkutan harian.                 |
| **Administrasi**  | Mengelola data master & retribusi.                      |
| **Checker**       | Memverifikasi pencatatan di lapangan.                   |
| **Petugas TPA**   | Mencatat sampah masuk di TPA / jatah kitir.             |

> Daftar peran dan izin yang sebenarnya dikelola di
> [Pengguna & Akses → Hak Akses](/pengguna-akses/hak-akses). Administrator dapat
> menyesuaikan izin tiap peran.

:::note Butuh akses lebih?
Jika ada menu atau tombol yang Anda perlukan tetapi tidak tampil, hubungi
administrator untuk menambahkan izin pada peran Anda.
:::
