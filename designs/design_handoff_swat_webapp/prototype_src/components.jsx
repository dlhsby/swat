/* =====================================================================
   SWAT hi-fi — Icons + shared component primitives (React, Babel)
   Wraps the design-system CSS classes. Exports to window at the end.
   ===================================================================== */
const { useState, useEffect, useRef, useCallback } = React;

/* ---- Icon set (lucide-style 24×24 stroke paths) -------------------- */
const ICONS = {
  dashboard: 'M3 3h7v9H3zM14 3h7v5h-7zM14 12h7v9h-7zM3 16h7v5H3z',
  activity: 'M22 12h-4l-3 9L9 3l-3 9H2',
  database: 'M12 5c4.97 0 9-1.34 9-3M3 5c0 1.66 4.03 3 9 3M3 5v14c0 1.66 4.03 3 9 3s9-1.34 9-3V5M3 12c0 1.66 4.03 3 9 3s9-1.34 9-3',
  calendar: 'M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z',
  transactions: 'M8 3 4 7l4 4M4 7h16M16 21l4-4-4-4M20 17H4',
  users: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75',
  truck: 'M10 17h4V5H2v12h3M20 17h2v-3.34a4 4 0 0 0-1.17-2.83L19 9h-5v8h1M5 17a2 2 0 1 0 4 0 2 2 0 0 0-4 0M15 17a2 2 0 1 0 4 0 2 2 0 0 0-4 0',
  bell: 'M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10.3 21a1.94 1.94 0 0 0 3.4 0',
  search: 'M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM21 21l-4.35-4.35',
  filter: 'M22 3H2l8 9.46V19l4 2v-8.54z',
  columns: 'M12 3v18M3 5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z',
  plus: 'M12 5v14M5 12h14',
  more: 'M12 13a1 1 0 1 0 0-2 1 1 0 0 0 0 2M12 6a1 1 0 1 0 0-2 1 1 0 0 0 0 2M12 20a1 1 0 1 0 0-2 1 1 0 0 0 0 2',
  check: 'M20 6 9 17l-5-5',
  x: 'M18 6 6 18M6 6l12 12',
  alertTri: 'M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0zM12 9v4M12 17h.01',
  alertCirc: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM12 8v4M12 16h.01',
  info: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM12 16v-4M12 8h.01',
  checkCirc: 'M22 11.08V12a10 10 0 1 1-5.93-9.14M22 4 12 14.01l-3-3',
  logout: 'M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9',
  user: 'M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8',
  lock: 'M5 11h14a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-6a2 2 0 0 1 2-2zM7 11V7a5 5 0 0 1 10 0v4',
  key: 'M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0 3 3L22 7l-3-3',
  edit: 'M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4z',
  trash: 'M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M10 11v6M14 11v6',
  eye: 'M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
  menu: 'M3 12h18M3 6h18M3 18h18',
  settings: 'M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
  file: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M16 13H8M16 17H8M10 9H8',
  upload: 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12',
  clock: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM12 6v6l4 2',
  scale: 'M12 3v18M5 21h14M6.5 7 3 14a3.5 3.5 0 0 0 7 0zM17.5 7 14 14a3.5 3.5 0 0 0 7 0zM7 7h10M7 7 5 3M17 7l2-4',
  leaf: 'M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10zM2 21c0-3 1.85-5.36 5.08-6',
  pin: 'M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0zM12 13a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
  fuel: 'M3 22h12V4a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2zM15 8h2a2 2 0 0 1 2 2v6a1.5 1.5 0 0 0 3 0V8l-3-3M6 6h6',
  arrowRight: 'M5 12h14M12 5l7 7-7 7',
  chevDown: 'M6 9l6 6 6-6',
  chevRight: 'M9 18l6-6-6-6',
  chevLeft: 'M15 18l-6-6 6-6',
  inbox: 'M22 12h-6l-2 3h-4l-2-3H2M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z',
  refresh: 'M3 12a9 9 0 0 1 15-6.7L21 8M21 3v5h-5M21 12a9 9 0 0 1-15 6.7L3 16M3 21v-5h5',
  download: 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3',
  printer: 'M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2M6 14h12v8H6z',
  wifiOff: 'M2 2l20 20M8.5 16.5a5 5 0 0 1 7 0M5 12.9a10 10 0 0 1 5.2-2.8M2 8.8a16 16 0 0 1 4.6-2.9M12 20h.01M16.7 13a5 5 0 0 0-2.3-1.3M22 8.8a16 16 0 0 0-4.4-2.9',
  shield: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z',
  grip: 'M9 5a1 1 0 1 0 0 2 1 1 0 0 0 0-2M9 11a1 1 0 1 0 0 2 1 1 0 0 0 0-2M9 17a1 1 0 1 0 0 2 1 1 0 0 0 0-2M15 5a1 1 0 1 0 0 2 1 1 0 0 0 0-2M15 11a1 1 0 1 0 0 2 1 1 0 0 0 0-2M15 17a1 1 0 1 0 0 2 1 1 0 0 0 0-2',
  monitor: 'M2 3h20v14H2zM8 21h8M12 17v4',
  smartphone: 'M7 2h10a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2zM11 18h2',
  grid: 'M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z',
  sun: 'M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10zM12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42',
  moon: 'M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z',
  home: 'M3 9.5 12 3l9 6.5V21a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z',
  wrench: 'M14.7 6.3a4 4 0 0 0-5.4 5.3L3 18l3 3 6.4-6.3a4 4 0 0 0 5.3-5.4l-2.7 2.7-2.6-.4-.4-2.6z',
  clipboard: 'M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2M9 12l2 2 4-4',
  route: 'M6 19a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM18 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM9 19h6a3 3 0 0 0 3-3v-1M6 13V9a3 3 0 0 1 3-3h3',
  trendUp: 'M22 7 13.5 15.5 8.5 10.5 2 17M16 7h6v6',
  barChart: 'M12 20V10M18 20V4M6 20v-4',
};

