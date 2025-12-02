/**
 * JavaScript for weighing operations
 * Handles real-time weight reading and vehicle entry/exit
 */

let continuousReadInterval = null;
let currentUser = null;

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    checkSession();
    loadCatalogs();
    loadTodayWeighings();
    setupEventListeners();
});

/**
 * Check user session
 */
async function checkSession() {
    try {
        const response = await fetch('assets/php/auth_api.php?action=check_session');
        const data = await response.json();
        
        if (data.success && data.logged_in) {
            currentUser = data.user;
        }
    } catch (error) {
        console.error('Error checking session:', error);
    }
}

/**
 * Setup event listeners
 */
function setupEventListeners() {
    // Scale buttons
    document.getElementById('btnReadWeight').addEventListener('click', readWeight);
    document.getElementById('btnTare').addEventListener('click', tareScale);
    document.getElementById('btnContinuousRead').addEventListener('click', startContinuousRead);
    document.getElementById('btnStopRead').addEventListener('click', stopContinuousRead);
    document.getElementById('btnTestScale').addEventListener('click', testScale);
    
    // Form listeners
    document.getElementById('selectProcedencia').addEventListener('change', onProcedenciaChange);
    document.getElementById('selectPlaca').addEventListener('change', onPlacaChange);
    document.getElementById('selectTipoProcedencia').addEventListener('change', onTipoProcedenciaChange);
    document.getElementById('selectTransaccion').addEventListener('change', onTransaccionChange);
    document.getElementById('btnBuscarPlaca').addEventListener('click', searchPlaca);
    document.getElementById('inputPesoBruto').addEventListener('input', calculatePesoNeto);
    
    // Form submissions
    document.getElementById('formEntrada').addEventListener('submit', submitEntrada);
    document.getElementById('formSalida').addEventListener('submit', submitSalida);
}

/**
 * Load all catalogs
 */
async function loadCatalogs() {
    try {
        // Load transactions
        const transacciones = await fetch('assets/php/config_api.php?action=transacciones');
        const transData = await transacciones.json();
        populateSelect('selectTransaccion', transData.data);
        
        // Load products
        const productos = await fetch('assets/php/config_api.php?action=productos_select');
        const prodData = await productos.json();
        populateSelect('selectProducto', prodData.data);
        populateSelect('selectProductoSalida', prodData.data);
        
        // Load document origins
        const docOrigen = await fetch('assets/php/config_api.php?action=doc_origen');
        const docData = await docOrigen.json();
        populateSelect('selectDocOrigen', docData.data);
        
        // Load siembras
        const siembras = await fetch('assets/php/config_api.php?action=siembras');
        const siembraData = await siembras.json();
        populateSelect('selectSiembra', siembraData.data);
        
    } catch (error) {
        console.error('Error loading catalogs:', error);
        showAlert('Error al cargar catálogos', 'danger');
    }
}

/**
 * Populate select element
 */
function populateSelect(selectId, data) {
    const select = document.getElementById(selectId);
    const firstOption = select.options[0].text;
    select.innerHTML = `<option value="">${firstOption}</option>`;
    
    data.forEach(item => {
        if (item.codigo !== '0' && item.codigo !== 0) {
            const option = document.createElement('option');
            option.value = item.codigo;
            option.textContent = item.nombre;
            select.appendChild(option);
        }
    });
}

/**
 * Read weight from scale
 */
async function readWeight() {
    try {
        const btn = document.getElementById('btnReadWeight');
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Leyendo...';
        
        const response = await fetch('assets/php/escala_api.php?action=leer_peso');
        const data = await response.json();
        
        if (data.success) {
            updateWeightDisplay(data.weight, data.stable);
            
            // Update bruto field if in exit form
            if (!document.getElementById('vehicleInfo').classList.contains('d-none')) {
                document.getElementById('inputPesoBruto').value = data.weight;
                calculatePesoNeto();
            }
        } else {
            showAlert('Error al leer peso: ' + (data.error || 'Error desconocido'), 'warning');
        }
        
    } catch (error) {
        console.error('Error reading weight:', error);
        showAlert('Error de conexión con la báscula', 'danger');
    } finally {
        const btn = document.getElementById('btnReadWeight');
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-sync-alt"></i> Leer Peso';
    }
}

/**
 * Update weight display
 */
function updateWeightDisplay(weight, stable) {
    document.getElementById('weightValue').textContent = weight;
    
    const indicator = document.getElementById('stableIndicator');
    if (stable) {
        indicator.classList.remove('unstable');
        indicator.classList.add('stable');
    } else {
        indicator.classList.remove('stable');
        indicator.classList.add('unstable');
    }
}

/**
 * Tare the scale
 */
