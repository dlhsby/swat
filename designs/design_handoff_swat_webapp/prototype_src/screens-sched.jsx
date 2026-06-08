/* =====================================================================
   SWAT hi-fi — Penjadwalan: Jadwal Kru · Template Trayek · Jatah Kitir
   ===================================================================== */

/* ----------------------------------------------- JADWAL KRU --------- */
function CrewScreen({ onNav }) {
  const { fmt, CREW } = window.SWAT;
  const [q, setQ] = useState('');
  const filtered = CREW.filter(c => !q || (c.plate + ' ' + c.driver).toLowerCase().includes(q.toLowerCase()));
  return (
    <div className="hf-page hf-enter">
      <Crumbs items={[{ label: 'Penjadwalan' }, { label: 'Jadwal Kru' }]} />
      <PageHead title="Jadwal Kru" sub="Pasangan tetap kendaraan + pengemudi (template harian)."
        actions={<Button variant="primary" icon="plus">Buat Jadwal</Button>} />
      <div className="hf-toolbar">
        <SearchInput value={q} onChange={setQ} placeholder="Cari nopol / pengemudi…" />
        <Button variant="outline" size="sm" icon="filter" iconRight="chevDown">Pool</Button>
        <div className="grow" />
        <span className="hf-muted">{fmt.int(42)} jadwal</span>
      </div>
      <div className="hf-tablecard">
        <table className="table">
          <thead><tr>
            <th className="sortable">Kendaraan</th><th className="sortable">Pengemudi</th>
            <th>Pool</th><th>Berangkat</th><th>Kembali</th>
            <th className="num">Trayek</th><th>Status</th>
            <th style={{ width: 60, textAlign: 'right' }}>Aksi</th>
          </tr></thead>
          <tbody>
            {filtered.map(c => (
              <tr key={c.id} style={{ cursor: 'pointer' }} onClick={() => onNav('template', { crew: c.id })}>
                <td className="mono" style={{ fontWeight: 600, color: 'var(--neutral-900)' }}>{c.plate}</td>
                <td>{c.driver}</td>
                <td>{c.pool}</td>
                <td className="mono">{c.depart}</td>
                <td className="mono">{c.ret}</td>
                <td className="num">{c.legs}</td>
                <td><Badge status={c.status === 'ACTIVE' ? 'ACTIVE' : 'INACTIVE'} /></td>
                <td onClick={e => e.stopPropagation()}>
                  <div className="hf-rowactions">
                    <Menu trigger={<button className="hf-iconbtn" aria-label="Aksi"><Icon name="more" size={18} /></button>}
                      items={[
                        { label: 'Kelola Trayek', icon: 'edit', onClick: () => onNav('template', { crew: c.id }) },
                        { sep: true },
                        { label: 'Hapus', icon: 'trash', danger: true },
                      ]} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <TableFooter total={42} page={1} perPage={25} />
      </div>
    </div>
  );
}

/* ----------------------------------------------- TEMPLATE TRAYEK ---- */
function TemplateScreen({ params, onNav }) {
  const toast = useToast();
  const crew = window.SWAT.CREW.find(c => c.id === (params && params.crew)) || window.SWAT.CREW[0];
  const [legs, setLegs] = useState([
    { id: 1, type: 'Berangkat dari Pool', route: crew.pool + ' → —', target: '06:00', fuel: '—' },
    { id: 2, type: 'Pengisian Bahan Bakar', route: '— → SPBU Ahmad Yani', target: '06:15', fuel: '20,00' },
    { id: 3, type: 'Pengambilan Sampah', route: 'TPS Ketintang → —', target: '07:30', fuel: '—' },
    { id: 4, type: 'Pembuangan Sampah', route: '— → TPA Benowo', target: '08:45', fuel: '—' },
    { id: 5, type: 'Kembali ke Pool', route: 'TPA Benowo → ' + crew.pool, target: '16:30', fuel: '—' },
  ]);
  return (
    <div className="hf-page hf-enter">
      <Crumbs items={[{ label: 'Penjadwalan', to: 'crew' }, { label: 'Jadwal Kru', to: 'crew' }, { label: crew.plate }]} onNav={onNav} />
      <PageHead title={crew.plate + ' · ' + crew.driver} sub={crew.pool + ' · ' + (window.SWAT.VEHICLES.find(v => v.plate === crew.plate) || {}).model}
        actions={<Button variant="primary" icon="check" onClick={() => toast({ variant: 'success', title: 'Berhasil', msg: 'Template trayek disimpan.' })}>Simpan</Button>} />
      <div className="card" style={{ padding: 18, marginBottom: 16 }}>
        <b style={{ fontSize: 15 }}>Waktu Jadwal</b>
        <div className="hf-formgrid" style={{ marginTop: 12, maxWidth: 520 }}>
          <Field label="Berangkat" required><Input className="mono" defaultValue={crew.depart} affix={<Icon name="clock" size={16} />} /></Field>
          <Field label="Kembali" required><Input className="mono" defaultValue={crew.ret} affix={<Icon name="clock" size={16} />} /></Field>
        </div>
      </div>
      <div className="hf-tablecard">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderBottom: '1px solid var(--neutral-200)' }}>
          <b style={{ fontSize: 15 }}>Trayek Terencana</b>
          <Button variant="outline" size="sm" icon="plus">Tambah Trayek</Button>
        </div>
        <table className="table">
          <thead><tr><th style={{ width: 30 }}>#</th><th>Jenis (RouteCategory)</th><th>Rute</th><th>Target</th><th className="num">BBM (L)</th><th style={{ width: 44 }} /></tr></thead>
          <tbody>
            {legs.map((l, i) => (
              <tr key={l.id}>
                <td className="mono hf-muted">{i + 1}</td>
                <td style={{ fontWeight: 500, color: 'var(--neutral-900)' }}>{l.type}</td>
                <td className="hf-muted">{l.route}</td>
                <td className="mono">{l.target}</td>
                <td className="num">{l.fuel}</td>
                <td style={{ textAlign: 'right', color: 'var(--neutral-300)', cursor: 'grab' }}><Icon name="grip" size={16} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="alert alert-info" style={{ marginTop: 16 }}>
        <Icon name="info" size={18} style={{ color: 'var(--info-600)', flexShrink: 0 }} />
        <div><div className="alert-title">Urutan trayek</div>Urutan mengikuti insertion order. Target di luar rentang berangkat–kembali tetap diterima dengan peringatan.</div>
      </div>
    </div>
  );
}

/* ----------------------------------------------- ISSUE QUOTA DIALOG */
function QuotaForm({ onClose, onSave }) {
  const [f, setF] = useState({ plate: '', site: '', from: '', to: '', status: 'ACTIVE' });
  const [touched, setTouched] = useState(false);
  const set = (k, v) => setF(s => ({ ...s, [k]: v }));
  const valid = f.plate && f.site && f.from && f.to;
  return (
    <Dialog title="Terbitkan Jatah Kitir" onClose={onClose} width={560}
      footer={<><Button variant="secondary" onClick={onClose}>Batal</Button>
        <Button variant="primary" onClick={() => { setTouched(true); if (valid) onSave(f); }}>Terbitkan</Button></>}>
      <div className="hf-formgrid">
        <Field label="Kendaraan" required error={touched && !f.plate ? 'Wajib dipilih.' : ''}>
          <Select value={f.plate} onChange={e => set('plate', e.target.value)}>
            <option value="">Pilih kendaraan…</option>
            {window.SWAT.VEHICLES.filter(v => v.status === 'GOOD').map(v => <option key={v.id}>{v.plate}</option>)}
          </Select>
        </Field>
        <Field label="Lokasi (TPA)" required error={touched && !f.site ? 'Wajib dipilih.' : ''}>
          <Select value={f.site} onChange={e => set('site', e.target.value)}>
            <option value="">Pilih lokasi…</option>
            {['TPA Benowo', 'TPA Romokalisari'].map(s => <option key={s}>{s}</option>)}
          </Select>
        </Field>
        <Field label="Berlaku Dari" required help="dd/MM/yyyy" error={touched && !f.from ? 'Wajib diisi.' : ''}>
          <Input value={f.from} onChange={e => set('from', e.target.value)} placeholder="01/01/2026" affix={<Icon name="calendar" size={16} />} />
        </Field>
        <Field label="Berlaku Sampai" required help="dd/MM/yyyy" error={touched && !f.to ? 'Wajib diisi.' : ''}>
          <Input value={f.to} onChange={e => set('to', e.target.value)} placeholder="31/12/2026" affix={<Icon name="calendar" size={16} />} />
        </Field>
      </div>
      <Field label="Status">
        <div style={{ display: 'flex', gap: 18, paddingTop: 4 }}>
          {[['ACTIVE', 'Berlaku'], ['INACTIVE', 'Tidak Berlaku']].map(([v, l]) => (
            <label key={v} className="check" style={{ gap: 8 }}>
              <input type="radio" name="qstatus" checked={f.status === v} onChange={() => set('status', v)} style={{ accentColor: 'var(--primary-700)' }} /> {l}
            </label>
          ))}
        </div>
      </Field>
      <div className="alert alert-warning" style={{ marginTop: 4 }}>
        <Icon name="alertTri" size={18} style={{ color: 'var(--warning-600)', flexShrink: 0 }} />
        <div><div className="alert-title">Validasi</div>Berlaku Sampai harus ≥ Berlaku Dari. Peringatan bila sudah ada kitir aktif untuk kombinasi yang sama.</div>
      </div>
    </Dialog>
  );
}

/* ----------------------------------------------- JATAH KITIR -------- */
function QuotaScreen() {
  const toast = useToast();
  const { fmt } = window.SWAT;
  const [list, setList] = useState(window.SWAT.QUOTA);
  const [q, setQ] = useState('');
  const [form, setForm] = useState(false);
  const filtered = list.filter(x => !q || (x.code + ' ' + x.plate).toLowerCase().includes(q.toLowerCase()));
  const save = (f) => {
    const seq = String(46 + list.length).padStart(4, '0');
    setList(l => [{ id: Date.now(), code: 'KT-202606-' + seq, ...f }, ...l]);
    toast({ variant: 'success', title: 'Kitir diterbitkan', msg: f.plate + ' → ' + f.site });
    setForm(false);
  };
  return (
    <div className="hf-page hf-enter">
      <Crumbs items={[{ label: 'Penjadwalan' }, { label: 'Jatah Kitir' }]} />
      <PageHead title="Jatah Kitir" sub="Otorisasi kendaraan ↔ lokasi (TPA) untuk rentang tanggal."
        actions={<><Button variant="outline" icon="upload">Impor Massal</Button><Button variant="primary" icon="plus" onClick={() => setForm(true)}>Terbitkan Kitir</Button></>} />
      <div className="hf-toolbar">
        <SearchInput value={q} onChange={setQ} placeholder="Cari kode / nopol…" />
        <Button variant="outline" size="sm" icon="filter" iconRight="chevDown">Status</Button>
        <Button variant="outline" size="sm" icon="calendar" iconRight="chevDown">Berlaku pada</Button>
        <div className="grow" />
        <span className="hf-muted">3,3 jt entri</span>
      </div>
      <div className="hf-tablecard">
        <table className="table">
          <thead><tr>
            <th className="sortable">Kode</th><th className="sortable">Kendaraan</th><th>Lokasi</th>
            <th>Berlaku Dari</th><th>Berlaku Sampai</th><th>Status</th>
            <th style={{ width: 60, textAlign: 'right' }}>Aksi</th>
          </tr></thead>
          <tbody>
            {filtered.map(x => (
              <tr key={x.id}>
                <td className="mono" style={{ fontWeight: 600, color: 'var(--neutral-900)' }}>{x.code}</td>
                <td className="mono">{x.plate}</td>
                <td>{x.site}</td>
                <td className="mono">{x.from}</td>
                <td className="mono">{x.to}</td>
                <td><Badge status={x.status} /></td>
                <td>
                  <div className="hf-rowactions">
                    <Menu trigger={<button className="hf-iconbtn" aria-label="Aksi"><Icon name="more" size={18} /></button>}
                      items={[{ label: 'Ubah', icon: 'edit' }, { sep: true }, { label: 'Hapus', icon: 'trash', danger: true }]} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <TableFooter total={3300000} page={1} perPage={25} />
      </div>
      {form && <QuotaForm onClose={() => setForm(false)} onSave={save} />}
    </div>
  );
}

Object.assign(window, { CrewScreen, TemplateScreen, QuotaScreen });
