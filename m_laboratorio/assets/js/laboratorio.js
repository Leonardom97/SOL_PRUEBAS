/**
 * Laboratory Module - Main JavaScript
 * Handles tank data, measurements, and form interactions
 * Redesigned with modal-based phase-driven form
 * Updated to support measurement types: Tanque, Bombeo, Despacho
 */

// API endpoint
const LAB_API = 'assets/php/laboratorio_api.php';

// Current state
let tanques = [];
let variedades = [];
let lugaresMuestreo = [];
let secadores = [];
let currentTanque = null;
let colaboradorActual = {};
let currentPhase = 1;
let selectedMeasurements = { acidez: false, humedad: false, yodo: false };
let currentMeasurementType = 'tanque'; // tanque, bombeo, despacho

// Pagination state
let currentPage = 1;
let itemsPerPage = 10;
let allMeasurements = [];
let filteredMeasurements = [];

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
    if (text == null) return '';
    const div = document.createElement('div');
    div.textContent = String(text);
    return div.innerHTML;
}

/**
 * Initialize the laboratory module
 */
async function initLaboratorio() {
    try {
        await Promise.all([
            loadTanques(),
            loadVariedades(),
            loadLugaresMuestreo(),
            loadSecadores()
        ]);
        
        setupEventListeners();
        setDefaultDates();
        await loadAllMeasurements();
        
        console.log('Laboratory module initialized');
    } catch (error) {
        console.error('Error initializing laboratory:', error);
        showAlert('error', 'Error al inicializar el módulo de laboratorio');
    }
}

/**
 * Set default dates for filters
 */
function setDefaultDates() {
    const today = new Date();
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const fechaHasta = document.getElementById('fecha-hasta');
    const fechaDesde = document.getElementById('fecha-desde');
    
    if (fechaHasta) fechaHasta.value = today.toISOString().split('T')[0];
    if (fechaDesde) fechaDesde.value = thirtyDaysAgo.toISOString().split('T')[0];
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
}

/**
 * Load sampling locations from API
 */
async function loadLugaresMuestreo() {
    const response = await fetch(`${LAB_API}?action=get_lugares_muestreo`);
    if (!response.ok) throw new Error('Error loading sampling locations');
    lugaresMuestreo = await response.json();
    populateLugarMuestreoSelect();
}

/**
 * Load dryers/secadores from API
 */
async function loadSecadores() {
    try {
        const response = await fetch(`${LAB_API}?action=get_secadores`);
        if (!response.ok) throw new Error('Error loading secadores');
        secadores = await response.json();
        populateSecadorSelect();
    } catch (error) {
        console.warn('Could not load secadores:', error);
        secadores = [];
    }
}

/**
 * Populate tank select dropdown
 */
function populateTanqueSelect() {
    const selects = document.querySelectorAll('.select-tanque');
    selects.forEach(select => {
        const currentValue = select.value;
        const isFilter = select.id === 'select-tanque-filtro';
        select.innerHTML = isFilter 
            ? '<option value="">Todos los tanques</option>'
            : '<option value="">Seleccione tanque...</option>';
        tanques.forEach(t => {
            const option = document.createElement('option');
            option.value = t.id;
            option.textContent = `Tanque ${t.numero_tanque} - ${t.variedad_nombre || 'Sin variedad'}`;
            select.appendChild(option);
        });
        if (currentValue) select.value = currentValue;
    });
}

/**
 * Populate secador/dryer select dropdown
 */
function populateSecadorSelect() {
    const select = document.getElementById('select-secador');
    if (!select) return;
    
    select.innerHTML = '<option value="">Seleccione secador...</option>';
    secadores.forEach(s => {
        const option = document.createElement('option');
        option.value = s.id;
        option.textContent = `${s.nombre} (${s.codigo})`;
        select.appendChild(option);
    });
}

/**
 * Populate sampling location select dropdown
 */
function populateLugarMuestreoSelect() {
    const selects = document.querySelectorAll('.select-lugar-muestreo');
    selects.forEach(select => {
        const currentValue = select.value;
        select.innerHTML = '<option value="">Seleccione lugar...</option>';
        lugaresMuestreo.forEach(l => {
            const option = document.createElement('option');
            option.value = l.id;
            option.textContent = l.nombre;
            select.appendChild(option);
        });
        if (currentValue) select.value = currentValue;
    });
}

/**
 * Setup event listeners
 */
function setupEventListeners() {
    // Measurement type cards (Tanque, Bombeo, Despacho)
    document.querySelectorAll('.measurement-type-card[data-tipo]').forEach(card => {
        card.addEventListener('click', (e) => {
            selectMeasurementType(card.dataset.tipo);
        });
        card.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                selectMeasurementType(card.dataset.tipo);
            }
        });
    });
    
    // Tank selection in modal
    const selectTanque = document.getElementById('select-tanque-principal');
    if (selectTanque) {
        selectTanque.addEventListener('change', handleTanqueChange);
    }
    
    // Secador selection
    const selectSecador = document.getElementById('select-secador');
    if (selectSecador) {
        selectSecador.addEventListener('change', handleSecadorChange);
    }
    
    // Measurement cards - click and keyboard handlers
    document.querySelectorAll('.measurement-card[data-measurement]').forEach(card => {
        const measurementType = card.dataset.measurement;
        
        // Click handler
        card.addEventListener('click', (e) => {
            // Don't trigger if clicking directly on checkbox
            if (e.target.type === 'checkbox') return;
            toggleMeasurement(measurementType);
        });
        
        // Keyboard handler for accessibility
        card.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                toggleMeasurement(measurementType);
            }
        });
    });
    
    // Measurement checkboxes
    const checkAcidez = document.getElementById('check-acidez');
    const checkHumedad = document.getElementById('check-humedad');
    const checkYodo = document.getElementById('check-yodo');
    
    if (checkAcidez) {
        checkAcidez.addEventListener('change', (e) => {
            e.stopPropagation();
            selectedMeasurements.acidez = e.target.checked;
            updateMeasurementCard('acidez', e.target.checked);
        });
    }
    if (checkHumedad) {
        checkHumedad.addEventListener('change', (e) => {
            e.stopPropagation();
            selectedMeasurements.humedad = e.target.checked;
            updateMeasurementCard('humedad', e.target.checked);
        });
    }
    if (checkYodo) {
        checkYodo.addEventListener('change', (e) => {
            e.stopPropagation();
            selectedMeasurements.yodo = e.target.checked;
            updateMeasurementCard('yodo', e.target.checked);
        });
    }
    
    // Manual toggles
    const manualAcidez = document.getElementById('manual-acidez');
    const manualHumedad = document.getElementById('manual-humedad');
    const manualYodo = document.getElementById('manual-yodo');
    
    if (manualAcidez) {
        manualAcidez.addEventListener('change', () => toggleManualInput('acidez', manualAcidez.checked));
    }
    if (manualHumedad) {
        manualHumedad.addEventListener('change', () => toggleManualInput('humedad', manualHumedad.checked));
    }
    if (manualYodo) {
        manualYodo.addEventListener('change', () => toggleManualInput('yodo', manualYodo.checked));
    }
    
    // Collaborator search buttons
    const btnSearchAcidez = document.getElementById('btn-search-colaborador-acidez');
    const btnSearchHumedad = document.getElementById('btn-search-colaborador-humedad');
    const btnSearchYodo = document.getElementById('btn-search-colaborador-yodo');
    
    if (btnSearchAcidez) btnSearchAcidez.addEventListener('click', () => searchColaborador('acidez'));
    if (btnSearchHumedad) btnSearchHumedad.addEventListener('click', () => searchColaborador('humedad'));
    if (btnSearchYodo) btnSearchYodo.addEventListener('click', () => searchColaborador('yodo'));
    
    // Calculate buttons
    setupCalculateButtons();
    
    // Phase navigation buttons
    const btnNextPhase = document.getElementById('btn-next-phase');
    const btnPrevPhase = document.getElementById('btn-prev-phase');
    const btnSave = document.getElementById('btn-save');
    
    if (btnNextPhase) btnNextPhase.addEventListener('click', goToNextPhase);
    if (btnPrevPhase) btnPrevPhase.addEventListener('click', goToPrevPhase);
    if (btnSave) btnSave.addEventListener('click', handleFormSubmit);
    
    // Filter button
    const btnFiltrar = document.getElementById('btn-filtrar');
    if (btnFiltrar) btnFiltrar.addEventListener('click', loadAllMeasurements);
    
    // Modal events
    const modalNuevaMedicion = document.getElementById('modal-nueva-medicion');
    if (modalNuevaMedicion) {
        modalNuevaMedicion.addEventListener('hidden.bs.modal', resetForm);
        modalNuevaMedicion.addEventListener('show.bs.modal', () => {
            currentPhase = 1;
            currentMeasurementType = 'tanque';
            updatePhaseDisplay();
            selectMeasurementType('tanque');
        });
    }
}

