/**
 * Tank Data Management JavaScript
 * Handles daily tank records, inventory tracking, and dryer cycles
 * Updated with quality display, measurements, and temperature tracking
 */

// API endpoint
const LAB_API = 'assets/php/laboratorio_api.php';

// Current state
let tanques = [];
let variedades = [];
let registrosDiarios = [];
let editingRowId = null;

/**
 * Initialize tank data module
 */
async function initDatosTanques() {
    try {
        await Promise.all([
            loadTanques(),
            loadVariedades()
        ]);
        
        await loadRegistrosDiarios();
        setupEventListeners();
        setDefaultDate();
        
        console.log('Tank data module initialized');
    } catch (error) {
        console.error('Error initializing tank data:', error);
        showAlert('error', 'Error al inicializar el módulo de datos de tanques');
    }
}

/**
 * Load tanks from API
 */
async function loadTanques() {
    const response = await fetch(`${LAB_API}?action=get_tanques`);
    if (!response.ok) throw new Error('Error loading tanks');
    tanques = await response.json();
    populateTanqueSelect();
}

/**
 * Load varieties from API
 */
async function loadVariedades() {
    const response = await fetch(`${LAB_API}?action=get_variedades`);
    if (!response.ok) throw new Error('Error loading varieties');
    variedades = await response.json();
    populateVariedadSelect();
}

/**
 * Load daily records
 */
async function loadRegistrosDiarios() {
    const fecha = document.getElementById('fecha-registro')?.value || new Date().toISOString().split('T')[0];
    
    try {
        const response = await fetch(`${LAB_API}?action=get_registros_hoy&fecha=${fecha}`);
        if (!response.ok) throw new Error('Error loading daily records');
        registrosDiarios = await response.json();
        renderRegistrosTable();
    } catch (error) {
        console.error('Error loading daily records:', error);
        showAlert('error', 'Error al cargar registros diarios');
    }
}

/**
 * Populate tank select dropdown
 */
function populateTanqueSelect() {
    const select = document.getElementById('select-tanque-nuevo');
    if (!select) return;
    
    select.innerHTML = '<option value="">Seleccione tanque...</option>';
    tanques.forEach(t => {
        const option = document.createElement('option');
        option.value = t.id;
        option.textContent = `Tanque ${t.numero_tanque}`;
        select.appendChild(option);
    });
}

/**
 * Populate variety select dropdown
 */
function populateVariedadSelect() {
    const selects = document.querySelectorAll('.select-variedad-tanque');
    selects.forEach(select => {
        select.innerHTML = '<option value="">Seleccione variedad...</option>';
        variedades.forEach(v => {
            const option = document.createElement('option');
            option.value = v.id;
            option.textContent = v.nombre;
            select.appendChild(option);
        });
    });
}

/**
 * Setup event listeners
 */
function setupEventListeners() {
    // Date change
    const fechaInput = document.getElementById('fecha-registro');
    if (fechaInput) {
        fechaInput.addEventListener('change', loadRegistrosDiarios);
    }
    
    // Add new record button
    const btnAgregarFila = document.getElementById('btn-agregar-fila');
    if (btnAgregarFila) {
        btnAgregarFila.addEventListener('click', agregarNuevaFila);
    }
    
    // Tank form submission
    const formTanque = document.getElementById('form-nuevo-tanque');
    if (formTanque) {
        formTanque.addEventListener('submit', handleSaveTanque);
    }
    
    // Tank selection in new record
    const selectTanqueNuevo = document.getElementById('select-tanque-nuevo');
    if (selectTanqueNuevo) {
        selectTanqueNuevo.addEventListener('change', handleTanqueNuevoChange);
    }
    
    // Measurement calculation modal
    const btnCalcMedicion = document.getElementById('btn-calcular-medicion');
    if (btnCalcMedicion) {
        btnCalcMedicion.addEventListener('click', calcularMedicion);
    }
    
    const btnGuardarMedicion = document.getElementById('btn-guardar-medicion');
    if (btnGuardarMedicion) {
        btnGuardarMedicion.addEventListener('click', guardarMedicionCalculo);
    }
    
    // Day close modal
    const btnConfirmarCierre = document.getElementById('btn-confirmar-cierre');
    if (btnConfirmarCierre) {
        btnConfirmarCierre.addEventListener('click', confirmarCierreDia);
    }
}

