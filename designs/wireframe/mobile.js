/* =====================================================================
   SWAT wireframes — mobile (responsive) variants
   Phone bezel + DS mobile patterns: bottom-nav, table→cards, bottom sheet,
   sticky action-bar. Attaches a .mobile() render to each screen.
   Reuses helpers from wireframe-web.html + screens-2.js (global scope).
   ===================================================================== */

function phoneScreen(inner){
  return '<div class="phone"><div class="phone-scr">'+
    '<div class="phone-status"><span class="mono">08:30</span><span class="dotrow"><span>᳚</span><span class="mono">4G</span><span>▮</span></span></div>'+
    inner+(window.__mobileOverlay||'')+'</div></div>';
}
function mBottomNav(active){
  const items=[['dashboard','Dasbor','◳','dashboard'],['master','Master','▤','vehicle'],['sched','Jadwal','◴','crew'],['txn','Transaksi','⇄','day'],['account','Akun','◍','profile']];
  return '<nav class="bottom-nav">'+items.map(i=>'<a class="'+(i[0]===active?'active':'')+'" data-nav="'+i[3]+'"><span class="bn-ico">'+i[2]+'</span>'+i[1]+'</a>').join('')+'</nav>';
}
function mShell(active, title, content, fab){
  const fabAttr = (typeof fab==='string') ? ' data-nav="'+fab+'"' : '';
  return phoneScreen(
    '<div class="m-top"><span class="mh" data-mdrawer="open" title="Menu">☰</span><span class="mt">'+title+'</span><span class="spacer"></span><span class="avatar" data-nav="profile" style="width:30px;height:30px;font-size:11px;cursor:pointer">AD</span></div>'+
    '<div class="phone-body"><div class="phone-pad">'+content+'</div></div>'+
    (fab?'<div class="m-fab"'+fabAttr+'>+</div>':'')+
    mBottomNav(active)
  );
}
function mSheet(title, body, foot, hint){
  return phoneScreen(
    '<div class="m-top"><span class="mh" data-mback="1">←</span><span class="mt">'+(hint||'Trayek')+'</span></div>'+
    '<div class="phone-body" style="padding:0;background:var(--neutral-100)"><div class="m-scrim"><div class="m-sheet">'+
      '<div class="m-sheet-grab"></div><div class="m-sheet-head"><b>'+title+'</b><span data-mback="1">✕</span></div>'+
      '<div class="m-sheet-body">'+body+'</div><div class="action-bar">'+foot+'</div></div></div></div>'
  );
}
function mFull(title, body, foot){
  return phoneScreen(
    '<div class="m-top"><span class="mh" data-mback="1">←</span><span class="mt">'+title+'</span></div>'+
    '<div class="phone-body"><div class="phone-pad">'+body+'</div></div>'+
    '<div class="action-bar">'+foot+'</div>'
  );
}
function mAuth(content){
  return phoneScreen('<div class="phone-body" style="display:flex;align-items:center"><div class="phone-pad" style="width:100%">'+content+'</div></div>');
}
function mSearch(ph){ return '<div class="input-group" style="margin-bottom:12px"><input class="input" placeholder="'+(ph||'Cari…')+'" /></div>'; }
/* table → stacked card. Optional `nav` makes the whole card tappable. */
function tcard(plate, badge, rows, nav){
  let r='';
  for(const [k,v] of rows) r+='<div class="tcard-row"><span class="k">'+k+'</span><span class="v">'+v+'</span></div>';
  const a = nav ? ' data-nav="'+nav+'"' : '';
  return '<div class="tcard"'+a+'><div class="tcard-top"><span class="plate">'+plate+'</span>'+badge+'</div>'+r+'</div>';
}

