let page = 1;
let limit = 10;
let search = "";

// Cargar tabla principal con filtros y paginado
function cargarTabla() {
    fetch(`assets/php/ed_formulario_api.php?action=listar&limit=${limit}&page=${page}&search=${encodeURIComponent(search)}`)
        .then(r => r.json())
        .then(data => {
            const tbody = document.querySelector("#dataTableCapacitaciones tbody");
            tbody.innerHTML = '';
            data.rows.forEach(row => {
                tbody.innerHTML += `
                    <tr>
                        <td class="text-center">${row.id}</td>
                        <td class="text-center">${row.tema}</td>
                        <td class="text-center">${row.responsable_nombre}</td>
                        <td class="text-center">${row.responsable_cedula}</td>
                        <td class="text-center">${row.fecha}</td>
                        <td class="text-center">${row.asistentes}</td>
                        <td class="text-center">
                            <button class="btn btn-primary bt_editar" type="button" data-id="${row.id}" data-bs-toggle="modal" data-bs-target="#modal-erc"><i class="far fa-edit"></i></button>
                            <button class="btn btn-danger bt_eliminar" type="button" data-id="${row.id}"><i class="far fa-trash-alt"></i></button>
                        </td>
                    </tr>
                `;
            });

            document.getElementById('dataTable_info').textContent =
                `Mostrando ${((page-1)*limit+1)} a ${Math.min(page*limit, data.total)} de ${data.total}`;
            const pag = document.querySelector('.pagination');
            pag.innerHTML = '';
            let startPage = Math.max(1, page - 4);
            let endPage = Math.min(data.pages, startPage + 9);
            for (let i = startPage; i <= endPage; i++) {
                pag.innerHTML += `
                    <li class="page-item ${i === page ? 'active' : ''}">
                        <a class="page-link" href="#">${i}</a>
                    </li>
                `;
            }
        });
}

// Paginación
document.querySelector('.pagination').addEventListener('click', e => {
    if (e.target.classList.contains('page-link')) {
        page = parseInt(e.target.textContent);
        cargarTabla();
    }
});

// Filtro cantidad
document.querySelector('#dataTable_length select').addEventListener('change', e => {
    limit = parseInt(e.target.value);
    page = 1;
    cargarTabla();
});

// Búsqueda en tabla
document.querySelector('#buscar-rc').addEventListener('input', e => {
    search = e.target.value;
    page = 1;
    cargarTabla();
});

// Botones editar y eliminar
document.querySelector("#dataTableCapacitaciones tbody").addEventListener('click', function(e) {
    if (e.target.closest('.bt_editar')) {
        const id = e.target.closest('.bt_editar').dataset.id;
        cargarModal(id);
    }
    if (e.target.closest('.bt_eliminar')) {
        const id = e.target.closest('.bt_eliminar').dataset.id;
        if (confirm("¿Eliminar registro y asistentes?")) {
            fetch("assets/php/ed_formulario_api.php", {
                method: "POST",
                body: new URLSearchParams({action: "eliminar", id})
            }).then(r => r.json()).then(() => cargarTabla());
        }
    }
});

cargarTabla();

// Modal: carga datos y selects dinámicos
function cargarModal(id) {
    fetch(`assets/php/ed_formulario_api.php?action=leer_formulario&id=${id}`)
        .then(r => r.json())
        .then(data => {
            document.querySelector('#modal-erc h4.mb-3').textContent = `Capacitación ID ${id}`;
            fillSelect('ed-proceso', data.procesos, data.formulario.id_proceso);
            fillSelect('ed-lugar', data.lugares, data.formulario.id_lugar);
            fillSelect('edt-actividad', data.actividades, data.formulario.id_tipo_actividad);
            fillSelect('ed-tema', data.temas, data.formulario.id_tema);

            document.getElementById('ed-cedula-r').value = data.responsable?.cedula || '';
            // Si quieres guardar el ID para editar, lo guardas en data-atributo
            document.getElementById('ed-cedula-r').dataset.id_usuario = data.formulario.id_usuario;
            document.getElementById('ed-nombre-r').value = `${data.responsable?.nombre1||''} ${data.responsable?.nombre2||''} ${data.responsable?.apellido1||''} ${data.responsable?.apellido2||''}`;
            document.getElementById('ed-h-inico').value = data.formulario.hora_inicio || '';
            document.getElementById('ed-h-final').value = data.formulario.hora_final || '';
            document.getElementById('ed-fecha').value = data.formulario.fecha || '';
            document.getElementById('ed-observaciones').value = data.formulario.observaciones || '';

            // Tabla asistentes
            const tbody = document.querySelector('#dataTableAsistentes tbody');
            tbody.innerHTML = '';
            data.asistentes.forEach(a => {
                tbody.innerHTML += `
                    <tr>
                        <td>${a.id}</td>
                        <td>${a.nombre}</td>
                        <td>${a.cedula}</td>
                        <td>${a.empresa}</td>
                        <td>${a.estado_aprovacion || ''}</td>
                        <td>
                            <button class="btn btn-danger bt_eliminar_asistente" type="button" data-id="${a.id}">
                                <i class="far fa-trash-alt"></i>
                            </button>
                        </td>
                    </tr>
                `;
            });

            document.querySelector('.card-header .fw-bold span').textContent =
                `Lista personal Capacitado (${data.asistentes.length})`;
        });
}

