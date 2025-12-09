// mis_evaluaciones.js

document.addEventListener('DOMContentLoaded', function () {
    const user = window.getCurrentUser();
    // Verificar usuario_id en lugar de id
    if (user && (user.usuario_id || user.id)) {
        loadPendingEvaluations();
    } else {
        // Esperar a que auth_guard termine
        document.addEventListener('auth_checked', function (e) {
            loadPendingEvaluations();
        });
    }
});

function loadPendingEvaluations() {
    // Obtener ID del colaborador de la sesión
    const userData = window.getCurrentUser();
    
    // Normalizar ID (puede venir como id o usuario_id)
    const userId = userData.usuario_id || userData.id;

    if (!userData || !userId) {
        console.error('No se pudo identificar al usuario');
        return;
    }
    
    const cedula = userData.cedula || userData.usuario;
    const url = `assets/php/evaluacion_api.php?action=get_pending_evaluations&id_colaborador=${userId}&cedula=${cedula}`;
    
    fetch(url)
        .then(res => {
            if (!res.ok) throw new Error(`HTTP Error ${res.status}`);
            return res.json();
        })
        .then(data => {
            const tbody = document.getElementById('tbody-mis-evaluaciones');
            const noData = document.getElementById('no-data-message');

            if (!tbody) return;
            tbody.innerHTML = '';

            if (data.success && Array.isArray(data.data) && data.data.length > 0) {
                if (noData) noData.style.display = 'none';
                
                data.data.forEach(item => {
                    try {
                        const tr = document.createElement('tr');
                        tr.innerHTML = `
                            <td>${item.tema || 'Sin tema'}</td>
                            <td>${formatDate(item.fecha_capacitacion)}</td>
                            <td>${item.titulo || 'Evaluación'}</td>
                            <td>${formatDate(item.fecha_fin_activa, true)}</td>
                            <td>
                                <a href="realizar_evaluacion.html?id_formulario=${item.id_formulario}&id_header=${item.id_header}" class="btn btn-primary btn-sm">
                                    <i class="fas fa-pen-alt"></i> Realizar
                                </a>
                            </td>
                        `;
                        tbody.appendChild(tr);
                    } catch (e) {
                        console.error('Error renderizando fila:', e);
                    }
                });
            } else {
                if (noData) noData.style.display = 'block';
            }
        })
        .catch(err => {
            console.error('Error cargando evaluaciones:', err);
        });
}

function formatDate(dateString, isEndDate = false) {
    if (!dateString) return isEndDate ? 'Indefinido' : '-';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '-';
    return date.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
}
