// Reemplaza el texto de los botones del toolbar con íconos
    function aplicarIconosToolbar() {
      $('.fixed-table-toolbar .dropdown-toggle').each(function () {
        const $btn = $(this);
        const text = $btn.text().trim();

        if ($btn.closest('.export').length) {
          $btn.html('<i class="fa-solid fa-download me-1"></i> ');
        } else if ($btn.closest('.columns').length) {
          $btn.html('<i class="fa-solid fa-list me-1"></i> ');
        }
      });
    }

    // Verifica si hay filtros activos para habilitar o deshabilitar el botón de limpiar filtros
    function verificarFiltros() {
      let hayFiltro = false;
      $('.filter-control input').each(function () {
        if ($(this).val()) {
          hayFiltro = true;
          return false;
        }
      });
      $('#clearFilters').prop('disabled', !hayFiltro);
    }

    // Funciones que se ejecutan al cargar el DOM
    $(function () {
      // Inicializa la tabla en español
      $('#table').bootstrapTable({ locale: 'es-ES' });

      // Cambia el tipo de exportación según selección
      $('#exportOption').on('change', function () {
        const exportType = $(this).val();
        $('#table').bootstrapTable('refreshOptions', {
          exportDataType: exportType
        });
      });

      // Acción del botón limpiar filtros
      $('#clearFilters').click(function () {
        let hayFiltro = false;
        $('.filter-control input').each(function () {
          if ($(this).val()) {
            hayFiltro = true;
            return false;
          }
        });

        if (hayFiltro) {
          $('#table').bootstrapTable('clearFilterControl');
          $('#table').bootstrapTable('refreshOptions', { searchText: '' });
          $('#clearFilters').prop('disabled', true);
        }
      });

      // Detecta cambios en los filtros y actualiza el estado del botón
      $(document).on('input', '.filter-control input', verificarFiltros);

      // Aplica los íconos al toolbar luego de que se genera dinámicamente
      setTimeout(aplicarIconosToolbar, 500);
      $(document).on('click', '.fixed-table-toolbar .dropdown-toggle', () => {
        setTimeout(aplicarIconosToolbar, 100);
      });
    });