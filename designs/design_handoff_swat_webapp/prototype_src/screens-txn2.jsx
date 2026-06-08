/* =====================================================================
   SWAT hi-fi — Transaksi (new): Pengisian Bahan Bakar · Pemeriksaan
   Kendaraan · Perawatan
   ===================================================================== */

const fuelPrice = (name) => (window.SWAT.FUELS.find(f => f.name === name) || { price: 8000 }).price;

/* ====================== PENGISIAN BAHAN BAKAR ====================== */
function RefuelLogForm({ onClose, onSave }) {
  const { VEHICLES, FUELS } = window.SWAT;
  const [f, setF] = useState({ plate: '', fuel: 'Solar', req: '50,00', appr: '50,00', time: '06:20', odo: '' });
  const set = (k, v) => setF(s => ({ ...s, [k]: v }));
  const n = (s) => +String(s).replace(/\./g, '').replace(/,/g, '.') || 0;
  const invalid = n(f.appr) > n(f.req);
  const cost = n(f.appr) * fuelPrice(f.fuel);
  return (
    <Dialog title="Catat Pengisian Bahan Bakar" onClose={onClose} width={580}
      footer={<><Button variant="secondary" onClick={onClose}>Batal</Button><Button variant="primary" disabled={invalid} onClick={onSave}>Simpan</Button></>}>
      <div className="hf-formgrid">
        <Field label="Kendaraan" required><Select value={f.plate} onChange={e => set('plate', e.target.value)}><option value="">Pilih kendaraan…</option>{VEHICLES.map(v => <option key={v.id}>{v.plate}</option>)}</Select></Field>
        <Field label="Jenis bahan bakar" required help="Difilter sesuai model."><Select value={f.fuel} onChange={e => set('fuel', e.target.value)}>{FUELS.map(x => <option key={x.id}>{x.name}</option>)}</Select></Field>
        <Field label="Jumlah diminta" required><Input className="tnum" affix="L" value={f.req} onChange={e => set('req', e.target.value)} /></Field>
        <Field label="Jumlah disetujui" required error={invalid ? 'Harus ≤ diminta.' : ''}><Input className="tnum" affix="L" value={f.appr} onChange={e => set('appr', e.target.value)} error={invalid} /></Field>
        <Field label="Waktu aktual" required><Input className="mono" value={f.time} onChange={e => set('time', e.target.value)} affix={<Icon name="clock" size={16} />} /></Field>
        <Field label="Odometer" required><Input className="tnum" affix="km" value={f.odo} onChange={e => set('odo', e.target.value)} placeholder="125.430" /></Field>
      </div>
      <div className="hf-net" style={{ background: 'var(--primary-50)', borderColor: 'var(--primary-100)' }}>
        <div><div className="nlabel">Estimasi biaya (otomatis: disetujui × harga/L)</div>
          <div className="nval" style={{ color: 'var(--primary-700)' }}>{window.SWAT.fmt.rupiah(Math.round(cost))}</div></div>
        <Badge cls="badge-green" label={'@ ' + window.SWAT.fmt.rupiah(fuelPrice(f.fuel)) + '/L'} />
      </div>
    </Dialog>
  );
}

