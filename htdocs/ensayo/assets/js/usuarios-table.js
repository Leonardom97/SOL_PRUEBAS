document.addEventListener('DOMContentLoaded', function () {
    const API_URL = 'php/usuarios-listar.php';
    const tableBody = document.querySelector('#dataTable tbody');
    const infoText = document.getElementById('dataTable_info');
    const pagination = document.querySelector('.pagination');
    const selectLength = document.querySelector('#dataTable_length select');
    const searchInput = document.querySelector('#dataTable_filter input');
    let current_page = 1;
    let per_page = parseInt(selectLength.value, 10);
    let search = '';

    function renderTable(users) {
        tableBody.innerHTML = '';
        if (!users.length) {
            tableBody.innerHTML = `<tr><td colspan="7" class="text-center">Sin usuarios</td></tr>`;
            return;
        }
        users.forEach(user => {
            tableBody.innerHTML += `
                <tr>
                    <td class="text-center">${user.id}</td>
                    <td class="text-center">${user.id_usuario}</td>
                    <td class="text-center">${user.nombre1} ${user.nombre2}</td>
                    <td class="text-center">${user.apellido1} ${user.apellido2}</td>
                    <td class="text-center">${user.cedula}</td>
                    <td class="text-center">${user.rol_nombre}</td>
                    <td class="text-center">
                        <button class="btn btn-primary btn-edit" data-id="${user.id}" type="button" style="margin-left:5px;" data-bs-target="#modal-eru" data-bs-toggle="modal">
                            <i class="far fa-edit"></i>
                        </button>
                        <button class="btn btn-danger btn-delete" data-id="${user.id}" type="button" style="margin-left:5px;">
                            <i class="fas fa-user-times"></i>
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
                tableBody.innerHTML = `<tr><td colspan="7" class="text-center text-danger">Error cargando usuarios</td></tr>`;
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

    tableBody.addEventListener('click', function (e) {
        // Editar
        if (e.target.closest('.btn-edit')) {
            const id = e.target.closest('.btn-edit').dataset.id;
            cargarUsuarioEdicion(id);
        }
        // Eliminar
        if (e.target.closest('.btn-delete')) {
            const id = e.target.closest('.btn-delete').dataset.id;
            if (confirm('¿Estás seguro de que deseas eliminar este usuario? Esta acción no se puede deshacer.')) {
                fetch('php/usuarios-eliminar.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ id })
                })
                .then(res => res.json())
                .then(response => {
                    if (response.success) {
                        alert('Usuario eliminado correctamente');
                        loadTable();
                    } else {
                        alert(response.message || 'Error al eliminar usuario');
                    }
                })
                .catch(() => {
                    alert('Error de conexión al eliminar usuario');
                });
            }
        }
    });

    function cargarUsuarioEdicion(id) {
        fetch(`php/usuarios-detalle.php?id=${id}`)
            .then(res => res.json())
            .then(usuario => {
                document.querySelector('#modal-eru h4.mb-3').textContent = `Usuario ID ${usuario.id}`;
                document.getElementById('cedula-eru').value = usuario.cedula;
                document.getElementById('rol-eru').value = usuario.id_rol;
                document.getElementById('usuario-eru').value = usuario.id_usuario;
                document.getElementById('nombre1-eru').value = usuario.nombre1;
                document.getElementById('nombre2-eru').value = usuario.nombre2;
                document.getElementById('apellido1-eru').value = usuario.apellido1;
                document.getElementById('apellido2-eru').value = usuario.apellido2;
                document.getElementById('ed-nombre-r-1').value = '';
                document.getElementById('ed-nombre-r-2').value = '';
                document.getElementById('modal-eru').dataset.usuarioId = usuario.id;
            });
    }

    document.getElementById('guardar-eru').addEventListener('click', function () {
        const modal = document.getElementById('modal-eru');
        const id = modal.dataset.usuarioId;
        const data = {
            id: id,
            cedula: document.getElementById('cedula-eru').value,
            id_rol: document.getElementById('rol-eru').value,
            id_usuario: document.getElementById('usuario-eru').value,
            nombre1: document.getElementById('nombre1-eru').value,
            nombre2: document.getElementById('nombre2-eru').value,
            apellido1: document.getElementById('apellido1-eru').value,
            apellido2: document.getElementById('apellido2-eru').value
        };
        const pass = document.getElementById('ed-nombre-r-1').value;
        const passConf = document.getElementById('ed-nombre-r-2').value;
        if (pass || passConf) {
            if (pass !== passConf) {
                alert('Las contraseñas no coinciden');
                return;
            }
            data.contraseña = pass;
        }

        fetch('php/usuarios-editar.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        })
            .then(res => res.json())
            .then(respuesta => {
                if (respuesta.success) {
                    var bootstrapModal = bootstrap.Modal.getInstance(modal);
                    bootstrapModal.hide();
                    loadTable();
                    alert('Usuario editado con éxito');
                } else {
                    alert(respuesta.message || 'Error al editar usuario');
                }
            });
    });

    loadTable();
    window.recargarUsuarios = loadTable;
});