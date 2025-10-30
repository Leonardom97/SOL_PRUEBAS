document.addEventListener('DOMContentLoaded', function() {
    fetch('php/usuario_actual.php')
        .then(res => {
            if (!res.ok) throw new Error('No autenticado');
            return res.json();
        })
        .then(usuario => {
            // Coloca el nombre completo del usuario
            document.getElementById('navbar_username').textContent =
                (usuario.nombre1 ? usuario.nombre1 : '') +
                (usuario.apellido1 ? ' ' + usuario.apellido1 : '');

            // Coloca el avatar
            document.getElementById('navbar_avatar').src = usuario.avatar_url;
        })
        .catch(() => {
            document.getElementById('navbar_username').textContent = "usuario";
            document.getElementById('navbar_avatar').src = "assets/img/default-avatar.png";
        });

    // Activar logout seguro
    function activarLogout() {
        const logoutBtn = document.getElementById('logout_btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', function(e) {
                e.preventDefault();
                localStorage.clear();
                sessionStorage.clear();
                window.location.href = 'index.html';
            });
            return true;
        }
        return false;
    }
    if (!activarLogout()) {
        const interval = setInterval(() => {
            if (activarLogout()) clearInterval(interval);
        }, 200);
    }
});