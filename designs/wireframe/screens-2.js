/* =====================================================================
   SWAT wireframes — screens part 2
   Master Data · Scheduling · Transactions · Users & Access · Reference
   Extends the global SCREENS map; reuses helpers from wireframe-web.html.
   ===================================================================== */

/* modal helpers (transaction forms open as Dialogs over the board) */
function modalStage(inner, hint){
  return '<div style="min-height:580px;display:flex;align-items:center;justify-content:center;padding:36px;'+
    'background:rgb(15 23 42 / .42);position:relative">'+
    (hint?'<div style="position:absolute;top:14px;left:18px;font-size:11.5px;color:#e2e8f0;font-family:var(--font-mono)">'+hint+'</div>':'')+
    inner+'</div>';
}
function dialog(title, body, foot, w){
  w = w || 540;
  return '<div class="dialog" style="width:'+w+'px;max-width:100%;max-height:540px;overflow:auto">'+
    '<div class="row" style="justify-content:space-between;align-items:flex-start;margin-bottom:4px">'+
      '<h3 style="margin:0">'+title+'</h3><span class="muted" style="cursor:pointer;font-size:16px" title="Tutup">✕</span></div>'+
    body+
    '<div class="dialog-foot">'+foot+'</div>'+
  '</div>';
}
function ctxLine(v,d){ return '<div class="card" style="padding:11px 14px;background:var(--neutral-50);margin-bottom:16px;font-size:13px"><b class="mono">'+v+'</b> <span class="muted">· '+d+'</span></div>'; }
function divlbl(t){ return '<p style="font-size:11px;text-transform:uppercase;letter-spacing:.06em;color:var(--neutral-400);font-weight:700;margin:18px 0 12px;padding-bottom:6px;border-bottom:1px solid var(--neutral-100)">'+t+'</p>'; }

/* ----------------------------------------------- 06 MASTER PATTERN ---- */
SCREENS.masterPattern = {
  group:'Master Data', ix:'06', label:'Pola CRUD (sekali pakai)', chrome:'shell', active:'vehicle',
  crumb:'Master Data / <b>Pola CRUD</b>', route:'/master-data/{entity}',
  render(){
    const content = crumbs(['Master Data','{Entity}'])+
      '<div class="pg-head"><div><h1>{Entity}</h1><p class="sub">Kerangka generik — berlaku untuk ~12 entitas master.</p></div>'+btn('+ Buat Baru','btn-primary')+'</div>'+
      '<div class="toolbar2">'+ '<div class="input-group" style="max-width:280px"><input class="input" placeholder="Cari…" /></div>'+
        btn('Filter ▾','btn-outline btn-sm')+btn('Kolom ▾','btn-outline btn-sm')+'<div class="grow"></div>'+
        '<span class="muted" style="font-size:12.5px">128 entri</span></div>'+
      '<div class="card" style="padding:0;overflow:hidden">'+
        '<table class="table"><thead><tr><th style="width:36px"><input type="checkbox" /></th>'+
        '<th class="sortable">Nama / Kode <span class="sort-ico">↑</span></th><th class="sortable">Atribut</th><th class="sortable">Atribut</th><th>Status</th><th style="text-align:right;width:80px">Aksi</th></tr></thead><tbody>'+
        ['','',''].map(()=>'<tr><td><input type="checkbox" /></td><td class="mono">KODE-000</td><td><div class="ph lite" style="height:11px;width:80%"></div></td><td><div class="ph lite" style="height:11px;width:60%"></div></td><td>'+pill('Aktif','badge-green')+'</td><td style="text-align:right"><span class="muted" style="cursor:pointer;font-size:17px">⋮</span></td></tr>').join('')+
        '</tbody></table>'+
        '<div class="row" style="justify-content:space-between;align-items:center;padding:12px 14px;border-top:1px solid var(--neutral-200)"><span class="muted" style="font-size:12.5px">Menampilkan 1–25 dari 128</span>'+
          '<div class="row" style="gap:8px;align-items:center"><button class="btn btn-outline btn-sm" disabled>‹ Sebelumnya</button><span class="mono" style="font-size:12.5px">Hal 1 / 6</span><button class="btn btn-outline btn-sm">Selanjutnya ›</button>'+
          '<select class="select" style="width:auto;height:32px;padding:4px 30px 4px 10px;font-size:12.5px"><option>25</option><option>50</option><option>100</option></select></div></div>'+
      '</div>';
    return frame('app.swat…/master-data/{entity}', shell('vehicle', content));
  },
  annot:{
    title:'Pola CRUD Master Data', kicker:'Reusable · sekali pakai',
    desc:'Didefinisikan SATU kali, dipakai ulang oleh ~12 entitas. Template A (List) + Create/Edit (Dialog) + Delete (Confirm).',
    meta:'<b>Dipakai ulang oleh:</b> Kendaraan, Model Kendaraan, Aplikasi, Bahan Bakar, Kategori BBM, Pengemudi, SIM, Lokasi/Spot, Rute, Sumber Sampah, Jadwal Kru, Template Trayek.',
    annot:[
      ['Template A — List', [
        A(1,'<span class="cmp">Breadcrumb</span> → H1 entitas → <b>Buat Baru</b> (<span class="cmp">Button</span> primary, satu aksi utama).'),
        A(2,'Toolbar: <span class="cmp">Input</span> cari (debounce 300ms) · <span class="cmp">Popover</span> Filter · <span class="cmp">Popover</span> Kolom (toggle).'),
        A(3,'<span class="cmp">DataTable</span>: header sortable (<span class="kbd">aria-sort</span>), checkbox pilih, kode <code>mono</code>, angka rata-kanan, kolom Aksi ~80px.'),
        A(4,'Aksi baris: ikon Lihat/Ubah/Hapus atau menu <span class="cmp">DropdownMenu</span> "⋮".'),
        A(5,'<span class="cmp">Pagination</span>: "Menampilkan 1–25 dari N" + ‹ › + baris/hal 25/50/100.'),
      ]],
      ['Create / Edit — Dialog', [
        A(6,'Sebagian besar entitas pakai <span class="cmp">Dialog</span> (modal); entitas kompleks (Haul/Trip) pakai rute khusus.'),
        A(7,'<span class="cmp">FormField</span> per atribut, dikelompokkan dalam <span class="cmp">Card</span>; validasi inline real-time (debounce 300ms).'),
        A(8,'Footer: <b>Batal</b> (secondary) + <b>Simpan</b> (primary, spinner saat memuat). Sukses → <span class="cmp">Toast</span>, tutup, refetch.'),
      ]],
      ['Delete — Confirm', [
        A(9,'<span class="cmp">AlertDialog</span>: "Hapus {entity}?", sebut target, "Tindakan tidak dapat dibatalkan." [Batal] + [Hapus] (destructive). Soft-delete.'),
      ]],
      ['Status (semua list)', [
        A(10,'Kosong: "Belum ada data" + Buat Baru. Memuat: 10 baris skeleton. Galat: "Gagal memuat data" + Coba Lagi.'),
      ]],
    ]
  }
};

