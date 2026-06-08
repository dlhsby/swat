/* =====================================================================
   SWAT hi-fi — Auth screens: Login · Change Password · Profile
   ===================================================================== */
const SWAT_MARK = `<svg viewBox="0 0 256 256" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="SWAT">
  <rect width="256" height="256" rx="58" fill="#047857"/>
  <g transform="rotate(-20 128 128)">
    <path d="M128 40 C 184 88, 184 158, 128 214 C 72 158, 72 88, 128 40 Z" fill="#ffffff"/>
    <path d="M128 214 L128 232" stroke="#047857" stroke-width="7" stroke-linecap="round"/>
    <path d="M128 58 L128 206" stroke="#047857" stroke-width="6.5" stroke-linecap="round"/>
    <path d="M128 100 L101 80 M128 100 L155 80 M128 132 L97 114 M128 132 L159 114 M128 164 L102 149 M128 164 L154 149" stroke="#047857" stroke-width="5" stroke-linecap="round"/>
  </g>
</svg>`;
function BrandMark({ className }) { return <span className={className} dangerouslySetInnerHTML={{ __html: SWAT_MARK }} />; }

/* ----------------------------------------------------- LOGIN -------- */
function LoginScreen({ onLogin, onBack }) {
  const [u, setU] = useState('ali.darmawan');
  const [p, setP] = useState('');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);
  const submit = (e) => {
    e.preventDefault();
    setErr('');
    if (!u.trim() || !p.trim()) { setErr('Nama pengguna dan kata sandi wajib diisi.'); return; }
    setLoading(true);
    setTimeout(() => { setLoading(false); onLogin(); }, 850);
  };
  return (
    <div className="hf-auth">
      <div style={{ position: 'absolute', top: 18, right: 18, zIndex: 2 }}><ThemeToggle /></div>
      <div className="hf-authcard hf-enter">
        {onBack && <button className="hf-backlink" onClick={onBack}><Icon name="chevLeft" size={15} /> Galeri Layar</button>}
        <div className="hf-authlogo">
          <Illustration name="login" size={232} className="hf-authill" />
          <BrandMark className="mk" />
          <b>SWAT</b>
          <span>Dinas Lingkungan Hidup · Kota Surabaya</span>
        </div>
        <form className="card" style={{ padding: 24 }} onSubmit={submit}>
          <h3 style={{ margin: '0 0 4px', fontSize: 20, fontWeight: 700 }}>Masuk</h3>
          <p className="hf-muted" style={{ margin: '0 0 18px', fontSize: 13 }}>Gunakan akun yang diberikan administrator.</p>
          <Field label="Nama pengguna" required>
            <Input value={u} onChange={e => setU(e.target.value)} placeholder="mis. ali.darmawan" autoComplete="username" />
          </Field>
          <Field label="Kata sandi" required>
            <Input type="password" value={p} onChange={e => setP(e.target.value)} placeholder="Masukkan kata sandi" autoComplete="current-password" />
          </Field>
          {err && (
            <div className="alert alert-danger" style={{ marginBottom: 14 }}>
              <Icon name="alertCirc" size={18} style={{ color: 'var(--danger-600)', flexShrink: 0 }} />
              <div><div className="alert-title">Gagal masuk</div>{err}</div>
            </div>
          )}
          <Button variant="primary" type="submit" loading={loading} className="" style={{ width: '100%' }}>
            {loading ? 'Memuat…' : 'Masuk'}
          </Button>
          <p style={{ textAlign: 'center', margin: '14px 0 0', fontSize: 12.5 }}>
            <a href="#" style={{ color: 'var(--primary-700)' }} onClick={e => e.preventDefault()}>Lupa kata sandi?</a>
          </p>
        </form>
        <p className="hf-authfoot">© 2026 Dinas Lingkungan Hidup Kota Surabaya</p>
      </div>
    </div>
  );
}

