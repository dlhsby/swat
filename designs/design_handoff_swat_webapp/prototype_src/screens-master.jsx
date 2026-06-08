/* =====================================================================
   SWAT hi-fi — Dashboard + Kendaraan (Master Data)
   ===================================================================== */

/* ----------------------------------------------------- DASHBOARD --- */
function DashboardScreen({ onNav }) {
  const { fmt, DAYS } = window.SWAT;
  const metric = (icon, lbl, val, u, delta, dir) => (
    <div className="hf-metric">
      <div className="top"><span className="ic"><Icon name={icon} size={19} /></span><span className="lbl">{lbl}</span></div>
      <div className="val">{val}{u && <span className="u">{u}</span>}</div>
      {delta && <div className={'delta ' + dir}><Icon name={dir === 'up' ? 'arrowRight' : 'arrowRight'} size={13} style={{ transform: dir === 'up' ? 'rotate(-45deg)' : 'rotate(45deg)' }} />{delta}</div>}
    </div>
  );
  return (
    <div className="hf-page hf-enter">
      <PageHead title="Selamat datang, Ali"
        sub="Ringkasan operasi hari ini — Jumat, 5 Juni 2026."
        actions={<Button variant="primary" icon="plus" onClick={() => onNav('days')}>Inisiasi Hari Ini</Button>} />
      <div className="hf-grid4" style={{ marginBottom: 16 }}>
        {metric('truck', 'Kendaraan Aktif', '34', 'unit', '2 vs kemarin', 'up')}
        {metric('transactions', 'Haul Berjalan', '28', 'haul', '1 vs kemarin', 'up')}
        {metric('fuel', 'BBM Hari Ini', fmt.int(1245), 'L', '3% vs kemarin', 'down')}
        {metric('scale', 'Tonase Hari Ini', '87,5', 'ton', '12% vs kemarin', 'up')}
      </div>
      <div className="hf-grid2">
        <div className="card" style={{ padding: 18 }}>
          <div className="hf-cardhead">
            <b>Hari Transaksi Terakhir</b>
            <a className="hf-link" href="#" onClick={e => { e.preventDefault(); onNav('days'); }}>Lihat semua <Icon name="arrowRight" size={14} /></a>
          </div>
          <table className="table">
            <thead><tr><th>Tanggal</th><th>Status</th><th className="num">Kendaraan</th><th className="num">Tonase</th></tr></thead>
            <tbody>
              {DAYS.slice(0, 4).map(d => (
                <tr key={d.id} style={{ cursor: 'pointer' }} onClick={() => onNav('board', { day: d.id })}>
                  <td className="mono">{d.date}</td>
                  <td><Badge status={d.status} /></td>
                  <td className="num">{d.vehicles}</td>
                  <td className="num">{fmt.dec(d.tonnage, 1)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="card" style={{ padding: 18 }}>
          <b style={{ fontSize: 15 }}>Perlu Perhatian</b>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 14 }}>
            <div className="alert alert-warning">
              <Icon name="alertTri" size={18} style={{ color: 'var(--warning-600)', flexShrink: 0 }} />
              <div><div className="alert-title">3 trayek menunggu verifikasi</div>Checker perlu meninjau pembuangan hari ini.</div>
            </div>
            <div className="alert alert-danger">
              <Icon name="alertCirc" size={18} style={{ color: 'var(--danger-600)', flexShrink: 0 }} />
              <div><div className="alert-title">2 SIM pengemudi kedaluwarsa</div>Perbarui sebelum penjadwalan berikutnya.</div>
            </div>
            <div className="alert alert-info">
              <Icon name="info" size={18} style={{ color: 'var(--info-600)', flexShrink: 0 }} />
              <div><div className="alert-title">1 kendaraan rusak berat</div>L 1288 EF perlu dijadwalkan perawatan.</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ----------------------------------------------- KENDARAAN FORM ---- */
function VehicleForm({ initial, onClose, onSave }) {
  const blank = { plate: '', model: '', app: 'Compactor', year: '2021', tare: '', odo: '', stnk: '', tax: '', note: '' };
  const [f, setF] = useState(initial ? { ...initial, year: String(initial.year), tare: window.SWAT.fmt.int(initial.tare), odo: window.SWAT.fmt.int(initial.odo) } : blank);
  const [touched, setTouched] = useState(false);
  const set = (k, v) => setF(s => ({ ...s, [k]: v }));
  const dupPlate = touched && f.plate.trim().toUpperCase() === 'L 1255 CD' && (!initial || initial.plate !== 'L 1255 CD');
  const errs = {
    plate: touched && !f.plate.trim() ? 'Nomor polisi wajib diisi.' : dupPlate ? 'Nomor polisi sudah ada.' : '',
    model: touched && !f.model.trim() ? 'Merek / model wajib dipilih.' : '',
    tare: touched && !String(f.tare).trim() ? 'Berat kosong wajib diisi.' : '',
    odo: touched && !String(f.odo).trim() ? 'Odometer wajib diisi.' : '',
  };
  const valid = f.plate.trim() && f.model.trim() && String(f.tare).trim() && String(f.odo).trim() && !dupPlate;
  const submit = () => { setTouched(true); if (valid) onSave(f, !!initial); };
  return (
    <Dialog title={initial ? 'Ubah Kendaraan' : 'Tambah Kendaraan'} onClose={onClose} width={600}
      footer={<><Button variant="secondary" onClick={onClose}>Batal</Button><Button variant="primary" onClick={submit}>Simpan</Button></>}>
      <div className="hf-divlbl">Data Dasar</div>
      <div className="hf-formgrid">
        <Field label="Nomor Polisi" required error={errs.plate}>
          <Input className="mono" value={f.plate} onChange={e => set('plate', e.target.value)} placeholder="mis. L 1234 AB" error={errs.plate} />
        </Field>
        <Field label="Tahun Pembuatan" required help="1990–2030.">
          <Input className="tnum" type="number" value={f.year} onChange={e => set('year', e.target.value)} />
        </Field>
        <Field label="Merek / Model" required error={errs.model}>
          <Select value={f.model} onChange={e => set('model', e.target.value)}>
            <option value="">Pilih model…</option>
            {['Hino Dutro 130 HD', 'Isuzu Elf NMR', 'Hyundai HD120', 'Mitsubishi Fuso', 'Hino Ranger FG', 'Isuzu Giga'].map(m => <option key={m}>{m}</option>)}
          </Select>
        </Field>
        <Field label="Aplikasi" required>
          <Select value={f.app} onChange={e => set('app', e.target.value)}>
            {['Compactor', 'Dump Truck', 'Arm Roll'].map(a => <option key={a}>{a}</option>)}
          </Select>
        </Field>
      </div>
      <div className="hf-divlbl">Dimensi & Odometer</div>
      <div className="hf-formgrid">
        <Field label="Berat Kosong Saat Ini" required error={errs.tare}>
          <Input className="tnum" affix="kg" value={f.tare} onChange={e => set('tare', e.target.value)} placeholder="4.200" error={errs.tare} />
        </Field>
        <Field label="Odometer Saat Ini" required error={errs.odo}>
          <Input className="tnum" affix="km" value={f.odo} onChange={e => set('odo', e.target.value)} placeholder="125.400" error={errs.odo} />
        </Field>
      </div>
      <div className="hf-divlbl">Masa Berlaku</div>
      <div className="hf-formgrid">
        <Field label="Masa Berlaku STNK" help="dd/MM/yyyy">
          <Input affix={<Icon name="calendar" size={16} />} value={f.stnk} onChange={e => set('stnk', e.target.value)} placeholder="15/03/2028" />
        </Field>
        <Field label="Masa Berlaku Pajak STNK" help="dd/MM/yyyy">
          <Input affix={<Icon name="calendar" size={16} />} value={f.tax} onChange={e => set('tax', e.target.value)} placeholder="15/03/2027" />
        </Field>
      </div>
      <Field label="Catatan">
        <Textarea value={f.note} onChange={e => set('note', e.target.value)} placeholder="Catatan tambahan (opsional)" />
      </Field>
    </Dialog>
  );
}

/* ----------------------------------------------- KENDARAAN LIST ---- */
function VehiclesScreen({ onNav }) {
  const toast = useToast();
  const { fmt } = window.SWAT;
  const [list, setList] = useState(window.SWAT.VEHICLES);
  const [q, setQ] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [view, setView] = useState('loading'); // loading | ready | error | empty
  const [form, setForm] = useState(null);       // {initial} or {} for new
  const [del, setDel] = useState(null);
  const [page, setPage] = useState(1);

  useEffect(() => { const t = setTimeout(() => setView('ready'), 650); return () => clearTimeout(t); }, []);

  const filtered = list.filter(v =>
    (!q || (v.plate + ' ' + v.model).toLowerCase().includes(q.toLowerCase())) &&
    (!statusFilter || v.status === statusFilter));

  const save = (data, isEdit) => {
    if (isEdit) {
      setList(l => l.map(v => v.id === form.initial.id ? { ...v, ...data, year: +data.year, tare: +String(data.tare).replace(/\./g, ''), odo: +String(data.odo).replace(/\./g, '') } : v));
      toast({ variant: 'success', title: 'Berhasil', msg: 'Kendaraan ' + data.plate + ' diperbarui.' });
    } else {
      const id = Math.max(...list.map(v => v.id)) + 1;
      setList(l => [{ id, ...data, year: +data.year, tare: +String(data.tare).replace(/\./g, '') || 0, odo: +String(data.odo).replace(/\./g, '') || 0, status: 'GOOD' }, ...l]);
      toast({ variant: 'success', title: 'Berhasil ditambahkan', msg: 'Kendaraan ' + data.plate + ' dibuat.' });
    }
    setForm(null);
  };
  const remove = () => {
    setList(l => l.filter(v => v.id !== del.id));
    toast({ variant: 'success', title: 'Dihapus', msg: 'Kendaraan ' + del.plate + ' dihapus.' });
    setDel(null);
  };

  const statusItems = [['', 'Semua status'], ['GOOD', 'Baik'], ['MINOR', 'Rusak Ringan'], ['MAJOR', 'Rusak Berat'], ['LOST', 'Hilang']];

  return (
    <div className="hf-page hf-enter">
      <Crumbs items={[{ label: 'Master Data' }, { label: 'Kendaraan' }]} />
      <PageHead title="Kendaraan" sub="Daftar armada pengangkut sampah."
        actions={<Button variant="primary" icon="plus" onClick={() => setForm({})}>Buat Baru</Button>} />

      <div className="hf-toolbar">
        <SearchInput value={q} onChange={v => { setQ(v); setPage(1); }} placeholder="Cari nomor polisi / merek…" />
        <Menu align="left" trigger={<Button variant="outline" size="sm" icon="filter" iconRight="chevDown">{statusItems.find(s => s[0] === statusFilter)[1]}</Button>}
          items={statusItems.map(s => ({ label: s[1], onClick: () => { setStatusFilter(s[0]); setPage(1); } }))} />
        <Button variant="outline" size="sm" icon="columns" iconRight="chevDown">Kolom</Button>
        <div className="grow" />
        <Menu trigger={<Button variant="ghost" size="sm" iconRight="chevDown">Pratinjau status</Button>}
          items={[
            { label: 'Data tersedia', icon: 'check', onClick: () => setView('ready') },
            { label: 'Memuat (skeleton)', icon: 'refresh', onClick: () => { setView('loading'); setTimeout(() => setView('ready'), 1200); } },
            { label: 'Kosong', icon: 'inbox', onClick: () => setView('empty') },
            { label: 'Galat', icon: 'alertTri', onClick: () => setView('error') },
          ]} />
        <span className="hf-muted">{fmt.int(list.length)} kendaraan</span>
      </div>

      <div className="hf-tablecard">
        <table className="table">
          <thead><tr>
            <th className="sortable">Nopol <span className="sort-ico">↑</span></th>
            <th className="sortable">Merek / Model</th>
            <th>Aplikasi</th>
            <th className="num">Odometer</th>
            <th>Status</th>
            <th style={{ width: 60, textAlign: 'right' }}>Aksi</th>
          </tr></thead>
          {view === 'loading' ? <SkeletonRows rows={8} cols={6} />
            : view === 'ready' && filtered.length > 0 ? (
              <tbody>
                {filtered.slice((page - 1) * 25, page * 25).map(v => (
                  <tr key={v.id}>
                    <td className="mono" style={{ fontWeight: 600, color: 'var(--neutral-900)' }}>{v.plate}</td>
                    <td>{v.model}</td>
                    <td>{v.app}</td>
                    <td className="num">{fmt.int(v.odo)}</td>
                    <td><Badge status={v.status} /></td>
                    <td>
                      <div className="hf-rowactions">
                        <Menu trigger={<button className="hf-iconbtn" aria-label="Aksi"><Icon name="more" size={18} /></button>}
                          items={[
                            { label: 'Lihat detail', icon: 'eye', onClick: () => toast({ variant: 'info', title: 'Detail', msg: v.plate }) },
                            { label: 'Ubah', icon: 'edit', onClick: () => setForm({ initial: v }) },
                            { sep: true },
                            { label: 'Hapus', icon: 'trash', danger: true, onClick: () => setDel(v) },
                          ]} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            ) : <tbody><tr><td colSpan={6} style={{ padding: 0, border: 0 }}>
              {view === 'error' ? <EmptyState art="server-error" title="Gagal memuat data" msg="Periksa koneksi Anda lalu coba lagi."
                action={<Button variant="secondary" size="sm" icon="refresh" onClick={() => { setView('loading'); setTimeout(() => setView('ready'), 800); }}>Coba Lagi</Button>} />
                : view === 'empty' ? <EmptyState art="empty" title="Belum ada data" msg="Tambahkan kendaraan pertama untuk memulai."
                  action={<Button variant="primary" size="sm" icon="plus" onClick={() => setForm({})}>Buat Baru</Button>} />
                  : <EmptyState art="no-results" title="Tidak ada hasil pencarian" msg={'Tidak ada kendaraan yang cocok dengan "' + q + '".'} />}
            </td></tr></tbody>}
        </table>
        {view === 'ready' && filtered.length > 0 &&
          <TableFooter total={filtered.length} page={page} perPage={25}
            onPrev={() => setPage(p => p - 1)} onNext={() => setPage(p => p + 1)} />}
      </div>

      {form && <VehicleForm initial={form.initial} onClose={() => setForm(null)} onSave={save} />}
      {del && <Confirm title="Hapus kendaraan?"
        body={<>Yakin ingin menghapus <b className="mono">{del.plate}</b>? Tindakan ini tidak dapat dibatalkan.</>}
        onCancel={() => setDel(null)} onConfirm={remove} />}
    </div>
  );
}

Object.assign(window, { DashboardScreen, VehiclesScreen, VehicleForm });
