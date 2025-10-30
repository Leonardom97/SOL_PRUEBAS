function handleSidebarRoles() {
    const idRol = localStorage.getItem('id_rol');
    // Admin: ve todo
    if (idRol !== '1') {
        document.getElementById('item_admin')?.classList.add('d-none');
    }
    // Capacitaciones
    if (idRol === '1' || idRol === '2') {
        // Admin y capacitador: ven todo
    } else if (idRol === '3') {
        // Usuario: solo ve "Consulta"
        document.getElementById('link_formulario')?.classList.add('d-none');
    } else {
        // Rol desconocido: oculta admin y capacitaciones
        document.getElementById('item_admin')?.classList.add('d-none');
        document.getElementById('item_capacitaciones')?.classList.add('d-none');
    }
}