/* ---------------- MOBILE DRAWER (nested, clickable) ---------------- */
function mNavNode(node, depth, activeLeaf){
  if(node.children){
    const open = EXPANDED.has(node.id);
    let h='<div class="mnav-grp'+(open?' open':'')+'">';
    h+='<button class="mnav-parent" data-navtog="'+node.id+'" style="--d:'+depth+'"><span class="si">'+(node.ic||'▸')+'</span><span class="nl">'+node.label+'</span><span class="chev">▸</span></button>';
    h+='<div class="mnav-kids">';
    for(const c of node.children) h+=mNavNode(c, depth+1, activeLeaf);
    h+='</div></div>';
    return h;
  }
  const isA = node.id===activeLeaf;
  const attr = node.screen ? 'data-nav="'+node.screen+'"' : 'data-stub="'+node.id+'"';
  return '<a class="mnav-link'+(isA?' active':'')+'" '+attr+' style="--d:'+depth+'"><span class="si">'+(node.ic||'·')+'</span>'+node.label+'</a>';
}
function mobileDrawer(activeLeaf){
  let p = PARENT[activeLeaf];
  while(p){ EXPANDED.add(p); p = PARENT[p]; }
  let body='';
  for(const node of NAV) body+=mNavNode(node, 0, activeLeaf);
  return '<div class="m-drawer-scrim" data-mdrawer="close"></div>'+
    '<div class="m-drawer">'+
      '<div class="m-drawer-head"><span class="mk">SW</span><b>SWAT</b><span class="x" data-mdrawer="close">✕</span></div>'+
      '<div class="m-drawer-nav">'+body+'</div>'+
    '</div>';
}

/* ---------------- AUTH ---------------- */
SCREENS.login.mobile = ()=> mAuth(
  '<div class="auth-logo" style="margin-bottom:18px"><div class="mk">SW</div><b>SWAT</b><span>DLH Kota Surabaya</span></div>'+
  '<div class="card" style="padding:18px">'+
    '<h3 style="margin:0 0 14px;font-size:16px;font-weight:700">Masuk</h3>'+
    field('Nama pengguna','<input class="input" placeholder="mis. ali.darmawan" />',{req:true})+
    field('Kata sandi','<input class="input" type="password" value="········" />',{req:true})+
    '<div class="alert alert-danger" style="margin-bottom:12px"><div>Nama pengguna atau kata sandi salah.</div></div>'+
    btn('Masuk','btn-primary btn-lg','" style="width:100%')+
  '</div>'
);
SCREENS.changepw.mobile = ()=> mAuth(
  '<div class="auth-logo" style="margin-bottom:16px"><div class="mk">SW</div><b>Ubah Kata Sandi</b><span>Wajib sebelum lanjut</span></div>'+
  '<div class="alert alert-warning" style="margin-bottom:12px"><div>Ubah kata sandi sementara untuk melanjutkan.</div></div>'+
  '<div class="card" style="padding:18px">'+
    field('Kata sandi saat ini','<input class="input" type="password" value="······" />',{req:true})+
    field('Kata sandi baru','<input class="input" type="password" value="········" />',{req:true})+
    '<div class="progress" style="margin:-4px 0 6px"><i style="width:82%"></i></div>'+
    '<p class="muted" style="margin:0 0 12px;font-size:11.5px">Kekuatan: <b style="color:var(--success-700)">Kuat</b></p>'+
    field('Konfirmasi','<input class="input is-error" type="password" value="······" />',{req:true,err:'Tidak cocok.',mb0:true})+
    btn('Ubah & Lanjut','btn-primary btn-lg','" style="width:100%;margin-top:14px')+
  '</div>'
);
SCREENS.profile.mobile = ()=> mShell('account','Profil',
  '<div class="card" style="padding:18px;margin-bottom:12px;text-align:center"><span class="avatar" style="width:64px;height:64px;font-size:22px;margin-bottom:10px">AD</span>'+
    '<div style="font-size:16px;font-weight:700">Ali Darmawan</div><div class="muted" style="font-size:12.5px;margin-bottom:8px">@ali.darmawan</div>'+pill('Administrasi Data','badge-slate')+'</div>'+
  '<div class="card" style="padding:16px;margin-bottom:12px">'+field('Nama lengkap','<input class="input" value="Ali Darmawan" />',{req:true})+field('Nama pengguna','<input class="input" value="ali.darmawan" disabled />',{mb0:true})+'</div>'+
  btn('Ubah Kata Sandi','btn-outline btn-lg','" style="width:100%;margin-bottom:10px')+btn('Keluar','btn-destructive btn-lg','" style="width:100%')
);

