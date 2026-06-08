/* =====================================================================
   SWAT hi-fi — Transaksi: Hari Transaksi · Haul Board · Pickup/Disposal/
   Refuel · Verifikasi · Rekalibrasi
   ===================================================================== */

/* right-side sheet */
function Sheet({ title, sub, onClose, children, footer }) {
  useEffect(() => {
    const h = e => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h);
  }, [onClose]);
  return (
    <Portal>
    <div className="hf-overlay" style={{ justifyContent: 'flex-end', padding: 0 }} onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="hf-dialog" role="dialog" aria-modal="true" style={{
        width: 'min(520px,94vw)', height: '100vh', maxHeight: '100vh', borderRadius: 0,
        background: 'var(--neutral-0)', animation: 'hf-sheetin .2s cubic-bezier(.16,1,.3,1)'
      }} onMouseDown={e => e.stopPropagation()}>
        <div className="hf-dialog-head" style={{ padding: '20px 24px 12px', borderBottom: '1px solid var(--neutral-100)' }}>
          <div><h3>{title}</h3>{sub && <p className="hf-muted" style={{ margin: '4px 0 0' }}>{sub}</p>}</div>
          <button className="hf-iconbtn" aria-label="Tutup" onClick={onClose}><Icon name="x" size={18} /></button>
        </div>
        <div className="hf-dialog-body" style={{ padding: 20 }}>{children}</div>
        {footer && <div className="dialog-foot" style={{ padding: '16px 24px 20px' }}>{footer}</div>}
      </div>
    </div>
    </Portal>
  );
}

function Stepper({ steps, active }) {
  return (
    <div className="hf-stepper">
      {steps.map((s, i) => (
        <React.Fragment key={i}>
          <div className={'step ' + (i < active ? 'done' : i === active ? 'active' : 'upcoming')}>
            <span className="dot">{i < active ? <Icon name="check" size={15} /> : i + 1}</span>
            <span className="stitle">{s}</span>
          </div>
          {i < steps.length - 1 && <div className={'step-line' + (i < active ? ' done' : '')} />}
        </React.Fragment>
      ))}
    </div>
  );
}

