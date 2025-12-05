// programacion_evaluaciones.js
document.addEventListener('DOMContentLoaded', async function () {
    // Cargar componentes visuales
    await includeComponent('../includes/sidebar.html', '#sidebar');
    await includeComponent('../includes/navbar.html', '#navbar');

    // Inicializar scripts de componentes si es necesario
    if (window.initSidebar) window.initSidebar();

    // Event Listeners para filtros
    const rowsPerPage = document.getElementById('rows-per-page');
    if (rowsPerPage) {
        rowsPerPage.addEventListener('change', () => {
            currentPage = 1;
            loadEvaluaciones();
        });
    }

    const searchInput = document.getElementById('search-input');
    let searchTimeout;
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                currentPage = 1;
                loadEvaluaciones();
            }, 500);
        });
    }

    // Nuevos Filtros
    const filterEstado = document.getElementById('filter-estado');
    if (filterEstado) {
        filterEstado.addEventListener('change', () => {
            currentPage = 1;
            loadEvaluaciones();
        });
    }

    const filterDesde = document.getElementById('filter-desde');
    if (filterDesde) {
        filterDesde.addEventListener('change', () => {
            currentPage = 1;
            loadEvaluaciones();
        });
    }

    const filterHasta = document.getElementById('filter-hasta');
    if (filterHasta) {
        filterHasta.addEventListener('change', () => {
            currentPage = 1;
            loadEvaluaciones();
        });
    }

    const btnClear = document.getElementById('btn-clear-filters');
    if (btnClear) {
        btnClear.addEventListener('click', () => {
            document.getElementById('search-input').value = '';
            document.getElementById('filter-estado').value = '';
            document.getElementById('filter-desde').value = '';
            document.getElementById('filter-hasta').value = '';
            currentPage = 1;
            loadEvaluaciones();
        });
    }

    // Cargar datos iniciales
    loadEvaluaciones();

    // Guardar Programación
    const btnSave = document.getElementById('btn-save-prog');
    if (btnSave) btnSave.addEventListener('click', saveProgramacion);

    // Exportar Excel
    const btnExport = document.getElementById('btn-export-excel');
    if (btnExport) btnExport.addEventListener('click', exportToExcel);
});

let currentPage = 1;

async function includeComponent(file, selector) {
    try {
        const res = await fetch(file);
        if (res.ok) {
            document.querySelector(selector).innerHTML = await res.text();
        }
    } catch (e) {
        console.error('Error loading component:', e);
    }
}

