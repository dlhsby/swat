---
title: Pengemudi
sidebar_label: Pengemudi
sidebar_position: 2
---

# Pengemudi

Kelola data pengemudi yang beroperasi di armada. Setiap pengemudi memiliki informasi pribadi, status kepegawaian, alamat, dan riwayat SIM (Surat Izin Mengemudi).

![Halaman pengemudi](/img/web/drivers.png)

## Menambah pengemudi

1. Klik tombol **Tambah Pengemudi** di bagian atas halaman.
2. Isi data pribadi pengemudi:
   - **Nama** — nama lengkap pengemudi
   - **Nomor KTP** — 16 digit nomor KTP (Kartu Tanda Penduduk)
   - **Pool** — lokasi pool tempat pengemudi bekerja
   - **Status Kepegawaian** — SATGAS, PNS, atau HONORER
   - **Tanggal Lahir** — tanggal lahir (sistem memverifikasi pengemudi minimal 18 tahun)
   - **Kontak** — nomor telepon (08xx...)
   - **Alamat Asal** — tempat tinggal asli
   - **Alamat Saat Ini** — tempat tinggal sekarang
   - **Pelatihan K3** — status pelatihan kesehatan dan keselamatan kerja (Sudah/Belum)
   - **Catatan** — informasi tambahan (opsional)

3. Klik **Simpan** untuk menyelesaikan pendaftaran.

Sistem akan mencegah pendaftaran jika nomor KTP sudah ada atau jika format nomor KTP tidak valid.

## Mengubah pengemudi

1. Dari daftar pengemudi, klik ikon **Edit** di baris pengemudi yang ingin diubah.
2. Perbarui data yang diperlukan.
3. Klik **Simpan** untuk menyimpan perubahan.

## Menghapus pengemudi

1. Klik ikon **Hapus** di baris pengemudi.
2. Konfirmasi penghapusan.

Pengemudi akan dihapus dari sistem namun riwayat transaksi yang melibatkan pengemudi ini tetap terjaga untuk audit.

## Melihat detail pengemudi

Klik ikon **Lihat** di baris pengemudi untuk melihat semua data pengemudi dalam mode baca-saja.

## Mengelola SIM (Surat Izin Mengemudi)

Setiap pengemudi harus memiliki minimal satu SIM yang berlaku. Kelola SIM melalui:

1. Dari daftar pengemudi, klik menu **Kelola SIM** di baris pengemudi.
2. Panel **SIM** akan terbuka di sebelah kanan.
3. Tambah SIM baru atau perbarui yang sudah ada dengan:
   - **Nomor SIM** — nomor unik surat izin mengemudi
   - **Golongan** — A, B1, B2, C, atau D sesuai jenis kendaraan yang boleh dikemudikan
   - **Kadaluarsa** — tanggal kadaluarsa SIM

:::warning SIM harus berlaku
Sebelum menggunakan pengemudi untuk tugas operasional, pastikan SIM-nya masih berlaku. Sistem akan mengingatkan Anda jika SIM kadaluarsa.
:::

## Mencari dan menyaring

- **Kotak pencarian** — cari berdasarkan nama pengemudi atau nomor KTP.
- **Kolom yang dapat disembunyikan** — klik kolom untuk menampilkan/menyembunyikan data seperti alamat, tanggal lahir, atau catatan.

## Kolom di daftar

| Kolom               | Penjelasan                                                                      |
| ------------------- | ------------------------------------------------------------------------------- |
| **Nama**            | Nama lengkap pengemudi                                                          |
| **KTP**             | Nomor Kartu Tanda Penduduk (16 digit)                                           |
| **Status**          | Status kepegawaian (SATGAS/PNS/HONORER)                                         |
| **Pool**            | Lokasi pool tempat pengemudi bekerja                                            |
| **Kontak**          | Nomor telepon pengemudi                                                         |
| **Tanggal Lahir**   | Tanggal lahir (disembunyikan secara default)                                    |
| **Alamat Asal**     | Tempat tinggal asli (disembunyikan secara default)                              |
| **Alamat Sekarang** | Tempat tinggal saat ini (disembunyikan secara default)                          |
| **Pelatihan K3**    | Status pelatihan kesehatan dan keselamatan kerja (disembunyikan secara default) |
| **Catatan**         | Catatan tambahan (disembunyikan secara default)                                 |

## Izin yang diperlukan

- **Melihat daftar** — izin `driver:read`
- **Menambah pengemudi** — izin `driver:create`
- **Mengubah pengemudi** — izin `driver:update`
- **Menghapus pengemudi** — izin `driver:delete`
- **Mengelola SIM** — izin `license:read`

Lihat [Peran & Hak Akses](/memulai/peran-akses) untuk informasi lebih lanjut tentang izin pengguna.
