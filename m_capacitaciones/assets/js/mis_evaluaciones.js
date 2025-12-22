// mis_evaluaciones.js

document.addEventListener('DOMContentLoaded', function () {
    const user = window.getCurrentUser();
    // Verificar usuario_id en lugar de id
    if (user && (user.usuario_id || user.id)) {
        loadPendingEvaluations();
    } else {
        // Esperar a que auth_guard termine
        document.addEventListener('auth_checked', function (e) {
            loadPendingEvaluations();
        });
    }
    // Evento para exportar
    const btnExport = document.getElementById('btn-export-history');
    if (btnExport) {
        btnExport.addEventListener('click', exportMyHistory);
    }
});

function loadPendingEvaluations() {
    // Obtener ID del colaborador de la sesión
    const userData = window.getCurrentUser();

    // Normalizar ID (puede venir como id o usuario_id)
    const userId = userData.usuario_id || userData.id;

    if (!userData || !userId) {
        console.error('No se pudo identificar al usuario');
        return;
    }

    const cedula = userData.cedula || userData.usuario;
    const url = `assets/php/evaluacion_api.php?action=get_pending_evaluations&id_colaborador=${userId}&cedula=${cedula}`;

    fetch(url)
        .then(res => {
            if (!res.ok) throw new Error(`HTTP Error ${res.status}`);
            return res.json();
        })
        .then(data => {
            const tbody = document.getElementById('tbody-mis-evaluaciones');
            const noData = document.getElementById('no-data-message');

            if (!tbody) return;
            tbody.innerHTML = '';

            if (data.success && Array.isArray(data.data) && data.data.length > 0) {
                if (noData) noData.style.display = 'none';

                data.data.forEach(item => {
                    try {
                        const tr = document.createElement('tr');
                        tr.innerHTML = `
                            <td>${item.tema || 'Sin tema'}</td>
                            <td>${formatDate(item.fecha_capacitacion)}</td>
                            <td>${item.titulo || 'Evaluación'}</td>
                            <td>${formatDate(item.fecha_fin_activa, true)}</td>
                            <td>
                                <a href="realizar_evaluacion.html?id_formulario=${item.id_formulario}&id_header=${item.id_header}" class="btn btn-primary btn-sm">
                                    <i class="fas fa-pen-alt"></i> Realizar
                                </a>
                            </td>
                        `;
                        tbody.appendChild(tr);
                    } catch (e) {
                        console.error('Error renderizando fila:', e);
                    }
                });
            } else {
                if (noData) noData.style.display = 'block';
            }
        })
        .catch(err => {
            console.error('Error cargando evaluaciones pendientes:', err);
        })
        .finally(() => {
            // Cargar historial después de pendientes
            loadCompletedEvaluations(userId, cedula);
        });
}

function loadCompletedEvaluations(userId, cedula) {
    const url = `assets/php/evaluacion_api.php?action=get_completed_evaluations&id_colaborador=${userId}&cedula=${cedula}`;

    fetch(url)
        .then(res => res.json())
        .then(resp => {
            const tbody = document.getElementById('tbody-historial');
            const noData = document.getElementById('no-history-message');

            if (!tbody) return;
            tbody.innerHTML = '';

            if (resp.success && Array.isArray(resp.data) && resp.data.length > 0) {
                if (noData) noData.style.display = 'none';

                resp.data.forEach(item => {
                    const badgeClass = (item.estado === 'aprobado' || parseFloat(item.calificacion) >= 70) ? 'bg-success' : 'bg-danger';
                    const estadoText = (item.estado === 'aprobado' || parseFloat(item.calificacion) >= 70) ? 'Aprobado' : 'Reprobado';

                    const tr = document.createElement('tr');
                    tr.innerHTML = `
                        <td>${item.tema || '-'}</td>
                        <td>${formatDate(item.fecha_capacitacion)}</td>
                        <td>${item.titulo || 'Evaluación'}</td>
                        <td>${new Date(item.fecha_realizacion).toLocaleString()}</td>
                        <td class="fw-bold">${parseFloat(item.calificacion).toFixed(1)} / 100</td>
                        <td><span class="badge ${badgeClass}">${estadoText}</span></td>
                    `;
                    tbody.appendChild(tr);
                });
            } else {
                if (noData) noData.style.display = 'block';
            }
        })
        .catch(err => console.error('Error cargando historial:', err));
}