/**
 * Select measurement type (Tanque, Bombeo, Despacho)
 */
function selectMeasurementType(tipo) {
    currentMeasurementType = tipo;
    
    // Update card visual states
    document.querySelectorAll('.measurement-type-card').forEach(card => {
        card.classList.remove('selected');
    });
    const selectedCard = document.getElementById(`card-tipo-${tipo}`);
    if (selectedCard) {
        selectedCard.classList.add('selected');
    }
    
    // Show/hide corresponding source selection
    document.querySelectorAll('.source-selection').forEach(section => {
        section.style.display = 'none';
    });
    const sourceSection = document.getElementById(`source-${tipo}`);
    if (sourceSection) {
        sourceSection.style.display = 'block';
    }
}

/**
 * Handle secador/dryer selection change
 */
function handleSecadorChange(e) {
    const secadorId = e.target.value;
    const container = document.getElementById('secador-info-container');
    const infoContainer = document.getElementById('secador-info');
    
    if (!secadorId) {
        if (container) container.style.display = 'none';
        return;
    }
    
    const secador = secadores.find(s => s.id == secadorId);
    if (!secador) {
        if (container) container.style.display = 'none';
        return;
    }
    
    if (container && infoContainer) {
        container.style.display = 'block';
        infoContainer.innerHTML = `
            <div class="row text-center">
                <div class="col-6">
                    <small class="text-muted d-block">Secador</small>
                    <strong>${secador.nombre}</strong>
                </div>
                <div class="col-6">
                    <small class="text-muted d-block">Capacidad</small>
                    <strong>${secador.capacidad_toneladas || 'N/A'} ton</strong>
                </div>
            </div>
        `;
    }
}

/**
 * Toggle measurement selection from card click
 */
function toggleMeasurement(type) {
    const checkbox = document.getElementById(`check-${type}`);
    if (checkbox) {
        checkbox.checked = !checkbox.checked;
        selectedMeasurements[type] = checkbox.checked;
        updateMeasurementCard(type, checkbox.checked);
    }
}

/**
 * Update measurement card visual state
 */
function updateMeasurementCard(type, selected) {
    const card = document.getElementById(`card-${type}`);
    if (card) {
        if (selected) {
            card.classList.add('selected');
            card.setAttribute('aria-pressed', 'true');
        } else {
            card.classList.remove('selected');
            card.setAttribute('aria-pressed', 'false');
        }
    }
    updateNoSelectionWarning();
}

/**
 * Update no selection warning visibility
 */
function updateNoSelectionWarning() {
    const warning = document.getElementById('no-selection-warning');
    const hasSelection = selectedMeasurements.acidez || selectedMeasurements.humedad || selectedMeasurements.yodo;
    if (warning) {
        warning.style.display = hasSelection ? 'none' : 'block';
    }
}

/**
 * Toggle between manual and formula input
 */
function toggleManualInput(type, isManual) {
    const manualInput = document.getElementById(`${type}-manual-input`);
    const formulaInput = document.getElementById(`${type}-formula-input`);
    
    if (manualInput) manualInput.style.display = isManual ? 'block' : 'none';
    if (formulaInput) formulaInput.style.display = isManual ? 'none' : 'block';
}

/**
 * Go to next phase
 */
function goToNextPhase() {
    if (currentPhase === 1) {
        // Validate based on measurement type
        if (currentMeasurementType === 'tanque') {
            const tanqueId = document.getElementById('select-tanque-principal')?.value;
            if (!tanqueId) {
                showAlert('warning', 'Seleccione un tanque');
                return;
            }
        } else if (currentMeasurementType === 'bombeo') {
            const secadorId = document.getElementById('select-secador')?.value;
            const tanqueDestino = document.getElementById('select-tanque-destino')?.value;
            const toneladas = document.getElementById('toneladas-bombeo')?.value;
            
            if (!secadorId) {
                showAlert('warning', 'Seleccione un secador');
                return;
            }
            if (!tanqueDestino) {
                showAlert('warning', 'Seleccione el tanque destino');
                return;
            }
            if (!toneladas || parseFloat(toneladas) <= 0) {
                showAlert('warning', 'Ingrese las toneladas bombeadas');
                return;
            }
        } else if (currentMeasurementType === 'despacho') {
            const tanqueDespacho = document.getElementById('select-tanque-despacho')?.value;
            const toneladas = document.getElementById('toneladas-despacho')?.value;
            const placa = document.getElementById('placa-vehiculo')?.value;
            const responsable = document.getElementById('responsable-vehiculo')?.value;
            
            if (!tanqueDespacho) {
                showAlert('warning', 'Seleccione el tanque de origen');
                return;
            }
            if (!toneladas || parseFloat(toneladas) <= 0) {
                showAlert('warning', 'Ingrese las toneladas despachadas');
                return;
            }
            if (!placa || placa.trim() === '') {
                showAlert('warning', 'Ingrese la placa del vehículo');
                return;
            }
            if (!responsable || responsable.trim() === '') {
                showAlert('warning', 'Ingrese el responsable del vehículo');
                return;
            }
        }
        
        const hasSelection = selectedMeasurements.acidez || selectedMeasurements.humedad || selectedMeasurements.yodo;
        if (!hasSelection) {
            showAlert('warning', 'Seleccione al menos una medición');
            updateNoSelectionWarning();
            return;
        }
        
        // Show selected measurement sections
        document.getElementById('section-acidez').style.display = selectedMeasurements.acidez ? 'block' : 'none';
        document.getElementById('section-humedad').style.display = selectedMeasurements.humedad ? 'block' : 'none';
        document.getElementById('section-yodo').style.display = selectedMeasurements.yodo ? 'block' : 'none';
    }
    
    if (currentPhase === 2) {
        // Generate summary before showing phase 3
        generateSummary();
    }
    
    if (currentPhase < 3) {
        currentPhase++;
        updatePhaseDisplay();
    }
}