/**
 * Set default date to today
 */
function setDefaultDate() {
    const fechaInput = document.getElementById('fecha-registro');
    if (fechaInput && !fechaInput.value) {
        fechaInput.value = new Date().toISOString().split('T')[0];
    }
}

/**
 * Render daily records table
 */
function renderRegistrosTable() {
    const tbody = document.getElementById('registros-tbody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    if (registrosDiarios.length === 0) {
        // Show 7 empty rows for new entries
        for (let i = 0; i < 7; i++) {
            tbody.appendChild(createEmptyRow(i + 1));
        }
        return;
    }
    
    registrosDiarios.forEach((registro, index) => {
        tbody.appendChild(createRegistroRow(registro, index + 1));
    });
    
    // Add remaining empty rows to reach 7
    const remaining = 7 - registrosDiarios.length;
    for (let i = 0; i < remaining; i++) {
        tbody.appendChild(createEmptyRow(registrosDiarios.length + i + 1));
    }
}

/**
 * Create an empty row for new entry
 */
function createEmptyRow(rowNum) {
    const tr = document.createElement('tr');
    tr.className = 'registro-row empty-row';
    tr.dataset.rowNum = rowNum;
    
    tr.innerHTML = `
        <td>
            <select class="form-select form-select-sm select-tanque-row" data-field="id_tanque">
                <option value="">Seleccione...</option>
                ${tanques.map(t => `<option value="${t.id}">${t.numero_tanque}</option>`).join('')}
            </select>
        </td>
        <td class="variedad-cell">-</td>
        <td class="calidad-cell quality-display">-</td>
        <td class="capacidad-cell">-</td>
        <td class="inventario-inicial-cell">0.00</td>
        <td>
            <input type="number" step="0.01" class="form-control form-control-sm" 
                   data-field="despacho_neto" placeholder="0.00" disabled>
        </td>
        <td>
            <input type="number" step="0.01" class="form-control form-control-sm" 
                   data-field="inventario_final" placeholder="0.00" disabled>
        </td>
        <td class="secadores-cell">0</td>
        <td class="ton-secadores-cell">0.00</td>
        <td class="med-ini-cell">
            <button class="btn btn-sm btn-outline-info btn-med-calculo" data-tipo="inicial" disabled>
                <i class="fas fa-calculator"></i>
            </button>
            <span class="med-valor">-</span>
        </td>
        <td class="med-final-cell">
            <button class="btn btn-sm btn-outline-info btn-med-calculo" data-tipo="final" disabled>
                <i class="fas fa-calculator"></i>
            </button>
            <span class="med-valor">-</span>
        </td>
        <td>
            <input type="number" step="0.1" class="form-control form-control-sm" 
                   data-field="temperatura_inicial" placeholder="°C" disabled style="width: 60px;">
        </td>
        <td>
            <input type="number" step="0.1" class="form-control form-control-sm" 
                   data-field="temperatura_final" placeholder="°C" disabled style="width: 60px;">
        </td>
        <td class="text-center">
            <button class="btn btn-sm btn-outline-primary btn-guardar-fila" disabled>
                <i class="fas fa-save"></i>
            </button>
        </td>
    `;
    
    // Setup tank selection event
    const selectTanque = tr.querySelector('.select-tanque-row');
    selectTanque.addEventListener('change', (e) => handleRowTanqueChange(e, tr));
    
    // Setup save button
    const btnGuardar = tr.querySelector('.btn-guardar-fila');
    btnGuardar.addEventListener('click', () => saveRegistroRow(tr));
    
    return tr;
}

/**
 * Create a row with existing registro data
 */