// Helper para selects dinámicos
function fillSelect(selectId, options, selected) {
    const select = document.getElementById(selectId);
    select.innerHTML = '<option value="">Seleccionar</option>';
    options.forEach(opt => {
        select.innerHTML += `<option value="${opt.id}"${opt.id == selected ? ' selected' : ''}>${opt.nombre}</option>`;
    });
}

// Buscar colaborador por cédula en el modal (solo muestra si situación es válida)
document.getElementById('bt-ag-capacitado-1').addEventListener('click', function() {
    const cedula = document.getElementById('ced-cap-erc').value;
    fetch(`assets/php/ed_formulario_api.php?action=buscar_colaborador&cedula=${cedula}`)
        .then(r => r.json())
        .then(data => {
            if (data.colaborador) {
                const c = data.colaborador;
                document.getElementById('nom-capacitado-erc').value =
                  `${c.ac_nombre1} ${c.ac_nombre2} ${c.ac_apellido1} ${c.ac_apellido2}`;
            } else {
                alert("Colaborador no encontrado o situación inválida");
            }
        });
});

// Agregar asistente al formulario (solo agrega si situación es válida y estado está seleccionado)
document.getElementById('bt-ag-capacitado-erc').addEventListener('click', function() {
    const id_formulario = document.querySelector('#modal-erc h4.mb-3').textContent.split(' ')[2];
    const cedula = document.getElementById('ced-cap-erc').value;
    const estado_aprovacion = document.getElementById('s-aprobacion-erc').value;
    if (!estado_aprovacion) {
        alert('Debes seleccionar estado de aprobación');
        return;
    }
    fetch("assets/php/ed_formulario_api.php", {
        method: "POST",
        body: new URLSearchParams({
            action: "agregar_asistente",
            id_formulario,
            cedula,
            estado_aprovacion
        })
    }).then(r => r.json()).then(data => {
        if (data.error) {
            alert(data.error);
        } else {
            cargarModal(id_formulario);
        }
    });
});

document.querySelector('#dataTableAsistentes tbody').addEventListener('click', function(e) {
    if (e.target.closest('.bt_eliminar_asistente')) {
        const id = e.target.closest('.bt_eliminar_asistente').dataset.id;
        fetch("assets/php/ed_formulario_api.php", {
            method: "POST",
            body: new URLSearchParams({action: "eliminar_asistente", id})
        }).then(r => r.json()).then(() => {
            const id_formulario = document.querySelector('#modal-erc h4.mb-3').textContent.split(' ')[2];
            cargarModal(id_formulario);
        });
    }
});

// Guardar cambios del formulario principal y cerrar el modal
document.getElementById('guardar-erc').addEventListener('click', function() {
    const id = document.querySelector('#modal-erc h4.mb-3').textContent.split(' ')[2];
    const id_proceso = document.getElementById('ed-proceso').value;
    const id_lugar = document.getElementById('ed-lugar').value;
    const id_tipo_actividad = document.getElementById('edt-actividad').value;
    const id_tema = document.getElementById('ed-tema').value;
    const hora_inicio = document.getElementById('ed-h-inico').value;
    const hora_final = document.getElementById('ed-h-final').value;
    const fecha = document.getElementById('ed-fecha').value;
    const observaciones = document.getElementById('ed-observaciones').value;
    const id_usuario = document.getElementById('ed-cedula-r').dataset.id_usuario || '';

    fetch("assets/php/ed_formulario_api.php", {
        method: "POST",
        body: new URLSearchParams({
            action: "actualizar_formulario",
            id,
            id_proceso,
            id_lugar,
            id_tipo_actividad,
            id_tema,
            hora_inicio,
            hora_final,
            fecha,
            observaciones,
            id_usuario
        })
    }).then(r => r.json()).then(data => {
        if (data.ok) {
            const modalEl = document.getElementById('modal-erc');
            const modalInstance = bootstrap.Modal.getInstance(modalEl);
            if(modalInstance) modalInstance.hide();
            cargarTabla();
        } else {
            alert(data.error || 'Error al guardar');
        }
    });
});