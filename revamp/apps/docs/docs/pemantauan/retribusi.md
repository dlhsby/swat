---
title: Retribusi
sidebar_label: Retribusi
sidebar_position: 4
---

![Retribusi](/img/web/monitoring-levy.png)

## Apa itu Retribusi?

Halaman **Retribusi** memantau penerimaan retribusi (iuran layanan) dari berbagai kategori. Halaman ini menampilkan ringkasan keuangan, tren bulanan, serta data lengkap retribusi yang dapat dikelola (ditambah, diubah, atau dihapus) sesuai kebutuhan administrasi.

Halaman ini membantu Anda:

- Memantau total retribusi yang terkumpul dalam periode tertentu
- Menganalisis distribusi retribusi per kategori
- Melihat tren retribusi bulanan
- Mengelola data retribusi (tambah, ubah, hapus)
- Mengekspor laporan retribusi ke Excel atau PDF

## Cara Mengakses

Pilih **Pemantauan** → **Retribusi** di menu utama. Halaman ini memerlukan akses `monitoring:read` untuk melihat ringkasan (lihat [Peran & Akses](/memulai/peran-akses)). Untuk mengelola data (tambah, ubah, hapus), Anda memerlukan izin tambahan `levy:*`. Jika opsi menu tidak tampak, minta admin untuk memberikan izin.

## Fitur Utama

### Tab Ringkasan

Menampilkan gambaran keuangan retribusi dengan grafik dan KPI:

**KPI Cards**

- **Total Retribusi**: Total rupiah yang dikumpulkan dalam periode yang dipilih

**Grafik & Tabel Ringkasan**

- **Grafik per Kategori**: Diagram batang menunjukkan total retribusi untuk setiap kategori retribusi
  - X-axis: Nama kategori (mis. "Retribusi TPS", "Retribusi TPA", dll.)
  - Y-axis: Jumlah rupiah
- **Grafik Tren Bulanan**: Area chart menunjukkan total retribusi per bulan
  - X-axis: Bulan (Januari, Februari, dst.)
  - Y-axis: Jumlah rupiah
  - Berguna untuk melihat musiman atau tren pertumbuhan retribusi

**Rentang Tanggal**

- Tab Ringkasan menggunakan **rentang Tahun ke Tanggal (YTD)** secara default (Januari hingga hari ini)
- Tekan **Kontrol Rentang Tanggal** untuk mengubah periode

### Tab Data

Menampilkan daftar lengkap semua record retribusi dengan kemampuan CRUD:

**Kolom Tabel**

- **Tanggal**: Tanggal pencatatan retribusi (dd/mm/yyyy)
- **Kategori**: Kategori atau jenis retribusi
- **Jumlah**: Nominal retribusi dalam rupiah (Rp)
- **Catatan**: Keterangan tambahan (opsional, tersembunyi secara default)
- **Aksi**: Tombol untuk melihat, mengubah, atau menghapus record

**Fitur CRUD**

_Buat (Create)_

1. Tekan tombol **Tambah Retribusi** di atas tabel
2. Isi form dengan:
   - **Kategori**: Nama kategori retribusi (wajib)
   - **Tanggal**: Tanggal pencatatan (wajib)
   - **Jumlah**: Nominal dalam rupiah (wajib)
   - **Catatan**: Keterangan tambahan (opsional)
3. Tekan **Simpan**

_Ubah (Update)_

1. Cari record yang ingin diubah di tabel
2. Tekan tombol **Edit** (ikon pensil) di kolom Aksi
3. Perbarui field yang ingin diubah
4. Tekan **Simpan**

_Hapus (Delete)_

1. Cari record yang ingin dihapus di tabel
2. Tekan tombol **Hapus** (ikon trash) di kolom Aksi
3. Konfirmasi penghapusan di dialog yang muncul
4. Record akan dihapus dari sistem

**Pencarian & Filter**

- Gunakan kotak pencarian untuk menemukan record berdasarkan kategori
- Tekan filter jika tersedia untuk memfilter berdasarkan tanggal atau kategori

**Paginasi**

- Jika lebih dari 50 record, gunakan tombol **Halaman Berikutnya** / **Halaman Sebelumnya** atau nomor halaman di bawah tabel

## Kontrol & Filter

**Rentang Tanggal (Tab Ringkasan)**

- Tekan **Kontrol Rentang Tanggal** di atas grafik
- Pilih periode preset (7 Hari, Bulan Ini, Kuartal, Tahun Ini, dll.) atau **Kustom**
- Jika kustom, masukkan tanggal mulai dan akhir
- Tekan **Terapkan** untuk memperbarui grafik

**Ekspor**

- Tekan tombol **Ekspor** di kanan atas
- Pilih **Excel** atau **PDF** untuk mengunduh laporan ringkasan

## Interpretasi Data

**Total Retribusi**

- Menunjukkan total rupiah yang dikumpulkan dalam periode yang dipilih
- Bandingkan dengan target bulanan atau tahunan untuk mengukur performa

**Distribusi per Kategori**

- Grafik batang menunjukkan kategori mana yang memberikan kontribusi terbesar
- Fokus pada kategori dengan kontribusi tinggi untuk memastikan pengumpulan berlanjut

**Tren Bulanan**

- Grafik tren menunjukkan pola penerimaan sepanjang tahun
- Kenaikan tren = performa baik
- Penurunan tren = investigasi kemungkinan hambatan pengumpulan

## Contoh Skenario

**Skenario 1: Cek Penerimaan Bulanan**

1. Buka tab **Ringkasan**
2. Rentang tanggal sudah otomatis Tahun ke Tanggal (YTD)
3. Lihat **KPI Total Retribusi** untuk total YTD
4. Lihat grafik tren bulanan untuk melihat tren sepanjang tahun

**Skenario 2: Analisis Kontribusi Kategori**

1. Buka tab **Ringkasan**
2. Lihat **Grafik per Kategori**
3. Identifikasi kategori dengan kontribusi terbesar dan terkecil
4. Gunakan insight untuk perencanaan promosi atau strategi pengumpulan

**Skenario 3: Tambah Record Retribusi Baru**

1. Buka tab **Data**
2. Tekan tombol **Tambah Retribusi**
3. Masukkan:
   - Kategori: "Retribusi TPS Lokasi X"
   - Tanggal: (pilih tanggal)
   - Jumlah: (masukkan nominal Rp)
   - Catatan: (opsional, mis. "Pembayaran dari TPS X bulan ini")
4. Tekan **Simpan**
5. Record akan ditambahkan ke tabel dan otomatis teragregasi di grafik

**Skenario 4: Laporan Bulanan Lengkap**

1. Pilih rentang **Bulan Ini**
2. Tekan tombol **Ekspor** → **PDF**
3. File akan berisi ringkasan KPI, grafik per kategori, dan grafik tren
4. Lampirkan laporan ke manajemen atau stakeholder

## Catatan Penting

- Data retribusi diimpor dari legacy system dan dapat ditambah atau diubah di halaman ini
- Akses melihat ringkasan memerlukan izin `monitoring:read`
- Akses mengelola data (tambah, ubah, hapus) memerlukan izin `levy:*` — hubungi admin jika tidak tersedia
- Tren YTD mencakup periode Januari hingga hari ini dalam tahun berjalan
- Kategori retribusi harus diisi sesuai konvensi organisasi Anda

---

**Perlu bantuan?** Lihat [FAQ](/faq) atau hubungi tim dukungan Anda.
