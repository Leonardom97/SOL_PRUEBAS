(function(){
  'use strict';
  // --- override alert para suprimir solo 'exception' y 'id_required' ---
  (function(){
    const __orig_alert = window.alert && window.alert.bind(window);
    if(__orig_alert){
      const IGNORED = new Set(['exception','id_required']);
      window.alert = function(message){
        try {
          const s = (message === undefined || message === null) ? '' : String(message);
          const norm = s.trim().toLowerCase();
          if (IGNORED.has(norm)) {
            console.warn('[suppress_alerts] alert suprimido:', s);
            return;
          }
        } catch(e) {
          console.error('[suppress_alerts] error al evaluar alert:', e);
        }
        return __orig_alert(message);
      };
    }
  })();
  // ---------------------------------------------------------------

    const DOM={
    tbody:'tbody-fertilizacion-organica',
    table:'tabla-inventarios',
    pagination:'pagination-inventarios',
    exportBtn:'exportBtnFertilizacion',
    clearBtn:'clearFiltersBtn4',
    limitSelect:'limitSelect4',
    selectAll:'selectAll4',
    form:'form-editar',
    modal:'modal-editar'
  };
    const COLUMNAS=[
    'fertilizacion_organica_id','fecha_actividad','responsable','plantacion','finca','siembra','lote','parcela','linea_entrada','linea_salida','hora_entrada','hora_salida','labor_especifica','producto_aplicado','dosis_kg','unidad_aplicacion','contratista_colaborador','n_colaboradores','colaboradores','tipo_labor','contratista_maquinaria','n_operadores','tipo_maquina','nombre_operadores','bultos_aplicados','n_traslado','kg_aplicados','supervision'
  ];
  const API='assets/php/fertilizacion_organica_api.php';
  const ID_KEY='fertilizacion_organica_id';
  const DATE_COL='fecha_actividad';
  const ACTIONS={listFallback:['conexion','listar','list'],save:'upsert',inactivate:'inactivar',reject:'rechazar'};

  // Debounce for filter inputs
  const FILTER_DEBOUNCE_MS = 300;
  function debounce(fn, ms){
    let t;
    return function(...args){
      clearTimeout(t);
      t = setTimeout(()=>fn.apply(this,args), ms);
    };
  }

  let data=[], page=1, pageSize=25, total=0, filters={}, sortCol=null, sortAsc=true;

  function estado(r){ if(+r?.check===1||r?.supervision==='aprobado') return 'aprobado'; if((r?.supervision||'')==='pendiente') return 'pendiente'; return 'edicion'; }
  function icono(e){ if(e==='aprobado') return '<i class="fas fa-check" style="color:#27ff1b"></i>'; if(e==='pendiente') return '<i class="fas fa-edit" style="color:#fbc02d"></i>'; return '<i class="fas fa-ban" style="color:#bdbdbd"></i>'; }

  async function fetchData(){
    let last=''; for(const act of ACTIONS.listFallback){
      try{
        const qs=new URLSearchParams({action:act,page,pageSize});
        if(sortCol){ qs.append('ordenColumna',sortCol); qs.append('ordenAsc',sortAsc?'1':'0'); }
        // add normalized non-empty filters
        for(const k in filters){
          const v = filters[k];
          if(v == null) continue;
          const tv = String(v).trim();
          if(tv !== '') {
            qs.append('filtro_'+k, tv);
          }
        }
        // debug: show request url in console
        console.log('[fertilizacion_organica] request ->', `${API}?${qs.toString()}`);
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
    throw new Error('Error fetch fertilizacion_organica'+' => '+last);
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
        if(col==='supervision'){ td.dataset.estado = est; td.innerHTML = icono(est); } else td.textContent = row[col] ?? '';
        tr.appendChild(td);
      });
      const fecha=row[DATE_COL]||'', inactivo=(row.error_registro||'').toLowerCase()==='inactivo';
      const rol=(document.body.getAttribute('data-role')||'').toLowerCase();
      const isAsistAgronomico=/asist_agronómico/i.test(rol);
      let edit='', lock='';
      if(inactivo) lock = '<button class="md-btn md-btn-icon" disabled><i class="fa fa-lock"></i></button>';
      else if(isAsistAgronomico) { /* No edit button for Asist_Agronómico */ }
      else if(corte && fecha){
        if(fecha < corte) lock = '<button class="md-btn md-btn-icon" disabled><i class="fa fa-lock"></i></button>';
        else edit = `<button class="md-btn md-btn-icon btn-editar" data-id="${row[ID_KEY]}" title="Editar"><i class="fa fa-pen"></i></button>`;
      } else {
        edit = `<button class="md-btn md-btn-icon btn-editar" data-id="${row[ID_KEY]}" title="Editar"><i class="fa fa-pen"></i></button>`;
        lock = '<button class="md-btn md-btn-icon" disabled title="Sin fecha corte"><i class="fa fa-question-circle"></i></button>';
      }
      const tdAcc = document.createElement('td'); tdAcc.style.display='inline-flex';
      tdAcc.innerHTML = edit + `<button class="md-btn md-btn-icon btn-ver" data-id="${row[ID_KEY]}" title="Ver"><i class="fa fa-eye"></i></button>` + lock;
      tr.appendChild(tdAcc);
      const tdErr = document.createElement('td');
      const inact = (row.error_registro||'').toLowerCase() === 'inactivo';
      tdErr.innerHTML = inact ? '<span class="badge bg-secondary">Inactivo</span>' : `<button class="md-btn md-btn-icon btn-inactivar" data-id="${row[ID_KEY]}" title="Inactivar"><i class="fas fa-ban"></i></button>`;
      tr.appendChild(tdErr);

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
      if(j.success){ console.log('[fertilizacion_organica] inactivar ok', {id, result:j}); load(); }
      else {
        const err = j.error || 'Fallo inactivar';
        const norm = (err===null||err===undefined)?'':String(err).trim().toLowerCase();
        if(norm==='exception' || norm==='id_required'){ console.warn('[fertilizacion_organica] error suprimido:', err); }
        else { alert(err); }
      }
    }catch(err){
      const msg = err?.message || 'Error inactivar';
      const norm = (msg===null||msg===undefined)?'':String(msg).trim().toLowerCase();
      if(norm==='exception' || norm==='id_required'){ console.warn('[fertilizacion_organica] error suprimido:', msg); }
      else { alert(msg); }
    }
  }

  function openModal(id,readonly){
    const row = data.find(r=>r[ID_KEY]==id); if(!row) return;
    const cont = document.getElementById('campos-formulario');
    cont.innerHTML = COLUMNAS.filter(c=>!['supervision','error_registro'].includes(c)).map(c=>
      `<div class="col-md-6 mb-3">
        <label class="form-label">${c.replace(/_/g,' ')}</label>
        <input class="form-control" name="${c}" value="${row[c]??''}" ${(c===ID_KEY||readonly)?'readonly':''}>
      </div>`).join('');
    const footer = document.querySelector('#modal-editar .modal-footer');
    if(footer){
      footer.querySelectorAll('.icon-repeat-supervision').forEach(x=>x.remove());
      if((row.supervision==='aprobado' || row.check==1) && readonly){
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
      if(!j.success){
        const err = j.error || 'No revertido';
        const norm = (err===null||err===undefined)?'':String(err).trim().toLowerCase();
        if(norm==='exception' || norm==='id_required'){ console.warn('[fertilizacion_organica] error suprimido:', err); return; }
        alert(err); return;
      }
      await load(); openModal(id, false);
    }catch(err){
      const msg = err?.message || 'Error revertir';
      const norm = (msg===null||msg===undefined)?'':String(msg).trim().toLowerCase();
      if(norm==='exception' || norm==='id_required'){ console.warn('[fertilizacion_organica] error suprimido:', msg); return; }
      alert(msg);
    }
  }

  async function save(e){
    e.preventDefault();
    const fd = new FormData(e.target), obj={}; COLUMNAS.forEach(c=>obj[c]=fd.get(c));
    // Skip if the ID field for this entity is not present or empty (form is for another entity)
    const idValue = obj[ID_KEY];
    if (!idValue || String(idValue).trim() === '') {
      return;
    }
    const rol=(document.body.getAttribute('data-role')||'').toLowerCase();
    if(!/administrador|aux_agronomico/.test(rol)) obj.supervision='pendiente';
    try{
      const r = await fetch(`${API}?action=${ACTIONS.save}`, {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(obj)});
      const j = await r.json();
      if(j.success){ alert('Guardado'); load(); setTimeout(()=>bootstrap.Modal.getInstance(document.getElementById(DOM.modal))?.hide(),150); }
      else {
        const err = j.error || 'Error guardando';
        const norm = (err===null||err===undefined)?'':String(err).trim().toLowerCase();
        if(norm==='exception' || norm==='id_required'){ console.warn('[fertilizacion_organica] fallo guardar suprimido:', err); }
        else { alert(err); }
      }
    }catch(err){
      const msg = err?.message || 'Error guardando';
      const norm = (msg===null||msg===undefined)?'':String(msg).trim().toLowerCase();
      if(norm==='exception' || norm==='id_required'){ console.warn('[fertilizacion_organica] error guardando suprimido:', msg); }
      else { alert(msg); }
    }
  }

  function buildXLSX(rows,name){
    const cols = COLUMNAS.filter(c=>!['supervision'].includes(c));
    const head = cols.map(c=>c.toUpperCase());
    const body = rows.map(r=>cols.map(c=>r[c]??''));
    const ws = XLSX.utils.aoa_to_sheet([head, ...body]);
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'Hoja1'); XLSX.writeFile(wb, `${name}.xlsx`);
  }

  function exportar(t){
    if(t==='todo'){
      const qs = new URLSearchParams({action:ACTIONS.listFallback[0], page:1, pageSize:100000});
      fetch(`${API}?${qs}`).then(r=>r.json()).then(j=>buildXLSX((j.datos||j.data||[]),'fertilizacion_organica_todo')); return;
    }
    let rows = data;
    if(t==='seleccion'){
      rows = []; document.querySelectorAll(`#${DOM.tbody} .row-check`).forEach(ch=>{ if(ch.checked) rows.push(data[+ch.dataset.index]); });
    }
    buildXLSX(rows, 'fertilizacion_organica_'+t);
  }

  // Export menu style restored
  function showExportMenu(){
    const btn=document.getElementById(DOM.exportBtn); if(!btn) return;
    const id='exportMenuFertilizacion'; document.getElementById(id)?.remove();
    const menu=document.createElement('div'); menu.id=id;
    Object.assign(menu.style,{position:'absolute', top:'40px', right:'0', background:'#fff', boxShadow:'0 4px 16px rgba(0,0,0,.15)', borderRadius:'12px', padding:'8px', zIndex:1000, minWidth:'170px'});
    const items=['todo','filtrado','seleccion'];
    menu.innerHTML = items.map(t=>{
      const label = t==='todo'?'TODO': t==='filtrado'?'FILTRADO':'SELECCION';
      return `<button class="exp" data-t="${t}" style="display:block;width:100%;text-align:left;padding:8px 10px;margin:6px 0;border:2px solid #000;background:#fff;border-radius:6px;cursor:pointer">${label} (.xlsx)</button>`;
    }).join('');
    btn.parentNode.style.position='relative';
    btn.parentNode.appendChild(menu);
    menu.querySelectorAll('.exp').forEach(b=>b.addEventListener('click',()=>{
      exportar(b.dataset.t); menu.remove();
    }));
    setTimeout(()=>document.addEventListener('mousedown',function out(ev){
      if(!menu.contains(ev.target) && ev.target!==btn){ menu.remove(); document.removeEventListener('mousedown',out); }
    }),50);
  }

  function renderPagination(){
    const nav=document.getElementById(DOM.pagination); if(!nav) return;
    const ul = nav.querySelector('.md-pagination-list'); if(!ul) return; ul.innerHTML='';
    const pages = Math.max(1, Math.ceil(total/pageSize));
    function item(t,p,dis,act){
      const li=document.createElement('li'); li.className = dis ? 'disabled' : (act ? 'active' : '');
      const b=document.createElement('button'); b.className='page-link'; b.textContent=t; b.disabled=dis;
      b.onclick = ()=>{ if(!dis && p!==page){ page=p; load(); } };
      li.appendChild(b); return li;
    }
    ul.appendChild(item('«', Math.max(1,page-1), page===1, false));
    let start=Math.max(1,page-1), end=Math.min(pages, start+3); if(end-start<3) start=Math.max(1,end-3);
    for(let i=start;i<=end;i++) ul.appendChild(item(String(i), i, false, i===page));
    ul.appendChild(item('»', Math.min(pages, page+1), page===pages, false));
  }

  // Robust initFilters: map inputs using data-col/name or th.dataset; ignore checkboxes; add debounce + Enter
  function initFilters(){
    const table = document.getElementById(DOM.table);
    if(!table) { console.error('[fertilizacion_organica] tabla no encontrada:', DOM.table); return; }
    const thead = table.querySelector('thead');
    if(!thead) { console.error('[fertilizacion_organica] thead no encontrado'); return; }

    const inputs = Array.from(thead.querySelectorAll('input, select, textarea'));
    console.log('[fertilizacion_organica] inicializando filtros para', inputs.length, 'inputs');
    if(!inputs.length) { console.warn('[fertilizacion_organica] no se encontraron inputs en thead'); return; }

    inputs.forEach(inp=>{
      // ignore checkboxes (selection column)
      if(inp.type && inp.type.toLowerCase() === 'checkbox') return;

      // determine column name - prioritize data-col attribute
      let col = '';
      if(inp.dataset && inp.dataset.col) {
        col = inp.dataset.col;
      } else if(inp.name) {
        col = inp.name;
      } else {
        const th = inp.closest('th');
        if(th){
          if(th.dataset && (th.dataset.col || th.dataset.field)) {
            col = th.dataset.col || th.dataset.field;
          } else {
            // try matching header text -> COLUMNAS
            const headerText = (th.innerText || th.textContent || '').trim();
            const key = headerText.replace(/\s+/g,' ').trim().toLowerCase();
            if(key){
              const found = COLUMNAS.find(c=> c.toLowerCase().includes(key) || key.includes(c.toLowerCase()));
              if(found) col = found;
            }
          }
        }
      }

      if(!col) {
        // nothing mapped, skip
        console.debug('[fertilizacion_organica] input ignored (no col found):', inp);
        return;
      }

      // store mapping
      inp.dataset._col = col;

      // initialize filter from existing value
      const v = (inp.value == null) ? '' : String(inp.value);
      if(v.trim() !== '') filters[col] = v;

      // Remove old listeners if they exist
      if(inp._filterHandlers){
        inp.removeEventListener('input', inp._filterHandlers.input);
        inp.removeEventListener('change', inp._filterHandlers.change);
        inp.removeEventListener('keydown', inp._filterHandlers.keydown);
      }

      // Debounced handler
      const handlerDeb = debounce(function(evt){
        const val = (evt.target.value == null) ? '' : String(evt.target.value);
        filters[col] = val;
        page = 1;
        console.log('[fertilizacion_organica] aplicar filtro:', col, '=', val);
        load();
      }, FILTER_DEBOUNCE_MS);

      // Immediate on Enter
      function handlerKey(e){
        if(e.key === 'Enter'){
          e.preventDefault();
          const val = (e.target.value == null) ? '' : String(e.target.value);
          filters[col] = val;
          page = 1;
          console.log('[fertilizacion_organica] aplicar filtro (Enter):', col, '=', val);
          load();
        }
      }

      // Store handlers on the input element for later removal
      inp._filterHandlers = {
        input: handlerDeb,
        change: handlerDeb,
        keydown: handlerKey
      };

      // Add new listeners
      inp.addEventListener('input', handlerDeb);
      inp.addEventListener('change', handlerDeb);
      inp.addEventListener('keydown', handlerKey);
      console.log('[fertilizacion_organica] filtro configurado para columna:', col);
    });

    console.log('[fertilizacion_organica] filtros inicializados. Total columnas mapeadas:', Object.keys(filters).length);
  }

  async function load(){
    try{
      const res = await fetchData();
      data = res.datos || []; total = res.total || data.length;
      render();

      // after render, sync thead inputs with filters (so UI reflects current filter state)
      const table = document.getElementById(DOM.table);
      if(table){
        const thead = table.querySelector('thead');
        if(thead){
          Array.from(thead.querySelectorAll('input, select, textarea')).forEach(inp=>{
            const col = inp.dataset && inp.dataset._col ? inp.dataset._col : (inp.dataset && inp.dataset.col ? inp.dataset.col : (inp.name || ''));
            if(col && filters[col] !== undefined){
              const cur = filters[col] == null ? '' : String(filters[col]);
              if(inp.value !== cur) inp.value = cur;
            }
          });
        }
      }
    }catch(e){
      console.warn('[fertilizacion_organica] error cargar', e);
    }
  }

  function init(){
    document.getElementById(DOM.form)?.addEventListener('submit', save);
    document.getElementById(DOM.clearBtn)?.addEventListener('click', ()=>{
      console.log('[fertilizacion_organica] limpiando todos los filtros');
      filters={}; page=1;
      const table = document.getElementById(DOM.table);
      if(table){
        const thead = table.querySelector('thead');
        if(thead) {
          thead.querySelectorAll('input, select, textarea').forEach(i=> {
            if(i.type && i.type.toLowerCase() !== 'checkbox') {
              i.value = '';
            }
          });
        }
      }
      console.log('[fertilizacion_organica] filtros limpiados, recargando datos...');
      load();
    });
    document.getElementById(DOM.limitSelect)?.addEventListener('change', e=>{ pageSize = parseInt(e.target.value,10) || 25; page = 1; load(); });
    document.getElementById(DOM.selectAll)?.addEventListener('change', e=>{
      document.querySelectorAll(`#${DOM.tbody} .row-check`).forEach(ch=>ch.checked = e.target.checked);
    });
    document.querySelectorAll(`#${DOM.table} thead .icon-sort`).forEach(icon=>{
      icon.addEventListener('click', ()=>{ if(sortCol===icon.dataset.col) sortAsc = !sortAsc; else { sortCol = icon.dataset.col; sortAsc = true; } page = 1; load(); });
    });
    document.getElementById(DOM.exportBtn)?.addEventListener('click', e=>{ e.stopPropagation(); showExportMenu(); });

    // init filters and load data
    initFilters();
    load();
  }

  document.addEventListener('DOMContentLoaded', init);

})();