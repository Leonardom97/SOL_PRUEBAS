(function(){
  'use strict';
  (function(){
    const __orig_alert = window.alert && window.alert.bind(window);
    if(__orig_alert){
      const IGNORED = new Set(['exception','id_required']);
      window.alert = function(message){
        try { const s = (message === undefined || message === null) ? '' : String(message); const norm = s.trim().toLowerCase(); if (IGNORED.has(norm)) { console.warn('[suppress_alerts] alert suprimido:', s); return; } } catch(e) { console.error('[suppress_alerts] error al evaluar alert:', e); }
        return __orig_alert(message);
      };
    }
  })();

  const DOM={
    tbody:'tbody-aud-cosecha',
    table:'tabla-aud-cosecha',
    pagination:'pagination-aud-cosecha',
    exportBtn:'exportBtnAudCosecha',
    clearBtn:'clearFiltersBtnAudCosecha',
    limitSelect:'limitSelectAudCosecha',
    selectAll:'selectAllAudCosecha',
    form:'form-editar',
    modal:'modal-editar'
  };
  const COLUMNAS=[
    'aud_cosecha_id','hora','responsable','labor_especifica','fecha_actividad','plantacion','siembra',
    'finca','lote','parcela','linea','palma','contratista','codigo','colaborador','tipo_labor',
    'racimos_optimos','racimos_verdes','racimos_sobremaduro','racimos_enfermos','racimos_pedunculo_largo',
    'palmas_hojas_mal_encalladas','palmas_hojas_picadas','racimo_sin_cosechar','corte_estrella',
    'palmas_sin_alistar','pepas_frescas_plato','pepas_frescas_fuera_plato','nuevo_colaborador','error_registro','supervision'
  ];
  const API='assets/php/aud_cosecha_api.php';
  const ID_KEY='aud_cosecha_id';
  const DATE_COL='fecha_actividad';
  const ACTIONS={listFallback:['conexion','listar','list'],save:'upsert',inactivate:'inactivar',reject:'rechazar'};

  const FILTER_DEBOUNCE_MS = 300;
  function debounce(fn, ms){ let t; return function(...args){ clearTimeout(t); t = setTimeout(()=>fn.apply(this,args), ms); }; }

  let data=[], page=1, pageSize=25, total=0, filters={}, sortCol=null, sortAsc=true;

  function estado(r){ if(+r?.check===1||r?.supervision==='aprobado') return 'aprobado'; if((r?.supervision||'')==='pendiente') return 'pendiente'; return 'edicion'; }
  function icono(e){ if(e==='aprobado') return '<i class="fas fa-check" style="color:#27ff1b"></i>'; if(e==='pendiente') return '<i class="fas fa-edit" style="color:#fbc02d"></i>'; return '<i class="fas fa-ban" style="color:#bdbdbd"></i>'; }

  async function fetchData(){
    let last=''; for(const act of ACTIONS.listFallback){
      try{
        const qs=new URLSearchParams({action:act,page,pageSize});
        if(sortCol){ qs.append('ordenColumna',sortCol); qs.append('ordenAsc',sortAsc?'1':'0'); }
        for(const k in filters){ const v = filters[k]; if(v == null) continue; const tv = String(v).trim(); if(tv !== '') qs.append('filtro_'+k, tv); }
        const r = await fetch(`${API}?${qs.toString()}`, {cache:'no-store'});
        if(!r.ok){ last = `${act}: HTTP ${r.status}`; continue; }
        const txt = await r.text();
        let j; try { j = JSON.parse(txt); } catch { last = `${act}: JSON`; continue; }
        if(Array.isArray(j)) return {datos:j, total:j.length};
        if(j.datos) return {datos:j.datos, total:j.total||j.datos.length};
        if(j.data) return {datos:j.data, total:j.total||j.data.length};
        const arr = Object.values(j).find(v=>Array.isArray(v)); if(arr) return {datos:arr, total:arr.length};
        last = `${act}: sin datos`;
      } catch(e){ last = `${act}: ${e.message}`; }
    }
    throw new Error('Error fetch '+ID_KEY+' => '+last);
  }

  function render(){
    const tbody=document.getElementById(DOM.tbody); if(!tbody) return; tbody.innerHTML='';
    const corte = localStorage.getItem('fecha_corte') || '';
    data.forEach((row,i)=>{
      const est = estado(row);
      const tr = document.createElement('tr');
      tr.innerHTML = `<td><input type="checkbox" class="row-check" data-index="${i}"></td>`;
      COLUMNAS.forEach(col=>{
        const td = document.createElement('td');
        if(col==='supervision'){ td.dataset.estado = est; td.innerHTML = icono(est); }
        else if(col==='error_registro'){
          const inact = (row.error_registro||'').toLowerCase() === 'inactivo';
          td.innerHTML = inact ? '<span class="badge bg-secondary">Inactivo</span>' : `<button class="md-btn md-btn-icon btn-inactivar" data-id="${row[ID_KEY]}" title="Inactivar"><i class="fas fa-ban"></i></button>`;
        } else td.textContent = row[col] ?? '';
        tr.appendChild(td);
      });
      const fecha=row[DATE_COL]||'', inactivo=(row.error_registro||'').toLowerCase()==='inactivo';
      let edit='', lock='';
      if(inactivo) lock = '<button class="md-btn md-btn-icon" disabled><i class="fa fa-lock"></i></button>';
      else if(corte && fecha){ if(fecha < corte) lock = '<button class="md-btn md-btn-icon" disabled><i class="fa fa-lock"></i></button>'; else edit = `<button class="md-btn md-btn-icon btn-editar" data-id="${row[ID_KEY]}" title="Editar"><i class="fa fa-pen"></i></button>`; }
      else { edit = `<button class="md-btn md-btn-icon btn-editar" data-id="${row[ID_KEY]}" title="Editar"><i class="fa fa-pen"></i></button>`; lock = '<button class="md-btn md-btn-icon" disabled title="Sin fecha corte"><i class="fa fa-question-circle"></i></button>'; }
      const tdAcc = document.createElement('td'); tdAcc.style.display='inline-flex';
      tdAcc.innerHTML = edit + `<button class="md-btn md-btn-icon btn-ver" data-id="${row[ID_KEY]}" title="Ver"><i class="fa fa-eye"></i></button>` + lock;
      tr.appendChild(tdAcc);
      tbody.appendChild(tr);
    });
    bindRowEvents(); renderPagination();
  }

  function bindRowEvents(){
    const t = document.getElementById(DOM.tbody); if(!t) return;
    t.querySelectorAll('.btn-editar').forEach(b=>b.onclick = ()=>openModal(b.dataset.id, false));
    t.querySelectorAll('.btn-ver').forEach(b=>b.onclick = ()=>openModal(b.dataset.id, true));
    t.querySelectorAll('.btn-inactivar').forEach(b=>b.onclick = ()=>inactivar(b.dataset.id));
  }

  async function inactivar(id){
    if(!confirm('¿Inactivar registro?')) return;
    try{
      const r = await fetch(`${API}?action=${ACTIONS.inactivate}`, {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({[ID_KEY]:id})});
      const j = await r.json();
      if(j.success){ load(); } else { const err = j.error || 'Fallo inactivar'; if(err.toLowerCase()!=='exception' && err.toLowerCase()!=='id_required') alert(err); }
    }catch(err){ const msg = err?.message || 'Error inactivar'; if(msg.toLowerCase()!=='exception' && msg.toLowerCase()!=='id_required') alert(msg); }
  }

  function openModal(id,readonly){
    const row = data.find(r=>r[ID_KEY]==id); if(!row) return;
    const cont = document.getElementById('campos-formulario');
    cont.innerHTML = COLUMNAS.filter(c=>!['supervision','error_registro'].includes(c)).map(c=>
      `<div class="col-md-6 mb-3"><label class="form-label">${c.replace(/_/g,' ')}</label><input class="form-control" name="${c}" value="${row[c]??''}" ${(c===ID_KEY||readonly)?'readonly':''}></div>`).join('');
    const footer = document.querySelector('#modal-editar .modal-footer');
    if(footer){
      footer.querySelectorAll('.icon-repeat-supervision').forEach(x=>x.remove());
      if(row.supervision==='aprobado' || row.check==1){
        const btn=document.createElement('button'); btn.type='button'; btn.className='btn btn-link icon-repeat-supervision';
        btn.title='Revertir aprobación'; btn.innerHTML='<i class="fa-solid fa-repeat" style="font-size:1.6em;color:#198754;"></i>';
        btn.onclick = ()=>revertir(id); footer.insertBefore(btn, footer.firstChild);
      }
      const sb = footer.querySelector('button[type="submit"]'); if(sb) sb.style.display = readonly ? 'none' : '';
    }
    new bootstrap.Modal(document.getElementById(DOM.modal)).show();
  }

  async function revertir(id){
    if(!confirm('¿Revertir aprobación?')) return;
    try{
      const r = await fetch(`${API}?action=${ACTIONS.reject}`, {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({[ID_KEY]:id})});
      const j = await r.json();
      if(!j.success){ const err = j.error || 'No revertido'; if(err.toLowerCase()!=='exception' && err.toLowerCase()!=='id_required') alert(err); return; }
      await load(); openModal(id, false);
    }catch(err){ const msg = err?.message || 'Error revertir'; if(msg.toLowerCase()!=='exception' && msg.toLowerCase()!=='id_required') alert(msg); }
  }

  async function save(e){
    e.preventDefault();
    const fd = new FormData(e.target), obj={}; COLUMNAS.forEach(c=>obj[c]=fd.get(c));
    const rol=(document.body.getAttribute('data-role')||'').toLowerCase();
    if(/administrador|aux_agronomico/.test(rol)) obj.supervision='aprobado';
    else obj.supervision='pendiente';
    try{
      const r = await fetch(`${API}?action=${ACTIONS.save}`, {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(obj)});
      const j = await r.json();
      if(j.success){ alert('Guardado'); load(); setTimeout(()=>bootstrap.Modal.getInstance(document.getElementById(DOM.modal))?.hide(),150); }
      else { const err = j.error || 'Error guardando'; if(err.toLowerCase()!=='exception' && err.toLowerCase()!=='id_required') alert(err); }
    }catch(err){ const msg = err?.message || 'Error guardando'; if(msg.toLowerCase()!=='exception' && msg.toLowerCase()!=='id_required') alert(msg); }
  }

  function buildXLSX(rows,name){
    const cols = COLUMNAS.filter(c=>!['error_registro','supervision'].includes(c));
    const head = cols.map(c=>c.toUpperCase());
    const body = rows.map(r=>cols.map(c=>r[c]??''));
    const ws = XLSX.utils.aoa_to_sheet([head, ...body]);
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'Hoja1'); XLSX.writeFile(wb, `${name}.xlsx`);
  }

  function exportar(t){
    if(t==='todo'){ const qs = new URLSearchParams({action:ACTIONS.listFallback[0], page:1, pageSize:100000}); fetch(`${API}?${qs}`).then(r=>r.json()).then(j=>buildXLSX((j.datos||j.data||[]),'aud_cosecha_todo')); return; }
    let rows = data;
    if(t==='seleccion'){ rows = []; document.querySelectorAll(`#${DOM.tbody} .row-check`).forEach(ch=>{ if(ch.checked) rows.push(data[+ch.dataset.index]); }); }
    buildXLSX(rows, 'aud_cosecha_'+t);
  }

  function showExportMenu(){
    const btn=document.getElementById(DOM.exportBtn); if(!btn) return;
    const id='exportMenuAudCosecha'; document.getElementById(id)?.remove();
    const menu=document.createElement('div'); menu.id=id;
    Object.assign(menu.style,{position:'absolute', top:'40px', right:'0', background:'#fff', boxShadow:'0 4px 16px rgba(0,0,0,.15)', borderRadius:'12px', padding:'8px', zIndex:1000, minWidth:'170px'});
    menu.innerHTML = ['todo','filtrado','seleccion'].map(t=>`<button class="exp" data-t="${t}" style="display:block;width:100%;text-align:left;padding:8px 10px;margin:6px 0;border:2px solid #000;background:#fff;border-radius:6px;cursor:pointer">${t.toUpperCase()} (.xlsx)</button>`).join('');
    btn.parentNode.style.position='relative'; btn.parentNode.appendChild(menu);
    menu.querySelectorAll('.exp').forEach(b=>b.addEventListener('click',()=>{ exportar(b.dataset.t); menu.remove(); }));
    setTimeout(()=>document.addEventListener('mousedown',function out(ev){ if(!menu.contains(ev.target) && ev.target!==btn){ menu.remove(); document.removeEventListener('mousedown',out); } }),50);
  }

  function renderPagination(){
    const nav=document.getElementById(DOM.pagination); if(!nav) return;
    const ul = nav.querySelector('.md-pagination-list'); if(!ul) return; ul.innerHTML='';
    const pages = Math.max(1, Math.ceil(total/pageSize));
    function item(t,p,dis,act){ const li=document.createElement('li'); li.className = dis ? 'disabled' : (act ? 'active' : ''); const b=document.createElement('button'); b.className='page-link'; b.textContent=t; b.disabled=dis; b.onclick = ()=>{ if(!dis && p!==page){ page=p; load(); } }; li.appendChild(b); return li; }
    ul.appendChild(item('«', Math.max(1,page-1), page===1, false));
    let start=Math.max(1,page-1), end=Math.min(pages, start+3); if(end-start<3) start=Math.max(1,end-3);
    for(let i=start;i<=end;i++) ul.appendChild(item(String(i), i, false, i===page));
    ul.appendChild(item('»', Math.min(pages, page+1), page===pages, false));
  }

  function initFilters(){
    const table = document.getElementById(DOM.table); if(!table) return;
    const thead = table.querySelector('thead'); if(!thead) return;
    const inputs = Array.from(thead.querySelectorAll('input, select, textarea'));
    inputs.forEach(inp=>{
      if(inp.type && inp.type.toLowerCase() === 'checkbox') return;
      let col = (inp.dataset && inp.dataset.col) ? inp.dataset.col : (inp.name || '');
      if(!col){ const th = inp.closest('th'); if(th) col = (th.dataset && (th.dataset.col || th.dataset.field)) || ''; }
      if(!col) return;
      inp.dataset._col = col;
      const v = (inp.value == null) ? '' : String(inp.value); if(v.trim() !== '') filters[col] = v;
      const handlerDeb = debounce(function(evt){ filters[col] = evt.target.value || ''; page = 1; load(); }, FILTER_DEBOUNCE_MS);
      function handlerKey(e){ if(e.key === 'Enter'){ e.preventDefault(); filters[col] = e.target.value || ''; page = 1; load(); } }
      inp.addEventListener('input', handlerDeb); inp.addEventListener('change', handlerDeb); inp.addEventListener('keydown', handlerKey);
    });
  }

  async function load(){
    try{ const res = await fetchData(); data = res.datos || []; total = res.total || data.length; render(); }catch(e){ console.warn('[aud_cosecha] error cargar', e); }
  }

  function init(){
    document.getElementById(DOM.form)?.addEventListener('submit', save);
    document.getElementById(DOM.clearBtn)?.addEventListener('click', ()=>{ filters={}; page=1; const table = document.getElementById(DOM.table); if(table){ const thead = table.querySelector('thead'); if(thead) thead.querySelectorAll('input, select, textarea').forEach(i=> i.value = ''); } load(); });
    document.getElementById(DOM.limitSelect)?.addEventListener('change', e=>{ pageSize = parseInt(e.target.value,10) || 25; page = 1; load(); });
    document.getElementById(DOM.selectAll)?.addEventListener('change', e=>{ document.querySelectorAll(`#${DOM.tbody} .row-check`).forEach(ch=>ch.checked = e.target.checked); });
    document.querySelectorAll(`#${DOM.table} thead .icon-sort`).forEach(icon=>{ icon.addEventListener('click', ()=>{ if(sortCol===icon.dataset.col) sortAsc = !sortAsc; else { sortCol = icon.dataset.col; sortAsc = true; } page = 1; load(); }); });
    document.getElementById(DOM.exportBtn)?.addEventListener('click', e=>{ e.stopPropagation(); showExportMenu(); });
    initFilters(); load();
  }

  document.addEventListener('DOMContentLoaded', init);
})();
