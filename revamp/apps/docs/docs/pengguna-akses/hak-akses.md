---
title: Hak Akses
sidebar_label: Hak Akses
sidebar_position: 2
---

# Hak Akses

Halaman **Hak Akses** memungkinkan administrator membuat dan mengelola **peran** (role) serta izin (permission) mereka. Setiap peran adalah sekumpulan izin yang menentukan menu dan aksi mana saja yang dapat diakses pengguna.

![Daftar Peran dan Izin](/img/web/roles.png)

## Konsep dasar

- **Peran**: sebuah jabatan/grup dengan nama unik (contoh: "Operator", "Supervisor", "Administrasi").
- **Izin**: akses granular yang diberikan ke peran (contoh: `vehicle:read`, `monitoring:read`, `user:create`).
- **Pengguna mendapat peran**: masing-masing pengguna ditugaskan satu peran (di halaman [Pengguna](/pengguna-akses/pengguna)).
- **Peran menentukan menu**: jika peran Anda punya izin `vehicle:read`, menu "Kendaraan" akan muncul di sidebar Anda.

## Tugas utama

### Membuat peran baru

1. Klik tombol **Tambah Peran**.
2. Masukkan **nama peran** (contoh: "Pelapor Harian").
3. Klik **Simpan**.
4. Peran dibuat **tanpa izin** awal (kosong).
5. Untuk menambahkan izin, lihat bagian "Mengubah izin peran" di bawah.

### Mengubah nama peran

1. Pilih peran dari daftar di sebelah kiri.
2. Klik tombol **Ubah** (ikon pensil) di atas.
3. Masukkan nama peran baru.
4. Klik **Simpan**.

### Mengelola izin peran

1. **Pilih peran** dari daftar di sebelah kiri. Detail peran akan ditampilkan di sisi kanan.
2. **Izin diorganisir berdasarkan kategori** (Pemantauan, Pengangkutan, Data Master, dll.) dan sumber daya (kendaraan, pengguna, peran, dll.).
3. **Untuk menambahkan izin**:
   - Buka kategori dengan mengklik judulnya.
   - Cek izin individual dengan menggeser switch, atau
   - Cek semua izin di dalam sumber daya dengan klik kotak di header.
4. **Untuk menghapus izin**:
   - Tidak centang switch izin, atau
   - Tidak centang kotak header sumber daya.
5. **Untuk pilih/tidak semua izin dalam kategori**:
   - Klik kotak di samping nama kategori.
6. Setelah selesai, klik tombol **Simpan Izin** di atas.

:::note Perubahan berlaku segera
Menyimpan izin akan mengubah menu yang terlihat untuk pengguna dengan peran ini. Mereka akan melihat perubahan di login berikutnya.
:::

### Menghapus peran

1. Pilih peran dari daftar.
2. Klik tombol **Hapus** (ikon tempat sampah) di atas.
3. Konfirmasi penghapusan.

**Catatan**: peran yang masih digunakan oleh pengguna tidak dapat dihapus. Ubah peran pengguna terlebih dahulu.

## Struktur izin

Izin diformat sebagai `resource:action`:

| Aksi      | Arti                                                |
| --------- | --------------------------------------------------- |
| `:read`   | Dapat melihat data dan menu modul.                  |
| `:create` | Dapat membuat catatan/entitas baru.                 |
| `:update` | Dapat mengubah catatan yang ada.                    |
| `:delete` | Dapat menghapus catatan.                            |
| `:manage` | Akses khusus (contoh: mereset kata sandi pengguna). |

**Contoh**: `vehicle:read` = izin untuk melihat modul Kendaraan dan listnya.

## Izin yang diperlukan

Anda memerlukan izin `role:read` untuk melihat halaman ini. Tindakan spesifik membutuhkan:

- **Membuat peran**: `role:create`
- **Mengubah peran/izin**: `role:update`
- **Menghapus peran**: `role:delete`

Jika tombol atau menu tidak muncul, hubungi administrator untuk menambahkan izin ke peran Anda. Lihat [Peran & Hak Akses](/memulai/peran-akses) untuk informasi lebih lanjut.

## Informasi tambahan

Setiap peran menampilkan:

- **Nama peran** — ditampilkan di bagian atas.
- **Jumlah izin** — berapa banyak izin diberikan.
- **Pengguna** — berapa pengguna memiliki peran ini.

:::tip
Mulai dengan melihat peran yang sudah ada untuk memahami pola izin yang diperlukan. Salin izin dari peran serupa saat membuat peran baru.
:::

:::warning
Hati-hati saat menghapus izin dari peran yang banyak digunakan. Pengguna akan kehilangan akses ke fitur tersebut.
:::
