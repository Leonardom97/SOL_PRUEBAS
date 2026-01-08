const API_URL = 'assets/php/programacion_api.php';
const PORTERIA_API_URL = '../m_porteria/assets/php/porteria_api.php';

document.addEventListener('DOMContentLoaded', function () {
    try {
        console.log('Initializing Programacion...');
        // Set current week
        const today = new Date();
        const weekStr = getWeekString(today);
        const picker = document.getElementById('week-picker');
        if (picker) {
            picker.value = weekStr;
            console.log('Week picker set to:', weekStr);
        } else {
            console.error('Week picker element not found!');
        }

        loadMasterData();
        loadProgramacion();
    } catch (e) {
        console.error('Error initializing programacion:', e);
        alert('Error initializing module: ' + e.message);
    }
});

function getWeekString(date) {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const year = d.getUTCFullYear();
    const weekNo = Math.ceil((((d - new Date(Date.UTC(year, 0, 1))) / 86400000) + 1) / 7);
    return `${year}-W${weekNo.toString().padStart(2, '0')}`;
}

function loadProgramacion() {
    const week = document.getElementById('week-picker').value;
    if (!week) return;

    fetch(`${API_URL}?action=get_programacion&semana=${week}`)
        .then(response => {
            if (!response.ok) throw new Error('Network response was not ok');
            return response.json();
        })
        .then(data => {
            console.log('Programacion loaded:', data);
            renderWeeklyMatrix(data.data);
            renderVehicleProgrammingTable(data.data);
        })
        .catch(error => {
            console.error('Error loading programacion:', error);
            document.getElementById('weekly-matrix-table').innerHTML = `<tbody><tr><td class="text-center text-danger p-3">Error loading data: ${error.message}</td></tr></tbody>`;
        });
}

