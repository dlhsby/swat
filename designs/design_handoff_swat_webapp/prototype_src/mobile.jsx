/* =====================================================================
   SWAT hi-fi — Mobile shell (phone frame + mobile chrome)
   Wraps any screen in a 390px phone with status bar, top bar, drawer,
   and bottom nav. Reuses the same <Screen/> router & <Sidebar/>.
   ===================================================================== */

function MobileBottomNav({ route, onNav }) {
  const items = [
    { id: 'dashboard', label: 'Dasbor', icon: 'dashboard' },
    { id: 'days', label: 'Transaksi', icon: 'transactions' },
    { id: 'vehicles', label: 'Armada', icon: 'truck' },
    { id: 'profile', label: 'Akun', icon: 'user' },
  ];
  const leaf = window.SWAT.SCREEN2LEAF[route] || route;
  const map = { dashboard: 'dashboard', 'n-day': 'days', 'n-vehicle': 'vehicles' };
  const active = map[leaf] || (route === 'profile' ? 'profile' : route === 'board' || route === 'days' ? 'days' : route === 'vehicles' ? 'vehicles' : route === 'dashboard' ? 'dashboard' : '');
  return (
    <nav className="hf-mbottomnav" aria-label="Navigasi bawah">
      {items.map(it => (
        <button key={it.id} className={active === it.id ? 'active' : ''} onClick={() => onNav(it.id)}>
          <Icon name={it.icon} size={21} strokeWidth={active === it.id ? 2.4 : 2} />{it.label}
        </button>
      ))}
    </nav>
  );
}

/* Phone frame that hosts the running app screen. Auth screens render full-bleed. */
function MobileShell({ auth, route, params, onNav, expanded, toggleGroup, onLogout, onChangePw, isAuthScreen, authBody }) {
  const Screen = window.Screen, Sidebar = window.Sidebar;
  const [drawer, setDrawer] = useState(false);
  const U = window.SWAT.USER;
  const time = '07:45';

  const titleFor = () => {
    const c = window.SWAT.SCREEN2LEAF[route];
    const leaf = []; window.SWAT.NAV.forEach(n => { if (n.screen === route) leaf.push(n.label); (n.children || []).forEach(ch => { if (ch.id === c) leaf.push(ch.label); }); });
    return route === 'profile' ? 'Profil' : route === 'board' ? 'Haul Board' : route === 'template' ? 'Template Trayek' : (leaf[0] || 'SWAT');
  };

  return (
    <div className="hf-stage">
      <div className="hf-phone">
        <div className="hf-phone-screen hf-mobile">
          <div id="hf-portal" className="hf-portal"></div>
          <div className="hf-mstatus">
            <span className="mono">{time}</span>
            <span className="dots"><Icon name="activity" size={13} /><Icon name="bell" size={13} /><span style={{ fontWeight: 700 }}>82%</span></span>
          </div>

          {isAuthScreen ? (
            <div className="hf-mbody">
              {authBody}
            </div>
          ) : (
            <>
              <div className="hf-mtop">
                <button className="hf-iconbtn" aria-label="Menu" onClick={() => setDrawer(true)}><Icon name="menu" size={20} /></button>
                <BrandMark className="mk" />
                <b>{titleFor()}</b>
                <ThemeToggle />
                <button className="hf-iconbtn hf-iconwrap" aria-label="Notifikasi"><Icon name="bell" size={19} /><span className="dot" style={{ position: 'absolute', top: 5, right: 6, width: 7, height: 7, borderRadius: '50%', background: 'var(--danger-500)', border: '1.5px solid #fff' }} /></button>
              </div>

              <div className="hf-mbody">
                <Screen route={route} params={params} onNav={onNav} />
              </div>

              <MobileBottomNav route={route} onNav={onNav} />

              {drawer && <>
                <div className="hf-mdrawer-scrim" onClick={() => setDrawer(false)} />
                <div className="hf-mdrawer">
                  <div className="hf-mdrawer-head">
                    <BrandMark className="mk" />
                    <b>SWAT</b>
                    <button className="hf-iconbtn" aria-label="Tutup" onClick={() => setDrawer(false)}><Icon name="x" size={18} /></button>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', borderBottom: '1px solid var(--neutral-100)' }}>
                    <span className="avatar">{U.initials}</span>
                    <div style={{ lineHeight: 1.25 }}><b style={{ fontSize: 13.5, fontWeight: 600 }}>{U.name}</b><div className="hf-muted" style={{ fontSize: 12 }}>{U.role}</div></div>
                  </div>
                  <Sidebar route={route} onNav={(r, p) => { setDrawer(false); onNav(r, p); }} expanded={expanded} toggleGroup={toggleGroup} />
                  <div style={{ borderTop: '1px solid var(--neutral-200)', padding: 10 }}>
                    <button className="hf-navtop" onClick={onLogout} style={{ color: 'var(--danger-600)', marginTop: 0 }}>
                      <span className="gi"><Icon name="logout" size={18} /></span><span>Keluar</span>
                    </button>
                  </div>
                </div>
              </>}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { MobileShell, MobileBottomNav });