/* ---------------- SHELL + DASHBOARD ---------------- */
SCREENS.shell.mobile = ()=> mShell('dashboard','SWAT',
  '<div class="alert alert-info" style="margin-bottom:12px"><div><div class="alert-title">Adaptasi mobile</div>Sidebar → <b>Drawer</b> (ikon ☰). Nav utama → <b>bottom-nav</b> ≤5 item. Konten 1 kolom, gutter 16px.</div></div>'+
  '<div class="ph lite" style="height:13px;width:50%;margin-bottom:10px"></div><div class="ph lite" style="height:60px;margin-bottom:10px"></div><div class="ph lite" style="height:110px"></div>',
  false
);
SCREENS.dashboard.mobile = ()=> {
  const m=(lbl,val,u)=>'<div class="metric" style="padding:13px 14px"><div class="lbl" style="margin-bottom:5px">'+lbl+'</div><div class="val" style="font-size:24px">'+val+(u?' <span class="u">'+u+'</span>':'')+'</div></div>';
  return mShell('dashboard','Dasbor',
    '<p class="m-sub">Jumat, 5 Juni 2026</p>'+
    '<div class="col" style="gap:10px;margin-bottom:12px">'+m('Kendaraan Aktif','34','unit')+m('Haul Berjalan','28','haul')+m('Tonase Hari Ini','87,5','ton')+'</div>'+
    '<div class="card" style="padding:14px"><b style="font-size:13px">Perlu Perhatian</b>'+
      '<div class="col" style="gap:8px;margin-top:10px"><div class="alert alert-warning"><div>3 trayek menunggu verifikasi.</div></div><div class="alert alert-danger"><div>2 SIM pengemudi kedaluwarsa.</div></div></div></div>'
  );
};
SCREENS.monitoring.mobile = ()=> {
  const m=(lbl,val,u)=>'<div class="metric" style="padding:12px 13px"><div class="lbl" style="margin-bottom:4px">'+lbl+'</div><div class="val" style="font-size:22px">'+val+(u?' <span class="u">'+u+'</span>':'')+'</div></div>';
  return mShell('dashboard','Pemantauan',
    '<div class="row" style="gap:8px;margin-bottom:12px"><div class="input-group"><input class="input" value="01/06–05/06" /><span class="input-affix">▦</span></div></div>'+
    '<div class="grid2" style="gap:10px;margin-bottom:12px">'+m('Tonase 5 Hari','383','ton')+m('Bulan Ini','2.847','ton')+m('Rasio BBM','97,6','%')+m('Beroperasi','34','unit')+'</div>'+
    '<div class="card" style="padding:14px;margin-bottom:12px"><b style="font-size:13px">Tonase per Sumber</b>'+
      '<div style="margin-top:12px">'+['Dinas 88%::primary-500','Rekanan 50%::primary-400','Pasar 32%::primary-300','Swasta 31%::neutral-400'].map(x=>{const[t,c]=x.split('::');const p=t.match(/\d+/)[0];return '<div style="display:flex;align-items:center;gap:8px;margin-bottom:8px"><span style="width:64px;font-size:11.5px;color:var(--neutral-600)">'+t.replace(/ \d+%/,'')+'</span><div style="flex:1;height:12px;background:var(--neutral-100);border-radius:99px;overflow:hidden"><i style="display:block;height:100%;width:'+p+'%;background:var(--'+c+');border-radius:99px"></i></div></div>';}).join('')+'</div></div>'+
    '<div class="tcards">'+
      tcard('5 Jun 2026', pill('MATCHED','badge-green'), [['Tonase','88,0 ton'],['Haul','28'],['Inbound TPA','87,2']])+
      tcard('4 Jun 2026', pill('PENDING','badge-amber'), [['Tonase','84,2 ton'],['Haul','27'],['Inbound TPA','—']])+
    '</div>'
  );
};