/* ----------------------------------------------- 07 KENDARAAN LIST ---- */
SCREENS.vehicle = {
  group:'Master Data', ix:'07', label:'Kendaraan — Daftar', chrome:'shell', active:'vehicle',
  crumb:'Master Data / <b>Kendaraan</b>', route:'/master-data/vehicles',
  render(){
    const rows = [
      ['L 1234 AB','Hino Dutro','Compactor','Baik','badge-green'],
      ['L 1255 CD','Isuzu Elf','Dump Truck','Rusak Ringan','badge-amber'],
      ['L 1288 EF','Hyundai HD','Arm Roll','Rusak Berat','badge-red'],
      ['L 1299 GH','Mitsubishi','Compactor','Baik','badge-green'],
      ['L 1301 IJ','Hino Ranger','Dump Truck','Hilang','badge-slate'],
    ];
    const tb = rows.map(r=>'<tr><td class="mono">'+r[0]+'</td><td>'+r[1]+'</td><td>'+r[2]+'</td><td>'+pill(r[3],r[4])+'</td><td style="text-align:right"><span class="muted" style="cursor:pointer;font-size:17px">⋮</span></td></tr>').join('');
    const content = crumbs(['Master Data','Kendaraan'])+
      '<div class="pg-head"><div><h1>Kendaraan</h1><p class="sub">Daftar armada pengangkut sampah.</p></div>'+btn('+ Buat Baru','btn-primary')+'</div>'+
      '<div class="toolbar2"><div class="input-group" style="max-width:300px"><input class="input" placeholder="Cari nomor polisi / merek…" /></div>'+
        btn('Filter: Status ▾','btn-outline btn-sm')+btn('Kolom ▾','btn-outline btn-sm')+'<div class="grow"></div><span class="muted" style="font-size:12.5px">200 kendaraan</span></div>'+
      '<div class="card" style="padding:0;overflow:hidden">'+
        '<table class="table"><thead><tr><th class="sortable">Nopol <span class="sort-ico">↑</span></th><th class="sortable">Merek</th><th>Aplikasi</th><th>Status</th><th style="text-align:right;width:70px">Aksi</th></tr></thead><tbody>'+tb+'</tbody></table>'+
        '<div class="row" style="justify-content:space-between;align-items:center;padding:12px 14px;border-top:1px solid var(--neutral-200)"><span class="muted" style="font-size:12.5px">Menampilkan 1–25 dari 200</span>'+
          '<div class="row" style="gap:8px;align-items:center"><button class="btn btn-outline btn-sm" disabled>‹</button><span class="mono" style="font-size:12.5px">Hal 1 / 8</span><button class="btn btn-outline btn-sm">›</button></div></div>'+
      '</div>'+
      '<p class="a-sec" style="margin-top:26px;color:var(--neutral-400)">Status daftar</p>'+
      states([
        {cap:'Kosong', body:'<div class="ic">▤</div><p>Belum ada data</p><span class="note">Tambah kendaraan pertama.</span><button class="btn btn-primary btn-sm" style="margin-top:4px">+ Buat Baru</button>'},
        {cap:'Memuat', body:'<div class="col" style="gap:10px;width:100%"><div class="skeleton" style="width:100%"></div><div class="skeleton" style="width:88%"></div><div class="skeleton" style="width:94%"></div><div class="skeleton" style="width:80%"></div></div>'},
        {cap:'Galat', body:'<div class="ic" style="color:var(--danger-500)">⚠</div><p>Gagal memuat data</p><span class="note">Periksa koneksi.</span><button class="btn btn-secondary btn-sm" style="margin-top:4px">Coba Lagi</button>'},
      ]);
    return frame('app.swat…/master-data/vehicles', shell('vehicle', content));
  },
  annot:{
    title:'Kendaraan — Daftar', kicker:'Master Data · contoh konkret',
    desc:'Instansi konkret dari Pola CRUD (06). Kolom & filter spesifik entitas Kendaraan.',
    annot:[
      A(1,'Kolom: <b>Nopol</b> (<code>mono</code>) · Merek (VehicleModel) · Aplikasi · Status · Aksi.'),
      A(2,'Cari: nomor polisi atau merek. Filter <span class="cmp">Popover</span> Status: Baik / Rusak Ringan / Rusak Berat / Hilang.'),
      A(3,'<span class="cmp">Badge</span> status dari enum VehicleStatus (green / amber / red / slate) — warna + teks + titik.'),
      A(4,'"⋮" → <span class="cmp">DropdownMenu</span>: Lihat detail · Ubah · Hapus (membuka <span class="cmp">AlertDialog</span>).'),
      A(5,'Buat/Ubah membuka <span class="cmp">Dialog</span> form (lihat layar 08).'),
      A(6,'Tiga status tabel: kosong / memuat (skeleton ×10) / galat — pola identik semua list.'),
    ]
  }
};

/* ----------------------------------------------- 08 KENDARAAN FORM ---- */
SCREENS.vehicleForm = {
  group:'Master Data', ix:'08', label:'Kendaraan — Form', chrome:'plain',
  crumb:'Kendaraan / <b>Tambah</b>', route:'(Dialog) /master-data/vehicles',
  render(){
    const body =
      divlbl('Data Dasar')+
      '<div class="grid2" style="gap:14px">'+
        field('Nomor Polisi','<input class="input mono" placeholder="mis. L 1234 AB" />',{req:true,err:'Nomor polisi sudah ada.'})+
        field('Tahun Pembuatan','<input class="input tnum" value="2021" />',{req:true,help:'1990–2030.'})+
        field('Merek / Model','<select class="select"><option>Pilih model…</option><option>Hino Dutro</option><option>Isuzu Elf</option></select>',{req:true})+
        field('Aplikasi','<select class="select"><option>Compactor</option><option>Dump Truck</option><option>Arm Roll</option></select>',{req:true})+
      '</div>'+
      divlbl('Dimensi & Odometer')+
      '<div class="grid2" style="gap:14px">'+
        field('Berat Kosong Saat Ini','<div class="input-group"><input class="input tnum" value="4.200" /><span class="input-affix">kg</span></div>',{req:true})+
        field('Odometer Saat Ini','<div class="input-group"><input class="input tnum" value="125.400" /><span class="input-affix">km</span></div>',{req:true})+
      '</div>'+
      divlbl('Masa Berlaku')+
      '<div class="grid2" style="gap:14px">'+
        field('Masa Berlaku STNK','<div class="input-group"><input class="input" value="15/03/2028" /><span class="input-affix">▦</span></div>',{help:'dd/MM/yyyy'})+
        field('Masa Berlaku Pajak STNK','<div class="input-group"><input class="input" value="15/03/2027" /><span class="input-affix">▦</span></div>')+
      '</div>'+
      field('Catatan','<textarea class="textarea" placeholder="Catatan tambahan (opsional)"></textarea>',{mb0:true});
    const foot = '<button class="btn btn-secondary">Batal</button><button class="btn btn-primary">Simpan</button>';
    return frame('(Dialog) Tambah Kendaraan', modalStage(dialog('Tambah Kendaraan', body, foot, 600), 'Dibuka dari Kendaraan → Daftar'));
  },
  annot:{
    title:'Kendaraan — Create / Edit', kicker:'Master Data',
    desc:'Form dalam <span class="cmp">Dialog</span>. Judul "Tambah Kendaraan" (buat) / "Ubah Kendaraan" (edit). Field dikelompokkan jadi seksi.',
    annot:[
      A(1,'Empat seksi: <b>Data Dasar · Dimensi &amp; Odometer · Masa Berlaku · Catatan</b> — tiap seksi kelompok <span class="cmp">FormField</span>.'),
      A(2,'Nopol: wajib, unik (cek backend) → galat inline "Nomor polisi sudah ada".'),
      A(3,'Merek &amp; Aplikasi: <span class="cmp">Select</span> wajib. Tahun: <span class="cmp">NumberInput</span> 1990–2030.'),
      A(4,'Berat/Odometer: <span class="cmp">NumberInput</span> dengan sufiks <code>kg</code>/<code>km</code>, <code>tabular-nums</code>.'),
      A(5,'Tanggal: <span class="cmp">DatePicker</span> format <code>dd/MM/yyyy</code>.'),
      A(6,'Footer lengket: Batal (secondary) + Simpan (primary). Sukses → <span class="cmp">Toast</span> "Berhasil ditambahkan", tutup, refetch.'),
    ]
  }
};

/* ----------------------------------------------- 10 CREW SCHEDULE ----- */
SCREENS.crew = {
  group:'Penjadwalan', ix:'10', label:'Jadwal Kru', chrome:'shell', active:'crew',
  crumb:'Penjadwalan / <b>Jadwal Kru</b>', route:'/scheduling/crew-schedules',
  render(){
    const rows=[
      ['L 1234 AB','Budi Santoso','06:00','17:00','5'],
      ['L 1255 CD','Citra Lestari','06:30','16:30','4'],
      ['L 1299 GH','Dedi Pranoto','05:30','15:30','6'],
    ];
    const tb=rows.map(r=>'<tr><td class="mono">'+r[0]+'</td><td>'+r[1]+'</td><td class="mono">'+r[2]+'</td><td class="mono">'+r[3]+'</td><td class="num">'+r[4]+'</td><td>'+pill('Berlaku','badge-green')+'</td><td style="text-align:right"><span class="muted" style="cursor:pointer;font-size:17px">⋮</span></td></tr>').join('');
    const content = crumbs(['Penjadwalan','Jadwal Kru'])+
      '<div class="pg-head"><div><h1>Jadwal Kru</h1><p class="sub">Pasangan tetap kendaraan + pengemudi (template harian).</p></div>'+btn('+ Buat Jadwal','btn-primary')+'</div>'+
      '<div class="toolbar2"><div class="input-group" style="max-width:300px"><input class="input" placeholder="Cari nopol / pengemudi…" /></div>'+btn('Filter: Pool ▾','btn-outline btn-sm')+'<div class="grow"></div><span class="muted" style="font-size:12.5px">42 jadwal</span></div>'+
      '<div class="card" style="padding:0;overflow:hidden"><table class="table"><thead><tr><th class="sortable">Kendaraan</th><th class="sortable">Pengemudi</th><th>Berangkat</th><th>Kembali</th><th class="num">Trayek</th><th>Status</th><th style="text-align:right;width:60px">Aksi</th></tr></thead><tbody>'+tb+'</tbody></table></div>';
    return frame('app.swat…/scheduling/crew-schedules', shell('crew', content));
  },
  annot:{
    title:'Jadwal Kru', kicker:'Penjadwalan',
    desc:'CrewSchedule: kendaraan↔pengemudi dengan waktu berangkat/kembali tetap; benih untuk init harian.',
    annot:[
      A(1,'List mengikuti Pola CRUD (06). Kolom: Kendaraan · Pengemudi · Berangkat · Kembali · jumlah Trayek · Status.'),
      A(2,'Waktu <code>HH:mm</code> (<code>mono</code>). Unik per (kendaraan, pengemudi) — duplikat → "Kendaraan dan pengemudi ini sudah terjadwal".'),
      A(3,'Buat: <span class="cmp">Combobox</span> Kendaraan (status=Baik) + Pengemudi (peringatan bila SIM kedaluwarsa) + dua <span class="cmp">TimePicker</span>.'),
      A(4,'Validasi: <code>returnTime &gt; departTime</code> → "Waktu kembali harus setelah waktu berangkat".'),
      A(5,'"⋮" → Ubah membuka detail (layar 11) untuk kelola legs (Template Trayek).'),
    ]
  }
};

