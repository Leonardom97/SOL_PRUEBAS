document.addEventListener('DOMContentLoaded', function() {
    // Mostrar tarjetas según rol
    const idRol = localStorage.getItem('id_rol');
    // Solo admin (1) y capacitador (2) ven inserción datos
    if (idRol === '1' || idRol === '2') {
        document.getElementById('card_inser_datos').style.display = '';
        fetch('php/contar_formularios.php')
            .then(res => res.json())
            .then(data => {
                document.getElementById('total_formularios').innerText = data.total ?? '0';
            });
    }
    // Solo admin (1) ve registro usuarios
    if (idRol === '1') {
        document.getElementById('card_registro_usuarios').style.display = '';
        fetch('php/contar_usuarios.php')
            .then(res => res.json())
            .then(data => {
                document.getElementById('total_usuarios').innerText = data.total ?? '0';
            });
    }
    // Card capacitaciones general (visible por todos)
    const TOTAL_CAPACITACIONES = 500; // Cambia este número si tu meta es diferente
    fetch('php/contar_formularios.php')
        .then(res => res.json())
        .then(data => {
            const total = parseInt(data.total) || 0;
            const porcentaje = Math.round((total / TOTAL_CAPACITACIONES) * 100);
            document.getElementById('cantidad_capacitaciones').innerText = total;
            const barra = document.getElementById('barra_capacitaciones');
            barra.style.width = (porcentaje > 100 ? 100 : porcentaje) + '%';
            barra.setAttribute('aria-valuenow', porcentaje > 100 ? 100 : porcentaje);
            document.getElementById('porcentaje_capacitaciones').textContent = `${porcentaje > 100 ? 100 : porcentaje}%`;
        });
    // Mostrar las 3 últimas capacitaciones (visible para todos)
    fetch('php/ultimas_capacitaciones.php')
        .then(res => res.json())
        .then(data => {
            const tbody = document.getElementById('tabla_ultimas_capacitaciones');
            tbody.innerHTML = '';
            if (Array.isArray(data) && data.length > 0) {
                data.forEach(row => {
                    tbody.innerHTML += `
                        <tr style="border-style: none;">
                            <td style="border-top-left-radius: 6px;border-style: none;border-bottom-left-radius: 6px;">${row.nombre}</td>
                            <td style="border-style: none;">${row.fecha}</td>
                            <td style="border-style: none;border-top-right-radius: 6px;border-bottom-right-radius: 6px;">${row.asistentes}</td>
                        </tr>
                    `;
                });
            } else {
                tbody.innerHTML = '<tr><td colspan="3" class="text-center">Sin registros</td></tr>';
            }
        });
});