/**
 * Component Loader
 * Carga dinámicamente el sidebar y el navbar en los placeholders correspondientes.
 */
document.addEventListener("DOMContentLoaded", async () => {
    // Cargar componentes
    await Promise.all([
        includeComponent("/includes/navbar.html", "#navbar"),
        includeComponent("/includes/sidebar.html", "#sidebar")
    ]);

    // Despachar evento para indicar que los componentes se han cargado
    document.dispatchEvent(new Event('components_loaded'));
});

async function includeComponent(file, selector) {
    const element = document.querySelector(selector);
    if (!element) return;

    try {
        const res = await fetch(file);
        if (!res.ok) throw new Error(`Failed to load ${file}: ${res.status} ${res.statusText}`);
        const html = await res.text();
        element.innerHTML = html;
    } catch (err) {
        console.error(`Error al incluir ${file}:`, err);
        element.innerHTML = `<div class="alert alert-danger">Error loading ${file}</div>`;
    }
}
