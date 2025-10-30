document.addEventListener('DOMContentLoaded', function () {
    // Login Colaborador
    const colaboradorForm = document.getElementById('registerForm');
    if (colaboradorForm) {
        colaboradorForm.addEventListener('submit', function (e) {
            e.preventDefault();
            const data = new FormData(colaboradorForm);

            fetch('php/login_colaborador.php', {
                method: 'POST',
                body: data
            })
            .then(res => res.json())
            .then(res => {
                if (res.success) {
                    window.location.href = res.redirect;
                } else {
                    alert(res.message || 'Error al iniciar sesión como colaborador.');
                }
            })
            .catch(err => {
                alert("Error de conexión con el servidor (colaborador).");
                console.error(err);
            });
        });
    }

    // Login Administrador
    const adminForm = document.getElementById('loginForm');
    if (adminForm) {
        adminForm.addEventListener('submit', function (e) {
            e.preventDefault();

            const data = new FormData(adminForm);
            const cedula = data.get('Ingreso_user')?.trim();
            const password = data.get('password')?.trim();

            if (!cedula || !password) {
                alert("La cédula y la contraseña son obligatorias");
                return;
            }

            fetch('php/login_admin.php', {
                method: 'POST',
                body: data
            })
            .then(res => res.json())
            .then(res => {
                if (res.success) {
                    window.location.href = res.redirect;
                } else {
                    alert(res.message || 'Error al iniciar sesión como administrador.');
                }
            })
            .catch(err => {
                alert("Error de conexión con el servidor (admin).");
                console.error(error);
            });
        });
    }
});
