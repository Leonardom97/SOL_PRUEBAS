function handleSidebarRoles() {
    const idRol = localStorage.getItem('id_rol');

    // Primero, intenta mostrar todo
    document.getElementById('item_admin')?.classList.remove('d-none');
    document.getElementById('link_formulario')?.classList.remove('d-none');

    if (idRol === '1') {
        // Administrador: ve todo
        return;
    }
    if (idRol === '2') {
        // Capacitador: oculta solo "Administrador"
        document.getElementById('item_admin')?.classList.add('d-none');
        // Formulario SI visible
        return;
    }
    if (idRol === '3') {
        // Usuario: oculta "Administrador" y "Formulario"
        document.getElementById('item_admin')?.classList.add('d-none');
        document.getElementById('link_formulario')?.classList.add('d-none');
        return;
    }
    // Otros/no definido: oculta ambos
    document.getElementById('item_admin')?.classList.add('d-none');
    document.getElementById('link_formulario')?.classList.add('d-none');
}