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

                    // 5. PDF Reporte (Solo si Cerrada)
                    if (item.estado_publicacion == 2) {
                        buttons += `
                            <button class="btn btn-outline-danger" onclick="downloadPDF(${item.id_header})" title="Descargar Reporte PDF">
                                <i class="fas fa-file-pdf"></i>
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

const signatureMap = new Map();

function openDetalle(idHeader) {
    fetch(`assets/php/evaluacion_api.php?action=get_assistants_progress&id_header=${idHeader}`)
        .then(res => res.json())
        .then(resp => {
            const tbody = document.getElementById('tbody-detalle');
            tbody.innerHTML = '';
            signatureMap.clear(); // Limpiar mapa anterior

            if (resp.success) {
                resp.data.forEach((a, index) => {
                    let badge = a.estado === 'Completado'
                        ? '<span class="badge bg-success">Completado</span>'
                        : '<span class="badge bg-warning text-dark">Pendiente</span>';

                    // Lógica de Firma Segura
                    let firmaBtn = '-';
                    if (a.firma_digital) {
                        // Guardar en mapa global usando un ID único temporal
                        const sigId = `sig_${idHeader}_${index}`;
                        signatureMap.set(sigId, a.firma_digital);

                        firmaBtn = `
                        <button class="btn btn-sm btn-outline-primary" onclick="toggleSignature(this, '${sigId}')" title="Ver Firma">
                            <i class="fas fa-eye"></i>
                        </button>
                        `;
                    } else if (a.calificacion) {
                        firmaBtn = parseFloat(a.calificacion).toFixed(1);
                    }

                    tbody.innerHTML += `
                        <tr>
                        <td>${a.nombre}<br><small class="text-muted">${a.cedula}</small></td>
                        <td>${a.cargo || ''}</td>
                        <td>${badge}</td>
                        <td>${a.fecha_fin ? a.fecha_fin.split('.')[0] : '-'}</td>
                        <td class="text-center position-relative">${firmaBtn}</td>
                    </tr>
                        `;
                });
                new bootstrap.Modal(document.getElementById('modal-detalle')).show();
            } else {
                alert('Error al cargar detalles: ' + (resp.error || 'Desconocido'));
            }
        });
}

function toggleSignature(btn, sigId) {
    // Verificar si ya existe el contenedor de firma
    const nextEl = btn.nextElementSibling;
    if (nextEl && nextEl.classList.contains('signature-preview')) {
        nextEl.remove();
        btn.classList.remove('active');
    } else {
        const url = signatureMap.get(sigId);
        if (!url) return alert('Error: Firma no encontrada en memoria.');

        const div = document.createElement('div');
        div.className = 'signature-preview mt-2 p-1 border rounded bg-white position-absolute shadow';
        div.style.zIndex = 2000;
        div.style.width = '250px';
        div.style.right = '0';
        div.innerHTML = `<img src="${url}" class="img-fluid" alt="Firma" style="background:white;">`;

        btn.parentNode.appendChild(div); // Append to TD container to position relatively
        btn.classList.add('active');

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
        // Use Global Function from evaluacion_builder.js
        if (typeof openEvaluationBuilder === 'function') {
            openEvaluationBuilder(idFormulario);
        } else {
            console.error('openEvaluationBuilder not found. Check if evaluacion_builder.js is loaded.');
            alert('Error: No se pudo cargar el constructor de evaluaciones.');
        }
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

function downloadPDF(idHeader) {
    const btn = document.activeElement; // Capturar botón presionado
    const originalContent = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
    btn.disabled = true;

    fetch(`assets/php/evaluacion_api.php?action=get_pdf_report_data&id_header=${idHeader}`)
        .then(res => res.json())
        .then(resp => {
            if (resp.success) {
                printReport(resp.info, resp.preguntas, resp.asistentes);
            } else {
                alert('Error al generar reporte: ' + resp.error);
            }
        })
        .catch(err => alert('Error de red: ' + err.message))
        .finally(() => {
            btn.innerHTML = originalContent;
            btn.disabled = false;
        });
}

function printReport(info, preguntas, asistentes) {
    const win = window.open('', '_blank');

    // Generar HTML de Preguntas
    let preguntasHtml = '';
    preguntas.forEach((p, index) => {
        let opcionesHtml = '';
        if (p.opciones && p.opciones.length > 0) {
            opcionesHtml = '<ul class="options-list">';
            p.opciones.forEach(opt => {
                const isCorrect = opt.correcta ? 'class="correct-option"' : '';
                opcionesHtml += `<li ${isCorrect}>${opt.texto}</li>`;
            });
            opcionesHtml += '</ul>';
        }

        preguntasHtml += `
            <div class="question-item">
                <div class="question-title"><strong>${index + 1}. ${p.enunciado}</strong> (${p.tipo})</div>
                ${opcionesHtml}
            </div>
        `;
    });

    // Generar Tabla de Asistentes
    let asistentesHtml = '';
    asistentes.forEach(a => {
        // Formato de respuestas del usuario
        let respuestasDetalle = '';
        /* 
        // Descomentar si se quiere el detalle de cada respuesta en la tabla (puede ser muy largo)
        // Por ahora solo mostramos Puntos y Firma como pide "Formulario + Asistentes con firma"
        */

        // Check signature data integrity
        let firmaImg = '<span class="text-muted">Sin Firma</span>';
        if (a.firma_digital && a.firma_digital.length > 100) {
            firmaImg = `<img src="${a.firma_digital}" class="signature-img" alt="Firma" style="max-height: 50px; width: auto; display: block; margin: 0 auto;">`;
        }

        // Estado Aprobado/Reprobado badge visual
        const scoreStyle = parseFloat(a.calificacion) >= 70 ? 'color:green; font-weight:bold;' : 'color:red; font-weight:bold;';

        asistentesHtml += `
            <tr>
                <td>${a.nombre}<br><small>${a.cedula}</small></td>
                <td>${a.cargo || '-'}</td>
                <td style="text-align:center; ${scoreStyle}">${parseFloat(a.calificacion).toFixed(1)} / 100</td>
                <td style="text-align:center; vertical-align: middle;">${firmaImg}</td>
            </tr>
        `;
    });

    const docContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Reporte de Evaluación - ${info.titulo}</title>
            <style>
                body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 20px; color: #333; }
                .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #eee; padding-bottom: 20px; }
                .header h1 { margin: 0; color: #d63384; } /* Color primario o brand */
                .header p { margin: 5px 0; color: #666; }
                
                .section-title { 
                    background-color: #f8f9fa; 
                    padding: 10px; 
                    border-left: 5px solid #d63384; 
                    margin-top: 30px; 
                    margin-bottom: 15px;
                    font-size: 1.2em;
                    font-weight: bold;
                }

                .question-item { margin-bottom: 15px; page-break-inside: avoid; }
                .question-title { margin-bottom: 5px; }
                .options-list { list-style-type: none; padding-left: 20px; margin: 0; }
                .options-list li { margin-bottom: 2px; color: #555; }
                .correct-option { color: #198754; font-weight: bold; }
                
                table { width: 100%; border-collapse: collapse; margin-top: 10px; }
                th, td { border: 1px solid #ddd; padding: 10px; text-align: left; vertical-align: middle; }
                th { background-color: #f2f2f2; font-weight: bold; text-align: center; }
                
                .signature-img { max-height: 60px; max-width: 150px; }
                .text-muted { color: #999; font-style: italic; }

                @media print {
                    @page { margin: 1cm; }
                    .no-print { display: none; }
                    body { -webkit-print-color-adjust: exact; }
                }

                .footer { text-align: center; margin-top: 50px; font-size: 0.8em; color: #999; border-top: 1px solid #eee; pt: 10px; }
            </style>
        </head>
        <body>
            <div class="header">
                <h1>Reporte de Evaluación</h1>
                <p><strong>Tema:</strong> ${info.is_tema_libre ? 'Tema Libre' : info.tema}</p>
                <p><strong>Proceso:</strong> ${info.proceso || 'General'}</p>
                <p><strong>Fecha Capacitación:</strong> ${info.fecha_capacitacion}</p>
                <h3>${info.titulo}</h3>
            </div>

            <div class="section-title">1. Estructura de la Evaluación</div>
            ${preguntasHtml}

            <div class="section-title">2. Resultados y Asistencia (${asistentes.length} participantes)</div>
            <table>
                <thead>
                    <tr>
                        <th style="width: 35%">Participante</th>
                        <th style="width: 25%">Cargo</th>
                        <th style="width: 15%">Puntaje</th>
                        <th style="width: 25%">Firma</th>
                    </tr>
                </thead>
                <tbody>
                    ${asistentesHtml}
                </tbody>
            </table>

            <div class="footer">
                Generado el ${new Date().toLocaleString()} por OSM
            </div>

            <script>
                window.onload = function() { window.print(); }
            </script>
        </body>
        </html>
    `;

    win.document.write(docContent);
    win.document.close();
}
