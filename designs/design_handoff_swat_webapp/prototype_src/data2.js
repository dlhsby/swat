/* =====================================================================
   SWAT hi-fi — extended mock data for the newly-built modules
   (drivers · sites · routes · waste sources · fuels · refuel log ·
    inspections · maintenance · monitoring series · reports)
   Plain JS. Merges into window.SWAT created by data.js.
   ===================================================================== */
(function () {
  const S = window.SWAT;

  /* ---- Master · Pengemudi (drivers) -------------------------------- */
  const POOLS = ['Pool Wonokromo', 'Pool Tanjungsari', 'Pool Benowo', 'Pool Sukolilo'];
  const DRIVERS_FULL = [
    { id: 1, name: 'Budi Santoso', ktp: '3578010101900001', emp: 'PNS', pool: 'Pool Wonokromo', contact: '0812-3456-7001',
      licenses: [{ cls: 'BII Umum', no: 'SIM-7781201', expiry: '14/08/2027', st: 'VALID' }], lic: 1 },
    { id: 2, name: 'Citra Lestari', ktp: '3578014506920002', emp: 'SATGAS', pool: 'Pool Tanjungsari', contact: '0813-2233-7002',
      licenses: [{ cls: 'BII', no: 'SIM-7781333', expiry: '21/06/2026', st: 'EXPIRING' }], lic: 1 },
    { id: 3, name: 'Dedi Pranoto', ktp: '3578012203880003', emp: 'PNS', pool: 'Pool Wonokromo', contact: '0852-9911-7003',
      licenses: [{ cls: 'BII Umum', no: 'SIM-7780114', expiry: '03/11/2028', st: 'VALID' }, { cls: 'A', no: 'SIM-2210555', expiry: '03/11/2028', st: 'VALID' }], lic: 2 },
    { id: 4, name: 'Eka Wijaya', ktp: '3578010907950004', emp: 'HONORER', pool: 'Pool Benowo', contact: '0856-1122-7004',
      licenses: [{ cls: 'BI', no: 'SIM-1190778', expiry: '02/05/2026', st: 'EXPIRED' }], lic: 1 },
    { id: 5, name: 'Fajar Nugroho', ktp: '3578013012910005', emp: 'SATGAS', pool: 'Pool Tanjungsari', contact: '0811-5566-7005',
      licenses: [{ cls: 'BII Umum', no: 'SIM-7782090', expiry: '30/09/2029', st: 'VALID' }], lic: 1 },
    { id: 6, name: 'Gunawan Hadi', ktp: '3578011808870006', emp: 'PNS', pool: 'Pool Sukolilo', contact: '0878-7788-7006',
      licenses: [], lic: 0 },
    { id: 7, name: 'Hari Susanto', ktp: '3578010402930007', emp: 'HONORER', pool: 'Pool Benowo', contact: '0857-3344-7007',
      licenses: [{ cls: 'BII', no: 'SIM-7783112', expiry: '11/07/2026', st: 'EXPIRING' }], lic: 1 },
    { id: 8, name: 'Imam Subroto', ktp: '3578012709890008', emp: 'PNS', pool: 'Pool Wonokromo', contact: '0813-9090-7008',
      licenses: [{ cls: 'BII Umum', no: 'SIM-7784551', expiry: '19/02/2030', st: 'VALID' }], lic: 1 },
  ];
  const LICENSE_CLASSES = ['A', 'BI', 'BI Umum', 'BII', 'BII Umum', 'C', 'D'];

  /* ---- Master · Spot & Rute (sites + routes) ----------------------- */
  const SITES = [
    { id: 1, name: 'Pool Wonokromo', type: 'POOL', address: 'Jl. Stasiun Wonokromo No. 1, Surabaya', coord: '-7.30187, 112.73691' },
    { id: 2, name: 'Pool Tanjungsari', type: 'POOL', address: 'Jl. Tanjungsari No. 24, Surabaya', coord: '-7.26021, 112.69874' },
    { id: 3, name: 'SPBU Ahmad Yani', type: 'SPBU', address: 'Jl. Ahmad Yani No. 286, Surabaya', coord: '-7.33412, 112.72980' },
    { id: 4, name: 'TPS Ketintang', type: 'TPS', address: 'Jl. Ketintang Madya, Surabaya', coord: '-7.31550, 112.72210' },
    { id: 5, name: 'TPS Wonokromo', type: 'TPS', address: 'Jl. Jagir Wonokromo, Surabaya', coord: '—' },
    { id: 6, name: 'TPS Rungkut', type: 'TPS', address: 'Jl. Rungkut Industri, Surabaya', coord: '-7.33890, 112.78120' },
    { id: 7, name: 'Pasar Keputran', type: 'TPS', address: 'Jl. Keputran, Surabaya', coord: '—' },
    { id: 8, name: 'TPA Benowo', type: 'TPA', address: 'Jl. Romokalisari, Benowo, Surabaya', coord: '-7.22640, 112.62110' },
    { id: 9, name: 'TPA Romokalisari', type: 'TPA', address: 'Jl. Tambak Osowilangun, Surabaya', coord: '-7.20991, 112.63402' },
  ];
  const ROUTES = [
    { id: 1, origin: 'Pool Wonokromo', dest: 'TPS Ketintang', cat: 'PICKUP', km: 6 },
    { id: 2, origin: 'TPS Ketintang', dest: 'TPA Benowo', cat: 'DISPOSAL', km: 24 },
    { id: 3, origin: 'Pool Wonokromo', dest: 'SPBU Ahmad Yani', cat: 'REFUEL', km: 4 },
    { id: 4, origin: 'TPA Benowo', dest: 'Pool Wonokromo', cat: 'RETURN_POOL', km: 22 },
    { id: 5, origin: 'Pool Tanjungsari', dest: 'Pasar Keputran', cat: 'PICKUP', km: 9 },
    { id: 6, origin: 'TPS Rungkut', dest: 'TPA Benowo', cat: 'DISPOSAL', km: 31 },
    { id: 7, origin: 'Pool Benowo', dest: 'TPA Benowo', cat: 'DEPART_POOL', km: 3 },
  ];
  const SITE_TYPE = {
    POOL: { label: 'Pool', cls: 'badge-slate', icon: 'home' },
    SPBU: { label: 'SPBU', cls: 'badge-amber', icon: 'fuel' },
    TPS: { label: 'TPS', cls: 'badge-blue', icon: 'inbox' },
    TPA: { label: 'TPA', cls: 'badge-green', icon: 'scale' },
  };
  const ROUTE_CAT = {
    DEPART_POOL: 'Berangkat Pool', REFUEL: 'Pengisian BBM', PICKUP: 'Pengambilan', DISPOSAL: 'Pembuangan', RETURN_POOL: 'Kembali Pool',
  };

  /* ---- Master · Sumber Sampah (waste sources) ---------------------- */
  const WASTE = [
    { id: 1, code: 'D', name: 'Dinas', notes: 'Sampah dari kantor pemerintahan', vehicles: 14 },
    { id: 2, code: 'R', name: 'Rekanan', notes: 'Sampah dari kontraktor / mitra kerja', vehicles: 8 },
    { id: 3, code: 'PS', name: 'Pasar', notes: 'Sampah pasar tradisional', vehicles: 11 },
    { id: 4, code: 'PU', name: 'Pintu Air', notes: 'Sampah area saluran / kanal', vehicles: 5 },
    { id: 5, code: 'PL', name: 'Pelabuhan', notes: 'Sampah kawasan pelabuhan', vehicles: 3 },
    { id: 6, code: 'S', name: 'Swasta', notes: 'Sampah komersial / privat', vehicles: 9 },
  ];

  /* ---- Master · Bahan Bakar (fuels, reference) --------------------- */
  const FUELS = [
    { id: 1, name: 'Solar', cat: 'Non-Subsidi', price: 8000 },
    { id: 2, name: 'Dexlite', cat: 'Non-Subsidi', price: 9500 },
    { id: 3, name: 'Pertamina Dex', cat: 'Non-Subsidi', price: 13500 },
    { id: 4, name: 'Solar Keekonomian', cat: 'Bersubsidi', price: 6500 },
    { id: 5, name: 'Pertalite', cat: 'Bersubsidi', price: 9500 },
  ];

  /* ---- Transaksi · Pengisian Bahan Bakar (refuel log) -------------- */
  const REFUELS = [
    { id: 1, time: '06:20', date: '5 Jun 2026', plate: 'L 1234 AB', driver: 'Budi Santoso', fuel: 'Solar', req: 50, appr: 50, odo: 125430, spbu: 'SPBU Ahmad Yani', st: 'VERIFIED' },
    { id: 2, time: '06:45', date: '5 Jun 2026', plate: 'L 1255 CD', driver: 'Citra Lestari', fuel: 'Solar', req: 45, appr: 40, odo: 198260, spbu: 'SPBU Ahmad Yani', st: 'FLAGGED' },
    { id: 3, time: '07:10', date: '5 Jun 2026', plate: 'L 1299 GH', driver: 'Dedi Pranoto', fuel: 'Dexlite', req: 55, appr: 55, odo: 241980, spbu: 'SPBU Wiyung', st: 'VERIFIED' },
    { id: 4, time: '07:32', date: '5 Jun 2026', plate: 'L 1340 KL', driver: 'Eka Wijaya', fuel: 'Solar', req: 48, appr: 48, odo: 156740, spbu: 'SPBU Ahmad Yani', st: 'DONE' },
    { id: 5, time: '08:05', date: '5 Jun 2026', plate: 'L 1377 MN', driver: 'Fajar Nugroho', fuel: 'Solar', req: 50, appr: 50, odo: 134560, spbu: 'SPBU Mastrip', st: 'DONE' },
    { id: 6, time: '08:40', date: '5 Jun 2026', plate: 'L 1402 OP', driver: 'Imam Subroto', fuel: 'Pertamina Dex', req: 60, appr: 52, odo: 41230, spbu: 'SPBU Ahmad Yani', st: 'FLAGGED' },
  ];

  /* ---- Transaksi · Pemeriksaan Kendaraan (inspections) ------------- */
  const INSPECT = [
    { id: 1, date: '5 Jun 2026', plate: 'L 1234 AB', model: 'Hino Dutro 130 HD', inspector: 'Bagas Pratama', pass: 11, total: 12, st: 'ATTENTION' },
    { id: 2, date: '5 Jun 2026', plate: 'L 1299 GH', model: 'Hyundai HD120', inspector: 'Sari Wulandari', pass: 9, total: 12, st: 'FAIL' },
    { id: 3, date: '5 Jun 2026', plate: 'L 1340 KL', model: 'Isuzu Giga', inspector: 'Bagas Pratama', pass: 12, total: 12, st: 'PASS' },
    { id: 4, date: '4 Jun 2026', plate: 'L 1402 OP', model: 'Mitsubishi Canter', inspector: 'Sari Wulandari', pass: 12, total: 12, st: 'PASS' },
    { id: 5, date: '4 Jun 2026', plate: 'L 1377 MN', model: 'Hino Dutro 110 SD', inspector: 'Bagas Pratama', pass: 10, total: 12, st: 'ATTENTION' },
  ];
  const INSPECT_ITEMS = [
    { k: 'Rem & sistem pengereman', st: 'OK' }, { k: 'Ban & tekanan angin', st: 'OK' },
    { k: 'Lampu utama & sein', st: 'OK' }, { k: 'Oli mesin & pelumas', st: 'OK' },
    { k: 'Sistem hidrolik bak', st: 'ATTENTION' }, { k: 'Wiper & kaca', st: 'OK' },
    { k: 'Klakson', st: 'OK' }, { k: 'Sabuk pengaman', st: 'OK' },
    { k: 'Radiator & pendingin', st: 'OK' }, { k: 'Aki & kelistrikan', st: 'OK' },
    { k: 'Kebersihan kabin', st: 'OK' }, { k: 'APAR & P3K', st: 'FAIL' },
  ];

  /* ---- Transaksi · Perawatan (maintenance) ------------------------- */
  const MAINT = [
    { id: 1, code: 'PRW-202606-018', date: '5 Jun 2026', plate: 'L 1288 EF', type: 'Perbaikan', desc: 'Perbaikan sistem hidrolik arm roll', workshop: 'Bengkel DLH Pusat', cost: 4750000, odo: 241900, st: 'IN_PROGRESS' },
    { id: 2, code: 'PRW-202606-017', date: '3 Jun 2026', plate: 'L 1255 CD', type: 'Servis Berkala', desc: 'Ganti oli + filter, tune-up 200rb km', workshop: 'Bengkel Rekanan A', cost: 1850000, odo: 198000, st: 'DONE' },
    { id: 3, code: 'PRW-202606-016', date: '2 Jun 2026', plate: 'L 1301 IJ', type: 'Perbaikan', desc: 'Overhaul transmisi', workshop: 'Bengkel DLH Pusat', cost: 12400000, odo: 312000, st: 'SCHEDULED' },
    { id: 4, code: 'PRW-202605-015', date: '28 Mei 2026', plate: 'L 1377 MN', type: 'Servis Berkala', desc: 'Servis rutin 130rb km', workshop: 'Bengkel Rekanan A', cost: 1650000, odo: 134000, st: 'DONE' },
    { id: 5, code: 'PRW-202605-014', date: '24 Mei 2026', plate: 'L 1234 AB', type: 'Perbaikan', desc: 'Ganti kampas rem & seal', workshop: 'Bengkel DLH Pusat', cost: 2300000, odo: 124800, st: 'DONE' },
  ];
  const MAINT_STATUS = {
    SCHEDULED: { label: 'Terjadwal', cls: 'badge-slate' },
    IN_PROGRESS: { label: 'Berjalan', cls: 'badge-amber' },
    DONE: { label: 'Selesai', cls: 'badge-green' },
  };

  /* ---- Monitoring series ------------------------------------------- */
  /* Volume per hari — tonnage stacked by waste source (last 7 days) */
  const TONNAGE_DAYS = [
    { day: '30 Mei', total: 121.4, dinas: 48, pasar: 39, swasta: 22, rekanan: 12.4 },
    { day: '31 Mei', total: 134.0, dinas: 52, pasar: 44, swasta: 24, rekanan: 14.0 },
    { day: '1 Jun', total: 109.4, dinas: 41, pasar: 36, swasta: 20, rekanan: 12.4 },
    { day: '2 Jun', total: 141.2, dinas: 56, pasar: 47, swasta: 25, rekanan: 13.2 },
    { day: '3 Jun', total: 118.9, dinas: 45, pasar: 38, swasta: 22, rekanan: 13.9 },
    { day: '4 Jun', total: 132.6, dinas: 51, pasar: 43, swasta: 24, rekanan: 14.6 },
    { day: '5 Jun', total: 87.5, dinas: 34, pasar: 28, swasta: 16, rekanan: 9.5 },
  ];
  const TONNAGE_BY_SOURCE = [
    { src: 'Dinas', code: 'D', ton: 327, pct: 39 },
    { src: 'Pasar', code: 'PS', ton: 275, pct: 33 },
    { src: 'Swasta', code: 'S', ton: 153, pct: 18 },
    { src: 'Rekanan', code: 'R', ton: 90, pct: 10 },
  ];
  const TONNAGE_BY_SITE = [
    { site: 'TPS Ketintang', type: 'TPS', ton: 142.6, hauls: 38 },
    { site: 'Pasar Keputran', type: 'TPS', ton: 128.1, hauls: 31 },
    { site: 'TPS Rungkut', type: 'TPS', ton: 96.4, hauls: 27 },
    { site: 'TPS Wonokromo', type: 'TPS', ton: 88.0, hauls: 24 },
    { site: 'TPS Darmo', type: 'TPS', ton: 61.2, hauls: 19 },
  ];
  /* Fuel consumption — per vehicle requested vs approved (this month) */
  const FUEL_BY_VEHICLE = [
    { plate: 'L 1299 GH', model: 'Hyundai HD120', fuel: 'Dexlite', req: 1320, appr: 1320, vpct: 0 },
    { plate: 'L 1234 AB', model: 'Hino Dutro', fuel: 'Solar', req: 1180, appr: 1180, vpct: 0 },
    { plate: 'L 1340 KL', model: 'Isuzu Giga', fuel: 'Solar', req: 1150, appr: 1100, vpct: -4 },
    { plate: 'L 1255 CD', model: 'Isuzu Elf', fuel: 'Solar', req: 1080, appr: 960, vpct: -11 },
    { plate: 'L 1402 OP', model: 'Mitsubishi', fuel: 'Pertamina Dex', req: 1040, appr: 910, vpct: -13 },
    { plate: 'L 1377 MN', model: 'Hino Dutro', fuel: 'Solar', req: 990, appr: 990, vpct: 0 },
  ];

  /* ---- Reports catalog --------------------------------------------- */
  const REPORTS = [
    { id: 1, name: 'Laporan Tonase Pengangkutan', desc: 'Tonase per hari, sumber sampah, dan TPS — tahunan / bulanan.', icon: 'scale', period: 'Bulanan · Tahunan', formats: ['Excel', 'PDF'] },
    { id: 2, name: 'Laporan Konsumsi Bahan Bakar', desc: 'Detail BBM per kendaraan & jenis, analisis varian diminta vs disetujui.', icon: 'fuel', period: 'Harian · Bulanan', formats: ['Excel'] },
    { id: 3, name: 'Laporan Ringkasan Rute', desc: 'Frekuensi trayek, jarak tempuh, dan tonase per rute.', icon: 'pin', period: 'Bulanan', formats: ['Excel'] },
    { id: 4, name: 'Laporan Retribusi', desc: 'Transaksi retribusi per tanggal & kategori, total bulanan dan YTD.', icon: 'transactions', period: 'Bulanan · YTD', formats: ['Excel', 'PDF'] },
  ];
  const REPORT_HISTORY = [
    { id: 1, name: 'Tonase — Mei 2026', fmt: 'Excel', size: '248 KB', by: 'Hendra Kusuma', at: '01/06/2026 08:14', st: 'DONE' },
    { id: 2, name: 'Konsumsi BBM — Mei 2026', fmt: 'Excel', size: '186 KB', by: 'Hendra Kusuma', at: '01/06/2026 08:10', st: 'DONE' },
    { id: 3, name: 'Retribusi — Q2 2026', fmt: 'PDF', size: '—', by: 'Ali Darmawan', at: '05/06/2026 09:02', st: 'PROCESSING' },
    { id: 4, name: 'Ringkasan Rute — Mei 2026', fmt: 'Excel', size: '92 KB', by: 'Ali Darmawan', at: '31/05/2026 16:40', st: 'DONE' },
  ];

  /* ---- Status helpers added to STATUS map -------------------------- */
  Object.assign(S.STATUS, {
    PASS: { label: 'Lolos', cls: 'badge-green' },
    ATTENTION: { label: 'Perlu Perhatian', cls: 'badge-amber' },
    FAIL: { label: 'Tidak Lolos', cls: 'badge-red' },
    FLAGGED: { label: 'Ditandai', cls: 'badge-amber' },
    SCHEDULED: { label: 'Terjadwal', cls: 'badge-slate' },
    PROCESSING: { label: 'Diproses', cls: 'badge-amber' },
    MATCHED: { label: 'Cocok', cls: 'badge-green' },
    PENDING: { label: 'Menunggu', cls: 'badge-slate' },
    SATGAS: { label: 'Satgas', cls: 'badge-blue' },
    PNS: { label: 'PNS', cls: 'badge-green' },
    HONORER: { label: 'Honorer', cls: 'badge-slate' },
    VALID: { label: 'Berlaku', cls: 'badge-green' },
    EXPIRING: { label: 'Segera Habis', cls: 'badge-amber' },
    EXPIRED: { label: 'Kedaluwarsa', cls: 'badge-red' },
  });

  Object.assign(S, {
    POOLS, DRIVERS_FULL, LICENSE_CLASSES, SITES, ROUTES, SITE_TYPE, ROUTE_CAT,
    WASTE, FUELS, REFUELS, INSPECT, INSPECT_ITEMS, MAINT, MAINT_STATUS,
    TONNAGE_DAYS, TONNAGE_BY_SOURCE, TONNAGE_BY_SITE, FUEL_BY_VEHICLE,
    REPORTS, REPORT_HISTORY,
  });
})();
