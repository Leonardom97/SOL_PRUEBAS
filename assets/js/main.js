document.addEventListener("DOMContentLoaded", async () => {
    // Cargar navbar y sidebar using absolute paths
    await includeComponent("/includes/navbar.html", "#navbar");
    await includeComponent("/includes/sidebar.html", "#sidebar");

    document.dispatchEvent(new Event('components_loaded'));

    // Verificar sesión
    try {
        const res = await fetch("/php/verificar_sesion.php");
        const data = await res.json();

        if (!data.success) {
            window.location.href = "/index.html";
            return;
        }

        // Mostrar/ocultar enlaces según roles
        const roles = Array.isArray(data.roles) ? data.roles : [data.rol]; // compatibilidad
        if (roles.includes("admin")) {
            document.querySelectorAll(".menu-admin").forEach(e => e.classList.remove("d-none"));
        }
        if (roles.includes("editor")) {
            document.querySelectorAll(".menu-editor").forEach(e => e.classList.remove("d-none"));
        }
        if (roles.includes("capacitador")) {
            document.querySelectorAll(".menu-capacitador").forEach(e => e.classList.remove("d-none"));
        }

        // Note: Logout button is now handled by navbar.js
    } catch (error) {
        console.error("Error al verificar sesión:", error);
        window.location.href = "/index.html";
    }
});

async function includeComponent(file, selector) {
    try {
        // Cache busting to ensure we get the latest version (fixes flicker if cached)
        const version = new Date().getTime();
        const res = await fetch(`${file}?v=${version}`);
        if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
        const html = await res.text();
        const element = document.querySelector(selector);
        if (element) element.innerHTML = html;
    } catch (err) {
        console.error(`Error al incluir ${file}:`, err);
        // Removed alert to prevent user annoyance on refresh
    }
}
