document.addEventListener("DOMContentLoaded", function () {
    // Cargar sidebar.html en #sidebar-container
    fetch("src/sidebar.html")
        .then(res => res.text())
        .then(html => {
            document.getElementById("sidebar-container").innerHTML = html;
            handleSidebarRoles(); // APLICA PERMISOS AQUÍ, después de insertar el sidebar
        });

    // Cargar navbar.html en #navbar-container y mostrar el usuario
    fetch("src/navbar.html")
        .then(res => res.text())
        .then(html => {
            document.getElementById("navbar-container").innerHTML = html;
            // Mostrar el usuario en el navbar
            const usuario = localStorage.getItem('usuario') || '';
            const navbarUsername = document.getElementById('navbar_username');
            if (navbarUsername) {
                navbarUsername.textContent = usuario || 'usuario';
            }
        });
});