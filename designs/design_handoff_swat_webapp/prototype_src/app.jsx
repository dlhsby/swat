/* =====================================================================
   SWAT hi-fi — App shell, navigation, router, mount
   ===================================================================== */

/* ---- Sidebar nav ---- */
function Sidebar({ active, route, onNav, expanded, toggleGroup }) {
  const { NAV, SCREEN2LEAF } = window.SWAT;
  const activeLeaf = SCREEN2LEAF[route] || route;
  return (
    <nav className="hf-sidebar" aria-label="Navigasi utama">
      {NAV.map(node => {
        if (!node.children) {
          return (
            <button key={node.id} className={'hf-navtop' + (activeLeaf === node.screen ? ' active' : '')}
              onClick={() => onNav(node.screen)}>
              <span className="gi"><Icon name={node.icon} size={18} /></span><span>{node.label}</span>
            </button>
          );
        }
        const open = expanded.has(node.id);
        return (
          <div key={node.id} className={'hf-navgrp' + (open ? ' open' : '')}>
            <button className="hf-navgrp-btn" onClick={() => toggleGroup(node.id)}>
              <span className="gi"><Icon name={node.icon} size={16} /></span>
              <span className="gl">{node.label}</span>
              <span className="chev"><Icon name="chevRight" size={14} /></span>
            </button>
            <div className="hf-navkids">
              {node.children.map(c => (
                <a key={c.id} className={'hf-navlink' + (c.id === activeLeaf ? ' active' : '') + (c.screen === 'soon' ? ' soon' : '')}
                  onClick={() => onNav(c.screen === 'soon' ? 'soon' : c.screen, c.screen === 'soon' ? { label: c.label } : undefined)}>
                  <span className="nl">{c.label}</span>
                </a>
              ))}
            </div>
          </div>
        );
      })}
    </nav>
  );
}

/* ---- Topbar ---- */
function Topbar({ onBurger, onNav, onLogout, onChangePw }) {
  const U = window.SWAT.USER;
  return (
    <header className="hf-topbar">
      <button className="hf-burger" aria-label="Menu" onClick={onBurger}><Icon name="menu" size={20} /></button>
      <div className="hf-logo" style={{ cursor: 'pointer' }} onClick={() => onNav('dashboard')}>
        <BrandMark className="mk" />
        <div className="lt"><b>SWAT</b><span>· DLH Surabaya</span></div>
      </div>
      <div className="spacer" />
      <ThemeToggle />
      <Menu trigger={<button className="hf-iconbtn hf-iconwrap" aria-label="Notifikasi"><Icon name="bell" size={19} /><span className="dot" /></button>}
        items={[
          { label: '3 trayek menunggu verifikasi', icon: 'alertTri' },
          { label: '2 SIM pengemudi kedaluwarsa', icon: 'alertCirc' },
          { sep: true },
          { label: 'Lihat semua notifikasi', icon: 'bell' },
        ]} />
      <Menu trigger={
        <button className="hf-user">
          <span className="avatar">{U.initials}</span>
          <span className="nm"><b>{U.name}</b><span>{U.role}</span></span>
          <Icon name="chevDown" size={15} style={{ color: 'var(--neutral-400)' }} />
        </button>}
        items={[
          { label: 'Profil', icon: 'user', onClick: () => onNav('profile') },
          { label: 'Ubah Kata Sandi', icon: 'key', onClick: onChangePw },
          { sep: true },
          { label: 'Keluar', icon: 'logout', danger: true, onClick: onLogout },
        ]} />
    </header>
  );
}

/* ---- Screen router ---- */
function Screen({ route, params, onNav }) {
  switch (route) {
    case 'dashboard': return <DashboardScreen onNav={onNav} />;
    case 'vehicles': return <VehiclesScreen onNav={onNav} />;
    case 'drivers': return <DriversScreen />;
    case 'sites': return <SitesScreen />;
    case 'waste': return <WasteScreen />;
    case 'monvol': return <MonVolScreen />;
    case 'monfuel': return <MonFuelScreen />;
    case 'reports': return <ReportsScreen />;
    case 'refuels': return <RefuelScreen />;
    case 'inspections': return <InspectScreen />;
    case 'maintenance': return <MaintScreen />;
    case 'crew': return <CrewScreen onNav={onNav} />;
    case 'template': return <TemplateScreen params={params} onNav={onNav} />;
    case 'quota': return <QuotaScreen />;
    case 'days': return <DaysScreen onNav={onNav} />;
    case 'board': return <BoardScreen params={params} onNav={onNav} />;
    case 'users': return <UsersScreen />;
    case 'roles': return <RolesScreen />;
    case 'profile': return <ProfileScreen onChangePw={() => onNav('changepw-inline')} onLogout={() => onNav('logout')} />;
    case 'soon': return <SoonScreen label={params && params.label} />;
    default: return <DashboardScreen onNav={onNav} />;
  }
}

