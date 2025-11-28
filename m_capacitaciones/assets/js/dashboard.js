// assets/js/dashboard.js
// Manages training dashboard and reporting interface

(function() {
    'use strict';

    let dashboardData = [];
    let filters = {
        cargos: [],
        sub_areas: [],
        temas: [],
        roles: []
    };
    let currentFilters = {};
    let currentPage = 1;
    let recordsPerPage = 10;
    let currentFilteredData = [];

    // Load HTML components
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
            console.log('Dashboard initializing...');
            
            // Check if XLSX library is loaded
            if (typeof XLSX === 'undefined') {
                console.error('XLSX library not loaded!');
                showAlert('Advertencia: Biblioteca de Excel no cargada. Las exportaciones podrían no funcionar.', 'warning');
            } else {
                console.log('XLSX library loaded successfully');
            }
            
            await includeComponent('../includes/navbar.html', '#navbar');
            await includeComponent('../includes/sidebar.html', '#sidebar');
            
            document.body.style.visibility = 'visible';
            
            await loadData();
            setupEventListeners();
            
            console.log('Dashboard initialized successfully');
        } catch (error) {
            console.error('Error initializing page:', error);
            showAlert('Error al cargar la página: ' + error.message, 'danger');
        }
    });

    async function loadData() {
        try {
            console.log('Loading dashboard data...');
            const [dataRes, filtersRes] = await Promise.all([
                fetch('assets/php/malla_api.php?action=get_malla', { cache: 'no-store' }),
                fetch('assets/php/malla_api.php?action=get_filters', { cache: 'no-store' })
            ]);

            console.log('Data response status:', dataRes.status);
            console.log('Filters response status:', filtersRes.status);

            if (!dataRes.ok || !filtersRes.ok) {
                throw new Error(`HTTP error! Data: ${dataRes.status}, Filters: ${filtersRes.status}`);
            }

            const dataResult = await dataRes.json();
            const filtersResult = await filtersRes.json();

            console.log('Data result:', dataResult);
            console.log('Filters result:', filtersResult);

            if (dataResult.success) {
                dashboardData = dataResult.data || [];
                currentFilteredData = dashboardData;
                console.log(`Loaded ${dashboardData.length} records`);
                updateStatistics(dashboardData);
                updateTopSummaries(dashboardData);
                renderTable(dashboardData);
            } else {
                console.error('Data loading failed:', dataResult.error);
                const errorMsg = dataResult.error || 'Error desconocido';
                
                // Check for authentication error
                if (errorMsg.includes('autorizado') || errorMsg.includes('sesión')) {
                    showAlert('Su sesión ha expirado. Por favor, inicie sesión nuevamente.', 'danger');
                    setTimeout(() => {
                        window.location.href = '../index.html';
                    }, 2000);
                } else {
                    showAlert('Error al cargar datos: ' + errorMsg, 'danger');
                }
                
                // Show empty state
                renderTable([]);
            }

            if (filtersResult.success) {
                filters = filtersResult.data;
                populateFilters();
            } else {
                console.error('Filters loading failed:', filtersResult.error);
                showAlert('Error al cargar filtros: ' + (filtersResult.error || 'Error desconocido'), 'warning');
            }
        } catch (error) {
            console.error('Error loading data:', error);
            showAlert('Error al cargar datos: ' + error.message, 'danger');
            // Show empty state
            renderTable([]);
        }
    }

    function updateStatistics(data) {
        try {
            // Get unique employees
            const uniqueEmployees = [...new Set(data.map(r => r.ac_id).filter(id => id))];
            
            // Count trainings by status
            const alDiaCount = data.filter(r => r.estado === 'al_dia').length;
            const pendientesCount = data.filter(r => r.estado === 'pendiente' || r.estado === 'proximo_vencer').length;
            const vencidasCount = data.filter(r => r.estado === 'vencida').length;
            
            console.log('Statistics:', {
                uniqueEmployees: uniqueEmployees.length,
                alDiaCount,
                pendientesCount,
                vencidasCount,
                totalRecords: data.length
            });
            
            document.getElementById('statTotalColaboradores').textContent = uniqueEmployees.length;
            document.getElementById('statCapacitados').textContent = alDiaCount;
            document.getElementById('statPendientes').textContent = pendientesCount;
            document.getElementById('statVencidas').textContent = vencidasCount;
        } catch (error) {
            console.error('Error updating statistics:', error);
        }
    }

    function updateTopSummaries(data) {
        try {
            // Top cargos with pending trainings (includes pendiente, vencida, and proximo_vencer)
            const pendingData = data.filter(r => r.estado === 'pendiente' || r.estado === 'vencida' || r.estado === 'proximo_vencer');
            const cargoCount = {};
            
            pendingData.forEach(r => {
                if (r.cargo_nombre) {
                    cargoCount[r.cargo_nombre] = (cargoCount[r.cargo_nombre] || 0) + 1;
                }
            });
            
            const topCargos = Object.entries(cargoCount)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 10);
            
            console.log('Top cargos with pending trainings:', topCargos);
            
            const cargosContainer = document.getElementById('topCargosPendientes');
            if (topCargos.length > 0) {
                cargosContainer.innerHTML = `
                    <table class="table table-sm">
                        <thead>
                            <tr>
                                <th>Cargo</th>
                                <th class="text-end">Pendientes</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${topCargos.map(([cargo, count]) => `
                                <tr>
                                    <td>${cargo}</td>
                                    <td class="text-end"><span class="badge bg-warning text-dark">${count}</span></td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                `;
            } else {
                cargosContainer.innerHTML = '<p class="text-muted text-center py-3"><i class="fas fa-check-circle"></i> No hay capacitaciones pendientes</p>';
            }
            
            // Top temas with pending trainings
            const temaCount = {};
            
            pendingData.forEach(r => {
                if (r.tema_nombre) {
                    temaCount[r.tema_nombre] = (temaCount[r.tema_nombre] || 0) + 1;
                }
            });
            
            const topTemas = Object.entries(temaCount)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 10);
            
            console.log('Top temas with pending trainings:', topTemas);
            
            const temasContainer = document.getElementById('topTemasPendientes');
            if (topTemas.length > 0) {
                temasContainer.innerHTML = `
                    <table class="table table-sm">
                        <thead>
                            <tr>
                                <th>Tema</th>
                                <th class="text-end">Pendientes</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${topTemas.map(([tema, count]) => `
                                <tr>
                                    <td>${tema}</td>
                                    <td class="text-end"><span class="badge bg-warning text-dark">${count}</span></td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                `;
            } else {
                temasContainer.innerHTML = '<p class="text-muted text-center py-3"><i class="fas fa-check-circle"></i> No hay capacitaciones pendientes</p>';
            }
        } catch (error) {
            console.error('Error updating top summaries:', error);
        }
    }

    function populateFilters() {
        const cargoSelect = document.getElementById('filterCargo');
        const subAreaSelect = document.getElementById('filterSubArea');
        const temaSelect = document.getElementById('filterTema');
        const rolSelect = document.getElementById('filterRol');

        filters.cargos.forEach(cargo => {
            const option = document.createElement('option');
            option.value = cargo.id;
            option.textContent = cargo.cargo;
            cargoSelect.appendChild(option);
        });

        filters.sub_areas.forEach(sa => {
            const option = document.createElement('option');
            option.value = sa.id_area;
            option.textContent = sa.sub_area;
            subAreaSelect.appendChild(option);
        });

        filters.temas.forEach(tema => {
            const option = document.createElement('option');
            option.value = tema.id;
            option.textContent = tema.nombre;
            temaSelect.appendChild(option);
        });

        filters.roles.forEach(rol => {
            const option = document.createElement('option');
            option.value = rol.id;
            option.textContent = rol.nombre;
            rolSelect.appendChild(option);
        });
    }

    function renderTable(data) {
        const tbody = document.querySelector('#tableDashboard tbody');

        if (!data || data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="11" class="text-center py-4"><i class="fas fa-info-circle"></i> No hay registros para mostrar</td></tr>';
            document.getElementById('recordCount').textContent = 'Total: 0 registros';
            renderPagination(0);
            return;
        }

        currentFilteredData = data;
        console.log(`Rendering ${data.length} records in table`);

        // Calculate pagination
        const totalRecords = data.length;
        const totalPages = Math.ceil(totalRecords / recordsPerPage);
        const startIndex = (currentPage - 1) * recordsPerPage;
        const endIndex = Math.min(startIndex + recordsPerPage, totalRecords);
        const paginatedData = data.slice(startIndex, endIndex);

        tbody.innerHTML = paginatedData.map(record => {
            const estado = record.estado || 'pendiente';
            let estadoBadge = '';
            let rowClass = '';
            
            switch(estado) {
                case 'al_dia':
                    estadoBadge = '<span class="badge bg-success">Al Día</span>';
                    break;
                case 'proximo_vencer':
                    estadoBadge = '<span class="badge bg-warning text-dark">Próximo a Vencer</span>';
                    rowClass = 'table-warning';
                    break;
                case 'vencida':
                    estadoBadge = '<span class="badge bg-danger">Vencida</span>';
                    rowClass = 'table-danger';
                    break;
                default:
                    estadoBadge = '<span class="badge bg-secondary">Pendiente</span>';
                    rowClass = 'table-light';
            }

            // Get situacion badge
            const situacion = `<span class="badge bg-info">${record.situacion || 'N/A'}</span>`;

            const ultimaCapacitacion = record.ultima_capacitacion 
                ? parseLocalDate(record.ultima_capacitacion).toLocaleDateString('es-CO') 
                : '<span class="text-muted">Sin registro</span>';
            
            const proximaCapacitacion = record.proxima_capacitacion 
                ? parseLocalDate(record.proxima_capacitacion).toLocaleDateString('es-CO') 
                : '<span class="text-muted">-</span>';

            const diasRestantes = record.dias_restantes !== null ? record.dias_restantes : '-';
            let diasDisplay = '-';
            
            if (diasRestantes !== '-') {
                const dias = parseInt(diasRestantes);
                if (dias < 0) {
                    diasDisplay = `<span class="text-danger fw-bold">${Math.abs(dias)} días vencidos</span>`;
                } else if (dias <= 30) {
                    diasDisplay = `<span class="text-warning fw-bold">${dias} días</span>`;
                } else {
                    diasDisplay = `<span class="text-success">${dias} días</span>`;
                }
            }

            return `
                <tr class="${rowClass}">
                    <td>${estadoBadge}</td>
                    <td>${situacion}</td>
                    <td><small>${record.nombre_completo || 'N/A'}</small></td>
                    <td><small>${record.ac_cedula || 'N/A'}</small></td>
                    <td><small>${record.cargo_nombre || 'N/A'}</small></td>
                    <td><small>${record.sub_area_nombre || '-'}</small></td>
                    <td><small>${record.tema_nombre || 'N/A'}</small></td>
                    <td class="text-center"><small>${ultimaCapacitacion}</small></td>
                    <td class="text-center"><small>${proximaCapacitacion}</small></td>
                    <td class="text-center"><small>${diasDisplay}</small></td>
                    <td><small><span class="badge bg-info">${record.rol_capacitador_nombre || 'N/A'}</span></small></td>
                </tr>
            `;
        }).join('');

        document.getElementById('recordCount').textContent = `Mostrando ${startIndex + 1}-${endIndex} de ${totalRecords} registros`;
        renderPagination(totalRecords);
    }

    function renderPagination(totalRecords) {
        const paginationContainer = document.getElementById('tablePagination');
        const totalPages = Math.ceil(totalRecords / recordsPerPage);

        if (totalPages <= 1) {
            paginationContainer.innerHTML = '';
            return;
        }

        let paginationHTML = '';

        // Previous button
        paginationHTML += `
            <li class="page-item ${currentPage === 1 ? 'disabled' : ''}">
                <a class="page-link" href="#" data-page="${currentPage - 1}" aria-label="Anterior">
                    <span aria-hidden="true">&laquo;</span>
                </a>
            </li>
        `;

        // Calculate page numbers to show (max 7)
        let startPage = 1;
        let endPage = totalPages;
        
        if (totalPages > 7) {
            if (currentPage <= 4) {
                // Near the beginning
                startPage = 1;
                endPage = 7;
            } else if (currentPage >= totalPages - 3) {
                // Near the end
                startPage = totalPages - 6;
                endPage = totalPages;
            } else {
                // In the middle
                startPage = currentPage - 3;
                endPage = currentPage + 3;
            }
        }

        // First page button if not in range
        if (startPage > 1) {
            paginationHTML += `
                <li class="page-item">
                    <a class="page-link" href="#" data-page="1">1</a>
                </li>
            `;
            
            // Add ellipsis if there's a gap
            if (startPage > 2) {
                paginationHTML += `
                    <li class="page-item disabled">
                        <span class="page-link">...</span>
                    </li>
                `;
            }
        }

        // Page numbers
        for (let i = startPage; i <= endPage; i++) {
            paginationHTML += `
                <li class="page-item ${i === currentPage ? 'active' : ''}">
                    <a class="page-link" href="#" data-page="${i}">${i}</a>
                </li>
            `;
        }

        // Last page button if not in range
        if (endPage < totalPages) {
            // Add ellipsis if there's a gap
            if (endPage < totalPages - 1) {
                paginationHTML += `
                    <li class="page-item disabled">
                        <span class="page-link">...</span>
                    </li>
                `;
            }
            
            paginationHTML += `
                <li class="page-item">
                    <a class="page-link" href="#" data-page="${totalPages}">${totalPages}</a>
                </li>
            `;
        }

        // Next button
        paginationHTML += `
            <li class="page-item ${currentPage === totalPages ? 'disabled' : ''}">
                <a class="page-link" href="#" data-page="${currentPage + 1}" aria-label="Siguiente">
                    <span aria-hidden="true">&raquo;</span>
                </a>
            </li>
        `;

        paginationContainer.innerHTML = paginationHTML;
    }

    function changePage(page) {
        const totalPages = Math.ceil(currentFilteredData.length / recordsPerPage);
        if (page >= 1 && page <= totalPages) {
            currentPage = page;
            renderTable(currentFilteredData);
        }
    }

    function changeRecordsPerPage(value) {
        recordsPerPage = parseInt(value);
        currentPage = 1;
        renderTable(currentFilteredData);
    }

    function applyFilters() {
        console.log('Applying filters...');
        const estadoFilter = document.getElementById('filterEstado').value;
        const situacionFilter = document.getElementById('filterSituacion').value;
        const cargoFilter = document.getElementById('filterCargo').value;
        const subAreaFilter = document.getElementById('filterSubArea').value;
        const temaFilter = document.getElementById('filterTema').value;
        const rolFilter = document.getElementById('filterRol').value;
        const fechaDesde = document.getElementById('filterFechaDesde').value;
        const fechaHasta = document.getElementById('filterFechaHasta').value;

        console.log('Filters:', { estadoFilter, situacionFilter, cargoFilter, subAreaFilter, temaFilter, rolFilter, fechaDesde, fechaHasta });

        let filtered = [...dashboardData];

        if (estadoFilter) {
            filtered = filtered.filter(r => r.estado === estadoFilter);
        }

        if (situacionFilter) {
            filtered = filtered.filter(r => r.situacion === situacionFilter);
        }

        // Note: Using loose equality (==) for ID comparisons because:
        // - Database IDs are integers
        // - Form values are strings
        // - This allows type coercion for proper matching
        if (cargoFilter) {
            filtered = filtered.filter(r => r.ac_id_cargo == cargoFilter);
        }

        if (subAreaFilter) {
            filtered = filtered.filter(r => r.ac_sub_area == subAreaFilter);
        }

        if (temaFilter) {
            filtered = filtered.filter(r => r.id_tema == temaFilter);
        }

        if (rolFilter) {
            filtered = filtered.filter(r => r.id_rol_capacitador == rolFilter);
        }

        // Date range filter
        if (fechaDesde || fechaHasta) {
            filtered = filtered.filter(r => {
                // Use ultima_capacitacion for date filtering
                // Note: Records without ultima_capacitacion (no training yet) are excluded
                // This is intentional as date range filtering only applies to completed trainings
                if (!r.ultima_capacitacion) return false;
                
                const recordDate = parseLocalDate(r.ultima_capacitacion);
                let passes = true;
                
                if (fechaDesde) {
                    const desde = parseLocalDate(fechaDesde);
                    passes = passes && recordDate >= desde;
                }
                
                if (fechaHasta) {
                    const hasta = parseLocalDate(fechaHasta);
                    hasta.setHours(23, 59, 59, 999); // Include the entire end date
                    passes = passes && recordDate <= hasta;
                }
                
                return passes;
            });
        }

        console.log(`Filtered from ${dashboardData.length} to ${filtered.length} records`);

        currentPage = 1; // Reset to first page when filters are applied
        updateStatistics(filtered);
        updateTopSummaries(filtered);
        renderTable(filtered);
    }

    function clearFilters() {
        document.getElementById('filterEstado').value = '';
        document.getElementById('filterSituacion').value = '';
        document.getElementById('filterCargo').value = '';
        document.getElementById('filterSubArea').value = '';
        document.getElementById('filterTema').value = '';
        document.getElementById('filterRol').value = '';
        document.getElementById('filterFechaDesde').value = '';
        document.getElementById('filterFechaHasta').value = '';
        
        currentPage = 1; // Reset to first page when filters are cleared
        updateStatistics(dashboardData);
        updateTopSummaries(dashboardData);
        renderTable(dashboardData);
    }

    function exportDetailedExcel() {
        console.log('Exporting detailed Excel...');
        
        if (typeof XLSX === 'undefined') {
            console.error('XLSX library not loaded');
            alert('Error: Biblioteca de Excel no cargada. Por favor, recargue la página.');
            return;
        }

        if (dashboardData.length === 0) {
            alert('No hay datos para exportar');
            return;
        }

        try {
            // Export all dashboard data (including filtered results if filters are applied)
            const dataToExport = dashboardData;

            const exportData = dataToExport.map(record => ({
                'Estado': getEstadoText(record.estado),
                'Situación': record.situacion || '-',
                'Colaborador': record.nombre_completo,
                'Cédula': record.ac_cedula,
                'Cargo': record.cargo_nombre,
                'Sub Área': record.sub_area_nombre || '-',
                'Tema': record.tema_nombre,
                'Frecuencia (meses)': record.frecuencia_meses,
                'Última Capacitación': record.ultima_capacitacion 
                    ? parseLocalDate(record.ultima_capacitacion).toLocaleDateString('es-CO') 
                    : '-',
                'Próxima Capacitación': record.proxima_capacitacion 
                    ? parseLocalDate(record.proxima_capacitacion).toLocaleDateString('es-CO') 
                    : '-',
                'Días Restantes': record.dias_restantes !== null ? record.dias_restantes : '-',
                'Rol Capacitador': record.rol_capacitador_nombre
            }));

            console.log(`Exporting ${exportData.length} records`);

            const ws = XLSX.utils.json_to_sheet(exportData);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'Dashboard Detallado');

            const filename = `Dashboard_Capacitaciones_Detallado_${new Date().toISOString().split('T')[0]}.xlsx`;
            XLSX.writeFile(wb, filename);
            
            console.log('Excel file generated successfully');
            showAlert('Archivo Excel generado exitosamente', 'success');
        } catch (error) {
            console.error('Error exporting Excel:', error);
            alert('Error al generar archivo Excel: ' + error.message);
        }
    }

    function exportSummaryExcel() {
        console.log('Exporting summary Excel...');
        
        if (typeof XLSX === 'undefined') {
            console.error('XLSX library not loaded');
            alert('Error: Biblioteca de Excel no cargada. Por favor, recargue la página.');
            return;
        }

        if (dashboardData.length === 0) {
            alert('No hay datos para exportar');
            return;
        }

        try {
            // Create summary by employee
            const employeeSummary = {};
            
            dashboardData.forEach(record => {
                const key = record.ac_id;
                if (!employeeSummary[key]) {
                    employeeSummary[key] = {
                        nombre: record.nombre_completo,
                        cedula: record.ac_cedula,
                        cargo: record.cargo_nombre,
                        sub_area: record.sub_area_nombre || '-',
                        situacion: record.situacion || '-',
                        al_dia: 0,
                        pendiente: 0,
                        proximo_vencer: 0,
                        vencida: 0
                    };
                }
                
                employeeSummary[key][record.estado] = (employeeSummary[key][record.estado] || 0) + 1;
            });

            const summaryData = Object.values(employeeSummary).map(emp => ({
                'Colaborador': emp.nombre,
                'Cédula': emp.cedula,
                'Cargo': emp.cargo,
                'Sub Área': emp.sub_area,
                'Situación': emp.situacion,
                'Al Día': emp.al_dia || 0,
                'Próximas a Vencer': emp.proximo_vencer || 0,
                'Pendientes': emp.pendiente || 0,
                'Vencidas': emp.vencida || 0,
                'Total Capacitaciones': (emp.al_dia || 0) + (emp.pendiente || 0) + (emp.proximo_vencer || 0) + (emp.vencida || 0)
            }));

            console.log(`Exporting summary for ${summaryData.length} employees`);

            const ws = XLSX.utils.json_to_sheet(summaryData);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'Resumen por Colaborador');

            const filename = `Dashboard_Capacitaciones_Resumen_${new Date().toISOString().split('T')[0]}.xlsx`;
            XLSX.writeFile(wb, filename);
            
            console.log('Summary Excel file generated successfully');
            showAlert('Archivo Excel de resumen generado exitosamente', 'success');
        } catch (error) {
            console.error('Error exporting summary Excel:', error);
            alert('Error al generar archivo Excel de resumen: ' + error.message);
        }
    }

    function getEstadoText(estado) {
        switch(estado) {
            case 'al_dia': return 'Al Día';
            case 'proximo_vencer': return 'Próximo a Vencer';
            case 'vencida': return 'Vencida';
            default: return 'Pendiente';
        }
    }

    function setupEventListeners() {
        document.getElementById('btnExportDetailedExcel').addEventListener('click', exportDetailedExcel);
        document.getElementById('btnExportSummaryExcel').addEventListener('click', exportSummaryExcel);
        document.getElementById('btnApplyFilters').addEventListener('click', applyFilters);
        document.getElementById('btnClearFilters').addEventListener('click', clearFilters);
        document.getElementById('recordsPerPage').addEventListener('change', function(e) {
            changeRecordsPerPage(e.target.value);
        });
        
        // Event delegation for pagination links
        document.getElementById('tablePagination').addEventListener('click', function(e) {
            e.preventDefault();
            const link = e.target.closest('.page-link');
            if (link && link.hasAttribute('data-page')) {
                const page = parseInt(link.getAttribute('data-page'));
                changePage(page);
            }
        });
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
        
        setTimeout(() => alert.remove(), 5000);
    }
})();