/* ----------------------------------------------- CHANGE PASSWORD ---- */
function pwStrength(v) {
  let s = 0;
  if (v.length >= 8) s++;
  if (/[A-Z]/.test(v)) s++;
  if (/[0-9]/.test(v)) s++;
  if (/[^A-Za-z0-9]/.test(v)) s++;
  return s;
}
function ChangePasswordScreen({ forced, onDone, onBack }) {
  const toast = useToast();
  const [cur, setCur] = useState('');
  const [nw, setNw] = useState('');
  const [cf, setCf] = useState('');
  const [touched, setTouched] = useState(false);
  const st = pwStrength(nw);
  const stLabel = ['Sangat lemah', 'Lemah', 'Sedang', 'Kuat', 'Sangat kuat'][st];
  const stColor = ['--danger-600', '--danger-600', '--warning-600', '--success-700', '--success-700'][st];
  const matchErr = touched && cf && cf !== nw ? 'Konfirmasi tidak cocok dengan kata sandi baru.' : '';
  const valid = cur && nw.length >= 8 && st >= 2 && cf === nw;
  const submit = (e) => {
    e.preventDefault(); setTouched(true);
    if (!valid) return;
    toast({ variant: 'success', title: 'Berhasil', msg: 'Kata sandi telah diperbarui.' });
    onDone();
  };
  return (
    <div className="hf-auth">
      <div style={{ position: 'absolute', top: 18, right: 18, zIndex: 2 }}><ThemeToggle /></div>
      <form className="hf-authcard hf-enter" style={{ width: 440 }} onSubmit={submit}>
        {onBack && <button type="button" className="hf-backlink" onClick={onBack}><Icon name="chevLeft" size={15} /> Galeri Layar</button>}
        <div className="hf-authlogo">
          <BrandMark className="mk" />
          <b>Ubah Kata Sandi</b>
          <span>{forced ? 'Wajib sebelum melanjutkan' : 'Perbarui kata sandi akun Anda'}</span>
        </div>
        {forced && (
          <div className="alert alert-warning" style={{ marginBottom: 14 }}>
            <Icon name="alertTri" size={18} style={{ color: 'var(--warning-600)', flexShrink: 0 }} />
            <div><div className="alert-title">Tindakan diperlukan</div>Anda harus mengubah kata sandi sementara untuk melanjutkan.</div>
          </div>
        )}
        <div className="card" style={{ padding: 24 }}>
          <Field label="Kata sandi saat ini" required>
            <Input type="password" value={cur} onChange={e => setCur(e.target.value)} placeholder="Kata sandi sementara" />
          </Field>
          <Field label="Kata sandi baru" required help="Minimal 8 karakter, kombinasi huruf & angka.">
            <Input type="password" value={nw} onChange={e => setNw(e.target.value)} placeholder="Kata sandi baru" />
          </Field>
          {nw && (
            <div style={{ margin: '-4px 0 16px' }}>
              <div className="progress"><i style={{ width: (st / 4 * 100) + '%', background: `var(${stColor})` }} /></div>
              <p style={{ margin: '6px 0 0', fontSize: 12 }} className="hf-muted">Kekuatan: <b style={{ color: `var(${stColor})` }}>{stLabel}</b></p>
            </div>
          )}
          <Field label="Konfirmasi kata sandi baru" required error={matchErr}>
            <Input type="password" value={cf} onChange={e => setCf(e.target.value)} onBlur={() => setTouched(true)} placeholder="Ulangi kata sandi baru" />
          </Field>
          <div className="dialog-foot" style={{ marginTop: 8 }}>
            {forced ? <Button variant="secondary" type="button" onClick={onDone}>Keluar</Button>
              : <Button variant="secondary" type="button" onClick={onDone}>Batal</Button>}
            <Button variant="primary" type="submit" disabled={!valid}>{forced ? 'Ubah & Lanjut' : 'Simpan'}</Button>
          </div>
        </div>
      </form>
    </div>
  );
}

/* ----------------------------------------------------- PROFILE ----- */
function ProfileScreen({ onChangePw, onLogout }) {
  const toast = useToast();
  const U = window.SWAT.USER;
  const [name, setName] = useState(U.name);
  const [confirmLogout, setConfirmLogout] = useState(false);
  return (
    <div className="hf-page hf-enter">
      <Crumbs items={[{ label: 'Akun' }, { label: 'Profil' }]} />
      <PageHead title="Profil Saya" sub="Kelola informasi akun dan keamanan." />
      <div className="hf-grid2">
        <div className="card" style={{ padding: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
            <span className="avatar" style={{ width: 64, height: 64, fontSize: 22 }}>{U.initials}</span>
            <div>
              <div style={{ fontSize: 18, fontWeight: 700 }}>{U.name}</div>
              <div className="hf-muted" style={{ fontSize: 13, marginBottom: 6 }}>@{U.username}</div>
              <Badge cls="badge-slate" label={U.role} />
            </div>
          </div>
          <div className="hf-imgslot" style={{ height: 76, marginBottom: 20 }}>foto profil — JPG/PNG, maks 2 MB (Dropzone)</div>
          <Field label="Nama lengkap" required>
            <Input value={name} onChange={e => setName(e.target.value)} />
          </Field>
          <Field label="Nama pengguna" help="Tidak dapat diubah.">
            <Input value={U.username} disabled />
          </Field>
          <div className="dialog-foot" style={{ marginTop: 8 }}>
            <Button variant="secondary" onClick={() => setName(U.name)}>Batal</Button>
            <Button variant="primary" onClick={() => toast({ variant: 'success', title: 'Berhasil', msg: 'Profil diperbarui.' })}>Simpan</Button>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="card" style={{ padding: 20 }}>
            <h3 style={{ margin: '0 0 4px', fontSize: 15, fontWeight: 700 }}>Keamanan</h3>
            <p className="hf-muted" style={{ margin: '0 0 14px', fontSize: 13 }}>Ubah kata sandi kapan saja.</p>
            <Button variant="outline" icon="key" onClick={onChangePw}>Ubah Kata Sandi</Button>
          </div>
          <div className="card" style={{ padding: 20 }}>
            <h3 style={{ margin: '0 0 4px', fontSize: 15, fontWeight: 700 }}>Sesi</h3>
            <p className="hf-muted" style={{ margin: '0 0 14px', fontSize: 13 }}>Keluar dari perangkat ini.</p>
            <Button variant="destructive" icon="logout" onClick={() => setConfirmLogout(true)}>Keluar</Button>
          </div>
        </div>
      </div>
      {confirmLogout && (
        <Confirm title="Keluar dari sesi?" body="Anda akan keluar dari SWAT pada perangkat ini."
          confirmLabel="Keluar" onCancel={() => setConfirmLogout(false)} onConfirm={onLogout} />
      )}
    </div>
  );
}

Object.assign(window, { BrandMark, LoginScreen, ChangePasswordScreen, ProfileScreen });