/* ---- Root app ----
   mode: 'gallery' (screen library) | 'app' (running prototype)
   appMode: 'browse' (jumped from gallery, auth bypassed) | 'demo' (full login flow)
   viewport: 'desktop' | 'mobile'
*/
function App() {
  const [mode, setMode] = useState('gallery');
  const [appMode, setAppMode] = useState('browse');
  const [viewport, setViewport] = useState('desktop');
  const [auth, setAuth] = useState('app');     // login | forcepw | app
  const [route, setRoute] = useState('dashboard');
  const [params, setParams] = useState(null);
  const [collapsed, setCollapsed] = useState(false);
  const [drawer, setDrawer] = useState(false);
  const [showChangePw, setShowChangePw] = useState(false);
  const [offline, setOffline] = useState(false);
  const [expanded, setExpanded] = useState(new Set(['grp-master', 'grp-sched', 'grp-txn', 'grp-users']));

  const AUTH_SCREENS = { login: 'login', forcepw: 'forcepw' };

  const nav = (r, p) => {
    if (r === 'logout') { setAuth('login'); setAppMode('demo'); setRoute('dashboard'); return; }
    if (r === 'changepw-inline') { setShowChangePw(true); return; }
    setRoute(r); setParams(p || null); setDrawer(false);
    const c = document.querySelector('.hf-content'); if (c) c.scrollTop = 0;
    const mb = document.querySelector('.hf-mbody'); if (mb) mb.scrollTop = 0;
  };
  const toggleGroup = (id) => setExpanded(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });

  /* open a screen straight from the gallery (no auth) */
  const openScreen = (screen) => {
    setMode('app'); setAppMode('browse');
    if (screen === 'login' || screen === 'forcepw') { setAuth(screen); }
    else { setAuth('app'); setRoute(screen); setParams(null); }
  };
  const runDemo = () => { setMode('app'); setAppMode('demo'); setAuth('login'); };
  const toGallery = () => { setMode('gallery'); setShowChangePw(false); };

  /* ---------- GALLERY ---------- */
  window.__HF_MOBILE = (mode === 'app' && viewport === 'mobile');
  if (mode === 'gallery') {
    window.__HF_MOBILE = false;
    return <ToastHost><Library onOpen={openScreen} onDemo={runDemo} viewport={viewport} setViewport={setViewport} /></ToastHost>;
  }

  const showDock = appMode === 'browse';
  const isAuthScreen = auth === 'login' || auth === 'forcepw';

  /* auth screens: in demo they advance the flow; in browse they're standalone previews */
  const authProps = appMode === 'demo'
    ? { onLogin: () => setAuth('forcepw'), onDone: () => setAuth('app'), onBack: toGallery }
    : { onLogin: () => { setAuth('app'); setRoute('dashboard'); }, onDone: () => { setAuth('app'); setRoute('dashboard'); }, onBack: toGallery };

  /* ---------- MOBILE VIEWPORT ---------- */
  if (viewport === 'mobile') {
    let authBody = null;
    if (auth === 'login') authBody = <LoginScreen onLogin={authProps.onLogin} onBack={showDock ? toGallery : null} />;
    else if (auth === 'forcepw') authBody = <ChangePasswordScreen forced onDone={authProps.onDone} onBack={showDock ? toGallery : null} />;
    return (
      <ToastHost>
        <MobileShell auth={auth} route={route} params={params} onNav={nav}
          expanded={expanded} toggleGroup={toggleGroup}
          onLogout={() => { setAuth('login'); setAppMode('demo'); }} onChangePw={() => setShowChangePw(true)}
          isAuthScreen={isAuthScreen} authBody={authBody} />
        {showDock && <PreviewDock onGallery={toGallery} viewport={viewport} setViewport={setViewport} />}
        {showChangePw && (
          <div className="hf-overlay" onMouseDown={e => { if (e.target === e.currentTarget) setShowChangePw(false); }}>
            <div onMouseDown={e => e.stopPropagation()} style={{ width: 440, maxWidth: '92vw' }}><ChangePwInline onClose={() => setShowChangePw(false)} /></div>
          </div>
        )}
      </ToastHost>
    );
  }

  /* ---------- DESKTOP VIEWPORT ---------- */
  if (auth === 'login') return <ToastHost><LoginScreen onLogin={authProps.onLogin} onBack={toGallery} />{showDock && <PreviewDock onGallery={toGallery} viewport={viewport} setViewport={setViewport} />}</ToastHost>;
  if (auth === 'forcepw') return <ToastHost><ChangePasswordScreen forced onDone={authProps.onDone} onBack={toGallery} />{showDock && <PreviewDock onGallery={toGallery} viewport={viewport} setViewport={setViewport} />}</ToastHost>;

  return (
    <ToastHost>
      <a href="#main" className="skip-link">Lewati ke konten</a>
      <div className={'hf-app' + (collapsed ? ' collapsed' : '') + (drawer ? ' drawer-open' : '')}>
        <Topbar onBurger={() => { window.innerWidth <= 1024 ? setDrawer(d => !d) : setCollapsed(c => !c); }}
          onNav={nav} onLogout={() => { setAuth('login'); setAppMode('demo'); }} onChangePw={() => setShowChangePw(true)} />
        <Sidebar active={route} route={route} onNav={nav} expanded={expanded} toggleGroup={toggleGroup} />
        {drawer && <div className="hf-scrim" onClick={() => setDrawer(false)} />}
        <main className="hf-content" id="main">
          {offline && (
            <div className="hf-banner">
              <Icon name="wifiOff" size={16} /> Anda sedang offline — perubahan disinkronkan saat daring.
              <span className="spacer" />
              <button className="hf-iconbtn" onClick={() => setOffline(false)}><Icon name="x" size={15} /></button>
            </div>
          )}
          <Screen route={route} params={params} onNav={nav} />
        </main>
      </div>
      {showDock && <PreviewDock onGallery={toGallery} viewport={viewport} setViewport={setViewport} />}
      {showChangePw && (
        <div className="hf-overlay" onMouseDown={e => { if (e.target === e.currentTarget) setShowChangePw(false); }}>
          <div onMouseDown={e => e.stopPropagation()} style={{ width: 440, maxWidth: '92vw' }}>
            <ChangePwInline onClose={() => setShowChangePw(false)} />
          </div>
        </div>
      )}
    </ToastHost>
  );
}

