/* =====================================================================
   SWAT hi-fi — Pengguna & Hak Akses (RBAC)
   ===================================================================== */

/* ----------------------------------------------- USER FORM --------- */
function UserForm({ initial, onClose, onSave }) {
  const [f, setF] = useState(initial || { name: '', username: '', role: '' });
  const [touched, setTouched] = useState(false);
  const set = (k, v) => setF(s => ({ ...s, [k]: v }));
  const valid = f.name.trim() && f.username.trim() && f.role;
  return (
    <Dialog title={initial ? 'Ubah Pengguna' : 'Buat Pengguna'} onClose={onClose} width={500}
      footer={<><Button variant="secondary" onClick={onClose}>Batal</Button>
        <Button variant="primary" onClick={() => { setTouched(true); if (valid) onSave(f, !!initial); }}>Simpan</Button></>}>
      <Field label="Nama lengkap" required error={touched && !f.name.trim() ? 'Wajib diisi.' : ''}>
        <Input value={f.name} onChange={e => set('name', e.target.value)} placeholder="mis. Ali Darmawan" error={touched && !f.name.trim()} />
      </Field>
      <Field label="Nama pengguna" required error={touched && !f.username.trim() ? 'Wajib diisi.' : ''}>
        <Input className="mono" value={f.username} onChange={e => set('username', e.target.value)} placeholder="mis. ali.darmawan" error={touched && !f.username.trim()} />
      </Field>
      <Field label="Peran" required error={touched && !f.role ? 'Wajib dipilih.' : ''}>
        <Select value={f.role} onChange={e => set('role', e.target.value)}>
          <option value="">Pilih peran…</option>
          {window.SWAT.ROLES.map(r => <option key={r.id}>{r.name}</option>)}
        </Select>
      </Field>
      {!initial && (
        <div className="alert alert-info">
          <Icon name="info" size={18} style={{ color: 'var(--info-600)', flexShrink: 0 }} />
          <div><div className="alert-title">Kata sandi sementara</div>Pengguna baru otomatis <code>mustChangePassword</code>; admin menyampaikan kata sandi sementara di luar sistem.</div>
        </div>
      )}
    </Dialog>
  );
}