async function tareScale() {
    try {
        const response = await fetch('assets/php/escala_api.php?action=tara', { method: 'POST' });
        const data = await response.json();
        
        if (data.success) {
            showAlert('Báscula tarada exitosamente', 'success');
            setTimeout(readWeight, 1000);
        } else {
            showAlert('Error al tarar la báscula', 'danger');
        }
    } catch (error) {
        console.error('Error taring scale:', error);
        showAlert('Error de conexión', 'danger');
    }
}

/**
 * Start continuous weight reading
 */
function startContinuousRead() {
    if (continuousReadInterval) return;
    
    document.getElementById('btnContinuousRead').classList.add('d-none');
    document.getElementById('btnStopRead').classList.remove('d-none');
    
    continuousReadInterval = setInterval(readWeight, 2000);
    readWeight(); // Initial read
}

/**
 * Stop continuous reading
 */
function stopContinuousRead() {
    if (continuousReadInterval) {
        clearInterval(continuousReadInterval);
        continuousReadInterval = null;
    }
    
    document.getElementById('btnContinuousRead').classList.remove('d-none');
    document.getElementById('btnStopRead').classList.add('d-none');
}

/**
 * Test scale connection
 */
async function testScale() {
    try {
        const response = await fetch('assets/php/escala_api.php?action=test');
        const data = await response.json();
        
        if (data.success) {
            showAlert(`Conexión exitosa con báscula en ${data.ip}:${data.port}`, 'success');
        } else {
            showAlert(`Error: ${data.message}`, 'danger');
        }
    } catch (error) {
        console.error('Error testing scale:', error);
        showAlert('Error al probar conexión', 'danger');
    }
}

/**
 * Handle procedencia change
 */
async function onProcedenciaChange(e) {
    const condicion = e.target.value;
    
    if (!condicion) {
        document.getElementById('selectPlaca').innerHTML = '<option value="">-Seleccione primero una procedencia-</option>';
        return;
    }
    
    try {
        const response = await fetch(`assets/php/vehiculos_api.php?action=placas&condicion=${condicion}`);
        const data = await response.json();
        
        if (data.success) {
            populateSelect('selectPlaca', data.data);
        }
    } catch (error) {
        console.error('Error loading plates:', error);
        showAlert('Error al cargar placas', 'danger');
    }
}

/**
 * Handle placa change
 */
async function onPlacaChange(e) {
    const placa = e.target.value;
    
    if (!placa || placa === '0') {
        document.getElementById('inputConductor').value = '';
        document.getElementById('inputTara').value = '';
        return;
    }
    
    try {
        const response = await fetch(`assets/php/vehiculos_api.php?action=info_completa&placa=${placa}`);
        const data = await response.json();
        
        if (data.success) {
            document.getElementById('inputConductor').value = data.data.conductor || '';
            document.getElementById('inputTara').value = data.data.tara || '';
        }
    } catch (error) {
        console.error('Error loading vehicle info:', error);
    }
}

/**
 * Handle tipo procedencia change
 */
async function onTipoProcedenciaChange(e) {
    const condicion = e.target.value;
    
    if (!condicion) {
        document.getElementById('selectOrigen').innerHTML = '<option value="">-Seleccione tipo de procedencia primero-</option>';
        return;
    }
    
    try {
        const response = await fetch(`assets/php/config_api.php?action=procedencia&condicion=${condicion}`);
        const data = await response.json();
        
        if (data.success) {
            populateSelect('selectOrigen', data.data);
        }
    } catch (error) {
        console.error('Error loading procedencia:', error);
        showAlert('Error al cargar procedencia', 'danger');
    }
}

/**
 * Handle transaccion change
 */
async function onTransaccionChange(e) {
    const transaccion = e.target.value;
    const procedencia = document.getElementById('selectOrigen').value;
    const siembra = document.getElementById('selectSiembra').value;
    
    if (transaccion && procedencia) {
        try {
            const response = await fetch(`assets/php/config_api.php?action=num_documento&transaccion=${transaccion}&procedencia=${procedencia}&siembra=${siembra}`);
            const data = await response.json();
            
            if (data.success && data.num_documento) {
                document.getElementById('inputNumDocumento').value = data.num_documento;
            }
        } catch (error) {
            console.error('Error loading document number:', error);
        }
    }
}

/**
 * Submit entrada form
 */