/* ----------------------------------------------- 11 TRIP TEMPLATE ----- */
SCREENS.template = {
  group:'Penjadwalan', ix:'11', label:'Template Trayek', chrome:'shell', active:'crew',
  crumb:'Jadwal Kru / <b>Detail</b>', route:'/scheduling/crew-schedules/:id',
  render(){
    const legs=[
      ['Berangkat dari Pool','Pool Wonokromo → —','06:00','—'],
      ['Pengisian Bahan Bakar','— → SPBU Ahmad Yani','06:15','20,00'],
      ['Pengambilan Sampah','TPS Ketintang → —','07:30','—'],
      ['Pembuangan Sampah','— → TPA Benowo','08:45','—'],
      ['Kembali ke Pool','TPA Benowo → Pool','16:30','—'],
    ];
    const tb=legs.map((l,i)=>'<tr><td><span class="muted mono">'+(i+1)+'</span></td><td>'+l[0]+'</td><td class="muted">'+l[1]+'</td><td class="mono">'+l[2]+'</td><td class="num">'+l[3]+'</td><td style="text-align:right"><span class="muted" style="cursor:grab">⠿</span></td></tr>').join('');
    const content = crumbs(['Penjadwalan','Jadwal Kru','Detail'])+
      '<div class="pg-head"><div><h1>L 1234 AB · Budi Santoso</h1><p class="sub">Pool Wonokromo · Hino Dutro (Compactor)</p></div>'+btn('Simpan','btn-primary')+'</div>'+
      '<div class="card" style="padding:18px;margin-bottom:16px"><b style="font-size:14px">Waktu Jadwal</b>'+
        '<div class="grid2" style="gap:14px;margin-top:12px;max-width:520px">'+field('Berangkat','<input class="input mono" value="06:00" />',{req:true,mb0:true})+field('Kembali','<input class="input mono" value="17:00" />',{req:true,mb0:true})+'</div></div>'+
      '<div class="card" style="padding:0;overflow:hidden"><div class="row" style="justify-content:space-between;align-items:center;padding:14px 16px;border-bottom:1px solid var(--neutral-200)"><b style="font-size:14px">Trayek Terencana</b>'+btn('+ Tambah Trayek','btn-outline btn-sm')+'</div>'+
        '<table class="table"><thead><tr><th style="width:30px">#</th><th>Jenis (RouteCategory)</th><th>Rute</th><th>Target</th><th class="num">BBM (L)</th><th style="text-align:right;width:50px"></th></tr></thead><tbody>'+tb+'</tbody></table></div>';
    return frame('app.swat…/scheduling/crew-schedules/23', shell('crew', content));
  },
  annot:{
    title:'Template Trayek (legs)', kicker:'Penjadwalan',
    desc:'Detail Jadwal Kru: ubah waktu + kelola TripTemplate (legs berurutan).',
    annot:[
      A(1,'Header: kendaraan + pengemudi + pool. Seksi 1: dua <span class="cmp">TimePicker</span> waktu jadwal.'),
      A(2,'Seksi 2 — <span class="cmp">DataTable</span> legs terurut per RouteCategory: Berangkat Pool → Refuel → Pickup → Disposal → Kembali Pool.'),
      A(3,'Reorder via drag (<span class="kbd">⠿</span>) — urutan disimpan sesuai insertion order.'),
      A(4,'Tambah leg: <span class="cmp">Dialog</span> pilih <span class="cmp">Combobox</span> Rute + <span class="cmp">TimePicker</span> target + BBM diminta (hanya REFUEL yang memakainya).'),
      A(5,'Target di luar rentang berangkat–kembali → diterima dengan <b>peringatan</b> (tidak ditolak).'),
    ]
  }
};

/* ----------------------------------------------- 12 FUEL QUOTA -------- */
SCREENS.quota = {
  group:'Penjadwalan', ix:'12', label:'Jatah Kitir', chrome:'shell', active:'quota',
  crumb:'Penjadwalan / <b>Jatah Kitir</b>', route:'/scheduling/fuel-quotas',
  render(){
    const rows=[
      ['KT-202606-0042','L 1234 AB','TPA Benowo','01/01/2026','31/12/2026','Berlaku','badge-green'],
      ['KT-202606-0043','L 1255 CD','TPA Benowo','01/01/2026','30/06/2026','Berlaku','badge-green'],
      ['KT-202512-0911','L 1301 IJ','TPA Romokalisari','01/12/2025','31/12/2025','Tidak Berlaku','badge-slate'],
    ];
    const tb=rows.map(r=>'<tr><td class="mono">'+r[0]+'</td><td class="mono">'+r[1]+'</td><td>'+r[2]+'</td><td class="mono">'+r[3]+'</td><td class="mono">'+r[4]+'</td><td>'+pill(r[5],r[6])+'</td><td style="text-align:right"><span class="muted" style="cursor:pointer;font-size:17px">⋮</span></td></tr>').join('');
    const content = crumbs(['Penjadwalan','Jatah Kitir'])+
      '<div class="pg-head"><div><h1>Jatah Kitir</h1><p class="sub">Otorisasi kendaraan ↔ lokasi (TPA) untuk rentang tanggal.</p></div><div class="row">'+btn('Impor Massal','btn-outline')+btn('+ Terbitkan Kitir','btn-primary')+'</div></div>'+
      '<div class="toolbar2"><div class="input-group" style="max-width:300px"><input class="input" placeholder="Cari kode / nopol…" /></div>'+btn('Filter: Status ▾','btn-outline btn-sm')+btn('Berlaku pada ▾','btn-outline btn-sm')+'<div class="grow"></div><span class="muted" style="font-size:12.5px">3,3 jt entri</span></div>'+
      '<div class="card" style="padding:0;overflow:hidden"><table class="table"><thead><tr><th class="sortable">Kode</th><th class="sortable">Kendaraan</th><th>Lokasi</th><th>Berlaku Dari</th><th>Berlaku Sampai</th><th>Status</th><th style="text-align:right;width:60px">Aksi</th></tr></thead><tbody>'+tb+'</tbody></table></div>';
    return frame('app.swat…/scheduling/fuel-quotas', shell('quota', content));
  },
  annot:{
    title:'Jatah Kitir (FuelQuota)', kicker:'Penjadwalan',
    desc:'Tabel volume sangat tinggi (~3,3 jt baris). Kode kitir dicocokkan di jembatan timbang (Fase 4).',
    annot:[
      A(1,'Kolom: Kode (<code>mono</code>, <code>KT-YYYYMM-NNNN</code>) · Kendaraan · Lokasi · Berlaku Dari/Sampai · Status.'),
      A(2,'Dua aksi: <b>Impor Massal</b> (CSV/Excel, <span class="cmp">Dropzone</span> + preview + <span class="cmp">Progress</span>) &amp; <b>Terbitkan Kitir</b>.'),
      A(3,'Terbitkan: <span class="cmp">Combobox</span> Kendaraan (status=Baik) + Site (TPA) + dua <span class="cmp">DatePicker</span> + <span class="cmp">RadioGroup</span> status.'),
      A(4,'Validasi: <code>validTo ≥ validFrom</code>; peringatan bila sudah ada kitir aktif untuk (kendaraan, lokasi) yang sama.'),
      A(5,'Kedaluwarsa implisit: <code>validTo &lt; hari ini</code> diperlakukan tidak berlaku — <span class="cmp">Badge</span> slate.'),
    ]
  }
};