function loadEvaluaciones() {
    const limit = document.getElementById('rows-per-page').value;
    const search = document.getElementById('search-input').value;
    const estado = document.getElementById('filter-estado').value;
    const desde = document.getElementById('filter-desde').value;
    const hasta = document.getElementById('filter-hasta').value;

    const offset = (currentPage - 1) * limit;

    const url = `assets/php/evaluacion_api.php?action=get_sessions_status&limit=${limit}&offset=${offset}&search=${encodeURIComponent(search)}&estado=${encodeURIComponent(estado)}&fecha_desde=${encodeURIComponent(desde)}&fecha_hasta=${encodeURIComponent(hasta)}`;

    fetch(url)
        .then(res => res.json())
        .then(resp => {
            const tbody = document.querySelector('#tabla-evaluaciones tbody');
            if (tbody) tbody.innerHTML = '';

            if (resp.success && resp.data.length > 0) {
                resp.data.forEach(item => {
                    const tr = document.createElement('tr');

                    // Estado
                    let estadoBadge = '<span class="badge bg-secondary">Sin Evaluación</span>';
                    let btnClass = 'btn-secondary disabled';

                    if (item.id_header) {
                        if (item.estado_publicacion == 1) {
                            estadoBadge = '<span class="badge bg-success">Activa</span>';
                        } else if (item.estado_publicacion == 2) {
                            estadoBadge = '<span class="badge bg-dark">Cerrada</span>';
                        } else {
                            estadoBadge = '<span class="badge bg-warning text-dark">Borrador</span>';
                        }
                        btnClass = 'btn-primary';
                    }

                    // Progreso
                    let progreso = 'N/A';
                    if (item.total_asistentes > 0) {
                        const pct = Math.round((item.total_respuestas / item.total_asistentes) * 100);
                        progreso = `
                        <div class="d-flex align-items-center">
                            <div class="progress flex-grow-1 me-2" style="height: 10px;">
                                <div class="progress-bar" style="width: ${pct}%"></div>
                            </div>
                            <small>${item.total_respuestas}/${item.total_asistentes}</small>
                        </div>
                    `;
                    }

                    // Botones y Visibilidad
                    const isCreated = !!item.id_header;
                    const isActiveOrClosed = item.estado_publicacion == 1 || item.estado_publicacion == 2;

                    // Roles para Delete (Admin y Capacitador)
                    const currentUser = window.getCurrentUser ? window.getCurrentUser() : {};
                    const userRole = currentUser.rol || '';
                    const canDelete = ['Administrador', 'Capacitador'].includes(userRole);

                    let buttons = '';

                    // 1. Progreso (Solo si Activa/Cerrada)
                    if (isActiveOrClosed) {
                        buttons += `
                            <button class="btn btn-info" onclick="openDetalle(${item.id_header})" title="Progreso">
                                <i class="fas fa-users"></i>
                            </button>
                        `;
                    }

                    // 2. Calendario (Solo si ya está creada la evaluación)
                    if (isCreated) {
                        buttons += `
                            <button class="btn ${btnClass}" onclick="openProgramacion(${item.id_header}, ${item.estado_publicacion}, '${item.fecha_inicio_activa}', '${item.fecha_fin_activa}', ${item.total_respuestas})" title="Programar">
                                <i class="fas fa-calendar-alt"></i>
                            </button>
                        `;
                    }

                    // 3. Editar (Solo si NO está activa ni cerrada)
                    if (!isActiveOrClosed) {
                        buttons += `
                            <button class="btn btn-warning" onclick="editEvaluacion(${item.id_formulario}, ${item.id_header})" title="Editar Contenido">
                                <i class="fas fa-edit"></i>
                            </button>
                        `;
                    }

                    // 4. Eliminar (Solo Admin/Capacitador)
                    if (canDelete && isCreated) {
                        buttons += `
                            <button class="btn btn-danger" onclick="deleteEvaluacion(${item.id_header})" title="Eliminar Evaluación">
                                <i class="fas fa-trash-alt"></i>
                            </button>
                        `;
                    }

                    tr.innerHTML = `
                    <td><strong>${item.id_formulario}</strong></td>
                    <td>${new Date(item.fecha_capacitacion).toLocaleDateString()}</td>
                    <td>
                        <strong>${item.tema || 'Sin Tema'}</strong><br>
                        <small class="text-muted">${item.proceso || ''}</small>
                    </td>
                    <td>
                        ${item.titulo_eval || 'No configurada'}
                        <div class="mt-1 small text-muted" style="font-size: 0.75rem;">
                            ${item.creado_por ? '<i class="fas fa-user-plus"></i> C : ' + item.creado_por : ''}
                            ${item.editado_por ? '<br><i class="fas fa-user-edit"></i> E : ' + item.editado_por : ''}
                        </div>
                    </td>
                    <td>${estadoBadge}</td>
                    <td>${progreso}</td>
                    <td>
                        <div class="btn-group btn-group-sm">
                            ${buttons}
                        </div>
                    </td>
                    `;
                    tbody.appendChild(tr);
                });

                // Actualizar info de paginación
                const start = offset + 1;
                const end = Math.min(offset + parseInt(limit), resp.total);
                document.getElementById('pagination-info').innerText = `Mostrando ${start} a ${end} de ${resp.total} registros`;

                renderPagination(resp.page, resp.pages);

            } else {
                const msg = resp.error ? resp.error : 'No se encontraron registros';
                tbody.innerHTML = `< tr > <td colspan="7" class="text-center">${msg}</td></tr > `;
                document.getElementById('pagination-info').innerText = 'Mostrando 0 a 0 de 0 registros';
                document.getElementById('pagination-controls').innerHTML = '';
            }
        })
        .catch(err => {
            console.error(err);
            const tbody = document.querySelector('#tabla-evaluaciones tbody');
            if (tbody) tbody.innerHTML = `< tr > <td colspan="7" class="text-center text-danger">Error de red o JS: ${err.message}</td></tr > `;
        });
}

function renderPagination(current, total) {
    const nav = document.getElementById('pagination-controls');
    nav.innerHTML = '';

    if (total <= 1) return;

    // Prev
    const prevLi = document.createElement('li');
    prevLi.className = `page-item ${current === 1 ? 'disabled' : ''}`;
    prevLi.innerHTML = `<a class="page-link" href="#" onclick="changePage(${current - 1})">Anterior</a>`;
    nav.appendChild(prevLi);

    // Pages
    for (let i = 1; i <= total; i++) {
        if (i === 1 || i === total || (i >= current - 2 && i <= current + 2)) {
            const li = document.createElement('li');
            li.className = `page-item ${current === i ? 'active' : ''}`;
            li.innerHTML = `<a class="page-link" href="#" onclick="changePage(${i})">${i}</a>`;
            nav.appendChild(li);
        } else if (i === current - 3 || i === current + 3) {
            const li = document.createElement('li');
            li.className = 'page-item disabled';
            li.innerHTML = '<span class="page-link">...</span>';
            nav.appendChild(li);
        }
    }

    // Next
    const nextLi = document.createElement('li');
    nextLi.className = `page-item ${current === total ? 'disabled' : ''}`;
    nextLi.innerHTML = `<a class="page-link" href="#" onclick="changePage(${current + 1})">Siguiente</a>`;
    nav.appendChild(nextLi);
}