/**
 * Go to previous phase
 */
function goToPrevPhase() {
    if (currentPhase > 1) {
        currentPhase--;
        updatePhaseDisplay();
    }
}

/**
 * Update phase display
 */
function updatePhaseDisplay() {
    // Update phase steps visibility
    document.querySelectorAll('.phase-step').forEach((step, index) => {
        step.classList.toggle('active', index + 1 === currentPhase);
    });
    
    // Update phase indicators
    document.querySelectorAll('.phase-indicator').forEach((indicator, index) => {
        const phase = index + 1;
        indicator.classList.remove('active', 'completed');
        if (phase === currentPhase) {
            indicator.classList.add('active');
        } else if (phase < currentPhase) {
            indicator.classList.add('completed');
        }
    });
    
    // Update navigation buttons
    const btnPrev = document.getElementById('btn-prev-phase');
    const btnNext = document.getElementById('btn-next-phase');
    const btnSave = document.getElementById('btn-save');
    
    if (btnPrev) btnPrev.style.display = currentPhase > 1 ? 'inline-block' : 'none';
    if (btnNext) btnNext.style.display = currentPhase < 3 ? 'inline-block' : 'none';
    if (btnSave) btnSave.style.display = currentPhase === 3 ? 'inline-block' : 'none';
}

/**
 * Generate summary for phase 3
 */
function generateSummary() {
    const container = document.getElementById('summary-container');
    if (!container) return;
    
    let html = '';
    
    // Measurement type info
    const tipoLabel = {
        tanque: 'Tanque',
        bombeo: 'Bombeo (Secador → Tanque)',
        despacho: 'Despacho (Salida)'
    }[currentMeasurementType] || currentMeasurementType;
    
    html += `
        <div class="mb-3">
            <h6 class="text-muted mb-2">Tipo de Medición</h6>
            <p class="mb-0 fw-bold">${tipoLabel}</p>
        </div>
        <hr>
    `;
    
    // Source info based on type
    if (currentMeasurementType === 'tanque' && currentTanque) {
        html += `
            <div class="mb-3">
                <h6 class="text-muted mb-2">Tanque</h6>
                <p class="mb-0 fw-bold">${currentTanque.numero_tanque} - ${currentTanque.variedad_nombre || 'Sin variedad'}</p>
            </div>
            <hr>
        `;
    } else if (currentMeasurementType === 'bombeo') {
        const secadorId = document.getElementById('select-secador')?.value;
        const tanqueDestinoId = document.getElementById('select-tanque-destino')?.value;
        const toneladas = document.getElementById('toneladas-bombeo')?.value;
        
        const secador = secadores.find(s => s.id == secadorId);
        const tanqueDestino = tanques.find(t => t.id == tanqueDestinoId);
        
        html += `
            <div class="mb-3">
                <h6 class="text-muted mb-2">Origen (Secador)</h6>
                <p class="mb-0 fw-bold">${secador ? secador.nombre : 'N/A'}</p>
            </div>
            <div class="mb-3">
                <h6 class="text-muted mb-2">Destino (Tanque)</h6>
                <p class="mb-0 fw-bold">${tanqueDestino ? tanqueDestino.numero_tanque : 'N/A'}</p>
            </div>
            <div class="mb-3">
                <h6 class="text-muted mb-2">Toneladas Bombeadas</h6>
                <p class="mb-0 fw-bold">${toneladas || 0} Ton</p>
            </div>
            <hr>
        `;
    } else if (currentMeasurementType === 'despacho') {
        const tanqueDespachoId = document.getElementById('select-tanque-despacho')?.value;
        const toneladas = document.getElementById('toneladas-despacho')?.value;
        const placa = document.getElementById('placa-vehiculo')?.value;
        const responsable = document.getElementById('responsable-vehiculo')?.value;
        
        const tanqueDespacho = tanques.find(t => t.id == tanqueDespachoId);
        
        html += `
            <div class="mb-3">
                <h6 class="text-muted mb-2">Tanque de Origen</h6>
                <p class="mb-0 fw-bold">${tanqueDespacho ? tanqueDespacho.numero_tanque : 'N/A'}</p>
            </div>
            <div class="mb-3">
                <h6 class="text-muted mb-2">Toneladas Despachadas</h6>
                <p class="mb-0 fw-bold">${toneladas || 0} Ton</p>
            </div>
            <div class="mb-3">
                <h6 class="text-muted mb-2">Vehículo</h6>
                <p class="mb-0 fw-bold">${placa || 'N/A'} - ${responsable || 'N/A'}</p>
            </div>
            <hr>
        `;
    }
    
    // Acidez summary
    if (selectedMeasurements.acidez) {
        const isManual = document.getElementById('manual-acidez')?.checked;
        const valor = isManual 
            ? document.getElementById('valor-manual-acidez')?.value 
            : document.getElementById('resultado-acidez')?.value;
        html += `
            <div class="mb-3">
                <h6 class="text-success mb-2"><i class="fas fa-vial me-2"></i>Acidez</h6>
                <p class="mb-1"><strong>Valor:</strong> ${valor || 'No calculado'} %AGL</p>
                <p class="mb-0 small text-muted">Método: ${isManual ? 'Manual' : 'Fórmula'}</p>
            </div>
        `;
    }
    
    // Humedad summary
    if (selectedMeasurements.humedad) {
        const isManual = document.getElementById('manual-humedad')?.checked;
        const valor = isManual 
            ? document.getElementById('valor-manual-humedad')?.value 
            : document.getElementById('resultado-humedad')?.value;
        html += `
            <div class="mb-3">
                <h6 class="text-info mb-2"><i class="fas fa-tint me-2"></i>Humedad</h6>
                <p class="mb-1"><strong>Valor:</strong> ${valor || 'No calculado'} %</p>
                <p class="mb-0 small text-muted">Método: ${isManual ? 'Manual' : 'Fórmula'}</p>
            </div>
        `;
    }
    
    // Yodo summary
    if (selectedMeasurements.yodo) {
        const isManual = document.getElementById('manual-yodo')?.checked;
        const valor = isManual 
            ? document.getElementById('valor-manual-yodo')?.value 
            : document.getElementById('resultado-yodo')?.value;
        html += `
            <div class="mb-3">
                <h6 class="text-warning mb-2"><i class="fas fa-atom me-2"></i>Yodo</h6>
                <p class="mb-1"><strong>Valor:</strong> ${valor || 'No calculado'}</p>
                <p class="mb-0 small text-muted">Método: ${isManual ? 'Manual' : 'Fórmula'}</p>
            </div>
        `;
    }
    
    container.innerHTML = html || '<p class="text-muted">No hay datos para mostrar</p>';
}

/**
 * Handle tank selection change
 */
