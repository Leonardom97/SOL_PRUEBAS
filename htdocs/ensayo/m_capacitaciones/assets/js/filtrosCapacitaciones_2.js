// Datos para el filtro de situación
window.situacionFilterData = {
  "Aprobó": "Aprobó",
  "No Aprobó": "No Aprobó"
};

function aplicarIconosToolbar() {
  $('.fixed-table-toolbar .dropdown-toggle').each(function () {
    const $btn = $(this);
    if ($btn.closest('.export').length) {
      $btn.html('<i class="fa-solid fa-download me-1"></i>');
    } else if ($btn.closest('.columns').length) {
      $btn.html('<i class="fa-solid fa-list me-1"></i>');
    }
  });
}

function verificarFiltros() {
  let hayFiltro = false;
  $('.filter-control input, .filter-control select').each(function () {
    if ($(this).val()) {
      hayFiltro = true;
      return false;
    }
  });
  $('#clearFilters').prop('disabled', !hayFiltro);
}

function inicializarTabla() {
  $('#table').bootstrapTable({
    locale: 'es-ES',
    filterControl: true,
    search: true,
    pagination: true,
    pageSize: 10,
    showColumns: true,
    showExport: true,
    clickToSelect: true,
    exportTypes: ['csv', 'excel'],
    exportDataType: 'all',
    exportOptions: { fileName: 'capacitaciones' },
    toolbar: '#toolbar',
    filterControlContainer: '',

    formatShowingRows: (from, to, total) => `Mostrando ${from} a ${to} de ${total} filas`,
    formatRecordsPerPage: (num) => `${num} filas por página`,
    formatSearch: () => 'Buscar',
    formatNoMatches: () => 'No se encontraron resultados',
    formatAllRows: () => 'Todos',
    formatClearSearch: () => 'Limpiar búsqueda'
  });

  setTimeout(aplicarIconosToolbar, 500);
}

$(function () {
  // Inicializar tabla por primera vez
  inicializarTabla();

  // Cambio de opción de exportación
  $('#exportOption').on('change', function () {
    const exportType = $(this).val();
    $('#table').bootstrapTable('refreshOptions', {
      exportDataType: exportType
    });
  });

  // Limpia filtros de columnas al escribir en búsqueda general
  $(document).on('input', '.fixed-table-toolbar .search input', function () {
    $('.filter-control').find('input, select').each(function () {
      $(this).val('');
      $(this).trigger('change');
    });

    $('#clearFilters').prop('disabled', true);
    $('#table').bootstrapTable('clearFilterControl');
  });

  // 🧹 Limpia filtros y búsqueda global desde botón
  $('#clearFilters').click(function () {
    // Limpiar filtros por columna
    $('.filter-control').find('input, select').each(function () {
      $(this).val('');
      $(this).trigger('change');
    });

    // Limpiar búsqueda global
    $('.fixed-table-toolbar .search input').val('');

    // Limpiar filtros de Bootstrap Table
    $('#table').bootstrapTable('clearFilterControl');

    // Refrescar tabla sin búsqueda
    $('#table').bootstrapTable('refreshOptions', {
      searchText: ''
    });

    // Desactivar botón
    $('#clearFilters').prop('disabled', true);

    // ✅ Reparar bug de select reinicializando la tabla
    $('#table').bootstrapTable('destroy');
    setTimeout(() => {
      inicializarTabla();
    }, 100);
  });

  // Activar/desactivar botón según filtros activos
  $(document).on('input change', '.filter-control input, .filter-control select', verificarFiltros);

  // Volver a aplicar iconos tras interactuar con dropdowns
  $(document).on('click', '.fixed-table-toolbar .dropdown-toggle', () => {
    setTimeout(aplicarIconosToolbar, 100);
  });
});