async function submitEntrada(e) {
    e.preventDefault();
    
    if (!currentUser) {
        showAlert('Usuario no autenticado', 'danger');
        return;
    }
    
    const formData = {
        placa: document.getElementById('selectPlaca').value,
        conductor: document.getElementById('inputConductor').value,
        siembra: document.getElementById('selectSiembra').value,
        tt_codigo: parseInt(document.getElementById('selectTransaccion').value),
        tpr_codigo: document.getElementById('selectOrigen').value,
        tp_codigo: document.getElementById('selectProducto').value,
        do_codigo: parseInt(document.getElementById('selectDocOrigen').value),
        num_documento: document.getElementById('inputNumDocumento').value,
        tara: parseInt(document.getElementById('inputTara').value),
        au_codigo: currentUser.codigo
    };
    
    try {
        const response = await fetch('assets/php/pesadas_api.php?action=insertar', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData)
        });
        
        const data = await response.json();
        
        if (data.success) {
            showAlert('Entrada registrada exitosamente', 'success');
            document.getElementById('formEntrada').reset();
            loadTodayWeighings();
        } else {
            showAlert('Error: ' + data.error, 'danger');
        }
    } catch (error) {
        console.error('Error submitting entrada:', error);
        showAlert('Error al registrar entrada', 'danger');
    }
}

/**
 * Search for vehicle by plate
 */
async function searchPlaca() {
    const placa = document.getElementById('searchPlaca').value.trim();
    
    if (!placa) {
        showAlert('Ingrese una placa', 'warning');
        return;
    }
    
    try {
        const response = await fetch(`assets/php/pesadas_api.php?action=por_placa&placa=${placa}`);
        const data = await response.json();
        
        if (data.success && data.data.length > 0) {
            const pesada = data.data[0];
            
            document.getElementById('infoPlaca').textContent = placa;
            document.getElementById('infoConductor').textContent = pesada.conductor;
            document.getElementById('infoPesoTara').textContent = pesada.peso_tara + ' kg';
            document.getElementById('infoFechaEntrada').textContent = pesada.fecha_entrada;
            document.getElementById('hiddenCodigoPesada').value = pesada.codigo;
            
            document.getElementById('vehicleInfo').classList.remove('d-none');
        } else {
            showAlert('No se encontró entrada activa para esta placa', 'warning');
            document.getElementById('vehicleInfo').classList.add('d-none');
        }
    } catch (error) {
        console.error('Error searching plate:', error);
        showAlert('Error al buscar placa', 'danger');
    }
}

/**
 * Calculate peso neto
 */
function calculatePesoNeto() {
    const bruto = parseFloat(document.getElementById('inputPesoBruto').value) || 0;
    const tara = parseFloat(document.getElementById('infoPesoTara').textContent) || 0;
    const neto = bruto - tara;
    
    document.getElementById('inputPesoNeto').value = neto > 0 ? neto : 0;
}

/**
 * Submit salida form
 */
async function submitSalida(e) {
    e.preventDefault();
    
    const formData = {
        codigo: parseInt(document.getElementById('hiddenCodigoPesada').value),
        tp_codigo: document.getElementById('selectProductoSalida').value,
        peso_bruto: parseInt(document.getElementById('inputPesoBruto').value),
        peso_neto: parseInt(document.getElementById('inputPesoNeto').value)
    };
    
    try {
        const response = await fetch('assets/php/pesadas_api.php?action=actualizar_salida', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData)
        });
        
        const data = await response.json();
        
        if (data.success) {
            showAlert('Salida registrada exitosamente', 'success');
            document.getElementById('formSalida').reset();
            document.getElementById('vehicleInfo').classList.add('d-none');
            loadTodayWeighings();
        } else {
            showAlert('Error: ' + data.error, 'danger');
        }
    } catch (error) {
        console.error('Error submitting salida:', error);
        showAlert('Error al registrar salida', 'danger');
    }
}

/**
 * Load today's weighings
 */
async function loadTodayWeighings() {
    try {
        const response = await fetch('assets/php/pesadas_api.php?action=listar');
        const data = await response.json();
        
        if (data.success) {
            const tbody = document.getElementById('bodyPesadas');
            tbody.innerHTML = '';
            
            if (data.data.length === 0) {
                tbody.innerHTML = '<tr><td colspan="9" class="text-center">No hay pesadas registradas hoy</td></tr>';
                return;
            }
            
            data.data.forEach(pesada => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${pesada.codigo}</td>
                    <td>${pesada.placa}</td>
                    <td>${pesada.conductor}</td>
                    <td>${pesada.producto || '-'}</td>
                    <td>${pesada.peso_bruto}</td>
                    <td>${pesada.peso_tara}</td>
                    <td>${pesada.peso_neto}</td>
                    <td><span class="badge ${pesada.Estado === 'Activo' ? 'bg-warning' : 'bg-success'}">${pesada.Estado}</span></td>
                    <td>${pesada.fecha_entrada}</td>
                `;
                tbody.appendChild(row);
            });
        }
    } catch (error) {
        console.error('Error loading weighings:', error);
    }
}

/**
 * Show alert message
 */
function showAlert(message, type = 'info') {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type} alert-dismissible fade show position-fixed top-0 start-50 translate-middle-x mt-3`;
    alertDiv.style.zIndex = '9999';
    alertDiv.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    document.body.appendChild(alertDiv);
    
    setTimeout(() => {
        alertDiv.remove();
    }, 5000);
}
