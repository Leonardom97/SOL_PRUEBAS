

(function () {
  const API_CAP_LIST = 'php/cap_control_api.php';

  const API_INACTIVAR = {
    tema: 'php/inactivar_cap_tema.php',
    proceso: 'php/inactivar_cap_proceso.php',
    lugar: 'php/inactivar_cap_lugar.php',
    tactividad: 'php/inactivar_cap_tipo_actividad.php'
  };

  const API_ACTIVAR = {
    tema: 'php/activar_cap_tema.php',
    proceso: 'php/activar_cap_proceso.php',
    lugar: 'php/activar_cap_lugar.php',
    tactividad: 'php/activar_cap_tipo_actividad.php'
  };

  const API_ADD = {
    tema: 'php/agregar_cap_tema.php',
    proceso: 'php/agregar_cap_proceso.php',
    lugar: 'php/agregar_cap_lugar.php',
    tactividad: 'php/agregar_cap_tipo_actividad.php'
  };

  const API_UPDATE = {
    tema: 'php/update_cap_tema.php',
    proceso: 'php/update_cap_proceso.php',
    lugar: 'php/update_cap_lugar.php',
    tactividad: 'php/update_cap_tipo_actividad.php'
  };

  // Helper: escape to avoid XSS when injecting into HTML
  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text ?? '';
    return div.innerHTML;
  }

  // Toast helper (uses #notificationToast in the page)
  function showToast(message, isError = false) {
    const toastEl = document.getElementById('notificationToast');
    const body = document.getElementById('notificationToastBody');
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

  // Generic POST JSON helper (throws on network error)
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

  // Fallback POST: try JSON, if server responds non-JSON or non-OK, retry as form-urlencoded.
  // Returns parsed JSON or throws.
  async function postJsonWithFormFallback(url, bodyObj, formKeys = null) {
    // Try JSON first
    try {
      return await postJson(url, bodyObj);
    } catch (errJson) {
      // Try form-encoded fallback
      try {
        const form = new URLSearchParams();
        // if formKeys provided, use them mapping; else send both nombre/name if present
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
        // parse JSON if possible
        try {
          return JSON.parse(txt);
        } catch {
          // server responded with plain text
          throw new Error(txt || 'Respuesta inválida del servidor');
        }
      } catch (errForm) {
        // prefer the more descriptive error
        throw errForm;
      }
    }
  }

  async function includeComponent(file, selector) {
    try {
      const res = await fetch(file, { cache: 'no-store' });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const html = await res.text();
      const el = document.querySelector(selector);
      if (el) el.innerHTML = html;
    } catch (err) {
      console.error(`Error al cargar ${file}:`, err);
    }
  }

  let editModal = null;

  document.addEventListener('DOMContentLoaded', async () => {
    // optional includes (navbar/sidebar) if present
    await includeComponent('includes/navbar.html', '#navbar');
    await includeComponent('includes/sidebar.html', '#sidebar');
    document.body.style.visibility = 'visible';

    // init modal if present
    const modalEl = document.getElementById('editItemModal');
    if (modalEl) editModal = new bootstrap.Modal(modalEl);

    // bind add buttons
    document.getElementById('refreshActiveBtn')?.addEventListener('click', addTema);
    document.getElementById('refreshAttemptsBtnAdd')?.addEventListener('click', addProceso);
    document.getElementById('refreshHistoryBtnAdd')?.addEventListener('click', addLugar);
    document.getElementById('refreshTActividadBtnAdd')?.addEventListener('click', addTActividad);

    // save edit (uses existing update endpoints)
    document.getElementById('saveEditBtn')?.addEventListener('click', async () => {
      const id = document.getElementById('editItemId').value;
      const type = document.getElementById('editItemType').value;
      const nombre = (document.getElementById('editItemInput').value || '').trim();
      if (!nombre) { showToast('Ingrese un nombre', true); return; }
      try {
        const url = API_UPDATE[type];
        if (!url) { showToast('Tipo desconocido', true); return; }
        const data = await postJsonWithFormFallback(url, { id: parseInt(id, 10), nombre });
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

    // Delegation: handle toggle and edit buttons
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

    // initial load of all lists
    await Promise.all([loadTemas(), loadProcesos(), loadLugares(), loadTActividad()]);

    // refresh when tabs shown (if using bootstrap tabs)
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

  function openEditModal(type, id, name) {
    document.getElementById('editItemId').value = id;
    document.getElementById('editItemType').value = type;
    document.getElementById('editItemInput').value = name;
    editModal?.show();
  }

  // Toggle state: if currentlyActive call inactivar endpoint, else activar endpoint.
  // btnArg optional: if provided update only that row visually.
  async function toggleState(type, id, currentlyActive, btnArg) {
    try {
      const url = currentlyActive ? API_INACTIVAR[type] : API_ACTIVAR[type];
      if (!url) { showToast('Tipo desconocido', true); return; }
      const data = await postJsonWithFormFallback(url, { id: parseInt(id, 10) });
      if (data.success) {
        showToast('Estado actualizado');
        if (btnArg) {
          const newVal = data.new_value;
          // convention: new_value = 0 => activo, 1 => inactivo
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

  function normalizeNewValue(val) {
    if (typeof val === 'boolean') return !!val;
    if (typeof val === 'number') return val === 0; // convention: 0 => active
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

  // Update only the visual state of the row (no textual changes to name or id)
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

    // update dataset and tooltip only, do NOT change name or id
    btn.dataset.active = active ? '1' : '0';
    btn.title = active ? 'Inactivar' : 'Activar';
    btn.setAttribute('aria-label', btn.title);

    const sw = btn.querySelector('.toggle-switch');
    if (sw) {
      sw.classList.toggle('on', !!active);
      sw.classList.toggle('off', !active);
    }

    // optionally apply visual row class (doesn't change text)
    tr.classList.toggle('row-inactive', !active);
  }

  function refreshList(type) {
    if (type === 'tema') loadTemas();
    else if (type === 'proceso') loadProcesos();
    else if (type === 'lugar') loadLugares();
    else if (type === 'tactividad') loadTActividad();
  }

  // Helper to render toggle HTML (small pill + knob)
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

  // ---------- loaders ----------
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

  // ---------- add functions (robust, with fallback) ----------
  async function addTema() {
    const input = document.getElementById('newTemaInput');
    if (!input) return;
    const nombre = (input.value || '').trim();
    if (!nombre) { showToast('Nombre vacío', true); input.focus(); return; }
    try {
      // Try JSON then fallback to form
      const res = await postJsonWithFormFallback(API_ADD.tema, { nombre });
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
      const res = await postJsonWithFormFallback(API_ADD.proceso, { nombre });
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
      const res = await postJsonWithFormFallback(API_ADD.lugar, { nombre });
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
      const res = await postJsonWithFormFallback(API_ADD.tactividad, { nombre });
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

  // Expose for debugging
  window.SESIONES = {
    loadTemas, loadProcesos, loadLugares, loadTActividad,
    addTema, addProceso, addLugar, addTActividad
  };
})();