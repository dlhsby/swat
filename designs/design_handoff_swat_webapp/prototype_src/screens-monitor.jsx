/* =====================================================================
   SWAT hi-fi — Monitoring (Phase 2 dashboards, read-only)
   Volume per Hari · Konsumsi BBM · Laporan
   ===================================================================== */

/* small KPI metric (mirrors dashboard) */
function Metric({ icon, lbl, val, u, delta, dir }) {
  return (
    <div className="hf-metric">
      <div className="top"><span className="ic"><Icon name={icon} size={19} /></span><span className="lbl">{lbl}</span></div>
      <div className="val">{val}{u && <span className="u">{u}</span>}</div>
      {delta && <div className={'delta ' + dir}><Icon name="arrowRight" size={13} style={{ transform: dir === 'up' ? 'rotate(-45deg)' : 'rotate(45deg)' }} />{delta}</div>}
    </div>
  );
}

function RangeBar({ note }) {
  return (
    <div className="hf-toolbar">
      <Button variant="outline" size="sm" icon="calendar" iconRight="chevDown">7 hari terakhir</Button>
      <Button variant="outline" size="sm" icon="filter" iconRight="chevDown">Sumber sampah</Button>
      <div className="grow" />
      {note && <span className="hf-muted">{note}</span>}
      <Button variant="outline" size="sm" icon="download">Ekspor</Button>
    </div>
  );
}