function changePage(page) {
    if (page < 1) return;
    currentPage = page;
    loadEvaluaciones();
}

function openProgramacion(idHeader, estado, inicio, fin, respuestas) {
    if (!idHeader) return alert('Primero debes crear la evaluación desde el formulario.');

    document.getElementById('prog-id-header').value = idHeader;
    document.getElementById('prog-estado').value = estado || 0;

    // Formatear fechas para input datetime-local (YYYY-MM-DDTHH:MM)
    const format = (str) => str && str !== 'null' ? str.replace(' ', 'T').substring(0, 16) : '';
    document.getElementById('prog-inicio').value = format(inicio);
    document.getElementById('prog-fin').value = format(fin);

    // Bloqueo si hay respuestas
    const alertBloqueo = document.getElementById('alert-bloqueo');
    const selectEstado = document.getElementById('prog-estado');
    const optionBorrador = selectEstado.querySelector('option[value="0"]');

    if (respuestas > 0) {
        alertBloqueo.style.display = 'block';
        if (optionBorrador) optionBorrador.disabled = true;
    } else {
        alertBloqueo.style.display = 'none';
        if (optionBorrador) optionBorrador.disabled = false;
    }

    new bootstrap.Modal(document.getElementById('modal-programacion')).show();
}

function saveProgramacion() {
    const id = document.getElementById('prog-id-header').value;
    const estado = parseInt(document.getElementById('prog-estado').value);
    const inicio = document.getElementById('prog-inicio').value;
    const fin = document.getElementById('prog-fin').value;

    // Validación Frontend
    if (estado === 1) { // Activa
        if (!inicio) {
            return alert('Para activar la evaluación, debes establecer al menos la Fecha de Inicio.');
        }
        if (fin && new Date(fin) <= new Date(inicio)) {
            return alert('La Fecha Fin debe ser posterior a la Fecha Inicio.');
        }

        // Confirmación de Inmutabilidad
        if (!confirm('ATENCIÓN: Al activar la evaluación, esta quedará disponible para los usuarios.\n\nUna vez que tenga respuestas, NO podrá ser modificada ni eliminada (solo podrás cerrar la fecha).\n\n¿Deseas continuar?')) {
            return;
        }
    }

    fetch('assets/php/evaluacion_api.php?action=activate_evaluation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            id_header: id,
            estado: estado,
            fecha_inicio: inicio,
            fecha_fin: fin
        })
    })
        .then(res => res.json())
        .then(resp => {
            if (resp.success) {
                alert('Programación guardada correctamente.');
                location.reload();
            } else {
                alert('Error: ' + resp.error);
            }
        })
        .catch(err => alert('Error de red: ' + err.message));
}

function deleteEvaluacion(idHeader) {
    if (!confirm('PELIGRO: ¿Estás seguro de eliminar esta evaluación?\n\nSe borrarán:\n- El contenido (preguntas, multimedia)\n- TODAS las respuestas y calificaciones de los usuarios\n\nEsta acción NO se puede deshacer.\n\n¿Confirmas la eliminación?')) {
        return;
    }

    fetch('assets/php/evaluacion_api.php?action=delete_evaluation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id_header: idHeader })
    })
        .then(res => res.json())
        .then(resp => {
            if (resp.success) {
                alert('Evaluación eliminada correctamente.');
                loadEvaluaciones();
            } else {
                alert('Error al eliminar: ' + resp.error);
            }
        })
        .catch(err => alert('Error de red: ' + err.message));
}

