(function () {
  // Columnas esperadas en la tabla y formulario
  const columnas = [
    'mantenimientos_id', 'fecha', 'responsable', 'plantacion', 'finca', 'siembra', 'lote', 'parcela', 'labor_especifica',
    'observacion', 'contratista', 'codigo', 'colaborador', 'personas', 'hora_entrada',
    'hora_salida', 'linea_entrada', 'linea_salida', 'cantidad', 'unidad', 'maquina',
    'tractorista', 'nuevo_operario', 'verificacion' // en minúsculas
  ];

  let allData = [];
  let currentPage = 1;
  let pageSize = 25;
  let filtros = {};
  let ordenColumna = null;
  let ordenAsc = true;

  let currentEditingId = null;

  function getRoles() {
    return (document.body.getAttribute('data-role') || '')
      .toLowerCase()
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);
  }
  // admin-estricto = tiene 'administrador' y no tiene ningún rol que incluya 'aux'
  function esAdminStrict() {
    const roles = getRoles();
    const hasAdmin = roles.includes('administrador');
    const hasAux = roles.some(r => r.includes('aux'));
    return hasAdmin && !hasAux;
  }

  async function fetchData(page = 1, pageSize = 25, filtros = {}, ordenCol = null, ordenAsc = true) {
    const params = new URLSearchParams({ page, pageSize });
    if (ordenCol) {
      params.append('ordenColumna', ordenCol);
      params.append('ordenAsc', ordenAsc ? '1' : '0');
    }
    for (const key in filtros) {
      if (filtros[key]) params.append(`filtro_${key}`, filtros[key]);
    }
    const endpoint = `assets/php/conexion_mantenimientos.php?${params}`;
    const resp = await fetch(endpoint, { cache: 'no-store' });
    if (!resp.ok) throw new Error('Error al cargar mantenimientos');
    return await resp.json();
  }

  function renderTabla(datos) {
    const fechaCorte = localStorage.getItem("fecha_corte");
    const tbody = document.getElementById('tbody-mantenimientos');
    if (!tbody) return;

    tbody.innerHTML = '';
    datos.forEach((row, idx) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td><input type="checkbox" class="fila-tabla2-chk fila-mantenimientos-chk md-checkbox" data-row="${idx}"></td>`;
      columnas.forEach(col => {
        const td = document.createElement('td');
        if (col.toLowerCase() === 'verificacion') {
          const valor = (row.Verificacion ?? row.verificacion ?? '').toString().toLowerCase();
          if (valor === 'aprobado' || valor === 'aprobada') {
            td.innerHTML = `
              <div style="display:inline-block;position:relative;">
                <span style="display:flex;align-items:center;justify-content:center;width:32px;height:32px;border:2px solid #8B3131;border-radius:50%;background:#fff;">
                  <i class="fa fa-check-double" style="color:#8B3131;font-size:18px;"></i>
                </span>
              </div>
            `;
          } else {
            td.innerHTML = `
              <div style="display:inline-block;position:relative;">
                <span style="display:flex;align-items:center;justify-content:center;width:32px;height:32px;border:2px solid #8B3131;border-radius:50%;background:#fff;">
                  <i class="fa fa-check-double" style="color:#8B3131;font-size:18px;"></i>
                </span>
                <span style="
                  position:absolute;top:-8px;right:-8px;
                  background:#F8BB2C;color:#fff;border-radius:50%;width:18px;height:18px;
                  display:flex;align-items:center;justify-content:center;font-size:12px;
                  border:2px solid #fff;
                ">
                  <i class="fa fa-clock" style="color:#fff;font-size:12px;"></i>
                </span>
              </div>
            `;
          }
        } else {
          td.textContent = row[col] ?? row[col.toLowerCase()] ?? '';
        }
        tr.appendChild(td);
      });

      const fechaFila = row['fecha'] || row['Fecha'] || "";
      let btnEditar = "", btnEstado = "";
      if (fechaCorte && fechaFila) {
        if (fechaFila < fechaCorte) {
          btnEstado = `<button class="md-btn md-btn-icon" title="Inactivo" disabled><i class="fa fa-lock"></i></button>`;
        } else {
          btnEditar = `<button class="md-btn md-btn-icon btn-editar" title="Editar" data-id="${row.mantenimientos_id ?? row.mantenimiento_id ?? row.id ?? ''}"><i class="fa fa-pen"></i></button>`;
        }
      } else {
        btnEditar = `<button class="md-btn md-btn-icon btn-editar" title="Editar" data-id="${row.mantenimientos_id ?? row.mantenimiento_id ?? row.id ?? ''}"><i class="fa fa-pen"></i></button>`;
        btnEstado = `<button class="md-btn md-btn-icon" title="Sin fecha de corte" disabled><i class="fa fa-question"></i></button>`;
      }
      const acciones = `
        ${btnEditar}
        <button class="md-btn md-btn-icon btn-visualizar" title="Visualizar" data-id="${row.mantenimientos_id ?? row.mantenimiento_id ?? row.id ?? ''}"><i class="fa fa-eye"></i></button>
        ${btnEstado}
      `;
      const tdAcciones = document.createElement('td');
      tdAcciones.style = 'display:inline-flex; align-items:center;';
      tdAcciones.innerHTML = acciones;
      tr.appendChild(tdAcciones);

      tbody.appendChild(tr);
    });

    // Acciones de botones
    tbody.querySelectorAll('.btn-editar').forEach(btn => {
      btn.onclick = function () {
        const id = this.getAttribute("data-id");
        const registro = allData.find(row => String(row.mantenimientos_id ?? row.mantenimiento_id ?? row.id ?? '') === String(id));
        if (registro) abrirModal(registro, false);
      };
    });
    tbody.querySelectorAll('.btn-visualizar').forEach(btn => {
      btn.onclick = function () {
        const id = this.getAttribute("data-id");
        const registro = allData.find(row => String(row.mantenimientos_id ?? row.mantenimiento_id ?? row.id ?? '') === String(id));
        if (registro) abrirModal(registro, true);
      };
    });
  }

  function abrirModal(rowData, soloLectura = false) {
    currentEditingId = rowData.mantenimientos_id ?? rowData.mantenimiento_id ?? rowData.id ?? null;

    const contCampos = document.getElementById('campos-formulario');
    if (contCampos) {
      const campos = columnas.map(col => {
        const readonly = (col === 'mantenimientos_id' || col === 'codigo' || soloLectura) ? "readonly" : "";
        const val = rowData[col] ?? rowData[col?.toLowerCase?.() ?? ''] ?? '';
        return `
          <div class="col-md-6 mb-3">
            <label class="form-label">${col.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</label>
            <input type="text" class="form-control" name="${col}" value="${val}" ${readonly}>
          </div>
        `;
      }).join('');
      contCampos.innerHTML = campos;
    }

    const modalFooter = document.querySelector('#modal-editar .modal-footer');
    if (modalFooter) {
      const btnSubmit = modalFooter.querySelector('button[type="submit"]');
      if (btnSubmit) btnSubmit.style.display = soloLectura ? 'none' : '';
    }

    const modalEl = document.getElementById('modal-editar');
    if (modalEl && window.bootstrap?.Modal) {
      const modal = bootstrap.Modal.getOrCreateInstance(modalEl);
      modal.show();
    }
  }

  async function renderPagina() {
    const data = await fetchData(currentPage, pageSize, filtros, ordenColumna, ordenAsc);
    allData = data.datos || [];
    renderTabla(allData);
  }

  document.addEventListener('DOMContentLoaded', () => {
    const select = document.getElementById('limitSelect2');
    if (select) {
      select.addEventListener('change', function () {
        pageSize = parseInt(this.value, 10) || 25;
        currentPage = 1;
        renderPagina();
      });
    }

    const filtrosInputs = document.querySelectorAll('#tabla-reuniones thead input[data-col]');
    filtrosInputs.forEach(input => {
      input.addEventListener('input', function () {
        filtros[this.dataset.col] = this.value;
        currentPage = 1;
        renderPagina();
      });
    });

    const btnClear = document.getElementById('clearFiltersBtn2');
    if (btnClear) {
      btnClear.addEventListener('click', () => {
        filtrosInputs.forEach(input => input.value = '');
        filtros = {};
        currentPage = 1;
        renderPagina();
      });
    }

    const selectAll = document.getElementById('selectAll2');
    if (selectAll) {
      selectAll.addEventListener('change', function() {
        document.querySelectorAll('.fila-tabla2-chk').forEach(chk => chk.checked = this.checked);
      });
    }

    document.querySelectorAll('#tabla-reuniones thead .icon-sort').forEach(flecha => {
      flecha.addEventListener('click', function() {
        if (ordenColumna === this.dataset.col) {
          ordenAsc = !ordenAsc;
        } else {
          ordenColumna = this.dataset.col;
          ordenAsc = true;
        }
        document.querySelectorAll('#tabla-reuniones thead .icon-sort').forEach(f=>f.classList.remove('active'));
        this.classList.add('active');
        renderPagina();
      });
    });

    // Submit del formulario de edición
    const formEditar = document.getElementById('form-editar');
    if (formEditar) {
      formEditar.addEventListener('submit', async function(e) {
        e.preventDefault();

        const formData = new FormData(this);
        const datosEditados = {};
        columnas.forEach(col => { datosEditados[col] = formData.get(col); });

        // Asegurar ID
        if (!datosEditados.mantenimientos_id || String(datosEditados.mantenimientos_id).trim() === '' || String(datosEditados.mantenimientos_id).toLowerCase() === 'null') {
          datosEditados.mantenimientos_id = currentEditingId != null ? String(currentEditingId) : '';
        }

        // Si NO es admin-estricto, forzar pendiente en ambas claves (compatibilidad)
        if (!esAdminStrict()) {
          datosEditados.verificacion = 'pendiente';
          datosEditados.Verificacion = 'pendiente';
        }

        try { console.log('[Mantenimientos] Enviando payload:', datosEditados); } catch {}

        try {
          const resp = await fetch('assets/php/actualizar_mantenimiento.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(datosEditados)
          });
          const text = await resp.text();
          let result = null;
          try { result = JSON.parse(text); } catch { console.warn('[Mantenimientos] Respuesta no JSON:', text); }
          if (result && result.success) {
            await renderPagina();
            setTimeout(() => {
              document.activeElement?.blur?.();
              const modalInst = bootstrap.Modal.getInstance(document.getElementById('modal-editar'));
              modalInst?.hide();
            }, 100);
            alert("¡Guardado exitosamente!");
          } else {
            alert('No se pudo guardar el cambio. Verifica los datos e inténtalo de nuevo.');
          }
        } catch (e) {
          alert('No se pudo guardar el cambio. Inténtalo nuevamente.');
        }
      });
    }

    renderPagina();
  });
})();