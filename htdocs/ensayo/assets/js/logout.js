// logout.js: Borra la sesión y redirige al login al pulsar "Cerrar sesión"
document.addEventListener('DOMContentLoaded', function() {
    document.addEventListener('click', function(e) {
        // Delegación para soportar carga dinámica
        if (e.target && (e.target.id === 'logout_btn' || e.target.closest('#logout_btn'))) {
            e.preventDefault();
            localStorage.clear();
            window.location.href = 'index.html';
        }
    });
});