function createRegistroRow(registro, rowNum) {
    const tr = document.createElement('tr');
    tr.className = 'registro-row';
    tr.dataset.rowNum = rowNum;
    tr.dataset.registroId = registro.id;
    
    const isCerrado = registro.cerrado;
    
    // Build quality display
    const qualityHtml = buildQualityDisplay(registro);
    
    tr.innerHTML = `
        <td>
            <span class="tanque-numero">${registro.numero_tanque}</span>
            <input type="hidden" data-field="id_tanque" value="${registro.id_tanque}">
        </td>
        <td class="variedad-cell">${registro.variedad_nombre || '-'}</td>
        <td class="calidad-cell quality-display">${qualityHtml}</td>
        <td class="capacidad-cell">${registro.capacidad_toneladas || '-'}</td>
        <td class="inventario-inicial-cell">${parseFloat(registro.inventario_inicial || 0).toFixed(2)}</td>
        <td>
            <input type="number" step="0.01" class="form-control form-control-sm" 
                   data-field="despacho_neto" value="${registro.despacho_neto || ''}" 
                   ${isCerrado ? 'disabled' : ''}>
        </td>
        <td>
            <input type="number" step="0.01" class="form-control form-control-sm" 
                   data-field="inventario_final" value="${registro.inventario_final || ''}" 
                   ${isCerrado ? 'disabled' : ''}>
        </td>
        <td class="secadores-cell">${registro.total_secadores || 0}</td>
        <td class="ton-secadores-cell">${parseFloat(registro.total_ton_secadores || 0).toFixed(2)}</td>
        <td class="med-ini-cell">
            <button class="btn btn-sm btn-outline-info btn-med-calculo" data-tipo="inicial" 
                    data-registro-id="${registro.id}" data-capacidad="${registro.capacidad_toneladas || 0}"
                    ${isCerrado ? 'disabled' : ''}>
                <i class="fas fa-calculator"></i>
            </button>
            <span class="med-valor">${registro.medicion_inicial ? parseFloat(registro.medicion_inicial).toFixed(2) : '-'}</span>
        </td>
        <td class="med-final-cell">
            <button class="btn btn-sm btn-outline-info btn-med-calculo" data-tipo="final" 
                    data-registro-id="${registro.id}" data-capacidad="${registro.capacidad_toneladas || 0}"
                    ${isCerrado ? 'disabled' : ''}>
                <i class="fas fa-calculator"></i>
            </button>
            <span class="med-valor">${registro.medicion_final ? parseFloat(registro.medicion_final).toFixed(2) : '-'}</span>
        </td>
        <td>
            <input type="number" step="0.1" class="form-control form-control-sm" 
                   data-field="temperatura_inicial" value="${registro.temperatura_inicial || ''}" 
                   placeholder="°C" ${isCerrado ? 'disabled' : ''} style="width: 60px;">
        </td>
        <td>
            <input type="number" step="0.1" class="form-control form-control-sm" 
                   data-field="temperatura_final" value="${registro.temperatura_final || ''}" 
                   placeholder="°C" ${isCerrado ? 'disabled' : ''} style="width: 60px;">
        </td>
        <td class="text-center">
            ${isCerrado ? `
                <span class="badge bg-success">Cerrado</span>
            ` : `
                <button class="btn btn-sm btn-outline-primary btn-guardar-fila me-1" title="Guardar">
                    <i class="fas fa-save"></i>
                </button>
                <button class="btn btn-sm btn-outline-success btn-cerrar-fila" title="Cerrar día">
                    <i class="fas fa-check"></i>
                </button>
            `}
        </td>
    `;
    
    if (!isCerrado) {
        // Setup save button
        const btnGuardar = tr.querySelector('.btn-guardar-fila');
        btnGuardar.addEventListener('click', () => saveRegistroRow(tr));
        
        // Setup close button
        const btnCerrar = tr.querySelector('.btn-cerrar-fila');
        btnCerrar.addEventListener('click', () => openCierreModal(registro));
        
        // Setup measurement calculation buttons
        tr.querySelectorAll('.btn-med-calculo').forEach(btn => {
            btn.addEventListener('click', () => openMedicionModal(btn.dataset.registroId, btn.dataset.tipo, btn.dataset.capacidad));
        });
    }
    
    return tr;
}

/**
 * Build quality display HTML with badges
 */
function buildQualityDisplay(registro) {
    const parts = [];
    
    if (registro.calidad_humedad) {
        parts.push(`<span class="badge calidad-badge bg-info">${parseFloat(registro.calidad_humedad).toFixed(2)}% hum</span>`);
    }
    if (registro.calidad_yodo) {
        parts.push(`<span class="badge calidad-badge bg-warning text-dark">${parseFloat(registro.calidad_yodo).toFixed(2)}% yodo</span>`);
    }
    if (registro.calidad_acidez) {
        parts.push(`<span class="badge calidad-badge bg-success">${parseFloat(registro.calidad_acidez).toFixed(2)}% acid</span>`);
    }
    
    return parts.length > 0 ? parts.join('') : '-';
}

