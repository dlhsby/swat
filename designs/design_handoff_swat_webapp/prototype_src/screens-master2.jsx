/* =====================================================================
   SWAT hi-fi — Master Data (new): Pengemudi · Spot & Rute · Sumber Sampah
   ===================================================================== */

/* small inline tab control */
function Tabs({ tabs, active, onChange }) {
  return (
    <div className="hf-tabs" role="tablist">
      {tabs.map(t => (
        <button key={t.id} role="tab" aria-selected={active === t.id} className={active === t.id ? 'on' : ''} onClick={() => onChange(t.id)}>
          {t.icon && <Icon name={t.icon} size={15} />}{t.label}{t.count != null && <span className="cnt">{t.count}</span>}
        </button>
      ))}
    </div>
  );
}

/* ============================ PENGEMUDI ============================= */
function DriverForm({ initial, onClose, onSave }) {
  const { POOLS, LICENSE_CLASSES } = window.SWAT;
  const [tab, setTab] = useState('personal');
  const [f, setF] = useState(initial || { name: '', ktp: '', emp: 'SATGAS', pool: '', contact: '', birth: '', origin: '', current: '', training: 'BELUM' });
  const [licenses, setLicenses] = useState((initial && initial.licenses) || []);
  const [touched, setTouched] = useState(false);
  const set = (k, v) => setF(s => ({ ...s, [k]: v }));
  const ktpErr = touched && f.ktp && !/^\d{16}$/.test(f.ktp) ? 'KTP harus 16 digit.' : (touched && !f.ktp ? 'Wajib diisi.' : '');
  const valid = f.name.trim() && /^\d{16}$/.test(f.ktp) && f.pool && f.contact.trim();
  return (
    <Dialog title={initial ? 'Ubah Pengemudi' : 'Daftarkan Pengemudi'} onClose={onClose} width={640}
      footer={<><Button variant="secondary" onClick={onClose}>Batal</Button>
        <Button variant="primary" onClick={() => { setTouched(true); if (valid) onSave({ ...f, licenses, lic: licenses.length }, !!initial); }}>Simpan</Button></>}>
      <Tabs tabs={[{ id: 'personal', label: 'Data Pribadi', icon: 'user' }, { id: 'lic', label: 'Lisensi (SIM)', icon: 'file', count: licenses.length }]} active={tab} onChange={setTab} />
      {tab === 'personal' ? (
        <div style={{ marginTop: 18 }}>
          <div className="hf-formgrid">
            <Field label="Nomor KTP" required error={ktpErr} help="16 digit.">
              <Input className="mono" value={f.ktp} onChange={e => set('ktp', e.target.value.replace(/\D/g, '').slice(0, 16))} placeholder="3578010101900001" error={!!ktpErr} />
            </Field>
            <Field label="Nama lengkap" required error={touched && !f.name.trim() ? 'Wajib diisi.' : ''}>
              <Input value={f.name} onChange={e => set('name', e.target.value)} placeholder="mis. Budi Santoso" />
            </Field>
            <Field label="Status kepegawaian" required>
              <Select value={f.emp} onChange={e => set('emp', e.target.value)}>{['SATGAS', 'PNS', 'HONORER'].map(x => <option key={x}>{x}</option>)}</Select>
            </Field>
            <Field label="Tanggal lahir" required help="Usia minimal 17 tahun.">
              <Input value={f.birth} onChange={e => set('birth', e.target.value)} placeholder="dd/MM/yyyy" affix={<Icon name="calendar" size={16} />} />
            </Field>
            <Field label="Pool / Depo" required error={touched && !f.pool ? 'Wajib dipilih.' : ''}>
              <Select value={f.pool} onChange={e => set('pool', e.target.value)}><option value="">Pilih pool…</option>{POOLS.map(p => <option key={p}>{p}</option>)}</Select>
            </Field>
            <Field label="Kontak" required error={touched && !f.contact.trim() ? 'Wajib diisi.' : ''}>
              <Input value={f.contact} onChange={e => set('contact', e.target.value)} placeholder="No. HP / email" />
            </Field>
          </div>
          <div className="hf-formgrid">
            <Field label="Alamat asal"><Textarea value={f.origin} onChange={e => set('origin', e.target.value)} placeholder="Alamat sesuai KTP" /></Field>
            <Field label="Alamat sekarang"><Textarea value={f.current} onChange={e => set('current', e.target.value)} placeholder="Domisili saat ini" /></Field>
          </div>
          <Field label="Status pelatihan K3" help='Default "BELUM".'><Input value={f.training} onChange={e => set('training', e.target.value)} /></Field>
        </div>
      ) : (
        <div style={{ marginTop: 18 }}>
          {licenses.length === 0
            ? <EmptyState compact art="empty" title="Belum ada lisensi" msg="Terbitkan SIM untuk pengemudi ini." />
            : (
              <table className="table" style={{ marginBottom: 12 }}>
                <thead><tr><th>Kelas</th><th>Nomor SIM</th><th>Berlaku s/d</th><th>Status</th><th style={{ width: 40 }} /></tr></thead>
                <tbody>
                  {licenses.map((l, i) => (
                    <tr key={i}>
                      <td><Badge cls="badge-slate" label={l.cls} /></td>
                      <td className="mono">{l.no}</td>
                      <td className="mono">{l.expiry}</td>
                      <td><Badge status={l.st || 'VALID'} /></td>
                      <td style={{ textAlign: 'right' }}><button className="hf-iconbtn" aria-label="Cabut" onClick={() => setLicenses(ls => ls.filter((_, j) => j !== i))}><Icon name="trash" size={15} /></button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          <Button variant="outline" size="sm" icon="plus" onClick={() => setLicenses(ls => [...ls, { cls: LICENSE_CLASSES[4], no: 'SIM-' + Math.floor(1000000 + Math.random() * 8999999), expiry: '31/12/2029', st: 'VALID' }])}>Terbitkan Lisensi</Button>
          <div className="alert alert-warning" style={{ marginTop: 16 }}>
            <Icon name="alertTri" size={18} style={{ color: 'var(--warning-600)', flexShrink: 0 }} />
            <div><div className="alert-title">Validasi lisensi</div>Saat membuat jadwal kru, sistem memperingatkan jika pengemudi tak punya SIM yang masih berlaku.</div>
          </div>
        </div>
      )}
    </Dialog>
  );
}

function DriversScreen() {
  const toast = useToast();
  const { fmt, DRIVERS_FULL } = window.SWAT;
  const [list, setList] = useState(DRIVERS_FULL);
  const [q, setQ] = useState('');
  const [form, setForm] = useState(null);
  const [del, setDel] = useState(null);
  const filtered = list.filter(d => !q || (d.name + ' ' + d.ktp + ' ' + d.contact).toLowerCase().includes(q.toLowerCase()));
  const initials = (n) => n.split(' ').map(x => x[0]).join('').slice(0, 2).toUpperCase();
  const worst = (ls) => ls.some(l => l.st === 'EXPIRED') ? 'EXPIRED' : ls.some(l => l.st === 'EXPIRING') ? 'EXPIRING' : ls.length ? 'VALID' : null;
  const save = (f, isEdit) => {
    if (isEdit) { setList(l => l.map(d => d.id === form.id ? { ...d, ...f } : d)); toast({ variant: 'success', title: 'Berhasil', msg: f.name + ' diperbarui.' }); }
    else { setList(l => [{ id: Date.now(), ...f }, ...l]); toast({ variant: 'success', title: 'Pengemudi terdaftar', msg: f.name }); }
    setForm(null);
  };
  return (
    <div className="hf-page hf-enter">
      <Crumbs items={[{ label: 'Master Data' }, { label: 'Pengemudi' }]} />
      <PageHead title="Pengemudi" sub="Data pengemudi & kepemilikan SIM."
        actions={<Button variant="primary" icon="plus" onClick={() => setForm({})}>Daftarkan Pengemudi</Button>} />
      <div className="alert alert-warning" style={{ marginBottom: 16 }}>
        <Icon name="alertTri" size={18} style={{ color: 'var(--warning-600)', flexShrink: 0 }} />
        <div><div className="alert-title">2 SIM perlu perhatian</div>1 kedaluwarsa &amp; 2 akan habis ≤ 30 hari — perbarui sebelum penjadwalan berikutnya.</div>
      </div>
      <div className="hf-toolbar">
        <SearchInput value={q} onChange={setQ} placeholder="Cari nama / KTP / kontak…" />
        <Button variant="outline" size="sm" icon="filter" iconRight="chevDown">Pool</Button>
        <Button variant="outline" size="sm" icon="filter" iconRight="chevDown">Kepegawaian</Button>
        <div className="grow" />
        <span className="hf-muted">{fmt.int(list.length)} pengemudi</span>
      </div>
      <div className="hf-tablecard">
        <table className="table">
          <thead><tr><th>Nama</th><th>KTP</th><th>Kepegawaian</th><th>Pool</th><th>Kontak</th><th className="num">SIM</th><th>Lisensi</th><th style={{ width: 60, textAlign: 'right' }}>Aksi</th></tr></thead>
          <tbody>
            {filtered.map(d => {
              const w = worst(d.licenses);
              return (
                <tr key={d.id} className={w === 'EXPIRED' ? 'hf-row-danger' : w === 'EXPIRING' ? 'hf-row-warn' : ''}>
                  <td><div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    <span className="avatar" style={{ width: 30, height: 30, fontSize: 12 }}>{initials(d.name)}</span>
                    <b style={{ fontWeight: 600, color: 'var(--neutral-900)' }}>{d.name}</b></div></td>
                  <td className="mono">{d.ktp}</td>
                  <td><Badge status={d.emp} /></td>
                  <td>{d.pool}</td>
                  <td className="mono">{d.contact}</td>
                  <td className="num">{d.lic}</td>
                  <td>{w ? <Badge status={w} /> : <span className="hf-muted">—</span>}</td>
                  <td>
                    <div className="hf-rowactions">
                      <Menu trigger={<button className="hf-iconbtn" aria-label="Aksi"><Icon name="more" size={18} /></button>}
                        items={[
                          { label: 'Ubah & kelola SIM', icon: 'edit', onClick: () => setForm(d) },
                          { sep: true },
                          { label: 'Hapus', icon: 'trash', danger: true, onClick: () => setDel(d) },
                        ]} />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <TableFooter total={list.length} page={1} perPage={25} />
      </div>
      {form && <DriverForm initial={form.id ? form : null} onClose={() => setForm(null)} onSave={save} />}
      {del && <Confirm title="Hapus pengemudi?" body={<>Yakin ingin menghapus <b>{del.name}</b>? Penjadwalan & penugasan lama tetap utuh (soft-delete).</>}
        onCancel={() => setDel(null)} onConfirm={() => { setList(l => l.filter(d => d.id !== del.id)); toast({ variant: 'success', title: 'Dihapus', msg: del.name }); setDel(null); }} />}
    </div>
  );
}

/* ============================ SPOT & RUTE ========================== */
function SitesScreen() {
  const toast = useToast();
  const { fmt, SITES, ROUTES, SITE_TYPE, ROUTE_CAT } = window.SWAT;
  const [tab, setTab] = useState('sites');
  const [q, setQ] = useState('');
  const [form, setForm] = useState(null);
  const fSites = SITES.filter(s => !q || (s.name + ' ' + s.address).toLowerCase().includes(q.toLowerCase()));
  return (
    <div className="hf-page hf-enter">
      <Crumbs items={[{ label: 'Master Data' }, { label: 'Spot & Rute' }]} />
      <PageHead title="Spot & Rute" sub="Lokasi jaringan (Pool, SPBU, TPS, TPA) dan rute terarah."
        actions={tab === 'sites'
          ? <Button variant="primary" icon="plus" onClick={() => setForm('site')}>Daftarkan Lokasi</Button>
          : <Button variant="primary" icon="plus" onClick={() => setForm('route')}>Definisikan Rute</Button>} />
      <Tabs tabs={[{ id: 'sites', label: 'Lokasi', icon: 'pin', count: SITES.length }, { id: 'routes', label: 'Rute', icon: 'route', count: ROUTES.length }]} active={tab} onChange={setTab} />
      <div style={{ marginTop: 18 }}>
        {tab === 'sites' ? (
          <>
            <div className="hf-toolbar">
              <SearchInput value={q} onChange={setQ} placeholder="Cari nama / alamat lokasi…" />
              <Button variant="outline" size="sm" icon="filter" iconRight="chevDown">Jenis</Button>
              <div className="grow" />
              <span className="hf-muted">{fmt.int(SITES.length)} lokasi</span>
            </div>
            <div className="hf-tablecard">
              <table className="table">
                <thead><tr><th>Nama Lokasi</th><th>Jenis</th><th>Alamat</th><th>Koordinat</th><th style={{ width: 60, textAlign: 'right' }}>Aksi</th></tr></thead>
                <tbody>
                  {fSites.map(s => {
                    const t = SITE_TYPE[s.type];
                    return (
                      <tr key={s.id}>
                        <td><div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                          <span className="hf-siteic"><Icon name={t.icon} size={15} /></span>
                          <b style={{ fontWeight: 600, color: 'var(--neutral-900)' }}>{s.name}</b></div></td>
                        <td><Badge cls={t.cls} label={t.label} /></td>
                        <td className="hf-muted" style={{ maxWidth: 280 }}>{s.address}</td>
                        <td className="mono hf-muted">{s.coord}</td>
                        <td><div className="hf-rowactions"><Menu trigger={<button className="hf-iconbtn" aria-label="Aksi"><Icon name="more" size={18} /></button>}
                          items={[{ label: 'Ubah', icon: 'edit', onClick: () => setForm('site') }, { label: 'Lihat di peta', icon: 'pin' }, { sep: true }, { label: 'Hapus', icon: 'trash', danger: true }]} /></div></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <div className="hf-tablecard">
            <table className="table">
              <thead><tr><th>Asal</th><th /><th>Tujuan</th><th>Kategori</th><th className="num">Jarak (km)</th><th style={{ width: 60, textAlign: 'right' }}>Aksi</th></tr></thead>
              <tbody>
                {ROUTES.map(r => (
                  <tr key={r.id}>
                    <td style={{ fontWeight: 500, color: 'var(--neutral-900)' }}>{r.origin}</td>
                    <td style={{ color: 'var(--neutral-300)' }}><Icon name="arrowRight" size={16} /></td>
                    <td style={{ fontWeight: 500, color: 'var(--neutral-900)' }}>{r.dest}</td>
                    <td><Badge cls="badge-slate" label={ROUTE_CAT[r.cat]} /></td>
                    <td className="num">{r.km}</td>
                    <td><div className="hf-rowactions"><Menu trigger={<button className="hf-iconbtn" aria-label="Aksi"><Icon name="more" size={18} /></button>}
                      items={[{ label: 'Ubah jarak', icon: 'edit', onClick: () => setForm('route') }, { sep: true }, { label: 'Hapus', icon: 'trash', danger: true }]} /></div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {form === 'site' && <SiteForm onClose={() => setForm(null)} onSave={() => { setForm(null); toast({ variant: 'success', title: 'Tersimpan', msg: 'Lokasi disimpan.' }); }} />}
      {form === 'route' && <RouteForm onClose={() => setForm(null)} onSave={() => { setForm(null); toast({ variant: 'success', title: 'Tersimpan', msg: 'Rute didefinisikan.' }); }} />}
    </div>
  );
}

function SiteForm({ onClose, onSave }) {
  const [type, setType] = useState('TPS');
  return (
    <Dialog title="Daftarkan Lokasi" onClose={onClose} width={580}
      footer={<><Button variant="secondary" onClick={onClose}>Batal</Button><Button variant="primary" onClick={onSave}>Simpan</Button></>}>
      <Field label="Nama lokasi" required><Input placeholder="mis. TPS Ketintang" /></Field>
      <Field label="Jenis lokasi" required>
        <div style={{ display: 'flex', gap: 10, paddingTop: 4, flexWrap: 'wrap' }}>
          {[['POOL', 'Pool'], ['SPBU', 'SPBU'], ['TPS', 'TPS'], ['TPA', 'TPA']].map(([v, l]) => (
            <button key={v} type="button" className={'hf-choice' + (type === v ? ' on' : '')} onClick={() => setType(v)}>{l}</button>
          ))}
        </div>
      </Field>
      <Field label="Alamat" required><Textarea placeholder="Alamat lengkap" /></Field>
      <div className="hf-divlbl">Koordinat (opsional)</div>
      <div className="hf-formgrid">
        <Field label="Latitude" help="±90"><Input className="tnum" placeholder="-7.31550" /></Field>
        <Field label="Longitude" help="±180"><Input className="tnum" placeholder="112.72210" /></Field>
      </div>
      <div className="hf-imgslot" style={{ height: 120 }}>peta pemilih koordinat — klik untuk menandai (OpenStreetMap)</div>
      <div className="alert alert-info" style={{ marginTop: 14 }}>
        <Icon name="info" size={18} style={{ color: 'var(--info-600)', flexShrink: 0 }} />
        <div>Isi <b>kedua</b> koordinat atau kosongkan keduanya.</div>
      </div>
    </Dialog>
  );
}

function RouteForm({ onClose, onSave }) {
  const { SITES, ROUTE_CAT } = window.SWAT;
  return (
    <Dialog title="Definisikan Rute" onClose={onClose} width={560}
      footer={<><Button variant="secondary" onClick={onClose}>Batal</Button><Button variant="primary" onClick={onSave}>Simpan</Button></>}>
      <div className="hf-formgrid">
        <Field label="Lokasi asal" required><Select><option value="">Pilih asal…</option>{SITES.map(s => <option key={s.id}>{s.name}</option>)}</Select></Field>
        <Field label="Lokasi tujuan" required><Select><option value="">Pilih tujuan…</option>{SITES.map(s => <option key={s.id}>{s.name}</option>)}</Select></Field>
        <Field label="Kategori rute" required><Select>{Object.entries(ROUTE_CAT).map(([k, v]) => <option key={k}>{v}</option>)}</Select></Field>
        <Field label="Jarak" required help="≥ 0"><Input className="tnum" affix="km" placeholder="24" /></Field>
      </div>
      <div className="alert alert-warning" style={{ marginTop: 4 }}>
        <Icon name="alertTri" size={18} style={{ color: 'var(--warning-600)', flexShrink: 0 }} />
        <div><div className="alert-title">Validasi</div>Asal ≠ tujuan. Kombinasi (asal, tujuan, kategori) harus unik.</div>
      </div>
    </Dialog>
  );
}

/* ============================ SUMBER SAMPAH ======================== */
function WasteScreen() {
  const toast = useToast();
  const { fmt, WASTE } = window.SWAT;
  const [list, setList] = useState(WASTE);
  const [q, setQ] = useState('');
  const [form, setForm] = useState(null);
  const filtered = list.filter(w => !q || (w.code + ' ' + w.name).toLowerCase().includes(q.toLowerCase()));
  return (
    <div className="hf-page hf-enter">
      <Crumbs items={[{ label: 'Master Data' }, { label: 'Sumber Sampah' }]} />
      <PageHead title="Sumber Sampah" sub="Kategori sumber sampah yang ditugaskan ke kendaraan."
        actions={<Button variant="primary" icon="plus" onClick={() => setForm({})}>Tambah Sumber</Button>} />
      <div className="hf-toolbar">
        <SearchInput value={q} onChange={setQ} placeholder="Cari kode / nama…" />
        <div className="grow" />
        <span className="hf-muted">{fmt.int(list.length)} sumber</span>
      </div>
      <div className="hf-tablecard">
        <table className="table">
          <thead><tr><th style={{ width: 90 }}>Kode</th><th>Nama</th><th>Keterangan</th><th className="num">Kendaraan</th><th style={{ width: 60, textAlign: 'right' }}>Aksi</th></tr></thead>
          <tbody>
            {filtered.map(w => (
              <tr key={w.id}>
                <td><span className="hf-codechip">{w.code}</span></td>
                <td style={{ fontWeight: 600, color: 'var(--neutral-900)' }}>{w.name}</td>
                <td className="hf-muted">{w.notes}</td>
                <td className="num">{w.vehicles}</td>
                <td><div className="hf-rowactions"><Menu trigger={<button className="hf-iconbtn" aria-label="Aksi"><Icon name="more" size={18} /></button>}
                  items={[{ label: 'Ubah', icon: 'edit', onClick: () => setForm(w) }, { sep: true }, { label: 'Hapus', icon: 'trash', danger: true }]} /></div></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {form && (
        <Dialog title={form.id ? 'Ubah Sumber Sampah' : 'Tambah Sumber Sampah'} onClose={() => setForm(null)} width={500}
          footer={<><Button variant="secondary" onClick={() => setForm(null)}>Batal</Button>
            <Button variant="primary" onClick={() => { setForm(null); toast({ variant: 'success', title: 'Tersimpan', msg: 'Sumber sampah disimpan.' }); }}>Simpan</Button></>}>
          <div className="hf-formgrid">
            <Field label="Kode" required help="≤ 5 karakter, unik."><Input className="mono" defaultValue={form.code} placeholder="PS" /></Field>
            <Field label="Nama" required><Input defaultValue={form.name} placeholder="Pasar" /></Field>
          </div>
          <Field label="Keterangan"><Textarea defaultValue={form.notes} placeholder="Deskripsi singkat (opsional)" /></Field>
        </Dialog>
      )}
    </div>
  );
}

Object.assign(window, { Tabs, DriverForm, DriversScreen, SitesScreen, SiteForm, RouteForm, WasteScreen });
