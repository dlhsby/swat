/* =====================================================================
   SWAT wireframes — app controller (v2)
   Doc rail · routing · annotation toggle · viewport (Desktop/Mobile/
   Compare) · collapsible product sidebar.
   ===================================================================== */
(function(){
  const ORDER = [
    'overview',
    'login','changepw','profile',
    'shell','dashboard','monitoring',
    'masterPattern','vehicle','vehicleForm',
    'crew','template','quota',
    'day','board','pickup','disposal','refuel','verify','reconcile',
    'user','role',
    'inventory','notes'
  ];

  /* ---- build the rail, grouped, with computed numbering ---- */
  const railList = document.getElementById('rail-list');
  let html = '', lastGroup = null, n = 0;
  for(const id of ORDER){
    const s = SCREENS[id];
    if(!s) continue;
    const ix = String(n++).padStart(2,'0');
    if(s.group !== lastGroup){
      html += '<div class="rail-grp"><p>'+s.group+'</p>';
      lastGroup = s.group;
    }
    html += '<a class="item" data-id="'+id+'"><span class="ix">'+ix+'</span>'+s.label+'</a>';
  }
  railList.innerHTML = html;

  const canvas = document.getElementById('canvas');
  const annot  = document.getElementById('annot');
  const body   = document.getElementById('stage-body');
  const barCrumb = document.getElementById('bar-crumb');
  const barRoute = document.getElementById('bar-route');

  let viewport = 'compare';        // 'desktop' | 'mobile' | 'compare'
  let annotOn = true;
  window.__sidebarCollapsed = false;
  let current = 'overview';
  window.__current = current;

  function noMobBlock(){
    return '<div class="no-mob"><div class="ic">▯</div><p><b>Tanpa versi mobile khusus.</b><br>Dokumen referensi — tata letak sama di semua perangkat.</p></div>';
  }
  function deskBlock(s){
    return '<div class="vp-block vp-desk"><div class="vp-label"><span class="g">▢</span>Desktop · lebar penuh</div>'+s.render()+'</div>';
  }
  function mobBlock(s){
    const inner = s.mobile ? s.mobile() : noMobBlock();
    return '<div class="vp-block vp-mob"><div class="vp-label"><span class="g">▯</span>Mobile · 390px</div>'+inner+'</div>';
  }

  function render(id){
    const s = SCREENS[id];
    if(!s) return;
    current = id;
    window.__current = id;
    const isDoc = s.chrome === 'doc';

    /* mobile drawer overlay is read by phoneScreen() in mobile.js */
    const activeLeaf = (typeof activeLeafFor==='function') ? activeLeafFor(id) : id;
    window.__mobileOverlay = (window.__mdrawer && (viewport==='mobile'||viewport==='compare') && typeof mobileDrawer==='function')
      ? mobileDrawer(activeLeaf) : '';

    let inner;
    if(viewport === 'desktop'){
      inner = '<div class="screen-stack">'+s.render()+'</div>';
    } else if(viewport === 'mobile'){
      if(isDoc)        inner = '<div class="screen-stack">'+s.render()+'</div>';
      else if(s.mobile)inner = '<div class="screen-stack mob-center">'+s.mobile()+'</div>';
      else             inner = '<div class="screen-stack mob-center">'+noMobBlock()+'</div>';
    } else { /* compare */
      if(isDoc)        inner = '<div class="screen-stack">'+s.render()+'</div>';
      else             inner = '<div class="screen-stack"><div class="compare">'+deskBlock(s)+mobBlock(s)+'</div></div>';
    }
    canvas.innerHTML = inner;
    canvas.scrollTop = 0; canvas.scrollLeft = 0;

    if(s.annot){
      annot.innerHTML = annotPanel(s.annot);
      body.classList.toggle('no-annot', !annotOn);
    } else {
      annot.innerHTML = '';
      body.classList.add('no-annot');
    }
    /* compare needs the full width — park annotations */
    if(viewport === 'compare'){
      body.classList.add('no-annot');
    }
    if(id==='generic' && window.__gen){
      barCrumb.innerHTML = window.__gen.path.map((p,i)=> i===window.__gen.path.length-1 ? '<b>'+p+'</b>' : p).join(' <span class="sep">/</span> ');
      barRoute.textContent = '';
    } else {
      barCrumb.innerHTML = s.crumb || s.label;
      barRoute.textContent = s.route || '';
    }

    document.querySelectorAll('.rail .item').forEach(a=>{
      a.classList.toggle('active', a.dataset.id===id);
    });
    try{ history.replaceState(null,'', '#'+(id==='generic' ? (window.__gen&&window.__gen.leafId||'generic') : id)); }catch(e){}
  }

  /* ---- navigation (used by sidebar, mobile drawer, bottom-nav, cards) ---- */
  function navigate(id, stubLeaf){
    if(id==='generic' && stubLeaf && typeof NODES!=='undefined' && NODES[stubLeaf]){
      const nd = NODES[stubLeaf];
      window.__gen = { leafId:stubLeaf, label:nd.label, kind:nd.stub||'soon', path:navPath(stubLeaf) };
    }
    window.__mdrawer = false;
    MHIST.push({ id:id, gen:window.__gen });
    render(id);
  }
  function goBack(){
    if(typeof MHIST==='undefined' || MHIST.length<2) return;
    MHIST.pop();
    const prev = MHIST[MHIST.length-1];
    window.__gen = prev.gen;
    render(prev.id);
  }

  /* ---- viewport segmented control ---- */
  const seg = document.getElementById('vp-seg');
  seg.addEventListener('click', function(e){
    const b = e.target.closest('button');
    if(!b) return;
    viewport = b.dataset.vp;
    seg.querySelectorAll('button').forEach(x=>x.classList.toggle('on', x===b));
    render(current);
  });

  /* ---- annotation toggle ---- */
  const toggle = document.getElementById('annot-toggle');
  const toggleInput = toggle.querySelector('input');
  toggle.addEventListener('click', function(){
    annotOn = !annotOn;
    toggleInput.checked = annotOn;
    toggle.setAttribute('aria-pressed', annotOn ? 'true' : 'false');
    const s = SCREENS[current];
    if(viewport !== 'compare' && s && s.annot) body.classList.toggle('no-annot', !annotOn);
  });

  /* ---- delegated interactions (survive re-render) ---- */
  document.addEventListener('click', function(e){
    /* collapse / expand the whole product sidebar */
    if(e.target.closest('.js-collapse')){
      window.__sidebarCollapsed = !window.__sidebarCollapsed;
      render(current); return;
    }
    /* expand / collapse a nav group (desktop sidebar + mobile drawer) */
    const tog = e.target.closest('[data-navtog]');
    if(tog){
      const gid = tog.dataset.navtog;
      if(window.__sidebarCollapsed){ window.__sidebarCollapsed = false; EXPANDED.add(gid); }
      else if(EXPANDED.has(gid)) EXPANDED.delete(gid); else EXPANDED.add(gid);
      render(current); return;
    }
    /* mobile drawer open / close */
    const dr = e.target.closest('[data-mdrawer]');
    if(dr){ window.__mdrawer = (dr.dataset.mdrawer==='open'); render(current); return; }
    /* mobile back */
    if(e.target.closest('[data-mback]')){ goBack(); return; }
    /* navigate to a wireframe screen */
    const nav = e.target.closest('[data-nav]');
    if(nav){ navigate(nav.dataset.nav); return; }
    /* navigate to a generic (un-wireframed) IA page */
    const stub = e.target.closest('[data-stub]');
    if(stub){ navigate('generic', stub.dataset.stub); return; }
  });

  /* ---- rail clicks ---- */
  railList.addEventListener('click', function(e){
    const a = e.target.closest('.item');
    if(!a) return;
    navigate(a.dataset.id);
  });

  /* ---- initial route ---- */
  const start = (location.hash || '').replace('#','');
  const startId = SCREENS[start] ? start : 'overview';
  MHIST.push({ id:startId, gen:null });
  render(startId);
})();
