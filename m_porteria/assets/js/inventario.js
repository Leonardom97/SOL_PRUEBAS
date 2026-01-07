document.addEventListener('DOMContentLoaded', function () {
    loadVehiculos();
    loadConductores();
});

const API_URL = 'assets/php/porteria_api.php';

// --- Vehiculos ---

function loadVehiculos() {
    fetch(`${API_URL}?action=get_vehiculos`)
        .then(response => response.json())
        .then(data => {
            const tbody = document.querySelector('#tabla-vehiculos tbody');
            tbody.innerHTML = '';
            data.data.forEach(v => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${v.placa}</td>
                    <td>${v.tipo_vehiculo}</td>
                    <td>${v.empresa || '-'}</td>
                    <td>${v.estado_vehiculo}</td>
                    <td class="${checkExpiration(v.soat_fecha_vencimiento)}">${formatDate(v.soat_fecha_vencimiento)}</td>
                    <td class="${checkExpiration(v.tecnomecanica_fecha_vencimiento)}">${formatDate(v.tecnomecanica_fecha_vencimiento)}</td>
                    <td>
                        <button class="btn btn-sm btn-warning" onclick='editVehiculo(${JSON.stringify(v)})'>Editar</button>
                    </td>
                `;
                tbody.appendChild(row);
            });
        });
}

function openVehiculoModal() {
    document.getElementById('formVehiculo').reset();
    document.getElementById('v_id').value = '';
    new bootstrap.Modal(document.getElementById('modalVehiculo')).show();
}

function editVehiculo(vehiculo) {
    const form = document.getElementById('formVehiculo');
    form.id.value = vehiculo.id;
    form.placa.value = vehiculo.placa;
    form.tipo_vehiculo.value = vehiculo.tipo_vehiculo;
    form.empresa.value = vehiculo.empresa;
    form.propio_externo.value = vehiculo.propio_externo;
    form.soat_fecha_vencimiento.value = vehiculo.soat_fecha_vencimiento;
    form.tecnomecanica_fecha_vencimiento.value = vehiculo.tecnomecanica_fecha_vencimiento;
    form.poliza_terceros_fecha_vencimiento.value = vehiculo.poliza_terceros_fecha_vencimiento;
    form.area_perteneciente.value = vehiculo.area_perteneciente;
    form.estado_vehiculo.value = vehiculo.estado_vehiculo;

    new bootstrap.Modal(document.getElementById('modalVehiculo')).show();
}

function saveVehiculo() {
    const form = document.getElementById('formVehiculo');
    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());

    fetch(`${API_URL}?action=save_vehiculo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    })
        .then(response => response.json())
        .then(result => {
            if (result.status === 'success') {
                bootstrap.Modal.getInstance(document.getElementById('modalVehiculo')).hide();
                loadVehiculos();
            } else {
                alert('Error: ' + result.message);
            }
        });
}

// --- Conductores ---

function loadConductores() {
    fetch(`${API_URL}?action=get_conductores`)
        .then(response => response.json())
        .then(data => {
            const tbody = document.querySelector('#tabla-conductores tbody');
            tbody.innerHTML = '';
            data.data.forEach(c => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${c.cedula}</td>
                    <td>${c.nombres} ${c.apellidos}</td>
                    <td>${c.empresa || '-'}</td>
                    <td>${c.licencia_categoria || '-'}</td>
                    <td class="${checkExpiration(c.licencia_fecha_vencimiento)}">${formatDate(c.licencia_fecha_vencimiento)}</td>
                    <td>
                        <button class="btn btn-sm btn-warning" onclick='editConductor(${JSON.stringify(c)})'>Editar</button>
                    </td>
                `;
                tbody.appendChild(row);
            });
        });
}

function openConductorModal() {
    document.getElementById('formConductor').reset();
    document.getElementById('c_id').value = '';
    new bootstrap.Modal(document.getElementById('modalConductor')).show();
}

function editConductor(conductor) {
    const form = document.getElementById('formConductor');
    form.id.value = conductor.id;
    form.cedula.value = conductor.cedula;
    form.nombres.value = conductor.nombres;
    form.apellidos.value = conductor.apellidos;
    form.empresa.value = conductor.empresa;
    form.licencia_categoria.value = conductor.licencia_categoria;
    form.licencia_fecha_vencimiento.value = conductor.licencia_fecha_vencimiento;
    form.parafiscales_fecha_vencimiento.value = conductor.parafiscales_fecha_vencimiento;
    form.contacto.value = conductor.contacto;
    form.area_asignada.value = conductor.area_asignada;

    new bootstrap.Modal(document.getElementById('modalConductor')).show();
}

function saveConductor() {
    const form = document.getElementById('formConductor');
    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());

    fetch(`${API_URL}?action=save_conductor`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    })
        .then(response => response.json())
        .then(result => {
            if (result.status === 'success') {
                bootstrap.Modal.getInstance(document.getElementById('modalConductor')).hide();
                loadConductores();
            } else {
                alert('Error: ' + result.message);
            }
        });
}

// --- Utilities ---

function formatDate(dateString) {
    if (!dateString) return '-';
    return dateString;
}

function checkExpiration(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = date - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return 'expired';
    if (diffDays < 30) return 'warning';
    return '';
}