/**
 * Open measurement calculation modal
 */
function openMedicionModal(registroId, tipo, capacidad) {
    document.getElementById('medicion-registro-id').value = registroId;
    document.getElementById('medicion-tipo').value = tipo;
    document.getElementById('medicion-capacidad').value = capacidad;
    document.getElementById('medicion-p-ref-ini').value = '';
    document.getElementById('medicion-p-ref-fin').value = '';
    document.getElementById('medicion-resultado').value = '';
    
    const titulo = tipo === 'inicial' ? 'Cálculo de Medición Inicial' : 'Cálculo de Medición Final';
    document.getElementById('modal-medicion-titulo').innerHTML = `<i class="fas fa-calculator me-2"></i>${titulo}`;
    
    const modal = new bootstrap.Modal(document.getElementById('modal-medicion-calculo'));
    modal.show();
}

/**
 * Calculate measurement from formula
 */
function calcularMedicion() {
    const capacidad = parseFloat(document.getElementById('medicion-capacidad').value) || 0;
    const pRefIni = parseFloat(document.getElementById('medicion-p-ref-ini').value) || 0;
    const pRefFin = parseFloat(document.getElementById('medicion-p-ref-fin').value) || 0;
    
    // Formula: Capacidad - (P REF INI - P REF FIN)
    const resultado = capacidad - (pRefIni - pRefFin);
    document.getElementById('medicion-resultado').value = resultado.toFixed(3);
}

/**
 * Save measurement calculation
 */
async function guardarMedicionCalculo() {
    const registroId = document.getElementById('medicion-registro-id').value;
    const tipo = document.getElementById('medicion-tipo').value;
    const resultado = document.getElementById('medicion-resultado').value;
    const pRefIni = document.getElementById('medicion-p-ref-ini').value;
    const pRefFin = document.getElementById('medicion-p-ref-fin').value;
    
    if (!resultado) {
        showAlert('warning', 'Primero calcule el resultado');
        return;
    }
    
    try {
        const response = await fetch(`${LAB_API}?action=save_medicion_calculo`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                id: registroId,
                tipo: tipo,
                medicion_resultado: resultado,
                p_ref_ini: pRefIni,
                p_ref_fin: pRefFin
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            showAlert('success', 'Medición guardada correctamente');
            const modal = bootstrap.Modal.getInstance(document.getElementById('modal-medicion-calculo'));
            if (modal) modal.hide();
            await loadRegistrosDiarios();
        } else {
            showAlert('error', result.error || 'Error al guardar');
        }
    } catch (error) {
        console.error('Error saving measurement:', error);
        showAlert('error', 'Error al guardar la medición');
    }
}

/**
 * Open day close modal
 */
function openCierreModal(registro) {
    document.getElementById('cierre-registro-id').value = registro.id;
    document.getElementById('cierre-tanque-nombre').textContent = registro.numero_tanque;
    document.getElementById('cierre-inv-inicial').textContent = `${parseFloat(registro.inventario_inicial || 0).toFixed(2)} Ton`;
    document.getElementById('cierre-despacho').textContent = `${parseFloat(registro.despacho_neto || 0).toFixed(2)} Ton`;
    document.getElementById('cierre-inv-final').value = registro.inventario_final || '';
    document.getElementById('cierre-observaciones').value = '';
    
    const modal = new bootstrap.Modal(document.getElementById('modal-cierre-dia'));
    modal.show();
}

/**
 * Confirm day close
 */
async function confirmarCierreDia() {
    const registroId = document.getElementById('cierre-registro-id').value;
    const invFinal = document.getElementById('cierre-inv-final').value;
    const observaciones = document.getElementById('cierre-observaciones').value;
    
    if (!invFinal) {
        showAlert('warning', 'Ingrese el inventario final');
        return;
    }
    
    try {
        const response = await fetch(`${LAB_API}?action=cerrar_registro_diario`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                id: registroId,
                inventario_final: invFinal,
                observaciones: observaciones
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            showAlert('success', 'Día cerrado correctamente. El inventario final será el inicial del próximo día.');
            const modal = bootstrap.Modal.getInstance(document.getElementById('modal-cierre-dia'));
            if (modal) modal.hide();
            await loadRegistrosDiarios();
        } else {
            showAlert('error', result.error || 'Error al cerrar el día');
        }
    } catch (error) {
        console.error('Error closing day:', error);
        showAlert('error', 'Error al cerrar el día');
    }
}