/* ----------------------------------------------- 13 HARI TRANSAKSI ---- */
SCREENS.day = {
  group:'Transaksi', ix:'13', label:'Hari Transaksi', chrome:'shell', active:'day',
  crumb:'Transaksi / <b>Hari Transaksi</b>', route:'/transaksi/hari-transaksi',
  render(){
    const rows=[
      ['5 Jun 2026','Belum Selesai','badge-amber','28','87,5'],
      ['4 Jun 2026','Selesai','badge-blue','27','132,6'],
      ['3 Jun 2026','Selesai','badge-blue','25','118,9'],
      ['2 Jun 2026','Selesai','badge-blue','26','141,2'],
    ];
    const tb=rows.map(r=>'<tr><td class="mono">'+r[0]+'</td><td>'+pill(r[1],r[2])+'</td><td class="num">'+r[3]+'</td><td class="num">'+r[4]+'</td><td style="text-align:right">'+btn('Lihat Board','btn-ghost btn-sm')+'</td></tr>').join('');
    const content = crumbs(['Transaksi','Hari Transaksi'])+
      '<div class="pg-head"><div><h1>Hari Transaksi</h1><p class="sub">Setiap tanggal operasional mengelompokkan seluruh haul.</p></div>'+btn('+ Inisiasi Hari','btn-primary')+'</div>'+
      '<div class="alert alert-info" style="margin-bottom:14px"><div><div class="alert-title">Inisiasi Hari</div>Membuat Hari Transaksi untuk tanggal terpilih &amp; menebar Haul + penugasan dari Jadwal Kru aktif. Idempoten — tanggal yang sama mengambil data yang ada.</div></div>'+
      '<div class="toolbar2"><div class="input-group" style="max-width:280px"><input class="input" placeholder="Cari tanggal…" /></div>'+btn('Filter: Status ▾','btn-outline btn-sm')+'<div class="grow"></div><span class="muted" style="font-size:12.5px">85 hari</span></div>'+
      '<div class="card" style="padding:0;overflow:hidden"><table class="table"><thead><tr><th class="sortable">Tanggal <span class="sort-ico">↓</span></th><th>Status</th><th class="num">Kendaraan</th><th class="num">Tonase (ton)</th><th style="text-align:right;width:130px">Aksi</th></tr></thead><tbody>'+tb+'</tbody></table></div>';
    return frame('app.swat…/transaksi/hari-transaksi', shell('day', content));
  },
  annot:{
    title:'Hari Transaksi', kicker:'Transaksi',
    desc:'Template A (List). Aksi utama "Inisiasi Hari" membuat TransactionDay + menebar haul dari Jadwal Kru.',
    annot:[
      A(1,'<b>Inisiasi Hari</b> (<span class="cmp">Button</span> primary): <code>POST /transaction-days/:date/initiate</code>. Idempoten — tanggal sama → ambil yang ada.'),
      A(2,'<span class="cmp">Alert</span> info menjelaskan efek aksi (seed Haul + HaulAssignment).'),
      A(3,'Kolom: Tanggal (urut turun) · Status (DayStatus amber/blue) · jumlah Kendaraan · Tonase total.'),
      A(4,'Tonase = Σ berat dari trayek DISPOSAL hari itu, <code>tabular-nums</code>.'),
      A(5,'<b>Lihat Board</b> → navigasi ke Haul Board harian (layar 14).'),
    ]
  }
};

/* ----------------------------------------------- 14 HAUL BOARD -------- */
SCREENS.board = {
  group:'Transaksi', ix:'14', label:'Haul Board (harian)', chrome:'shell', active:'day',
  crumb:'Hari Transaksi / <b>05 Jun 2026</b>', route:'/transaksi/hari-transaksi/2026-06-05',
  render(){
    const haul=(np,drv,bt,ba,kt,ka,rit,vt,vc)=>'<div class="haul-row">'+
      '<div><div class="mono" style="font-weight:600">'+np+'</div><div class="muted" style="font-size:12px">'+drv+'</div></div>'+
      '<div>'+pill(vt,vc)+'</div>'+
      '<div class="tt">Berangkat<b>'+bt+' / '+ba+'</b></div>'+
      '<div class="tt">Kembali<b>'+kt+' / '+ka+'</b></div>'+
      '<div class="tt">Ritase<b>'+rit+'</b></div>'+
      '<div class="row" style="gap:6px"><button class="btn btn-outline btn-sm">Edit</button><button class="btn btn-ghost btn-sm">Lihat ›</button></div>'+
    '</div>';
    const content = crumbs(['Transaksi','Hari Transaksi','05 Jun 2026'])+
      '<div class="pg-head"><div><h1>Haul · 5 Juni 2026</h1><p class="sub row" style="gap:10px;align-items:center">'+pill('Belum Selesai','badge-amber')+' <span>28 kendaraan aktif · 3/5 trayek terverifikasi</span></p></div>'+btn('Tandai Hari Selesai','btn-outline')+'</div>'+
      '<div class="hcol-h"><span>Kendaraan</span><span>Verifikasi</span><span>Berangkat (T/A)</span><span>Kembali (T/A)</span><span>Ritase</span><span></span></div>'+
      haul('L 1234 AB','Budi Santoso','06:00','06:05','17:00','—','3/5','3/5 Terverifikasi','badge-green')+
      haul('L 1255 CD','Citra Lestari','06:30','06:38','16:30','—','1/4','1/4 Terverifikasi','badge-amber')+
      haul('L 1299 GH','Dedi Pranoto','05:30','05:30','15:30','15:48','6/6','6/6 Terverifikasi','badge-green')+
      haul('L 1301 IJ','Eka Wijaya','06:00','—','17:00','—','0/5','Belum mulai','badge-slate');
    return frame('app.swat…/transaksi/hari-transaksi/2026-06-05', shell('day', content));
  },
  annot:{
    title:'Haul Board (harian)', kicker:'Transaksi',
    desc:'Template C (Detail/Board): satu baris-kartu per haul (penugasan kendaraan) hari itu.',
    annot:[
      A(1,'Header: H2 tanggal + <span class="cmp">Badge</span> DayStatus + ringkasan ("28 aktif · 3/5 terverifikasi").'),
      A(2,'Tiap baris (<span class="cmp">Card</span>): Nopol (<code>mono</code>) · Pengemudi · Berangkat &amp; Kembali (target/aktual) · Ritase · aksi.'),
      A(3,'<span class="cmp">Badge</span> progres verifikasi "X/Y Terverifikasi" — hijau bila >75%, amber bila kurang, slate bila belum mulai.'),
      A(4,'<b>Edit</b> → <span class="cmp">Dialog</span> Rekalibrasi Berangkat/Kembali (layar 19).'),
      A(5,'<b>Lihat ›</b> → daftar trayek haul (Pickup / Disposal / Refuel) untuk dicatat (layar 15–17).'),
      A(6,'Kosong: "Belum ada kendaraan hari ini".'),
    ]
  }
};

/* ----------------------------------------------- 15 PICKUP ------------ */
SCREENS.pickup = {
  group:'Transaksi', ix:'15', label:'Pengambilan Sampah', chrome:'plain',
  crumb:'Haul / <b>Catat Pengambilan</b>', route:'(Dialog) /transaksi/pengambilan/:haulId',
  render(){
    const body =
      ctxLine('L 1234 AB','Hino Dutro (Compactor) · Pengemudi: Budi Santoso')+
      '<div class="stepper" style="margin-bottom:18px"><div class="step done"><span class="dot">✓</span><span class="stitle">Pilih Trayek</span></div><div class="step-line done"></div><div class="step active"><span class="dot">2</span><span class="stitle">Catat Aktual</span></div><div class="step-line"></div><div class="step upcoming"><span class="dot">3</span><span class="stitle">Konfirmasi</span></div></div>'+
      '<div class="card" style="padding:13px 15px;margin-bottom:16px;border-color:var(--primary-200);background:var(--primary-50)"><div class="row" style="justify-content:space-between;align-items:center"><div><b style="font-size:13px">Pengambilan dari TPS Ketintang</b><div class="muted" style="font-size:12px">Target 07:30</div></div>'+pill('Dipilih','badge-green')+'</div></div>'+
      '<div class="grid2" style="gap:14px">'+
        field('Waktu Aktual','<div class="input-group"><input class="input mono" value="07:32" /><span class="input-affix">◷</span></div>',{req:true,help:'Tombol cepat: Sekarang'})+
        field('Odometer Aktual','<div class="input-group"><input class="input tnum" value="125.490" /><span class="input-affix">km</span></div>',{req:true,help:'≥ odometer berangkat'})+
        field('Sumber Sampah','<select class="select"><option>Pilih sumber…</option><option>Dinas</option><option>Pasar</option><option>Swasta</option></select>',{req:true})+
        field('Volume (opsional)','<div class="input-group"><input class="input tnum" value="" placeholder="—" /><span class="input-affix">m³</span></div>')+
      '</div>'+
      field('Catatan','<textarea class="textarea" placeholder="Catatan (opsional)"></textarea>',{mb0:true});
    const foot='<button class="btn btn-secondary">Batal</button><button class="btn btn-primary">Simpan</button>';
    return frame('(Dialog) Catat Pengambilan Sampah', modalStage(dialog('Catat Pengambilan Sampah', body, foot, 580),'Dibuka dari Haul Board → Lihat trayek'));
  },
  annot:{
    title:'Record Pengambilan (Pickup)', kicker:'Transaksi',
    desc:'Form 2-langkah dalam <span class="cmp">Dialog</span>: pilih trayek PICKUP → catat aktual.',
    annot:[
      A(1,'<span class="cmp">Stepper</span>: Pilih Trayek → Catat Aktual → Konfirmasi (kolaps jadi "Langkah 2 dari 3" di mobile).'),
      A(2,'Konteks kendaraan/pengemudi terpampang (read-only) di atas.'),
      A(3,'Trayek terpilih disorot; bisa "Tambah Trayek Baru" bila ad-hoc.'),
      A(4,'<span class="cmp">TimePicker</span> (default sekarang, preset "Sekarang") + <span class="cmp">NumberInput</span> odometer (≥ berangkat).'),
      A(5,'<span class="cmp">Select</span> Sumber Sampah (VehicleWasteSource). Volume opsional.'),
      A(6,'Simpan → <code>POST /trips/:id/record-pickup</code>, status → Selesai (DONE), <span class="cmp">Toast</span>, refresh board.'),
    ]
  }
};

