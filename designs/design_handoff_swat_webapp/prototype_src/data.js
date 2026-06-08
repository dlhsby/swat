/* =====================================================================
   SWAT hi-fi — mock data store + IA navigation
   Plain JS. Attaches everything to window.SWAT.
   Indonesian UI labels; numbers/dates id-ID, Asia/Jakarta (WIB).
   ===================================================================== */
(function () {
  /* ---- Navigation IA (icon names map to <Icon name=…/>) -------------- */
  const NAV = [
    { id: 'dashboard', label: 'Dasbor', icon: 'dashboard', screen: 'dashboard' },
    {
      id: 'grp-monitoring', label: 'Monitoring', icon: 'activity', children: [
        { id: 'n-vol-hari', label: 'Volume per Hari', screen: 'monvol' },
        { id: 'n-mon-bbm', label: 'Konsumsi BBM', screen: 'monfuel' },
        { id: 'n-laporan', label: 'Laporan', screen: 'reports' },
      ]
    },
    {
      id: 'grp-master', label: 'Master Data', icon: 'database', children: [
        { id: 'n-vehicle', label: 'Kendaraan', screen: 'vehicles' },
        { id: 'n-driver', label: 'Pengemudi', screen: 'drivers' },
        { id: 'n-spot', label: 'Spot & Rute', screen: 'sites' },
        { id: 'n-waste', label: 'Sumber Sampah', screen: 'waste' },
      ]
    },
    {
      id: 'grp-sched', label: 'Penjadwalan', icon: 'calendar', children: [
        { id: 'n-crew', label: 'Jadwal Kru', screen: 'crew' },
        { id: 'n-quota', label: 'Jatah Kitir', screen: 'quota' },
      ]
    },
    {
      id: 'grp-txn', label: 'Transaksi', icon: 'transactions', children: [
        { id: 'n-day', label: 'Hari Transaksi', screen: 'days' },
        { id: 'n-refuel', label: 'Pengisian Bahan Bakar', screen: 'refuels' },
        { id: 'n-inspect', label: 'Pemeriksaan Kendaraan', screen: 'inspections' },
        { id: 'n-maint', label: 'Perawatan', screen: 'maintenance' },
      ]
    },
    {
      id: 'grp-users', label: 'Pengguna & Akses', icon: 'users', children: [
        { id: 'n-user', label: 'Pengguna', screen: 'users' },
        { id: 'n-role', label: 'Hak Akses', screen: 'roles' },
      ]
    },
  ];

  /* screen -> nav leaf id (for active highlighting & breadcrumb) */
  const SCREEN2LEAF = {
    dashboard: 'dashboard', vehicles: 'n-vehicle', crew: 'n-crew',
    template: 'n-crew', quota: 'n-quota', days: 'n-day', board: 'n-day',
    users: 'n-user', roles: 'n-role', profile: 'dashboard',
    monvol: 'n-vol-hari', monfuel: 'n-mon-bbm', reports: 'n-laporan',
    drivers: 'n-driver', sites: 'n-spot', waste: 'n-waste',
    refuels: 'n-refuel', inspections: 'n-inspect', maintenance: 'n-maint',
  };

  /* ---- Domain data --------------------------------------------------- */
  const VEHICLES = [
    { id: 1, plate: 'L 1234 AB', model: 'Hino Dutro 130 HD', app: 'Compactor', year: 2021, tare: 4200, odo: 125400, status: 'GOOD', stnk: '15/03/2028', tax: '15/03/2027' },
    { id: 2, plate: 'L 1255 CD', model: 'Isuzu Elf NMR', app: 'Dump Truck', year: 2019, tare: 3850, odo: 198220, status: 'MINOR', stnk: '02/08/2027', tax: '02/08/2026' },
    { id: 3, plate: 'L 1288 EF', model: 'Hyundai HD120', app: 'Arm Roll', year: 2018, tare: 5100, odo: 241900, status: 'MAJOR', stnk: '20/11/2026', tax: '20/11/2025' },
    { id: 4, plate: 'L 1299 GH', model: 'Mitsubishi Fuso', app: 'Compactor', year: 2022, tare: 4400, odo: 88150, status: 'GOOD', stnk: '11/05/2029', tax: '11/05/2027' },
    { id: 5, plate: 'L 1301 IJ', model: 'Hino Ranger FG', app: 'Dump Truck', year: 2017, tare: 5600, odo: 312060, status: 'LOST', stnk: '—', tax: '—' },
    { id: 6, plate: 'L 1340 KL', model: 'Isuzu Giga', app: 'Arm Roll', year: 2020, tare: 5200, odo: 156700, status: 'GOOD', stnk: '30/01/2028', tax: '30/01/2027' },
    { id: 7, plate: 'L 1377 MN', model: 'Hino Dutro 110 SD', app: 'Compactor', year: 2021, tare: 4150, odo: 134500, status: 'MINOR', stnk: '18/09/2027', tax: '18/09/2026' },
    { id: 8, plate: 'L 1402 OP', model: 'Mitsubishi Canter', app: 'Dump Truck', year: 2023, tare: 4000, odo: 41200, status: 'GOOD', stnk: '05/02/2030', tax: '05/02/2027' },
  ];

  const DRIVERS = ['Budi Santoso', 'Citra Lestari', 'Dedi Pranoto', 'Eka Wijaya', 'Fajar Nugroho', 'Gunawan Hadi'];

  const CREW = [
    { id: 1, plate: 'L 1234 AB', driver: 'Budi Santoso', depart: '06:00', ret: '17:00', legs: 5, pool: 'Pool Wonokromo', status: 'ACTIVE' },
    { id: 2, plate: 'L 1255 CD', driver: 'Citra Lestari', depart: '06:30', ret: '16:30', legs: 4, pool: 'Pool Tanjungsari', status: 'ACTIVE' },
    { id: 3, plate: 'L 1299 GH', driver: 'Dedi Pranoto', depart: '05:30', ret: '15:30', legs: 6, pool: 'Pool Wonokromo', status: 'ACTIVE' },
    { id: 4, plate: 'L 1340 KL', driver: 'Eka Wijaya', depart: '06:00', ret: '17:00', legs: 5, pool: 'Pool Benowo', status: 'ACTIVE' },
    { id: 5, plate: 'L 1377 MN', driver: 'Fajar Nugroho', depart: '07:00', ret: '16:00', legs: 4, pool: 'Pool Tanjungsari', status: 'INACTIVE' },
  ];

  const QUOTA = [
    { id: 1, code: 'KT-202606-0042', plate: 'L 1234 AB', site: 'TPA Benowo', from: '01/01/2026', to: '31/12/2026', status: 'ACTIVE' },
    { id: 2, code: 'KT-202606-0043', plate: 'L 1255 CD', site: 'TPA Benowo', from: '01/01/2026', to: '30/06/2026', status: 'ACTIVE' },
    { id: 3, code: 'KT-202606-0044', plate: 'L 1299 GH', site: 'TPA Romokalisari', from: '01/03/2026', to: '31/12/2026', status: 'ACTIVE' },
    { id: 4, code: 'KT-202512-0911', plate: 'L 1301 IJ', site: 'TPA Romokalisari', from: '01/12/2025', to: '31/12/2025', status: 'INACTIVE' },
    { id: 5, code: 'KT-202606-0045', plate: 'L 1340 KL', site: 'TPA Benowo', from: '01/01/2026', to: '31/12/2026', status: 'ACTIVE' },
  ];

  const DAYS = [
    { id: '2026-06-05', date: '5 Jun 2026', status: 'IN_PROGRESS', vehicles: 28, tonnage: 87.5 },
    { id: '2026-06-04', date: '4 Jun 2026', status: 'DONE', vehicles: 27, tonnage: 132.6 },
    { id: '2026-06-03', date: '3 Jun 2026', status: 'DONE', vehicles: 25, tonnage: 118.9 },
    { id: '2026-06-02', date: '2 Jun 2026', status: 'DONE', vehicles: 26, tonnage: 141.2 },
    { id: '2026-06-01', date: '1 Jun 2026', status: 'DONE', vehicles: 24, tonnage: 109.4 },
  ];

  /* Haul rows for the 5 Jun board. trips: pickup/disposal/refuel/depart/return */
  const HAULS = [
    {
      id: 'h1', plate: 'L 1234 AB', driver: 'Budi Santoso', model: 'Hino Dutro (Compactor)',
      departT: '06:00', departA: '06:05', retT: '17:00', retA: '—', ritase: 3, verified: 3, total: 5,
      trips: [
        { id: 't1', type: 'PICKUP', label: 'Pengambilan — TPS Ketintang', target: '07:30', status: 'VERIFIED' },
        { id: 't2', type: 'DISPOSAL', label: 'Pembuangan — TPA Benowo', target: '08:45', status: 'VERIFIED' },
        { id: 't3', type: 'PICKUP', label: 'Pengambilan — TPS Wonokromo', target: '10:30', status: 'VERIFIED' },
        { id: 't4', type: 'DISPOSAL', label: 'Pembuangan — TPA Benowo', target: '12:00', status: 'DONE' },
        { id: 't5', type: 'REFUEL', label: 'Pengisian — SPBU Ahmad Yani', target: '13:30', status: 'IN_PROGRESS' },
      ],
    },
    {
      id: 'h2', plate: 'L 1255 CD', driver: 'Citra Lestari', model: 'Isuzu Elf (Dump Truck)',
      departT: '06:30', departA: '06:38', retT: '16:30', retA: '—', ritase: 1, verified: 1, total: 4,
      trips: [
        { id: 't6', type: 'PICKUP', label: 'Pengambilan — Pasar Keputran', target: '07:45', status: 'VERIFIED' },
        { id: 't7', type: 'DISPOSAL', label: 'Pembuangan — TPA Benowo', target: '09:15', status: 'DONE' },
        { id: 't8', type: 'PICKUP', label: 'Pengambilan — TPS Darmo', target: '11:00', status: 'IN_PROGRESS' },
        { id: 't9', type: 'DISPOSAL', label: 'Pembuangan — TPA Benowo', target: '12:30', status: 'IN_PROGRESS' },
      ],
    },
    {
      id: 'h3', plate: 'L 1299 GH', driver: 'Dedi Pranoto', model: 'Mitsubishi (Compactor)',
      departT: '05:30', departA: '05:30', retT: '15:30', retA: '15:48', ritase: 6, verified: 6, total: 6,
      trips: [
        { id: 't10', type: 'PICKUP', label: 'Pengambilan — TPS Rungkut', target: '06:30', status: 'VERIFIED' },
        { id: 't11', type: 'DISPOSAL', label: 'Pembuangan — TPA Benowo', target: '08:00', status: 'VERIFIED' },
      ],
    },
    {
      id: 'h4', plate: 'L 1301 IJ', driver: 'Eka Wijaya', model: 'Hino Ranger (Dump Truck)',
      departT: '06:00', departA: '—', retT: '17:00', retA: '—', ritase: 0, verified: 0, total: 5,
      trips: [
        { id: 't12', type: 'PICKUP', label: 'Pengambilan — TPS Gubeng', target: '07:30', status: 'IN_PROGRESS' },
      ],
    },
  ];

  const USERS = [
    { id: 1, name: 'Ali Darmawan', username: 'ali.darmawan', role: 'Administrasi Data', status: 'ACTIVE' },
    { id: 2, name: 'Bagas Pratama', username: 'bagas.c', role: 'Checker', status: 'ACTIVE' },
    { id: 3, name: 'Operator Pool', username: 'operator1', role: 'Operator Pool', status: 'MUST_CHANGE' },
    { id: 4, name: 'Sari Wulandari', username: 'sari.w', role: 'Checker', status: 'ACTIVE' },
    { id: 5, name: 'Hendra Kusuma', username: 'hendra.k', role: 'Administrator', status: 'ACTIVE' },
  ];

  const ROLES = [
    { id: 1, name: 'Administrator', desc: 'Akses penuh seluruh modul & konfigurasi.', perms: 42 },
    { id: 2, name: 'Administrasi Data', desc: 'Entri transaksi harian: pengambilan, pembuangan, bahan bakar.', perms: 28 },
    { id: 3, name: 'Checker', desc: 'Verifikasi trayek & rekonsiliasi data timbangan.', perms: 9 },
    { id: 4, name: 'Operator Pool', desc: 'Inisiasi hari & pemantauan armada di pool.', perms: 6 },
    { id: 5, name: 'Petugas TPA', desc: 'Pencatatan penimbangan di lokasi pembuangan.', perms: 4 },
  ];

  const PERMS = {
    Transaksi: [
      { key: 'trip:record-pickup', label: 'Catat Pengambilan', on: true },
      { key: 'trip:record-disposal', label: 'Catat Pembuangan', on: true },
      { key: 'trip:record-fuel', label: 'Catat Bahan Bakar', on: true },
      { key: 'trip:verify', label: 'Verifikasi Trayek', on: false },
    ],
    'Master Data': [
      { key: 'vehicle:read', label: 'Lihat Kendaraan', on: true },
      { key: 'vehicle:update', label: 'Ubah Kendaraan', on: true },
      { key: 'vehicle:delete', label: 'Hapus Kendaraan', on: false },
    ],
    Penjadwalan: [
      { key: 'crew-schedule:read', label: 'Lihat Jadwal Kru', on: true },
      { key: 'fuel-quota:create', label: 'Terbitkan Jatah Kitir', on: false },
    ],
  };

  /* ---- Status enum -> pill mapping ----------------------------------- */
  const STATUS = {
    'TripStatus.IN_PROGRESS': { label: 'Belum Selesai', cls: 'badge-amber' },
    'TripStatus.DONE': { label: 'Selesai', cls: 'badge-blue' },
    'TripStatus.VERIFIED': { label: 'Terverifikasi', cls: 'badge-green' },
    IN_PROGRESS: { label: 'Belum Selesai', cls: 'badge-amber' },
    DONE: { label: 'Selesai', cls: 'badge-blue' },
    VERIFIED: { label: 'Terverifikasi', cls: 'badge-green' },
    ACTIVE: { label: 'Berlaku', cls: 'badge-green' },
    INACTIVE: { label: 'Tidak Berlaku', cls: 'badge-slate' },
    GOOD: { label: 'Baik', cls: 'badge-green' },
    MINOR: { label: 'Rusak Ringan', cls: 'badge-amber' },
    MAJOR: { label: 'Rusak Berat', cls: 'badge-red' },
    LOST: { label: 'Hilang', cls: 'badge-slate' },
    PENDING_APPROVAL: { label: 'Belum Disetujui', cls: 'badge-amber' },
    APPROVED: { label: 'Disetujui', cls: 'badge-green' },
    MUST_CHANGE: { label: 'Wajib ganti sandi', cls: 'badge-amber' },
  };

  /* ---- id-ID formatters --------------------------------------------- */
  const fmt = {
    int: (n) => Number(n).toLocaleString('id-ID'),
    dec: (n, d = 2) => Number(n).toLocaleString('id-ID', { minimumFractionDigits: d, maximumFractionDigits: d }),
    rupiah: (n) => 'Rp ' + Number(n).toLocaleString('id-ID'),
    kg: (n) => Number(n).toLocaleString('id-ID') + ' kg',
    km: (n) => Number(n).toLocaleString('id-ID') + ' km',
    L: (n) => Number(n).toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' L',
    ton: (n) => Number(n).toLocaleString('id-ID', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + ' ton',
  };

  window.SWAT = {
    NAV, SCREEN2LEAF, VEHICLES, DRIVERS, CREW, QUOTA, DAYS, HAULS,
    USERS, ROLES, PERMS, STATUS, fmt,
    USER: { name: 'Ali Darmawan', username: 'ali.darmawan', role: 'Administrasi Data', initials: 'AD' },
  };
})();