function renderWeeklyMatrix(items) {
    const table = document.getElementById('weekly-matrix-table');
    const thead = table.querySelector('thead');
    const tbody = table.querySelector('tbody');
    const tfoot = table.querySelector('tfoot');

    tbody.innerHTML = '';
    thead.innerHTML = '';
    tfoot.innerHTML = '';

    // 1. Calculate Dates for the Week
    const weekVal = document.getElementById('week-picker').value; // "2024-W40"
    const [year, week] = weekVal.split('-W');
    const simpleDate = new Date(year, 0, 1 + (week - 1) * 7);
    const dayOfWeek = simpleDate.getDay();
    const ISOweekStart = simpleDate;
    if (dayOfWeek <= 4) ISOweekStart.setDate(simpleDate.getDate() - simpleDate.getDay() + 1);
    else ISOweekStart.setDate(simpleDate.getDate() + 8 - simpleDate.getDay());

    // Generate headers
    const days = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
    const dates = [];
    let headerHTML = `
        <tr>
            <th class="align-middle text-uppercase text-secondary border-bottom-0" style="width: 20%; font-size: 0.75rem; letter-spacing: 0.05em; padding-left: 1rem;">Plantación</th>
            <th class="align-middle text-uppercase text-secondary border-bottom-0" style="width: 10%; font-size: 0.75rem; letter-spacing: 0.05em;">Jornada</th>
            <th class="align-middle text-uppercase text-secondary border-bottom-0" style="width: 10%; font-size: 0.75rem; letter-spacing: 0.05em;">Variedad</th>
            <th class="align-middle text-uppercase text-secondary border-bottom-0" style="width: 10%; font-size: 0.75rem; letter-spacing: 0.05em;">Tipo</th>
    `;

    for (let i = 0; i < 7; i++) {
        const d = new Date(ISOweekStart);
        d.setDate(ISOweekStart.getDate() + i);
        const dateStr = d.toISOString().split('T')[0];
        dates.push(dateStr);
        const dayNum = d.getDate();
        const dayName = days[i].substring(0, 3); // Lun, Mar, etc.

        const isToday = dateStr === new Date().toISOString().split('T')[0];
        const thClass = isToday ? 'text-primary fw-bold border-bottom border-primary border-3' : 'text-muted';
        const bgClass = isToday ? 'bg-light' : '';

        headerHTML += `
            <th class="align-middle text-center ${bgClass} ${thClass}" style="width: 7%;">
                <div style="font-size: 0.7rem; text-transform: uppercase; margin-bottom: 2px;">${dayName}</div>
                <div style="font-size: 1.2rem; line-height: 1;">${dayNum}</div>
            </th>`;
    }
    headerHTML += `<th class="align-middle text-center text-secondary border-bottom-0" style="width: 8%; font-size: 0.75rem;">TOTAL</th></tr>`;
    thead.innerHTML = headerHTML;

    // 2. Process Data
    const matrix = {};
    const dailyTotals = Array(7).fill(0);
    let grandTotal = 0;

    items.forEach(item => {
        const type = (item.proveedor_nombre && item.proveedor_nombre.toUpperCase().includes('PROPIO')) ? 'PROPIO' : 'PROVEEDOR';
        const finca = item.nombre_finca || item.finca_empresa || 'N/A';
        const jornada = item.jornada || 'Tarde';
        const variedad = item.variedad_fruto || item.tipo_material || '-';
        const key = `${type}|${finca}|${jornada}|${variedad}`;

        if (!matrix[key]) {
            matrix[key] = {
                type, finca, jornada, variedad,
                days: Array(7).fill(0),
                rowTotal: 0,
                items: Array(7).fill(null)
            };
        }

        const itemDate = item.fecha_programacion;
        const dayIdx = dates.indexOf(itemDate);
        if (dayIdx !== -1) {
            const tons = parseFloat(item.toneladas_estimadas) || 0;
            matrix[key].days[dayIdx] += tons;
            matrix[key].rowTotal += tons;
            matrix[key].items[dayIdx] = item;

            dailyTotals[dayIdx] += tons;
            grandTotal += tons;
        }
    });

    // 3. Render Rows
    const sortedKeys = Object.keys(matrix).sort((a, b) => {
        const [typeA, fincaA] = a.split('|');
        const [typeB, fincaB] = b.split('|');
        if (typeA !== typeB) return typeA === 'PROPIO' ? -1 : 1;
        return fincaA.localeCompare(fincaB);
    });

    let currentType = null;
    let typeSubtotal = 0;
    let typeDailyTotals = Array(7).fill(0);

    sortedKeys.forEach((key, index) => {
        const row = matrix[key];

        if (currentType !== row.type) {
            if (currentType !== null) {
                renderSubtotalRow(tbody, currentType, typeDailyTotals, typeSubtotal);
            }
            currentType = row.type;
            typeSubtotal = 0;
            typeDailyTotals = Array(7).fill(0);

            // Subtle spacer instead of section header
            const trSpacer = document.createElement('tr');
            trSpacer.innerHTML = `<td colspan="12" class="p-0" style="border-top: 2px solid #e9ecef;"></td>`;
            tbody.appendChild(trSpacer);
        }

        typeSubtotal += row.rowTotal;
        row.days.forEach((val, i) => typeDailyTotals[i] += val);

        let tr = document.createElement('tr');
        tr.className = "align-middle border-bottom";
        tr.style.height = "45px";

        tr.onmouseover = () => tr.style.backgroundColor = "rgba(0,0,0,0.015)";
        tr.onmouseout = () => tr.style.backgroundColor = "";

        const variedadContent = row.variedad === 'Premium'
            ? '<span class="badge bg-warning text-dark fw-normal" style="font-size: 0.7rem;">Premium</span>'
            : `<span class="text-muted small">${row.variedad}</span>`;

        const typeBadge = row.type === 'PROPIO'
            ? '<span class="badge bg-success bg-opacity-10 text-success border border-success border-opacity-25 rounded-pill" style="font-weight: 500; font-size: 0.7rem;">PROPIO</span>'
            : '<span class="badge bg-info bg-opacity-10 text-info border border-info border-opacity-25 rounded-pill" style="font-weight: 500; font-size: 0.7rem;">PROVEEDOR</span>';

        tr.innerHTML = `
            <td class="fw-bold text-dark ps-3" style="font-size: 0.9rem;">${row.finca}</td>
            <td class="text-muted small text-uppercase" style="font-size: 0.8rem;">${row.jornada}</td>
            <td class="">${variedadContent}</td>
            <td class="">${typeBadge}</td>
        `;

        // Days
        row.days.forEach((val, i) => {
            const cellVal = val > 0 ? val.toFixed(1) : '';
            const item = row.items[i];

            const td = document.createElement('td');
            td.className = "text-center p-0";

            if (val > 0) {
                td.innerHTML = `
                    <div class="d-flex align-items-center justify-content-center" style="height: 100%;">
                        <span class="d-inline-block rounded-pill text-center fw-bold" 
                              style="background-color: #eef2f7; color: #2c3e50; min-width: 45px; padding: 4px 0; font-size: 0.9rem;">
                            ${cellVal}
                        </span>
                    </div>`;
                td.style.cursor = 'pointer';
                td.onclick = () => openProgramacionModal(item);
            } else {
                td.innerHTML = `<span style="color: #eee;">&middot;</span>`;
            }
            tr.appendChild(td);
        });

        // Row Total
        tr.innerHTML += `<td class="text-center fw-bold text-dark" style="font-size: 0.95rem;">${row.rowTotal.toFixed(1)}</td>`;
        tbody.appendChild(tr);
    });

    if (currentType !== null) {
        renderSubtotalRow(tbody, currentType, typeDailyTotals, typeSubtotal);
    }

    // 4. Render Grand Total Footer
    let footerHTML = `<tr style="border-top: 2px solid #dee2e6;">
        <td colspan="4" class="text-end fw-bold text-uppercase py-3 pe-3 text-secondary" style="font-size: 0.85rem;">Total General</td>`;
    dailyTotals.forEach(val => {
        const opacity = val > 0 ? '1' : '0.3';
        footerHTML += `<td class="text-center fw-bold py-3" style="font-size: 1rem; opacity: ${opacity};">${val.toFixed(1)}</td>`;
    });
    footerHTML += `<td class="text-center fw-bold py-3 text-white bg-dark" style="font-size: 1.1rem;">${grandTotal.toFixed(1)}</td></tr>`;
    tfoot.innerHTML = footerHTML;
}