function RefuelScreen() {
  const toast = useToast();
  const { fmt, REFUELS } = window.SWAT;
  const [q, setQ] = useState('');
  const [form, setForm] = useState(false);
  const filtered = REFUELS.filter(r => !q || (r.plate + ' ' + r.driver + ' ' + r.spbu).toLowerCase().includes(q.toLowerCase()));
  const totL = REFUELS.reduce((a, r) => a + r.appr, 0);
  const totCost = REFUELS.reduce((a, r) => a + r.appr * fuelPrice(r.fuel), 0);
  return (
    <div className="hf-page hf-enter">
      <Crumbs items={[{ label: 'Transaksi' }, { label: 'Pengisian Bahan Bakar' }]} />
      <PageHead title="Pengisian Bahan Bakar" sub="Catatan pengisian BBM harian armada."
        actions={<Button variant="primary" icon="plus" onClick={() => setForm(true)}>Catat Pengisian</Button>} />
      <div className="hf-grid4" style={{ marginBottom: 18 }}>
        <Metric icon="fuel" lbl="Pengisian hari ini" val={REFUELS.length} u="catatan" />
        <Metric icon="fuel" lbl="Total disetujui" val={fmt.int(totL)} u="L" />
        <Metric icon="transactions" lbl="Estimasi biaya" val={fmt.rupiah(Math.round(totCost)).replace('Rp ', 'Rp')} />
        <Metric icon="alertTri" lbl="Ditandai" val="2" u="anomali" />
      </div>
      <div className="hf-toolbar">
        <SearchInput value={q} onChange={setQ} placeholder="Cari nopol / pengemudi / SPBU…" />
        <Button variant="outline" size="sm" icon="calendar" iconRight="chevDown">5 Jun 2026</Button>
        <Button variant="outline" size="sm" icon="filter" iconRight="chevDown">Status</Button>
        <div className="grow" />
        <span className="hf-muted">{fmt.int(filtered.length)} catatan</span>
      </div>
      <div className="hf-tablecard">
        <table className="table">
          <thead><tr><th>Waktu</th><th>Kendaraan</th><th>Pengemudi</th><th>Jenis</th><th className="num">Diminta</th><th className="num">Disetujui</th><th className="num">Biaya</th><th>SPBU</th><th>Status</th></tr></thead>
          <tbody>
            {filtered.map(r => (
              <tr key={r.id}>
                <td className="mono">{r.time}</td>
                <td className="mono" style={{ fontWeight: 600, color: 'var(--neutral-900)' }}>{r.plate}</td>
                <td>{r.driver}</td>
                <td>{r.fuel}</td>
                <td className="num">{fmt.dec(r.req, 0)} L</td>
                <td className="num" style={{ color: r.appr < r.req ? 'var(--danger-600)' : 'inherit', fontWeight: r.appr < r.req ? 700 : 500 }}>{fmt.dec(r.appr, 0)} L</td>
                <td className="num mono">{fmt.rupiah(r.appr * fuelPrice(r.fuel))}</td>
                <td className="hf-muted">{r.spbu}</td>
                <td><Badge status={r.st} /></td>
              </tr>
            ))}
          </tbody>
        </table>
        <TableFooter total={filtered.length} page={1} perPage={25} />
      </div>
      {form && <RefuelLogForm onClose={() => setForm(false)} onSave={() => { setForm(false); toast({ variant: 'success', title: 'Tersimpan', msg: 'Pengisian BBM dicatat.' }); }} />}
    </div>
  );
}