/* ----------------------------------------------- 16 DISPOSAL ---------- */
SCREENS.disposal = {
  group:'Transaksi', ix:'16', label:'Pembuangan + Timbangan', chrome:'plain',
  crumb:'Haul / <b>Catat Pembuangan</b>', route:'(Dialog) /transaksi/pembuangan/:haulId',
  render(){
    const body =
      ctxLine('L 1234 AB','Pembuangan ke TPA Benowo · Target 08:45')+
      divlbl('Data Timbangan')+
      '<div class="grid2" style="gap:14px">'+
        field('Berat Kosong (Tare)','<div class="input-group"><input class="input tnum" value="5.200" /><span class="input-affix">kg</span></div>',{req:true,help:'Prefill dari kendaraan, dapat diubah.'})+
        field('Berat Kotor (Gross)','<div class="input-group"><input class="input tnum" value="10.850" /><span class="input-affix">kg</span></div>',{req:true})+
      '</div>'+
      '<div class="card" style="padding:14px 16px;margin:2px 0 16px;background:var(--success-50);border-color:var(--success-100)"><div class="row" style="justify-content:space-between;align-items:center"><div><div class="muted" style="font-size:12px">Berat Bersih (otomatis: Kotor − Kosong)</div><div class="tnum" style="font-size:22px;font-weight:700;color:var(--success-700)">5.650 <span style="font-size:13px;font-weight:500">kg</span></div></div><span class="badge badge-green"><span class="dot"></span>Read-only</span></div></div>'+
      '<div class="alert alert-warning" style="margin-bottom:16px"><div><div class="alert-title">Validasi</div>Berat Kotor harus ≥ Berat Kosong. Bila tidak, tombol Simpan dinonaktifkan.</div></div>'+
      field('Volume Sampah (opsional)','<div class="input-group"><input class="input tnum" value="5,2" /><span class="input-affix">m³</span></div>')+
      divlbl('Rekalibrasi Perjalanan')+
      '<div class="grid2" style="gap:14px">'+
        field('Waktu Aktual','<input class="input mono" value="08:50" />',{req:true})+
        field('Odometer Aktual','<div class="input-group"><input class="input tnum" value="125.620" /><span class="input-affix">km</span></div>',{req:true})+
      '</div>'+
      field('Catatan','<textarea class="textarea" placeholder="Catatan (opsional)"></textarea>',{mb0:true});
    const foot='<button class="btn btn-secondary">Batal</button><button class="btn btn-primary">Simpan</button>';
    return frame('(Dialog) Catat Pembuangan Sampah', modalStage(dialog('Catat Pembuangan Sampah + Timbangan', body, foot, 600),'Dibuka dari Haul Board → Lihat trayek'));
  },
  annot:{
    title:'Record Pembuangan + Timbangan', kicker:'Transaksi',
    desc:'Catat berat di jembatan timbang; Berat Bersih dihitung otomatis sisi-klien.',
    annot:[
      A(1,'<b>Berat Kosong</b> prefill dari <code>vehicle.currentTareWeight</code>, dapat diubah.'),
      A(2,'<b>Berat Kotor</b> wajib (<span class="cmp">NumberInput</span>, <code>kg</code>).'),
      A(3,'<b>Berat Bersih = Kotor − Kosong</b> dihitung saat blur, ditampilkan <b>read-only</b> (kotak hijau). Server menghitung ulang — tak percaya nilai klien.'),
      A(4,'Validasi <code>Kotor ≥ Kosong</code>: bila gagal → <span class="cmp">Alert</span>/galat inline merah, <span class="cmp">Button</span> Simpan nonaktif.'),
      A(5,'Volume opsional (m³). Seksi rekalibrasi: <span class="cmp">TimePicker</span> + odometer aktual.'),
      A(6,'Simpan → <code>POST /trips/:id/record-disposal</code>; perbarui <code>currentTareWeight</code> kendaraan; status → Selesai.'),
    ]
  }
};

/* ----------------------------------------------- 17 REFUEL ------------ */
SCREENS.refuel = {
  group:'Transaksi', ix:'17', label:'Bahan Bakar', chrome:'plain',
  crumb:'Haul / <b>Catat Bahan Bakar</b>', route:'(Dialog) /transaksi/bahan-bakar/:haulId',
  render(){
    const body =
      ctxLine('L 1234 AB','Pengisian di SPBU Ahmad Yani · Target 06:15')+
      '<div class="grid2" style="gap:14px">'+
        field('Jenis Bahan Bakar','<select class="select"><option>Solar</option><option>Dexlite</option><option>Pertalite</option></select>',{req:true,help:'Difilter sesuai model kendaraan.'})+
        field('Jumlah Diminta','<div class="input-group"><input class="input tnum" value="50,00" /><span class="input-affix">L</span></div>',{req:true})+
        field('Jumlah Disetujui','<div class="input-group"><input class="input tnum" value="50,00" disabled /><span class="input-affix">L</span></div>',{help:'Default = Diminta. Hanya peran dengan hak persetujuan dapat mengubah.'})+
        field('Waktu Aktual','<input class="input mono" value="06:20" />',{req:true})+
      '</div>'+
      field('Odometer Aktual','<div class="input-group" style="max-width:260px"><input class="input tnum" value="125.430" /><span class="input-affix">km</span></div>',{req:true})+
      '<div class="alert alert-warning" style="margin-bottom:16px"><div><div class="alert-title">Validasi</div>Jumlah Disetujui harus ≤ Jumlah Diminta.</div></div>'+
      field('Catatan','<textarea class="textarea" placeholder="Catatan (opsional)"></textarea>',{mb0:true});
    const foot='<button class="btn btn-secondary">Batal</button><button class="btn btn-primary">Simpan</button>';
    return frame('(Dialog) Catat Pengisian Bahan Bakar', modalStage(dialog('Catat Pengisian Bahan Bakar', body, foot, 580),'Dibuka dari Haul Board → Lihat trayek'));
  },
  annot:{
    title:'Record Bahan Bakar (Fuel)', kicker:'Transaksi',
    desc:'Catat BBM untuk trayek REFUEL dengan alur persetujuan.',
    annot:[
      A(1,'<span class="cmp">Select</span> Jenis BBM difilter sesuai BBM kompatibel model kendaraan.'),
      A(2,'<b>Jumlah Diminta</b> wajib (desimal 2 angka, <code>L</code>).'),
      A(3,'<b>Jumlah Disetujui</b> default = Diminta; <b>disabled</b> (abu-abu, cursor not-allowed) kecuali peran punya hak persetujuan (mis. DataAdmin).'),
      A(4,'Validasi <code>Disetujui ≤ Diminta</code>: bila gagal → galat inline, Simpan nonaktif.'),
      A(5,'<span class="cmp">TimePicker</span> + odometer aktual. Simpan → <code>POST /trips/:id/record-fuel</code>, status → Selesai.'),
    ]
  }
};

