// Este archivo asume que los IDs del HTML son correctos y únicos.

function cargarAsistentePorCedula(cedula, cb) {
    fetch("php/buscar_crear_asistentes.php?cedula=" + encodeURIComponent(cedula))
        .then(r => r.json())
        .then(res => cb(res))
        .catch(() => cb({ok: false, msg: "Error de red"}));
}

document.getElementById('bt-ag-capacitado-1').onclick = function() {
    const cedula = document.getElementById('ced-cap-erc').value.trim();
    if (!cedula) return;
    cargarAsistentePorCedula(cedula, (res) => {
        if (res.ok && res.asistente) {
            document.getElementById('nom-capacitado-erc').value = res.asistente.nombre;
            document.getElementById('nom-capacitado-erc').dataset.empresa = res.asistente.empresa || '';
        } else {
            document.getElementById('nom-capacitado-erc').value = '';
            document.getElementById('nom-capacitado-erc').dataset.empresa = '';
            alert(res.msg || 'No encontrado');
        }
    });
};

document.getElementById('ced-cap-erc').onblur = function() {
    const cedula = this.value.trim();
    if (!cedula) {
        document.getElementById('nom-capacitado-erc').value = '';
        document.getElementById('nom-capacitado-erc').dataset.empresa = '';
        return;
    }
    cargarAsistentePorCedula(cedula, (res) => {
        if (res.ok && res.asistente) {
            document.getElementById('nom-capacitado-erc').value = res.asistente.nombre;
            document.getElementById('nom-capacitado-erc').dataset.empresa = res.asistente.empresa || '';
        } else {
            document.getElementById('nom-capacitado-erc').value = '';
            document.getElementById('nom-capacitado-erc').dataset.empresa = '';
        }
    });
};

// Agregar asistente
document.getElementById('bt-ag-capacitado-erc').onclick = function(e) {
    e.preventDefault();
    const cedula = document.getElementById('ced-cap-erc').value.trim();
    const nombre = document.getElementById('nom-capacitado-erc').value.trim();
    const empresa = document.getElementById('nom-capacitado-erc').dataset.empresa || '';
    const estado = document.getElementById('s-aprobacion-erc').value;
    const idFormulario = document.getElementById('guardar-erc').getAttribute('data-id');
    if (!cedula || !nombre || !estado) {
        alert('Completa todos los datos del asistente');
        return;
    }
    cargarAsistentePorCedula(cedula, (res) => {
        if (!res.ok || !res.asistente) {
            alert(res.msg || 'No se pudo agregar asistente');
            return;
        }
        fetch('php/agregar_asistente_formulario.php', {
            method: 'POST',
            body: new URLSearchParams({
                id_formulario: idFormulario,
                id_asistente: res.asistente.id,
                estado: estado
            })
        })
        .then(r => r.json())
        .then(resp => {
            if (resp.ok) {
                document.getElementById('ced-cap-erc').value = '';
                document.getElementById('nom-capacitado-erc').value = '';
                document.getElementById('nom-capacitado-erc').dataset.empresa = '';
                document.getElementById('s-aprobacion-erc').value = '';
                // Recarga la tabla asistentes
                fetch('php/obtener_formulario.php?id=' + idFormulario)
                    .then(r => r.json())
                    .then(data2 => actualizarTablaAsistentesEd(data2.asistentes, idFormulario));
            } else {
                alert(resp.msg || 'No se pudo agregar asistente');
            }
        });
    });
};