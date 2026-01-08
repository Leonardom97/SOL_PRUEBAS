/**
 * F_cortes.js
 * 
 * Módulo para: Gestión de fechas de cortes
 * 
 * Funcionalidades principales:
 * - Visualización de la fecha de corte actual
 * - Actualización de la fecha de corte (solo para administradores)
 * - Sincronización con el API de fecha_corte.php
 * - Almacenamiento en localStorage para acceso rápido
 * 
 * Este módulo gestiona la fecha de corte que se utiliza como referencia
 * en varios procesos del módulo de agronomía.
 */
  (function () {
    const API_URL = '/m_agronomia/assets/php/fecha_corte.php'; // endpoint que actualiza id = 1
    const inputFecha = document.getElementById("fecha");       // <input type="date">
    const inputActual = document.getElementById("fecha-actual"); // <input type="text" readonly>
    const form = document.getElementById("form-fecha");
    const debugEl = document.getElementById("debug");
    function dbg(msg) {
      console.debug(msg);
      if (debugEl) debugEl.textContent += msg + '\n';
    }
    function isIsoDate(s) {
      return typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s);
    }
    function formatFechaParaMostrar(fechaIso) {
      if (!fechaIso) return 'No establecida';
      // usar UTC para evitar desfases por zona horaria
      const d = new Date(fechaIso + 'T00:00:00');
      if (isNaN(d.getTime())) return fechaIso;
      return d.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
    }
    function actualizarDomYStorage(fechaIso) {
      // guardar en localStorage para que las tablas existentes (ya usando localStorage) lo tomen
      try {
        if (fechaIso && isIsoDate(fechaIso)) {
          localStorage.setItem('fecha_corte', fechaIso);
        } else {
          localStorage.removeItem('fecha_corte');
        }
      } catch (e) {
        console.warn('No se pudo acceder a localStorage', e);
      }
      // actualizar campos visibles
      if (inputActual) inputActual.value = fechaIso ? formatFechaParaMostrar(fechaIso) : 'No establecida';
      if (inputFecha) inputFecha.value = (fechaIso && isIsoDate(fechaIso)) ? fechaIso : '';
      // exponer global y notificar otros scripts
      window.FECHA_CORTE = fechaIso || null;
      try {
        window.dispatchEvent(new CustomEvent('fechaCorteChanged', { detail: { fecha: fechaIso } }));
      } catch (e) {
        // noop
      }
    }
    // Inicializar desde localStorage (si existe) sin llamar al servidor
    (function initFromLocal() {
      try {
        const stored = localStorage.getItem('fecha_corte');
        if (stored && isIsoDate(stored)) {
          if (inputActual) inputActual.value = formatFechaParaMostrar(stored);
          if (inputFecha) inputFecha.value = stored;
          window.FECHA_CORTE = stored;
        }
      } catch (e) {
        console.warn('No se pudo leer localStorage al iniciar', e);
      }
    })();
    async function mostrarFechaActual() {
      dbg('Cargando fecha actual (GET) desde ' + API_URL);
      try {
        const res = await fetch(API_URL, { method: 'GET', cache: 'no-store' });
        dbg('GET status: ' + res.status);
        if (res.status === 404) {
          actualizarDomYStorage(null);
          return;
        }
        const txt = await res.text();
        dbg('GET body raw: ' + txt);
        let data = null;
        try { data = JSON.parse(txt); } catch (e) { dbg('GET JSON parse error: ' + e); }
        if (!res.ok) {
          alert('Error al leer la fecha (ver consola). Código: ' + res.status);
          console.error('GET error body:', data || txt);
          return;
        }
        const fecha = data && data.fecha_corte ? data.fecha_corte : '';
        actualizarDomYStorage(fecha || null);
        dbg('Fecha mostrada: ' + fecha);
      } catch (err) {
        console.error('mostrarFechaActual error:', err);
        // no sobrescribir lo que esté en localStorage si hay error de red
      }
    }
    // Carga inicial: intenta obtener del servidor (pero ya inicializamos desde localStorage arriba)
    mostrarFechaActual();
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const nuevaFecha = inputFecha.value; // YYYY-MM-DD
      if (!nuevaFecha) {
        alert('Por favor selecciona una fecha válida');
        inputFecha.focus();
        return;
      }
      // UX-only check: detecta roles desde data-role del body (no confiar para seguridad)
      const roles = (document.body.dataset.role || '').split(',').map(r => r.trim().toLowerCase());
      const isAdmin = roles.includes('administrador');
      dbg('Enviando actualización: ' + nuevaFecha + ' (isAdmin=' + isAdmin + ')');
      try {
        const headers = { 'Content-Type': 'application/json' };
        // PARA PRUEBAS LOCALES: si detectamos admin en el body, enviamos header para que el backend permita la actualización.
        // En producción debes usar sesiones y quitar este header de confianza.
        if (isAdmin) headers['X-User-Role'] = 'Administrador';
        const res = await fetch(API_URL, {
          method: 'PUT',
          headers,
          body: JSON.stringify({ fecha_corte: nuevaFecha }),
          cache: 'no-store'
        });
        dbg('PUT status: ' + res.status);
        const txt = await res.text();
        dbg('PUT body raw: ' + txt);
        let body = null;
        try { body = JSON.parse(txt); } catch (e) { dbg('PUT JSON parse error: ' + e); }
        // Considerar éxito si 200 o 201
        if (res.status === 200 || res.status === 201) {
          // Si el backend devuelve la fecha, usarla; si no, usar la enviada
          const fechaDevuelta = (body && body.fecha_corte) ? body.fecha_corte : nuevaFecha;
          // Actualizamos DOM y localStorage para que todas las tablas reaccionen
          actualizarDomYStorage(fechaDevuelta);
          const verb = res.status === 201 ? 'creada' : 'actualizada';
          alert('Fecha ' + verb + ': ' + formatFechaParaMostrar(fechaDevuelta));
          dbg('Actualización OK: ' + fechaDevuelta);
          return;
        }
        // manejo de errores explícitos
        if (res.status === 403) {
          const msg = (body && (body.message || body.error)) ? (body.message || body.error) : 'No autorizado (403)';
          alert('No autorizado: ' + msg);
          console.warn('403:', body || txt);
          return;
        }
        // otros errores: mostrar message si viene, si no el status
        const msg = (body && (body.message || body.error)) ? (body.message || body.error) : ('Código ' + res.status + ' ' + res.statusText);
        alert('No se pudo guardar la fecha: ' + msg);
        console.error('Error al actualizar:', res.status, body || txt);
      } catch (err) {
        console.error('fetch error:', err);
        alert('Error de red al intentar guardar la fecha (ver consola).');
      }
    });
    // Exponer para depuración si hace falta:
    window._fechaCorte = { mostrarFechaActual };
  })();