/* ----------------------------------------------- 18 VERIFY ------------ */
SCREENS.verify = {
  group:'Transaksi', ix:'18', label:'Verifikasi Trayek', chrome:'plain',
  crumb:'Haul / <b>Verifikasi Trayek</b>', route:'(Dialog) /transaksi/verifikasi/:tripId',
  render(){
    const body =
      '<div class="row" style="gap:8px;margin-bottom:14px">'+pill('Pembuangan Sampah','badge-blue')+'<span class="muted" style="font-size:12.5px;align-self:center">TPS Ketintang → TPA Benowo</span></div>'+
      '<dl class="dl" style="margin-bottom:6px">'+
        '<dt>Waktu Target → Aktual</dt><dd class="mono">08:45 → 08:50 <span class="muted">(+5 mnt)</span></dd>'+
        '<dt>Odometer Target → Aktual</dt><dd class="mono">125.500 → 125.620 km</dd>'+
        '<dt>Berat Kosong</dt><dd class="tnum">5.200 kg</dd>'+
        '<dt>Berat Kotor</dt><dd class="tnum">10.850 kg</dd>'+
        '<dt>Berat Bersih</dt><dd class="tnum" style="color:var(--success-700)">5.650 kg</dd>'+
        '<dt>Volume</dt><dd class="tnum">5,2 m³</dd>'+
        '<dt>Dicatat oleh</dt><dd>Ali Darmawan · 05/06/2026 08:52</dd>'+
      '</dl>'+
      '<div class="alert alert-success" style="margin:14px 0"><div><div class="alert-title">Siap diverifikasi</div>Data lengkap dan konsisten.</div></div>'+
      field('Catatan (untuk penolakan)','<textarea class="textarea" placeholder="Alasan penolakan (opsional)"></textarea>',{mb0:true});
    const foot='<button class="btn btn-secondary">Tolak</button><button class="btn btn-primary">Terverifikasi</button>';
    return frame('(Dialog) Verifikasi Trayek', modalStage(dialog('Verifikasi Trayek', body, foot, 540),'Hanya peran Checker'));
  },
  annot:{
    title:'Trip Verification (Checker)', kicker:'Transaksi',
    desc:'Hanya peran Checker. Tampilan read-only rincian trayek → setujui atau tolak.',
    annot:[
      A(1,'Rincian read-only memakai <span class="cmp">DescriptionList</span> (term kiri / nilai kanan, <code>tabular-nums</code>, kode <code>mono</code>).'),
      A(2,'Target vs Aktual ditampilkan berdampingan untuk waktu &amp; odometer.'),
      A(3,'Hanya Checker melihat layar ini (peran lain: item disembunyikan).'),
      A(4,'<span class="cmp">FormField</span> textarea catatan — wajib konteks bila menolak.'),
      A(5,'<b>Tolak</b> (secondary) → status kembali Selesai + simpan catatan; bisa dicatat ulang. <b>Terverifikasi</b> (primary) → status VERIFIED, set verifiedBy/verifiedAt.'),
      A(6,'Trayek terverifikasi jadi read-only (Ubah/Hapus tersembunyi, tooltip "Sudah terverifikasi").'),
    ]
  }
};

/* ----------------------------------------------- 19 RECONCILE --------- */
SCREENS.reconcile = {
  group:'Transaksi', ix:'19', label:'Rekalibrasi Berangkat/Kembali', chrome:'plain',
  crumb:'Haul Board / <b>Rekalibrasi</b>', route:'(Dialog) /haul-assignments/:id',
  render(){
    const body =
      ctxLine('L 1234 AB','Hino Dutro · Pengemudi: Budi Santoso')+
      divlbl('Berangkat dari Pool')+
      '<div class="grid2" style="gap:14px">'+
        field('Waktu (Target 06:00)','<input class="input mono" value="06:05" />',{req:true})+
        field('Odometer (Target 125.400)','<div class="input-group"><input class="input tnum" value="125.400" /><span class="input-affix">km</span></div>',{req:true})+
      '</div>'+
      divlbl('Kembali ke Pool')+
      '<div class="grid2" style="gap:14px">'+
        field('Waktu (Target 17:00)','<input class="input mono" value="17:15" />')+
        field('Odometer (Target 125.750)','<div class="input-group"><input class="input tnum" value="125.880" /><span class="input-affix">km</span></div>')+
      '</div>'+
      '<div class="alert alert-warning" style="margin-bottom:8px"><div><div class="alert-title">Validasi</div>Aktual harus ≥ target (berangkat &amp; kembali). Saat kembali, odometer kendaraan diperbarui.</div></div>';
    const foot='<button class="btn btn-secondary">Batal</button><button class="btn btn-primary">Simpan</button>';
    return frame('(Dialog) Rekalibrasi Berangkat/Kembali', modalStage(dialog('Rekalibrasi Berangkat / Kembali', body, foot, 560),'Dibuka dari Haul Board → Edit'));
  },
  annot:{
    title:'Rekalibrasi Berangkat/Kembali', kicker:'Transaksi',
    desc:'Rekonsiliasi HaulAssignment: catat waktu &amp; odometer aktual berangkat dan kembali.',
    annot:[
      A(1,'Dua seksi: Berangkat dari Pool &amp; Kembali ke Pool — masing-masing <span class="cmp">TimePicker</span> + <span class="cmp">NumberInput</span> odometer.'),
      A(2,'Label menampilkan nilai target di samping field aktual.'),
      A(3,'Validasi: <code>aktual ≥ target</code> untuk berangkat &amp; kembali.'),
      A(4,'Saat kembali → perbarui <code>vehicle.currentOdometer</code>.'),
      A(5,'Simpan → <code>PATCH /haul-assignments/:id</code>, refresh board.'),
    ]
  }
};

/* ----------------------------------------------- 20 USERS ------------- */
SCREENS.user = {
  group:'Pengguna & Akses', ix:'20', label:'Pengguna', chrome:'shell', active:'user',
  crumb:'Pengguna & Akses / <b>Pengguna</b>', route:'/pengguna',
  render(){
    const rows=[
      ['Ali Darmawan','ali.darmawan','Administrasi Data','Aktif','badge-green'],
      ['Bagas Checker','bagas.c','Checker','Aktif','badge-green'],
      ['Operator Pool','operator1','Operator Pool','Wajib ganti sandi','badge-amber'],
    ];
    const tb=rows.map(r=>'<tr><td><div class="row" style="gap:9px;align-items:center"><span class="avatar" style="width:30px;height:30px;font-size:12px">'+r[0].split(' ').map(x=>x[0]).join('').slice(0,2)+'</span><b style="font-weight:600">'+r[0]+'</b></div></td><td class="mono">@'+r[1]+'</td><td>'+pill(r[2],'badge-slate')+'</td><td>'+pill(r[3],r[4])+'</td><td style="text-align:right"><span class="muted" style="cursor:pointer;font-size:17px">⋮</span></td></tr>').join('');
    const content = crumbs(['Pengguna & Akses','Pengguna'])+
      '<div class="pg-head"><div><h1>Pengguna</h1><p class="sub">Kelola akun &amp; penetapan peran.</p></div>'+btn('+ Buat Pengguna','btn-primary')+'</div>'+
      '<div class="toolbar2"><div class="input-group" style="max-width:280px"><input class="input" placeholder="Cari nama / username…" /></div>'+btn('Filter: Peran ▾','btn-outline btn-sm')+'<div class="grow"></div><span class="muted" style="font-size:12.5px">24 pengguna</span></div>'+
      '<div class="card" style="padding:0;overflow:hidden"><table class="table"><thead><tr><th class="sortable">Nama</th><th>Username</th><th>Peran</th><th>Status</th><th style="text-align:right;width:60px">Aksi</th></tr></thead><tbody>'+tb+'</tbody></table></div>'+
      '<div class="alert alert-info" style="margin-top:14px"><div><div class="alert-title">Buat pengguna</div>Pengguna baru otomatis <code>mustChangePassword=true</code>; admin menyampaikan kata sandi sementara di luar sistem. "⋮" → Reset paksa kata sandi.</div></div>';
    return frame('app.swat…/pengguna', shell('user', content));
  },
  annot:{
    title:'Pengguna', kicker:'Pengguna & Akses',
    desc:'List akun mengikuti Pola CRUD. Kata sandi tak pernah diatur di form ini — pakai reset paksa.',
    annot:[
      A(1,'Kolom: Nama (+<span class="cmp">Avatar</span>) · Username (<code>mono</code>) · Peran (<span class="cmp">Badge</span>) · Status.'),
      A(2,'Buat: <span class="cmp">Dialog</span> dengan nama, username, <span class="cmp">Select</span> peran. Set <code>mustChangePassword=true</code>.'),
      A(3,'"⋮" → Ubah · Reset paksa kata sandi (<code>POST /auth/force-reset/:id</code>) · Hapus (soft-delete, <span class="cmp">AlertDialog</span>).'),
      A(4,'Status "Wajib ganti sandi" (amber) menandai akun yang belum login pertama.'),
      A(5,'Aksi password sendiri lewat Profil / Ubah Kata Sandi — bukan dari sini.'),
    ]
  }
};