/* ---------------- MASTER DATA ---------------- */
SCREENS.masterPattern.mobile = ()=> mShell('master','{Entity}',
  '<p class="m-sub">Pola generik — ~12 entitas master.</p>'+mSearch('Cari…')+
  '<div class="alert alert-info" style="margin-bottom:12px"><div>Tabel → <b>kartu bertumpuk</b> (label→nilai). Aksi via tap kartu / menu. Tombol Buat → <b>FAB</b>.</div></div>'+
  '<div class="tcards">'+
    tcard('KODE-001', pill('Aktif','badge-green'), [['Atribut','Nilai'],['Atribut','Nilai']])+
    tcard('KODE-002', pill('Aktif','badge-green'), [['Atribut','Nilai'],['Atribut','Nilai']])+
  '</div>', true
);
SCREENS.vehicle.mobile = ()=> mShell('master','Kendaraan',
  mSearch('Cari nopol / merek…')+
  '<div class="row" style="gap:8px;margin-bottom:12px">'+btn('Filter ▾','btn-outline btn-sm')+btn('Urutkan ▾','btn-outline btn-sm')+'</div>'+
  '<div class="tcards">'+
    tcard('L 1234 AB', pill('Baik','badge-green'), [['Merek','Hino Dutro'],['Aplikasi','Compactor']], 'vehicleForm')+
    tcard('L 1255 CD', pill('Rusak Ringan','badge-amber'), [['Merek','Isuzu Elf'],['Aplikasi','Dump Truck']], 'vehicleForm')+
    tcard('L 1288 EF', pill('Rusak Berat','badge-red'), [['Merek','Hyundai HD'],['Aplikasi','Arm Roll']], 'vehicleForm')+
  '</div>'+
  '<p class="muted" style="text-align:center;font-size:12px;margin-top:14px">Menampilkan 1–25 dari 200</p>', 'vehicleForm'
);
SCREENS.vehicleForm.mobile = ()=> mFull('Tambah Kendaraan',
  divlbl('Data Dasar')+field('Nomor Polisi','<input class="input mono" placeholder="L 1234 AB" />',{req:true,err:'Nomor polisi sudah ada.'})+
  field('Merek / Model','<select class="select"><option>Pilih model…</option></select>',{req:true})+
  field('Aplikasi','<select class="select"><option>Compactor</option></select>',{req:true})+
  field('Tahun','<input class="input tnum" value="2021" />',{req:true})+
  divlbl('Dimensi')+field('Berat Kosong','<div class="input-group"><input class="input tnum" value="4.200" /><span class="input-affix">kg</span></div>',{req:true})+
  field('Odometer','<div class="input-group"><input class="input tnum" value="125.400" /><span class="input-affix">km</span></div>',{req:true,mb0:true}),
  btn('Batal','btn-secondary btn-lg')+btn('Simpan','btn-primary btn-lg')
);

/* ---------------- SCHEDULING ---------------- */
SCREENS.crew.mobile = ()=> mShell('sched','Jadwal Kru',
  mSearch('Cari nopol / pengemudi…')+
  '<div class="tcards">'+
    tcard('L 1234 AB', pill('Berlaku','badge-green'), [['Pengemudi','Budi Santoso'],['Berangkat','06:00'],['Kembali','17:00'],['Trayek','5']], 'template')+
    tcard('L 1255 CD', pill('Berlaku','badge-green'), [['Pengemudi','Citra Lestari'],['Berangkat','06:30'],['Kembali','16:30'],['Trayek','4']], 'template')+
  '</div>', true
);
SCREENS.template.mobile = ()=> mFull('L 1234 AB · Budi',
  '<p class="m-sub">Pool Wonokromo · Hino Dutro</p>'+
  divlbl('Waktu Jadwal')+'<div class="row" style="gap:10px">'+field('Berangkat','<input class="input mono" value="06:00" />',{mb0:true})+field('Kembali','<input class="input mono" value="17:00" />',{mb0:true})+'</div>'+
  divlbl('Trayek Terencana')+
  '<div class="tcards">'+
    tcard('1 · Berangkat Pool', '<span class="muted" style="cursor:grab">⠿</span>', [['Rute','Pool Wonokromo'],['Target','06:00']])+
    tcard('2 · Pengisian BBM', '<span class="muted" style="cursor:grab">⠿</span>', [['Rute','SPBU A. Yani'],['Target','06:15'],['BBM','20,00 L']])+
    tcard('3 · Pengambilan', '<span class="muted" style="cursor:grab">⠿</span>', [['Rute','TPS Ketintang'],['Target','07:30']])+
  '</div>'+btn('+ Tambah Trayek','btn-outline btn-lg','" style="width:100%;margin-top:10px'),
  btn('Batal','btn-secondary btn-lg')+btn('Simpan','btn-primary btn-lg')
);
SCREENS.quota.mobile = ()=> mShell('sched','Jatah Kitir',
  mSearch('Cari kode / nopol…')+
  '<div class="tcards">'+
    tcard('KT-202606-0042', pill('Berlaku','badge-green'), [['Kendaraan','L 1234 AB'],['Lokasi','TPA Benowo'],['Berlaku','01/01–31/12/26']])+
    tcard('KT-202512-0911', pill('Tidak Berlaku','badge-slate'), [['Kendaraan','L 1301 IJ'],['Lokasi','TPA Romokalisari'],['Berlaku','01/12–31/12/25']])+
  '</div>', true
);