function renderSubtotalRow(tbody, type, dailyTotals, total) {
    let tr = document.createElement('tr');
    tr.style.backgroundColor = "#fcfcfc";
    tr.innerHTML = `
        <td colspan="4" class="text-end text-muted text-uppercase py-2 pe-3" style="font-size: 0.75rem; letter-spacing: 0.05em;">Total ${type}</td>
    `;
    dailyTotals.forEach(val => {
        const colorClass = val > 0 ? 'text-dark fw-bold' : 'text-muted fw-light';
        tr.innerHTML += `<td class="text-center py-2 ${colorClass}" style="font-size: 0.85rem;">${val > 0 ? val.toFixed(1) : '-'}</td>`;
    });
    tr.innerHTML += `<td class="text-center py-2 fw-bold text-dark" style="font-size: 0.9rem;">${total.toFixed(1)}</td>`;
    tbody.appendChild(tr);
}

function renderVehicleProgrammingTable(items) {
    const tbody = document.querySelector('#tb-vehicle-programming tbody');
    tbody.innerHTML = '';

    if (items.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="text-center">No hay programación para esta semana.</td></tr>';
        return;
    }

    items.forEach(item => {
        const date = new Date(item.fecha_programacion);
        // Adjust date to show correctly in local time or UTC as needed. 
        // Since input is YYYY-MM-DD, we can just parse parts to avoid timezone shifts
        const [y, m, d] = item.fecha_programacion.split('-');
        const localDate = new Date(y, m - 1, d);

        const dayName = localDate.toLocaleDateString('es-ES', { weekday: 'long' });
        const dateStr = localDate.toLocaleDateString('es-ES');

        const finca = item.nombre_finca ? `${item.nombre_finca} (${item.proveedor_nombre})` : (item.finca_empresa || 'N/A');
        const acopio = item.acopio_nombre || 'N/A';
        const material = item.tipo_material || item.variedad_fruto || '-';

        let vehiculo = '<span class="text-muted">Sin asignar</span>';
        let conductor = '<span class="text-muted">Sin asignar</span>';
        let estado = '<span class="badge bg-warning text-dark">Pendiente</span>';
        let acciones = `<button class="btn btn-sm btn-success" onclick="openViajeModalForItem(${item.id})"><i class="fas fa-truck"></i> Asignar</button>`;

        if (item.viaje_id) {
            vehiculo = `<strong>${item.placa}</strong> <small>(${item.tipo_vehiculo})</small>`;
            conductor = `${item.conductor_nombres} ${item.conductor_apellidos}`;
            estado = `<span class="badge bg-primary">${item.estado_viaje}</span>`;
            acciones = `<button class="btn btn-sm btn-info" onclick="alert('Detalles del viaje ID: ${item.viaje_id}')"><i class="fas fa-eye"></i> Ver</button>`;
        }

        const row = `
            <tr>
                <td class="text-capitalize">${dayName} <br> <small>${dateStr}</small></td>
                <td>
                    <strong>${finca}</strong><br>
                    <small class="text-muted">Acopio: ${acopio}</small>
                </td>
                <td>
                    ${item.cantidad_cajones} Cajones<br>
                    <small>${item.cajon_color || ''}</small>
                </td>
                <td>${material}</td>
                <td>${vehiculo}</td>
                <td>${conductor}</td>
                <td>${estado}</td>
                <td>${acciones}</td>
            </tr>
        `;
        tbody.innerHTML += row;
    });
}

