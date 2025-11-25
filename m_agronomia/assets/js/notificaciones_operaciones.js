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

  // Config
  const forceGenericId = false;
  const sendBothIds = false; // no globalmente; lo forzamos solo para rechazar cosecha_fruta
  const CLICK_DEBOUNCE_MS = 400;

  const entityPretty = {
    cosecha_fruta: 'Cosecha Fruta',
    mantenimientos: 'Mantenimientos',
    oficios_varios_palma: 'Oficios Varios Palma',
    fertilizacion_organica: 'Fertilización Orgánica',
    monitoreos_generales: 'Monitoreos Generales',
    ct_cal_sanidad: 'Calidad Sanidad',
    monitoreo_trampas: 'Monitoreo Trampas',
    nivel_freatico: 'Nivel Freático',
    ct_cal_labores: 'Calidad Labores',
    reporte_lote_monitoreo: 'Reporte Lote Monitoreo',
    ct_cal_trampas: 'Calidad Trampas',
    compactacion: 'Compactación',
    plagas: 'Plagas'
  };

  const sectionToEntity = {
    'tab-content-capacitaciones': 'cosecha_fruta',
    'tab-content-reuniones': 'mantenimientos',
    'tab-content-asistencias': 'oficios_varios_palma',
    'tab-content-inventarios': 'fertilizacion_organica',
    'tab-content-monitoreos-generales': 'monitoreos_generales',
    'tab-content-ct-cal-sanidad': 'ct_cal_sanidad',
    'tab-content-monitoreo-trampas': 'monitoreo_trampas',
    'tab-content-nivel-freatico': 'nivel_freatico',
    'tab-content-ct-cal-labores': 'ct_cal_labores',
    'tab-content-reporte-lote-monitoreo': 'reporte_lote_monitoreo',
    'tab-content-ct-cal-trampas': 'ct_cal_trampas',
    'tab-content-compactacion': 'compactacion',
    'tab-content-plagas': 'plagas'
  };

  // DOM
  const btn = document.getElementById('noti-admin');
  const badge = document.getElementById('noti-badge');
  const modalEl = document.getElementById('modal-pendientes-mantenimientos');
  const cont = document.getElementById('pendientes-mantenimientos');
  if (!btn || !badge || !modalEl || !cont) return;

  let currentEntidad = null;
  let lastClickTs = 0;

  function escapeHtml(v) {
    if (v == null) return '';
    return String(v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }
  function norm(s){
    return (s==null?'':String(s)).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim();
  }
  function idColForEntidad(entidad){
    switch((entidad||'').toLowerCase()){
      case 'mantenimientos': return 'mantenimientos_id';
      case 'monitoreos_generales': return 'monitoreos_generales_id';
      case 'oficios_varios_palma': return 'oficios_varios_palma_id';
      case 'cosecha_fruta': return 'cosecha_fruta_id';
      case 'fertilizacion_organica': return 'fertilizacion_organica_id';
      case 'ct_cal_sanidad': return 'ct_cal_sanidad_id';
      case 'monitoreo_trampas': return 'monitoreo_trampas_id';
      case 'nivel_freatico': return 'nivel_freatico_id';
      case 'ct_cal_labores': return 'ct_cal_labores_id';
      case 'reporte_lote_monitoreo': return 'reporte_lote_monitoreo_id';
      case 'ct_cal_trampas': return 'ct_cal_trampas_id';
      case 'compactacion': return 'compactacion_id';
      case 'plagas': return 'plagas_id';
      default: return (entidad||'') + '_id';
    }
  }
  function detectEntidadFromVisibleSection(){
    const centerY = window.innerHeight/2;
    let best=null, bestDist=Infinity;
    Object.keys(sectionToEntity).forEach(id=>{
      const el=document.getElementById(id);
      if(!el) return;
      const style=getComputedStyle(el);
      if(style.display==='none'||style.visibility==='hidden'||style.opacity==='0') return;
      const r=el.getBoundingClientRect();
      const mid=(r.top+r.bottom)/2;
      const dist=Math.abs(mid-centerY);
      if(dist<bestDist){ bestDist=dist; best=sectionToEntity[id]; }
    });
    return best || currentEntidad || 'mantenimientos';
  }
  function setModalTitle(entidad){
    const h = modalEl.querySelector('.modal-title');
    if(!h) return;
    const pretty = entityPretty[entidad] || entidad || '';
    h.innerHTML = '<i class="fas fa-bell"></i> Pendientes de aprobación' + (pretty ? ' ('+escapeHtml(pretty)+')' : '');
  }
  function parseJsonSafe(resp){
    return resp.text().then(t=>{
      try { return JSON.parse(t); }
      catch(e){ throw new Error('Respuesta no válida (status '+resp.status+'): '+t.slice(0,300)); }
    });
  }

  // helper: suprimir sólo los mensajes exactos 'exception' y 'id_required'
  function shouldIgnoreServerMsg(m){
    if(m==null) return false;
    const s = String(m).trim().toLowerCase();
    return s === 'exception' || s === 'id_required';
  }
  function maybeServerAlert(prefix, serverMsg){
    if(shouldIgnoreServerMsg(serverMsg)){
      console.warn('[noti] alert suprimido por contenido del servidor:', serverMsg);
      return;
    }
    window.alert(prefix + serverMsg);
  }

  // enviarAccion genérico (usa entidad_api.php?action=accion)
  function enviarAccion(entidad, id, accion, idKey){
    const apiUrl = 'assets/php/'+entidad+'_api.php?action='+accion;
    const payload = {};
    if(forceGenericId){
      payload.id = String(id);
    }else{
      payload[idKey] = String(id);
      if(sendBothIds) payload.id = String(id);
    }
    // DEBUG log
    console.log('[noti] enviarAccion ->', apiUrl, payload);
    return fetch(apiUrl,{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify(payload)
    }).then(parseJsonSafe);
  }

  // render tabla
  function renderTablaDetallada(columnas, filas, entidad, fuente, idCol){
    const cols=Array.isArray(columnas)? columnas.slice():[];
    const rows=Array.isArray(filas)? filas:[];
    if(!cols.length || !rows.length){
      cont.innerHTML='<div class="alert alert-secondary mb-0">No hay registros pendientes de aprobación.</div>';
      return;
    }

    const accionesColName = cols.find(c => norm(c)==='acciones');
    const idKey = idCol || idColForEntidad(entidad);

    const thead='<thead class="table-light"><tr>'+
      cols.map(c=>'<th>'+escapeHtml(c)+'</th>').join('')+
      '<th>'+(accionesColName ? 'Aprobación':'Acciones')+'</th>'+
      '</tr></thead>';

    const tbody='<tbody>'+
      rows.map(r=>{
        const idVal = r && r[idKey]!=null ? String(r[idKey]) : '';
        const tds = cols.map(c=>{
          if(c===accionesColName){
            const raw = r ? (r[c] ?? '') : '';
            return '<td>'+(raw==null?'':String(raw))+'</td>';
          }
          return '<td>'+escapeHtml(r? r[c] : '')+'</td>';
        }).join('');
        const aprobacion =
          '<td style="white-space:nowrap;">'+
            '<button class="btn btn-sm btn-success md-aprobar" data-id="'+escapeHtml(idVal)+'" data-idcol="'+escapeHtml(idKey)+'" data-entidad="'+escapeHtml(entidad)+'" title="Aprobar"><i class="fa fa-check"></i></button>'+
            '<button class="btn btn-sm btn-outline-danger md-rechazar" data-id="'+escapeHtml(idVal)+'" data-idcol="'+escapeHtml(idKey)+'" data-entidad="'+escapeHtml(entidad)+'" style="margin-left:6px;" title="Rechazar"><i class="fa fa-times"></i></button>'+
          '</td>';
        return '<tr>'+tds+aprobacion+'</tr>';
      }).join('')+
      '</tbody>';

    cont.innerHTML=
      '<div class="table-responsive">'+
        '<table class="table table-sm table-striped align-middle">'+thead+tbody+'</table>'+
        (fuente?'<div class="text-muted small mt-2">Fuente: '+escapeHtml(fuente)+'</div>':'')+
      '</div>';

    bindDelegatedActions(entidad);
  }

  // bind actions: handle approve/reject. Special-case: for entity 'cosecha_fruta' and action 'rechazar'
  // send both keys and log response; otherwise use generic enviarAccion.
  function bindDelegatedActions(entidad){
    const table = cont.querySelector('table');
    if(!table) return;
    if(table._delegatedBound) return;
    table._delegatedBound = true;

    table.addEventListener('click', e=>{
      const btnTarget = e.target.closest('.md-aprobar, .md-rechazar');
      if(!btnTarget) return;

      const now = Date.now();
      if(now - lastClickTs < CLICK_DEBOUNCE_MS) return;
      lastClickTs = now;

      const isApprove = btnTarget.classList.contains('md-aprobar');
      const isReject  = btnTarget.classList.contains('md-rechazar');
      const id = btnTarget.getAttribute('data-id');
      const idKey = btnTarget.getAttribute('data-idcol') || idColForEntidad(entidad);
      const ent = btnTarget.getAttribute('data-entidad') || entidad;

      if(!id){
        console.warn('[noti] botón sin id'); return;
      }

      // Confirmación mínima
      const pretty = entityPretty[ent] || ent;
      const mensaje = isApprove
        ? '¿Estás seguro que deseas aprobar este registro' + (pretty ? ' ('+pretty+')' : '') + '?'
        : '¿Estás seguro que deseas RECHAZAR este registro' + (pretty ? ' ('+pretty+')' : '') + '?';
      if(!window.confirm(mensaje)) return;

      btnTarget.disabled = true;

      // SPECIAL CASE: cosecha_fruta rechazar -> enviar ambos ids y loguear respuesta
      if(ent === 'cosecha_fruta' && isReject){
        const apiUrl = 'assets/php/cosecha_fruta_api.php?action=rechazar';
        const payload = {
          cosecha_fruta_id: String(id),
          id: String(id)
        };
        console.log('[noti] RECHAZAR cosecha_fruta payload:', payload);
        fetch(apiUrl, {
          method: 'POST',
          headers: {'Content-Type':'application/json'},
          body: JSON.stringify(payload)
        })
        .then(parseJsonSafe)
        .then(r=>{
          console.log('[noti] respuesta rechazar (cosecha_fruta):', r);
          if(r && r.success){
            // refrescar y dar feedback
            loadPendientes();
            // optional: visual feedback
            // window.alert('Registro rechazado correctamente.');
          } else {
            // mostrar error para que el usuario sepa (no se suprime si no es 'exception'/'id_required')
            const serverMsg = r && (r.message || r.error) ? (r.message || r.error) : JSON.stringify(r);
            maybeServerAlert('No se pudo rechazar: ', serverMsg);
            console.warn('[noti] rechazar falló:', r);
            // refrescar para obtener la vista correcta
            setTimeout(loadPendientes, 600);
          }
        })
        .catch(err=>{
          console.error('[noti] error red al rechazar cosecha_fruta:', err);
          window.alert('Error de red al rechazar. Revisa la consola Network/Console.');
        })
        .finally(()=>{
          btnTarget.disabled = false;
        });
        return;
      }

      // default path: generic enviarAccion
      enviarAccion(ent, id, isApprove ? 'aprobar' : 'rechazar', idKey)
        .then(r=>{
          console.log('[noti] respuesta acción genérica:', r);
          if(r && r.success){
            loadPendientes();
          }else{
            if(r && (r.error==='id_required' || r.error==='exception')){
              console.warn('[noti] error silenciado:', r);
            }else{
              console.warn('[noti] acción falló:', r);
              // mostrar mensaje para visibilidad (suprimir sólo si el servidor devolvió 'exception' o 'id_required')
              const msg = r && (r.message || r.error) ? (r.message || r.error) : JSON.stringify(r);
              maybeServerAlert('No se pudo completar la acción: ', msg);
            }
          }
        })
        .catch(err=>{
          console.error('[noti] error de red:', err);
          window.alert('Error de red. Revisa la consola Network/Console.');
        })
        .finally(()=>{
          btnTarget.disabled = false;
        });
    });
  }

  function loadPendientes(){
    const ent = currentEntidad || detectEntidadFromVisibleSection();
    const url='assets/php/pendientes_operaciones.php?entidad='+encodeURIComponent(ent)+'&page=1&pageSize=500';
    fetch(url,{cache:'no-store'})
      .then(parseJsonSafe)
      .then(j=>{
        const idCol = j.idCol || idColForEntidad(ent);
        renderTablaDetallada(j.columnas, j.datos, ent, '', idCol);
        badge.textContent = (j.total != null ? j.total : (Array.isArray(j.datos) ? j.datos.length : 0));
      })
      .catch(e=>{
        cont.innerHTML='<div class="alert alert-warning mb-0">No se pudieron cargar los pendientes. '+escapeHtml(e.message)+'</div>';
      });
  }

  function setEntidad(entidad){
    const e=(entidad||'').toLowerCase();
    if(e===currentEntidad) return;
    currentEntidad=e;
    setModalTitle(currentEntidad);
  }

  btn.addEventListener('click', ()=>{
    setEntidad(detectEntidadFromVisibleSection());
    loadPendientes();
    if(modalEl && window.bootstrap && window.bootstrap.Modal){
      window.bootstrap.Modal.getOrCreateInstance(modalEl).show();
    }
  });

})();