function openDetalle(idHeader) {
    fetch(`assets/php/evaluacion_api.php?action=get_assistants_progress&id_header=${idHeader}`)
        .then(res => res.json())
        .then(resp => {
            const tbody = document.getElementById('tbody-detalle');
            tbody.innerHTML = '';

            if (resp.success) {
                resp.data.forEach(a => {
                    let badge = a.estado === 'Completado'
                        ? '<span class="badge bg-success">Completado</span>'
                        : '<span class="badge bg-warning text-dark">Pendiente</span>';

                    // Lógica de Firma (Ojo)
                    let firmaBtn = '-';
                    if (a.firma_digital) {
                        firmaBtn = `
                        <button class="btn btn-sm btn-outline-primary" onclick="toggleSignature(this, '${a.firma_digital}')" title="Ver Firma">
                            <i class="fas fa-eye"></i>
                        </button>
                        `;
                    } else if (a.calificacion) {
                        // Si tiene calificación pero no firma (caso raro o legacy)
                        firmaBtn = parseFloat(a.calificacion).toFixed(1);
                    }

                    tbody.innerHTML += `
                        <tr>
                        <td>${a.nombre}<br><small class="text-muted">${a.cedula}</small></td>
                        <td>${a.cargo || ''}</td>
                        <td>${badge}</td>
                        <td>${a.fecha_fin ? a.fecha_fin.split('.')[0] : '-'}</td>
                        <td class="text-center">${firmaBtn}</td>
                    </tr>
                        `;
                });
                new bootstrap.Modal(document.getElementById('modal-detalle')).show();
            } else {
                alert('Error al cargar detalles: ' + (resp.error || 'Desconocido'));
            }
        });
}

function toggleSignature(btn, url) {
    // Verificar si ya existe el contenedor de firma
    const nextEl = btn.nextElementSibling;
    if (nextEl && nextEl.classList.contains('signature-preview')) {
        // Si existe, lo removemos (toggle off)
        nextEl.remove();
        btn.classList.remove('active');
    } else {
        // Si no existe, lo creamos (toggle on)
        const div = document.createElement('div');
        div.className = 'signature-preview mt-2 p-1 border rounded bg-light position-absolute shadow';
        div.style.zIndex = 1000;
        div.style.width = '200px';
        div.innerHTML = `<img src="${url}" class="img-fluid" alt="Firma">`;

        // Insertar después del botón
        btn.parentNode.insertBefore(div, btn.nextSibling);
        btn.classList.add('active');

        // Cerrar al hacer click fuera (opcional, pero buena UX)
        setTimeout(() => {
            const closeHandler = (e) => {
                if (!div.contains(e.target) && e.target !== btn && !btn.contains(e.target)) {
                    div.remove();
                    btn.classList.remove('active');
                    document.removeEventListener('click', closeHandler);
                }
            };
            document.addEventListener('click', closeHandler);
        }, 0);
    }
}

function editEvaluacion(idFormulario, idHeader) {
    if (idFormulario) {
        window.open(`crear_evaluacion.html?id_formulario=${idFormulario}`, 'EditarEvaluacion', 'width=1000,height=800,scrollbars=yes');
    }
}

function exportToExcel() {
    const btn = document.getElementById('btn-export-excel');
    const originalText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Exportando...';

    fetch('assets/php/evaluacion_api.php?action=get_detailed_report')
        .then(res => res.json())
        .then(resp => {
            if (resp.success && resp.data) {
                if (typeof XLSX === 'undefined') {
                    throw new Error('La librería XLSX no está cargada. Verifique la ruta ../assets/js/xlsx.full.min.js');
                }

                // Sanitize and Format data for Excel
                const exportData = resp.data.map(item => ({
                    'ID Sesión': item.id_sesion,
                    'Fecha': item.fecha,
                    'Tema': item.tema,
                    'Proceso': item.proceso,
                    'Evaluación': item.evaluacion,
                    'Preguntas': item.preguntas_texto || '',
                    'Respuestas Acertadas': item.aciertos_texto || '',
                    'Asistente': item.asistente,
                    'Cédula': item.cedula,
                    'Cargo': item.cargo,
                    'Estado': item.estado_evaluacion,
                    'Nota': item.nota || '-',
                    'Firma': item.firma_digital ? 'FIRMADO' : 'PENDIENTE',
                    'Capacitador': item.capacitador,
                    'Creado Por': item.creado_por || 'Sin registrar',
                    'Editado Por': item.editado_por || ''
                }));

                // Crear hoja de trabajo
                const ws = XLSX.utils.json_to_sheet(exportData);

                // Crear libro
                const wb = XLSX.utils.book_new();
                XLSX.utils.book_append_sheet(wb, ws, "Reporte Detallado");

                // Guardar archivo
                XLSX.writeFile(wb, `Reporte_Evaluaciones_${new Date().toISOString().slice(0, 10)}.xlsx`);
            } else {
                alert('Error al exportar: ' + (resp.error || 'Sin datos'));
            }
        })
        .catch(err => {
            console.error(err);
            alert('Error al exportar: ' + err.message);
        })
        .finally(() => {
            btn.disabled = false;
            btn.innerHTML = originalText;
        });
}

function resetForm() {
    const form = document.getElementById('form-programacion');
    if (form) form.reset();
    const idHeader = document.getElementById('prog-id-header');
    if (idHeader) idHeader.value = '';
    const alertBloqueo = document.getElementById('alert-bloqueo');
    if (alertBloqueo) alertBloqueo.style.display = 'none';
}
