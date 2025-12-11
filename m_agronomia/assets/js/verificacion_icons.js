/**
 * verificacion_icons.js
 * 
 * Sistema de iconos de verificación para tablas del módulo de agronomía.
 * 
 * Propósito:
 * - Gestiona los iconos de verificación/supervisión en todas las tablas del módulo.
 * - Sincroniza el estado de los registros (pendiente/aprobado/sin cambios) con la campana de notificaciones.
 * - Actualiza automáticamente los iconos cuando hay cambios en las tablas.
 * 
 * Funcionalidad:
 * - Obtiene la lista de IDs pendientes desde el servidor o desde window.PENDING_IDS.
 * - Pinta iconos de estado en la columna de supervisión de cada tabla.
 * - Utiliza MutationObserver para detectar cambios en las tablas y actualizar iconos.
 * - Actualiza iconos cada 5 segundos automáticamente.
 * 
 * Iconos:
 * - Reloj (amarillo): Registro pendiente por aprobar
 * - Check doble (verde): Registro aprobado
 * - Lápiz (azul): Sin cambios / en edición
 */
(function(){
  'use strict';
  // Mapeo de todas las tablas y sus columnas de ID y entidad correspondiente
  var MAP = {
    'tabla-capacitaciones':         { entidad: 'cosecha_fruta',          idCol: 'cosecha_fruta_id' },
    'tabla-reuniones':              { entidad: 'mantenimientos',         idCol: 'mantenimientos_id' },
    'tabla-asistencias':            { entidad: 'oficios_varios_palma',   idCol: 'oficios_varios_palma_id' },
    'tabla-inventarios':            { entidad: 'fertilizacion_organica', idCol: 'fertilizacion_organica_id' },
    'tabla-monitoreos-generales':   { entidad: 'monitoreos_generales',   idCol: 'monitoreos_generales_id' },
    'tabla-ct-cal-sanidad':         { entidad: 'ct_cal_sanidad',         idCol: 'ct_cal_sanidad_id' },
    'tabla-monitoreo-trampas':      { entidad: 'monitoreo_trampas',      idCol: 'monitoreo_trampas_id' },
    'tabla-nivel-freatico':         { entidad: 'nivel_freatico',         idCol: 'nivel_freatico_id' },
    'tabla-ct-cal-labores':         { entidad: 'ct_cal_labores',         idCol: 'ct_cal_labores_id' },
    'tabla-reporte-lote-monitoreo': { entidad: 'reporte_lote_monitoreo', idCol: 'reporte_lote_monitoreo_id' },
    'tabla-ct-cal-trampas':         { entidad: 'ct_cal_trampas',         idCol: 'ct_cal_trampas_id' },
    'tabla-compactacion':           { entidad: 'compactacion',           idCol: 'compactacion_id' },
    'tabla-plagas':                 { entidad: 'plagas',                 idCol: 'plagas_id' },
    'tabla-coberturas':             { entidad: 'coberturas',             idCol: 'coberturas_id' },
    'tabla-ct-polinizacion-flores': { entidad: 'ct_polinizacion_flores', idCol: 'ct_polinizacion_flores_id' },
    'tabla-aud-cosecha':            { entidad: 'aud_cosecha',            idCol: 'aud_cosecha_id' },
    'tabla-aud-fertilizacion':      { entidad: 'aud_fertilizacion',      idCol: 'aud_fertilizacion_id' },
    'tabla-aud-mantenimiento':      { entidad: 'aud_mantenimiento',      idCol: 'aud_mantenimiento_id' },
    'tabla-aud-perdidas':           { entidad: 'aud_perdidas',           idCol: 'aud_perdidas_id' },
    'tabla-aud-vagones':            { entidad: 'aud_vagones',            idCol: 'aud_vagones_id' },
    'tabla-labores-diarias':        { entidad: 'labores_diarias',        idCol: 'labores_diarias_id' },
    'tabla-polinizacion':           { entidad: 'polinizacion',           idCol: 'polinizacion_id' },
    'tabla-resiembra':              { entidad: 'resiembra',              idCol: 'resiembra_id' },
    'tabla-salida-vivero':          { entidad: 'salida_vivero',          idCol: 'salida_vivero_id' },
    'tabla-siembra-nueva':          { entidad: 'siembra_nueva',          idCol: 'siembra_nueva_id' }
  };
  // Tiempo de vida del caché (5 segundos)
  var TTL_MS = 5000;
  var CACHE = {};
  /**
   * Pinta el icono de supervisión en una celda según el estado del registro.
   * 
   * @param {HTMLElement} td - Celda de la tabla donde se pintará el icono
   * @param {string} estado - Estado del registro ('aprobado' u otro)
   * @param {boolean} isPendienteCampanita - Si el registro está pendiente en la campana
   */
  function pintarIconoSupervision(td, estado, isPendienteCampanita) {
    let meta;
    if (isPendienteCampanita) {
      meta = { cls:'fa-solid fa-clock text-warning', title:'Pendiente por aprobar' };
    } else if (estado === 'aprobado') {
      meta = { cls:'fa-solid fa-check-double text-success', title:'Aprobado' };
    } else {
      meta = { cls:'fas fa-edit text-primary', title:'Sin cambios' };
    }
    td.style.textAlign = 'center';
    td.style.verticalAlign = 'middle';
    td.innerHTML = `<i class="${meta.cls} supervision-icon" title="${meta.title}" aria-label="${meta.title}"></i>`;
    var verIcon = td.querySelector('.supervision-icon');
    if (verIcon) {
      verIcon.style.display = 'inline-flex';
      verIcon.style.alignItems = 'center';
      verIcon.style.justifyContent = 'center';
      verIcon.style.lineHeight = '1';
    }
  }
  /**
   * Normaliza una cadena de texto (minúsculas, sin acentos, sin espacios extra).
   * 
   * @param {*} s - Cadena a normalizar
   * @returns {string} Cadena normalizada
   */
  function norm(s){
    return (s==null?'':String(s))
      .toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g,'')
      .trim();
  }
  /**
   * Encuentra el índice de columna en una tabla por su atributo data-col.
   * 
   * @param {HTMLElement} table - Elemento tabla
   * @param {string} targetCol - Nombre de la columna buscada
   * @returns {number} Índice de la columna o -1 si no se encuentra
   */
  function findColIndexByDataCol(table,targetCol){
    var ths=table.querySelectorAll('thead th, thead td');
    if(!ths.length) return -1;
    var tgt=norm(targetCol);
    for(var i=0;i<ths.length;i++){
      var th=ths[i], el=th.querySelector('[data-col]');
      var dc=norm((el?el.getAttribute('data-col'):th.getAttribute('data-col'))||'');
      if(dc && dc===tgt) return i;
      var label=norm(th.textContent||'');
      if(!dc && label==='id' && /_id$/.test(tgt)) return i;
    }
    return -1;
  }
  /**
   * Encuentra el índice de columna por una lista de etiquetas posibles.
   * 
   * @param {HTMLElement} table - Elemento tabla
   * @param {Array<string>} labels - Array de etiquetas posibles
   * @returns {number} Índice de la columna o -1 si no se encuentra
   */
  function findIndexByLabels(table, labels){
    var ths=table.querySelectorAll('thead th, thead td');
    var keys=labels.map(norm);
    for(var i=0;i<ths.length;i++){
      var th=ths[i], el=th.querySelector('[data-col]');
      var dc=norm((el?el.getAttribute('data-col'):th.getAttribute('data-col'))||'');
      if(dc && keys.indexOf(dc)!==-1) return i;
      var label=norm(th.textContent||'');
      if(label && keys.indexOf(label)!==-1) return i;
    }
    return -1;
  }
  /**
   * Encuentra el índice de la columna de supervisión.
   * 
   * @param {HTMLElement} table - Elemento tabla
   * @returns {number} Índice de la columna de supervisión
   */
  function findSupervisionIndex(table){ return findIndexByLabels(table,['supervision']); }
  /**
   * Obtiene el ID de una celda desde checkbox, data-value o texto.
   * 
   * @param {HTMLElement} td - Celda de la tabla
   * @returns {string} ID del registro
   */
  function getCellTextId(td){
    if(!td) return '';
    var chk=td.querySelector('input[type="checkbox"][value]');
    if(chk && chk.value) return String(chk.value).trim();
    var v=td.getAttribute('data-value');
    if(v!=null && String(v).trim()!=='') return String(v).trim();
    return String(td.textContent||'').trim();
  }
  /**
   * Obtiene el set de IDs pendientes desde window.PENDING_IDS (campana de notificaciones).
   * 
   * @param {string} entidad - Nombre de la entidad
   * @returns {Set|null} Set de IDs pendientes o null si no existe
   */
  function getPendingFromWindow(entidad){
    var map=window.PENDING_IDS||{}; var raw=map[entidad];
    if(raw instanceof Set) return raw;
    if(Array.isArray(raw)) return new Set(raw.map(String));
    return null;
  }
  /**
   * Obtiene los IDs pendientes desde el servidor.
   * 
   * @param {string} entidad - Nombre de la entidad
   * @param {string} expectedIdCol - Nombre esperado de la columna ID
   * @returns {Promise} Promesa que resuelve con {set, idCol, source}
   */
  function fetchPendientes(entidad, expectedIdCol){
    var url='assets/php/pendientes_operaciones.php?entidad='+encodeURIComponent(entidad)+'&page=1&pageSize=1000';
    return fetch(url,{cache:'no-store'})
      .then(r=>r.text().then(t=>({ok:r.ok,status:r.status,text:t})))
      .then(res=>{
        if(!res.ok){ var e=new Error('HTTP '+res.status); e.payload=res.text; throw e; }
        var j=null; try{ j=JSON.parse(res.text);}catch(_){ throw new Error('JSON parse'); }
        var idCol=(j && (j.idCol||expectedIdCol||(entidad+'_id'))) || expectedIdCol || (entidad+'_id');
        var set=new Set((Array.isArray(j?.datos)?j.datos:[]).map(r=>String(r?.[idCol]??'').trim()).filter(Boolean));
        window.PENDING_IDS=window.PENDING_IDS||{};
        window.PENDING_IDS[entidad]=set;
        return { set:set, idCol:idCol, source:'server' };
      });
  }
  /**
   * Obtiene el set de IDs pendientes (desde caché, window o servidor).
   * 
   * @param {string} entidad - Nombre de la entidad
   * @param {string} expectedIdCol - Nombre esperado de la columna ID
   * @returns {Promise} Promesa que resuelve con {set, idCol, source}
   */
  function getPendingSet(entidad, expectedIdCol){
    var now=Date.now();
    if(CACHE[entidad] && (now-CACHE[entidad].ts)<TTL_MS){
      return Promise.resolve({ set:CACHE[entidad].set, idCol:CACHE[entidad].idCol||expectedIdCol, source:'cache' });
    }
    var winSet=getPendingFromWindow(entidad);
    if(winSet){
      CACHE[entidad]={ ts:now, set:winSet, idCol:expectedIdCol };
      return Promise.resolve({ set:winSet, idCol:expectedIdCol, source:'window' });
    }
    return fetchPendientes(entidad,expectedIdCol)
      .then(res=>{
        CACHE[entidad]={ ts:Date.now(), set:res.set, idCol:res.idCol };
        return res;
      })
      .catch(()=>{
        var empty=new Set();
        CACHE[entidad]={ ts:Date.now(), set:empty, idCol:expectedIdCol };
        return { set:empty, idCol:expectedIdCol, source:'none' };
      });
  }
  /**
   * Pinta los iconos de supervisión en todas las filas de una tabla.
   * 
   * @param {string} tableId - ID del elemento tabla
   */
  async function paintTable(tableId){
    var info=MAP[tableId];
    var table=document.getElementById(tableId);
    if(!info||!table) return;
    var idIdx=findColIndexByDataCol(table, info.idCol);
    var verIdx=findSupervisionIndex(table);
    if(idIdx<0 || verIdx<0){
      return;
    }
    // Get pending set for this entity
    const res = await getPendingSet(info.entidad, info.idCol);
    var set = res.set || new Set();
    var rows=table.querySelectorAll('tbody tr');
    rows.forEach(function(tr){
      var tds=tr.children;
      if(!tds || idIdx>=tds.length || verIdx>=tds.length) return;
      var tdId=tds[idIdx];
      var tdVer=tds[verIdx];
      var id=getCellTextId(tdId);
      // El valor del estado debe venir en atributo data-estado (ideal), si no, en td.textContent
      var estado = norm(tdVer.getAttribute('data-estado') || tdVer.textContent || '');
      var isPendienteCampanita = set.has(String(id));
      pintarIconoSupervision(tdVer, estado, isPendienteCampanita);
    });
  }
  /**
   * Pinta los iconos en todas las tablas mapeadas.
   */
  async function paintAll(){
    for (const tableId of Object.keys(MAP)) {
      await paintTable(tableId);
    }
  }
  /**
   * Función de debounce para limitar la frecuencia de ejecución.
   * 
   * @param {Function} fn - Función a ejecutar
   * @param {number} ms - Milisegundos de retraso
   * @returns {Function} Función con debounce aplicado
   */
  function debounce(fn,ms){ var to=null; return function(){ clearTimeout(to); var args=arguments, ctx=this; to=setTimeout(function(){ fn.apply(ctx,args); },ms); }; }
  var observers={};
  /**
   * Configura un MutationObserver para detectar cambios en una tabla.
   * 
   * @param {string} tableId - ID del elemento tabla
   */
  function ensureObserver(tableId){
    if(observers[tableId]) return;
    var table=document.getElementById(tableId); if(!table) return;
    var target=table.tBodies && table.tBodies[0] ? table.tBodies[0] : table;
    var repaint=debounce(function(){ paintTable(tableId); },80);
    var mo=new MutationObserver(function(muts){
      if(muts.some(function(m){return m.type==='childList';})) repaint();
    });
    mo.observe(target,{ childList:true, subtree:true });
    observers[tableId]=mo;
  }
  /**
   * Función pública para actualizar iconos de verificación.
   * Puede actualizar una tabla específica o todas las tablas.
   * 
   * @param {string} [tableId] - ID de tabla específica (opcional)
   */
  window.updateVerifIcons=function(tableId){
    if(tableId && MAP[tableId]){ paintTable(tableId); ensureObserver(tableId); }
    else { paintAll(); Object.keys(MAP).forEach(ensureObserver); }
  };
  var refreshTimer=null;
  // Inicialización cuando el DOM está listo
  document.addEventListener('DOMContentLoaded', function(){
    // Pintar iconos inicialmente
    paintAll();
    // Configurar observadores para todas las tablas
    Object.keys(MAP).forEach(ensureObserver);
    // Configurar actualización automática cada 5 segundos
    if(!refreshTimer){
      refreshTimer=setInterval(paintAll,5000);
    }
  });
  // Limpiar el timer antes de cerrar la página
  window.addEventListener('beforeunload', function(){
    if(refreshTimer){ clearInterval(refreshTimer); refreshTimer=null; }
  });
})();