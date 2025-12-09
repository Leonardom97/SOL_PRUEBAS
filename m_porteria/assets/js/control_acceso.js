const API_URL = 'assets/php/porteria_api.php';

document.addEventListener('DOMContentLoaded', function () {
    loadVehiculosEnPlanta();
});

// --- Ingreso ---

function verificarPlacaIngreso() {
    const placa = document.getElementById('ingreso-placa').value;
    if (!placa) return;

    fetch(`${API_URL}?action=check_placa&placa=${placa}`)
        .then(response => response.json())
        .then(result => {
            const infoDiv = document.getElementById('ingreso-info');
            const statusDiv = document.getElementById('ingreso-status');
            const btn = document.getElementById('btn-registrar-ingreso');

            infoDiv.classList.remove('d-none');

            if (result.exists) {
                const v = result.data;
                let html = `<strong>Vehículo Encontrado:</strong> ${v.tipo_vehiculo} - ${v.empresa || 'Sin Empresa'}<br>`;

                // Check documents
                const soatStatus = checkExpiration(v.soat_fecha_vencimiento);
                const tecnoStatus = checkExpiration(v.tecnomecanica_fecha_vencimiento);
                const polizaStatus = checkExpiration(v.poliza_terceros_fecha_vencimiento);

                if (soatStatus === 'expired' || tecnoStatus === 'expired' || polizaStatus === 'expired') {
                    html += `<div class="text-danger">Documentos Vencidos! No puede ingresar.</div>`;
                    btn.disabled = true;
                } else if (v.ubicacion_actual === 'en_planta') {
                    html += `<div class="text-warning">El vehículo ya está en planta.</div>`;
                    btn.disabled = true;
                } else {
                    html += `<div class="text-success">Documentos en regla. Listo para ingresar.</div>`;
                    btn.disabled = false;
                }

                statusDiv.innerHTML = html;
            } else {
                statusDiv.innerHTML = `<span class="text-danger">Vehículo no registrado en inventario.</span>`;
                btn.disabled = true;
            }
        });
}

function registrarIngreso() {
    const placa = document.getElementById('ingreso-placa').value;

    fetch(`${API_URL}?action=registrar_ingreso`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ placa: placa })
    })
        .then(response => response.json())
        .then(result => {
            if (result.status === 'success') {
                alert('Ingreso registrado');
                document.getElementById('ingreso-placa').value = '';
                document.getElementById('ingreso-info').classList.add('d-none');
                loadVehiculosEnPlanta();
            } else {
                alert('Error: ' + result.message);
            }
        });
}

// --- Salida ---

function verificarPlacaSalida() {
    const placa = document.getElementById('salida-placa').value;
    if (!placa) return;

    fetch(`${API_URL}?action=check_placa&placa=${placa}`)
        .then(response => response.json())
        .then(result => {
            const infoDiv = document.getElementById('salida-info');
            const statusDiv = document.getElementById('salida-status');
            const btn = document.getElementById('btn-registrar-salida');

            infoDiv.classList.remove('d-none');

            if (result.exists) {
                const v = result.data;
                let html = `<strong>Vehículo Encontrado:</strong> ${v.tipo_vehiculo}<br>`;

                if (v.ubicacion_actual !== 'en_planta') {
                    html += `<div class="text-warning">El vehículo NO está en planta.</div>`;
                    btn.disabled = true;
                } else {
                    html += `<div class="text-success">Listo para salida.</div>`;
                    btn.disabled = false;
                }

                statusDiv.innerHTML = html;
            } else {
                statusDiv.innerHTML = `<span class="text-danger">Vehículo no registrado.</span>`;
                btn.disabled = true;
            }
        });
}

function registrarSalida() {
    const placa = document.getElementById('salida-placa').value;

    fetch(`${API_URL}?action=registrar_salida`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ placa: placa })
    })
        .then(response => response.json())
        .then(result => {
            if (result.status === 'success') {
                alert('Salida registrada');
                document.getElementById('salida-placa').value = '';
                document.getElementById('salida-info').classList.add('d-none');
                loadVehiculosEnPlanta();
            } else {
                alert('Error: ' + result.message);
            }
        });
}

// --- Listado En Planta ---

function loadVehiculosEnPlanta() {
    fetch(`${API_URL}?action=get_vehiculos`)
        .then(response => response.json())
        .then(data => {
            const tbody = document.querySelector('#tabla-en-planta tbody');
            tbody.innerHTML = '';
            data.data.forEach(v => {
                if (v.ubicacion_actual === 'en_planta') {
                    const row = document.createElement('tr');
                    row.innerHTML = `
                        <td>${v.placa}</td>
                        <td>${v.tipo_vehiculo}</td>
                        <td>${v.empresa || '-'}</td>
                        <td>${formatDate(v.updated_at)}</td> <!-- Using updated_at as entry time proxy for now -->
                        <td><span class="status-badge status-planta">En Planta</span></td>
                    `;
                    tbody.appendChild(row);
                }
            });
        });
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

function formatDate(dateString) {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleString();
}
