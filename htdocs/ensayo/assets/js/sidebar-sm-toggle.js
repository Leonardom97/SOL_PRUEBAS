(function() {

    // Devuelve true si la pantalla es sm/md
    function isSM() {
        return window.innerWidth < 992;
    }

    function showSidebar() {
        var sidebar = document.querySelector('.sidebar');
        if (sidebar) {
            sidebar.style.display = 'block';
        }
    }

    function hideSidebar() {
        var sidebar = document.querySelector('.sidebar');
        if (sidebar) {
            sidebar.style.display = 'none';
        }
    }

    function toggleSidebar() {
        var sidebar = document.querySelector('.sidebar');
        if (!sidebar) return;
        // Usamos getComputedStyle para detectar correctamente el estado
        if (getComputedStyle(sidebar).display === 'none') {
            showSidebar();
        } else {
            hideSidebar();
        }
    }

    // Ajusta el sidebar cuando cambias el tamaño de ventana
    function setInitialSidebar() {
        var sidebar = document.querySelector('.sidebar');
        if (!sidebar) return;
        if (isSM()) {
            hideSidebar();
        } else {
            sidebar.style.display = 'block';
        }
    }

    // Escucha cambios de tamaño de ventana
    window.addEventListener('resize', setInitialSidebar);

    // Al cargar la página
    document.addEventListener('DOMContentLoaded', function() {
        setInitialSidebar();

        // Asegúrate de que el botón exista antes de asignar el evento
        document.body.addEventListener('click', function(e) {
            var btn = e.target.closest('#sidebarToggleTop');
            if (btn && isSM()) {
                toggleSidebar();
                e.preventDefault();
            }
        });
    });

})();