async function handleTanqueChange(e) {
    const tanqueId = e.target.value;
    if (!tanqueId) {
        currentTanque = null;
        document.getElementById('tanque-info-container').style.display = 'none';
        return;
    }
    
    currentTanque = tanques.find(t => t.id == tanqueId);
    updateTanqueInfo(currentTanque);
}

/**
 * Update tank info display
 */
function updateTanqueInfo(tanque) {
    const container = document.getElementById('tanque-info-container');
    const infoContainer = document.getElementById('tanque-info');
    
    if (!container || !infoContainer) return;
    
    if (!tanque) {
        container.style.display = 'none';
        return;
    }
    
    container.style.display = 'block';
    infoContainer.innerHTML = `
        <div class="row text-center">
            <div class="col-6 col-md-3">
                <small class="text-muted d-block">Número</small>
                <strong>${tanque.numero_tanque}</strong>
            </div>
            <div class="col-6 col-md-3">
                <small class="text-muted d-block">Variedad</small>
                <strong>${tanque.variedad_nombre || 'N/A'}</strong>
            </div>
            <div class="col-6 col-md-3">
                <small class="text-muted d-block">Capacidad</small>
                <strong>${tanque.capacidad_toneladas} ton</strong>
            </div>
            <div class="col-6 col-md-3">
                <small class="text-muted d-block">Calidad</small>
                <strong>${tanque.calidad || 'N/A'}</strong>
            </div>
        </div>
    `;
}

/**
 * Search collaborator by cedula
 */
async function searchColaborador(tipo) {
    const cedulaInput = document.getElementById(`cedula-${tipo}`);
    const nombreInput = document.getElementById(`nombre-${tipo}`);
    
    if (!cedulaInput || !cedulaInput.value) {
        showAlert('warning', 'Ingrese una cédula');
        return;
    }
    
    try {
        const response = await fetch(`${LAB_API}?action=get_colaborador&cedula=${cedulaInput.value}`);
        const data = await response.json();
        
        if (data && data.ac_id) {
            const nombreCompleto = [data.ac_nombre1, data.ac_nombre2, data.ac_apellido1, data.ac_apellido2]
                .filter(n => n)
                .join(' ');
            nombreInput.value = nombreCompleto;
            colaboradorActual[tipo] = data;
            showAlert('success', 'Colaborador encontrado');
        } else {
            nombreInput.value = '';
            colaboradorActual[tipo] = null;
            showAlert('warning', 'Colaborador no encontrado');
        }
    } catch (error) {
        console.error('Error searching collaborator:', error);
        showAlert('error', 'Error al buscar colaborador');
    }
}

/**
 * Setup calculate buttons for formulas
 */
function setupCalculateButtons() {
    // Acidity calculation: %AGL = (25.6*V*N)/W
    const btnCalcAcidez = document.getElementById('btn-calc-acidez');
    if (btnCalcAcidez) {
        btnCalcAcidez.addEventListener('click', () => {
            const W = parseFloat(document.getElementById('peso-muestra-w').value) || 0;
            const V = parseFloat(document.getElementById('volumen-naoh-v').value) || 0;
            const N = parseFloat(document.getElementById('normalidad-n').value) || 0.1;
            
            if (W > 0) {
                const result = (25.6 * V * N) / W;
                document.getElementById('resultado-acidez').value = result.toFixed(4);
                showAlert('success', 'Acidez calculada correctamente');
            } else {
                showAlert('warning', 'Ingrese el peso de la muestra (W)');
            }
        });
    }
    
    // Humidity calculation: D = C - A, E = B - C, %Humedad = (E/B)*100
    const btnCalcHumedad = document.getElementById('btn-calc-humedad');
    if (btnCalcHumedad) {
        btnCalcHumedad.addEventListener('click', () => {
            const A = parseFloat(document.getElementById('peso-recipiente-a').value) || 0;
            const B = parseFloat(document.getElementById('peso-muestra-humedad-b').value) || 0;
            const C = parseFloat(document.getElementById('peso-muestra-seca-c').value) || 0;
            
            const D = C - A;
            const E = B - C;
            
            document.getElementById('peso-muestra-seca-d').value = D.toFixed(4);
            document.getElementById('peso-agua-e').value = E.toFixed(4);
            
            if (B > 0) {
                const result = (E / B) * 100;
                document.getElementById('resultado-humedad').value = result.toFixed(4);
                showAlert('success', 'Humedad calculada correctamente');
            } else {
                showAlert('warning', 'Ingrese el peso de la muestra de humedad (B)');
            }
        });
    }
    
    // Iodine calculation: % = (12.69*0.1*(VB-VA))/W
    const btnCalcYodo = document.getElementById('btn-calc-yodo');
    if (btnCalcYodo) {
        btnCalcYodo.addEventListener('click', () => {
            const W = parseFloat(document.getElementById('peso-aceite-w').value) || 0;
            const VB = parseFloat(document.getElementById('volumen-blanco-vb').value) || 0;
            const VA = parseFloat(document.getElementById('volumen-aceite-va').value) || 0;
            
            if (W > 0) {
                const result = (12.69 * 0.1 * (VB - VA)) / W;
                document.getElementById('resultado-yodo').value = result.toFixed(4);
                showAlert('success', 'Índice de Yodo calculado correctamente');
            } else {
                showAlert('warning', 'Ingrese el peso del aceite (W)');
            }
        });
    }
}

/**
 * Handle form submission
 */
