/* SWAT Design System — living style guide interactions */
(function () {
  'use strict';

  /* ---------- token data ---------- */
  var ramps = {
    primary: ['#ecfdf5','#d1fae5','#a7f3d0','#6ee7b7','#34d399','#10b981','#059669','#047857','#065f46','#064e3b','#022c22'],
    neutral: ['#ffffff','#f8fafc','#f1f5f9','#e2e8f0','#cbd5e1','#94a3b8','#64748b','#475569','#334155','#1e293b','#0f172a'],
    success: ['#f0fdf4','#dcfce7','#22c55e','#16a34a','#15803d'],
    warning: ['#fffbeb','#fef3c7','#f59e0b','#d97706','#b45309'],
    danger:  ['#fef2f2','#fee2e2','#ef4444','#dc2626','#b91c1c'],
    info:    ['#eff6ff','#dbeafe','#3b82f6','#2563eb','#1d4ed8']
  };
  var rampSteps = {
    primary: ['50','100','200','300','400','500','600','700','800','900','950'],
    neutral: ['0','50','100','200','300','400','500','600','700','800','900'],
    success: ['50','100','500','600','700'],
    warning: ['50','100','500','600','700'],
    danger:  ['50','100','500','600','700'],
    info:    ['50','100','500','600','700']
  };

  function luminance(hex) {
    var r = parseInt(hex.slice(1, 3), 16) / 255,
        g = parseInt(hex.slice(3, 5), 16) / 255,
        b = parseInt(hex.slice(5, 7), 16) / 255;
    var f = function (c) { return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
  }

  function copy(text) {
    if (navigator.clipboard) { navigator.clipboard.writeText(text).catch(function(){}); }
    var t = document.getElementById('copy-toast');
    t.textContent = text + ' disalin';
    t.classList.add('show');
    clearTimeout(copy._t);
    copy._t = setTimeout(function () { t.classList.remove('show'); }, 1100);
  }

  Object.keys(ramps).forEach(function (name) {
    var el = document.getElementById('ramp-' + name);
    if (!el) return;
    ramps[name].forEach(function (hex, i) {
      var token = (name === 'neutral' ? 'neutral' : name) + '-' + rampSteps[name][i];
      var dark = luminance(hex) < 0.45;
      var sw = document.createElement('div');
      sw.className = 'sw ' + (dark ? 'dark' : 'light');
      sw.style.background = hex;
      sw.innerHTML = '<span class="n">' + rampSteps[name][i] + '</span><span class="h">' + hex + '</span>';
      sw.title = 'Klik untuk menyalin ' + token;
      sw.addEventListener('click', function () { copy(token); });
      el.appendChild(sw);
    });
  });

  /* ---------- status pills ---------- */
  var statuses = [
    ['TripStatus.IN_PROGRESS', 'Belum Selesai', 'amber'],
    ['TripStatus.DONE', 'Selesai', 'blue'],
    ['TripStatus.VERIFIED', 'Terverifikasi', 'green'],
    ['DayStatus.IN_PROGRESS', 'Belum Selesai', 'amber'],
    ['DayStatus.DONE', 'Selesai', 'blue'],
    ['FuelQuotaStatus.ACTIVE', 'Berlaku', 'green'],
    ['FuelQuotaStatus.INACTIVE', 'Tidak Berlaku', 'slate'],
    ['VehicleStatus.GOOD', 'Baik', 'green'],
    ['VehicleStatus.MINOR_DAMAGE', 'Rusak Ringan', 'amber'],
    ['VehicleStatus.MAJOR_DAMAGE', 'Rusak Berat', 'red'],
    ['VehicleStatus.LOST', 'Hilang', 'slate'],
    ['MaintenanceStatus.PENDING_APPROVAL', 'Belum Disetujui', 'amber'],
    ['MaintenanceStatus.APPROVED', 'Disetujui', 'green']
  ];
  var sg = document.getElementById('status-grid');
  if (sg) {
    statuses.forEach(function (s) {
      var parts = s[0].split('.');
      var card = document.createElement('div');
      card.className = 'status-card';
      card.innerHTML =
        '<div class="lbl"><b>' + s[1] + '</b>' + parts[1] + '</div>' +
        '<span class="badge badge-' + s[2] + '"><span class="dot"></span>' + s[1] + '</span>';
      sg.appendChild(card);
    });
  }

  /* ---------- type specimens ---------- */
  var typeScale = [
    ['Pengangkutan Sampah', 'h1', '32 / 1.25 / 700', '32px', 700, 1.25],
    ['Daftar Kendaraan', 'h2', '24 / 1.33 / 700', '24px', 700, 1.33],
    ['Rincian Trayek', 'h3', '20 / 1.4 / 600', '20px', 600, 1.4],
    ['Paragraf utama untuk teks pengantar.', 'body-lg', '18 / 1.5 / 400', '18px', 400, 1.5],
    ['Teks isi default dan nilai field formulir.', 'body', '16 / 1.5 / 400', '16px', 400, 1.5],
    ['Teks sekunder dan sel tabel.', 'body-sm', '14 / 1.43 / 400', '14px', 400, 1.43],
    ['Label Formulir', 'label', '14 / 1.43 / 500', '14px', 500, 1.43],
    ['BADGE & TEKS BANTUAN', 'tiny', '12 / 1.5 / 500', '12px', 500, 1.5]
  ];
  var ts = document.getElementById('type-specimens');
  if (ts) {
    typeScale.forEach(function (t) {
      var row = document.createElement('div');
      row.className = 'spec';
      row.innerHTML =
        '<span style="font-size:' + t[3] + ';font-weight:' + t[4] + ';line-height:' + t[5] + ';color:var(--neutral-900)">' + t[0] + '</span>' +
        '<span class="smeta">' + t[1] + ' · ' + t[2] + '</span>';
      ts.appendChild(row);
    });
  }

  /* ---------- spacing scale ---------- */
  var spaces = [['xs', 4], ['sm', 8], ['md', 12], ['lg', 16], ['xl', 24], ['2xl', 32], ['3xl', 48]];
  var ss = document.getElementById('space-scale');
  if (ss) {
    spaces.forEach(function (s) {
      var row = document.createElement('div');
      row.className = 'space-row';
      row.innerHTML = '<span class="sl">space-' + s[0] + ' · ' + s[1] + 'px</span><span class="bar" style="width:' + s[1] * 3 + 'px"></span>';
      ss.appendChild(row);
    });
  }

  /* ---------- radius tiles ---------- */
  var radii = [['sm', '4px'], ['base', '6px'], ['lg', '8px'], ['full', '9999px']];
  var rt = document.getElementById('radius-tiles');
  if (rt) {
    radii.forEach(function (r) {
      var t = document.createElement('div');
      t.className = 'tile';
      t.innerHTML = '<div class="demo"><div style="width:48px;height:48px;background:var(--primary-100);border:1.5px solid var(--primary-600);border-radius:' + r[1] + '"></div></div>' +
        '<div class="tn">radius-' + r[0] + '</div><div class="tv">' + r[1] + '</div>';
      rt.appendChild(t);
    });
  }

  /* ---------- shadow tiles ---------- */
  var shadows = [
    ['subtle', '0 1px 2px 0 rgb(0 0 0 / .05)'],
    ['sm', '0 1px 3px 0 rgb(0 0 0 / .1), 0 1px 2px -1px rgb(0 0 0 / .1)'],
    ['base', '0 4px 6px -1px rgb(0 0 0 / .1), 0 2px 4px -2px rgb(0 0 0 / .1)'],
    ['lg', '0 10px 15px -3px rgb(0 0 0 / .1), 0 4px 6px -4px rgb(0 0 0 / .1)']
  ];
  var sht = document.getElementById('shadow-tiles');
  if (sht) {
    shadows.forEach(function (s) {
      var t = document.createElement('div');
      t.className = 'tile';
      t.innerHTML = '<div class="demo"><div style="width:54px;height:40px;background:#fff;border-radius:6px;box-shadow:' + s[1] + '"></div></div>' +
        '<div class="tn">shadow-' + s[0] + '</div>';
      sht.appendChild(t);
    });
  }

  /* ---------- z-index rows ---------- */
  var zs = [['z-raised', 10, 'header tabel lengket'], ['z-sticky', 100, 'topbar'], ['z-fixed', 200, 'sidebar / drawer'],
    ['z-overlay', 1000, 'backdrop dialog'], ['z-modal', 1010, 'panel dialog & sheet'], ['z-popover', 1020, 'select · combobox · popover'],
    ['z-toast', 1030, 'toast'], ['z-tooltip', 1040, 'tooltip']];
  var zr = document.getElementById('z-rows');
  if (zr) {
    zs.forEach(function (z) {
      var tr = document.createElement('tr');
      tr.innerHTML = '<td class="mono" style="color:var(--neutral-800)">' + z[0] + '</td><td class="num">' + z[1] + '</td><td style="color:var(--neutral-500)">' + z[2] + '</td>';
      zr.appendChild(tr);
    });
  }

  /* ---------- demo table + sorting ---------- */
  var data = [
    { plate: 'L 1234 AB', driver: 'Budi Santoso', ritase: 5, tonase: 12.75, status: ['green', 'Terverifikasi'] },
    { plate: 'L 8821 CD', driver: 'Slamet Riyadi', ritase: 3, tonase: 8.20, status: ['amber', 'Belum Selesai'] },
    { plate: 'L 4490 EF', driver: 'Agus Wibowo', ritase: 4, tonase: 10.40, status: ['blue', 'Selesai'] },
    { plate: 'L 6712 GH', driver: 'Hendra Kusuma', ritase: 6, tonase: 15.10, status: ['green', 'Terverifikasi'] },
    { plate: 'L 3098 IJ', driver: 'Rizal Pratama', ritase: 2, tonase: 5.60, status: ['amber', 'Belum Selesai'] }
  ];
  var sortKey = null, sortDir = 1;
  function renderRows() {
    var rows = data.slice();
    if (sortKey) {
      rows.sort(function (a, b) {
        var x = a[sortKey], y = b[sortKey];
        if (typeof x === 'string') return x.localeCompare(y) * sortDir;
        return (x - y) * sortDir;
      });
    }
    var body = document.getElementById('demo-rows');
    body.innerHTML = '';
    rows.forEach(function (r) {
      var tr = document.createElement('tr');
      tr.innerHTML =
        '<td class="mono" style="color:var(--neutral-900);font-weight:500">' + r.plate + '</td>' +
        '<td>' + r.driver + '</td>' +
        '<td class="num">' + r.ritase + '</td>' +
        '<td class="num">' + r.tonase.toLocaleString('id-ID', { minimumFractionDigits: 2 }) + '</td>' +
        '<td><span class="badge badge-' + r.status[0] + '"><span class="dot"></span>' + r.status[1] + '</span></td>' +
        '<td style="text-align:right;white-space:nowrap"><button class="btn btn-ghost btn-sm" aria-label="Lihat">Lihat</button><button class="btn btn-ghost btn-sm" aria-label="Ubah">Ubah</button></td>';
      body.appendChild(tr);
    });
  }
  renderRows();
  Array.prototype.forEach.call(document.querySelectorAll('#demo-table th.sortable'), function (th) {
    th.addEventListener('click', function () {
      var k = th.getAttribute('data-k');
      if (sortKey === k) sortDir *= -1; else { sortKey = k; sortDir = 1; }
      Array.prototype.forEach.call(document.querySelectorAll('#demo-table th'), function (h) {
        h.removeAttribute('aria-sort');
        var ic = h.querySelector('.sort-ico'); if (ic) ic.textContent = '↕';
      });
      th.setAttribute('aria-sort', sortDir === 1 ? 'ascending' : 'descending');
      th.querySelector('.sort-ico').textContent = sortDir === 1 ? '↑' : '↓';
      renderRows();
    });
  });

  /* ---------- dialogs ---------- */
  function bindModal(triggerId, scrimId) {
    var trig = document.getElementById(triggerId), scrim = document.getElementById(scrimId);
    if (!trig || !scrim) return;
    function close() { scrim.classList.remove('open'); }
    trig.addEventListener('click', function () { scrim.classList.add('open'); });
    scrim.addEventListener('click', function (e) { if (e.target === scrim) close(); });
    Array.prototype.forEach.call(scrim.querySelectorAll('[data-close]'), function (b) { b.addEventListener('click', close); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(); });
  }
  bindModal('open-dialog', 'dialog-scrim');
  bindModal('open-confirm', 'confirm-scrim');

  /* ---------- toasts ---------- */
  var toastCfg = {
    success: ['toast-success', 'Berhasil', 'Data berhasil disimpan.'],
    error: ['toast-error', 'Gagal', 'Nomor polisi sudah ada.'],
    warning: ['toast-warning', 'Peringatan', 'Anda sedang offline.']
  };
  function fireToast(kind) {
    var c = toastCfg[kind], stack = document.getElementById('toast-stack');
    var el = document.createElement('div');
    el.className = 'toast ' + c[0];
    el.setAttribute('role', kind === 'error' || kind === 'warning' ? 'alert' : 'status');
    el.innerHTML = '<div style="flex:1"><div class="toast-title">' + c[1] + '</div><div style="color:var(--neutral-600)">' + c[2] + '</div></div><span style="color:var(--neutral-400);cursor:pointer">✕</span>';
    el.querySelector('span').addEventListener('click', function () { el.remove(); });
    stack.appendChild(el);
    setTimeout(function () { el.remove(); }, kind === 'success' ? 3000 : 5000);
  }
  ['success', 'error', 'warning'].forEach(function (k) {
    var b = document.getElementById('t-' + k);
    if (b) b.addEventListener('click', function () { fireToast(k); });
  });

  /* ---------- calendar (DatePicker demo) ---------- */
  var calGrid = document.getElementById('cal-grid');
  if (calGrid) {
    var dows = ['Sn', 'Sl', 'Rb', 'Km', 'Jm', 'Sb', 'Mg'];
    dows.forEach(function (d) {
      var s = document.createElement('span'); s.className = 'cdow'; s.textContent = d; calGrid.appendChild(s);
    });
    // March 2026 starts on Sunday → 6 leading blanks (Mon-first grid)
    var lead = 6, days = 31, today = 12, sel = 15;
    for (var i = 0; i < lead; i++) { var pad = document.createElement('button'); pad.className = 'muted'; pad.textContent = 22 + i; calGrid.appendChild(pad); }
    for (var d2 = 1; d2 <= days; d2++) {
      var b = document.createElement('button');
      b.textContent = d2;
      if (d2 === today) b.className = 'today';
      if (d2 === sel) b.className = 'sel';
      calGrid.appendChild(b);
    }
  }

  /* ---------- tabs ---------- */
  var tabPanels = [
    'Panel “Ringkasan”: rute, waktu & odometer tercatat, pencatat, dan waktu pencatatan.',
    'Panel “Timbangan”: berat kosong, berat kotor, dan berat bersih (dihitung otomatis).',
    'Panel “Bahan Bakar”: jumlah diminta vs disetujui, jenis BBM, dan waktu pengisian.'
  ];
  var tabs = document.querySelectorAll('#demo-tabs .tab');
  Array.prototype.forEach.call(tabs, function (tab, i) {
    tab.addEventListener('click', function () {
      Array.prototype.forEach.call(tabs, function (t) { t.setAttribute('aria-selected', 'false'); });
      tab.setAttribute('aria-selected', 'true');
      document.getElementById('tab-panel').textContent = tabPanels[i];
    });
  });

  /* ---------- tooltip ---------- */
  var anchor = document.getElementById('tip-anchor'), tip = document.getElementById('tip');
  if (anchor && tip) {
    var show = function () { tip.style.display = 'block'; };
    var hide = function () { tip.style.display = 'none'; };
    anchor.addEventListener('mouseenter', show);
    anchor.addEventListener('mouseleave', hide);
    anchor.addEventListener('focusin', show);
    anchor.addEventListener('focusout', hide);
  }

  /* ---------- scrollspy nav ---------- */
  var links = Array.prototype.slice.call(document.querySelectorAll('.nlink'));
  var sections = links.map(function (l) { return document.querySelector(l.getAttribute('href')); }).filter(Boolean);
  function spy() {
    var pos = window.scrollY + 120, active = sections[0];
    sections.forEach(function (s) { if (s.offsetTop <= pos) active = s; });
    links.forEach(function (l) {
      l.classList.toggle('active', l.getAttribute('href') === '#' + (active && active.id));
    });
  }
  window.addEventListener('scroll', spy, { passive: true });
  spy();
})();