/* ----------------------------------------------- USERS LIST -------- */
function UsersScreen() {
  const toast = useToast();
  const { fmt } = window.SWAT;
  const [list, setList] = useState(window.SWAT.USERS);
  const [q, setQ] = useState('');
  const [form, setForm] = useState(null);
  const [del, setDel] = useState(null);
  const filtered = list.filter(u => !q || (u.name + ' ' + u.username).toLowerCase().includes(q.toLowerCase()));
  const initials = (n) => n.split(' ').map(x => x[0]).join('').slice(0, 2).toUpperCase();
  const save = (f, isEdit) => {
    if (isEdit) { setList(l => l.map(u => u.id === form.id ? { ...u, ...f } : u)); toast({ variant: 'success', title: 'Berhasil', msg: f.name + ' diperbarui.' }); }
    else { setList(l => [{ id: Date.now(), ...f, status: 'MUST_CHANGE' }, ...l]); toast({ variant: 'success', title: 'Pengguna dibuat', msg: f.name }); }
    setForm(null);
  };
  return (
    <div className="hf-page hf-enter">
      <Crumbs items={[{ label: 'Pengguna & Akses' }, { label: 'Pengguna' }]} />
      <PageHead title="Pengguna" sub="Kelola akun & penetapan peran."
        actions={<Button variant="primary" icon="plus" onClick={() => setForm({})}>Buat Pengguna</Button>} />
      <div className="hf-toolbar">
        <SearchInput value={q} onChange={setQ} placeholder="Cari nama / username…" />
        <Button variant="outline" size="sm" icon="filter" iconRight="chevDown">Peran</Button>
        <div className="grow" />
        <span className="hf-muted">{fmt.int(list.length)} pengguna</span>
      </div>
      <div className="hf-tablecard">
        <table className="table">
          <thead><tr><th className="sortable">Nama</th><th>Username</th><th>Peran</th><th>Status</th><th style={{ width: 60, textAlign: 'right' }}>Aksi</th></tr></thead>
          <tbody>
            {filtered.map(u => (
              <tr key={u.id}>
                <td><div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <span className="avatar" style={{ width: 30, height: 30, fontSize: 12 }}>{initials(u.name)}</span>
                  <b style={{ fontWeight: 600, color: 'var(--neutral-900)' }}>{u.name}</b>
                </div></td>
                <td className="mono">@{u.username}</td>
                <td><Badge cls="badge-slate" label={u.role} /></td>
                <td><Badge status={u.status} /></td>
                <td>
                  <div className="hf-rowactions">
                    <Menu trigger={<button className="hf-iconbtn" aria-label="Aksi"><Icon name="more" size={18} /></button>}
                      items={[
                        { label: 'Ubah', icon: 'edit', onClick: () => setForm(u) },
                        { label: 'Reset paksa kata sandi', icon: 'key', onClick: () => toast({ variant: 'info', title: 'Kata sandi direset', msg: u.name + ' wajib ganti sandi.' }) },
                        { sep: true },
                        { label: 'Hapus', icon: 'trash', danger: true, onClick: () => setDel(u) },
                      ]} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <TableFooter total={list.length} page={1} perPage={25} />
      </div>
      <div className="alert alert-info" style={{ marginTop: 16 }}>
        <Icon name="info" size={18} style={{ color: 'var(--info-600)', flexShrink: 0 }} />
        <div><div className="alert-title">Buat pengguna</div>Kata sandi tidak pernah diatur di form ini — gunakan "Reset paksa kata sandi". Pengguna baru wajib ganti sandi saat login pertama.</div>
      </div>
      {form && <UserForm initial={form.id ? form : null} onClose={() => setForm(null)} onSave={save} />}
      {del && <Confirm title="Hapus pengguna?" body={<>Yakin ingin menghapus <b>{del.name}</b>? Akun akan dinonaktifkan (soft-delete).</>}
        onCancel={() => setDel(null)} onConfirm={() => { setList(l => l.filter(u => u.id !== del.id)); toast({ variant: 'success', title: 'Dihapus', msg: del.name }); setDel(null); }} />}
    </div>
  );
}

/* ----------------------------------------------- ROLES (RBAC) ------ */
function RolesScreen() {
  const toast = useToast();
  const { ROLES, PERMS } = window.SWAT;
  const [sel, setSel] = useState(ROLES[1]);
  const [perms, setPerms] = useState(PERMS);
  const toggle = (grp, key) => setPerms(p => ({ ...p, [grp]: p[grp].map(x => x.key === key ? { ...x, on: !x.on } : x) }));
  return (
    <div className="hf-page hf-enter">
      <Crumbs items={[{ label: 'Pengguna & Akses' }, { label: 'Hak Akses' }]} />
      <PageHead title="Hak Akses" sub="Peran & izin granular (RBAC)."
        actions={<Button variant="primary" icon="plus">Buat Peran</Button>} />
      <div className="hf-grid2" style={{ gridTemplateColumns: '320px 1fr' }}>
        <div className="hf-rolelist">
          <div style={{ padding: '13px 16px', borderBottom: '1px solid var(--neutral-200)' }}><b style={{ fontSize: 13 }}>Peran</b></div>
          {ROLES.map(r => (
            <div key={r.id} className={'hf-roleitem' + (sel.id === r.id ? ' active' : '')} onClick={() => setSel(r)}>
              <Icon name="shield" size={16} style={{ color: sel.id === r.id ? 'var(--primary-700)' : 'var(--neutral-400)' }} />
              {r.name}
              <span className="rcount">{r.perms} izin</span>
            </div>
          ))}
        </div>
        <div className="card" style={{ padding: 22 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <b style={{ fontSize: 16 }}>{sel.name}</b><Badge cls="badge-slate" label={sel.perms + ' izin'} />
          </div>
          <p className="hf-muted" style={{ fontSize: 13, margin: '0 0 16px' }}>{sel.desc}</p>
          {Object.entries(perms).map(([grp, items]) => (
            <div key={grp}>
              <div className="hf-divlbl">{grp}</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {items.map(p => (
                  <label key={p.key} className="check" style={{ gap: 10, justifyContent: 'space-between', cursor: 'pointer' }}>
                    <span style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontWeight: 500, color: 'var(--neutral-900)', fontSize: 14 }}>{p.label}</span>
                      <span className="mono" style={{ fontSize: 11.5, color: 'var(--neutral-400)' }}>{p.key}</span>
                    </span>
                    <span className="switch">
                      <input type="checkbox" checked={p.on} onChange={() => toggle(grp, p.key)} />
                      <span className="track" /><span className="thumb" />
                    </span>
                  </label>
                ))}
              </div>
            </div>
          ))}
          <div className="dialog-foot" style={{ marginTop: 22 }}>
            <Button variant="secondary">Batal</Button>
            <Button variant="primary" onClick={() => toast({ variant: 'success', title: 'Berhasil', msg: 'Izin ' + sel.name + ' disimpan.' })}>Simpan Izin</Button>
          </div>
        </div>
      </div>
      <div className="alert alert-info" style={{ marginTop: 16 }}>
        <Icon name="info" size={18} style={{ color: 'var(--info-600)', flexShrink: 0 }} />
        <div><div className="alert-title">Visibilitas role-driven</div>Menyimpan izin mengubah sidebar: item tanpa <code>:read</code> disembunyikan (bukan dinonaktifkan) untuk pengguna peran tersebut.</div>
      </div>
    </div>
  );
}

/* ----------------------------------------------- SOON placeholder -- */
function SoonScreen({ label }) {
  return (
    <div className="hf-page hf-enter">
      <Crumbs items={[{ label: 'SWAT' }, { label: label || 'Layar' }]} />
      <PageHead title={label || 'Layar'} sub="Bagian dari struktur menu aplikasi SWAT." />
      <div className="hf-soon">
        <Illustration name="maintenance" size={230} style={{ margin: '0 auto 18px' }} />
        <span className="tag">Bagian dari IA aplikasi</span>
        <h3>{label || 'Layar ini'}</h3>
        <p>Menu ini ada pada aplikasi SWAT yang berjalan. Mockup hi-fi detail untuk layar ini dijadwalkan pada iterasi berikutnya — fokus saat ini pada alur transaksi inti.</p>
      </div>
    </div>
  );
}

Object.assign(window, { UserForm, UsersScreen, RolesScreen, SoonScreen });