/* ----------------------------------------------- 21 ROLES (RBAC) ------ */
SCREENS.role = {
  group:'Pengguna & Akses', ix:'21', label:'Hak Akses (RBAC)', chrome:'shell', active:'role',
  crumb:'Pengguna & Akses / <b>Hak Akses</b>', route:'/hak-akses',
  render(){
    const perm=(t,on)=>'<label class="check" style="gap:8px"><span class="switch"><input type="checkbox"'+(on?' checked':'')+' /><span class="track"></span><span class="thumb"></span></span> '+t+'</label>';
    const content = crumbs(['Pengguna & Akses','Hak Akses'])+
      '<div class="pg-head"><div><h1>Hak Akses</h1><p class="sub">Peran &amp; izin granular (RBAC).</p></div>'+btn('+ Buat Peran','btn-primary')+'</div>'+
      '<div class="grid2" style="align-items:start;gap:18px">'+
        '<div class="card" style="padding:0;overflow:hidden"><div style="padding:13px 16px;border-bottom:1px solid var(--neutral-200)"><b style="font-size:13px">Peran</b></div>'+
          ['Administrator','Administrasi Data','Checker','Operator Pool','Petugas TPA'].map((r,i)=>'<div class="side-link'+(i===1?' active':'')+'" style="border-radius:0;margin:0;border-left-width:3px;border-bottom:1px solid var(--neutral-100)"><span class="si">◍</span>'+r+'<span class="grow" style="flex:1"></span><span class="muted mono" style="font-size:11px">'+[42,28,9,6,4][i]+' izin</span></div>').join('')+
        '</div>'+
        '<div class="card" style="padding:18px"><div class="row" style="justify-content:space-between;align-items:center;margin-bottom:6px"><b style="font-size:15px">Administrasi Data</b>'+pill('28 izin','badge-slate')+'</div>'+
          '<p class="muted" style="font-size:12.5px;margin:0 0 14px">Entri transaksi harian: pengambilan, pembuangan, bahan bakar.</p>'+
          divlbl('Transaksi')+
          '<div class="col" style="gap:11px;margin-bottom:6px">'+perm('trip:record-pickup',true)+perm('trip:record-disposal',true)+perm('trip:record-fuel',true)+perm('trip:verify',false)+'</div>'+
          divlbl('Master Data')+
          '<div class="col" style="gap:11px">'+perm('vehicle:read',true)+perm('vehicle:update',true)+perm('vehicle:delete',false)+'</div>'+
          '<div class="dialog-foot" style="margin-top:18px"><button class="btn btn-secondary">Batal</button><button class="btn btn-primary">Simpan Izin</button></div>'+
        '</div>'+
      '</div>';
    return frame('app.swat…/hak-akses', shell('role', content));
  },
  annot:{
    title:'Hak Akses (RBAC)', kicker:'Pengguna & Akses',
    desc:'Kelola Role + Permission granular. Visibilitas menu &amp; aksi di seluruh aplikasi diturunkan dari sini.',
    annot:[
      A(1,'Tata letak master-detail: daftar <b>Peran</b> (kiri) + matriks <b>izin</b> (kanan).'),
      A(2,'Izin per modul dikelompokkan; tiap izin = <span class="cmp">Switch</span> on/off (mis. <code>trip:record-pickup</code>).'),
      A(3,'Menyimpan izin mengubah sidebar role-driven: item tanpa <code>:read</code> disembunyikan untuk pengguna peran itu.'),
      A(4,'Buat/Hapus peran via <span class="cmp">Dialog</span> / <span class="cmp">AlertDialog</span>; peran yang sedang dipakai tak bisa dihapus.'),
      A(5,'Layar ini sendiri di-gate <code>role:read</code>/<code>role:update</code> — contoh item yang diredam di sidebar untuk peran lain.'),
    ]
  }
};

/* ----------------------------------------------- 22 INVENTORY --------- */
SCREENS.inventory = {
  group:'Referensi', ix:'22', label:'Inventaris Layar', chrome:'doc',
  crumb:'Referensi / <b>Inventaris Layar</b>', route:'(referensi)',
  render(){
    const rows = [
      ['Login','auth.md','POST /auth/login','—'],
      ['Ubah Kata Sandi','auth.md','PATCH /auth/change-password','—'],
      ['Profil','auth.md','GET·PATCH /auth/me','—'],
      ['App Shell','frontend-spec §2','GET /auth/me','(menu role-driven)'],
      ['Dasbor','monitoring.md','GET /monitoring/kpi-overview','dashboard:read'],
      ['Pola CRUD / Kendaraan — Daftar','master-fleet.md','GET /vehicles','vehicle:read'],
      ['Kendaraan — Form','master-fleet.md','POST·PATCH /vehicles/:id','vehicle:create · vehicle:update'],
      ['Kendaraan — Hapus','master-fleet.md','DELETE /vehicles/:id','vehicle:delete'],
      ['Jadwal Kru','scheduling.md','GET·POST /crew-schedules','crew-schedule:read · :create'],
      ['Template Trayek','scheduling.md','POST·PATCH /crew-schedules/:id/trip-templates','trip-template:create · :update'],
      ['Jatah Kitir','fuel-quota-kitir.md','GET·POST /fuel-quotas','fuel-quota:read · :create'],
      ['Hari Transaksi','transactions.md','GET /transaction-days · POST /:date/initiate','transaction-day:read · :manage'],
      ['Haul Board','transactions.md','GET /transaction-days/:date · /hauls','haul:read'],
      ['Pengambilan (Pickup)','transactions.md','POST /trips/:id/record-pickup','trip:record-pickup'],
      ['Pembuangan + Timbangan','transactions.md','POST /trips/:id/record-disposal','trip:record-disposal'],
      ['Bahan Bakar (Refuel)','transactions.md','POST /trips/:id/record-fuel','trip:record-fuel'],
      ['Verifikasi Trayek','transactions.md','POST /trips/:id/verify','trip:verify'],
      ['Rekalibrasi Berangkat/Kembali','transactions.md','PATCH /haul-assignments/:id','haul:update'],
      ['Pengguna','auth-rbac.md','GET·POST /users · POST /auth/force-reset/:id','user:read · :create'],
      ['Hak Akses (RBAC)','auth-rbac.md','GET·POST·PATCH /roles · /permissions','role:read · :update'],
    ];
    let tb='';
    for(const r of rows) tb+='<tr><td><b style="color:var(--neutral-900)">'+r[0]+'</b></td><td><code>'+r[1]+'</code></td><td><code>'+r[2]+'</code></td><td><span class="perm">'+r[3]+'</span></td></tr>';
    return '<div class="doc"><h1>Inventaris Layar</h1>'+
      '<p class="lede">Pemetaan setiap wireframe ke spesifikasi modul, endpoint API (<code>07-api-spec.md</code>, base <code>/api/v1</code>), dan izin yang menggerbangnya.</p>'+
      '<table class="inv"><thead><tr><th>Layar</th><th>Spesifikasi Modul</th><th>Endpoint API utama</th><th>Izin</th></tr></thead><tbody>'+tb+'</tbody></table>'+
      '<p class="muted" style="font-size:12px;margin-top:14px">Semua respons memakai amplop <code>ApiResponse&lt;T&gt;</code>; list menyertakan <code>meta</code> paginasi. Soft-delete default; <code>?includeDeleted=true</code> untuk admin.</p></div>';
  },
  annot:null
};

/* ----------------------------------------------- 23 INTERACTION NOTES - */
SCREENS.notes = {
  group:'Referensi', ix:'23', label:'Catatan Interaksi', chrome:'doc',
  crumb:'Referensi / <b>Catatan Interaksi</b>', route:'(referensi)',
  render(){
    const card=(title,tag,tagcls,items)=>'<div class="notecard"><h3>'+title+' <span class="tagi '+tagcls+'">'+tag+'</span></h3><ul>'+items.map(i=>'<li>'+i+'</li>').join('')+'</ul></div>';
    return '<div class="doc"><h1>Catatan Interaksi</h1>'+
      '<p class="lede">Aturan lintas-layar: validasi, status nonaktif/memuat, konfirmasi, dan alur navigasi. Microcopy Bahasa Indonesia sesuai glosarium.</p>'+
      '<div class="notecols">'+
        card('Validasi','inline','badge-amber',[
          '<b>Real-time</b>, debounce 300ms; galat inline di bawah field (<code>tiny</code> merah + ikon).',
          'Wajib ditandai <code>*</code>; <code>aria-invalid</code> + <code>aria-describedby</code>.',
          '"Nomor polisi sudah ada" · "Berat Kotor harus ≥ Berat Kosong" · "Jumlah Disetujui ≤ Diminta" · "Odometer ≥ {terakhir}".',
          'Ruang galat dicadangkan agar tak terjadi layout shift.',
        ])+
        card('Nonaktif & Memuat','state','badge-blue',[
          'Tombol submit saat mutasi: spinner + "Memuat…", non-interaktif.',
          'Field terkunci: latar abu-abu, <code>cursor:not-allowed</code>, <code>aria-disabled</code>.',
          'Aksi pada trayek terverifikasi: disembunyikan/nonaktif, tooltip "Sudah terverifikasi".',
          'List memuat: 10 baris <b>skeleton</b>. Galat: "Gagal memuat data" + Coba Lagi.',
        ])+
        card('Konfirmasi','confirm','badge-red',[
          'Aksi merusak → <span class="cmp">AlertDialog</span>: judul aksi, sebut target, "Tindakan tidak dapat dibatalkan".',
          '[Batal] (autofocus) + [Hapus] (destructive). Tanpa tombol ✕ — pilihan eksplisit.',
          'Soft-delete (set <code>deletedAt</code>) → <span class="cmp">Toast</span> "Berhasil dihapus".',
        ])+
        card('Toast','feedback','badge-green',[
          'Sukses (hijau, auto 3s): "Berhasil ditambahkan/diperbarui/dihapus/dicatat".',
          'Galat (merah, 5s): "Gagal: {pesan ramah}". Peringatan (amber) · Info (biru).',
          'Kanan-bawah, <code>z-toast</code>, <code>role=status</code>/<code>alert</code>.',
        ])+
        card('Navigasi','flow','badge-slate',[
          'Login → (mustChangePassword?) Ubah Kata Sandi → Dasbor.',
          'Hari Transaksi → Inisiasi Hari → Haul Board → (per haul) Pickup/Disposal/Refuel → Verifikasi (Checker).',
          'Sidebar role-driven: item tanpa izin <b>disembunyikan</b>. 401 → login · 403 → "Anda tidak memiliki akses".',
          'State form dipertahankan saat back/forward browser.',
        ])+
        card('Aksesibilitas','WCAG AA','badge-green',[
          'Kontras ≥4,5:1; warna tak pernah jadi satu-satunya penanda (selalu + teks/ikon/titik).',
          'Fokus keyboard terlihat (ring <code>primary-600</code>); dialog jebak fokus; <span class="kbd">Esc</span> menutup.',
          'Label nyata tiap input; <code>aria-label</code> tombol ikon; skip-to-content.',
          'Target sentuh ≥44px di kios timbang (<code>pointer:coarse</code>).',
        ])+
      '</div>'+
      '<h2 class="dh">Format angka, tanggal &amp; satuan (id-ID, WIB)</h2>'+
      '<table class="inv"><thead><tr><th>Jenis</th><th>Format</th><th>Contoh</th></tr></thead><tbody>'+
        [['Tanggal (form)','dd/MM/yyyy','15/03/2026'],['Tanggal (tabel)','d MMM yyyy','15 Jun 2026'],['Waktu','HH:mm:ss (24 jam)','08:30:00'],['Berat','bilangan + kg','4.250 kg'],['Jarak','bilangan + km','125.400 km'],['BBM','2 desimal + L','45,50 L'],['Tonase','toLocaleString + ton','12,75 ton'],['Rupiah','Rp + ribuan','Rp 8.500.000'],['Kode/Nopol','mono, apa adanya','L 1234 AB · KT-2026-0042']].map(r=>'<tr><td><b style="color:var(--neutral-900)">'+r[0]+'</b></td><td><code>'+r[1]+'</code></td><td class="mono">'+r[2]+'</td></tr>').join('')+
      '</tbody></table>'+
      '<p class="muted" style="font-size:12px;margin-top:12px">Pemisah ribuan <code>.</code> dan desimal <code>,</code> (id-ID). Kolom angka rata-kanan, <code>tabular-nums</code>. Timestamp disimpan UTC, ditampilkan WIB.</p>'+
    '</div>';
  },
  annot:null
};

