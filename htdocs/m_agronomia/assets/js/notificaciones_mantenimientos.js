(() => {
  const btn = document.getElementById('noti-admin');
  const badge = document.getElementById('noti-badge');
  const modalEl = document.getElementById('modal-pendientes-mantenimientos');
  const cont = document.getElementById('pendientes-mantenimientos');
  if (!btn || !badge) return;

  let pollingId = null;
  let es = null; // EventSource

  async function getJSON(url, options) {
    const r = await fetch(url, { cache: 'no-store', ...options });
    const text = await r.text();
    try {
      if (!r.ok) throw new Error(`HTTP ${r.status} ${r.statusText}: ${text.slice(0,200)}`);
      return JSON.parse(text);
    } catch (e) {
      console.warn('[Noti] Raw response from', url, '->', text);
      throw e;
    }
  }

  function setBadgeTotal(total) {
    const t = Number(total || 0);
    badge.textContent = t;
    badge.style.display = t > 0 ? '' : 'none';
  }

  async function updateBadge() {
    try {
      const j = await getJSON('assets/php/notificaciones_pendientes_mantenimientos.php');
      setBadgeTotal(j.total);
      if (Array.isArray(j.detalles)) {
        console.log('[Noti] detalle por tabla:', j.detalles);
      }
    } catch (e) {
      console.warn('[Noti] Error badge:', e.message || e);
      badge.style.display = 'none';
    }
  }

  function renderTablaPendientes(items) {
    if (!cont) return;
    if (!Array.isArray(items) || items.length === 0) {
      cont.innerHTML = `<div class="alert alert-secondary mb-0">No hay registros pendientes de aprobación.</div>`;
      return;
    }
    const rows = items.map(r => {
      const id = r.mantenimientos_id ?? r.mantenimiento_id ?? r.id ?? '';
      const fecha = r.fecha ?? '';
      const resp = r.responsable ?? '';
      const plant = r.plantacion ?? '';
      const finca = r.finca ?? '';
      const fuente = r.__fuente ? `<small class="text-muted d-block">${r.__fuente}</small>` : '';
      return `
        <tr>
          <td>${id}${fuente}</td>
          <td>${fecha}</td>
          <td>${resp}</td>
          <td>${plant}</td>
          <td>${finca}</td>
          <td style="white-space:nowrap;">
            <button class="btn btn-sm btn-success btn-aprobar" data-id="${id}"><i class="fa fa-check"></i></button>
            <button class="btn btn-sm btn-outline-danger btn-rechazar" data-id="${id}" style="margin-left:6px;"><i class="fa fa-times"></i></button>
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
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    `;
  }

  async function loadPendientes() {
    try {
      const j = await getJSON('assets/php/pendientes_mantenimientos.php?page=1&pageSize=200');
      if (Array.isArray(j.fuentes)) {
        console.log('[Noti] fuentes consultadas:', j.fuentes);
      }
      renderTablaPendientes(Array.isArray(j.datos) ? j.datos : []);
    } catch (e) {
      console.warn('[Noti] No se pudieron cargar los pendientes:', e.message || e);
      if (cont) {
        cont.innerHTML = `
          <div class="alert alert-warning mb-0">
            No se pudieron cargar los pendientes. Intenta nuevamente.
          </div>
        `;
      }
    }
  }

  function modalVisible() {
    // Bootstrap 5 agrega la clase 'show' al modal visible
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
      console.log('[Noti] EventSource no soportado; usando polling.');
      startPolling();
      return;
    }
    try {
      es = new EventSource('assets/php/eventos_pendientes_mantenimientos.php');
      console.log('[Noti] Conectando SSE...');

      const onData = (payload) => {
        try {
          const j = JSON.parse(payload);
          if (typeof j.total !== 'undefined') {
            setBadgeTotal(j.total);
            // Si el modal está abierto, refrescamos la lista
            if (modalVisible()) {
              loadPendientes();
            }
          }
        } catch (e) {
          // ignorar parse errors
        }
      };

      es.addEventListener('init', (e) => onData(e.data));
      es.addEventListener('update', (e) => onData(e.data));
      es.addEventListener('ping', () => {}); // keep-alive
      es.addEventListener('error', (e) => {
        console.warn('[Noti] SSE error:', e);
      });

      es.onerror = () => {
        console.warn('[Noti] SSE desconectado; volverá a intentar y activamos polling de respaldo.');
        es.close();
        es = null;
        startPolling(); // respaldo
        // Intentar reconectar un poco después; el navegador también reintentará
        setTimeout(() => {
          if (!es) connectRealtime();
        }, 10000);
      };

      // Si SSE está activo, detenemos el polling de respaldo
      stopPolling();
    } catch (e) {
      console.warn('[Noti] No se pudo iniciar SSE:', e.message || e);
      startPolling();
    }
  }

  btn.addEventListener('click', async () => {
    await loadPendientes();
    if (modalEl && window.bootstrap?.Modal) {
      const modal = bootstrap.Modal.getOrCreateInstance(modalEl);
      modal.show();
    }
  });

  // Iniciar: intentamos SSE primero; si falla, polling.
  connectRealtime();

  // Limpieza al salir
  window.addEventListener('beforeunload', () => {
    stopPolling();
    if (es) { try { es.close(); } catch {} }
  });
})();