/* ---------------- TRANSACTIONS ---------------- */
SCREENS.day.mobile = ()=> mShell('txn','Hari Transaksi',
  '<div class="alert alert-info" style="margin-bottom:12px"><div>Inisiasi Hari menebar haul dari Jadwal Kru (idempoten).</div></div>'+
  '<div class="tcards">'+
    tcard('5 Jun 2026', pill('Belum Selesai','badge-amber'), [['Kendaraan','28'],['Tonase','87,5 ton']], 'board')+
    tcard('4 Jun 2026', pill('Selesai','badge-blue'), [['Kendaraan','27'],['Tonase','132,6 ton']], 'board')+
    tcard('3 Jun 2026', pill('Selesai','badge-blue'), [['Kendaraan','25'],['Tonase','118,9 ton']], 'board')+
  '</div>', true
);
SCREENS.board.mobile = ()=> {
  const hc=(np,drv,bt,vt,vc)=>'<div class="tcard"><div class="tcard-top"><span class="plate">'+np+'</span>'+pill(vt,vc)+'</div>'+
    '<div class="tcard-row"><span class="k">Pengemudi</span><span class="v">'+drv+'</span></div>'+
    '<div class="tcard-row"><span class="k">Berangkat T/A</span><span class="v">'+bt+'</span></div>'+
    '<div class="tcard-row" style="border:0;padding-top:10px"><button class="btn btn-outline btn-sm" data-nav="reconcile" style="flex:1">Edit</button><button class="btn btn-ghost btn-sm" data-nav="pickup" style="flex:1">Lihat ›</button></div></div>';
  return mShell('txn','Haul · 5 Jun',
    '<div class="row" style="gap:8px;align-items:center;margin-bottom:12px">'+pill('Belum Selesai','badge-amber')+'<span class="muted" style="font-size:12px">28 aktif · 3/5 verif.</span></div>'+
    '<div class="tcards">'+
      hc('L 1234 AB','Budi Santoso','06:00 / 06:05','3/5 Terverifikasi','badge-green')+
      hc('L 1255 CD','Citra Lestari','06:30 / 06:38','1/4 Terverifikasi','badge-amber')+
      hc('L 1301 IJ','Eka Wijaya','06:00 / —','Belum mulai','badge-slate')+
    '</div>'
  );
};
SCREENS.pickup.mobile = ()=> mSheet('Catat Pengambilan',
  ctxLine('L 1234 AB','Budi · TPS Ketintang')+
  '<div class="stepper" style="margin-bottom:14px;font-size:11px"><div class="step done"><span class="dot">✓</span></div><div class="step-line done"></div><div class="step active"><span class="dot">2</span></div><div class="step-line"></div><div class="step upcoming"><span class="dot">3</span></div></div>'+
  field('Waktu Aktual','<div class="input-group"><input class="input mono" value="07:32" /><span class="input-affix">◷</span></div>',{req:true})+
  field('Odometer Aktual','<div class="input-group"><input class="input tnum" value="125.490" /><span class="input-affix">km</span></div>',{req:true})+
  field('Sumber Sampah','<select class="select"><option>Dinas</option></select>',{req:true,mb0:true}),
  btn('Batal','btn-secondary btn-lg')+btn('Simpan','btn-primary btn-lg'),'Trayek Pickup'
);
SCREENS.disposal.mobile = ()=> mSheet('Catat Pembuangan',
  ctxLine('L 1234 AB','TPA Benowo · 08:45')+
  field('Berat Kosong','<div class="input-group"><input class="input tnum" value="5.200" /><span class="input-affix">kg</span></div>',{req:true})+
  field('Berat Kotor','<div class="input-group"><input class="input tnum" value="10.850" /><span class="input-affix">kg</span></div>',{req:true})+
  '<div class="card" style="padding:12px 14px;background:var(--success-50);border-color:var(--success-100);margin-bottom:14px"><div class="muted" style="font-size:11.5px">Berat Bersih (otomatis)</div><div class="tnum" style="font-size:20px;font-weight:700;color:var(--success-700)">5.650 <span style="font-size:12px">kg</span></div></div>'+
  field('Waktu Aktual','<input class="input mono" value="08:50" />',{req:true,mb0:true}),
  btn('Batal','btn-secondary btn-lg')+btn('Simpan','btn-primary btn-lg'),'Trayek Disposal'
);
SCREENS.refuel.mobile = ()=> mSheet('Catat Bahan Bakar',
  ctxLine('L 1234 AB','SPBU A. Yani · 06:15')+
  field('Jenis BBM','<select class="select"><option>Solar</option></select>',{req:true})+
  field('Jumlah Diminta','<div class="input-group"><input class="input tnum" value="50,00" /><span class="input-affix">L</span></div>',{req:true})+
  field('Jumlah Disetujui','<div class="input-group"><input class="input tnum" value="50,00" disabled /><span class="input-affix">L</span></div>',{help:'Hanya peran persetujuan.',mb0:true}),
  btn('Batal','btn-secondary btn-lg')+btn('Simpan','btn-primary btn-lg'),'Trayek Refuel'
);
SCREENS.verify.mobile = ()=> mSheet('Verifikasi Trayek',
  '<div class="row" style="gap:8px;margin-bottom:12px">'+pill('Pembuangan','badge-blue')+'</div>'+
  '<dl class="dl" style="margin-bottom:12px"><dt>Waktu T→A</dt><dd class="mono">08:45→08:50</dd><dt>Berat Bersih</dt><dd class="tnum" style="color:var(--success-700)">5.650 kg</dd><dt>Volume</dt><dd class="tnum">5,2 m³</dd><dt>Dicatat</dt><dd>Ali · 08:52</dd></dl>'+
  '<div class="alert alert-success" style="margin-bottom:8px"><div>Siap diverifikasi.</div></div>',
  btn('Tolak','btn-secondary btn-lg')+btn('Terverifikasi','btn-primary btn-lg'),'Checker'
);
SCREENS.reconcile.mobile = ()=> mSheet('Rekalibrasi',
  ctxLine('L 1234 AB','Budi Santoso')+
  divlbl('Berangkat dari Pool')+field('Waktu (T 06:00)','<input class="input mono" value="06:05" />',{req:true})+field('Odometer (T 125.400)','<div class="input-group"><input class="input tnum" value="125.400" /><span class="input-affix">km</span></div>',{req:true})+
  divlbl('Kembali ke Pool')+field('Waktu (T 17:00)','<input class="input mono" value="17:15" />',{mb0:true}),
  btn('Batal','btn-secondary btn-lg')+btn('Simpan','btn-primary btn-lg'),'Haul'
);

