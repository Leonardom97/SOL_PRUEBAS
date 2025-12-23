/**
 * notificaciones_operaciones.js
 * 
 * Sistema de notificaciones de operaciones pendientes (campana de notificaciones).
 * Versión Rediseñada: Card View -> Detail View -> Actions.
 */
(function () {
  'use strict';

  // --- Estilos CSS inyectados para el rediseño ---
  (function injectStyles() {
    if (document.getElementById('style-noti-cards')) return;
    const style = document.createElement('style');
    style.id = 'style-noti-cards';
    style.innerHTML = `
        /* Grid de Tarjetas */
        .md-approval-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
            gap: 16px;
            padding: 10px;
        }
        .md-approval-card {
            background: #fff;
            border: 1px solid #eee;
            border-radius: 12px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.05);
            padding: 16px;
            transition: transform 0.2s, box-shadow 0.2s;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
        }
        .md-approval-card:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 16px rgba(0,0,0,0.1);
        }
        .md-card-header {
            border-bottom: 1px solid #f0f0f0;
            padding-bottom: 8px;
            margin-bottom: 12px;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .md-card-id {
            font-weight: 700;
            color: #772E22;
            font-size: 0.95rem;
        }
        .md-card-cols {
            font-size: 0.85rem;
            color: #555;
            margin-bottom: 12px;
        }
        .md-card-cols div { margin-bottom: 4px; }
        .md-card-cols strong { color: #333; }
        
        /* Vista Detalle */
        .md-detail-view {
            animation: fadeIn 0.3s ease;
        }
        .md-detail-header {
            display: flex;
            align-items: center;
            margin-bottom: 20px;
            border-bottom: 2px solid #f0f0f0;
            padding-bottom: 10px;
        }
        .md-detail-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
            gap: 20px;
            padding: 10px 0;
        }
        .md-detail-item label {
            display: block;
            font-size: 0.75rem;
            text-transform: uppercase;
            color: #888;
            letter-spacing: 0.5px;
            margin-bottom: 4px;
        }
        .md-detail-item div {
            font-size: 1rem;
            color: #222;
            font-weight: 500;
            background: #f9f9f9;
            padding: 8px 12px;
            border-radius: 6px;
        }
        .md-detail-actions {
            margin-top: 30px;
            display: flex;
            gap: 15px;
            justify-content: center;
            border-top: 1px solid #eee;
            padding-top: 20px;
        }
        .md-btn-action {
            padding: 12px 30px;
            border-radius: 50px;
            font-weight: 600;
            display: flex;
            align-items: center;
            gap: 8px;
            transition: all 0.2s;
            border: none;
            cursor: pointer;
        }
        .md-btn-approve { background: #28a745; color: white; }
        .md-btn-approve:hover { background: #218838; transform: scale(1.05); }
        
        .md-btn-reject { background: #fff; color: #dc3545; border: 2px solid #dc3545; }
        .md-btn-reject:hover { background: #dc3545; color: white; transform: scale(1.05); }

        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
      `;
    document.head.appendChild(style);
  })();

  // ---------------------------------------------------------------
  // Configuración
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
    plagas: 'Plagas',
    coberturas: 'Coberturas',
    ct_polinizacion_flores: 'Calidad Polinización Flores',
    aud_cosecha: 'Auditoría Cosecha',
    aud_fertilizacion: 'Auditoría Fertilización',
    aud_mantenimiento: 'Auditoría Mantenimiento',
    aud_perdidas: 'Auditoría Pérdidas',
    aud_vagones: 'Auditoría Vagones',
    aud_maquinaria: 'Auditoría Maquinaria',
    labores_diarias: 'Labores Diarias',
    polinizacion: 'Polinización',
    resiembra: 'Resiembra',
    salida_vivero: 'Salida Vivero',
    siembra_nueva: 'Siembra Nueva',
    erradicaciones: 'Erradicaciones',
    compostaje: 'Compostaje',
    reco_futa: 'reco_fruta'
  };

  const sectionToEntity = {
    'tab-content-cosecha-fruta': 'cosecha_fruta',
    'tab-content-mantenimientos': 'mantenimientos',
    'tab-content-oficios-varios-palma': 'oficios_varios_palma',
    'tab-content-fertilizacion-organica': 'fertilizacion_organica',
    'tab-content-monitoreos-generales': 'monitoreos_generales',
    'tab-content-ct-cal-sanidad': 'ct_cal_sanidad',
    'tab-content-monitoreo-trampas': 'monitoreo_trampas',
    'tab-content-nivel-freatico': 'nivel_freatico',
    'tab-content-ct-cal-labores': 'ct_cal_labores',
    'tab-content-reporte-lote-monitoreo': 'reporte_lote_monitoreo',
    'tab-content-ct-cal-trampas': 'ct_cal_trampas',
    'tab-content-compactacion': 'compactacion',
    'tab-content-plagas': 'plagas',
    'tab-content-coberturas': 'coberturas',
    'tab-content-ct-polinizacion-flores': 'ct_polinizacion_flores',
    'tab-content-aud-cosecha': 'aud_cosecha',
    'tab-content-aud-fertilizacion': 'aud_fertilizacion',
    'tab-content-aud-mantenimiento': 'aud_mantenimiento',
    'tab-content-aud-perdidas': 'aud_perdidas',
    'tab-content-aud-vagones': 'aud_vagones',
    'tab-content-aud-maquinaria': 'aud_maquinaria',
    'tab-content-labores-diarias': 'labores_diarias',
    'tab-content-polinizacion': 'polinizacion',
    'tab-content-resiembra': 'resiembra',
    'tab-content-salida-vivero': 'salida_vivero',
    'tab-content-siembra-nueva': 'siembra_nueva',
    'tab-content-erradicaciones': 'erradicaciones',
    'tab-content-compostaje': 'compostaje',
    'tab-content-reco_fruta': 'reco_fruta'
  };

  // Estado global
  let globalCounts = { total: 0, details: {} };
  let pollInterval = null;
  let currentEntidad = null;

  // ---------------------------------------------------------------
  // Inicialización
  function initNoti() {
    const btn = document.getElementById('noti-admin');
    const badge = document.getElementById('noti-badge');
    const modalEl = document.getElementById('modal-pendientes-mantenimientos');
    const cont = document.getElementById('pendientes-mantenimientos');

    if (!btn || !badge || !modalEl || !cont) {
      setTimeout(initNoti, 500);
      return;
    }

    // Helper para asegurar botón
    const ensureSummaryButton = () => {
      const footer = modalEl.querySelector('.modal-footer');
      if (footer && !footer.querySelector('.btn-summary-custom')) {
        const btnSum = document.createElement('button');
        btnSum.className = 'btn btn-primary btn-summary-custom me-2';
        btnSum.innerHTML = '<i class="fas fa-list-ul"></i> Ver Resumen';
        btnSum.onclick = () => renderResumenGlobal(cont);

        const btnClose = footer.querySelector('button[data-bs-dismiss="modal"]') || footer.lastElementChild;
        if (btnClose) {
          footer.insertBefore(btnSum, btnClose);
        } else {
          footer.appendChild(btnSum);
        }
      }
    };

    // Inyectar inmediatamente
    ensureSummaryButton();

    if (btn.dataset.bound === 'true') {
      startPolling(badge);
      return;
    }
    btn.dataset.bound = 'true';

    // Click inteligente
    btn.addEventListener('click', () => {
      // Re-asegurar botón por si el DOM cambió
      ensureSummaryButton();

      // 1. Mostrar modal
      if (modalEl && window.bootstrap && window.bootstrap.Modal) {
        window.bootstrap.Modal.getOrCreateInstance(modalEl).show();
      }

      // 2. Comportamiento simplificado: Siempre mostrar la pestaña actual
      const activeEnt = detectEntidadFromVisibleSection();
      setEntidad(activeEnt);
      loadPendientes(activeEnt);
    });

    startPolling(badge);
  }

  function startPolling(badge) {
    if (pollInterval) clearInterval(pollInterval);
    fetchGlobalCounts(badge);
    pollInterval = setInterval(() => fetchGlobalCounts(badge), 15000);
  }

  function fetchGlobalCounts(badge) {
    fetch('assets/php/get_global_counts.php')
      .then(parseJsonSafe)
      .then(data => {
        globalCounts = data || { total: 0, details: {} };
        badge.textContent = globalCounts.total;
        badge.style.display = globalCounts.total > 0 ? '' : 'none';
      })
      .catch(err => console.error('[noti] Polling error:', err));
  }

  // Vista "Resumen Global" (Menú)
  function renderResumenGlobal(container) {
    setModalTitle('Resumen de Aprobaciones');
    let html = '<div class="list-group list-group-flush">';
    let found = false;

    Object.keys(globalCounts.details).forEach(key => {
      const count = globalCounts.details[key];
      if (count > 0) {

        // --- FILTRO DE PERMISOS (Frontend) ---
        // 1. Obtener ID de la sección (ej: 'tab-content-cosecha-fruta')
        const sectionId = Object.keys(sectionToEntity).find(id => sectionToEntity[id] === key);

        // 2. Determinar si el usuario tiene acceso visual a esta pestaña
        // La lógica es: Si existe el BOTÓN en la barra, tiene permiso.
        if (sectionId) {
          const slug = sectionId.replace('tab-content-', '');
          const btn = document.querySelector(`.md-tab-btn[data-tab="${slug}"]`);
          if (!btn) return; // Botón no existe -> Usuario no tiene rol para ver esto
        } else {
          return; // Entidad no mapeada -> Ocultar por seguridad
        }

        found = true;
        const pretty = entityPretty[key] || key;
        html += `
                <button type="button" class="list-group-item list-group-item-action d-flex justify-content-between align-items-center"
                  onclick="window.loadEntidadSpecfic('${key}')">
                  <span><i class="fas fa-arrow-right me-2 text-primary"></i> ${escapeHtml(pretty)}</span>
                  <span class="badge bg-danger rounded-pill">${count}</span>
                </button>
              `;
      }
    });
    html += '</div>';

    if (!found) html = '<div class="alert alert-success m-3"><i class="fas fa-check-circle"></i> Todo al día en sus módulos asignados.</div>';

    container.innerHTML = html;
  }

  // API Pública para el onclick del resumen
  window.loadEntidadSpecfic = function (entidad) {
    currentEntidad = entidad;
    const cont = document.getElementById('pendientes-mantenimientos'); // Re-obtener por si acaso
    if (cont) loadPendientes(entidad, cont);
  };

  // ---------------------------------------------------------------
  // Vista 1: Lista de Tarjetas (Grid)
  function renderCardList(container, columnas, filas, entidad, idCol) {
    const cols = Array.isArray(columnas) ? columnas.slice() : [];
    const rows = Array.isArray(filas) ? filas : [];

    if (!cols.length || !rows.length) {
      container.innerHTML = '<div class="alert alert-secondary mb-0">No hay registros pendientes en ' + escapeHtml(entityPretty[entidad] || entidad) + '.</div>';
      return;
    }

    const idKey = idCol || idColForEntidad(entidad);

    // Lógica "Inteligente" de selección de columnas para la Tarjeta
    // 1. Blacklist: columnas que NO queremos ver en el resumen
    const blacklist = [idKey, 'id', 'check', 'supervision', 'acciones', 'error_registro', 'created_at', 'updated_at', 'hora', 'hora_entrada', 'hora_salida', 'tipo_auditoria'];

    // 2. Prioridad: columnas que SÍ queremos ver si existen (en orden de importancia)
    const priority = ['labor', 'labor_especifica', 'actividad', 'responsable', 'colaborador', 'tecnico', 'encargado', 'finca', 'plantacion', 'lote'];

    let candidates = cols.filter(c => !blacklist.includes(c));
    let displayCols = [];

    // A. Siempre incluir FECHA si existe (contexto temporal clave)
    const fechaCol = candidates.find(c => c === 'fecha' || c === 'date');
    if (fechaCol) displayCols.push(fechaCol);

    // B. Buscar campos prioritarios
    priority.forEach(p => {
      if (displayCols.length < 4) { // Max 4 líneas
        const found = candidates.find(c => c === p);
        if (found && !displayCols.includes(found)) {
          displayCols.push(found);
        }
      }
    });

    // C. Rellenar si falta info (pero evitar redundancia)
    if (displayCols.length < 2) {
      candidates.forEach(c => {
        if (displayCols.length < 3 && !displayCols.includes(c)) {
          displayCols.push(c);
        }
      });
    }

    let html = '<div class="md-approval-grid">';

    rows.forEach((r, idx) => {
      const idVal = r && r[idKey] != null ? String(r[idKey]) : '';

      let summaryHtml = '';
      displayCols.forEach(k => {
        let val = r[k] ? String(r[k]) : '';
        if (val === '') return; // No mostrar líneas vacías

        // Format: Capitalize key
        const label = k.charAt(0).toUpperCase() + k.slice(1).replace(/_/g, ' ');
        const displayVal = val.length > 35 ? val.substring(0, 35) + '...' : val;

        summaryHtml += `<div><strong style="color:#666;">${escapeHtml(label)}:</strong> <span style="color:#333; font-weight:500;">${escapeHtml(displayVal)}</span></div>`;
      });

      // Fallback si no hay data
      if (!summaryHtml) summaryHtml = '<div class="text-muted fst-italic">Sin datos clave. Revisar detalle.</div>';

      html += `
          <div class="md-approval-card">
              <div class="md-card-header">
                  <span class="md-card-id">#${escapeHtml(idVal)}</span>
                  <span class="badge bg-light text-dark border">Pendiente</span>
              </div>
              <div class="md-card-cols">
                  ${summaryHtml}
              </div>
              <button class="btn btn-outline-primary w-100 btn-sm" 
                  onclick="window.showApprovalDetail(${idx})">
                  <i class="fas fa-eye"></i> Revisar Cambios
              </button>
          </div>
        `;
    });

    html += '</div>';
    container.innerHTML = html;

    // Guardar datos en el contenedor para usarlos en el detalle
    container._tempRows = rows;
    container._tempCols = cols;
    container._tempEntidad = entidad;
    container._tempIdKey = idKey;
  }

  // Vista 2: Detalle (Detail View)
  window.showApprovalDetail = function (rowIndex) {
    const cont = document.getElementById('pendientes-mantenimientos');
    if (!cont || !cont._tempRows) return;

    const row = cont._tempRows[rowIndex];
    const cols = cont._tempCols;
    const entidad = cont._tempEntidad;
    const idKey = cont._tempIdKey;
    const idVal = row[idKey];

    let gridHtml = '';
    cols.forEach(c => {
      // Filtrar columnas técnicas
      if (['acciones', 'check', 'supervision'].includes(c)) return;

      const val = row[c] != null ? String(row[c]) : '';
      gridHtml += `
            <div class="md-detail-item">
                <label>${escapeHtml(c.replace(/_/g, ' '))}</label>
                <div>${escapeHtml(val) || '<span class="text-muted fst-italic">Vacío</span>'}</div>
            </div>`;
    });

    const html = `
        <div class="md-detail-view">
            <div class="md-detail-header">
                <button class="btn btn-link text-secondary p-0 me-3" onclick="window.backToApprovalList()">
                    <i class="fas fa-arrow-left fa-lg"></i>
                </button>
                <h5 class="mb-0">Revisión de Registro #${escapeHtml(idVal)}</h5>
            </div>
            
            <div class="alert alert-info">
                <i class="fas fa-info-circle"></i> Verifique los datos a continuación antes de aprobar.
            </div>

            <div class="md-detail-grid">
                ${gridHtml}
            </div>

            <div class="md-detail-actions">
                <button class="md-btn-action md-btn-reject" onclick="window.processApprovalAction('${entidad}', '${idVal}', '${idKey}', 'rechazar')">
                    <i class="fas fa-times"></i> Rechazar
                </button>
                <button class="md-btn-action md-btn-approve" onclick="window.processApprovalAction('${entidad}', '${idVal}', '${idKey}', 'aprobar')">
                    <i class="fas fa-check"></i> Aprobar Cambios
                </button>
            </div>
        </div>
      `;

    cont.innerHTML = html;
    const modalBody = cont.closest('.modal-body');
    if (modalBody) modalBody.scrollTop = 0;
  };

  window.backToApprovalList = function () {
    // Recargar la lista completa
    loadPendientes();
  };

  window.processApprovalAction = function (entidad, id, idKey, action) {
    const btn = event.target.closest('button');
    const originalContent = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Procesando...';

    const apiUrl = 'assets/php/' + entidad + '_api.php?action=' + action;
    const payload = {};
    payload[idKey] = String(id);
    if (entidad === 'cosecha_fruta' && action === 'rechazar') payload.id = String(id);

    console.log('[noti] Action:', action, payload);

    fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
      .then(parseJsonSafe)
      .then(r => {
        if (r && r.success) {
          loadPendientes(); // Volver a la lista actualizada
        } else {
          const msg = r && (r.message || r.error) ? (r.message || r.error) : JSON.stringify(r);
          maybeServerAlert('Error al ' + action + ':', msg);
          btn.disabled = false;
          btn.innerHTML = originalContent;
        }
      })
      .catch(err => {
        console.error('[noti] Error red:', err);
        window.alert('Error de conexión.');
        btn.disabled = false;
        btn.innerHTML = originalContent;
      });
  };


  // ---------------------------------------------------------------
  // Funciones y Helpers de carga

  function loadPendientes(forceEntidad, forceContainer) {
    const ent = forceEntidad || currentEntidad || detectEntidadFromVisibleSection();
    const cont = forceContainer || document.getElementById('pendientes-mantenimientos');

    if (ent !== currentEntidad) {
      currentEntidad = ent;
      setModalTitle(ent);
    }

    const url = 'assets/php/pendientes_operaciones.php?entidad=' + encodeURIComponent(ent) + '&page=1&pageSize=500';
    cont.innerHTML = '<div class="text-center p-4"><div class="spinner-border text-primary" role="status"></div><p class="mt-2">Cargando ' + escapeHtml(entityPretty[ent] || ent) + '...</p></div>';

    fetch(url, { cache: 'no-store' })
      .then(parseJsonSafe)
      .then(j => {
        const idCol = j.idCol || idColForEntidad(ent);
        // Usar nueva lógica renderCardList
        renderCardList(cont, j.columnas, j.datos, ent, idCol);
        fetchGlobalCounts(document.getElementById('noti-badge'));
      })
      .catch(e => {
        cont.innerHTML = '<div class="alert alert-warning mb-0">Error cargando pendientes: ' + escapeHtml(e.message) + '</div>';
      });
  }

  function escapeHtml(v) {
    if (v == null) return '';
    return String(v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function parseJsonSafe(resp) {
    return resp.text().then(t => {
      try { return JSON.parse(t); }
      catch (e) { throw new Error('Respuesta Inválida: ' + t.substring(0, 100)); }
    });
  }

  function idColForEntidad(entidad) {
    return (entidad || 'mantenimientos') + '_id';
  }

  function detectEntidadFromVisibleSection() {
    const activeBtn = document.querySelector('.md-tab-btn.active');
    if (activeBtn && activeBtn.dataset.tab) {
      const key = activeBtn.dataset.tab;
      const sectionId = 'tab-content-' + key;
      if (sectionToEntity[sectionId]) return sectionToEntity[sectionId];
    }
    return currentEntidad || 'mantenimientos';
  }

  function setEntidad(entidad) {
    currentEntidad = (entidad || '').toLowerCase();
    setModalTitle(currentEntidad);
  }

  function setModalTitle(tituloOrEntidad) {
    const modalEl = document.getElementById('modal-pendientes-mantenimientos');
    if (!modalEl) return;
    const h = modalEl.querySelector('.modal-title');
    if (!h) return;
    if (entityPretty[tituloOrEntidad]) {
      h.innerHTML = '<i class="fas fa-bell"></i> Pendientes: ' + escapeHtml(entityPretty[tituloOrEntidad]);
    } else {
      h.innerHTML = '<i class="fas fa-bell"></i> ' + escapeHtml(tituloOrEntidad);
    }
  }

  function maybeServerAlert(prefix, serverMsg) {
    console.warn('[noti-debug]', serverMsg);
    // Solo suprimir excepciones internas si es necesario, 
    // pero por ahora para debug mostrar todo.
    if (serverMsg === 'exception') return;
    window.alert(prefix + "\n" + (serverMsg || ''));
  }

  // Arrancar
  initNoti();

})();