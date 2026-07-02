---
title: Template Jadwal Pengangkutan
sidebar_label: Template Jadwal Pengangkutan
sidebar_position: 5
---

# Template Jadwal Pengangkutan

Buat template jadwal harian untuk pasangan kendaraan dan pengemudi, lengkap dengan rencana perjalanan (template perjalanan) yang spesifik untuk setiap hari.

![Halaman template jadwal pengangkutan](/img/web/schedule-templates.png)

## Menambah template jadwal

1. Klik tombol **Tambah Template Jadwal Pengangkutan** di bagian atas halaman.
2. Isi data template:
   - **Kendaraan** — pilih kendaraan yang digunakan (ditampilkan dengan nomor polisi)
   - **Pengemudi** — pilih pengemudi yang ditugaskan untuk kendaraan ini
   - **Berangkat** — waktu keberangkatan dari pool (format HH:mm, contoh: 06:00)
   - **Kembali** — waktu kembali ke pool (format HH:mm, contoh: 16:30)

   :::note Validasi waktu
   Sistem memastikan waktu berangkat lebih awal dari waktu kembali.
   :::

3. Klik **Simpan** untuk menyelesaikan pendaftaran template.

Setelah template jadwal dibuat, Anda dapat menambahkan template perjalanan (rute spesifik yang diikuti setiap hari).

## Mengelola template perjalanan

Setiap template jadwal dapat memiliki beberapa template perjalanan yang menggambarkan rute harian yang harus diikuti:

1. Di daftar template jadwal, klik menu **Kelola Template Perjalanan** di baris template.
2. Panel manajemen template perjalanan akan terbuka di sebelah kanan.
3. Tambah template perjalanan baru dengan:
   - **Rute** — pilih rute (contoh: "Berangkat Pool", "Ambil Sampah", "Buang ke TPA", "Kembali Pool")
   - **Urutan** — nomor urut perjalanan dalam sehari

   Sistem akan memvalidasi urutan rute untuk memastikan logika perjalanan wajar (misalnya, harus dimulai dari "Berangkat Pool").

4. Klik **Simpan Perjalanan** untuk menambah template perjalanan.
5. Anda dapat menghapus template perjalanan yang tidak lagi diperlukan.

## Mengubah template jadwal

1. Dari daftar template jadwal, klik ikon **Edit** di baris yang ingin diubah.
2. Perbarui kendaraan, pengemudi, atau waktu berangkat/kembali.
3. Klik **Simpan** untuk menyimpan perubahan.

## Menghapus template jadwal

1. Klik ikon **Hapus** di baris template jadwal.
2. Konfirmasi penghapusan.

Template jadwal dan semua template perjalanan yang terkait akan dihapus.

## Melihat detail template

Klik ikon **Lihat** di baris template jadwal untuk melihat semua data dalam mode baca-saja. Anda akan melihat kendaraan, pengemudi, waktu, dan daftar template perjalanan yang terkait.

## Mencari template jadwal

Gunakan kotak pencarian untuk menemukan template berdasarkan nomor polisi kendaraan atau nama pengemudi.

## Kolom di daftar

| Kolom                   | Penjelasan                                                    |
| ----------------------- | ------------------------------------------------------------- |
| **Kendaraan**           | Nomor polisi kendaraan (ditampilkan dengan font monospace)    |
| **Pengemudi**           | Nama pengemudi yang ditugaskan                                |
| **Berangkat**           | Waktu keberangkatan dari pool (HH:mm)                         |
| **Kembali**             | Waktu kembali ke pool (HH:mm)                                 |
| **Template Perjalanan** | Jumlah template perjalanan yang ada untuk template jadwal ini |

## Izin yang diperlukan

- **Melihat daftar** — izin `schedule-template:read`
- **Menambah template** — izin `schedule-template:create`
- **Mengubah template** — izin `schedule-template:update`
- **Menghapus template** — izin `schedule-template:delete`
- **Mengelola template perjalanan** — izin `trip-template:read`, `trip-template:create`, `trip-template:update`, `trip-template:delete`

Lihat [Peran & Hak Akses](/memulai/peran-akses) untuk informasi lebih lanjut tentang izin pengguna.

## Penggunaan di penjadwalan

Template jadwal digunakan sebagai dasar saat membuat jadwal harian di halaman **Penjadwalan**. Anda dapat menggunakan kembali template untuk hari-hari yang sama pola operasionalnya, atau menyesuaikan untuk kebutuhan spesifik.
