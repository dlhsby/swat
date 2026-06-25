# Catatan Privasi — Pelacakan GPS Armada (Fase 7)

Dokumen ini menjelaskan data lokasi yang dikumpulkan SWAT dan cara penanganannya.

## Apa yang dilacak

SWAT melacak **posisi kendaraan operasional** melalui **perangkat GPS keras (GPS.id)
yang sudah terpasang di kendaraan** — bukan ponsel atau login pengemudi. Sumber
kebenaran lokasi adalah perangkat kendaraan, bukan orang.

Setiap ping (≈ tiap 30 detik) berisi: IMEI perangkat, lintang/bujur, kecepatan,
arah, status mesin (ON/OFF), odometer, dan waktu. Data ini menempel pada
**kendaraan**, bukan identitas pribadi pengemudi.

## Sifat data

Pelacakan **GPS kendaraan keras** secara inheren **kurang sensitif** dibanding
pelacakan berbasis login pengemudi (yang sengaja **tidak** dilakukan di Fase 7).
Meski begitu, akses tetap:

- **Dibatasi peran (RBAC):** hanya peran dengan izin `tracking:read` /
  `deviation-alert:read` yang dapat melihat posisi langsung dan peringatan.
- **Diaudit:** setiap panggilan integrasi tercatat di `ApiAuditLog`.

## Retensi

- **`gps_ping`** (ping mentah): partisi bulanan, **30 hari panas**, lalu diarsipkan
  (melepas partisi lama — pola arsip Fase 2).
- **`deviation_alert`** (peringatan): disimpan untuk jejak audit.
- **`daily_vehicle_efficiency`** (ringkasan harian): agregat, bukan jejak mentah.

## Keamanan jalur masuk

Webhook GPS.id diamankan dengan token rahasia + daftar IP + batas laju + audit
(lihat `GPS-WEBHOOK-SECURITY.md`). Kredensial tidak pernah ditanam di kode —
seluruhnya dari variabel lingkungan, dan boot gagal keras bila kredensial wajib
hilang.