/* ----------------------------------------------- HARI TRANSAKSI ---- */
function DaysScreen({ onNav }) {
  const toast = useToast();
  const { fmt, DAYS } = window.SWAT;
  const [list] = useState(DAYS);
  const [init, setInit] = useState(false);
  return (
    <div className="hf-page hf-enter">
      <Crumbs items={[{ label: 'Transaksi' }, { label: 'Hari Transaksi' }]} />
      <PageHead title="Hari Transaksi" sub="Setiap tanggal operasional mengelompokkan seluruh haul."
        actions={<Button variant="primary" icon="plus" onClick={() => setInit(true)}>Inisiasi Hari</Button>} />
      <div className="alert alert-info" style={{ marginBottom: 16 }}>
        <Icon name="info" size={18} style={{ color: 'var(--info-600)', flexShrink: 0 }} />
        <div><div className="alert-title">Inisiasi Hari</div>Membuat Hari Transaksi untuk tanggal terpilih & menebar Haul + penugasan dari Jadwal Kru aktif. Idempoten — tanggal yang sama mengambil data yang ada.</div>
      </div>
      <div className="hf-toolbar">
        <SearchInput value="" onChange={() => { }} placeholder="Cari tanggal…" />
        <Button variant="outline" size="sm" icon="filter" iconRight="chevDown">Status</Button>
        <div className="grow" />
        <span className="hf-muted">{fmt.int(85)} hari</span>
      </div>
      <div className="hf-tablecard">
        <table className="table">
          <thead><tr>
            <th className="sortable">Tanggal <span className="sort-ico">↓</span></th>
            <th>Status</th><th className="num">Kendaraan</th><th className="num">Tonase (ton)</th>
            <th style={{ width: 140, textAlign: 'right' }}>Aksi</th>
          </tr></thead>
          <tbody>
            {list.map(d => (
              <tr key={d.id}>
                <td className="mono" style={{ fontWeight: 600, color: 'var(--neutral-900)' }}>{d.date}</td>
                <td><Badge status={d.status} /></td>
                <td className="num">{d.vehicles}</td>
                <td className="num">{fmt.dec(d.tonnage, 1)}</td>
                <td style={{ textAlign: 'right' }}>
                  <Button variant="ghost" size="sm" iconRight="arrowRight" onClick={() => onNav('board', { day: d.id })}>Lihat Board</Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <TableFooter total={85} page={1} perPage={25} />
      </div>
      {init && (
        <Dialog title="Inisiasi Hari Transaksi" onClose={() => setInit(false)} width={460}
          footer={<><Button variant="secondary" onClick={() => setInit(false)}>Batal</Button>
            <Button variant="primary" onClick={() => { setInit(false); toast({ variant: 'success', title: 'Hari diinisiasi', msg: 'Haul & penugasan ditebar dari Jadwal Kru aktif.' }); }}>Inisiasi</Button></>}>
          <Field label="Tanggal operasional" required help="dd/MM/yyyy — biasanya hari ini.">
            <Input defaultValue="06/06/2026" affix={<Icon name="calendar" size={16} />} />
          </Field>
          <div className="alert alert-info" style={{ marginTop: 4 }}>
            <Icon name="info" size={18} style={{ color: 'var(--info-600)', flexShrink: 0 }} />
            <div>Menebar Haul untuk seluruh Jadwal Kru aktif. Aman dijalankan ulang.</div>
          </div>
        </Dialog>
      )}
    </div>
  );
}

/* ----------------------------------------------- HAUL BOARD -------- */
function BoardScreen({ params, onNav }) {
  const toast = useToast();
  const day = window.SWAT.DAYS.find(d => d.id === (params && params.day)) || window.SWAT.DAYS[0];
  const [hauls, setHauls] = useState(window.SWAT.HAULS);
  const [sheet, setSheet] = useState(null);   // haul for trip sheet
  const [recon, setRecon] = useState(null);   // haul for reconcile
  const [trip, setTrip] = useState(null);     // {haul, trip, mode}
  const totalVer = hauls.reduce((a, h) => a + h.verified, 0);
  const totalTrips = hauls.reduce((a, h) => a + h.total, 0);

  const verProgress = (h) => {
    if (h.verified === 0) return { cls: 'badge-slate', label: 'Belum mulai' };
    const r = h.verified / h.total;
    return { cls: r > 0.75 ? 'badge-green' : 'badge-amber', label: h.verified + '/' + h.total + ' Terverifikasi' };
  };

  const recordTrip = (data) => {
    toast({ variant: 'success', title: 'Tersimpan', msg: trip.trip.label + ' dicatat.' });
    setHauls(hs => hs.map(h => h.id === trip.haul.id ? {
      ...h, trips: h.trips.map(t => t.id === trip.trip.id ? { ...t, status: 'DONE' } : t)
    } : h));
    setTrip(null);
  };
  const verifyTrip = (approve) => {
    toast({ variant: approve ? 'success' : 'warning', title: approve ? 'Terverifikasi' : 'Ditolak', msg: trip.trip.label });
    setHauls(hs => hs.map(h => h.id === trip.haul.id ? {
      ...h, verified: approve ? h.verified + 1 : h.verified,
      trips: h.trips.map(t => t.id === trip.trip.id ? { ...t, status: approve ? 'VERIFIED' : 'DONE' } : t)
    } : h));
    setTrip(null);
    setSheet(s => s && hauls.find(h => h.id === s.id));
  };

  const curSheet = sheet && hauls.find(h => h.id === sheet.id);

  return (
    <div className="hf-page hf-enter">
      <Crumbs items={[{ label: 'Transaksi', to: 'days' }, { label: 'Hari Transaksi', to: 'days' }, { label: day.date }]} onNav={onNav} />
      <div className="hf-pghead">
        <div>
          <h1 className="hf-h1">Haul · {day.date}</h1>
          <p className="hf-sub" style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 8 }}>
            <Badge status={day.status} /> <span>{day.vehicles} kendaraan aktif · {totalVer}/{totalTrips} trayek terverifikasi</span>
          </p>
        </div>
        <Button variant="outline" icon="check" onClick={() => toast({ variant: 'info', title: 'Hari ditandai selesai', msg: day.date })}>Tandai Hari Selesai</Button>
      </div>
      <div className="hf-haulhead">
        <span>Kendaraan</span><span>Verifikasi</span><span>Berangkat (T/A)</span><span>Kembali (T/A)</span><span>Ritase</span><span />
      </div>
      {hauls.map(h => {
        const vp = verProgress(h);
        return (
          <div className="hf-haulrow" key={h.id}>
            <div><div className="plate">{h.plate}</div><div className="drv">{h.driver}</div></div>
            <div><Badge cls={vp.cls} label={vp.label} /></div>
            <div className="hf-tt">Berangkat<b>{h.departT} / {h.departA}</b></div>
            <div className="hf-tt">Kembali<b>{h.retT} / {h.retA}</b></div>
            <div className="hf-tt">Ritase<b>{h.ritase}</b></div>
            <div style={{ display: 'flex', gap: 6 }}>
              <Button variant="outline" size="sm" icon="edit" onClick={() => setRecon(h)}>Edit</Button>
              <Button variant="ghost" size="sm" iconRight="chevRight" onClick={() => setSheet(h)}>Lihat</Button>
            </div>
          </div>
        );
      })}

      {/* Trip list sheet */}
      {curSheet && (
        <Sheet title={curSheet.plate} sub={curSheet.driver + ' · ' + curSheet.model} onClose={() => setSheet(null)}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {curSheet.trips.map(t => {
              const kind = t.type.toLowerCase();
              const icon = t.type === 'PICKUP' ? 'inbox' : t.type === 'DISPOSAL' ? 'scale' : 'fuel';
              const canRecord = t.status === 'IN_PROGRESS';
              const canVerify = t.status === 'DONE';
              return (
                <div className="hf-trip" key={t.id}>
                  <div className={'ticon ' + kind}><Icon name={icon} size={18} /></div>
                  <div className="tinfo"><b>{t.label}</b><span>Target {t.target}</span></div>
                  <Badge status={t.status} />
                  {canRecord && <Button variant="primary" size="sm" onClick={() => setTrip({ haul: curSheet, trip: t, mode: 'record' })}>Catat</Button>}
                  {canVerify && <Button variant="outline" size="sm" icon="check" onClick={() => setTrip({ haul: curSheet, trip: t, mode: 'verify' })}>Verifikasi</Button>}
                </div>
              );
            })}
          </div>
          <Button variant="outline" size="sm" icon="plus" style={{ marginTop: 8 }}>Tambah Trayek</Button>
        </Sheet>
      )}

      {recon && <ReconcileForm haul={recon} onClose={() => setRecon(null)}
        onSave={() => { toast({ variant: 'success', title: 'Tersimpan', msg: 'Rekalibrasi ' + recon.plate }); setRecon(null); }} />}

      {trip && trip.mode === 'record' && trip.trip.type === 'PICKUP' && <PickupForm trip={trip.trip} haul={trip.haul} onClose={() => setTrip(null)} onSave={recordTrip} />}
      {trip && trip.mode === 'record' && trip.trip.type === 'DISPOSAL' && <DisposalForm trip={trip.trip} haul={trip.haul} onClose={() => setTrip(null)} onSave={recordTrip} />}
      {trip && trip.mode === 'record' && trip.trip.type === 'REFUEL' && <RefuelForm trip={trip.trip} haul={trip.haul} onClose={() => setTrip(null)} onSave={recordTrip} />}
      {trip && trip.mode === 'verify' && <VerifyForm trip={trip.trip} haul={trip.haul} onClose={() => setTrip(null)} onVerify={verifyTrip} />}
    </div>
  );
}

/* ----------------------------------------------- PICKUP ------------ */
function PickupForm({ trip, haul, onClose, onSave }) {
  const [f, setF] = useState({ time: '07:32', odo: '125.490', source: '', vol: '', note: '' });
  const [touched, setTouched] = useState(false);
  const set = (k, v) => setF(s => ({ ...s, [k]: v }));
  const valid = f.time && f.odo && f.source;
  return (
    <Dialog title="Catat Pengambilan Sampah" onClose={onClose} width={580}
      footer={<><Button variant="secondary" onClick={onClose}>Batal</Button><Button variant="primary" onClick={() => { setTouched(true); if (valid) onSave(f); }}>Simpan</Button></>}>
      <div className="hf-ctxline"><b>{haul.plate}</b> <span className="hf-muted">· {haul.model} · {haul.driver}</span></div>
      <Stepper steps={['Pilih Trayek', 'Catat Aktual', 'Konfirmasi']} active={1} />
      <div className="card" style={{ padding: '13px 15px', marginBottom: 16, borderColor: 'var(--primary-200)', background: 'var(--primary-50)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div><b style={{ fontSize: 13 }}>{trip.label}</b><div className="hf-muted" style={{ fontSize: 12 }}>Target {trip.target}</div></div>
          <Badge cls="badge-green" label="Dipilih" />
        </div>
      </div>
      <div className="hf-formgrid">
        <Field label="Waktu Aktual" required help="Tombol cepat: Sekarang">
          <Input className="mono" value={f.time} onChange={e => set('time', e.target.value)} affix={<Icon name="clock" size={16} />} />
        </Field>
        <Field label="Odometer Aktual" required help="≥ odometer berangkat">
          <Input className="tnum" affix="km" value={f.odo} onChange={e => set('odo', e.target.value)} />
        </Field>
        <Field label="Sumber Sampah" required error={touched && !f.source ? 'Wajib dipilih.' : ''}>
          <Select value={f.source} onChange={e => set('source', e.target.value)}>
            <option value="">Pilih sumber…</option>{['Dinas', 'Pasar', 'Swasta', 'Permukiman'].map(s => <option key={s}>{s}</option>)}
          </Select>
        </Field>
        <Field label="Volume (opsional)"><Input className="tnum" affix="m³" value={f.vol} onChange={e => set('vol', e.target.value)} placeholder="—" /></Field>
      </div>
      <Field label="Catatan"><Textarea value={f.note} onChange={e => set('note', e.target.value)} placeholder="Catatan (opsional)" /></Field>
    </Dialog>
  );
}

/* ----------------------------------------------- DISPOSAL ---------- */
function DisposalForm({ trip, haul, onClose, onSave }) {
  const [f, setF] = useState({ tare: '5.200', gross: '10.850', vol: '5,2', time: '08:50', odo: '125.620', note: '' });
  const set = (k, v) => setF(s => ({ ...s, [k]: v }));
  const n = (s) => +String(s).replace(/\./g, '').replace(/,/g, '.') || 0;
  const net = n(f.gross) - n(f.tare);
  const invalid = net < 0;
  return (
    <Dialog title="Catat Pembuangan Sampah + Timbangan" onClose={onClose} width={600}
      footer={<><Button variant="secondary" onClick={onClose}>Batal</Button><Button variant="primary" disabled={invalid} onClick={() => onSave(f)}>Simpan</Button></>}>
      <div className="hf-ctxline"><b>{haul.plate}</b> <span className="hf-muted">· {trip.label} · Target {trip.target}</span></div>
      <div className="hf-divlbl">Data Timbangan</div>
      <div className="hf-formgrid">
        <Field label="Berat Kosong (Tare)" required help="Prefill dari kendaraan, dapat diubah.">
          <Input className="tnum" affix="kg" value={f.tare} onChange={e => set('tare', e.target.value)} />
        </Field>
        <Field label="Berat Kotor (Gross)" required error={invalid ? 'Harus ≥ berat kosong.' : ''}>
          <Input className="tnum" affix="kg" value={f.gross} onChange={e => set('gross', e.target.value)} error={invalid} />
        </Field>
      </div>
      <div className="hf-net">
        <div><div className="nlabel">Berat Bersih (otomatis: Kotor − Kosong)</div>
          <div className="nval">{window.SWAT.fmt.int(Math.max(0, net))} <span className="u">kg</span></div></div>
        <Badge cls="badge-green" label="Read-only" />
      </div>
      <div className={'alert alert-' + (invalid ? 'danger' : 'warning')} style={{ marginBottom: 16 }}>
        <Icon name="alertTri" size={18} style={{ color: invalid ? 'var(--danger-600)' : 'var(--warning-600)', flexShrink: 0 }} />
        <div><div className="alert-title">Validasi</div>Berat Kotor harus ≥ Berat Kosong. Bila tidak, tombol Simpan dinonaktifkan.</div>
      </div>
      <Field label="Volume Sampah (opsional)"><Input className="tnum" affix="m³" value={f.vol} onChange={e => set('vol', e.target.value)} style={{ maxWidth: 260 }} /></Field>
      <div className="hf-divlbl">Rekalibrasi Perjalanan</div>
      <div className="hf-formgrid">
        <Field label="Waktu Aktual" required><Input className="mono" value={f.time} onChange={e => set('time', e.target.value)} affix={<Icon name="clock" size={16} />} /></Field>
        <Field label="Odometer Aktual" required><Input className="tnum" affix="km" value={f.odo} onChange={e => set('odo', e.target.value)} /></Field>
      </div>
      <Field label="Catatan"><Textarea value={f.note} onChange={e => set('note', e.target.value)} placeholder="Catatan (opsional)" /></Field>
    </Dialog>
  );
}

/* ----------------------------------------------- REFUEL ------------ */
function RefuelForm({ trip, haul, onClose, onSave }) {
  const [f, setF] = useState({ type: 'Solar', req: '50,00', appr: '50,00', time: '06:20', odo: '125.430', note: '' });
  const set = (k, v) => setF(s => ({ ...s, [k]: v }));
  const n = (s) => +String(s).replace(/\./g, '').replace(/,/g, '.') || 0;
  const invalid = n(f.appr) > n(f.req);
  return (
    <Dialog title="Catat Pengisian Bahan Bakar" onClose={onClose} width={580}
      footer={<><Button variant="secondary" onClick={onClose}>Batal</Button><Button variant="primary" disabled={invalid} onClick={() => onSave(f)}>Simpan</Button></>}>
      <div className="hf-ctxline"><b>{haul.plate}</b> <span className="hf-muted">· {trip.label} · Target {trip.target}</span></div>
      <div className="hf-formgrid">
        <Field label="Jenis Bahan Bakar" required help="Difilter sesuai model kendaraan.">
          <Select value={f.type} onChange={e => set('type', e.target.value)}>{['Solar', 'Dexlite', 'Pertamina Dex'].map(t => <option key={t}>{t}</option>)}</Select>
        </Field>
        <Field label="Jumlah Diminta" required><Input className="tnum" affix="L" value={f.req} onChange={e => set('req', e.target.value)} /></Field>
        <Field label="Jumlah Disetujui" help="Default = Diminta. Hanya peran dengan hak persetujuan dapat mengubah.">
          <Input className="tnum" affix="L" value={f.appr} disabled />
        </Field>
        <Field label="Waktu Aktual" required><Input className="mono" value={f.time} onChange={e => set('time', e.target.value)} affix={<Icon name="clock" size={16} />} /></Field>
      </div>
      <Field label="Odometer Aktual" required><Input className="tnum" affix="km" value={f.odo} onChange={e => set('odo', e.target.value)} style={{ maxWidth: 260 }} /></Field>
      <div className={'alert alert-' + (invalid ? 'danger' : 'warning')} style={{ marginBottom: 16 }}>
        <Icon name="alertTri" size={18} style={{ color: invalid ? 'var(--danger-600)' : 'var(--warning-600)', flexShrink: 0 }} />
        <div><div className="alert-title">Validasi</div>Jumlah Disetujui harus ≤ Jumlah Diminta.</div>
      </div>
      <Field label="Catatan"><Textarea value={f.note} onChange={e => set('note', e.target.value)} placeholder="Catatan (opsional)" /></Field>
    </Dialog>
  );
}

/* ----------------------------------------------- VERIFY ------------ */
function VerifyForm({ trip, haul, onClose, onVerify }) {
  const [note, setNote] = useState('');
  const row = (t, d) => <><dt>{t}</dt><dd>{d}</dd></>;
  return (
    <Dialog title="Verifikasi Trayek" onClose={onClose} width={540}
      footer={<><Button variant="secondary" onClick={() => onVerify(false)}>Tolak</Button><Button variant="primary" icon="check" onClick={() => onVerify(true)}>Terverifikasi</Button></>}>
      <div style={{ display: 'flex', gap: 8, marginBottom: 14, alignItems: 'center' }}>
        <Badge status="DONE" label="Pembuangan Sampah" cls="badge-blue" />
        <span className="hf-muted" style={{ fontSize: 12.5 }}>{trip.label}</span>
      </div>
      <dl className="dl">
        {row('Waktu Target → Aktual', <span className="mono">08:45 → 08:50 <span className="pos">(+5 mnt)</span></span>)}
        {row('Odometer Target → Aktual', <span className="mono">125.500 → 125.620 km</span>)}
        {row('Berat Kosong', <span className="tnum">5.200 kg</span>)}
        {row('Berat Kotor', <span className="tnum">10.850 kg</span>)}
        {row('Berat Bersih', <span className="tnum" style={{ color: 'var(--success-700)' }}>5.650 kg</span>)}
        {row('Volume', <span className="tnum">5,2 m³</span>)}
        {row('Dicatat oleh', 'Ali Darmawan · 05/06/2026 08:52')}
      </dl>
      <div className="alert alert-success" style={{ margin: '14px 0' }}>
        <Icon name="checkCirc" size={18} style={{ color: 'var(--success-600)', flexShrink: 0 }} />
        <div><div className="alert-title">Siap diverifikasi</div>Data lengkap dan konsisten.</div>
      </div>
      <Field label="Catatan (untuk penolakan)"><Textarea value={note} onChange={e => setNote(e.target.value)} placeholder="Alasan penolakan (opsional)" /></Field>
    </Dialog>
  );
}

/* ----------------------------------------------- RECONCILE --------- */
function ReconcileForm({ haul, onClose, onSave }) {
  return (
    <Dialog title="Rekalibrasi Berangkat / Kembali" onClose={onClose} width={560}
      footer={<><Button variant="secondary" onClick={onClose}>Batal</Button><Button variant="primary" onClick={onSave}>Simpan</Button></>}>
      <div className="hf-ctxline"><b>{haul.plate}</b> <span className="hf-muted">· {haul.model} · {haul.driver}</span></div>
      <div className="hf-divlbl">Berangkat dari Pool</div>
      <div className="hf-formgrid">
        <Field label={'Waktu (Target ' + haul.departT + ')'} required><Input className="mono" defaultValue={haul.departA !== '—' ? haul.departA : haul.departT} affix={<Icon name="clock" size={16} />} /></Field>
        <Field label="Odometer (Target 125.400)" required><Input className="tnum" affix="km" defaultValue="125.400" /></Field>
      </div>
      <div className="hf-divlbl">Kembali ke Pool</div>
      <div className="hf-formgrid">
        <Field label={'Waktu (Target ' + haul.retT + ')'}><Input className="mono" defaultValue={haul.retA !== '—' ? haul.retA : ''} placeholder="mis. 17:15" affix={<Icon name="clock" size={16} />} /></Field>
        <Field label="Odometer (Target 125.750)"><Input className="tnum" affix="km" defaultValue="125.880" /></Field>
      </div>
      <div className="alert alert-warning">
        <Icon name="alertTri" size={18} style={{ color: 'var(--warning-600)', flexShrink: 0 }} />
        <div><div className="alert-title">Validasi</div>Aktual harus ≥ target (berangkat & kembali). Saat kembali, odometer kendaraan diperbarui.</div>
      </div>
    </Dialog>
  );
}

Object.assign(window, { Sheet, Stepper, DaysScreen, BoardScreen, PickupForm, DisposalForm, RefuelForm, VerifyForm, ReconcileForm });