/* ---- Spot illustration (flat-geometric SVGs in /illustrations) ----- */
function Illustration({ name, size = 200, className = '', style }) {
  const base = window.__SWAT_ILL_BASE || 'illustrations/';
  return <img src={base + name + '.svg'} alt="" aria-hidden="true"
    className={'hf-ill ' + className} style={{ width: size, height: 'auto', display: 'block', ...style }} />;
}

function Icon({ name, size = 20, className, style, strokeWidth = 2 }) {
  const d = ICONS[name];
  if (!d) return null;
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"
      style={{ flexShrink: 0, ...style }} aria-hidden="true">
      {d.split('M').filter(Boolean).map((seg, i) => <path key={i} d={'M' + seg} />)}
    </svg>
  );
}

/* ---- Button -------------------------------------------------------- */
function Button({ variant = 'primary', size = 'md', icon, iconRight, loading, children, className = '', ...rest }) {
  const cls = ['btn', 'btn-' + variant, size === 'sm' ? 'btn-sm' : size === 'lg' ? 'btn-lg' : '', className].filter(Boolean).join(' ');
  return (
    <button className={cls} {...rest}>
      {loading ? <span className="spinner" /> : (icon && <Icon name={icon} size={size === 'sm' ? 15 : 17} />)}
      {children}
      {iconRight && <Icon name={iconRight} size={size === 'sm' ? 15 : 17} />}
    </button>
  );
}

/* ---- Badge / status pill ------------------------------------------- */
function Badge({ status, label, cls, children }) {
  const s = status && window.SWAT.STATUS[status];
  const c = cls || (s && s.cls) || 'badge-slate';
  const t = label || (s && s.label) || children;
  return <span className={'badge ' + c}><span className="dot" />{t}</span>;
}

/* ---- Form field ---------------------------------------------------- */
function Field({ label, required, help, error, children, className = '', style }) {
  return (
    <div className={'field ' + className} style={style}>
      {label && <label className="field-label">{label}{required && <span className="req">*</span>}</label>}
      {children}
      {error ? <span className="field-error"><Icon name="alertCirc" size={13} /> {error}</span>
        : help ? <span className="field-help">{help}</span> : null}
    </div>
  );
}

function Input({ error, affix, className = '', ...rest }) {
  const cl = 'input ' + (error ? 'is-error ' : '') + className;
  if (affix) return (
    <div className="input-group"><input className={cl} aria-invalid={!!error} {...rest} /><span className="input-affix">{affix}</span></div>
  );
  return <input className={cl} aria-invalid={!!error} {...rest} />;
}

function Select({ children, ...rest }) { return <select className="select" {...rest}>{children}</select>; }
function Textarea({ ...rest }) { return <textarea className="textarea" {...rest} />; }

/* ---- Toolbar search ------------------------------------------------ */
function SearchInput({ value, onChange, placeholder, width = 300 }) {
  return (
    <div className="input-group" style={{ maxWidth: width, flex: '0 1 ' + width + 'px' }}>
      <span style={{ position: 'absolute', left: 12, color: 'var(--neutral-400)', display: 'flex' }}><Icon name="search" size={17} /></span>
      <input className="input" style={{ paddingLeft: 38 }} value={value} placeholder={placeholder}
        onChange={e => onChange(e.target.value)} />
    </div>
  );
}

/* ---- Portal (mobile: into phone frame host; desktop: body) --------- */
function Portal({ children }) {
  const target = (window.__HF_MOBILE && document.getElementById('hf-portal')) || document.body;
  return ReactDOM.createPortal(children, target);
}

