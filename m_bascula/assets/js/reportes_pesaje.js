/**
 * JavaScript for weighing reports
 */

let reportData = [];

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    setupEventListeners();
    setDefaultDates();
});

/**
 * Setup event listeners
 */
function setupEventListeners() {
    document.getElementById('formFilters').addEventListener('submit', searchReport);
    document.getElementById('btnExportExcel').addEventListener('click', exportToExcel);
}

/**
 * Set default dates (last 7 days)
 */
function setDefaultDates() {
    const today = new Date();
    const lastWeek = new Date(today);
    lastWeek.setDate(today.getDate() - 7);
    
    document.getElementById('fechaFin').value = formatDate(today);
    document.getElementById('fechaInicio').value = formatDate(lastWeek);
}

/**
 * Format date to YYYY-MM-DD
 */
function formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

/**
 * Search report
 */
async function searchReport(e) {
    e.preventDefault();
    
    const fechaInicio = document.getElementById('fechaInicio').value;
    const fechaFin = document.getElementById('fechaFin').value;
    
    if (!fechaInicio || !fechaFin) {
        showAlert('Por favor seleccione ambas fechas', 'warning');
        return;
    }
    
    try {
        const tbody = document.getElementById('bodyReporte');
        tbody.innerHTML = '<tr><td colspan="15" class="text-center"><i class="fas fa-spinner fa-spin"></i> Cargando...</td></tr>';
        
        const response = await fetch(`assets/php/pesadas_api.php?action=detallado&fecha_inicio=${fechaInicio}&fecha_fin=${fechaFin}`);
        const data = await response.json();
        
        if (data.success) {
            reportData = data.data;
            displayReport(reportData);
            calculateStatistics(reportData);
        } else {
            tbody.innerHTML = '<tr><td colspan="15" class="text-center text-danger">Error al cargar datos</td></tr>';
            showAlert('Error: ' + data.error, 'danger');
        }
    } catch (error) {
        console.error('Error loading report:', error);
        showAlert('Error al cargar el reporte', 'danger');
    }
}

/**
 * Display report data
 */
function displayReport(data) {
    const tbody = document.getElementById('bodyReporte');
    tbody.innerHTML = '';
    
    if (data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="15" class="text-center">No se encontraron resultados para el rango seleccionado</td></tr>';
        return;
    }
    
    data.forEach(row => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${row.Codigo}</td>
            <td>${formatDateTime(row.Fecha_entrada)}</td>
            <td>${formatDateTime(row.Fecha_salida)}</td>
            <td>${row.Placa}</td>
            <td>${row.Conductor}</td>
            <td>${row.Procedencia}</td>
            <td>${row.SAP_Producto}</td>
            <td>${row.Producto}</td>
            <td class="text-end">${formatNumber(row.Peso_bruto)}</td>
            <td class="text-end">${formatNumber(row.Peso_tara)}</td>
            <td class="text-end">${formatNumber(row.Peso_neto)}</td>
            <td>${row.Usuario}</td>
            <td>${row.D_origen}</td>
            <td>${row.Num_documento}</td>
            <td><span class="badge ${getStatusBadgeClass(row.Estado)}">${row.Estado}</span></td>
        `;
        tbody.appendChild(tr);
    });
}

/**
 * Format date time
 */
function formatDateTime(dateStr) {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleString('es-CO', { 
        year: 'numeric', 
        month: '2-digit', 
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    });
}

/**
 * Format number with thousands separator
 */
function formatNumber(num) {
    return new Intl.NumberFormat('es-CO').format(num);
}

/**
 * Get status badge class
 */
function getStatusBadgeClass(estado) {
    switch (estado) {
        case 'Completado':
        case 'Finalizado':
            return 'bg-success';
        case 'Activo':
        case 'En Proceso':
            return 'bg-warning';
        case 'Cancelado':
            return 'bg-danger';
        default:
            return 'bg-secondary';
    }
}

/**
 * Calculate statistics
 */
function calculateStatistics(data) {
    const total = data.length;
    const pesoTotal = data.reduce((sum, row) => sum + (parseFloat(row.Peso_neto) || 0), 0);
    const pesoPromedio = total > 0 ? pesoTotal / total : 0;
    const vehiculosUnicos = new Set(data.map(row => row.Placa)).size;
    
    document.getElementById('statTotal').textContent = formatNumber(total);
    document.getElementById('statPesoTotal').textContent = formatNumber(Math.round(pesoTotal));
    document.getElementById('statPesoPromedio').textContent = formatNumber(Math.round(pesoPromedio));
    document.getElementById('statVehiculos').textContent = formatNumber(vehiculosUnicos);
}

/**
 * Export to Excel
 */
function exportToExcel() {
    if (reportData.length === 0) {
        showAlert('No hay datos para exportar', 'warning');
        return;
    }
    
    // Create CSV content
    const headers = [
        'Código', 'F. Entrada', 'F. Salida', 'Placa', 'Conductor', 'Procedencia',
        'Producto SAP', 'Producto', 'Peso Bruto (kg)', 'Peso Tara (kg)', 'Peso Neto (kg)',
        'Usuario', 'Doc. Origen', 'Núm. Doc.', 'Estado'
    ];
    
    let csv = headers.join(',') + '\n';
    
    reportData.forEach(row => {
        const line = [
            row.Codigo,
            row.Fecha_entrada,
            row.Fecha_salida,
            `"${row.Placa}"`,
            `"${row.Conductor}"`,
            `"${row.Procedencia}"`,
            row.SAP_Producto,
            `"${row.Producto}"`,
            row.Peso_bruto,
            row.Peso_tara,
            row.Peso_neto,
            `"${row.Usuario}"`,
            row.D_origen,
            `"${row.Num_documento}"`,
            `"${row.Estado}"`
        ].join(',');
        csv += line + '\n';
    });
    
    // Create download
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    const fechaInicio = document.getElementById('fechaInicio').value;
    const fechaFin = document.getElementById('fechaFin').value;
    const filename = `reporte_pesaje_${fechaInicio}_${fechaFin}.csv`;
    
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showAlert('Reporte exportado exitosamente', 'success');
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