async function handleFormSubmit() {
    let tanqueId = null;
    let extraData = {};
    let registroOrigenId = null;
    
    // Get the correct tanque ID based on measurement type
    if (currentMeasurementType === 'tanque') {
        tanqueId = document.getElementById('select-tanque-principal').value;
        if (!tanqueId) {
            showAlert('error', 'Seleccione un tanque');
            return;
        }
    } else if (currentMeasurementType === 'bombeo') {
        tanqueId = document.getElementById('select-tanque-destino').value;
        extraData = {
            id_secador: document.getElementById('select-secador').value,
            toneladas: document.getElementById('toneladas-bombeo').value
        };
        if (!tanqueId) {
            showAlert('error', 'Seleccione el tanque destino');
            return;
        }
    } else if (currentMeasurementType === 'despacho') {
        tanqueId = document.getElementById('select-tanque-despacho').value;
        extraData = {
            toneladas: document.getElementById('toneladas-despacho').value,
            placa_vehiculo: document.getElementById('placa-vehiculo').value,
            responsable_vehiculo: document.getElementById('responsable-vehiculo').value
        };
        if (!tanqueId) {
            showAlert('error', 'Seleccione el tanque de origen');
            return;
        }
    }
    
    try {
        const results = [];
        
        // For bombeo or despacho, save the main record first to get its ID
        if (currentMeasurementType === 'bombeo') {
            const bombeoData = {
                id_secador: extraData.id_secador,
                id_tanque_destino: tanqueId,
                toneladas: extraData.toneladas,
                porcentaje_humedad: selectedMeasurements.humedad ? getMeasurementValue('humedad') : null,
                porcentaje_acidez: selectedMeasurements.acidez ? getMeasurementValue('acidez') : null,
                indice_yodo: selectedMeasurements.yodo ? getMeasurementValue('yodo') : null
            };
            const bombeoResult = await saveMedicionBombeo(bombeoData);
            results.push({ tipo: 'bombeo', ...bombeoResult });
            if (bombeoResult.success && bombeoResult.id) {
                registroOrigenId = bombeoResult.id;
            } else {
                showAlert('error', 'Error al guardar registro de bombeo: ' + (bombeoResult.error || 'Error desconocido'));
                return;
            }
        } else if (currentMeasurementType === 'despacho') {
            const despachoData = {
                id_tanque: tanqueId,
                toneladas: extraData.toneladas,
                placa_vehiculo: extraData.placa_vehiculo,
                responsable_vehiculo: extraData.responsable_vehiculo,
                porcentaje_humedad: selectedMeasurements.humedad ? getMeasurementValue('humedad') : null,
                porcentaje_acidez: selectedMeasurements.acidez ? getMeasurementValue('acidez') : null,
                indice_yodo: selectedMeasurements.yodo ? getMeasurementValue('yodo') : null
            };
            const despachoResult = await saveMedicionDespacho(despachoData);
            results.push({ tipo: 'despacho', ...despachoResult });
            if (despachoResult.success && despachoResult.id) {
                registroOrigenId = despachoResult.id;
            } else {
                showAlert('error', 'Error al guardar registro de despacho: ' + (despachoResult.error || 'Error desconocido'));
                return;
            }
        }
        
        // Save acidez if selected
        if (selectedMeasurements.acidez) {
            const isManual = document.getElementById('manual-acidez')?.checked;
            if (isManual) {
                const manualValue = document.getElementById('valor-manual-acidez')?.value;
                if (!manualValue || manualValue.trim() === '') {
                    showAlert('warning', 'Ingrese el valor de acidez');
                    return;
                }
            }
            const acidezData = isManual 
                ? { valor_manual: document.getElementById('valor-manual-acidez')?.value, ...collectBaseData('acidez') }
                : collectAcidezData();
            const tipoMedida = isManual ? 'NIR' : 'Manual';
            acidezData.tipo_origen = currentMeasurementType;
            acidezData.id_registro_origen = registroOrigenId;
            const acidezResult = await saveMedicionAcidez(tanqueId, tipoMedida, acidezData);
            results.push({ tipo: 'acidez', ...acidezResult });
        }
        
        // Save humedad if selected
        if (selectedMeasurements.humedad) {
            const isManual = document.getElementById('manual-humedad')?.checked;
            if (isManual) {
                const manualValue = document.getElementById('valor-manual-humedad')?.value;
                if (!manualValue || manualValue.trim() === '') {
                    showAlert('warning', 'Ingrese el valor de humedad');
                    return;
                }
            }
            const humedadData = isManual 
                ? { valor_manual: document.getElementById('valor-manual-humedad')?.value, ...collectBaseData('humedad') }
                : collectHumedadData();
            const tipoMedida = isManual ? 'NIR' : 'Manual';
            humedadData.tipo_origen = currentMeasurementType;
            humedadData.id_registro_origen = registroOrigenId;
            const humedadResult = await saveMedicionHumedad(tanqueId, tipoMedida, humedadData);
            results.push({ tipo: 'humedad', ...humedadResult });
        }
        
        // Save yodo if selected
        if (selectedMeasurements.yodo) {
            const isManual = document.getElementById('manual-yodo')?.checked;
            if (isManual) {
                const manualValue = document.getElementById('valor-manual-yodo')?.value;
                if (!manualValue || manualValue.trim() === '') {
                    showAlert('warning', 'Ingrese el valor de yodo');
                    return;
                }
            }
            const yodoData = isManual 
                ? { valor_manual: document.getElementById('valor-manual-yodo')?.value, ...collectBaseData('yodo') }
                : collectYodoData();
            const tipoMedida = isManual ? 'NIR' : 'Manual';
            yodoData.tipo_origen = currentMeasurementType;
            yodoData.id_registro_origen = registroOrigenId;
            const yodoResult = await saveMedicionYodo(tanqueId, tipoMedida, yodoData);
            results.push({ tipo: 'yodo', ...yodoResult });
        }
        
        if (results.length === 0) {
            showAlert('warning', 'No se seleccionaron mediciones para guardar');
            return;
        }
        
        const allSuccess = results.every(r => r.success);
        if (allSuccess) {
            showAlert('success', `Se guardaron ${results.length} medición(es) exitosamente`);
            
            // Close modal
            const modal = bootstrap.Modal.getInstance(document.getElementById('modal-nueva-medicion'));
            if (modal) modal.hide();
            
            // Reload measurements
            await loadAllMeasurements();
        } else {
            const errors = results.filter(r => !r.success).map(r => r.error || 'Error desconocido');
            showAlert('error', `Errores: ${errors.join(', ')}`);
        }
    } catch (error) {
        console.error('Error saving measurements:', error);
        showAlert('error', 'Error al guardar las mediciones');
    }
}

/**
 * Get measurement value (manual or calculated)
 */
function getMeasurementValue(tipo) {
    const isManual = document.getElementById(`manual-${tipo}`)?.checked;
    if (isManual) {
        return document.getElementById(`valor-manual-${tipo}`)?.value || null;
    }
    return document.getElementById(`resultado-${tipo}`)?.value || null;
}

/**
 * Collect base data (lugar muestreo, colaborador, observaciones) for any measurement type
 * @param {string} tipo - Measurement type: 'acidez', 'humedad', or 'yodo'
 * @returns {Object} Base data object with id_lugar_muestreo, colaborador info, and observaciones
 */
function collectBaseData(tipo) {
    return {
        id_lugar_muestreo: document.getElementById(`lugar-muestreo-${tipo}`)?.value || null,
        id_colaborador: colaboradorActual[tipo]?.ac_id || null,
        cedula_colaborador: document.getElementById(`cedula-${tipo}`)?.value || null,
        nombre_colaborador: document.getElementById(`nombre-${tipo}`)?.value || null,
        observaciones: document.getElementById(`observaciones-${tipo}`)?.value || ''
    };
}

/**
 * Collect acidity form data
 */
function collectAcidezData() {
    return {
        cantidad_muestra_gramos: document.getElementById('cantidad-muestra-acidez')?.value,
        peso_muestra_w: document.getElementById('peso-muestra-w')?.value,
        normalidad_n: document.getElementById('normalidad-n')?.value || 0.1,
        volumen_naoh_v: document.getElementById('volumen-naoh-v')?.value,
        ...collectBaseData('acidez')
    };
}

/**
 * Collect humidity form data
 */
function collectHumedadData() {
    return {
        peso_recipiente_a: document.getElementById('peso-recipiente-a')?.value,
        peso_muestra_humedad_b: document.getElementById('peso-muestra-humedad-b')?.value,
        peso_muestra_seca_recipiente_c: document.getElementById('peso-muestra-seca-c')?.value,
        ...collectBaseData('humedad')
    };
}

/**
 * Collect iodine form data
 */
function collectYodoData() {
    return {
        peso_aceite_w: document.getElementById('peso-aceite-w')?.value,
        volumen_blanco_vb: document.getElementById('volumen-blanco-vb')?.value,
        volumen_aceite_va: document.getElementById('volumen-aceite-va')?.value,
        ...collectBaseData('yodo')
    };
}