/* ====================== PEMERIKSAAN KENDARAAN ===================== */
function InspectScreen() {
  const toast = useToast();
  const { fmt, INSPECT, INSPECT_ITEMS } = window.SWAT;
  const [q, setQ] = useState('');
  const [sheet, setSheet] = useState(null);
  const [form, setForm] = useState(false);
  const filtered = INSPECT.filter(i => !q || (i.plate + ' ' + i.model + ' ' + i.inspector).toLowerCase().includes(q.toLowerCase()));
  const itemBadge = (st) => st === 'OK' ? <Badge cls="badge-green" label="Baik" /> : st === 'ATTENTION' ? <Badge cls="badge-amber" label="Perhatian" /> : <Badge cls="badge-red" label="Gagal" />;
  return (
    <div className="hf-page hf-enter">
      <Crumbs items={[{ label: 'Transaksi' }, { label: 'Pemeriksaan Kendaraan' }]} />
      <PageHead title="Pemeriksaan Kendaraan" sub="Daftar periksa kelaikan armada sebelum operasi."
        actions={<Button variant="primary" icon="plus" onClick={() => setForm(true)}>Buat Pemeriksaan</Button>} />
      <div className="hf-toolbar">
        <SearchInput value={q} onChange={setQ} placeholder="Cari nopol / model / pemeriksa…" />
        <Button variant="outline" size="sm" icon="calendar" iconRight="chevDown">Tanggal</Button>
        <Button variant="outline" size="sm" icon="filter" iconRight="chevDown">Hasil</Button>
        <div className="grow" />
        <span className="hf-muted">{fmt.int(filtered.length)} pemeriksaan</span>
      </div>
      <div className="hf-tablecard">
        <table className="table">
          <thead><tr><th>Tanggal</th><th>Kendaraan</th><th>Model</th><th>Pemeriksa</th><th className="num">Lolos</th><th>Hasil</th><th style={{ width: 110, textAlign: 'right' }}>Aksi</th></tr></thead>
          <tbody>
            {filtered.map(i => (
              <tr key={i.id}>
                <td className="mono">{i.date}</td>
                <td className="mono" style={{ fontWeight: 600, color: 'var(--neutral-900)' }}>{i.plate}</td>
                <td>{i.model}</td>
                <td>{i.inspector}</td>
                <td className="num">{i.pass}/{i.total}</td>
                <td><Badge status={i.st} /></td>
                <td style={{ textAlign: 'right' }}><Button variant="ghost" size="sm" iconRight="chevRight" onClick={() => setSheet(i)}>Detail</Button></td>
              </tr>
            ))}
          </tbody>
        </table>
        <TableFooter total={filtered.length} page={1} perPage={25} />
      </div>
      {sheet && (
        <Sheet title={'Pemeriksaan · ' + sheet.plate} sub={sheet.model + ' · ' + sheet.date + ' · ' + sheet.inspector} onClose={() => setSheet(null)}
          footer={<><Button variant="secondary" onClick={() => setSheet(null)}>Tutup</Button><Button variant="primary" icon="printer">Cetak</Button></>}>
          <div className="hf-net" style={{ marginTop: 0 }}>
            <div><div className="nlabel">Butir lolos</div><div className="nval">{sheet.pass} <span className="u">/ {sheet.total}</span></div></div>
            <Badge status={sheet.st} />
          </div>
          <div className="hf-divlbl">Daftar Periksa</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {INSPECT_ITEMS.map((it, k) => (
              <div className="hf-checkitem" key={k}>
                <span className={'tick ' + it.st.toLowerCase()}><Icon name={it.st === 'FAIL' ? 'x' : 'check'} size={14} /></span>
                <span className="lbl">{it.k}</span>
                {itemBadge(it.st)}
              </div>
            ))}
          </div>
        </Sheet>
      )}
      {form && (
        <Dialog title="Buat Pemeriksaan Kendaraan" onClose={() => setForm(false)} width={560}
          footer={<><Button variant="secondary" onClick={() => setForm(false)}>Batal</Button><Button variant="primary" onClick={() => { setForm(false); toast({ variant: 'success', title: 'Tersimpan', msg: 'Pemeriksaan dicatat.' }); }}>Simpan</Button></>}>
          <div className="hf-formgrid">
            <Field label="Kendaraan" required><Select><option value="">Pilih kendaraan…</option>{window.SWAT.VEHICLES.map(v => <option key={v.id}>{v.plate}</option>)}</Select></Field>
            <Field label="Tanggal" required><Input defaultValue="05/06/2026" affix={<Icon name="calendar" size={16} />} /></Field>
          </div>
          <div className="hf-divlbl">Daftar Periksa (12 butir)</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 220, overflowY: 'auto' }}>
            {INSPECT_ITEMS.map((it, k) => (
              <label key={k} className="check" style={{ justifyContent: 'space-between' }}>
                <span style={{ fontSize: 13.5 }}>{it.k}</span>
                <span className="switch"><input type="checkbox" defaultChecked={it.st === 'OK'} /><span className="track" /><span className="thumb" /></span>
              </label>
            ))}
          </div>
        </Dialog>
      )}
    </div>
  );
}

