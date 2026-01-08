const API_URL = 'assets/php/remision_api.php';

document.addEventListener('DOMContentLoaded', function () {
    loadViajesActivos();
});

function loadViajesActivos() {
    fetch(`${API_URL}?action=get_viajes_activos`)
        .then(response => response.json())
        .then(data => {
            const select = document.getElementById('select-viaje');
            select.innerHTML = '<option value="">Seleccione un viaje...</option>';
            data.data.forEach(v => {
                select.innerHTML += `<option value="${v.id}">
                    ${v.placa} - ${v.finca_empresa} (${new Date(v.created_at).toLocaleDateString()})
                </option>`;
            });
        });
}

function saveRemision() {
    const form = document.getElementById('formRemision');
    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());

    // Checkbox handling
    if (document.getElementById('check-cert').checked) {
        data.fruto_certificado = true;
    } else {
        delete data.fruto_certificado;
    }

    fetch(`${API_URL}?action=save_remision`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    })
        .then(response => response.json())
        .then(result => {
            if (result.status === 'success') {
                alert('Remisión guardada correctamente');
                form.reset();
                loadViajesActivos();
            } else {
                alert('Error: ' + result.message);
            }
        });
}