/**
 * Save acidity measurement
 */
async function saveMedicionAcidez(tanqueId, tipoMedida, data) {
    const response = await fetch(`${LAB_API}?action=save_medicion_acidez`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            id_tanque: tanqueId,
            tipo_medida: tipoMedida,
            ...data
        })
    });
    return response.json();
}

/**
 * Save humidity measurement
 */
async function saveMedicionHumedad(tanqueId, tipoMedida, data) {
    const response = await fetch(`${LAB_API}?action=save_medicion_humedad`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            id_tanque: tanqueId,
            tipo_medida: tipoMedida,
            ...data
        })
    });
    return response.json();
}

/**
 * Save iodine measurement
 */
async function saveMedicionYodo(tanqueId, tipoMedida, data) {
    const response = await fetch(`${LAB_API}?action=save_medicion_yodo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            id_tanque: tanqueId,
            tipo_medida: tipoMedida,
            ...data
        })
    });
    return response.json();
}

/**
 * Save bombeo/pumping measurement
 */
async function saveMedicionBombeo(data) {
    const response = await fetch(`${LAB_API}?action=save_medicion_bombeo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });
    return response.json();
}

/**
 * Save despacho/dispatch measurement
 */
async function saveMedicionDespacho(data) {
    const response = await fetch(`${LAB_API}?action=save_medicion_despacho`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });
    return response.json();
}

/**
 * Load all measurements with filters
 */
async function loadAllMeasurements() {
    const tbody = document.getElementById('measurement-history-body');
    if (!tbody) return;
    
    const tanqueId = document.getElementById('select-tanque-filtro')?.value || '';
    const fechaDesde = document.getElementById('fecha-desde')?.value || '';
    const fechaHasta = document.getElementById('fecha-hasta')?.value || '';
    const tipoFiltro = document.getElementById('filtro-tipo')?.value || '';
    const tipoOrigenFiltro = document.getElementById('filtro-tipo-origen')?.value || '';
    
    try {
        tbody.innerHTML = `
            <tr>
                <td colspan="11" class="text-center py-4">
                    <div class="spinner-border spinner-border-sm text-primary" role="status">
                        <span class="visually-hidden">Cargando...</span>
                    </div>
                    <span class="ms-2">Cargando mediciones...</span>
                </td>
            </tr>
        `;
        
        const params = new URLSearchParams({
            action: 'get_all_mediciones',
            id_tanque: tanqueId,
            fecha_desde: fechaDesde,
            fecha_hasta: fechaHasta,
            tipo: tipoFiltro,
            tipo_origen: tipoOrigenFiltro
        });
        
        const response = await fetch(`${LAB_API}?${params}`);
        const data = await response.json();
        
        // Combine all measurements and sort by date
        allMeasurements = [];
        
        if (data.acidez) {
            data.acidez.forEach(m => allMeasurements.push({ 
                ...m, 
                tipo_display: 'Acidez',
                tipo: 'acidez',
                valor: m.porcentaje_agl || m.valor
            }));
        }
        if (data.humedad) {
            data.humedad.forEach(m => allMeasurements.push({ 
                ...m, 
                tipo_display: 'Humedad',
                tipo: 'humedad',
                valor: m.porcentaje_humedad || m.valor
            }));
        }
        if (data.yodo) {
            data.yodo.forEach(m => allMeasurements.push({ 
                ...m, 
                tipo_display: 'Yodo',
                tipo: 'yodo',
                valor: m.indice_yodo || m.valor
            }));
        }
        
        // Sort by date descending
        allMeasurements.sort((a, b) => new Date(b.fecha_hora) - new Date(a.fecha_hora));
        
        // Apply type filter if specified (using separate filtered array)
        filteredMeasurements = allMeasurements.slice();
        
        if (tipoFiltro) {
            filteredMeasurements = filteredMeasurements.filter(m => m.tipo === tipoFiltro);
        }
        
        // Apply tipo_origen filter if specified
        if (tipoOrigenFiltro) {
            filteredMeasurements = filteredMeasurements.filter(m => 
                (m.tipo_origen || 'tanque').toLowerCase() === tipoOrigenFiltro.toLowerCase()
            );
        }
        
        // Update total count
        document.getElementById('total-registros').textContent = `${filteredMeasurements.length} registros`;
        document.getElementById('total-items').textContent = filteredMeasurements.length;
        
        // Reset to page 1 and render
        currentPage = 1;
        renderMeasurementsTable();
        
    } catch (error) {
        console.error('Error loading measurements:', error);
        tbody.innerHTML = `
            <tr>
                <td colspan="11" class="text-center text-danger py-4">
                    <i class="fas fa-exclamation-circle fa-2x mb-2 d-block"></i>
                    Error al cargar las mediciones
                </td>
            </tr>
        `;
    }
}

/**
 * Render measurements table with pagination
 */