/**
 * Handle tank selection in a row
 */
async function handleRowTanqueChange(e, row) {
    const tanqueId = e.target.value;
    
    if (!tanqueId) {
        // Clear row data
        row.querySelector('.variedad-cell').textContent = '-';
        row.querySelector('.calidad-cell').textContent = '-';
        row.querySelector('.capacidad-cell').textContent = '-';
        row.querySelector('.inventario-inicial-cell').textContent = '0.00';
        row.querySelectorAll('input').forEach(input => input.disabled = true);
        row.querySelector('.btn-guardar-fila').disabled = true;
        return;
    }
    
    const tanque = tanques.find(t => t.id == tanqueId);
    if (!tanque) return;
    
    // Update row with tank data
    row.querySelector('.variedad-cell').textContent = tanque.variedad_nombre || '-';
    row.querySelector('.calidad-cell').textContent = tanque.calidad || '-';
    row.querySelector('.capacidad-cell').textContent = tanque.capacidad_toneladas || '-';
    
    // Get previous day's closing inventory
    const fecha = document.getElementById('fecha-registro')?.value || new Date().toISOString().split('T')[0];
    try {
        const response = await fetch(`${LAB_API}?action=get_inventario_anterior&id_tanque=${tanqueId}&fecha=${fecha}`);
        const data = await response.json();
        row.querySelector('.inventario-inicial-cell').textContent = parseFloat(data.inventario_final || 0).toFixed(2);
    } catch (error) {
        console.error('Error getting previous inventory:', error);
        row.querySelector('.inventario-inicial-cell').textContent = '0.00';
    }
    
    // Enable inputs
    row.querySelectorAll('input').forEach(input => input.disabled = false);
    row.querySelector('.btn-guardar-fila').disabled = false;
}

/**
 * Save a registro row
 */
