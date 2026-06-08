/* =====================================================================
   SWAT hi-fi — lightweight, token-styled chart primitives (no deps)
   CSS/flex bars + an inline-SVG area trend + donut. Dark-mode safe.
   ===================================================================== */

/* shared source palette (emerald shades + one neutral) */
const SRC_COLORS = ['var(--primary-700)', 'var(--primary-500)', 'var(--primary-300)', 'var(--neutral-300)'];

function ChartCard({ title, sub, right, children, foot, className = '' }) {
  return (
    <div className={'card hf-chartcard ' + className}>
      <div className="hf-cardhead" style={{ alignItems: 'flex-start' }}>
        <div><b style={{ fontSize: 15 }}>{title}</b>{sub && <div className="hf-muted" style={{ marginTop: 3 }}>{sub}</div>}</div>
        {right}
      </div>
      {children}
      {foot}
    </div>
  );
}

function Legend({ items }) {
  return (
    <div className="hf-legend">
      {items.map((it, i) => (
        <span key={i} className="hf-legend-i"><i style={{ background: it.color }} />{it.label}</span>
      ))}
    </div>
  );
}

/* Stacked vertical columns. data:[{label, parts:[v0,v1,...]}], keys:[{label,color}] */
function StackedColumns({ data, keys, unit = 'ton', height = 210 }) {
  const totals = data.map(d => d.parts.reduce((a, b) => a + b, 0));
  const max = Math.max(...totals) * 1.12;
  return (
    <div>
      <div className="hf-cols" style={{ height }}>
        {data.map((d, i) => {
          const total = totals[i];
          return (
            <div className="hf-col" key={i}>
              <div className="hf-col-track">
                <div className="hf-col-fill" style={{ height: (total / max * 100) + '%' }} title={total.toFixed(1) + ' ' + unit}>
                  <span className="hf-col-val">{total.toFixed(0)}</span>
                  {d.parts.map((v, j) => (
                    <span key={j} className="hf-col-seg" style={{ height: (v / total * 100) + '%', background: keys[j].color }} />
                  ))}
                </div>
              </div>
              <span className="hf-col-lbl">{d.label}</span>
            </div>
          );
        })}
      </div>
      <Legend items={keys} />
    </div>
  );
}

/* Grouped two-bar columns (requested vs approved). data:[{label, a, b, flag}] */
function GroupedColumns({ data, max, height = 200, unit = 'L', legend }) {
  const top = max || Math.max(...data.map(d => Math.max(d.a, d.b))) * 1.14;
  return (
    <div>
      <div className="hf-cols" style={{ height }}>
        {data.map((d, i) => (
          <div className="hf-col" key={i}>
            <div className="hf-col-track">
              <div className="hf-col-group">
                <span className="hf-bar req" style={{ height: (d.a / top * 100) + '%' }} title={'Diminta ' + d.a + ' ' + unit} />
                <span className={'hf-bar appr' + (d.flag ? ' flag' : '')} style={{ height: (d.b / top * 100) + '%' }} title={'Disetujui ' + d.b + ' ' + unit} />
              </div>
            </div>
            <span className="hf-col-lbl mono">{d.label}</span>
          </div>
        ))}
      </div>
      {legend !== false && <Legend items={[{ label: 'Diminta', color: 'var(--neutral-300)' }, { label: 'Disetujui', color: 'var(--primary-600)' }, { label: 'Varian > 5%', color: 'var(--danger-500)' }]} />}
    </div>
  );
}

/* Inline-SVG area trend. data:[{label, value}] */
function AreaTrend({ data, unit = 'ton', height = 200, color = 'var(--primary-600)' }) {
  const W = 640, H = height, pad = 28;
  const max = Math.max(...data.map(d => d.value)) * 1.12;
  const min = Math.min(...data.map(d => d.value)) * 0.85;
  const x = i => pad + i * (W - pad * 2) / (data.length - 1);
  const y = v => H - pad - (v - min) / (max - min) * (H - pad * 2);
  const pts = data.map((d, i) => [x(i), y(d.value)]);
  const line = pts.map((p, i) => (i ? 'L' : 'M') + p[0] + ' ' + p[1]).join(' ');
  const area = line + ` L${x(data.length - 1)} ${H - pad} L${x(0)} ${H - pad} Z`;
  return (
    <div className="hf-trend">
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ width: '100%', height }}>
        <defs>
          <linearGradient id="hfgrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.20" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0.25, 0.5, 0.75].map(t => <line key={t} x1={pad} x2={W - pad} y1={pad + t * (H - pad * 2)} y2={pad + t * (H - pad * 2)} stroke="var(--neutral-200)" strokeWidth="1" />)}
        <path d={area} fill="url(#hfgrad)" />
        <path d={line} fill="none" stroke={color} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
        {pts.map((p, i) => <circle key={i} cx={p[0]} cy={p[1]} r="3.5" fill="var(--neutral-0)" stroke={color} strokeWidth="2.5" />)}
      </svg>
      <div className="hf-trend-x">{data.map((d, i) => <span key={i}>{d.label}</span>)}</div>
    </div>
  );
}

/* Donut share chart. slices:[{label, value, color}] */
function Donut({ slices, size = 168, thickness = 26, centerLabel, centerSub }) {
  const total = slices.reduce((a, s) => a + s.value, 0);
  const r = (size - thickness) / 2, C = 2 * Math.PI * r;
  let off = 0;
  return (
    <div className="hf-donut">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <g transform={`rotate(-90 ${size / 2} ${size / 2})`}>
          {slices.map((s, i) => {
            const frac = s.value / total, dash = frac * C;
            const seg = <circle key={i} cx={size / 2} cy={size / 2} r={r} fill="none" stroke={s.color}
              strokeWidth={thickness} strokeDasharray={`${dash} ${C - dash}`} strokeDashoffset={-off} />;
            off += dash; return seg;
          })}
        </g>
        {centerLabel && <text x="50%" y="47%" textAnchor="middle" dominantBaseline="middle" style={{ fontSize: 26, fontWeight: 700, fill: 'var(--neutral-900)', fontFamily: 'var(--font-sans)' }}>{centerLabel}</text>}
        {centerSub && <text x="50%" y="60%" textAnchor="middle" style={{ fontSize: 11, fill: 'var(--neutral-500)', fontFamily: 'var(--font-sans)' }}>{centerSub}</text>}
      </svg>
    </div>
  );
}

Object.assign(window, { SRC_COLORS, ChartCard, Legend, StackedColumns, GroupedColumns, AreaTrend, Donut });