function openViajeModalForItem(progId) {
    document.getElementById('v_prog_id').value = progId;
    loadVehiculosDisponibles();
    loadConductores();
    new bootstrap.Modal(document.getElementById('modalViaje')).show();
}

function openProgramacionModal(item = null) {
    const form = document.getElementById('formProgramacion');
    form.reset();
    document.getElementById('viajes-list').innerHTML = '';

    if (item) {
        form.id.value = item.id;
        form.fecha_programacion.value = item.fecha_programacion;
        form.jornada.value = item.jornada || 'Mañana'; // Default to Mañana if missing
        form.variedad_fruto.value = item.variedad_fruto;

        // Set Selects and trigger updates
        form.cajon_id.value = item.cajon_id;
        onCajonSelect(); // Fill related fields

        form.cantidad_cajones.value = item.cantidad_cajones;
        // Recalculate tons or keep saved? Keep saved if available, else calc
        if (item.toneladas_estimadas) form.toneladas_estimadas.value = item.toneladas_estimadas;
        else calculateTons();

        form.acopio_id.value = item.acopio_id;

        form.finca_id.value = item.finca_id;
        onFincaSelect(); // Fill related fields

        loadViajes(item.id);
    } else {
        form.id.value = '';
    }

    new bootstrap.Modal(document.getElementById('modalProgramacion')).show();
}

function saveProgramacion() {
    const form = document.getElementById('formProgramacion');
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }

    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());

    // Manually add disabled fields if needed
    if (!data.acopio_id) {
        data.acopio_id = document.getElementById('select-acopio').value;
    }

    console.log('Saving Programacion Data:', data);

    fetch(`${API_URL}?action=save_programacion`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    })
        .then(response => {
            if (!response.ok) {
                return response.text().then(text => { throw new Error(text) });
            }
            return response.json();
        })
        .then(result => {
            console.log('Save result:', result);
            if (result.status === 'success') {
                bootstrap.Modal.getInstance(document.getElementById('modalProgramacion')).hide();
                loadProgramacion();
                alert('Programación guardada correctamente');
            } else {
                alert('Error al guardar: ' + result.message);
            }
        })
        .catch(error => {
            console.error('Error saving programacion:', error);
            alert('Error de red o servidor: ' + error.message);
        });
}

// --- Viajes ---

function loadViajes(progId) {
    fetch(`${API_URL}?action=get_viajes&programacion_id=${progId}`)
        .then(response => response.json())
        .then(data => {
            const list = document.getElementById('viajes-list');
            list.innerHTML = '';
            if (data.data.length === 0) {
                list.innerHTML = '<small class="text-muted">No hay viajes asignados.</small>';
            } else {
                data.data.forEach(v => {
                    list.innerHTML += `
                        <div class="alert alert-secondary p-2 mb-1">
                            <strong>${v.placa}</strong> - ${v.nombres || ''} ${v.apellidos || ''}
                            <span class="badge bg-primary float-end">${v.estado_viaje}</span>
                        </div>
                    `;
                });
            }
        });
}

function openViajeModal() {
    const progId = document.getElementById('p_id').value;
    if (!progId) {
        alert('Guarde la programación primero.');
        return;
    }
    document.getElementById('v_prog_id').value = progId;

    // Load vehicles and drivers
    loadVehiculosDisponibles();
    loadConductores();

    new bootstrap.Modal(document.getElementById('modalViaje')).show();
}

function loadVehiculosDisponibles() {
    fetch(`${PORTERIA_API_URL}?action=get_vehiculos`)
        .then(response => response.json())
        .then(data => {
            const select = document.getElementById('select-vehiculo');
            select.innerHTML = '<option value="">Seleccione...</option>';
            data.data.forEach(v => {
                if (v.ubicacion_actual === 'en_planta' && v.estado_vehiculo === 'activo') {
                    select.innerHTML += `<option value="${v.id}">${v.placa} (${v.tipo_vehiculo})</option>`;
                }
            });
        });
}

function loadConductores() {
    fetch(`${PORTERIA_API_URL}?action=get_conductores`)
        .then(response => response.json())
        .then(data => {
            const select = document.getElementById('select-conductor');
            select.innerHTML = '<option value="">Seleccione...</option>';
            data.data.forEach(c => {
                if (c.estado_conductor === 'activo') {
                    select.innerHTML += `<option value="${c.id}">${c.nombres} ${c.apellidos}</option>`;
                }
            });
        });
}