async function saveRegistroRow(row) {
    const registroId = row.dataset.registroId;
    const fecha = document.getElementById('fecha-registro')?.value || new Date().toISOString().split('T')[0];
    
    // Collect data from row
    const data = {
        id: registroId || null,
        id_tanque: row.querySelector('[data-field="id_tanque"]').value,
        fecha: fecha,
        despacho_neto: row.querySelector('[data-field="despacho_neto"]').value || 0,
        inventario_final: row.querySelector('[data-field="inventario_final"]').value || null,
        temperatura_inicial: row.querySelector('[data-field="temperatura_inicial"]')?.value || null,
        temperatura_final: row.querySelector('[data-field="temperatura_final"]')?.value || null
    };
    
    if (!data.id_tanque) {
        showAlert('warning', 'Seleccione un tanque');
        return;
    }
    
    try {
        const response = await fetch(`${LAB_API}?action=save_registro_diario`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        
        const result = await response.json();
        
        if (result.success) {
            showAlert('success', result.message);
            await loadRegistrosDiarios();
        } else {
            showAlert('error', result.error || 'Error al guardar');
        }
    } catch (error) {
        console.error('Error saving registro:', error);
        showAlert('error', 'Error al guardar el registro');
    }
}

/**
 * Handle tank selection in new tank form
 */
function handleTanqueNuevoChange(e) {
    const tanqueId = e.target.value;
    if (!tanqueId) return;
    
    const tanque = tanques.find(t => t.id == tanqueId);
    if (!tanque) return;
    
    // Pre-fill tank info
    document.getElementById('info-variedad').textContent = tanque.variedad_nombre || '-';
    document.getElementById('info-capacidad').textContent = tanque.capacidad_toneladas || '-';
}

/**
 * Handle save tank form
 */
async function handleSaveTanque(e) {
    e.preventDefault();
    
    const data = {
        id: document.getElementById('tanque-id')?.value || null,
        numero_tanque: document.getElementById('numero-tanque').value,
        id_variedad: document.getElementById('variedad-tanque').value || null,
        capacidad_toneladas: document.getElementById('capacidad-tanque').value
    };
    
    if (!data.numero_tanque || !data.capacidad_toneladas) {
        showAlert('warning', 'Complete los campos obligatorios');
        return;
    }
    
    try {
        const response = await fetch(`${LAB_API}?action=save_tanque`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        
        const result = await response.json();
        
        if (result.success) {
            showAlert('success', result.message);
            await loadTanques();
            
            // Close modal
            const modal = bootstrap.Modal.getInstance(document.getElementById('modal-nuevo-tanque'));
            if (modal) modal.hide();
            
            // Reset form
            e.target.reset();
        } else {
            showAlert('error', result.error || 'Error al guardar tanque');
        }
    } catch (error) {
        console.error('Error saving tank:', error);
        showAlert('error', 'Error al guardar el tanque');
    }
}

/**
 * Add new row to the table
 */
function agregarNuevaFila() {
    const tbody = document.getElementById('registros-tbody');
    if (!tbody) return;
    
    const rowCount = tbody.querySelectorAll('.registro-row').length;
    tbody.appendChild(createEmptyRow(rowCount + 1));
}

/**
 * Load historical records
 */
async function loadHistorico() {
    const fechaDesde = document.getElementById('fecha-desde')?.value;
    const fechaHasta = document.getElementById('fecha-hasta')?.value;
    const tanqueId = document.getElementById('filtro-tanque')?.value || 0;
    
    try {
        const url = `${LAB_API}?action=get_registros_diarios&id_tanque=${tanqueId}&fecha_desde=${fechaDesde}&fecha_hasta=${fechaHasta}`;
        const response = await fetch(url);
        const registros = await response.json();
        
        renderHistoricoTable(registros);
    } catch (error) {
        console.error('Error loading historical records:', error);
        showAlert('error', 'Error al cargar histórico');
    }
}

/**
 * Render historical records table
 */
function renderHistoricoTable(registros) {
    const tbody = document.getElementById('historico-tbody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    if (registros.length === 0) {
        tbody.innerHTML = '<tr><td colspan="12" class="text-center text-muted">Sin registros en el período seleccionado</td></tr>';
        return;
    }
    
    registros.forEach(r => {
        const qualityHtml = buildQualityDisplay(r);
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${formatDate(r.fecha)}</td>
            <td>${r.numero_tanque}</td>
            <td class="quality-display">${qualityHtml}</td>
            <td>${parseFloat(r.inventario_inicial || 0).toFixed(2)}</td>
            <td>${parseFloat(r.despacho_neto || 0).toFixed(2)}</td>
            <td>${r.inventario_final ? parseFloat(r.inventario_final).toFixed(2) : '-'}</td>
            <td>${r.total_secadores || 0}</td>
            <td>${parseFloat(r.total_ton_secadores || 0).toFixed(2)}</td>
            <td>${r.medicion_inicial ? parseFloat(r.medicion_inicial).toFixed(2) : '-'}</td>
            <td>${r.medicion_final ? parseFloat(r.medicion_final).toFixed(2) : '-'}</td>
            <td>${r.cerrado ? '<span class="badge bg-success">Cerrado</span>' : '<span class="badge bg-warning">Abierto</span>'}</td>
            <td>${r.ac_nombre1 ? `${r.ac_nombre1} ${r.ac_apellido1 || ''}` : '-'}</td>
        `;
        tbody.appendChild(tr);
    });
}

/**
 * Format date for display
 */
function formatDate(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('es-CO', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    });
}

/**
 * Show alert message
 */
function showAlert(type, message) {
    const alertContainer = document.getElementById('alert-container');
    if (!alertContainer) {
        console.log(`[${type}] ${message}`);
        return;
    }
    
    const alertClass = {
        success: 'alert-success',
        error: 'alert-danger',
        warning: 'alert-warning',
        info: 'alert-info'
    }[type] || 'alert-info';
    
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert ${alertClass} alert-dismissible fade show`;
    alertDiv.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    alertContainer.appendChild(alertDiv);
    
    // Auto-dismiss after 5 seconds
    setTimeout(() => {
        alertDiv.remove();
    }, 5000);
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', initDatosTanques);