function exportMyHistory() {
    const userData = window.getCurrentUser();
    const userId = userData.usuario_id || userData.id;
    const cedula = userData.cedula || userData.usuario;
    const nombreUsuario = userData.nombre || 'Usuario';

    const btn = document.getElementById('btn-export-history');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generando PDF...';
    btn.disabled = true;

    fetch(`assets/php/evaluacion_api.php?action=export_my_history&id_colaborador=${userId}&cedula=${cedula}`)
        .then(res => res.json())
        .then(resp => {
            if (resp.success && resp.data.length > 0) {
                printHistoryPDF(resp.data, nombreUsuario, cedula);
            } else {
                alert('No hay datos para exportar.');
            }
        })
        .catch(err => {
            console.error(err);
            alert('Error al exportar historial.');
        })
        .finally(() => {
            btn.innerHTML = originalText;
            btn.disabled = false;
        });
}

function printHistoryPDF(data, nombre, cedula) {
    let rowsHtml = '';
    data.forEach(item => {
        let firmaImg = '-';
        if (item.firma_digital && item.firma_digital.length > 100) {
            firmaImg = `<img src="${item.firma_digital}" class="signature-img" alt="Firma">`;
        }

        const scoreStyle = parseFloat(item.puntaje_obtenido) >= 70 ? 'color:green; font-weight:bold;' : 'color:red; font-weight:bold;';

        rowsHtml += `
            <tr>
                <td>${item.id_formulario}</td>
                <td>${formatDate(item.fecha_capacitacion)}</td>
                <td>${item.tema || '-'}</td>
                <td>${item.proceso || '-'}</td>
                <td>${item.titulo_evaluacion}</td>
                <td style="text-align:center;">${item.cantidad_preguntas}</td>
                <td style="text-align:center; ${scoreStyle}">${parseFloat(item.puntaje_obtenido).toFixed(1)}</td>
                <td style="text-align:center;">${firmaImg}</td>
                <td>${item.asignado_por || '-'}</td>
                <td>${item.capacitador || '-'}</td>
            </tr>
        `;
    });

    const docContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Historial de Evaluaciones - ${nombre}</title>
            <style>
                body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 20px; color: #333; font-size: 11px; }
                .header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #333; padding-bottom: 10px; }
                .header h2 { margin: 0; text-transform: uppercase; color: #004085; }
                .header p { margin: 5px 0; }
                
                table { width: 100%; border-collapse: collapse; margin-top: 10px; }
                th, td { border: 1px solid #999; padding: 6px; text-align: left; vertical-align: middle; }
                th { background-color: #f0f0f0; font-weight: bold; text-align: center; }
                
                .signature-img { max-height: 40px; max-width: 100px; }
                .text-muted { color: #999; font-style: italic; }

                @media print {
                    @page { margin: 1cm; size: landscape; }
                    .no-print { display: none; }
                    body { -webkit-print-color-adjust: exact; }
                }

                .footer { text-align: center; margin-top: 20px; font-size: 10px; color: #666; }
            </style>
        </head>
        <body>
            <div class="header">
                <h2>Historial de Capacitaciones y Evaluaciones</h2>
                <p><strong>Colaborador:</strong> ${nombre} | <strong>Cédula:</strong> ${cedula}</p>
                <p><strong>Fecha Reporte:</strong> ${new Date().toLocaleString()}</p>
            </div>

            <table>
                <thead>
                    <tr>
                        <th style="width: 5%">ID</th>
                        <th style="width: 8%">Fecha</th>
                        <th style="width: 12%">Tema</th>
                        <th style="width: 10%">Proceso</th>
                        <th style="width: 15%">Evaluación</th>
                        <th style="width: 5%">Preg.</th>
                        <th style="width: 5%">Nota</th>
                        <th style="width: 15%">Firma Realizada</th>
                        <th style="width: 12%">Asignado Por</th>
                        <th style="width: 12%">Capacitador</th>
                    </tr>
                </thead>
                <tbody>
                    ${rowsHtml}
                </tbody>
            </table>

            <div class="footer">
                Generado automáticamente por el Sistema OSM.
            </div>

            <script>
                window.onload = function() { window.print(); }
            </script>
        </body>
        </html>
    `;

    const win = window.open('', '_blank');
    win.document.write(docContent);
    win.document.close();
}

function formatDate(dateString, isEndDate = false) {
    if (!dateString) return isEndDate ? 'Indefinido' : '-';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '-';
    return date.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
}