/* ---------------- USERS & ACCESS ---------------- */
SCREENS.user.mobile = ()=> mShell('account','Pengguna',
  mSearch('Cari nama / username…')+
  '<div class="tcards">'+
    tcard('Ali Darmawan', pill('Aktif','badge-green'), [['Username','@ali.darmawan'],['Peran','Administrasi Data']])+
    tcard('Operator Pool', pill('Wajib ganti sandi','badge-amber'), [['Username','@operator1'],['Peran','Operator Pool']])+
  '</div>', true
);
SCREENS.role.mobile = ()=> {
  const perm=(t,on)=>'<label class="check" style="gap:8px;justify-content:space-between;width:100%"><span>'+t+'</span><span class="switch"><input type="checkbox"'+(on?' checked':'')+' /><span class="track"></span><span class="thumb"></span></span></label>';
  return mShell('account','Hak Akses',
    '<div class="card" style="padding:14px;margin-bottom:12px"><b style="font-size:14px">Administrasi Data</b> '+pill('28 izin','badge-slate')+
      '<div class="col" style="gap:12px;margin-top:12px">'+divlbl('Transaksi')+perm('trip:record-pickup',true)+perm('trip:record-disposal',true)+perm('trip:verify',false)+divlbl('Master Data')+perm('vehicle:update',true)+perm('vehicle:delete',false)+'</div>'+
      btn('Simpan Izin','btn-primary btn-lg','" style="width:100%;margin-top:14px')+'</div>'
  );
};

/* ---------------- GENERIC IA STUB (mobile) ---------------- */
SCREENS.generic.mobile = ()=> {
  const g = window.__gen || {label:'Layar', kind:'soon'};
  if(g.kind==='crud'){
    return mShell('', g.label,
      mSearch('Cari…')+
      '<div class="tcards">'+
        tcard('KODE-001', pill('Aktif','badge-green'), [['Atribut','Nilai'],['Atribut','Nilai']])+
        tcard('KODE-002', pill('Aktif','badge-green'), [['Atribut','Nilai'],['Atribut','Nilai']])+
      '</div>'+
      '<div class="mini-note" style="margin-top:12px">Mengikuti <b>Pola CRUD</b> — tabel → kartu bertumpuk.</div>', true
    );
  }
  return mShell('', g.label,
    '<div class="gsoon" style="padding:34px 20px;margin-top:8px"><span class="tag">Bagian dari IA aplikasi</span><div class="ic">◷</div><h3>'+g.label+'</h3>'+
    '<p>Menu ini ada pada aplikasi SWAT yang berjalan. Wireframe detail layar ini belum dibuat pada Fase 1.</p></div>'
  );
};
