document.addEventListener('DOMContentLoaded', function () {
    // Cargar roles para ambos modales
    fetch('php/roles-listar.php')
        .then(res => res.json())
        .then(roles => {
            ['rol-ru', 'rol-eru'].forEach(id => {
                const sel = document.getElementById(id);
                if (sel) {
                    sel.innerHTML = '<option value="">Rol</option>';
                    roles.forEach(role => {
                        const opt = document.createElement('option');
                        opt.value = role.id;
                        opt.textContent = role.nombre.charAt(0).toUpperCase() + role.nombre.slice(1);
                        sel.appendChild(opt);
                    });
                }
            });
        });

    const modalRu = document.getElementById('modal-ru');
    const btnGuardarRu = document.getElementById('guardar-ru');
    const formRu = modalRu ? modalRu.querySelector('form') : null;

    if (formRu && btnGuardarRu) {
        btnGuardarRu.addEventListener('click', function () {
            const cedula = formRu.querySelector('#cedula-ru').value.trim();
            const rol = formRu.querySelector('#rol-ru').value;
            const id_usuario = formRu.querySelector('#usuario-ru').value.trim();
            const nombre1 = formRu.querySelector('#nombre1-ru').value.trim();
            const nombre2 = formRu.querySelector('#nombre2-ru').value.trim();
            const apellido1 = formRu.querySelector('#apellido1-ru').value.trim();
            const apellido2 = formRu.querySelector('#apellido2-ru').value.trim();
            const password = formRu.querySelector('#pass').value;
            const passwordConf = formRu.querySelector('#passconf').value;

            let valido = true;
            let msg = "";
            [cedula, rol, id_usuario, nombre1, nombre2, apellido1, apellido2, password, passwordConf].forEach(val => {
                if (!val) valido = false;
            });
            if (!valido) msg = "Completa todos los campos.";
            else if (password !== passwordConf) {
                valido = false; msg = "Las contraseñas no coinciden.";
            }
            if (!valido) { alert(msg); return; }

            const usuario = {
                cedula: cedula,
                id_rol: rol,
                id_usuario: id_usuario,
                nombre1: nombre1,
                nombre2: nombre2,
                apellido1: apellido1,
                apellido2: apellido2,
                contraseña: password,
                avatar: "avatar1.jpeg"
            };

            fetch('php/usuarios-crear.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(usuario)
            })
                .then(res => res.json())
                .then(respuesta => {
                    if (respuesta.success) {
                        var bootstrapModal = bootstrap.Modal.getInstance(modalRu);
                        bootstrapModal.hide();
                        formRu.reset();
                        alert("Usuario registrado con éxito");
                        if (window.recargarUsuarios) window.recargarUsuarios();
                    } else {
                        alert(respuesta.message || "Ocurrió un error al registrar el usuario");
                    }
                })
                .catch(() => {
                    alert("Error de conexión al servidor");
                });
        });

        modalRu.addEventListener('hidden.bs.modal', function () {
            formRu.reset();
        });
    }
});