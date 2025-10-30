document.addEventListener('DOMContentLoaded', function () {
    const API_URL = 'php/listar_formularios.php';
    const tableBody = document.querySelector('#dataTable tbody');
    const infoText = document.getElementById('dataTable_info');
    const pagination = document.querySelector('.pagination');
    const selectLength = document.querySelector('#dataTable_length select');
    const searchInput = document.querySelector('#dataTable_filter input');

    let current_page = 1;
    let per_page = parseInt(selectLength.value, 10);
    let search = '';

    // --- Tabla principal: paginado, búsqueda, renderizado ---
    function renderTable(data) {
        tableBody.innerHTML = '';
        if (!data.length) {
            tableBody.innerHTML = `<tr><td colspan="7" class="text-center">Sin registros</td></tr>`;
            return;
        }
        data.forEach(f => {
            tableBody.innerHTML += `
                <tr>
                    <td class="text-center" style="border-top-left-radius: 10px;">${f.id}</td>
                    <td class="text-center" style="border-left-width: 1px;">${f.tipo_actividad || f.tema || ''}</td>
                    <td class="text-center" style="border-left-width: 1px;">${f.responsable || ''}</td>
                    <td class="text-center" style="border-left-width: 1px;">${f.cedula || ''}</td>
                    <td class="text-center" style="border-left-width: 1px;">${f.fecha || ''}</td>
                    <td class="text-center" style="border-left-width: 1px;">${f.personal_capacitado || 0}</td>
                    <td class="text-center" style="border-top-right-radius: 10px;border-bottom-right-radius: 10px;border-left-width: 1px;">
                        <button class="btn btn-primary btn-edit" data-id="${f.id}" type="button" style="margin-left:5px;">
                            <i class="far fa-edit"></i>
                        </button>
                        <button class="btn btn-danger btn-delete" data-id="${f.id}" type="button" style="margin-left:5px;">
                            <i class="far fa-trash-alt"></i>
                        </button>
                    </td>
                </tr>
            `;
        });
    }

    function renderPagination(total, page, perPage) {
        const totalPages = Math.ceil(total / perPage);
        let html = '';
        html += `<li class="page-item${page === 1 ? ' disabled' : ''}"><a class="page-link" href="#" data-page="${page - 1}" aria-label="Previous"><span aria-hidden="true">«</span></a></li>`;
        for (let i = 1; i <= totalPages; i++) {
            html += `<li class="page-item${i === page ? ' active' : ''}"><a class="page-link" href="#" data-page="${i}">${i}</a></li>`;
        }
        html += `<li class="page-item${page === totalPages ? ' disabled' : ''}"><a class="page-link" href="#" data-page="${page + 1}" aria-label="Next"><span aria-hidden="true">»</span></a></li>`;
        pagination.innerHTML = html;
    }

    function renderInfo(page, perPage, total, showing) {
        const start = total === 0 ? 0 : (page - 1) * perPage + 1;
        const end = (page - 1) * perPage + showing;
        infoText.textContent = `Mostrando ${start} a ${end} de ${total}`;
    }

    function loadTable() {
        tableBody.innerHTML = `<tr><td colspan="7" class="text-center">Cargando...</td></tr>`;
        fetch(`${API_URL}?page=${current_page}&per_page=${per_page}&search=${encodeURIComponent(search)}`)
            .then(res => res.json())
            .then(data => {
                renderTable(data.data);
                renderPagination(data.total, data.page, data.per_page);
                renderInfo(data.page, data.per_page, data.total, data.data.length);
            })
            .catch(() => {
                tableBody.innerHTML = `<tr><td colspan="7" class="text-center text-danger">Error cargando registros</td></tr>`;
            });
    }

    pagination.addEventListener('click', function (e) {
        const page = e.target.closest('a')?.dataset.page;
        if (page) {
            e.preventDefault();
            const newPage = parseInt(page, 10);
            if (newPage > 0) {
                current_page = newPage;
                loadTable();
            }
        }
    });

    selectLength.addEventListener('change', function () {
        per_page = parseInt(this.value, 10);
        current_page = 1;
        loadTable();
    });

    searchInput.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') {
            search = this.value.trim();
            current_page = 1;
            loadTable();
        }
    });

    // --- Eliminar registro ---
    tableBody.addEventListener('click', function (e) {
        if (e.target.closest('.btn-delete')) {
            const id = e.target.closest('.btn-delete').dataset.id;
            if (confirm('¿Estás seguro de que deseas eliminar este registro? Esta acción no se puede deshacer.')) {
                fetch('php/eliminar_formulario.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ id })
                })
                .then(res => res.json())
                .then(response => {
                    if (response.success) {
                        alert('Registro eliminado correctamente');
                        loadTable();
                    } else {
                        alert(response.message || 'Error al eliminar registro');
                    }
                })
                .catch(() => {
                    alert('Error de conexión al eliminar registro');
                });
            }
        }
        if (e.target.closest('.btn-edit')) {
            const id = e.target.closest('.btn-edit').dataset.id;
            abrirEdicion(id);
        }
    });

    // =========================
    // === Modal de Edición ====
    // =========================

    let asistentesEditar = [];

    // Utilidad para cargar selects dinámicos
    function cargarSelect(htmlId, api, key, selectedValue) {
        fetch(api)
            .then(response => response.json())
            .then(opciones => {
                const select = document.getElementById(htmlId);
                select.innerHTML = '<option value="">Seleccione</option>';
                opciones.forEach(opt => {
                    const selected = selectedValue && selectedValue == opt.id ? "selected" : "";
                    select.innerHTML += `<option value="${opt.id}" ${selected}>${opt[key]}</option>`;
                });
            })
            .catch(() => {
                const select = document.getElementById(htmlId);
                select.innerHTML = '<option value="">Error al cargar</option>';
            });
    }

    function abrirEdicion(id) {
        asistentesEditar = [];
        Promise.all([
            fetch('php/obtener_formulario.php?id=' + id).then(r => r.json()),
            fetch('php/catalogo_universal.php?tabla=proceso').then(r => r.json()),
            fetch('php/catalogo_universal.php?tabla=lugar').then(r => r.json()),
            fetch('php/catalogo_universal.php?tabla=tipo_actividad').then(r => r.json()),
            fetch('php/catalogo_universal.php?tabla=tema').then(r => r.json())
        ]).then(([data, procesos, lugares, actividades, temas]) => {
            const f = data.formulario;
            cargarSelect('ed-proceso', 'php/catalogo_universal.php?tabla=proceso', 'nombre', f.id_proceso);
            cargarSelect('ed-lugar', 'php/catalogo_universal.php?tabla=lugar', 'nombre', f.id_lugar);
            cargarSelect('edt-actividad', 'php/catalogo_universal.php?tabla=tipo_actividad', 'nombre', f.id_tipo_actividad);
            cargarSelect('ed-tema', 'php/catalogo_universal.php?tabla=tema', 'nombre', f.id_tema);

            document.getElementById('ed-id-usuario').value = f.id_usuario || '';
            document.getElementById('ed-cedula-r').value = f.cedula_responsable || '';
            document.getElementById('ed-nombre-r').value = f.responsable || '';
            document.getElementById('ed-h-inico').value = f.hora_inicio || '';
            document.getElementById('ed-h-final').value = f.hora_final || '';
            document.getElementById('ed-fecha').value = f.fecha || '';
            document.getElementById('ed-observaciones').value = f.observaciones || '';
            document.getElementById('guardar-erc').setAttribute('data-id', f.id);

            asistentesEditar = (data.asistentes || []).map(a => ({
                cedula: a.cedula,
                nombre: a.nombre,
                empresa: a.empresa || '',
                estado: a.estado || ''
            }));
            actualizarTablaAsistentesEd();

            // Buscar asistente por cédula (botón buscar)
            document.getElementById('bt-ag-capacitado-1').onclick = function() {
                const cedula = document.getElementById('ced-cap-erc').value.trim();
                if (!cedula) return;
                fetch(`php/buscar_crear_asistente.php?cedula=${encodeURIComponent(cedula)}`)
                    .then(async r => {
                        if (!r.ok) throw new Error("HTTP status " + r.status);
                        const txt = await r.text();
                        try {
                            return JSON.parse(txt);
                        } catch (e) {
                            throw new Error("No JSON: " + txt);
                        }
                    })
                    .then(res => {
                        if (res.ok && res.asistente) {
                            document.getElementById('nom-capacitado-erc').value = res.asistente.nombre;
                            document.getElementById('nom-capacitado-erc').dataset.empresa = res.asistente.empresa || '';
                        } else {
                            document.getElementById('nom-capacitado-erc').value = '';
                            document.getElementById('nom-capacitado-erc').dataset.empresa = '';
                            alert(res.msg || 'No encontrado');
                        }
                    })
                    .catch(e => {
                        alert("Error en la búsqueda del asistente: " + e.message);
                    });
            };

            // Buscar asistente por cédula (blur)
            document.getElementById('ced-cap-erc').onblur = function() {
                const cedula = this.value.trim();
                if (!cedula) {
                    document.getElementById('nom-capacitado-erc').value = '';
                    document.getElementById('nom-capacitado-erc').dataset.empresa = '';
                    return;
                }
                fetch(`php/buscar_crear_asistente.php?cedula=${encodeURIComponent(cedula)}`)
                    .then(async r => {
                        if (!r.ok) throw new Error("HTTP status " + r.status);
                        const txt = await r.text();
                        try {
                            return JSON.parse(txt);
                        } catch (e) {
                            throw new Error("No JSON: " + txt);
                        }
                    })
                    .then(dataAsi => {
                        if(dataAsi.ok && dataAsi.asistente){
                            document.getElementById('nom-capacitado-erc').value = dataAsi.asistente.nombre;
                            document.getElementById('nom-capacitado-erc').dataset.empresa = dataAsi.asistente.empresa || '';
                        } else {
                            document.getElementById('nom-capacitado-erc').value = '';
                            document.getElementById('nom-capacitado-erc').dataset.empresa = '';
                        }
                    })
                    .catch(e => {
                        alert("Error en la búsqueda del asistente: " + e.message);
                    });
            };

            // Agregar asistente (array temporal)
            document.getElementById('bt-ag-capacitado-erc').onclick = function(e) {
                e.preventDefault();
                const cedula = document.getElementById('ced-cap-erc').value.trim();
                const nombre = document.getElementById('nom-capacitado-erc').value.trim();
                const empresa = document.getElementById('nom-capacitado-erc').dataset.empresa || '';
                const estado = document.getElementById('s-aprobacion-erc').value;
                if (!cedula || !nombre || !estado) {
                    alert('Completa todos los datos del asistente');
                    return;
                }
                if (asistentesEditar.some(a => a.cedula === cedula)) {
                    alert('Asistente ya agregado');
                    return;
                }
                asistentesEditar.push({ cedula, nombre, empresa, estado });
                actualizarTablaAsistentesEd();
                document.getElementById('ced-cap-erc').value = '';
                document.getElementById('nom-capacitado-erc').value = '';
                document.getElementById('nom-capacitado-erc').dataset.empresa = '';
                document.getElementById('s-aprobacion-erc').value = '';
            };
            new bootstrap.Modal(document.getElementById('modal-edf')).show();
        });
    }

    window.eliminarAsistenteEd = function(idx) {
        asistentesEditar.splice(idx, 1);
        actualizarTablaAsistentesEd();
    };

    function actualizarTablaAsistentesEd() {
        const tbody = document.querySelector('#ed-Table-pc tbody');
        tbody.innerHTML = '';
        asistentesEditar.forEach((asist, i) => {
            tbody.innerHTML += `<tr>
                <td>${i+1}</td>
                <td>${asist.nombre}</td>
                <td>${asist.cedula}</td>
                <td>${asist.empresa || '-'}</td>
                <td>${asist.estado || '-'}</td>
                <td>
                    <button type="button" class="btn btn-danger" onclick="eliminarAsistenteEd(${i})">Eliminar</button>
                </td>
            </tr>`;
        });
    }

    document.getElementById('guardar-erc').onclick = function() {
        const id = this.getAttribute('data-id');
        const data = {
            id: id,
            id_proceso: document.getElementById('ed-proceso').value,
            id_lugar: document.getElementById('ed-lugar').value,
            id_usuario: document.getElementById('ed-id-usuario').value,
            id_tipo_actividad: document.getElementById('edt-actividad').value,
            id_tema: document.getElementById('ed-tema').value,
            hora_inicio: document.getElementById('ed-h-inico').value,
            hora_final: document.getElementById('ed-h-final').value,
            fecha: document.getElementById('ed-fecha').value,
            observaciones: document.getElementById('ed-observaciones').value,
            asistentes: asistentesEditar
        };

        if (!data.id_proceso || !data.id_lugar || !data.id_usuario || !data.id_tipo_actividad || !data.id_tema || !data.hora_inicio || !data.hora_final || !data.fecha) {
            alert('Por favor complete todos los campos obligatorios');
            return;
        }

        fetch('php/actualizar_formulario.php', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(data)
        })
        .then(res => res.json())
        .then(resp => {
            if(resp.success) {
                alert('Registro actualizado');
                loadTable();
                bootstrap.Modal.getInstance(document.getElementById('modal-edf')).hide();
            } else {
                alert('Error al actualizar');
            }
        });
    };

    loadTable();
    window.recargarFormularios = loadTable;
});