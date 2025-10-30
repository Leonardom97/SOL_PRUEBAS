(() => {
  const btn = document.getElementById('noti-admin');
  const badge = document.getElementById('noti-badge');
  const modalEl = document.getElementById('modal-pendientes-mantenimientos'); // Reutiliza este modal
  const cont = document.getElementById('pendientes-mantenimientos');
  if (!btn || !badge) return;

  // Mapeo: sección visible -> entidad
  const sectionToEntity = {
    'tab-content-reuniones': 'mantenimientos',
    'tab-content-monitoreos-generales': 'monitoreos_generales',
    'tab-content-asistencias': 'oficios_varios_palma',
    'tab-content-capacitaciones': 'cosecha_fruta',
    'tab-content-inventarios': 'fertilizacion_organica'
  };
  const entityPretty = {
    mantenimientos: 'Mantenimientos',
    monitoreos_generales: 'Monitoreos Generales',
    oficios_varios_palma: 'Oficios Varios Palma',
    cosecha_fruta: 'Cosecha Fruta',
    fertilizacion_organica: 'Fertilización Orgánica'
  };

  let currentEntidad = null;     // entidad en uso
  let qEnt = '';                 // query string ?entidad=...
  let pollingId = null;
  let es = null;                 // EventSource (SSE)

  // Utilidades HTTP
  async function getJSON(url, options) {
    const r = await fetch(url, { cache: 'no-store', ...options });
    const text = await r.text();
    if (!r.ok) {
      console.warn('[NotiOps] Raw response from', url, '->', text);
      throw new Error(`HTTP ${r.status} ${r.statusText}`);
    }
    try { return JSON.parse(text); }
    catch { console.warn('[NotiOps] Raw response parse fail:', text); throw new Error('Invalid JSON'); }
  }
  async function postJSON(url, data) {
    const r = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
      body: JSON.stringify(data || {})
    });
    const text = await r.text();
    if (!r.ok) {
      console.warn('[NotiOps] Raw response from', url, '->', text);
      throw new Error(`HTTP ${r.status} ${r.statusText}`);
    }
    try { return JSON.parse(text); }
    catch { console.warn('[NotiOps] Raw response parse fail:', text); throw new Error('Invalid JSON'); }
  }

  // Detección contextual de entidad: sección visible al usuario
  function isVisible(el) {
    if (!el) return false;
    const style = window.getComputedStyle(el);
    if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') return false;
    const rect = el.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  }
  function detectEntidadFromVisibleSection() {
    const centerY = window.innerHeight / 2;
    let best = null;
    let bestDist = Infinity;

    Object.keys(sectionToEntity).forEach(id => {
      const el = document.getElementById(id);
      if (!isVisible(el)) return;
      const r = el.getBoundingClientRect();
      const mid = (r.top + r.bottom) / 2;
      const dist = Math.abs(mid - centerY);
      if (dist < bestDist) { bestDist = dist; best = sectionToEntity[id]; }
    });

    return best || currentEntidad || 'mantenimientos';
  }

  // Estado visual
  function setBadgeTotal(total) {
    const t = Number(total || 0);
    badge.textContent = t;
    badge.style.display = t > 0 ? '' : 'none';
  }
  function setModalTitle(entidad) {
    const h = modalEl?.querySelector('.modal-title');
    if (!h) return;
    const pretty = entityPretty[entidad] || entidad || '';
    h.innerHTML = `<i class="fas fa-bell"></i> Pendientes de aprobación${pretty ? ' ('+pretty+')' : ''}`;
  }

  // Cambio de entidad: actualiza endpoints, reconecta SSE y badge
  function setEntidad(entidad) {
    const e = (entidad || '').toLowerCase();
    if (e === currentEntidad) return;
    currentEntidad = e;
    qEnt = currentEntidad ? `?entidad=${encodeURIComponent(currentEntidad)}` : '';
    setModalTitle(currentEntidad);
    if (es) { try { es.close(); } catch {} es = null; }
    stopPolling();
    connectRealtime();
    updateBadge();
    try { console.log('[NotiOps] Entidad activa:', currentEntidad); } catch {}
  }

  // Badge
  async function updateBadge() {
    try {
      const j = await getJSON(`assets/php/notificaciones_pendientes_operaciones.php${qEnt}`);
      setBadgeTotal(j.total);
      if (Array.isArray(j.detalles)) console.log('[NotiOps] detalle por tabla:', j.detalles);
    } catch (e) {
      console.warn('[NotiOps] Error badge:', e.message || e);
      badge.style.display = 'none';
    }
  }

  // Render listado
  function renderTablaPendientes(items) {
    if (!cont) return;
    if (!Array.isArray(items) || items.length === 0) {
      cont.innerHTML = `<div class="alert alert-secondary mb-0">No hay registros pendientes de aprobación.</div>`;
      return;
    }
    const rows = items.map(r => {
      const id = r.id ?? '';
      const fecha = r.fecha ?? '';
      const resp = r.responsable ?? '';
      const plant = r.plantacion ?? '';
      const finca = r.finca ?? '';
      const ent = r.__entidad ?? currentEntidad ?? '';
      const fuente = r.__fuente ? `<small class="text-muted d-block">${r.__fuente}</small>` : '';
      return `
        <tr>
          <td>${id}${fuente}</td>
          <td>${fecha}</td>
          <td>${resp}</td>
          <td>${plant}</td>
          <td>${finca}</td>
          <td>${ent}</td>
          <td style="white-space:nowrap;">
            <button class="btn btn-sm btn-success btn-aprobar" data-id="${id}" data-entidad="${ent}"><i class="fa fa-check"></i></button>
            <button class="btn btn-sm btn-outline-danger btn-rechazar" data-id="${id}" data-entidad="${ent}" style="margin-left:6px;"><i class="fa fa-times"></i></button>
          </td>
        </tr>
      `;
    }).join('');
    cont.innerHTML = `
      <div class="table-responsive">
        <table class="table table-sm table-striped align-middle">
          <thead class="table-light">
            <tr>
              <th>ID</th>
              <th>Fecha</th>
              <th>Responsable</th>
              <th>Plantación</th>
              <th>Finca</th>
              <th>Entidad</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    `;

    const endpointByEntidad = (entidad, action) => {
      const base = action === 'aprobar' ? 'aprobar_' : 'rechazar_';
      switch ((entidad || '').toLowerCase()) {
        case 'mantenimientos': return `assets/php/${base}mantenimiento.php`;
        case 'monitoreos_generales': return `assets/php/${base}monitoreos_generales.php`;
        case 'oficios_varios_palma': return `assets/php/${base}oficios_varios_palma.php`;
        case 'cosecha_fruta': return `assets/php/${base}cosecha_fruta.php`;
        case 'fertilizacion_organica': return `assets/php/${base}fertilizacion_organica.php`;
        default: return null;
      }
    };

    cont.querySelectorAll('.btn-aprobar').forEach(b => {
      b.onclick = async () => {
        const id = b.getAttribute('data-id');
        const ent = (b.getAttribute('data-entidad') || currentEntidad || '').toLowerCase();
        const url = endpointByEntidad(ent, 'aprobar');
        if (!id || !url) return;
        b.disabled = true;
        try {
          const r = await postJSON(url, { id: String(id), [`${ent}_id`]: String(id) });
          if (r && r.success) {
            await loadPendientes();
            setTimeout(updateBadge, 50);
            alert('Registro aprobado.');
          } else {
            alert('No se pudo aprobar el registro.');
          }
        } catch {
          alert('Error al aprobar. Intenta nuevamente.');
        } finally {
          b.disabled = false;
        }
      };
    });

    cont.querySelectorAll('.btn-rechazar').forEach(b => {
      b.onclick = async () => {
        const id = b.getAttribute('data-id');
        const ent = (b.getAttribute('data-entidad') || currentEntidad || '').toLowerCase();
        const url = endpointByEntidad(ent, 'rechazar');
        if (!id || !url) return;
        if (!confirm('¿Deseas rechazar y eliminar este registro de la lista de pendientes?')) return;
        b.disabled = true;
        try {
          const r = await postJSON(url, { id: String(id), [`${ent}_id`]: String(id) });
          if (r && r.success) {
            await loadPendientes();
            setTimeout(updateBadge, 50);
            alert('Registro rechazado.');
          } else {
            alert('No se pudo rechazar el registro.');
          }
        } catch {
          alert('Error al rechazar. Intenta nuevamente.');
        } finally {
          b.disabled = false;
        }
      };
    });
  }

  // Carga de pendientes para la entidad actual
  async function loadPendientes() {
    try {
      const j = await getJSON(`assets/php/pendientes_operaciones.php${qEnt ? `${qEnt}&` : '?'}page=1&pageSize=200`);
      if (Array.isArray(j.fuentes)) console.log('[NotiOps] fuentes consultadas:', j.fuentes);
      renderTablaPendientes(Array.isArray(j.datos) ? j.datos : []);
    } catch (e) {
      console.warn('[NotiOps] No se pudieron cargar los pendientes:', e.message || e);
      if (cont) {
        cont.innerHTML = `
          <div class="alert alert-warning mb-0">
            No se pudieron cargar los pendientes. Intenta nuevamente.
          </div>
        `;
      }
    }
  }

  // Polling/SSE
  function modalVisible() {
    return !!(modalEl && modalEl.classList.contains('show'));
  }
  function startPolling() {
    if (pollingId) return;
    updateBadge();
    pollingId = setInterval(updateBadge, 30000);
  }
  function stopPolling() {
    if (pollingId) {
      clearInterval(pollingId);
      pollingId = null;
    }
  }
  function connectRealtime() {
    if (!window.EventSource) {
      console.log('[NotiOps] EventSource no soportado; usando polling.');
      startPolling();
      return;
    }
    try {
      es = new EventSource(`assets/php/eventos_pendientes_operaciones.php${qEnt}`);
      console.log('[NotiOps] Conectando SSE...', currentEntidad ? `(entidad=${currentEntidad})` : '(todas)');

      const onData = (payload) => {
        try {
          const j = JSON.parse(payload);
          if (typeof j.total !== 'undefined') {
            setBadgeTotal(j.total);
            if (modalVisible()) loadPendientes();
          }
        } catch {}
      };

      es.addEventListener('init', (e) => onData(e.data));
      es.addEventListener('update', (e) => onData(e.data));
      es.addEventListener('ping', () => {});
      es.addEventListener('error', (e) => console.warn('[NotiOps] SSE error:', e));

      es.onerror = () => {
        console.warn('[NotiOps] SSE desconectado; activamos polling de respaldo.');
        try { es.close(); } catch {}
        es = null;
        startPolling();
        setTimeout(() => { if (!es) connectRealtime(); }, 10000);
      };

      stopPolling();
    } catch (e) {
      console.warn('[NotiOps] No se pudo iniciar SSE:', e.message || e);
      startPolling();
    }
  }

  // Al hacer clic en la campana: detectar entidad por la sección visible, activar y abrir modal
  btn.addEventListener('click', async () => {
    const ctxEntidad = detectEntidadFromVisibleSection();
    setEntidad(ctxEntidad);
    await loadPendientes();
    if (modalEl && window.bootstrap?.Modal) {
      const modal = bootstrap.Modal.getOrCreateInstance(modalEl);
      modal.show();
    }
  });

  // Inicialización
  setEntidad(detectEntidadFromVisibleSection());
  connectRealtime();

  // Limpieza
  window.addEventListener('beforeunload', () => {
    stopPolling();
    if (es) { try { es.close(); } catch {} }
  });
})();