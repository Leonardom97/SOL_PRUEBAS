// auth-guard.js: Controla el acceso a páginas protegidas y sincroniza logout global

document.addEventListener('DOMContentLoaded', function() {
    const usuario = localStorage.getItem('usuario');
    const rol = localStorage.getItem('rol_nombre'); // Ej: "administrador", "capacitador", "usuario"

    // Si no hay sesión, redirige al login
    if (!usuario) {
        window.location.href = 'index.html';
        return;
    }

    // Normaliza y decodifica el path
    const path = decodeURIComponent(window.location.pathname).toLowerCase();

    // Control de acceso específico para formulario.html (solo admin o capacitador)
    if (path.endsWith('formulario.html')) {
        if (rol !== 'administrador' && rol !== 'capacitador') {
            window.location.href = 'panel.html';
            return;
        }
    }

    // Control de acceso específico para edusuarios.html (solo admin)
    if (path.endsWith('edusuarios.html')) {
        if (rol !== 'administrador') {
            window.location.href = 'panel.html';
            return;
        }
    }
    // Control de acceso específico para eddatos.html (solo admin)
    if (path.endsWith('eddatos.html')) {
        if (rol !== 'administrador') {
            window.location.href = 'panel.html';
            return;
        }
    }
});

// Este listener permite cerrar la sesión globalmente en todas las pestañas
window.addEventListener('storage', function(event) {
    if (event.key === 'usuario' && event.newValue === null) {
        window.location.href = 'index.html';
    }
});