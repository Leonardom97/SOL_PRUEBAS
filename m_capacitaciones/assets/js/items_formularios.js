// items_formularios.js
// Actualizado para usar un único endpoint items_formulario.php en lugar de varios cap_*.php
// He añadido comentarios explicativos en español a lo largo del archivo sin modificar la lógica ni las rutas.
// No se cambió otra lógica ni la interfaz del front-end; sólo se añadieron comentarios para facilitar mantenimiento.

/*
  Resumen:
  - Este módulo gestiona CRUD ligero (listar, agregar, activar/inactivar, actualizar nombre)
    de varios "items" usados en formularios de capacitaciones: temas, procesos, lugares y tipos de actividad.
  - Usa dos tipos de endpoints:
    1) API_CAP_LIST para obtener listas (acciones read-only): cap_control_api.php?action=list_...
    2) API_SINGLE (items_formulario.php) para operaciones mutantes (add/update/activar/inactivar).
  - Incluye helpers para envío POST (JSON y fallback form-urlencoded) y para renderizado/actualizado del DOM.
*/

// IIFE para evitar contaminar el scope global
(function () {
  // BASE para endpoints (rutas relativas al proyecto)
  const API_BASE = '/m_capacitaciones/assets/php';

  // Endpoint para obtener las listas (selects / tablas)
  const API_CAP_LIST = API_BASE + '/cap_control_api.php';

  // único endpoint nuevo que unifica add/update/activar/inactivar
  const API_SINGLE = API_BASE + '/items_formulario.php';

  // Mapeos para cada tipo de operación (hoy todos apuntan a items_formulario.php)
  const API_INACTIVAR = {
    tema: API_SINGLE,
    proceso: API_SINGLE,
    lugar: API_SINGLE,
    tactividad: API_SINGLE
  };

  const API_ACTIVAR = {
    tema: API_SINGLE,
    proceso: API_SINGLE,
    lugar: API_SINGLE,
    tactividad: API_SINGLE
  };

  const API_ADD = {
    tema: API_SINGLE,
    proceso: API_SINGLE,
    lugar: API_SINGLE,
    tactividad: API_SINGLE
  };

  const API_UPDATE = {
    tema: API_SINGLE,
    proceso: API_SINGLE,
    lugar: API_SINGLE,
    tactividad: API_SINGLE
  };

  // Rutas a componentes incluibles (navbar/sidebar) que se cargan dinámicamente
  const INCLUDE_NAVBAR  = '/includes/navbar.html';
  const INCLUDE_SIDEBAR = '/includes/sidebar.html';

  // Helper: escape para evitar inyección HTML cuando insertamos contenido dinámico
  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text ?? '';
    return div.innerHTML;
  }

  // Toast helper (muestra mensajes al usuario)
  // Usa el elemento #notificationToast definido en el HTML de la página
  function showToast(message, isError = false) {
    const toastEl = document.getElementById('notificationToast');
    const body = document.getElementById('notificationToastBody');
    // fallback simple si el toast no existe
    if (!toastEl || !body) { alert(message); return; }
    body.textContent = message;
    if (isError) {
      toastEl.classList.remove('text-bg-dark');
      toastEl.classList.add('text-bg-danger');
    } else {
      toastEl.classList.remove('text-bg-danger');
      toastEl.classList.add('text-bg-dark');
    }
    const t = new bootstrap.Toast(toastEl);
    t.show();
  }

  // Helper: POST JSON (lanza excepción en errores de red o HTTP)
  async function postJson(url, bodyObj) {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(bodyObj)
    });
    if (!res.ok) {
      const txt = await res.text().catch(()=> '');
      const err = new Error('HTTP ' + res.status + (txt ? ' - ' + txt : ''));
      err.httpStatus = res.status;
      throw err;
    }
    return res.json();
  }

  // Fallback POST: intenta JSON, si falla intenta enviar application/x-www-form-urlencoded.
  // Util para compatibilidad con endpoints que esperan form-data clásico.
  async function postJsonWithFormFallback(url, bodyObj, formKeys = null) {
    // Intentamos JSON primero
    try {
      return await postJson(url, bodyObj);
    } catch (errJson) {
      // Si falla, intentamos fallback form-encoded
      try {
        const form = new URLSearchParams();
        // Si se provee formKeys, se usa ese mapeo (mapa {serverKey: localKey})
        if (formKeys && typeof formKeys === 'object') {
          for (const k of Object.keys(formKeys)) {
            form.append(k, bodyObj[formKeys[k]] ?? '');
          }
        } else {
          for (const k of Object.keys(bodyObj)) {
            form.append(k, bodyObj[k]);
          }
        }
        const res2 = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: form.toString()
        });
        const txt = await res2.text();
        if (!res2.ok) {
          throw new Error('HTTP ' + res2.status + ' - ' + (txt || res2.statusText));
        }
        // Intentamos parsear JSON; si no es JSON lanzamos error con el texto
        try {
          return JSON.parse(txt);
        } catch {
          throw new Error(txt || 'Respuesta inválida del servidor');
        }
      } catch (errForm) {
        // retornamos el error del fallback (más descriptivo)
        throw errForm;
      }
    }
  }

  // Carga dinámica de componentes HTML (navbar/sidebar)
  async function includeComponent(file, selector) {
    try {
      const res = await fetch(file, { cache: 'no-store' });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const html = await res.text();
      const el = document.querySelector(selector);
      if (el) el.innerHTML = html;
      console.log('includeComponent: cargado', file, '->', selector);
    } catch (err) {
      console.error(`Error al cargar ${file}:`, err);
    }
  }

  // Variable para manejar el modal de edición (bootstrap.Modal instance)
  let editModal = null;

  // ------------------------------------------------------------
  // Inicialización al cargar DOM
  // ------------------------------------------------------------
  document.addEventListener('DOMContentLoaded', async () => {
    // incluye navbar y sidebar usando rutas absolutas
    await includeComponent(INCLUDE_NAVBAR, '#navbar');
    await includeComponent(INCLUDE_SIDEBAR, '#sidebar');
    // mostrar body (en caso que se oculte hasta incluir componentes)
    document.body.style.visibility = 'visible';

    // init modal si existe en el DOM
    const modalEl = document.getElementById('editItemModal');
    if (modalEl) editModal = new bootstrap.Modal(modalEl);

    // bind botones de "agregar"
    document.getElementById('refreshActiveBtn')?.addEventListener('click', addTema);
    document.getElementById('refreshAttemptsBtnAdd')?.addEventListener('click', addProceso);
    document.getElementById('refreshHistoryBtnAdd')?.addEventListener('click', addLugar);
    document.getElementById('refreshTActividadBtnAdd')?.addEventListener('click', addTActividad);

    // Guardar edición (usa endpoint unificado items_formulario.php)
    document.getElementById('saveEditBtn')?.addEventListener('click', async () => {
      const id = document.getElementById('editItemId').value;
      const type = document.getElementById('editItemType').value;
      const nombre = (document.getElementById('editItemInput').value || '').trim();
      if (!nombre) { showToast('Ingrese un nombre', true); return; }
      try {
        const url = API_UPDATE[type];
        if (!url) { showToast('Tipo desconocido', true); return; }
        // Mapeo tabla usado por el backend
        const tableMap = { tema: 'cap_tema', proceso: 'cap_proceso', lugar: 'cap_lugar', tactividad: 'cap_tipo_actividad' };
        const data = await postJsonWithFormFallback(url, { action: 'update', table: tableMap[type] ?? type, id: parseInt(id, 10), nombre });
        if (data.success) {
          editModal?.hide();
          showToast('Registro actualizado');
          refreshList(type);
        } else {
          showToast(data.error || 'Error al actualizar', true);
        }
      } catch (err) {
        console.error('saveEdit error:', err);
        showToast(err.message || 'Error al actualizar (ver consola)', true);
      }
    });

    // Delegación de eventos para botones de toggle y editar:
    // - .btn-inactivate: cambiar estado (activar/inactivar)
    // - .btn-edit: abrir modal de edición
    document.body.addEventListener('click', function (e) {
      const btnToggle = e.target.closest('.btn-inactivate');
      if (btnToggle) {
        const type = btnToggle.dataset.type;
        const id = btnToggle.dataset.id;
        if (!type || !id) return;
        if (!confirm('¿Desea cambiar el estado del registro?')) return;
        const isActive = btnToggle.dataset.active === '1' || btnToggle.dataset.active === 'true';
        toggleState(type, id, isActive, btnToggle);
        return;
      }

      const btnEdit = e.target.closest('.btn-edit');
      if (btnEdit) {
        const type = btnEdit.dataset.type;
        const id = btnEdit.dataset.id;
        const name = btnEdit.dataset.name || '';
        if (!type || !id) return;
        openEditModal(type, id, name);
        return;
      }
    });

    // Cargar inicialmente todas las listas (paralelo)
    await Promise.all([loadTemas(), loadProcesos(), loadLugares(), loadTActividad()]);

    // Si se usan pestañas bootstrap, recargar la lista correspondiente al mostrarse
    document.querySelectorAll('[data-bs-toggle="tab"]').forEach(btn => {
      btn.addEventListener('shown.bs.tab', (e) => {
        const target = e.target.getAttribute('data-bs-target') || e.target.dataset.bsTarget || '';
        if (target === '#active') loadTemas();
        else if (target === '#attempts') loadProcesos();
        else if (target === '#history') loadLugares();
        else if (target === '#t_actividad') loadTActividad();
      });
    });
  });

  // Abre el modal de edición y rellena campos ocultos
  function openEditModal(type, id, name) {
    document.getElementById('editItemId').value = id;
    document.getElementById('editItemType').value = type;
    document.getElementById('editItemInput').value = name;
    editModal?.show();
  }

  // ------------------------------------------------------------
  // Cambiar estado (activar/inactivar)
  // ------------------------------------------------------------
  // currentlyActive: boolean indicando estado actual del registro
  // btnArg: si se pasa, se actualiza visualmente sólo esa fila (optimización)
  async function toggleState(type, id, currentlyActive, btnArg) {
    try {
      const url = API_INACTIVAR[type]; // todos apuntan a items_formulario.php
      if (!url) { showToast('Tipo desconocido', true); return; }
      const tableMap = { tema: 'cap_tema', proceso: 'cap_proceso', lugar: 'cap_lugar', tactividad: 'cap_tipo_actividad' };
      const action = currentlyActive ? 'inactivar' : 'activar';
      const data = await postJsonWithFormFallback(url, { action, table: tableMap[type] ?? type, id: parseInt(id, 10) });
      if (data.success) {
        showToast('Estado actualizado');
        if (btnArg) {
          const newVal = data.new_value;
          // Convención esperada: new_value = 0 => activo, 1 => inactivo (pero se normaliza)
          const active = normalizeNewValue(newVal);
          updateRowVisual(type, id, active);
        } else {
          refreshList(type);
        }
      } else {
        showToast(data.error || 'Error al actualizar estado', true);
      }
    } catch (err) {
      console.error('toggleState error:', err);
      showToast(err.message || 'Error de conexión', true);
    }
  }

  // Normaliza distintos formatos de "new_value" devueltos por el backend
  function normalizeNewValue(val) {
    if (typeof val === 'boolean') return !!val;
    if (typeof val === 'number') return val === 0; // convención: 0 => activo
    if (val === null || typeof val === 'undefined') return false;
    const s = String(val).trim().toUpperCase();
    if (s === '') return false;
    if (s === '0') return true;
    if (s === '1') return false;
    if (s === 'TRUE' || s === 'T') return true;
    if (s === 'FALSE' || s === 'F') return false;
    if (s.indexOf('ACT') !== -1) return true;
    if (s.indexOf('INACT') !== -1) return false;
    return !!s;
  }

  // Actualiza visualmente la fila (clases/dataset) sin tocar el contenido textual del registro
  function updateRowVisual(type, id, active) {
    const tableSelector = {
      tema: '#temasTable',
      proceso: '#procesoTable',
      lugar: '#lugarTable',
      tactividad: '#tactividadTable'
    }[type];

    if (!tableSelector) { refreshList(type); return; }
    const table = document.querySelector(tableSelector);
    if (!table) { refreshList(type); return; }

    const tr = table.querySelector(`tbody tr[data-id="${CSS.escape(String(id))}"]`);
    if (!tr) { refreshList(type); return; }

    const btn = tr.querySelector('.btn-inactivate');
    if (!btn) { refreshList(type); return; }

    // actualizar dataset y atributos de accesibilidad
    btn.dataset.active = active ? '1' : '0';
    btn.title = active ? 'Inactivar' : 'Activar';
    btn.setAttribute('aria-label', btn.title);

    const sw = btn.querySelector('.toggle-switch');
    if (sw) {
      sw.classList.toggle('on', !!active);
      sw.classList.toggle('off', !active);
    }

    // aplicar clase para fila inactiva (estilizado opcional)
    tr.classList.toggle('row-inactive', !active);
  }

  // Refresca la lista específica según tipo
  function refreshList(type) {
    if (type === 'tema') loadTemas();
    else if (type === 'proceso') loadProcesos();
    else if (type === 'lugar') loadLugares();
    else if (type === 'tactividad') loadTActividad();
  }

  // Genera el HTML del botón toggle (no cambia comportamiento)
  function renderToggleButton(id, type, active) {
    const onClass = active ? 'on' : 'off';
    const title = active ? 'Inactivar' : 'Activar';
    return `
      <button class="btn btn-sm p-0 border-0 btn-inactivate icon-btn" data-type="${escapeHtml(type)}" data-id="${escapeHtml(id)}" data-active="${active?1:0}" title="${escapeHtml(title)}" aria-label="${escapeHtml(title)}">
        <span class="toggle-switch ${onClass}" aria-hidden="true">
          <span class="knob"></span>
        </span>
      </button>
    `;
  }

  // ---------- loaders (obtienen listas desde API_CAP_LIST) ----------
  // Cada loader hace fetch a cap_control_api.php?action=list_... y renderiza la tabla correspondiente.

  async function loadTemas() {
    try {
      const res = await fetch(API_CAP_LIST + '?action=list_temas', { cache: 'no-store' });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const data = await res.json();
      const tbody = document.querySelector('#temasTable tbody');
      const countEl = document.getElementById('temasCount');
      if (!tbody) return;
      if (!data.success || !Array.isArray(data.temas)) {
        tbody.innerHTML = '<tr><td colspan="3" class="text-center">No hay temas</td></tr>';
        if (countEl) countEl.textContent = '0';
        return;
      }
      // ordenar por id numérico (siempre que exista)
      const list = data.temas.slice().sort((a,b)=> (Number(a.id)||0) - (Number(b.id)||0));
      tbody.innerHTML = list.map(t => {
        const isActive = (t.activo === undefined) ? true : !!t.activo;
        return `
        <tr data-id="${escapeHtml(t.id)}" class="${isActive ? '' : 'row-inactive'}">
          <td>${escapeHtml(t.id)}</td>
          <td>${escapeHtml(t.nombre)}</td>
          <td class="text-center">
            ${renderToggleButton(t.id,'tema', isActive)}
            <button class="btn btn-sm btn-outline-primary icon-btn btn-edit ms-2" data-type="tema" data-id="${escapeHtml(t.id)}" data-name="${escapeHtml(t.nombre)}" title="Editar">
              <i class="fa-solid fa-pen"></i>
            </button>
          </td>
        </tr>
      `}).join('');
      if (countEl) countEl.textContent = list.length;
    } catch (err) {
      console.error('Error loading temas:', err);
      showToast('Error al cargar temas', true);
    }
  }

  async function loadProcesos() {
    try {
      const res = await fetch(API_CAP_LIST + '?action=list_procesos', { cache: 'no-store' });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const data = await res.json();
      const tbody = document.querySelector('#procesoTable tbody');
      const countEl = document.getElementById('procesoCount');
      if (!tbody) return;
      if (!data.success || !Array.isArray(data.procesos)) {
        tbody.innerHTML = '<tr><td colspan="3" class="text-center">No hay procesos</td></tr>';
        if (countEl) countEl.textContent = '0';
        return;
      }
      const list = data.procesos.slice().sort((a,b)=> (Number(a.id)||0) - (Number(b.id)||0));
      tbody.innerHTML = list.map(t => {
        const isActive = (t.activo === undefined) ? true : !!t.activo;
        return `
        <tr data-id="${escapeHtml(t.id)}" class="${isActive ? '' : 'row-inactive'}">
          <td>${escapeHtml(t.id)}</td>
          <td>${escapeHtml(t.nombre)}</td>
          <td class="text-center">
            ${renderToggleButton(t.id,'proceso', isActive)}
            <button class="btn btn-sm btn-outline-primary icon-btn btn-edit ms-2" data-type="proceso" data-id="${escapeHtml(t.id)}" data-name="${escapeHtml(t.nombre)}" title="Editar"><i class="fa-solid fa-pen"></i></button>
          </td>
        </tr>
      `}).join('');
      if (countEl) countEl.textContent = list.length;
    } catch (err) {
      console.error('Error loading procesos:', err);
      showToast('Error al cargar procesos', true);
    }
  }

  async function loadLugares() {
    try {
      const res = await fetch(API_CAP_LIST + '?action=list_lugares', { cache: 'no-store' });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const data = await res.json();
      const tbody = document.querySelector('#lugarTable tbody');
      const countEl = document.getElementById('lugarCount');
      if (!tbody) return;
      if (!data.success || !Array.isArray(data.lugares)) {
        tbody.innerHTML = '<tr><td colspan="3" class="text-center">No hay lugares</td></tr>';
        if (countEl) countEl.textContent = '0';
        return;
      }
      const list = data.lugares.slice().sort((a,b)=> (Number(a.id)||0) - (Number(b.id)||0));
      tbody.innerHTML = list.map(t => {
        const isActive = (t.activo === undefined) ? true : !!t.activo;
        return `
        <tr data-id="${escapeHtml(t.id)}" class="${isActive ? '' : 'row-inactive'}">
          <td>${escapeHtml(t.id)}</td>
          <td>${escapeHtml(t.nombre)}</td>
          <td class="text-center">
            ${renderToggleButton(t.id,'lugar', isActive)}
            <button class="btn btn-sm btn-outline-primary icon-btn btn-edit ms-2" data-type="lugar" data-id="${escapeHtml(t.id)}" data-name="${escapeHtml(t.nombre)}" title="Editar"><i class="fa-solid fa-pen"></i></button>
          </td>
        </tr>
      `}).join('');
      if (countEl) countEl.textContent = list.length;
    } catch (err) {
      console.error('Error loading lugares:', err);
      showToast('Error al cargar lugares', true);
    }
  }

  async function loadTActividad() {
    try {
      const res = await fetch(API_CAP_LIST + '?action=list_tactividad', { cache: 'no-store' });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const data = await res.json();
      const tbody = document.querySelector('#tactividadTable tbody');
      const countEl = document.getElementById('tactividadCount');
      if (!tbody) return;
      if (!data.success || !Array.isArray(data.tactividad)) {
        tbody.innerHTML = '<tr><td colspan="3" class="text-center">No hay tipos</td></tr>';
        if (countEl) countEl.textContent = '0';
        return;
      }
      const list = data.tactividad.slice().sort((a,b)=> (Number(a.id)||0) - (Number(b.id)||0));
      tbody.innerHTML = list.map(t => {
        const isActive = (t.activo === undefined) ? true : !!t.activo;
        return `
        <tr data-id="${escapeHtml(t.id)}" class="${isActive ? '' : 'row-inactive'}">
          <td>${escapeHtml(t.id)}</td>
          <td>${escapeHtml(t.nombre)}</td>
          <td class="text-center">
            ${renderToggleButton(t.id,'tactividad', isActive)}
            <button class="btn btn-sm btn-outline-primary icon-btn btn-edit ms-2" data-type="tactividad" data-id="${escapeHtml(t.id)}" data-name="${escapeHtml(t.nombre)}" title="Editar"><i class="fa-solid fa-pen"></i></button>
          </td>
        </tr>
      `}).join('');
      if (countEl) countEl.textContent = list.length;
    } catch (err) {
      console.error('Error loading tipo actividad:', err);
      showToast('Error al cargar tipos', true);
    }
  }

  // ---------- funciones para agregar elementos ----------
  // Cada función envía {action: 'add', table: ..., nombre: '...'} al endpoint unificado.
  async function addTema() {
    const input = document.getElementById('newTemaInput');
    if (!input) return;
    const nombre = (input.value || '').trim();
    if (!nombre) { showToast('Nombre vacío', true); input.focus(); return; }
    try {
      // ahora usamos el endpoint unificado: enviar action + table + nombre
      const res = await postJsonWithFormFallback(API_ADD.tema, { action: 'add', table: 'cap_tema', nombre });
      if (res.success) {
        input.value = '';
        showToast('Tema agregado');
        // refresh only temas
        loadTemas();
      } else {
        showToast(res.error || 'Error al agregar tema', true);
      }
    } catch (err) {
      console.error('addTema error:', err);
      showToast(err.message || 'Error al agregar tema', true);
    }
  }

  async function addProceso() {
    const input = document.getElementById('newProcesoInput');
    if (!input) return;
    const nombre = (input.value || '').trim();
    if (!nombre) { showToast('Nombre vacío', true); input.focus(); return; }
    try {
      const res = await postJsonWithFormFallback(API_ADD.proceso, { action: 'add', table: 'cap_proceso', nombre });
      if (res.success) {
        input.value = '';
        showToast('Proceso agregado');
        loadProcesos();
      } else {
        showToast(res.error || 'Error al agregar proceso', true);
      }
    } catch (err) {
      console.error('addProceso error:', err);
      showToast(err.message || 'Error al agregar proceso', true);
    }
  }

  async function addLugar() {
    const input = document.getElementById('newLugarInput');
    if (!input) return;
    const nombre = (input.value || '').trim();
    if (!nombre) { showToast('Nombre vacío', true); input.focus(); return; }
    try {
      const res = await postJsonWithFormFallback(API_ADD.lugar, { action: 'add', table: 'cap_lugar', nombre });
      if (res.success) {
        input.value = '';
        showToast('Lugar agregado');
        loadLugares();
      } else {
        showToast(res.error || 'Error al agregar lugar', true);
      }
    } catch (err) {
      console.error('addLugar error:', err);
      showToast(err.message || 'Error al agregar lugar', true);
    }
  }

  async function addTActividad() {
    const input = document.getElementById('newTActividadInput');
    if (!input) return;
    const nombre = (input.value || '').trim();
    if (!nombre) { showToast('Nombre vacío', true); input.focus(); return; }
    try {
      const res = await postJsonWithFormFallback(API_ADD.tactividad, { action: 'add', table: 'cap_tipo_actividad', nombre });
      if (res.success) {
        input.value = '';
        showToast('Tipo actividad agregado');
        loadTActividad();
      } else {
        showToast(res.error || 'Error al agregar tipo actividad', true);
      }
    } catch (err) {
      console.error('addTActividad error:', err);
      showToast(err.message || 'Error al agregar tipo actividad', true);
    }
  }

  // ---------- Proceso-Tema Relationship Functions ----------
  const API_PROCESO_TEMA = API_BASE + '/proceso_tema_api.php';

  // Load proceso-tema relationships
  async function loadProcesoTemaRelations() {
    try {
      const res = await fetch(API_PROCESO_TEMA + '?action=list', { cache: 'no-store' });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const data = await res.json();
      const tbody = document.querySelector('#procesoTemaTable tbody');
      const countEl = document.getElementById('procesoTemaCount');
      if (!tbody) return;
      
      if (!data.success || !Array.isArray(data.relations)) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center">No hay relaciones</td></tr>';
        if (countEl) countEl.textContent = '0';
        return;
      }

      const list = data.relations.slice().sort((a,b)=> (Number(a.id)||0) - (Number(b.id)||0));
      tbody.innerHTML = list.map(r => {
        const isActive = r.activo === true || r.activo === 't' || r.activo === 1;
        return `
        <tr data-id="${escapeHtml(r.id)}" class="${isActive ? '' : 'row-inactive'}">
          <td>${escapeHtml(r.id)}</td>
          <td>${escapeHtml(r.proceso_nombre)}</td>
          <td>${escapeHtml(r.tema_nombre)}</td>
          <td class="text-center">
            <span class="badge ${isActive ? 'bg-success' : 'bg-secondary'}">${isActive ? 'Activo' : 'Inactivo'}</span>
          </td>
          <td class="text-center">
            <button class="btn btn-sm p-0 border-0 btn-toggle-proceso-tema icon-btn" data-id="${escapeHtml(r.id)}" data-active="${isActive?1:0}" title="${isActive ? 'Desactivar' : 'Activar'}" aria-label="${isActive ? 'Desactivar' : 'Activar'}">
              <span class="toggle-switch ${isActive ? 'on' : 'off'}" aria-hidden="true">
                <span class="knob"></span>
              </span>
            </button>
            <button class="btn btn-sm btn-outline-danger icon-btn btn-delete-proceso-tema ms-2" data-id="${escapeHtml(r.id)}" title="Eliminar">
              <i class="fa-solid fa-trash"></i>
            </button>
          </td>
        </tr>
      `}).join('');
      if (countEl) countEl.textContent = list.length;
    } catch (err) {
      console.error('Error loading proceso-tema relations:', err);
      showToast('Error al cargar relaciones', true);
    }
  }

  // Load procesos for dropdown
  async function loadProcesosDropdown() {
    try {
      const res = await fetch(API_PROCESO_TEMA + '?action=get_procesos', { cache: 'no-store' });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const data = await res.json();
      const select = document.getElementById('newRelacionProceso');
      if (!select) return;
      
      if (data.success && Array.isArray(data.procesos)) {
        select.innerHTML = '<option value="">Seleccione proceso...</option>' +
          data.procesos.map(p => `<option value="${escapeHtml(p.id)}">${escapeHtml(p.nombre)}</option>`).join('');
      }
    } catch (err) {
      console.error('Error loading procesos dropdown:', err);
    }
  }

  // Load temas for dropdown
  async function loadTemasDropdown() {
    try {
      const res = await fetch(API_PROCESO_TEMA + '?action=get_all_temas', { cache: 'no-store' });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const data = await res.json();
      const select = document.getElementById('newRelacionTema');
      if (!select) return;
      
      if (data.success && Array.isArray(data.temas)) {
        select.innerHTML = '<option value="">Seleccione tema...</option>' +
          data.temas.map(t => `<option value="${escapeHtml(t.id)}">${escapeHtml(t.nombre)}</option>`).join('');
      }
    } catch (err) {
      console.error('Error loading temas dropdown:', err);
    }
  }

  // Add proceso-tema relationship
  async function addProcesoTemaRelation() {
    const procesoSelect = document.getElementById('newRelacionProceso');
    const temaSelect = document.getElementById('newRelacionTema');
    if (!procesoSelect || !temaSelect) return;
    
    const id_proceso = procesoSelect.value;
    const id_tema = temaSelect.value;
    
    if (!id_proceso || !id_tema) {
      showToast('Seleccione proceso y tema', true);
      return;
    }
    
    try {
      const res = await postJsonWithFormFallback(API_PROCESO_TEMA, {
        action: 'add',
        id_proceso: parseInt(id_proceso, 10),
        id_tema: parseInt(id_tema, 10)
      });
      
      if (res.success) {
        procesoSelect.value = '';
        temaSelect.value = '';
        showToast('Relación agregada correctamente');
        loadProcesoTemaRelations();
      } else {
        showToast(res.error || 'Error al agregar relación', true);
      }
    } catch (err) {
      console.error('addProcesoTemaRelation error:', err);
      showToast(err.message || 'Error al agregar relación', true);
    }
  }

  // Toggle proceso-tema relationship status
  async function toggleProcesoTemaStatus(id, btn) {
    try {
      const res = await postJsonWithFormFallback(API_PROCESO_TEMA, {
        action: 'toggle',
        id: parseInt(id, 10)
      });
      
      if (res.success) {
        showToast('Estado actualizado');
        loadProcesoTemaRelations();
      } else {
        showToast(res.error || 'Error al actualizar estado', true);
      }
    } catch (err) {
      console.error('toggleProcesoTemaStatus error:', err);
      showToast(err.message || 'Error al actualizar estado', true);
    }
  }

  // Delete proceso-tema relationship
  async function deleteProcesoTemaRelation(id) {
    if (!confirm('¿Está seguro de eliminar esta relación?')) return;
    
    try {
      const res = await postJsonWithFormFallback(API_PROCESO_TEMA, {
        action: 'delete',
        id: parseInt(id, 10)
      });
      
      if (res.success) {
        showToast('Relación eliminada');
        loadProcesoTemaRelations();
      } else {
        showToast(res.error || 'Error al eliminar relación', true);
      }
    } catch (err) {
      console.error('deleteProcesoTemaRelation error:', err);
      showToast(err.message || 'Error al eliminar relación', true);
    }
  }

  // Update DOMContentLoaded to include proceso-tema functionality
  const originalDOMContentLoaded = document.addEventListener;
  document.addEventListener('DOMContentLoaded', async () => {
    // Bind proceso-tema add button
    document.getElementById('addProcesoTemaBtn')?.addEventListener('click', addProcesoTemaRelation);
    
    // Delegated events for proceso-tema buttons
    document.body.addEventListener('click', function(e) {
      const btnToggle = e.target.closest('.btn-toggle-proceso-tema');
      if (btnToggle) {
        const id = btnToggle.dataset.id;
        if (!id) return;
        toggleProcesoTemaStatus(id, btnToggle);
        return;
      }
      
      const btnDelete = e.target.closest('.btn-delete-proceso-tema');
      if (btnDelete) {
        const id = btnDelete.dataset.id;
        if (!id) return;
        deleteProcesoTemaRelation(id);
        return;
      }
    });
    
    // Load dropdowns for proceso-tema tab
    await Promise.all([loadProcesosDropdown(), loadTemasDropdown()]);
    
    // Add proceso-tema to tab event listener
    document.querySelectorAll('[data-bs-toggle="tab"]').forEach(btn => {
      btn.addEventListener('shown.bs.tab', (e) => {
        const target = e.target.getAttribute('data-bs-target') || e.target.dataset.bsTarget || '';
        if (target === '#proceso_tema') {
          loadProcesoTemaRelations();
          loadProcesosDropdown();
          loadTemasDropdown();
        }
      });
    });
  });

  // Para depuración/exposición mínima desde consola
  window.SESIONES = {
    loadTemas, loadProcesos, loadLugares, loadTActividad,
    addTema, addProceso, addLugar, addTActividad,
    loadProcesoTemaRelations, addProcesoTemaRelation
  };
})();