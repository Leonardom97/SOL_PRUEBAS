document.addEventListener('DOMContentLoaded', function () {
    // 1. Cargar datos del usuario
    fetch('php/usuario_actual.php', { credentials: 'include' })
        .then(r => r.json())
        .then(data => {
            document.querySelector('.text-dark.mb-4').textContent = `USUARIO:(${data.id_usuario})`;
            document.getElementById('rol_txt').value = data.rol_nombre;
            document.getElementById('usuario_txt').value = data.id;
            document.getElementById('nombre_usr').value = [data.nombre1, data.nombre2].filter(Boolean).join(' ');
            document.getElementById('apellido_usr').value = [data.apellido1, data.apellido2].filter(Boolean).join(' ');
            document.getElementById('cedula_usr').value = data.cedula;
            document.getElementById('id_u').value = data.id_usuario;
            // Cargar avatar desde carpeta
            document.getElementById('imagenPerfil').src = `assets/img/avatars/${data.avatar || 'avatar1.jpeg'}?t=${Date.now()}`;
            document.getElementById('inputFotoPerfil').dataset.id_usuario = data.id_usuario;
        });

    // 2. Cargar estadísticas de capacitaciones
    fetch('php/capacitaciones_usuario.php')
        .then(r => r.json())
        .then(stats => {
            let realizadas = parseInt(stats.realizadas) || 0;
            let total = parseInt(stats.total) || 1;
            let porcentaje = Math.round((realizadas / total) * 100);
            document.getElementById('capacitaciones_realizadas').textContent = realizadas;
            const barra = document.getElementById('barra_capacitaciones');
            barra.style.width = porcentaje + '%';
            barra.setAttribute('aria-valuenow', porcentaje);
            barra.querySelector('.visually-hidden').textContent = porcentaje + '%';
        });

    // 3. Cambiar imagen de perfil
    window.cambiarImagenPerfil = function (event) {
        const file = event.target.files[0];
        if (!file) return;
        const id_usuario = document.getElementById('inputFotoPerfil').dataset.id_usuario;
        const formData = new FormData();
        formData.append('avatar', file);
        formData.append('id_usuario', id_usuario);

        fetch('php/cambiar_avatar.php', {
            method: 'POST',
            body: formData,
            credentials: 'include'
        })
        .then(r => r.json())
        .then(res => {
            if (res.ok) {
                // Refresca la imagen de perfil y la del navbar
                fetch('php/usuario_actual.php', { credentials: 'include' })
                .then(r => r.json())
                .then(data => {
                    document.getElementById('imagenPerfil').src = `assets/img/avatars/${data.avatar || 'avatar1.jpeg'}?t=${Date.now()}`;
                    const navbarAvatar = document.getElementById('navbar_avatar');
                    if (navbarAvatar) {
                        navbarAvatar.src = `assets/img/avatars/${data.avatar || 'avatar1.jpeg'}?t=${Date.now()}`;
                    }
                });
            } else {
                alert('Error al actualizar la imagen: ' + (res.error || 'Error desconocido'));
                console.error(res);
            }
        })
        .catch(err => {
            alert('Error de conexión al actualizar la imagen');
            console.error(err);
        });
    };
});