function saveViaje() {
    const form = document.getElementById('formViaje');
    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());

    fetch(`${API_URL}?action=save_viaje`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    })
        .then(response => response.json())
        .then(result => {
            if (result.status === 'success') {
                bootstrap.Modal.getInstance(document.getElementById('modalViaje')).hide();
                loadViajes(data.programacion_id);
            } else {
                alert('Error: ' + result.message);
            }
        });
}

// --- Master Data & Form Logic ---

let masterData = {
    cajones: [],
    fincas: [],
    acopios: []
};

async function loadMasterData() {
    try {
        const res = await fetch(`${API_URL}?action=get_master_data`);
        const json = await res.json();
        if (json.status === 'success') {
            masterData = json.data;
            populateMasterData();
        }
    } catch (e) {
        console.error('Error loading master data:', e);
    }
}

function populateMasterData() {
    const cajonSelect = document.getElementById('select-cajon');
    const fincaSelect = document.getElementById('select-finca');

    // Populate Cajones
    cajonSelect.innerHTML = '<option value="">Seleccione...</option>';
    masterData.cajones.forEach(c => {
        cajonSelect.innerHTML += `<option value="${c.id}">${c.codigo} - ${c.color}</option>`;
    });

    // Populate Fincas (Show Finca Name - Provider)
    fincaSelect.innerHTML = '<option value="">Seleccione...</option>';
    masterData.fincas.forEach(f => {
        // Use nombre_finca if available, else fallback
        const name = f.nombre_finca ? `${f.nombre_finca} (${f.nombre_empresa})` : f.nombre_empresa;
        fincaSelect.innerHTML += `<option value="${f.id}">${name}</option>`;
    });
}

function onCajonSelect() {
    const id = document.getElementById('select-cajon').value;
    const cajon = masterData.cajones.find(c => c.id == id);

    if (cajon) {
        document.getElementById('cajon_color').value = cajon.color;
        document.getElementById('cajon_empresa').value = cajon.empresa;
        document.getElementById('cajon_tipo').value = cajon.tipo;
        document.getElementById('cajon_capacidad').value = cajon.capacidad_ton;
        calculateTons();
    } else {
        document.getElementById('cajon_color').value = '';
        document.getElementById('cajon_empresa').value = '';
        document.getElementById('cajon_tipo').value = '';
        document.getElementById('cajon_capacidad').value = '';
    }
}

function onFincaSelect() {
    const id = document.getElementById('select-finca').value;
    const finca = masterData.fincas.find(f => f.id == id);
    const acopioSelect = document.getElementById('select-acopio');

    if (finca) {
        document.getElementById('finca_empresa').value = finca.nombre_empresa;
        document.getElementById('finca_nit').value = finca.nit;
        document.getElementById('finca_distancia_km').value = finca.distancia_km;

        // Filter Acopios for this Finca
        const filteredAcopios = masterData.acopios.filter(a => a.finca_id == id);

        acopioSelect.innerHTML = '<option value="">Seleccione...</option>';
        if (filteredAcopios.length > 0) {
            acopioSelect.disabled = false;
            filteredAcopios.forEach(a => {
                acopioSelect.innerHTML += `<option value="${a.id}">${a.identificador}</option>`;
            });
        } else {
            acopioSelect.innerHTML = '<option value="">No hay acopios registrados</option>';
            acopioSelect.disabled = true;
        }
    } else {
        // Reset
        document.getElementById('finca_empresa').value = '';
        document.getElementById('finca_nit').value = '';
        document.getElementById('finca_distancia_km').value = '';
        acopioSelect.innerHTML = '<option value="">Seleccione Finca primero...</option>';
        acopioSelect.disabled = true;
    }
}

function calculateTons() {
    const capacity = parseFloat(document.getElementById('cajon_capacidad').value) || 0;
    const qty = parseFloat(document.getElementById('cantidad_cajones').value) || 0;
    const total = capacity * qty;
    document.querySelector('input[name="toneladas_estimadas"]').value = total.toFixed(2);
}

// ===========================================
// UI HELPERS
// ===========================================

// Show trips section only when editing
function toggleViajesSection(show) {
    const el = document.getElementById('section-viajes');
    if (el) {
        if (show) el.classList.remove('d-none');
        else el.classList.add('d-none');
    }
}

// Hook into existing openProgramacionModal to toggle section
document.addEventListener('DOMContentLoaded', function () {
    // Wait a bit to ensure programacion.js is loaded if it's not immediate
    setTimeout(() => {
        if (typeof openProgramacionModal === 'function') {
            const originalOpen = openProgramacionModal;
            openProgramacionModal = function (item) {
                originalOpen(item);
                toggleViajesSection(!!item);
            }
        }
    }, 100);
});
