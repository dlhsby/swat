# Panduan Pengguna SWAT (T-169)

Panduan ringkas berbasis peran untuk sistem **SWAT** (pengganti aplikasi lama
`legacy/web`). Bahasa Indonesia. Untuk pemetaan istilah lama → menu baru lihat
[`LEGACY-TO-NEW-REFERENCE.md`](./LEGACY-TO-NEW-REFERENCE.md).

## Login pertama kali (semua pengguna)

Saat go-live, setiap pengguna menerima **username** dan **kata sandi sementara**
melalui kanal resmi (bukan email/chat publik).

1. Buka alamat SWAT, masukkan username + kata sandi sementara → **Masuk**.
2. Sistem otomatis meminta **ganti kata sandi** (wajib pada login pertama).
3. Buat kata sandi baru yang kuat (indikator kekuatan harus minimal "Kuat"),
   simpan. Anda diarahkan ke **Dasbor**.
4. Lupa kata sandi? Hubungi admin — admin melakukan **reset paksa**, lalu Anda
   mengulang langkah 1–3.

## Navigasi umum

- **Topbar:** ganti tema, notifikasi, menu profil (ubah kata sandi, keluar).
- **Sidebar:** menu sesuai peran Anda — menu yang tidak menjadi hak akses Anda
  **disembunyikan**. Item bertanda "Segera" belum tersedia.
- Tabel mendukung pencarian, filter, dan urutkan kolom.

## Per peran

### Administrasi Data — entri data
- **Master Data:** kelola Kendaraan, Model/Aplikasi Kendaraan, Bahan Bakar,
  Pengemudi (+ SIM), Spot & Rute, Sumber Sampah.
- **Penjadwalan:** Jadwal Kru, Trayek, **Jatah Kitir** (termasuk **Impor Massal**
  via berkas CSV: unggah → pratinjau → pilih strategi → Impor; unduh log galat
  bila ada baris gagal).
- **Hari Transaksi:** inisiasi hari, catat & verifikasi trip, tandai hari selesai.

### Checker — verifikasi
- Buka **Hari Transaksi → Haul Board**, pilih trayek, periksa data realisasi.
- Trip berstatus **Selesai** → tombol **Verifikasi** (DescriptionList konfirmasi).
- Trip **Terverifikasi** terkunci; perubahan butuh izin override.

### Operator Pool — operasional kendaraan
- **Hari Transaksi:** catat keberangkatan (odometer), pengambilan, pembuangan,
  pengisian BBM, kepulangan sesuai trayek kendaraan.
- **Pemeriksaan Kendaraan:** isi checklist 12 item (OK / Perlu Perhatian / Gagal)
  → hasil dihitung otomatis.
- **Perawatan:** catat servis/perbaikan + item biaya (total otomatis).

### Petugas TPA — pembuangan
- **Hari Transaksi:** catat **pembuangan** — masukkan berat kotor & tara; berat
  bersih dihitung otomatis dan **tidak boleh negatif** (sistem menolak gross < tara).

### Supervisor — pemantauan
- Akses baca seluruh master + transaksi; **Monitoring** & **Laporan** (sebagian
  "Segera" pada fase ini).

### Administrator — penuh
- Semua hak akses, plus **Pengguna** (buat/reset paksa) dan **Hak Akses** (atur izin
  per peran).

## Hypercare (1 minggu pertama)

- **Kanal dukungan:** _(tentukan: Telegram/WhatsApp grup + email)_, SLA respons
  **< 2 jam** jam kerja.
- **Eskalasi:** Operator → DLH IT → Cutover lead.
- Masalah yang diketahui + solusi sementara: [`KNOWN-ISSUES-AND-WORKAROUNDS.md`](./KNOWN-ISSUES-AND-WORKAROUNDS.md).
- Sesi pelatihan (1–2 jam) dijadwalkan/ direkam untuk operator sebelum go-live.
