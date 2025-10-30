document.addEventListener('DOMContentLoaded', function () {
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');

    // Colaborador
    registerForm.addEventListener('submit', function (e) {
        e.preventDefault();
        const usuario = document.getElementById('Ingreso_cedula').value.trim();
        const contrasena = document.getElementById('Password-colaborador').value;

        enviarLogin({
            tipo: 'colaborador',
            usuario,
            contrasena
        });
    });

    // Administrador
    loginForm.addEventListener('submit', function (e) {
        e.preventDefault();
        const usuario = document.getElementById('Ingreso_Usuario').value.trim();
        const contrasena = document.getElementById('exampleInputPassword').value;

        enviarLogin({
            tipo: 'administrador',
            usuario,
            contrasena
        });
    });

    function enviarLogin({ tipo, usuario, contrasena }) {
        if (!usuario || !contrasena) {
            alert('Por favor complete todos los campos.');
            return;
        }

        fetch('php/login.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({ tipo, usuario, contrasena })
        })
        .then(res => res.json())
        .then(data => {
            if (data.exito) {
                localStorage.setItem('usuario', data.usuario);
                localStorage.setItem('nombre1', data.nombre1);
                window.location.href = 'panel.html';
            } else {
                alert(data.mensaje);
            }
        })
        .catch((err) => {
            console.error('Error:', err);
            alert('Error de conexión.');
        });
    }
});