/* ---- Dialog -------------------------------------------------------- */
function Dialog({ title, onClose, children, footer, width = 540 }) {
  useEffect(() => {
    const h = e => { if (e.key === 'Escape') onClose && onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);
  return (
    <Portal>
    <div className="hf-overlay" onMouseDown={e => { if (e.target === e.currentTarget) onClose && onClose(); }}>
      <div className="dialog hf-dialog" role="dialog" aria-modal="true" style={{ width, maxWidth: '92vw' }}
        onMouseDown={e => e.stopPropagation()}>
        <div className="hf-dialog-head">
          <h3>{title}</h3>
          <button className="hf-iconbtn" aria-label="Tutup" onClick={onClose}><Icon name="x" size={18} /></button>
        </div>
        <div className="hf-dialog-body">{children}</div>
        {footer && <div className="dialog-foot">{footer}</div>}
      </div>
    </div>
    </Portal>
  );
}

/* ---- Confirm (AlertDialog) ----------------------------------------- */
function Confirm({ title, body, confirmLabel = 'Hapus', onConfirm, onCancel }) {
  return (
    <Portal>
    <div className="hf-overlay">
      <div className="dialog hf-dialog" role="alertdialog" aria-modal="true" style={{ width: 420, maxWidth: '92vw' }}>
        <div className="hf-dialog-head"><h3>{title}</h3></div>
        <div className="hf-dialog-body"><p style={{ margin: 0, fontSize: 14, color: 'var(--neutral-600)', lineHeight: 1.6 }}>{body}</p></div>
        <div className="dialog-foot">
          <Button variant="secondary" onClick={onCancel} autoFocus>Batal</Button>
          <Button variant="destructive" onClick={onConfirm}>{confirmLabel}</Button>
        </div>
      </div>
    </div>
    </Portal>
  );
}

/* ---- Toast host ---------------------------------------------------- */
const ToastCtx = React.createContext(() => { });
function ToastHost({ children }) {
  const [toasts, setToasts] = useState([]);
  const push = useCallback((t) => {
    const id = Math.random().toString(36).slice(2);
    setToasts(ts => [...ts, { id, ...t }]);
    setTimeout(() => setToasts(ts => ts.filter(x => x.id !== id)), t.variant === 'error' ? 5000 : 3000);
  }, []);
  const icon = { success: 'checkCirc', error: 'alertCirc', warning: 'alertTri', info: 'info' };
  const color = { success: 'var(--success-600)', error: 'var(--danger-600)', warning: 'var(--warning-600)', info: 'var(--info-600)' };
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="hf-toast-stack">
        {toasts.map(t => (
          <div key={t.id} className={'toast toast-' + (t.variant || 'success') + ' hf-toast-in'} role={t.variant === 'error' ? 'alert' : 'status'}>
            <span style={{ color: color[t.variant || 'success'], display: 'flex', marginTop: 1 }}><Icon name={icon[t.variant || 'success']} size={18} /></span>
            <div style={{ flex: 1 }}>
              <div className="toast-title">{t.title}</div>
              {t.msg && <div style={{ color: 'var(--neutral-600)', marginTop: 1 }}>{t.msg}</div>}
            </div>
            <button className="hf-iconbtn" onClick={() => setToasts(ts => ts.filter(x => x.id !== t.id))} aria-label="Tutup"><Icon name="x" size={15} /></button>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}
const useToast = () => React.useContext(ToastCtx);

/* ---- Dropdown menu ------------------------------------------------- */
function Menu({ trigger, items, align = 'right' }) {
  const [open, setOpen] = useState(false);
  const ref = useRef();
  useEffect(() => {
    if (!open) return;
    const h = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    window.addEventListener('mousedown', h);
    return () => window.removeEventListener('mousedown', h);
  }, [open]);
  return (
    <div ref={ref} style={{ position: 'relative', display: 'inline-flex' }}>
      <span onClick={() => setOpen(o => !o)}>{trigger}</span>
      {open && (
        <div className="menu hf-menu" style={{ [align]: 0 }}>
          {items.map((it, i) => it.sep ? <hr key={i} className="menu-sep" /> : (
            <button key={i} className={'menu-item' + (it.danger ? ' danger' : '')}
              onClick={() => { setOpen(false); it.onClick && it.onClick(); }}>
              {it.icon && <span className="mi-ico"><Icon name={it.icon} size={15} /></span>}{it.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ---- Breadcrumb ---------------------------------------------------- */
function Crumbs({ items, onNav }) {
  return (
    <nav className="crumbs" aria-label="Breadcrumb" style={{ marginBottom: 8 }}>
      {items.map((c, i) => i < items.length - 1
        ? <React.Fragment key={i}><a href="#" onClick={e => { e.preventDefault(); c.to && onNav && onNav(c.to); }}>{c.label}</a><span className="sep">/</span></React.Fragment>
        : <span key={i} aria-current="page">{c.label || c}</span>)}
    </nav>
  );
}

/* ---- Page header --------------------------------------------------- */
function PageHead({ title, sub, actions }) {
  return (
    <div className="hf-pghead">
      <div><h1 className="hf-h1">{title}</h1>{sub && <p className="hf-sub">{sub}</p>}</div>
      {actions && <div style={{ display: 'flex', gap: 10, flexShrink: 0 }}>{actions}</div>}
    </div>
  );
}

/* ---- Empty / error / skeleton states ------------------------------- */
function EmptyState({ icon = 'inbox', art, title, msg, action, compact }) {
  return (
    <div className={'hf-empty' + (compact ? ' compact' : '')}>
      {art ? <Illustration name={art} size={compact ? 168 : 210} style={{ marginBottom: 4 }} />
        : <div className="hf-empty-ic"><Icon name={icon} size={28} /></div>}
      <p className="hf-empty-t">{title}</p>
      {msg && <p className="hf-empty-m">{msg}</p>}
      {action && <div style={{ marginTop: 6 }}>{action}</div>}
    </div>
  );
}
function SkeletonRows({ rows = 8, cols = 5 }) {
  return (
    <tbody>
      {Array.from({ length: rows }).map((_, r) => (
        <tr key={r}>{Array.from({ length: cols }).map((_, c) => (
          <td key={c}><div className="skeleton" style={{ width: [70, 90, 60, 80, 50][c % 5] + '%' }} /></td>
        ))}</tr>
      ))}
    </tbody>
  );
}

/* ---- Pagination footer -------------------------------------------- */
function TableFooter({ total, page = 1, perPage = 25, onPrev, onNext }) {
  const from = total === 0 ? 0 : (page - 1) * perPage + 1;
  const to = Math.min(page * perPage, total);
  const pages = Math.max(1, Math.ceil(total / perPage));
  return (
    <div className="hf-tfoot">
      <span className="hf-muted">Menampilkan {window.SWAT.fmt.int(from)}–{window.SWAT.fmt.int(to)} dari {window.SWAT.fmt.int(total)}</span>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <Button variant="outline" size="sm" disabled={page <= 1} onClick={onPrev} icon="chevLeft">Sebelumnya</Button>
        <span className="mono" style={{ fontSize: 12.5 }}>Hal {page} / {pages}</span>
        <Button variant="outline" size="sm" disabled={page >= pages} onClick={onNext} iconRight="chevRight">Selanjutnya</Button>
      </div>
    </div>
  );
}

/* ---- Theme (light/dark) controller --------------------------------- */
const Theme = {
  get() { return document.documentElement.classList.contains('dark') ? 'dark' : 'light'; },
  set(t) {
    document.documentElement.classList.toggle('dark', t === 'dark');
    const m = document.querySelector('meta[name="theme-color"]');
    if (m) m.setAttribute('content', t === 'dark' ? '#0b1424' : '#0f172a');
    try { localStorage.setItem('swat-theme', t); } catch (e) { }
    window.dispatchEvent(new Event('swat-theme'));
  },
  toggle() { this.set(this.get() === 'dark' ? 'light' : 'dark'); },
};
function useTheme() {
  const [t, setT] = useState(Theme.get());
  useEffect(() => {
    const h = () => setT(Theme.get());
    window.addEventListener('swat-theme', h);
    return () => window.removeEventListener('swat-theme', h);
  }, []);
  return t;
}
function ThemeToggle({ variant = 'icon' }) {
  const t = useTheme();
  if (variant === 'segmented') {
    return (
      <div className="hf-vptoggle hf-theme-seg" role="group" aria-label="Tema">
        {[['light', 'Terang', 'sun'], ['dark', 'Gelap', 'moon']].map(([v, l, ic]) => (
          <button key={v} className={t === v ? 'on' : ''} aria-pressed={t === v} onClick={() => Theme.set(v)}>
            <Icon name={ic} size={15} />{l}
          </button>
        ))}
      </div>
    );
  }
  return (
    <button className="hf-iconbtn" aria-label={t === 'dark' ? 'Mode terang' : 'Mode gelap'} title={t === 'dark' ? 'Mode terang' : 'Mode gelap'} onClick={() => Theme.toggle()}>
      <Icon name={t === 'dark' ? 'sun' : 'moon'} size={19} />
    </button>
  );
}

Object.assign(window, {
  Icon, Illustration, Button, Badge, Field, Input, Select, Textarea, SearchInput,
  Dialog, Confirm, Portal, ToastHost, useToast, Menu, Crumbs, PageHead,
  EmptyState, SkeletonRows, TableFooter, Theme, useTheme, ThemeToggle,
});
