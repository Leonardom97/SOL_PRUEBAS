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
    tbody:'tbody-ct-cal-sanidad',
    table:'tabla-ct-cal-sanidad',
    pagination:'pagination-ct-cal-sanidad',
    exportBtn:'exportBtnSanidad',
    clearBtn:'clearFiltersBtnSanidad',
    limitSelect:'limitSelectSanidad',
    selectAll:'selectAllSanidad',
    form:'form-editar',
    modal:'modal-editar'
  };
    const COLUMNAS=[
    'ct_cal_sanidad_id','fecha','hora','responsable','labor','colaborador','plantacion','finca','siembra','lote','parcela','linea','palma','tipo_labor','estado','etapa','instar','verificacion','observaciones','supervision','error_registro'
  ];
  const API='assets/php/ct_cal_sanidad_api.php';
  const ID_KEY='ct_cal_sanidad_id';
  const DATE_COL='fecha';
  const ACTIONS={listFallback:['conexion','listar','list'],save:'upsert',inactivate:'inactivar',reject:'rechazar', activate:'activar'};

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
        console.log('[ct_cal_sanidad] request ->', `${API}?${qs.toString()}`);
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
    throw new Error('Error fetch ct_cal_sanidad'+' => '+last);
  }

  function render(){
    const tbody=document.getElementById(DOM.tbody); if(!tbody) return; tbody.innerHTML='';
    const corte = localStorage.getItem('fecha_corte') || '';
    data.forEach((row,i)=>{
      const est = estado(row);
      const tr = document.createElement('tr');
      tr.innerHTML = `<td><input type="checkbox" class="row-check" data-index="${i}"></td>`;
      COLUMNAS.forEach(col=>{
        if(col==='error_registro') return; // Skip - will be added after actions
        const td = document.createElement('td');
        if(col==='supervision'){ td.dataset.estado = est; td.innerHTML = icono(est); }
        else td.textContent = row[col] ?? '';
        tr.appendChild(td);
      });
      const fecha=row[DATE_COL]||'', inactivo=(row.error_registro||'').toLowerCase()==='inactivo';
      let edit='', lock='';
      if(inactivo) lock = '<button class="md-btn md-btn-icon" disabled><i class="fa fa-lock"></i></button>';
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
      // New: render error_registro as a switch + badge styled via CSS (.error-reg-badge)

      const tdError = document.createElement('td');

      const inactLower = (row.error_registro||'').toLowerCase();

      const isActive = inactLower !== 'inactivo';

      const switchId = 'errorSwitch' + row[ID_KEY];

      tdError.innerHTML = `

        <div class="form-check form-switch d-inline-block">

          <input class="form-check-input error-reg-switch" 

                 type="checkbox" 

                 role="switch"

                 id="${switchId}"

                 data-id="${row[ID_KEY]}"

                 ${isActive ? 'checked' : ''}

                 title="${isActive ? 'Inactivar registro' : 'Activar registro'}"

                 aria-label="${isActive ? 'Inactivar' : 'Activar'} registro ${row[ID_KEY]}">

          <label class="form-check-label small" for="${switchId}">

            <span class="error-reg-badge ${isActive ? 'active' : 'inactive'}">

              ${isActive ? 'Activo' : 'Inactivo'}

            </span>

          </label>

        </div>

      `;

      tr.appendChild(tdError);
      tbody.appendChild(tr);
    });
    bindRowEvents(); renderPagination();
  }

  function bindRowEvents(){


  const t = document.getElementById(DOM.tbody); if(!t) return;


  t.querySelectorAll('.btn-editar').forEach(b=>b.onclick = ()=>openModal(b.dataset.id, false));


  t.querySelectorAll('.btn-ver').forEach(b=>b.onclick = ()=>openModal(b.dataset.id, true));


  // bind switches


  t.querySelectorAll('.error-reg-switch').forEach(input=>{


    input.onchange = (e)=>{


      const id = input.dataset.id;


      const prevState = !input.checked; // previous state (before change)


      toggleErrorRegistro(id, prevState, input);


    };


  });


  }


  // Toggle error_registro state: if switch is checked => activate, else => inactivate
  async function toggleErrorRegistro(id, prevWasActive, switchElement){
    // prevWasActive indicates whether the record WAS active before the change
    // desired new state is based on switchElement.checked
    const desiredActive = !!switchElement.checked;
    const action = desiredActive ? ACTIONS.activate : ACTIONS.inactivate;
    const prompt = desiredActive ? '¿Activar registro?' : '¿Inactivar registro?';
    if(!confirm(prompt)){
      // user cancelled; revert switch to previous state
      switchElement.checked = !!prevWasActive;
      return;
    }

    try{
      const r = await fetch(`${API}?action=${action}`, {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({[ID_KEY]:id})});
      const j = await r.json();
      if(j.success){
        console.log('[ct_cal_sanidad] toggle error_registro ok', {id, action, result:j});
        // reload data to reflect badge and other UI changes
        await load();
      } else {
        const err = j.error || 'Fallo acción';
        const norm = (err===null||err===undefined)?'':String(err).trim().toLowerCase();
        if(norm==='exception' || norm==='id_required'){ console.warn('[ct_cal_sanidad] error suprimido:', err); }
        else { alert(err); }
        // revert UI on failure
        switchElement.checked = !!prevWasActive;
      }
    }catch(err){
      const msg = err?.message || 'Error al cambiar estado';
      const norm = (msg===null||msg===undefined)?'':String(msg).trim().toLowerCase();
      if(norm==='exception' || norm==='id_required'){ console.warn('[ct_cal_sanidad] error suprimido:', msg); }
      else { alert(msg); }
      // revert UI on error
      switchElement.checked = !!prevWasActive;
    }
  }

  async function inactivar(id){
    if(!confirm('¿Inactivar registro?')) return;
    try{
      const r = await fetch(`${API}?action=${ACTIONS.inactivate}`, {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({[ID_KEY]:id})});
      const j = await r.json();
      if(j.success){ console.log('[ct_cal_sanidad] inactivar ok', {id, result:j}); load(); }
      else {
        const err = j.error || 'Fallo inactivar';
        const norm = (err===null||err===undefined)?'':String(err).trim().toLowerCase();
        if(norm==='exception' || norm==='id_required'){ console.warn('[ct_cal_sanidad] error suprimido:', err); }
        else { alert(err); }
      }
    }catch(err){
      const msg = err?.message || 'Error inactivar';
      const norm = (msg===null||msg===undefined)?'':String(msg).trim().toLowerCase();
      if(norm==='exception' || norm==='id_required'){ console.warn('[ct_cal_sanidad] error suprimido:', msg); }
      else { alert(msg); }
    }
  }


  async function activar(id){
    // kept for backwards compatibility but not directly bound now
    if(!confirm('¿Activar registro?')) return;
    try{
      const r = await fetch(`${API}?action=${ACTIONS.activate}`, {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({[ID_KEY]:id})});
      const j = await r.json();
      if(j.success){ console.log('[ct_cal_sanidad] activar ok', {id, result:j}); load(); }
      else {
        const err = j.error || 'Fallo activar';
        const norm = (err===null||err===undefined)?'':String(err).trim().toLowerCase();
        if(norm==='exception' || norm==='id_required'){ console.warn('[ct_cal_sanidad] error suprimido:', err); }
        else { alert(err); }
      }
    }catch(err){
      const msg = err?.message || 'Error activar';
      const norm = (msg===null||msg===undefined)?'':String(msg).trim().toLowerCase();
      if(norm==='exception' || norm==='id_required'){ console.warn('[ct_cal_sanidad] error suprimido:', msg); }
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
        if(norm==='exception' || norm==='id_required'){ console.warn('[ct_cal_sanidad] error suprimido:', err); return; }
        alert(err); return;
      }
      await load(); openModal(id, false);
    }catch(err){
      const msg = err?.message || 'Error revertir';
      const norm = (msg===null||msg===undefined)?'':String(msg).trim().toLowerCase();
      if(norm==='exception' || norm==='id_required'){ console.warn('[ct_cal_sanidad] error suprimido:', msg); return; }
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
        if(norm==='exception' || norm==='id_required'){ console.warn('[ct_cal_sanidad] fallo guardar suprimido:', err); }
        else { alert(err); }
      }
    }catch(err){
      const msg = err?.message || 'Error guardando';
      const norm = (msg===null||msg===undefined)?'':String(msg).trim().toLowerCase();
      if(norm==='exception' || norm==='id_required'){ console.warn('[ct_cal_sanidad] error guardando suprimido:', msg); }
      else { alert(msg); }
    }
  }

  function buildXLSX(rows,name){
    const cols = COLUMNAS.filter(c=>!['error_registro','supervision'].includes(c));
    const head = cols.map(c=>c.toUpperCase());
    const body = rows.map(r=>cols.map(c=>r[c]??''));
    const ws = XLSX.utils.aoa_to_sheet([head, ...body]);
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'Hoja1'); XLSX.writeFile(wb, `${name}.xlsx`);
  }

  function exportar(t){
    if(t==='todo'){
      const qs = new URLSearchParams({action:ACTIONS.listFallback[0], page:1, pageSize:100000});
      fetch(`${API}?${qs}`).then(r=>r.json()).then(j=>buildXLSX((j.datos||j.data||[]),'ct_cal_sanidad_todo')); return;
    }
    let rows = data;
    if(t==='seleccion'){
      rows = []; document.querySelectorAll(`#${DOM.tbody} .row-check`).forEach(ch=>{ if(ch.checked) rows.push(data[+ch.dataset.index]); });
    }
    buildXLSX(rows, 'ct_cal_sanidad_'+t);
  }

  // Export menu style restored
  function showExportMenu(){
    const btn=document.getElementById(DOM.exportBtn); if(!btn) return;
    const id='exportMenuSanidad'; document.getElementById(id)?.remove();
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
    if(!table) { console.error('[ct_cal_sanidad] tabla no encontrada:', DOM.table); return; }
    const thead = table.querySelector('thead');
    if(!thead) { console.error('[ct_cal_sanidad] thead no encontrado'); return; }

    const inputs = Array.from(thead.querySelectorAll('input, select, textarea'));
    console.log('[ct_cal_sanidad] inicializando filtros para', inputs.length, 'inputs');
    if(!inputs.length) { console.warn('[ct_cal_sanidad] no se encontraron inputs en thead'); return; }

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
        console.debug('[ct_cal_sanidad] input ignored (no col found):', inp);
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
        console.log('[ct_cal_sanidad] aplicar filtro:', col, '=', val);
        load();
      }, FILTER_DEBOUNCE_MS);

      // Immediate on Enter
      function handlerKey(e){
        if(e.key === 'Enter'){
          e.preventDefault();
          const val = (e.target.value == null) ? '' : String(e.target.value);
          filters[col] = val;
          page = 1;
          console.log('[ct_cal_sanidad] aplicar filtro (Enter):', col, '=', val);
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
      console.log('[ct_cal_sanidad] filtro configurado para columna:', col);
    });

    console.log('[ct_cal_sanidad] filtros inicializados. Total columnas mapeadas:', Object.keys(filters).length);
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
      console.warn('[ct_cal_sanidad] error cargar', e);
    }
  }

  function init(){
    document.getElementById(DOM.form)?.addEventListener('submit', save);
    document.getElementById(DOM.clearBtn)?.addEventListener('click', ()=>{
      console.log('[ct_cal_sanidad] limpiando todos los filtros');
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
      console.log('[ct_cal_sanidad] filtros limpiados, recargando datos...');
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