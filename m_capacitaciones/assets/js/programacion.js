// assets/js/programacion.js
// Manages training programming interface

(function() {
    'use strict';

    let programaciones = [];
    let cargos = [];
    let temas = [];
    let roles = [];
    let subAreas = [];
    let editingId = null;
    let importData = [];

    // Load HTML components (navbar and sidebar)
    async function includeComponent(file, selector) {
        try {
            const res = await fetch(file, { cache: 'no-store' });
            if (!res.ok) throw new Error('HTTP ' + res.status);
            const html = await res.text();
            const el = document.querySelector(selector);
            if (el) el.innerHTML = html;
        } catch (err) {
            console.error(`Error loading ${file}:`, err);
        }
    }

    document.addEventListener('DOMContentLoaded', async function() {
        try {
            // Load navbar and sidebar first
            await includeComponent('../includes/navbar.html', '#navbar');
            await includeComponent('../includes/sidebar.html', '#sidebar');
            
            // Make page visible after includes are loaded
            document.body.style.visibility = 'visible';
            
            await loadData();
            setupEventListeners();
            
            // Check for URL parameters to auto-open modal with pre-selected values
            checkUrlParameters();
        } catch (error) {
            console.error('Error initializing page:', error);
            showAlert('Error al cargar la página', 'danger');
        }
    });

    async function loadData() {
        try {
            // Load all required data including trainer alerts
            const [progRes, cargoRes, temaRes, rolRes, subAreaRes, alertsRes] = await Promise.all([
                fetch('assets/php/programacion_api.php?action=list'),
                fetch('assets/php/programacion_api.php?action=get_cargos'),
                fetch('assets/php/programacion_api.php?action=get_temas'),
                fetch('assets/php/programacion_api.php?action=get_roles'),
                fetch('assets/php/programacion_api.php?action=get_sub_areas'),
                fetch('assets/php/notificaciones_api.php?action=get_trainer_alerts')
            ]);

            const progData = await progRes.json();
            const cargoData = await cargoRes.json();
            const temaData = await temaRes.json();
            const rolData = await rolRes.json();
            const subAreaData = await subAreaRes.json();
            const alertsData = await alertsRes.json();

            if (progData.success) programaciones = progData.data;
            if (cargoData.success) cargos = cargoData.data;
            if (temaData.success) temas = temaData.data;
            if (rolData.success) roles = rolData.data;
            if (subAreaData.success) subAreas = subAreaData.data;
            if (alertsData.success) displayTrainerAlerts(alertsData.data);

            populateFilters();
            populateSelects();
            renderTable();
        } catch (error) {
            console.error('Error loading data:', error);
            throw error;
        }
    }

    function populateFilters() {
        const filterCargo = document.getElementById('filterCargo');
        const filterTema = document.getElementById('filterTema');
        const filterRol = document.getElementById('filterRol');

        // Populate cargo filter
        cargos.forEach(cargo => {
            const option = document.createElement('option');
            option.value = cargo.id;
            option.textContent = cargo.cargo;
            filterCargo.appendChild(option);
        });

        // Populate tema filter
        temas.forEach(tema => {
            const option = document.createElement('option');
            option.value = tema.id;
            option.textContent = tema.nombre;
            filterTema.appendChild(option);
        });

        // Populate rol filter
        roles.forEach(rol => {
            const option = document.createElement('option');
            option.value = rol.id;
            option.textContent = rol.nombre;
            filterRol.appendChild(option);
        });
    }

    function displayTrainerAlerts(alerts) {
        const alertsBox = document.getElementById('trainerAlerts');
        const alertsList = document.getElementById('alertsList');
        
        if (!alerts || alerts.length === 0) {
            alertsBox.classList.add('d-none');
            return;
        }
        
        // Determine alert color based on most urgent alert
        const mostUrgent = Math.min(...alerts.map(a => parseInt(a.dias_para_proxima) || 0));
        const alertClass = mostUrgent < 0 ? 'alert-danger' : mostUrgent <= 7 ? 'alert-warning' : 'alert-info';
        
        alertsBox.className = `alert alert-dismissible fade show ${alertClass}`;
        
        alertsList.innerHTML = '<ul class="mb-0">' + alerts.map(alert => {
            const dias = parseInt(alert.dias_para_proxima) || 0;
            const statusText = dias < 0 
                ? `<strong class="text-danger">Vencida hace ${Math.abs(dias)} días</strong>`
                : dias === 0
                ? `<strong class="text-danger">Vence HOY</strong>`
                : `<strong>Vence en ${dias} días</strong>`;
            
            const colaboradoresCount = parseInt(alert.colaboradores_pendientes) || 0;
            
            const fechaProxima = alert.fecha_proxima_capacitacion 
                ? parseLocalDate(alert.fecha_proxima_capacitacion).toLocaleDateString('es-CO')
                : '-';
            
            return `
                <li class="mb-2">
                    <strong>${alert.tema_nombre}</strong> - ${alert.cargo_nombre} 
                    ${alert.sub_area_nombre ? `(${alert.sub_area_nombre})` : ''}
                    <br>
                    ${statusText} (${fechaProxima}) - ${colaboradoresCount} colaborador(es) pendiente(s)
                    <br>
                    <small class="text-muted">Rol: ${alert.rol_capacitador_nombre}</small>
                </li>
            `;
        }).join('') + '</ul>';
        
        alertsBox.classList.remove('d-none');
    }

    function populateSelects() {
        const inputCargo = document.getElementById('inputCargo');
        const inputSubArea = document.getElementById('inputSubArea');
        const inputTema = document.getElementById('inputTema');
        const inputRol = document.getElementById('inputRolCapacitador');

        // Clear existing options
        inputCargo.innerHTML = '<option value="">Seleccione...</option>';
        inputTema.innerHTML = '<option value="">Seleccione...</option>';
        inputRol.innerHTML = '<option value="">Seleccione...</option>';

        // Populate cargo select
        cargos.forEach(cargo => {
            const option = document.createElement('option');
            option.value = cargo.id;
            option.textContent = cargo.cargo;
            inputCargo.appendChild(option);
        });

        // Populate sub area select with ID as value
        if (inputSubArea) {
            inputSubArea.innerHTML = '<option value="">Seleccione...</option>';
            subAreas.forEach(sa => {
                const option = document.createElement('option');
                option.value = sa.id_area;  // Store ID, not name
                option.textContent = sa.sub_area;  // Display name
                inputSubArea.appendChild(option);
            });
        }

        // Populate tema select
        temas.forEach(tema => {
            const option = document.createElement('option');
            option.value = tema.id;
            option.textContent = tema.nombre;
            inputTema.appendChild(option);
        });

        // Populate rol select
        roles.forEach(rol => {
            const option = document.createElement('option');
            option.value = rol.id;
            option.textContent = rol.nombre;
            inputRol.appendChild(option);
        });
    }

    function renderTable(filterData = null) {
        const tbody = document.querySelector('#tableProgramaciones tbody');
        const data = filterData || programaciones;

        if (data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="10" class="text-center">No hay programaciones registradas</td></tr>';
            return;
        }

        tbody.innerHTML = data.map(prog => {
            // Format dates
            const fechaProxima = prog.fecha_proxima_capacitacion 
                ? parseLocalDate(prog.fecha_proxima_capacitacion).toLocaleDateString('es-CO') 
                : '-';
            const fechaNotificacion = prog.fecha_notificacion_previa 
                ? parseLocalDate(prog.fecha_notificacion_previa).toLocaleDateString('es-CO') 
                : '-';
            
            // Calculate days until next training
            let diasPara = null;
            if (prog.fecha_proxima_capacitacion) {
                const hoy = getTodayAtMidnight();
                const proxima = parseLocalDate(prog.fecha_proxima_capacitacion);
                diasPara = Math.floor((proxima - hoy) / (1000 * 60 * 60 * 24));
            }
            
            const pendientes = prog.colaboradores_pendientes || 0;
            
            // Format next training date with badge
            let fechaProximaBadge = '-';
            if (fechaProxima !== '-') {
                if (diasPara < 0) {
                    fechaProximaBadge = `<span class="badge bg-danger">${fechaProxima}<br><small>Vencida (${Math.abs(diasPara)} días)</small></span>`;
                } else if (diasPara <= 7) {
                    fechaProximaBadge = `<span class="badge bg-warning text-dark">${fechaProxima}<br><small>En ${diasPara} días</small></span>`;
                } else if (diasPara <= 30) {
                    fechaProximaBadge = `<span class="badge bg-info">${fechaProxima}<br><small>En ${diasPara} días</small></span>`;
                } else {
                    fechaProximaBadge = `<span class="badge bg-secondary">${fechaProxima}<br><small>En ${diasPara} días</small></span>`;
                }
            }
            
            let pendientesBadge = pendientes > 0 
                ? `<span class="badge bg-primary">${pendientes}</span>` 
                : '<span class="badge bg-secondary">0</span>';
            
            return `
            <tr>
                <td>${prog.id}</td>
                <td>${prog.cargo_nombre}</td>
                <td>${prog.sub_area_nombre || '-'}</td>
                <td>${prog.tema_nombre}</td>
                <td>${prog.frecuencia_meses}</td>
                <td><span class="badge bg-info">${prog.rol_capacitador_nombre}</span></td>
                <td class="text-center">${fechaProximaBadge}</td>
                <td class="text-center">${fechaNotificacion}</td>
                <td class="text-center">${pendientesBadge}</td>
                <td>
                    <button class="btn btn-sm btn-primary" onclick="window.editProgramacion(${prog.id})">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="window.deleteProgramacion(${prog.id})">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `;
        }).join('');
    }

    function checkUrlParameters() {
        // Check if there are URL parameters for auto-opening the modal
        try {
            const urlParams = new URLSearchParams(window.location.search);
            const subAreaParam = urlParams.get('sub_area');
            const cargoParam = urlParams.get('cargo');
            
            if (subAreaParam || cargoParam) {
                // Reset modal state
                editingId = null;
                const modalTitle = document.getElementById('modalTitle');
                const form = document.getElementById('formProgramacion');
                const programacionId = document.getElementById('programacionId');
                
                if (!modalTitle || !form || !programacionId) {
                    console.error('Modal elements not found');
                    return;
                }
                
                modalTitle.textContent = 'Nueva Programación';
                form.reset();
                programacionId.value = '';
                
                // Set sub_area if provided
                if (subAreaParam) {
                    const subAreaSelect = document.getElementById('inputSubArea');
                    if (subAreaSelect) {
                        const decodedSubArea = decodeURIComponent(subAreaParam);
                        ensureOptionExists(subAreaSelect, decodedSubArea);
                        subAreaSelect.value = decodedSubArea;
                    }
                }
                
                // Set cargo if provided (note: cargo uses ID, not name)
                if (cargoParam) {
                    const cargoSelect = document.getElementById('inputCargo');
                    if (cargoSelect) {
                        cargoSelect.value = cargoParam;
                    }
                }
                
                // Show the modal
                const modalElement = document.getElementById('modalProgramacion');
                if (modalElement) {
                    new bootstrap.Modal(modalElement).show();
                }
                
                // Clean the URL
                window.history.replaceState({}, document.title, window.location.pathname);
            }
        } catch (error) {
            console.error('Error processing URL parameters:', error);
        }
    }

    function ensureOptionExists(selectElement, value) {
        // Helper function to ensure a value exists in a select dropdown
        // Adds the option if it doesn't exist
        if (!selectElement || !value) return false;
        
        // Check if the value exists in the options
        let optionExists = false;
        for (let i = 0; i < selectElement.options.length; i++) {
            if (selectElement.options[i].value === value) {
                optionExists = true;
                break;
            }
        }
        
        // If the option doesn't exist, add it
        if (!optionExists) {
            const newOption = document.createElement('option');
            newOption.value = value;
            newOption.textContent = value;
            selectElement.appendChild(newOption);
        }
        
        return true;
    }

    function setupEventListeners() {
        // New programming button
        document.getElementById('btnNuevaProgramacion').addEventListener('click', function() {
            editingId = null;
            document.getElementById('modalTitle').textContent = 'Nueva Programación';
            document.getElementById('formProgramacion').reset();
            document.getElementById('programacionId').value = '';
            
            // Re-populate sub area select in case it was modified
            populateSelects();
            
            new bootstrap.Modal(document.getElementById('modalProgramacion')).show();
        });

        // Save button
        document.getElementById('btnGuardar').addEventListener('click', saveProgramacion);

        // Filter change handlers
        document.getElementById('filterCargo').addEventListener('change', applyFilters);
        document.getElementById('filterTema').addEventListener('change', applyFilters);
        document.getElementById('filterRol').addEventListener('change', applyFilters);

        // Clear filters
        document.getElementById('btnClearFilters').addEventListener('click', function() {
            document.getElementById('filterCargo').value = '';
            document.getElementById('filterTema').value = '';
            document.getElementById('filterRol').value = '';
            renderTable();
        });

        // Import Excel button
        document.getElementById('btnImportExcel').addEventListener('click', function() {
            document.getElementById('inputExcel').value = '';
            document.getElementById('importPreview').classList.add('d-none');
            document.getElementById('importErrors').classList.add('d-none');
            document.getElementById('btnImportar').disabled = true;
            new bootstrap.Modal(document.getElementById('modalImport')).show();
        });

        // Download template button
        document.getElementById('btnDownloadTemplate').addEventListener('click', downloadTemplate);

        // Excel file input
        document.getElementById('inputExcel').addEventListener('change', handleExcelFile);

        // Import button
        document.getElementById('btnImportar').addEventListener('click', importExcelData);
    }

    function applyFilters() {
        const cargoFilter = document.getElementById('filterCargo').value;
        const temaFilter = document.getElementById('filterTema').value;
        const rolFilter = document.getElementById('filterRol').value;

        let filtered = programaciones;

        if (cargoFilter) {
            filtered = filtered.filter(p => p.id_cargo === cargoFilter);
        }

        if (temaFilter) {
            filtered = filtered.filter(p => p.id_tema == temaFilter);
        }

        if (rolFilter) {
            filtered = filtered.filter(p => p.id_rol_capacitador == rolFilter);
        }

        renderTable(filtered);
    }

    async function saveProgramacion() {
        const form = document.getElementById('formProgramacion');
        
        if (!form.checkValidity()) {
            form.reportValidity();
            return;
        }
        
        // Additional validation for sub_area (must not be empty)
        const subAreaValue = document.getElementById('inputSubArea').value;
        if (!subAreaValue || subAreaValue.trim() === '') {
            alert('El campo Sub Área es obligatorio');
            document.getElementById('inputSubArea').focus();
            return;
        }

        const data = {
            id_cargo: document.getElementById('inputCargo').value,
            sub_area: subAreaValue.trim(),
            id_tema: document.getElementById('inputTema').value,
            frecuencia_meses: document.getElementById('inputFrecuencia').value,
            id_rol_capacitador: document.getElementById('inputRolCapacitador').value
        };

        // Include fecha_proxima_capacitacion (required)
        const fechaProxima = document.getElementById('inputFechaProxima').value;
        if (!fechaProxima) {
            alert('La fecha próxima de capacitación es obligatoria');
            document.getElementById('inputFechaProxima').focus();
            return;
        }
        data.fecha_proxima_capacitacion = fechaProxima;

        if (editingId) {
            data.id = editingId;
        }

        try {
            const action = editingId ? 'update' : 'create';
            const res = await fetch(`assets/php/programacion_api.php?action=${action}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });

            const result = await res.json();

            if (result.success) {
                showAlert(result.message, 'success');
                bootstrap.Modal.getInstance(document.getElementById('modalProgramacion')).hide();
                await loadData();
            } else {
                showAlert(result.error, 'danger');
            }
        } catch (error) {
            console.error('Error saving:', error);
            showAlert('Error al guardar', 'danger');
        }
    }

    window.editProgramacion = async function(id) {
        try {
            const res = await fetch(`assets/php/programacion_api.php?action=get&id=${id}`);
            const result = await res.json();

            if (result.success && result.data) {
                const prog = result.data;
                editingId = id;

                document.getElementById('modalTitle').textContent = 'Editar Programación';
                document.getElementById('programacionId').value = id;
                document.getElementById('inputCargo').value = prog.id_cargo;
                document.getElementById('inputTema').value = prog.id_tema;
                document.getElementById('inputFrecuencia').value = prog.frecuencia_meses;
                document.getElementById('inputRolCapacitador').value = prog.id_rol_capacitador;
                
                // Set fecha_proxima_capacitacion if available
                document.getElementById('inputFechaProxima').value = prog.fecha_proxima_capacitacion || '';
                
                // Set sub_area - ensure the value exists in the dropdown first
                const subAreaSelect = document.getElementById('inputSubArea');
                const currentSubArea = prog.sub_area || '';
                
                if (subAreaSelect && currentSubArea) {
                    ensureOptionExists(subAreaSelect, currentSubArea);
                    subAreaSelect.value = currentSubArea;
                }

                new bootstrap.Modal(document.getElementById('modalProgramacion')).show();
            }
        } catch (error) {
            console.error('Error loading programming:', error);
            showAlert('Error al cargar programación', 'danger');
        }
    };

    window.deleteProgramacion = async function(id) {
        if (!confirm('¿Está seguro de eliminar esta programación?')) {
            return;
        }

        try {
            const res = await fetch(`assets/php/programacion_api.php?action=delete&id=${id}`, {
                method: 'POST'
            });

            const result = await res.json();

            if (result.success) {
                showAlert(result.message, 'success');
                await loadData();
            } else {
                showAlert(result.error, 'danger');
            }
        } catch (error) {
            console.error('Error deleting:', error);
            showAlert('Error al eliminar', 'danger');
        }
    };

    function handleExcelFile(e) {
        const file = e.target.files[0];
        if (!file) return;

        // Check if XLSX library is loaded
        if (typeof XLSX === 'undefined') {
            showAlert('Error: La librería XLSX no está cargada. Por favor, recargue la página.', 'danger');
            console.error('XLSX library is not loaded');
            return;
        }

        const reader = new FileReader();
        reader.onload = function(event) {
            try {
                const data = new Uint8Array(event.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                
                if (!workbook || !workbook.SheetNames || workbook.SheetNames.length === 0) {
                    throw new Error('El archivo no contiene hojas válidas');
                }
                
                const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
                const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });

                processExcelData(jsonData);
            } catch (error) {
                console.error('Error reading Excel:', error);
                showAlert('Error al leer el archivo Excel: ' + error.message, 'danger');
            }
        };
        reader.readAsArrayBuffer(file);
    }

    function processExcelData(data) {
        importData = [];
        const errors = [];
        const preview = document.getElementById('importPreviewBody');
        preview.innerHTML = '';

        // Validate data
        if (!data || data.length === 0) {
            showAlert('El archivo Excel está vacío o no tiene datos válidos', 'warning');
            document.getElementById('btnImportar').disabled = true;
            return;
        }

        if (data.length === 1) {
            showAlert('El archivo solo contiene la fila de encabezado. Por favor agregue datos.', 'warning');
            document.getElementById('btnImportar').disabled = true;
            return;
        }

        // Helper function to check if a value is empty (handles 0 as valid value)
        function isEmpty(value) {
            return !value && value !== 0;
        }

        // Helper function to escape HTML to prevent XSS
        function escapeHtml(text) {
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        }

        // Skip header row
        for (let i = 1; i < data.length; i++) {
            const row = data[i];
            
            // Skip completely empty rows
            if (!row || row.every(cell => cell === null || cell === undefined || cell === '')) {
                continue;
            }
            
            // Validate minimum number of columns
            if (row.length < 5) {
                errors.push(`Fila ${i + 1}: Faltan columnas (se esperan al menos 5 columnas)`);
                continue;
            }

            const cargo_id = row[0];
            const sub_area = row[1];
            const tema_id = row[2];
            const frecuencia = row[3];
            const rol_nombre = row[4];

            // Validate required fields
            if (isEmpty(cargo_id)) {
                errors.push(`Fila ${i + 1}: Cargo ID es obligatorio`);
                continue;
            }
            
            if (isEmpty(sub_area)) {
                errors.push(`Fila ${i + 1}: Sub Área ID es obligatorio`);
                continue;
            }
            
            if (isEmpty(tema_id)) {
                errors.push(`Fila ${i + 1}: Tema ID es obligatorio`);
                continue;
            }
            
            if (!rol_nombre) {
                errors.push(`Fila ${i + 1}: Rol Capacitador es obligatorio`);
                continue;
            }

            // Convert and validate tema_id
            const temaIdNum = parseInt(tema_id);
            if (isNaN(temaIdNum)) {
                errors.push(`Fila ${i + 1}: Tema ID debe ser un número válido`);
                continue;
            }

            // Convert and validate frecuencia
            const frecuenciaNum = parseInt(frecuencia);
            if (isNaN(frecuenciaNum) || frecuenciaNum < 1) {
                errors.push(`Fila ${i + 1}: Frecuencia debe ser un número válido mayor a 0`);
                continue;
            }

            // Find rol ID by name
            const rol = roles.find(r => r.nombre.toLowerCase() === String(rol_nombre).trim().toLowerCase());
            
            if (!rol) {
                errors.push(`Fila ${i + 1}: Rol "${escapeHtml(String(rol_nombre))}" no encontrado en la base de datos`);
                continue;
            }

            // Convert sub_area to string for consistent comparison
            const subAreaStr = String(sub_area).trim();
            
            const item = {
                id_cargo: String(cargo_id).trim(),
                sub_area: subAreaStr,
                id_tema: temaIdNum,
                frecuencia_meses: frecuenciaNum,
                id_rol_capacitador: rol.id
            };

            // Find names for preview
            const cargo = cargos.find(c => c.id === item.id_cargo);
            const tema = temas.find(t => t.id === item.id_tema);
            const subArea = subAreas.find(sa => String(sa.id_area) === item.sub_area);

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${cargo ? escapeHtml(cargo.cargo) : `<span class="text-warning">${escapeHtml(String(cargo_id))} (no encontrado)</span>`}</td>
                <td>${subArea ? escapeHtml(subArea.sub_area) : `<span class="text-warning">${escapeHtml(item.sub_area)} (no encontrado)</span>`}</td>
                <td>${tema ? escapeHtml(tema.nombre) : `<span class="text-warning">${escapeHtml(String(tema_id))} (no encontrado)</span>`}</td>
                <td>${item.frecuencia_meses}</td>
                <td>${escapeHtml(rol.nombre)}</td>
            `;
            preview.appendChild(tr);

            importData.push(item);
        }

        document.getElementById('importPreview').classList.remove('d-none');

        if (errors.length > 0) {
            const errorList = document.getElementById('importErrorList');
            errorList.innerHTML = errors.map(e => `<li>${e}</li>`).join('');
            document.getElementById('importErrors').classList.remove('d-none');
        } else {
            document.getElementById('importErrors').classList.add('d-none');
        }

        document.getElementById('btnImportar').disabled = importData.length === 0;
    }

    async function importExcelData() {
        if (importData.length === 0) return;

        try {
            const res = await fetch('assets/php/programacion_api.php?action=bulk_import', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ items: importData })
            });

            const result = await res.json();

            if (result.success) {
                let message = result.message;
                if (result.errors && result.errors.length > 0) {
                    message += '\n\nAdvertencias:\n' + result.errors.join('\n');
                }
                alert(message);
                bootstrap.Modal.getInstance(document.getElementById('modalImport')).hide();
                await loadData();
            } else {
                showAlert(result.error, 'danger');
            }
        } catch (error) {
            console.error('Error importing:', error);
            showAlert('Error al importar datos', 'danger');
        }
    }

    function downloadTemplate() {
        // Check if XLSX library is loaded
        if (typeof XLSX === 'undefined') {
            showAlert('Error: La librería XLSX no está cargada. Por favor, recargue la página.', 'danger');
            console.error('XLSX library is not loaded');
            return;
        }

        try {
            // Create a new workbook
            const wb = XLSX.utils.book_new();
            
            // Create template data with headers and example rows
            // Note: These are example values for reference only
            // Users should replace with actual IDs from their database
            const templateData = [
                ['Cargo ID', 'Sub Área ID', 'Tema ID', 'Frecuencia', 'Rol Capacitador'],
                ['117', '003', 49, 12, 'Capacitador SIE'],
                ['043', '016', 23, 12, 'Capacitador IND'],
                ['068', '001', 47, 6, 'Capacitador SIE']
            ];
            
            // Create worksheet from data
            const ws = XLSX.utils.aoa_to_sheet(templateData);
            
            // Set column widths for better readability
            ws['!cols'] = [
                { wch: 12 },  // Cargo ID
                { wch: 15 },  // Sub Área ID
                { wch: 10 },  // Tema ID
                { wch: 12 },  // Frecuencia
                { wch: 20 }   // Rol Capacitador
            ];
            
            // Add the worksheet to the workbook
            // Sheet name matches the expected format for import
            XLSX.utils.book_append_sheet(wb, ws, 'programacion');
            
            // Generate filename with current date
            const today = new Date();
            const dateStr = today.toISOString().split('T')[0]; // YYYY-MM-DD format
            const filename = `plantilla_programacion_${dateStr}.xlsx`;
            
            // Write the file
            XLSX.writeFile(wb, filename);
            
            showAlert('Plantilla descargada exitosamente', 'success');
        } catch (error) {
            console.error('Error generating template:', error);
            showAlert('Error al generar la plantilla: ' + error.message, 'danger');
        }
    }

    function showAlert(message, type) {
        const alert = document.createElement('div');
        alert.className = `alert alert-${type} alert-dismissible fade show position-fixed top-0 end-0 m-3`;
        alert.style.zIndex = '9999';
        alert.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        document.body.appendChild(alert);

        setTimeout(() => {
            alert.remove();
        }, 5000);
    }
})();