/* ============================ PERAWATAN =========================== */
function MaintScreen() {
  const toast = useToast();
  const { fmt, MAINT, MAINT_STATUS, VEHICLES } = window.SWAT;
  const [list, setList] = useState(MAINT);
  const [q, setQ] = useState('');
  const [form, setForm] = useState(null);
  const filtered = list.filter(m => !q || (m.code + ' ' + m.plate + ' ' + m.desc + ' ' + m.workshop).toLowerCase().includes(q.toLowerCase()));
  const totCost = list.reduce((a, m) => a + m.cost, 0);
  const running = list.filter(m => m.st === 'IN_PROGRESS').length;
  return (
    <div className="hf-page hf-enter">
      <Crumbs items={[{ label: 'Transaksi' }, { label: 'Perawatan' }]} />
      <PageHead title="Perawatan" sub="Riwayat servis & perbaikan armada."
        actions={<Button variant="primary" icon="plus" onClick={() => setForm({})}>Catat Perawatan</Button>} />
      <div className="hf-grid4" style={{ marginBottom: 18 }}>
        <Metric icon="wrench" lbl="Total catatan" val={list.length} u="entri" />
        <Metric icon="clock" lbl="Berjalan" val={running} u="unit" />
        <Metric icon="transactions" lbl="Biaya bulan ini" val={fmt.rupiah(totCost).replace('Rp ', 'Rp')} />
        <Metric icon="truck" lbl="Terjadwal" val={list.filter(m => m.st === 'SCHEDULED').length} u="unit" />
      </div>
      <div className="hf-toolbar">
        <SearchInput value={q} onChange={setQ} placeholder="Cari kode / nopol / bengkel…" />
        <Button variant="outline" size="sm" icon="filter" iconRight="chevDown">Jenis</Button>
        <Button variant="outline" size="sm" icon="filter" iconRight="chevDown">Status</Button>
        <div className="grow" />
        <span className="hf-muted">{fmt.int(filtered.length)} catatan</span>
      </div>
      <div className="hf-tablecard">
        <table className="table">
          <thead><tr><th>Kode</th><th>Tanggal</th><th>Kendaraan</th><th>Jenis</th><th>Pekerjaan</th><th>Bengkel</th><th className="num">Biaya</th><th>Status</th><th style={{ width: 44 }} /></tr></thead>
          <tbody>
            {filtered.map(m => (
              <tr key={m.id}>
                <td className="mono" style={{ fontWeight: 600, color: 'var(--neutral-900)' }}>{m.code}</td>
                <td className="mono">{m.date}</td>
                <td className="mono">{m.plate}</td>
                <td><Badge cls={m.type === 'Perbaikan' ? 'badge-amber' : 'badge-blue'} label={m.type} /></td>
                <td className="hf-muted" style={{ maxWidth: 220 }}>{m.desc}</td>
                <td className="hf-muted">{m.workshop}</td>
                <td className="num mono">{fmt.rupiah(m.cost)}</td>
                <td><Badge cls={MAINT_STATUS[m.st].cls} label={MAINT_STATUS[m.st].label} /></td>
                <td><div className="hf-rowactions"><Menu trigger={<button className="hf-iconbtn" aria-label="Aksi"><Icon name="more" size={18} /></button>}
                  items={[{ label: 'Ubah', icon: 'edit', onClick: () => setForm(m) }, { label: 'Tandai selesai', icon: 'check' }, { sep: true }, { label: 'Hapus', icon: 'trash', danger: true }]} /></div></td>
              </tr>
            ))}
          </tbody>
        </table>
        <TableFooter total={filtered.length} page={1} perPage={25} />
      </div>
      {form && (
        <Dialog title={form.id ? 'Ubah Perawatan' : 'Catat Perawatan'} onClose={() => setForm(null)} width={600}
          footer={<><Button variant="secondary" onClick={() => setForm(null)}>Batal</Button>
            <Button variant="primary" onClick={() => { setForm(null); toast({ variant: 'success', title: 'Tersimpan', msg: 'Perawatan dicatat.' }); }}>Simpan</Button></>}>
          <div className="hf-divlbl">Data Perawatan</div>
          <div className="hf-formgrid">
            <Field label="Kendaraan" required><Select defaultValue={form.plate || ''}><option value="">Pilih kendaraan…</option>{VEHICLES.map(v => <option key={v.id}>{v.plate}</option>)}</Select></Field>
            <Field label="Tanggal" required><Input defaultValue={form.id ? '' : '05/06/2026'} affix={<Icon name="calendar" size={16} />} placeholder="dd/MM/yyyy" /></Field>
            <Field label="Jenis" required><Select defaultValue={form.type || 'Servis Berkala'}>{['Servis Berkala', 'Perbaikan'].map(x => <option key={x}>{x}</option>)}</Select></Field>
            <Field label="Odometer" required><Input className="tnum" affix="km" defaultValue={form.odo ? fmt.int(form.odo) : ''} placeholder="125.400" /></Field>
            <Field label="Bengkel" required><Input defaultValue={form.workshop} placeholder="mis. Bengkel DLH Pusat" /></Field>
            <Field label="Biaya" required><Input className="tnum" affix="Rp" defaultValue={form.cost ? fmt.int(form.cost) : ''} placeholder="1.850.000" /></Field>
          </div>
          <Field label="Uraian pekerjaan" required><Textarea defaultValue={form.desc} placeholder="Deskripsi pekerjaan perawatan" /></Field>
          <div className="hf-imgslot" style={{ height: 74, marginTop: 4 }}>dokumentasi (foto sebelum/sesudah) — JPG/PNG (Dropzone)</div>
        </Dialog>
      )}
    </div>
  );
}

Object.assign(window, { RefuelLogForm, RefuelScreen, InspectScreen, MaintScreen });
