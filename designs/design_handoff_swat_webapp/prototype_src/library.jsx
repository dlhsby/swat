/* =====================================================================
   SWAT hi-fi — Screen Library (gallery) + viewport controls
   Browse every screen directly, no login required. Desktop / Mobile.
   ===================================================================== */

const SCREEN_CATALOG = [
  ['Autentikasi', [
    { screen: 'login', name: 'Login', desc: 'Kartu masuk terpusat + validasi kredensial.', icon: 'lock' },
    { screen: 'forcepw', name: 'Ubah Kata Sandi', desc: 'Paksa ganti sandi saat login pertama.', icon: 'key' },
    { screen: 'profile', name: 'Profil', desc: 'Detail akun, keamanan, dan sesi.', icon: 'user' },
  ]],
  ['Kerangka', [
    { screen: 'dashboard', name: 'Dasbor', desc: 'KPI operasi harian + kartu perlu perhatian.', icon: 'dashboard' },
  ]],
  ['Monitoring', [
    { screen: 'monvol', name: 'Volume per Hari', desc: 'Tren tonase + komposisi sumber + per TPS.', icon: 'activity' },
    { screen: 'monfuel', name: 'Konsumsi BBM', desc: 'BBM diminta vs disetujui + anomali varian.', icon: 'fuel' },
    { screen: 'reports', name: 'Laporan', desc: 'Hasilkan laporan Excel/PDF + riwayat unduhan.', icon: 'file' },
  ]],
  ['Master Data', [
    { screen: 'vehicles', name: 'Kendaraan', desc: 'Daftar armada, form, dan semua status tabel.', icon: 'truck' },
    { screen: 'drivers', name: 'Pengemudi', desc: 'Data pengemudi + kelola SIM (tab lisensi).', icon: 'user' },
    { screen: 'sites', name: 'Spot & Rute', desc: 'Lokasi (Pool/SPBU/TPS/TPA) + rute terarah.', icon: 'pin' },
    { screen: 'waste', name: 'Sumber Sampah', desc: 'Kategori sumber sampah + penugasan kendaraan.', icon: 'inbox' },
  ]],
  ['Penjadwalan', [
    { screen: 'crew', name: 'Jadwal Kru', desc: 'Pasangan tetap kendaraan ↔ pengemudi.', icon: 'calendar' },
    { screen: 'template', name: 'Template Trayek', desc: 'Legs terencana per jadwal kru.', icon: 'transactions' },
    { screen: 'quota', name: 'Jatah Kitir', desc: 'Otorisasi kendaraan ↔ TPA + terbitkan.', icon: 'file' },
  ]],
  ['Transaksi', [
    { screen: 'days', name: 'Hari Transaksi', desc: 'Inisiasi hari + daftar tanggal operasional.', icon: 'calendar' },
    { screen: 'board', name: 'Haul Board', desc: 'Baris haul → trayek → rekam → verifikasi.', icon: 'transactions' },
    { screen: 'refuels', name: 'Pengisian BBM', desc: 'Catatan pengisian harian + estimasi biaya.', icon: 'fuel' },
    { screen: 'inspections', name: 'Pemeriksaan Kendaraan', desc: 'Daftar periksa kelaikan + detail checklist.', icon: 'clipboard' },
    { screen: 'maintenance', name: 'Perawatan', desc: 'Servis & perbaikan armada + biaya.', icon: 'wrench' },
  ]],
  ['Pengguna & Akses', [
    { screen: 'users', name: 'Pengguna', desc: 'Akun, penetapan peran, reset paksa.', icon: 'users' },
    { screen: 'roles', name: 'Hak Akses (RBAC)', desc: 'Peran + matriks izin granular.', icon: 'shield' },
  ]],
];

function ViewportToggle({ viewport, setViewport }) {
  return (
    <div className="hf-vptoggle" role="tablist" aria-label="Tampilan">
      {[['desktop', 'Desktop', 'monitor'], ['mobile', 'Mobile', 'smartphone']].map(([v, l, ic]) => (
        <button key={v} role="tab" aria-selected={viewport === v} className={viewport === v ? 'on' : ''} onClick={() => setViewport(v)}>
          <Icon name={ic} size={15} />{l}
        </button>
      ))}
    </div>
  );
}

function Library({ onOpen, onDemo, viewport, setViewport }) {
  return (
    <div className="hf-lib">
      <div className="hf-lib-hero">
        <div className="hf-lib-inner">
          <div className="hf-lib-brand">
            <BrandMark className="mk" />
            <div>
              <h1>SWAT — Pustaka Layar Hi-Fi</h1>
              <p>Back-office pengangkutan sampah · DLH Kota Surabaya · Fase 1</p>
            </div>
          </div>
          <p className="hf-lib-lede">
            Telusuri setiap layar langsung tanpa melalui alur login. Pilih tampilan <b>Desktop</b> atau
            <b> Mobile</b>, lalu buka layar mana pun — semuanya shell aplikasi nyata dengan navigasi,
            dialog, dan validasi yang berfungsi penuh.
          </p>
          <div className="hf-lib-actions">
            <ViewportToggle viewport={viewport} setViewport={setViewport} />
            <ThemeToggle variant="segmented" />
            <Button variant="primary" iconRight="arrowRight" onClick={onDemo}>Jalankan Demo Lengkap (Login)</Button>
          </div>
        </div>
      </div>
      <div className="hf-lib-inner">
        {SCREEN_CATALOG.map(([title, items]) => (
          <section className="hf-lib-sec" key={title}>
            <h2>{title}</h2>
            <div className="hf-screengrid">
              {items.map(it => (
                <button className="hf-screencard" key={it.screen} onClick={() => onOpen(it.screen)}>
                  <div className="sc-top"><span className="sc-ic"><Icon name={it.icon} size={19} /></span><span className="sc-name">{it.name}</span></div>
                  <div className="sc-desc">{it.desc}</div>
                  <div className="sc-go">Buka · {viewport === 'mobile' ? 'Mobile' : 'Desktop'} <Icon name="arrowRight" size={13} /></div>
                </button>
              ))}
            </div>
          </section>
        ))}
        <p className="hf-lib-foot">
          {SCREEN_CATALOG.reduce((a, [, i]) => a + i.length, 0)} layar · Sistem Desain SWAT diterapkan penuh (token warna, tipografi, spasi, elevasi).
          Item menu lain ("Segera") melengkapi struktur navigasi.
        </p>
      </div>
    </div>
  );
}

/* preview dock — return to gallery + switch viewport, from inside any screen */
function PreviewDock({ onGallery, viewport, setViewport }) {
  return (
    <div className="hf-dock">
      <button className="gal" onClick={onGallery}><Icon name="grid" size={15} /> Galeri</button>
      <div className="seg">
        {[['desktop', 'monitor'], ['mobile', 'smartphone']].map(([v, ic]) => (
          <button key={v} className={viewport === v ? 'on' : ''} onClick={() => setViewport(v)} aria-label={v}>
            <Icon name={ic} size={14} />
          </button>
        ))}
      </div>
      <DockTheme />
    </div>
  );
}

function DockTheme() {
  const t = useTheme();
  return (
    <div className="seg">
      {[['light', 'sun'], ['dark', 'moon']].map(([v, ic]) => (
        <button key={v} className={t === v ? 'on' : ''} onClick={() => Theme.set(v)} aria-label={v}>
          <Icon name={ic} size={14} />
        </button>
      ))}
    </div>
  );
}

Object.assign(window, { SCREEN_CATALOG, ViewportToggle, Library, PreviewDock });
