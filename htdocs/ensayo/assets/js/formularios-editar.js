document.addEventListener('DOMContentLoaded', function () {
    // Editar formulario al hacer click en .btn-edit
    document.addEventListener('click', function (e) {
        const btn = e.target.closest('.btn-edit');
        // Asegúrate que el botón abre el modal de editar formulario, NO el de usuarios
        if (btn && btn.dataset.id && btn.dataset.modal === "formulario") {
            const id = btn.dataset.id;
            fetch(`php/formulario-obtener.php?id=${id}`)
                .then(res => res.json())
                .then(f => {
                    document.getElementById('id_formulario-edf').value = f.id || '';
                    document.getElementById('id_proceso-edf').value = f.id_proceso || '';
                    document.getElementById('id_lugar-edf').value = f.id_lugar || '';
                    document.getElementById('id_usuario-edf').value = f.id_usuario || '';
                    document.getElementById('id_tipo_actividad-edf').value = f.id_tipo_actividad || '';
                    document.getElementById('id_tema-edf').value = f.id_tema || '';
                    document.getElementById('hora_inicio-edf').value = f.hora_inicio || '';
                    document.getElementById('hora_final-edf').value = f.hora_final || '';
                    document.getElementById('fecha-edf').value = f.fecha || '';
                    document.getElementById('observaciones-edf').value = f.observaciones || '';
                    // Abre el modal
                    let modal = bootstrap.Modal.getOrCreateInstance(document.getElementById('modal-edf-formulario'));
                    modal.show();
                })
                .catch(() => {
                    alert("No se pudo cargar la información del formulario.");
                });
        }
    });
});