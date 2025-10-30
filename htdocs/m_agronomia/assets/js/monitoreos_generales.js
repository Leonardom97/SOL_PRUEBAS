(function () {
  const columnas = [
    'monitoreos_generales_id', 'fecha', 'hora', 'colaborador', 'plantacion', 'finca', 'siembra', 'lote', 'parcela',
    'linea', 'palma', 'grupo', 'estado', 'validacion', 'sintoma', 'labor', 'verificacion'
  ];

  let allData = [];
  let currentPage = 1;
  let pageSize = 25;
  let filtros = {};
  let ordenColumna = null;
  let ordenAsc = true;
  let total = 0;

  window.filtrarDatosTablaMonitoreos = () => allData;
  window.allTablaMonitoreosData = allData;

  async function fetchData(page = 1, pageSize = 25, filtros = {}, ordenCol = null, ordenAsc = true) {
    const params = new URLSearchParams({ page, pageSize });
    if (ordenCol) {
      params.append('ordenColumna', ordenCol);
      params.append('ordenAsc', ordenAsc ? '1' : '0');
    }
    for (const key in filtros) {
      if (filtros[key]) params.append(`filtro_${key}`, filtros[key]);
    }
    const endpoint = `assets/php/conexion_monitoreos_generales.php?${params}`;
    const resp = await fetch(endpoint);
    if (!resp.ok) throw new Error('Error al cargar monitoreos_generales');
    return await resp.json();
  }

  function renderTabla(datos) {
    const rol = (document.body.getAttribute('data-role') || "").toLowerCase();
    const esAdmin = rol === 'administrador';
    const esAuxAgronomico = rol === 'aux_agronomico';
    const esAgronomia = rol === 'agronomia';
    const fechaCorte = localStorage.getItem("fecha_corte");
    const tbody = document.getElementById('tbody-monitoreos-generales');
    if (!tbody) return;

    tbody.innerHTML = '';
    datos.forEach((row, idx) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td><input type="checkbox" class="fila-tabla-monitoreos-chk md-checkbox" data-row="${idx}"></td>`;

      columnas.forEach(col => {
        const td = document.createElement('td');
        // Verificación igual a cosecha_fruta.js
        if (col === 'verificacion') {
          if (row.verificacion === 'aprobado') {
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
          td.textContent = row[col] || '';
        }
        tr.appendChild(td);
      });

      // Acciones (igual que cosecha_fruta.js)
      const fechaFila = row['fecha'] || "";
      let btnEditar = "", btnEstado = "";
      if (fechaCorte && fechaFila) {
        if (fechaFila < fechaCorte) {
          btnEstado = `<button class="md-btn md-btn-icon" title="Inactivo" disabled><i class="fa fa-lock"></i></button>`;
        } else {
          btnEditar = `<button class="md-btn md-btn-icon btn-editar" title="Editar" data-id="${row.monitoreos_generales_id}"><i class="fa fa-pen"></i></button>`;
        }
      } else {
        btnEditar = `<button class="md-btn md-btn-icon btn-editar" title="Editar" data-id="${row.monitoreos_generales_id}"><i class="fa fa-pen"></i></button>`;
        btnEstado = `<button class="md-btn md-btn-icon" title="Sin fecha de corte" disabled><i class="fa fa-question"></i></button>`;
      }
      const acciones = `
        ${btnEditar}
        <button class="md-btn md-btn-icon btn-visualizar" title="Visualizar" data-id="${row.monitoreos_generales_id}"><i class="fa fa-eye"></i></button>
        ${btnEstado}
      `;
      const tdAcciones = document.createElement('td');
      tdAcciones.style = 'display:inline-flex; align-items:center;';
      tdAcciones.innerHTML = acciones;
      tr.appendChild(tdAcciones);

      tbody.appendChild(tr);
    });

    // Acciones de botones igual que cosecha_fruta.js
    tbody.querySelectorAll('.btn-editar').forEach(btn => {
      btn.onclick = function () {
        const id = this.getAttribute("data-id");
        const registro = allData.find(row => row.monitoreos_generales_id == id);
        if (registro) abrirModal(registro, false);
      };
    });
    tbody.querySelectorAll('.btn-visualizar').forEach(btn => {
      btn.onclick = function () {
        const id = this.getAttribute("data-id");
        const registro = allData.find(row => row.monitoreos_generales_id == id);
        if (registro) abrirModal(registro, true);
      };
    });

    // Acción aprobar (solo admin o aux_agronomico)
    if (esAdmin || esAuxAgronomico) {
      tbody.querySelectorAll('.btn-aprobar').forEach(btn => {
        btn.onclick = async function () {
          const id = this.getAttribute("data-id");
          const registro = allData.find(r => r.monitoreos_generales_id == id);
          if (!registro) return;
          const payload = { ...registro, verificacion: 'aprobado' };
          try {
            const resp = await fetch('assets/php/actualizar_monitoreos_generales.php', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload)
            });
            const result = await resp.json();
            if(result.success) {
              renderPagina();
            }
          } catch(e) {}
        };
      });
    }
  }

  function abrirModal(rowData, soloLectura = false) {
    // BLOQUEO POR FECHA DE CORTE
    const fechaCorte = localStorage.getItem("fecha_corte");
    const fechaFila = rowData['fecha'] || "";
    let desactivarEdicion = soloLectura;
    if (fechaCorte && fechaFila && fechaFila < fechaCorte) {
      desactivarEdicion = true;
    }

    const campos = columnas.map(col => {
      const readonly = (col === 'monitoreos_generales_id' || desactivarEdicion) ? "readonly" : "";
      return `
        <div class="col-md-6 mb-3">
          <label class="form-label">${col.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</label>
          <input type="text" class="form-control" name="${col}" value="${rowData[col] || ''}" ${readonly}>
        </div>
      `;
    }).join('');
    const contCampos = document.getElementById('campos-formulario');
    if (contCampos) contCampos.innerHTML = campos;

    const modalFooter = document.querySelector('#modal-editar .modal-footer');
    if (modalFooter) {
      const btnSubmit = modalFooter.querySelector('button[type="submit"]');
      if (btnSubmit) btnSubmit.style.display = desactivarEdicion ? 'none' : '';
    }

    const modalEl = document.getElementById('modal-editar');
    if (modalEl) {
      const modal = new bootstrap.Modal(modalEl);
      modal.show();
    }
  }

  const formEditar = document.getElementById('form-editar');
  if (formEditar) {
    formEditar.addEventListener('submit', async function(e) {
      e.preventDefault();
      const formData = new FormData(this);
      const datosEditados = {};
      columnas.forEach(col => {
        datosEditados[col] = formData.get(col);
      });
      const rol = (document.body.getAttribute('data-role') || "").toLowerCase();
      if (rol !== 'administrador' && rol !== 'aux_agronomico') {
        datosEditados.verificacion = 'pendiente';
      }
      try {
        const resp = await fetch('assets/php/actualizar_monitoreos_generales.php', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(datosEditados)
        });
        const result = await resp.json();
        if(result.success) {
          renderPagina();
          setTimeout(() => {
            document.activeElement.blur();
            bootstrap.Modal.getInstance(document.getElementById('modal-editar'))?.hide();
          }, 100);
          alert("¡Guardado exitosamente!");
        }
      } catch(e) {}
    });
  }

  async function renderPagina() {
    const data = await fetchData(
      currentPage,
      pageSize,
      filtros,
      ordenColumna,
      ordenAsc
    );
    allData = data.datos || [];
    total = data.total || 0;
    window.allTablaMonitoreosData = allData;
    renderTabla(allData);
  }

  document.addEventListener('DOMContentLoaded', () => {
    const select = document.getElementById('limitSelectMonitoreos');
    if (select) {
      select.addEventListener('change', function () {
        pageSize = parseInt(this.value, 10);
        currentPage = 1;
        renderPagina();
      });
    }

    const filtrosInputs = document.querySelectorAll('#tabla-monitoreos-generales thead input[data-col]');
    filtrosInputs.forEach(input => {
      input.addEventListener('input', function () {
        filtros[this.dataset.col] = this.value;
        currentPage = 1;
        renderPagina();
      });
    });

    const btnClear = document.getElementById('clearFiltersBtnMonitoreos');
    if (btnClear) {
      btnClear.addEventListener('click', () => {
        filtrosInputs.forEach(input => input.value = '');
        filtros = {};
        currentPage = 1;
        renderPagina();
      });
    }

    const selectAll = document.getElementById('selectAllMonitoreos');
    if (selectAll) {
      selectAll.addEventListener('change', function() {
        document.querySelectorAll('.fila-tabla-monitoreos-chk').forEach(chk => chk.checked = this.checked);
      });
    }

    document.querySelectorAll('#tabla-monitoreos-generales thead .icon-sort').forEach(flecha => {
      flecha.addEventListener('click', function () {
        if (ordenColumna === this.dataset.col) {
          ordenAsc = !ordenAsc;
        } else {
          ordenColumna = this.dataset.col;
          ordenAsc = true;
        }
        document.querySelectorAll('#tabla-monitoreos-generales thead .icon-sort').forEach(f=>f.classList.remove('active'));
        this.classList.add('active');
        renderPagina();
      });
    });

    renderPagina();
  });
})();