/* ----------------------------------------------- 5b MONITORING -------- */
SCREENS.monitoring = {
  group:'Monitoring', ix:'5b', label:'Pemantauan', chrome:'shell', active:'monitoring',
  crumb:'Monitoring / <b>Pemantauan</b>', route:'/monitoring',
  render(){
    const metric=(lbl,val,u,sub)=>'<div class="metric"><div class="lbl">'+lbl+'</div><div class="val">'+val+(u?' <span class="u">'+u+'</span>':'')+'</div>'+(sub?'<div class="muted" style="font-size:11.5px;margin-top:4px">'+sub+'</div>':'')+'</div>';
    /* simple bar chart (wireframe placeholder — values only) */
    const days=[['1 Jun','62'],['2 Jun','78'],['3 Jun','71'],['4 Jun','84'],['5 Jun','88']];
    let bars='';
    for(const d of days) bars+='<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:6px;justify-content:flex-end"><div class="mono" style="font-size:11px;color:var(--neutral-500)">'+d[1]+'</div><div style="width:60%;height:'+(d[1]*1.4)+'px;background:var(--primary-300);border-radius:4px 4px 0 0"></div><div style="font-size:11px;color:var(--neutral-400)">'+d[0]+'</div></div>';
    const srcRow=(s,t,pct,cls)=>'<div style="display:flex;align-items:center;gap:10px;margin-bottom:9px"><span style="width:64px;font-size:12px;color:var(--neutral-600)">'+s+'</span><div style="flex:1;height:14px;background:var(--neutral-100);border-radius:99px;overflow:hidden"><i style="display:block;height:100%;width:'+pct+'%;background:var(--'+cls+');border-radius:99px"></i></div><span class="mono" style="font-size:12px;width:54px;text-align:right">'+t+'</span></div>';
    const content = crumbs(['Monitoring','Pemantauan'])+
      '<div class="pg-head"><div><h1>Pemantauan</h1><p class="sub">Ringkasan operasional read-only untuk pengawas &amp; manajemen.</p></div>'+
        '<div class="row" style="gap:8px"><div class="input-group" style="width:auto"><input class="input" value="01/06/2026" style="width:130px" /><span class="input-affix">▦</span></div><span class="muted" style="align-self:center">—</span><div class="input-group" style="width:auto"><input class="input" value="05/06/2026" style="width:130px" /><span class="input-affix">▦</span></div></div></div>'+
      '<div class="grid4" style="margin-bottom:16px">'+
        metric('Tonase 5 Hari','383,2','ton','+8,4% vs periode lalu')+
        metric('Bulan Ini','2.847','ton','vs 4.125 bln lalu (−31%)')+
        metric('Rasio BBM (disetujui/diminta)','97,6','%','flag bila &lt; 95%')+
        metric('Kendaraan Beroperasi','34','unit','127 haul selesai')+
      '</div>'+
      '<div class="grid2" style="align-items:start;gap:16px;margin-bottom:16px">'+
        '<div class="card" style="padding:18px"><div class="row" style="justify-content:space-between;align-items:center;margin-bottom:14px"><b style="font-size:14px">Tonase Harian (ton)</b><span class="badge badge-slate">5 hari terakhir</span></div>'+
          '<div style="display:flex;align-items:flex-end;gap:10px;height:170px;padding-top:8px">'+bars+'</div></div>'+
        '<div class="card" style="padding:18px"><div class="row" style="justify-content:space-between;align-items:center;margin-bottom:14px"><b style="font-size:14px">Tonase per Sumber Sampah</b><span class="badge badge-slate">bulan ini</span></div>'+
          srcRow('Dinas','1.120 t',88,'primary-500')+srcRow('Rekanan','640 t',50,'primary-400')+srcRow('Pasar','410 t',32,'primary-300')+srcRow('Pintu Air','280 t',22,'info-500')+srcRow('Swasta','397 t',31,'neutral-400')+
        '</div>'+
      '</div>'+
      '<div class="card" style="padding:0;overflow:hidden"><div class="row" style="justify-content:space-between;align-items:center;padding:14px 16px;border-bottom:1px solid var(--neutral-200)"><b style="font-size:14px">Ringkasan Harian</b>'+btn('Ekspor Laporan','btn-outline btn-sm')+'</div>'+
        '<table class="table"><thead><tr><th>Tanggal</th><th class="num">Tonase (ton)</th><th class="num">Haul</th><th class="num">Inbound TPA</th><th>Rekonsiliasi</th></tr></thead><tbody>'+
        [['5 Jun 2026','88,0','28','87,2','MATCHED','badge-green'],['4 Jun 2026','84,2','27','—','PENDING','badge-amber'],['3 Jun 2026','71,4','25','71,0','MATCHED','badge-green'],['2 Jun 2026','78,1','26','73,9','ANOMALI','badge-red']].map(r=>'<tr><td class="mono">'+r[0]+'</td><td class="num">'+r[1]+'</td><td class="num">'+r[2]+'</td><td class="num">'+r[3]+'</td><td>'+pill(r[4],r[5])+'</td></tr>').join('')+
        '</tbody></table></div>';
    return frame('app.swat…/monitoring', shell('monitoring', content));
  },
  annot:{
    title:'Pemantauan (Monitoring)', kicker:'Monitoring · Fase 2',
    desc:'Dasbor read-only untuk manajemen/pengawas (izin <code>monitoring:read</code>). Agregasi dari rollup harian + cache.',
    annot:[
      A(1,'Filter <span class="cmp">DatePicker</span> rentang (dateFrom–dateTo) memengaruhi seluruh kartu &amp; tabel.'),
      A(2,'Empat <span class="cmp">Card</span> KPI: tonase 5-hari, tren bulanan (% perubahan), rasio BBM, kendaraan beroperasi.'),
      A(3,'Grafik <b>Recharts</b> di build nyata (line/bar). Di wireframe = batang placeholder, fokus pada struktur.'),
      A(4,'Breakdown per Sumber Sampah (D/R/PS/PU/Swasta) — klik batang untuk drill-down (filter dasbor lain).'),
      A(5,'<span class="cmp">DataTable</span> ringkasan harian + <span class="cmp">Badge</span> rekonsiliasi TPA (MATCHED / PENDING / ANOMALI &gt;5%).'),
      A(6,'Ekspor laporan → Laporan (Fase 3). Hanya baca — tanpa mutasi. Operator pool/SPBU/TPS tak punya akses.'),
    ]
  }
};