/* ----------------------------------------------- VOLUME PER HARI ---- */
function MonVolScreen() {
  const { fmt, TONNAGE_DAYS, TONNAGE_BY_SOURCE, TONNAGE_BY_SITE } = window.SWAT;
  const keys = [
    { label: 'Dinas', color: SRC_COLORS[0] }, { label: 'Pasar', color: SRC_COLORS[1] },
    { label: 'Swasta', color: SRC_COLORS[2] }, { label: 'Rekanan', color: SRC_COLORS[3] },
  ];
  const cols = TONNAGE_DAYS.map(d => ({ label: d.day, parts: [d.dinas, d.pasar, d.swasta, d.rekanan] }));
  const slices = TONNAGE_BY_SOURCE.map((s, i) => ({ label: s.src, value: s.ton, color: SRC_COLORS[i] }));
  const totSrc = TONNAGE_BY_SOURCE.reduce((a, s) => a + s.ton, 0);
  return (
    <div className="hf-page hf-enter">
      <Crumbs items={[{ label: 'Monitoring' }, { label: 'Volume per Hari' }]} />
      <PageHead title="Volume per Hari" sub="Tonase sampah terangkut — ringkasan operasi & tren." />
      <RangeBar note="Diperbarui 5 Jun 2026 · 14:32 WIB" />
      <div className="hf-grid4" style={{ marginBottom: 18 }}>
        <Metric icon="scale" lbl="Tonase 7 hari" val={fmt.dec(845.0, 0)} u="ton" delta="6% vs minggu lalu" dir="up" />
        <Metric icon="trendUp" lbl="Bulan ini" val="2.184" u="ton" delta="4% vs Mei" dir="up" />
        <Metric icon="transactions" lbl="Haul selesai" val="178" u="haul" delta="3 vs kemarin" dir="up" />
        <Metric icon="truck" lbl="Rata-rata / haul" val="4,7" u="ton" />
      </div>
      <div className="hf-grid2" style={{ gridTemplateColumns: '1.6fr 1fr', marginBottom: 18 }}>
        <ChartCard title="Tonase per hari" sub="Disusun per sumber sampah · 7 hari terakhir">
          <StackedColumns data={cols} keys={keys} unit="ton" />
        </ChartCard>
        <ChartCard title="Komposisi sumber" sub="Pangsa tonase bulan ini">
          <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
            <Donut slices={slices} centerLabel={fmt.dec(totSrc / 1000, 1) + 'k'} centerSub="ton" />
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
              {TONNAGE_BY_SOURCE.map((s, i) => (
                <div key={s.code} className="hf-srcrow">
                  <span className="dotc" style={{ background: SRC_COLORS[i] }} />
                  <span className="nm">{s.src}</span>
                  <span className="mono pc">{s.pct}%</span>
                  <span className="mono tn">{fmt.int(s.ton)} t</span>
                </div>
              ))}
            </div>
          </div>
        </ChartCard>
      </div>
      <div className="hf-tablecard">
        <div className="hf-tablehead"><b>Tonase per TPS</b><span className="hf-muted">Kontributor teratas · 7 hari</span></div>
        <table className="table">
          <thead><tr><th style={{ width: 44 }}>#</th><th>Lokasi (TPS)</th><th>Jenis</th><th className="num">Tonase (ton)</th><th className="num">Haul</th><th className="num">Rata-rata</th></tr></thead>
          <tbody>
            {TONNAGE_BY_SITE.map((s, i) => (
              <tr key={s.site}>
                <td className="mono hf-muted">{i + 1}</td>
                <td style={{ fontWeight: 600, color: 'var(--neutral-900)' }}>{s.site}</td>
                <td><Badge cls="badge-blue" label={s.type} /></td>
                <td className="num">{fmt.dec(s.ton, 1)}</td>
                <td className="num">{s.hauls}</td>
                <td className="num">{fmt.dec(s.ton / s.hauls, 1)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="alert alert-info" style={{ marginTop: 16 }}>
        <Icon name="info" size={18} style={{ color: 'var(--info-600)', flexShrink: 0 }} />
        <div><div className="alert-title">Sumber data</div>Agregasi dari trayek <b>Pembuangan</b> berstatus Selesai/Terverifikasi, direkonsiliasi dengan log timbangan TPA tiap malam. Selisih &gt; 5% ditandai anomali.</div>
      </div>
    </div>
  );
}

/* ----------------------------------------------- KONSUMSI BBM ------ */
function MonFuelScreen() {
  const { fmt, FUEL_BY_VEHICLE } = window.SWAT;
  const totReq = FUEL_BY_VEHICLE.reduce((a, v) => a + v.req, 0);
  const totAppr = FUEL_BY_VEHICLE.reduce((a, v) => a + v.appr, 0);
  const bars = FUEL_BY_VEHICLE.map(v => ({ label: v.plate.replace('L ', ''), a: v.req, b: v.appr, flag: v.vpct < -5 }));
  return (
    <div className="hf-page hf-enter">
      <Crumbs items={[{ label: 'Monitoring' }, { label: 'Konsumsi BBM' }]} />
      <PageHead title="Konsumsi Bahan Bakar" sub="BBM diminta vs disetujui per kendaraan — bulan ini." />
      <RangeBar note="Juni 2026" />
      <div className="hf-grid4" style={{ marginBottom: 18 }}>
        <Metric icon="fuel" lbl="BBM disetujui" val={fmt.int(totAppr)} u="L" />
        <Metric icon="fuel" lbl="BBM diminta" val={fmt.int(totReq)} u="L" />
        <Metric icon="activity" lbl="Rasio setuju" val={(totAppr / totReq * 100).toFixed(0)} u="%" delta="2% vs Mei" dir="down" />
        <Metric icon="truck" lbl="Rata-rata / haul" val="48,2" u="L" />
      </div>
      <ChartCard title="Konsumsi per kendaraan" sub="Diminta vs disetujui (L) · merah = varian melebihi 5%" className="hf-section-gap">
        <GroupedColumns data={bars} unit="L" />
      </ChartCard>
      <div className="hf-tablecard" style={{ marginTop: 18 }}>
        <div className="hf-tablehead"><b>Detail per kendaraan</b><span className="hf-muted">{FUEL_BY_VEHICLE.length} kendaraan</span></div>
        <table className="table">
          <thead><tr><th>Kendaraan</th><th>Model</th><th>Jenis BBM</th><th className="num">Diminta (L)</th><th className="num">Disetujui (L)</th><th className="num">Varian</th><th>Status</th></tr></thead>
          <tbody>
            {FUEL_BY_VEHICLE.map(v => (
              <tr key={v.plate}>
                <td className="mono" style={{ fontWeight: 600, color: 'var(--neutral-900)' }}>{v.plate}</td>
                <td>{v.model}</td>
                <td>{v.fuel}</td>
                <td className="num">{fmt.int(v.req)}</td>
                <td className="num">{fmt.int(v.appr)}</td>
                <td className="num" style={{ color: v.vpct < 0 ? 'var(--danger-600)' : 'var(--neutral-500)', fontWeight: v.vpct < -5 ? 700 : 500 }}>{v.vpct > 0 ? '+' : ''}{v.vpct}%</td>
                <td><Badge cls={v.vpct < -5 ? 'badge-red' : v.vpct < 0 ? 'badge-amber' : 'badge-green'} label={v.vpct < -5 ? 'Anomali' : v.vpct < 0 ? 'Di bawah' : 'Sesuai'} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ----------------------------------------------- LAPORAN ----------- */
function ReportsScreen() {
  const toast = useToast();
  const { REPORTS, REPORT_HISTORY } = window.SWAT;
  const [gen, setGen] = useState(null);
  return (
    <div className="hf-page hf-enter">
      <Crumbs items={[{ label: 'Monitoring' }, { label: 'Laporan' }]} />
      <PageHead title="Laporan" sub="Hasilkan laporan Excel / PDF untuk tinjauan & arsip." />
      <div className="hf-reportgrid">
        {REPORTS.map(r => (
          <div className="hf-reportcard" key={r.id}>
            <div className="ic"><Icon name={r.icon} size={20} /></div>
            <div className="bd">
              <b>{r.name}</b>
              <p>{r.desc}</p>
              <div className="meta"><span className="hf-muted">{r.period}</span>
                <span className="fmts">{r.formats.map(f => <span key={f} className="fpill">{f}</span>)}</span></div>
            </div>
            <Button variant="outline" size="sm" icon="download" onClick={() => setGen(r)}>Hasilkan</Button>
          </div>
        ))}
      </div>
      <div className="hf-tablecard" style={{ marginTop: 22 }}>
        <div className="hf-tablehead"><b>Riwayat Laporan</b><span className="hf-muted">Unduhan terbaru</span></div>
        <table className="table">
          <thead><tr><th>Laporan</th><th>Format</th><th className="num">Ukuran</th><th>Dibuat oleh</th><th>Waktu</th><th>Status</th><th style={{ width: 60, textAlign: 'right' }}>Aksi</th></tr></thead>
          <tbody>
            {REPORT_HISTORY.map(h => (
              <tr key={h.id}>
                <td style={{ fontWeight: 600, color: 'var(--neutral-900)' }}>{h.name}</td>
                <td><Badge cls={h.fmt === 'PDF' ? 'badge-red' : 'badge-green'} label={h.fmt} /></td>
                <td className="num mono">{h.size}</td>
                <td>{h.by}</td>
                <td className="mono">{h.at}</td>
                <td><Badge status={h.st} /></td>
                <td style={{ textAlign: 'right' }}>
                  {h.st === 'DONE'
                    ? <button className="hf-iconbtn" aria-label="Unduh" onClick={() => toast({ variant: 'success', title: 'Mengunduh', msg: h.name })}><Icon name="download" size={17} /></button>
                    : <span className="spinner" style={{ display: 'inline-block' }} />}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {gen && (
        <Dialog title={'Hasilkan: ' + gen.name} onClose={() => setGen(null)} width={500}
          footer={<><Button variant="secondary" onClick={() => setGen(null)}>Batal</Button>
            <Button variant="primary" icon="download" onClick={() => { setGen(null); toast({ variant: 'info', title: 'Laporan diproses', msg: 'Anda akan diberi tahu saat siap diunduh.' }); }}>Hasilkan</Button></>}>
          <p className="hf-muted" style={{ margin: '0 0 16px', fontSize: 13 }}>{gen.desc}</p>
          <div className="hf-formgrid">
            <Field label="Periode dari" required><Input defaultValue="01/06/2026" affix={<Icon name="calendar" size={16} />} /></Field>
            <Field label="Periode sampai" required><Input defaultValue="30/06/2026" affix={<Icon name="calendar" size={16} />} /></Field>
          </div>
          <Field label="Format keluaran">
            <div style={{ display: 'flex', gap: 18, paddingTop: 4 }}>
              {gen.formats.map((f, i) => (
                <label key={f} className="check" style={{ gap: 8 }}>
                  <input type="radio" name="rfmt" defaultChecked={i === 0} style={{ accentColor: 'var(--primary-700)' }} /> {f}
                </label>
              ))}
            </div>
          </Field>
          <div className="alert alert-info" style={{ marginTop: 4 }}>
            <Icon name="info" size={18} style={{ color: 'var(--info-600)', flexShrink: 0 }} />
            <div>Laporan untuk rentang luas diproses asinkron — Anda dapat menutup dialog ini.</div>
          </div>
        </Dialog>
      )}
    </div>
  );
}

Object.assign(window, { Metric, MonVolScreen, MonFuelScreen, ReportsScreen });