/* compact change-pw used as modal from topbar/profile */
function ChangePwInline({ onClose }) {
  const toast = useToast();
  const [nw, setNw] = useState(''); const [cf, setCf] = useState(''); const [cur, setCur] = useState('');
  const [touched, setTouched] = useState(false);
  const st = pwStrength(nw);
  const stLabel = ['Sangat lemah', 'Lemah', 'Sedang', 'Kuat', 'Sangat kuat'][st];
  const stColor = ['--danger-600', '--danger-600', '--warning-600', '--success-700', '--success-700'][st];
  const matchErr = touched && cf && cf !== nw ? 'Konfirmasi tidak cocok.' : '';
  const valid = cur && nw.length >= 8 && st >= 2 && cf === nw;
  return (
    <div className="dialog hf-dialog" role="dialog" aria-modal="true" style={{ width: '100%' }}>
      <div className="hf-dialog-head"><h3>Ubah Kata Sandi</h3>
        <button className="hf-iconbtn" aria-label="Tutup" onClick={onClose}><Icon name="x" size={18} /></button></div>
      <div className="hf-dialog-body">
        <Field label="Kata sandi saat ini" required><Input type="password" value={cur} onChange={e => setCur(e.target.value)} /></Field>
        <Field label="Kata sandi baru" required help="Minimal 8 karakter, kombinasi huruf & angka.">
          <Input type="password" value={nw} onChange={e => setNw(e.target.value)} /></Field>
        {nw && <div style={{ margin: '-4px 0 16px' }}>
          <div className="progress"><i style={{ width: (st / 4 * 100) + '%', background: `var(${stColor})` }} /></div>
          <p style={{ margin: '6px 0 0', fontSize: 12 }} className="hf-muted">Kekuatan: <b style={{ color: `var(${stColor})` }}>{stLabel}</b></p>
        </div>}
        <Field label="Konfirmasi kata sandi baru" required error={matchErr}>
          <Input type="password" value={cf} onChange={e => setCf(e.target.value)} onBlur={() => setTouched(true)} /></Field>
      </div>
      <div className="dialog-foot">
        <Button variant="secondary" onClick={onClose}>Batal</Button>
        <Button variant="primary" disabled={!valid} onClick={() => { toast({ variant: 'success', title: 'Berhasil', msg: 'Kata sandi diperbarui.' }); onClose(); }}>Simpan</Button>
      </div>
    </div>
  );
}

Object.assign(window, { Screen, Sidebar, Topbar, App });
ReactDOM.createRoot(document.getElementById('root')).render(<App />);