function renderMeasurementsTable() {
    const tbody = document.getElementById('measurement-history-body');
    if (!tbody) return;
    
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = Math.min(startIndex + itemsPerPage, filteredMeasurements.length);
    const pageItems = filteredMeasurements.slice(startIndex, endIndex);
    
    // Update showing info
    document.getElementById('showing-start').textContent = filteredMeasurements.length > 0 ? startIndex + 1 : 0;
    document.getElementById('showing-end').textContent = endIndex;
    
    if (pageItems.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="11" class="text-center text-muted py-4">
                    <i class="fas fa-flask fa-2x mb-2 d-block opacity-50"></i>
                    No se encontraron mediciones
                </td>
            </tr>
        `;
        renderPagination();
        return;
    }
    
    tbody.innerHTML = pageItems.map((m, index) => {
        const badgeClass = m.tipo === 'acidez' ? 'badge-acidez' : 
                          m.tipo === 'humedad' ? 'badge-humedad' : 'badge-yodo';
        const tanqueInfo = tanques.find(t => t.id == m.id_tanque);
        const tanqueNumero = tanqueInfo ? tanqueInfo.numero_tanque : m.id_tanque;
        
        // Determine tipo_origen (tanque, bombeo, despacho)
        const tipoOrigen = (m.tipo_origen || 'tanque').toLowerCase();
        let tipoOrigenBadge = '';
        let origenDestinoInfo = '';
        let toneladasInfo = '-';
        
        if (tipoOrigen === 'bombeo') {
            tipoOrigenBadge = '<span class="badge bg-info"><i class="fas fa-water me-1"></i>Bombeo</span>';
            // For bombeo: show secador -> tanque destino
            const secadorInfo = m.secador_nombre || m.nombre_secador || 'Secador';
            origenDestinoInfo = `
                <small class="d-block"><i class="fas fa-fan text-info me-1"></i>${escapeHtml(secadorInfo)}</small>
                <small class="text-muted"><i class="fas fa-arrow-right me-1"></i>Tanque ${escapeHtml(tanqueNumero)}</small>
            `;
            toneladasInfo = m.toneladas ? `${parseFloat(m.toneladas).toFixed(2)} T` : '-';
        } else if (tipoOrigen === 'despacho') {
            tipoOrigenBadge = '<span class="badge bg-success"><i class="fas fa-truck me-1"></i>Despacho</span>';
            // For despacho: show tanque origen -> placa vehiculo
            const placaInfo = m.placa_vehiculo || '-';
            const responsableInfo = m.responsable_vehiculo || '';
            origenDestinoInfo = `
                <small class="d-block"><i class="fas fa-oil-can text-warning me-1"></i>Tanque ${escapeHtml(tanqueNumero)}</small>
                <small class="text-muted"><i class="fas fa-truck me-1"></i>${escapeHtml(placaInfo)}</small>
            `;
            toneladasInfo = m.toneladas ? `${parseFloat(m.toneladas).toFixed(2)} T` : '-';
        } else {
            // Default: tanque
            tipoOrigenBadge = '<span class="badge bg-primary"><i class="fas fa-oil-can me-1"></i>Tanque</span>';
            origenDestinoInfo = `
                <strong><i class="fas fa-oil-can text-warning me-1"></i>Tanque ${escapeHtml(tanqueNumero)}</strong>
            `;
        }
        
        // Validate and sanitize tipo and id for safe use
        const safeId = parseInt(m.id, 10) || 0;
        const safeTipo = ['acidez', 'humedad', 'yodo'].includes(m.tipo) ? m.tipo : '';
        
        return `
            <tr>
                <td class="text-center" data-label="#">${startIndex + index + 1}</td>
                <td class="text-center" data-label="Tipo Origen">
                    ${tipoOrigenBadge}
                </td>
                <td data-label="Origen/Destino">
                    ${origenDestinoInfo}
                </td>
                <td class="text-center" data-label="Medición">
                    <span class="badge ${badgeClass}">${escapeHtml(m.tipo_display)}</span>
                </td>
                <td class="text-center fw-bold" data-label="Valor">
                    ${m.valor ? parseFloat(m.valor).toFixed(4) : 'N/A'}
                </td>
                <td class="d-none d-md-table-cell text-center" data-label="Toneladas">
                    <small>${toneladasInfo}</small>
                </td>
                <td class="d-none d-lg-table-cell" data-label="Método">
                    <small>${escapeHtml(m.tipo_medida) || 'N/A'}</small>
                </td>
                <td data-label="Fecha/Hora">
                    <small>${formatDateTime(m.fecha_hora)}</small>
                </td>
                <td class="d-none d-lg-table-cell" data-label="Realizado por">
                    <small>${escapeHtml(m.nombre_colaborador) || '-'}</small>
                </td>
                <td class="d-none d-xl-table-cell" data-label="Observaciones">
                    <small class="text-truncate d-inline-block" style="max-width: 120px;" title="${escapeHtml(m.observaciones)}">
                        ${escapeHtml(m.observaciones) || '-'}
                    </small>
                </td>
                <td class="text-center" data-label="Acciones">
                    <button type="button" class="btn btn-sm btn-outline-primary btn-view-detail" data-tipo="${safeTipo}" data-id="${safeId}">
                        <i class="fas fa-eye"></i>
                    </button>
                </td>
            </tr>
        `;
    }).join('');
    
    // Add event delegation for view detail buttons
    tbody.querySelectorAll('.btn-view-detail').forEach(btn => {
        btn.addEventListener('click', function() {
            const tipo = this.dataset.tipo;
            const id = parseInt(this.dataset.id, 10);
            if (tipo && id) {
                viewDetail(tipo, id);
            }
        });
    });
    
    renderPagination();
}

/**
 * Render pagination controls
 */
function renderPagination() {
    const container = document.getElementById('pagination-container');
    if (!container) return;
    
    const totalPages = Math.ceil(filteredMeasurements.length / itemsPerPage);
    
    if (totalPages <= 1) {
        container.innerHTML = '';
        return;
    }
    
    let html = '';
    
    // Previous button
    html += `
        <li class="page-item ${currentPage === 1 ? 'disabled' : ''}">
            <a class="page-link" href="#" onclick="goToPage(${currentPage - 1}); return false;">
                <i class="fas fa-chevron-left"></i>
            </a>
        </li>
    `;
    
    // Page numbers
    const maxVisiblePages = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
    
    if (endPage - startPage + 1 < maxVisiblePages) {
        startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }
    
    if (startPage > 1) {
        html += `<li class="page-item"><a class="page-link" href="#" onclick="goToPage(1); return false;">1</a></li>`;
        if (startPage > 2) {
            html += `<li class="page-item disabled"><span class="page-link">...</span></li>`;
        }
    }
    
    for (let i = startPage; i <= endPage; i++) {
        html += `
            <li class="page-item ${i === currentPage ? 'active' : ''}">
                <a class="page-link" href="#" onclick="goToPage(${i}); return false;">${i}</a>
            </li>
        `;
    }
    
    if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
            html += `<li class="page-item disabled"><span class="page-link">...</span></li>`;
        }
        html += `<li class="page-item"><a class="page-link" href="#" onclick="goToPage(${totalPages}); return false;">${totalPages}</a></li>`;
    }
    
    // Next button
    html += `
        <li class="page-item ${currentPage === totalPages ? 'disabled' : ''}">
            <a class="page-link" href="#" onclick="goToPage(${currentPage + 1}); return false;">
                <i class="fas fa-chevron-right"></i>
            </a>
        </li>
    `;
    
    container.innerHTML = html;
}

/**
 * Go to specific page
 */
function goToPage(page) {
    const totalPages = Math.ceil(filteredMeasurements.length / itemsPerPage);
    if (page < 1 || page > totalPages) return;
    currentPage = page;
    renderMeasurementsTable();
}

/**
 * View measurement detail
 */
async function viewDetail(tipo, id) {
    const modalBody = document.getElementById('detalle-medicion-body');
    if (!modalBody) return;
    
    modalBody.innerHTML = `
        <div class="text-center py-4">
            <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">Cargando...</span>
            </div>
        </div>
    `;
    
    const modal = new bootstrap.Modal(document.getElementById('modal-ver-detalle'));
    modal.show();
    
    try {
        const response = await fetch(`${LAB_API}?action=get_medicion_detalle&tipo=${tipo}&id=${id}`);
        const data = await response.json();
        
        if (!data || data.error) {
            modalBody.innerHTML = '<p class="text-danger">Error al cargar los detalles</p>';
            return;
        }
        
        const tanqueInfo = tanques.find(t => t.id == data.id_tanque);
        const tipoOrigen = (data.tipo_origen || 'tanque').toLowerCase();
        
        // Header with tipo_origen badge
        let tipoOrigenBadge = '';
        if (tipoOrigen === 'bombeo') {
            tipoOrigenBadge = '<span class="badge bg-info"><i class="fas fa-water me-1"></i>Bombeo</span>';
        } else if (tipoOrigen === 'despacho') {
            tipoOrigenBadge = '<span class="badge bg-success"><i class="fas fa-truck me-1"></i>Despacho</span>';
        } else {
            tipoOrigenBadge = '<span class="badge bg-primary"><i class="fas fa-oil-can me-1"></i>Tanque</span>';
        }
        
        // Format tanque display - show number or ID as fallback
        const tanqueDisplay = tanqueInfo 
            ? escapeHtml(String(tanqueInfo.numero_tanque))
            : (data.id_tanque ? `ID: ${escapeHtml(String(data.id_tanque))}` : 'N/A');
        
        let html = `
            <div class="mb-3">
                <small class="text-muted">Tipo de Origen</small>
                <p class="fw-bold mb-0">${tipoOrigenBadge}</p>
            </div>
            <div class="mb-3">
                <small class="text-muted">Tanque</small>
                <p class="fw-bold mb-0">${tanqueDisplay}</p>
            </div>
        `;
        
        // Add bombeo-specific information
        if (tipoOrigen === 'bombeo') {
            html += `
                <div class="mb-3">
                    <small class="text-muted">Secador de Origen</small>
                    <p class="fw-bold mb-0">${escapeHtml(data.secador_nombre || 'N/A')} ${data.secador_codigo ? '(' + escapeHtml(data.secador_codigo) + ')' : ''}</p>
                </div>
            `;
            if (data.bombeo_toneladas) {
                html += `
                    <div class="mb-3">
                        <small class="text-muted">Toneladas Bombeadas</small>
                        <p class="fw-bold mb-0">${parseFloat(data.bombeo_toneladas).toFixed(2)} Ton</p>
                    </div>
                `;
            }
        }
        
        // Add despacho-specific information
        if (tipoOrigen === 'despacho') {
            if (data.placa_vehiculo) {
                html += `
                    <div class="mb-3">
                        <small class="text-muted">Vehículo</small>
                        <p class="fw-bold mb-0"><i class="fas fa-truck me-1"></i>${escapeHtml(data.placa_vehiculo)}</p>
                    </div>
                `;
            }
            if (data.responsable_vehiculo) {
                html += `
                    <div class="mb-3">
                        <small class="text-muted">Conductor/Responsable</small>
                        <p class="fw-bold mb-0">${escapeHtml(data.responsable_vehiculo)}</p>
                    </div>
                `;
            }
            if (data.despacho_toneladas) {
                html += `
                    <div class="mb-3">
                        <small class="text-muted">Toneladas Despachadas</small>
                        <p class="fw-bold mb-0">${parseFloat(data.despacho_toneladas).toFixed(2)} Ton</p>
                    </div>
                `;
            }
        }
        
        html += `
            <hr class="my-3">
            <div class="mb-3">
                <small class="text-muted">Tipo de Medición</small>
                <p class="fw-bold mb-0">${escapeHtml(tipo.charAt(0).toUpperCase() + tipo.slice(1))}</p>
            </div>
            <div class="mb-3">
                <small class="text-muted">Método</small>
                <p class="fw-bold mb-0">${escapeHtml(data.tipo_medida) || 'N/A'}</p>
            </div>
            <div class="mb-3">
                <small class="text-muted">Valor</small>
                <p class="fw-bold mb-0 fs-4 text-primary">
                    ${data.porcentaje_agl || data.porcentaje_humedad || data.indice_yodo || data.valor || 'N/A'}
                </p>
            </div>
            <div class="mb-3">
                <small class="text-muted">Fecha y Hora</small>
                <p class="fw-bold mb-0">${formatDateTime(data.fecha_hora)}</p>
            </div>
        `;
        
        if (data.lugar_nombre) {
            html += `
                <div class="mb-3">
                    <small class="text-muted">Lugar de Muestreo</small>
                    <p class="fw-bold mb-0">${escapeHtml(data.lugar_nombre)}</p>
                </div>
            `;
        }
        
        if (data.nombre_colaborador) {
            html += `
                <div class="mb-3">
                    <small class="text-muted">Realizado por</small>
                    <p class="fw-bold mb-0">${escapeHtml(data.nombre_colaborador)}</p>
                </div>
            `;
        }
        
        if (data.observaciones) {
            html += `
                <div class="mb-3">
                    <small class="text-muted">Observaciones</small>
                    <p class="mb-0">${escapeHtml(data.observaciones)}</p>
                </div>
            `;
        }
        
        modalBody.innerHTML = html;
        
    } catch (error) {
        console.error('Error loading detail:', error);
        modalBody.innerHTML = '<p class="text-danger">Error al cargar los detalles</p>';
    }
}

/**
 * Reset form to initial state
 */
function resetForm() {
    const form = document.getElementById('form-medicion');
    if (form) form.reset();
    
    // Reset state
    currentPhase = 1;
    selectedMeasurements = { acidez: false, humedad: false, yodo: false };
    colaboradorActual = {};
    currentTanque = null;
    currentMeasurementType = 'tanque';
    
    // Reset measurement type cards
    document.querySelectorAll('.measurement-type-card').forEach(card => card.classList.remove('selected'));
    const tanqueCard = document.getElementById('card-tipo-tanque');
    if (tanqueCard) tanqueCard.classList.add('selected');
    
    // Reset source sections
    document.querySelectorAll('.source-selection').forEach(section => section.style.display = 'none');
    const sourceTanque = document.getElementById('source-tanque');
    if (sourceTanque) sourceTanque.style.display = 'block';
    
    // Reset measurement cards visual state
    document.querySelectorAll('.measurement-card').forEach(card => card.classList.remove('selected'));
    
    // Reset calculated fields
    ['resultado-acidez', 'resultado-humedad', 'resultado-yodo', 
     'peso-muestra-seca-d', 'peso-agua-e', 'valor-manual-acidez',
     'valor-manual-humedad', 'valor-manual-yodo'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });
    
    // Reset bombeo and despacho fields
    ['toneladas-bombeo', 'toneladas-despacho', 'placa-vehiculo', 'responsable-vehiculo'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });
    
    // Hide sections
    ['section-acidez', 'section-humedad', 'section-yodo'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = 'none';
    });
    
    // Reset manual toggles
    ['manual-acidez', 'manual-humedad', 'manual-yodo'].forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.checked = false;
            const type = id.replace('manual-', '');
            toggleManualInput(type, false);
        }
    });
    
    // Hide tank and secador info
    const tanqueInfoContainer = document.getElementById('tanque-info-container');
    if (tanqueInfoContainer) tanqueInfoContainer.style.display = 'none';
    
    const secadorInfoContainer = document.getElementById('secador-info-container');
    if (secadorInfoContainer) secadorInfoContainer.style.display = 'none';
    
    // Hide no selection warning
    const noSelectionWarning = document.getElementById('no-selection-warning');
    if (noSelectionWarning) noSelectionWarning.style.display = 'none';
    
    // Reset phase display
    updatePhaseDisplay();
}

/**
 * Format datetime for display
 */
function formatDateTime(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('es-CO', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
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
    
    const iconClass = {
        success: 'fa-check-circle',
        error: 'fa-exclamation-circle',
        warning: 'fa-exclamation-triangle',
        info: 'fa-info-circle'
    }[type] || 'fa-info-circle';
    
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert ${alertClass} alert-dismissible fade show shadow-sm`;
    alertDiv.innerHTML = `
        <i class="fas ${iconClass} me-2"></i>${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    alertContainer.appendChild(alertDiv);
    
    // Auto-dismiss after 4 seconds
    setTimeout(() => {
        alertDiv.classList.remove('show');
        setTimeout(() => alertDiv.remove(), 150);
    }, 4000);
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', initLaboratorio);

// Make functions globally available
window.toggleMeasurement = toggleMeasurement;
window.goToPage = goToPage;
window.viewDetail = viewDetail;
