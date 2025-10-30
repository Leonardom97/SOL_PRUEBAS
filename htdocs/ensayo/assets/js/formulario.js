document.addEventListener('DOMContentLoaded', function() {
    // Función para cargar cualquier select desde una API
    function cargarSelect(htmlId, api, key) {
        fetch(api)
            .then(response => response.json())
            .then(opciones => {
                const select = document.getElementById(htmlId);
                select.innerHTML = '<option value="">Seleccione</option>';
                opciones.forEach(opt => {
                    select.innerHTML += `<option value="${opt.id}">${opt[key]}</option>`;
                });
            })
            .catch(err => {
                const select = document.getElementById(htmlId);
                select.innerHTML = '<option value="">Error al cargar</option>';
            });
    }

    // Cargar selects principales
    cargarSelect('proceso', 'php/get_procesos.php', 'proceso');
    cargarSelect('lugar-1', 'php/get_lugares.php', 'lugar');
    cargarSelect('t-actividad', 'php/get_tipo_actividad.php', 'nombre');
    cargarSelect('tema-a', 'php/get_temas.php', 'nombre');

    // Responsable/capacitador por defecto usuario logueado (solo para autollenar, NO para id_usuario)
    const capacitadorNombre = localStorage.getItem('usuario');
    document.getElementById('nombre-r').value = capacitadorNombre || '';
    document.getElementById('cedula').value = localStorage.getItem('cedula') || '';

    // Buscar capacitador por cédula y guardar el id real
    let currentResponsableId = null;

    document.getElementById('bt-responsable').addEventListener('click', function() {
        const cedula = document.getElementById('cedula').value.trim();
        if (!cedula) {
            alert('Ingrese la cédula del capacitador');
            return;
        }
        fetch(`php/buscar_usuario.php?cedula=${encodeURIComponent(cedula)}`)
            .then(r => r.json())
            .then(res => {
                if (res.ok) {
                    document.getElementById('nombre-r').value = res.nombre;
                    currentResponsableId = res.id; // ← este será el id_usuario real
                } else {
                    document.getElementById('nombre-r').value = '';
                    currentResponsableId = null;
                    alert(res.msg || 'No encontrado');
                }
            });
    });

    // Modal de asistentes
    let asistentes = [];

    // Buscar asistente por cédula y llenar nombre y empresa (empresa solo en variable)
    document.getElementById('bt-ag-capacitado-1').addEventListener('click', function() {
        const cedula = document.getElementById('ced-capacitado').value.trim();
        if (!cedula) return;
        fetch(`php/buscar_crear_asistente.php?cedula=${encodeURIComponent(cedula)}`)
            .then(r => r.json())
            .then(res => {
                if (res.ok) {
                    document.getElementById('nom-capacitado').value = res.asistente.nombre;
                    // Guardar la empresa en data attribute (no en campo visible)
                    document.getElementById('nom-capacitado').dataset.empresa = res.asistente.empresa || '';
                } else {
                    document.getElementById('nom-capacitado').value = '';
                    document.getElementById('nom-capacitado').dataset.empresa = '';
                    alert(res.msg || 'No encontrado');
                }
            });
    });

    // Agregar asistente a la lista temporal
    document.getElementById('bt-ag-capacitado-2').addEventListener('click', function(e) {
        e.preventDefault();
        const cedula = document.getElementById('ced-capacitado').value.trim();
        const nombre = document.getElementById('nom-capacitado').value.trim();
        // Obtener empresa del data attribute
        const empresa = document.getElementById('nom-capacitado').dataset.empresa || '';
        const estado = document.getElementById('s-aprobacion').value;
        if (!cedula || !nombre || !estado) {
            alert('Completa todos los datos del asistente');
            return;
        }
        // Evitar duplicados de cedula
        if (asistentes.some(a => a.cedula === cedula)) {
            alert('Asistente ya agregado');
            return;
        }
        asistentes.push({ cedula, nombre, empresa, estado });
        actualizarTablaAsistentes();
        document.getElementById('ced-capacitado').value = '';
        document.getElementById('nom-capacitado').value = '';
        document.getElementById('nom-capacitado').dataset.empresa = '';
        document.getElementById('s-aprobacion').value = '';
        document.getElementById('asistentes-c').value = asistentes.length;
    });

    window.eliminarAsistente = function(idx) {
        asistentes.splice(idx, 1);
        actualizarTablaAsistentes();
        document.getElementById('asistentes-c').value = asistentes.length;
    };

    function actualizarTablaAsistentes() {
        const tbody = document.querySelector('#dataTable tbody');
        tbody.innerHTML = '';
        asistentes.forEach((asist, i) => {
            tbody.innerHTML += `<tr>
                <td>${i+1}</td>
                <td>${asist.nombre}</td>
                <td>${asist.cedula}</td>
                <td>${asist.empresa || '-'}</td>
                <td>${asist.estado}</td>
                <td>
                    <button class="btn btn-danger" onclick="eliminarAsistente(${i})">Eliminar</button>
                </td>
            </tr>`;
        });
    }

    // Guardar formulario
    document.querySelector('.needs-validation').addEventListener('submit', function(e) {
        e.preventDefault();

        // Validar que haya id_usuario válido
        if (!currentResponsableId) {
            alert('Debe buscar y seleccionar un responsable válido.');
            return;
        }

        // Recolectar datos
        const data = {
            id_proceso: document.getElementById('proceso').value,
            id_lugar: document.getElementById('lugar-1').value,
            id_tipo_actividad: document.getElementById('t-actividad').value,
            id_tema: document.getElementById('tema-a').value,
            hora_inicio: document.getElementById('h-inico').value,
            hora_final: document.getElementById('h-final').value,
            fecha: document.getElementById('fecha').value,
            observaciones: document.getElementById('observaciones').value,
            id_usuario: currentResponsableId,
            asistentes: asistentes
        };
        // Validación simple
        if (!data.id_proceso || !data.id_lugar || !data.id_tipo_actividad || !data.id_tema || !data.hora_inicio || !data.hora_final || !data.fecha) {
            alert('Por favor complete todos los campos obligatorios');
            return;
        }
        fetch('php/guardar_formulario.php', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(data)
        }).then(r => r.json()).then(res => {
            if (res.exito) {
                alert('Formulario guardado');
                // Limpia form, resetea asistentes
                asistentes = [];
                actualizarTablaAsistentes();
                this.reset();
                document.getElementById('asistentes-c').value = '';
                cargarSelect('proceso', 'php/get_procesos.php', 'proceso');
                currentResponsableId = null;
                document.getElementById('nombre-r').value = '';
                document.getElementById('cedula').value = '';
            } else {
                alert('Error: ' + (res.mensaje || 'No guardado'));
            }
        });
    });
});