// evaluacion_builder.js
// evaluacion_builder.js
// Modified for Modal integration

window.openEvaluationBuilder = function (idFormulario) {
    if (!idFormulario) {
        alert('Error: No se ha especificado el ID del formulario.');
        return;
    }

    // Reset Form
    document.getElementById('form-builder').reset();
    document.getElementById('preguntas-container').innerHTML = '';
    document.getElementById('hidden-ruta-multi').value = '';
    document.getElementById('hidden-tipo-multi').value = '';
    document.getElementById('preview-multimedia').style.display = 'none';
    document.getElementById('preview-multimedia').innerHTML = '';
    document.getElementById('builder-id-formulario').value = idFormulario;

    // Reset Multimedia Radios
    const radioUpload = document.getElementById('source-upload');
    if (radioUpload) {
        radioUpload.checked = true;
        document.getElementById('section-upload').style.display = 'block';
        document.getElementById('section-youtube').style.display = 'none';
    }

    // Load Data
    loadExistingData(idFormulario);

    // Show Modal
    const modalEl = document.getElementById('modal-builder');
    const modal = new bootstrap.Modal(modalEl);
    modal.show();
};


document.addEventListener('DOMContentLoaded', function () {
    // Shared Event Listeners (Attach once)
    const btnAdd = document.getElementById('btn-add-pregunta');
    if (btnAdd) btnAdd.addEventListener('click', () => addPregunta());

    const btnUpload = document.getElementById('btn-upload-multi');
    if (btnUpload) btnUpload.addEventListener('click', uploadMultimedia);

    const btnYoutube = document.getElementById('btn-add-youtube');
    if (btnYoutube) btnYoutube.addEventListener('click', addYouTubeVideo);

    const btnSave = document.getElementById('btn-save-builder');
    if (btnSave) btnSave.addEventListener('click', (e) => {
        e.preventDefault();
        const idForm = document.getElementById('builder-id-formulario').value;
        saveEvaluacion(idForm);
    });

    // Toggle Media Source
    document.querySelectorAll('input[name="media-source"]').forEach(radio => {
        radio.addEventListener('change', (e) => {
            const val = e.target.value;
            const secUpload = document.getElementById('section-upload');
            const secYoutube = document.getElementById('section-youtube');
            if (secUpload) secUpload.style.display = val === 'upload' ? 'block' : 'none';
            if (secYoutube) secYoutube.style.display = val === 'youtube' ? 'block' : 'none';
        });
    });
});

function addPregunta(data = null) {
    const container = document.getElementById('preguntas-container');
    const template = document.getElementById('template-pregunta');
    const clone = template.content.cloneNode(true);
    const card = clone.querySelector('.pregunta-item');

    // Asignar eventos a elementos dentro del clon
    card.querySelector('.btn-remove-pregunta').addEventListener('click', () => {
        card.remove();
        updateNumeracion();
    });

    const selectTipo = card.querySelector('.select-tipo-pregunta');
    selectTipo.addEventListener('change', () => renderOpciones(card));

    // Si hay datos pre-cargados
    if (data) {
        // FIX: Usar 'enunciado' en lugar de 'pregunta'
        const inputTexto = card.querySelector('.input-pregunta-texto');
        if (inputTexto) inputTexto.value = data.enunciado || data.pregunta || '';

        if (selectTipo) selectTipo.value = data.tipo;

        const inputSegundo = card.querySelector('.input-segundo');
        if (inputSegundo) {
            // Si es video, formatear a HH:MM:SS, sino usar valor directo
            const tipoMulti = document.getElementById('hidden-tipo-multi').value;
            if (tipoMulti === 'video' || tipoMulti === 'youtube') {
                inputSegundo.value = secondsToTime(data.segundo_aparicion || 0);
            } else {
                inputSegundo.value = data.segundo_aparicion || 0;
            }
        }
    }

    container.appendChild(card);
    renderOpciones(card, data ? data.opciones : null);
    updateNumeracion();

    // Actualizar etiquetas según el tipo de multimedia actual
    const hiddenTipo = document.getElementById('hidden-tipo-multi');
    if (hiddenTipo && hiddenTipo.value) {
        updateQuestionLabels(hiddenTipo.value);
    } else {
        updateQuestionLabels(''); // Ocultar por defecto si no hay nada
    }
}

function renderOpciones(card, savedOpciones = null) {
    const tipo = card.querySelector('.select-tipo-pregunta').value;
    const container = card.querySelector('.container-opciones');
    container.innerHTML = '';

    if (tipo === 'seleccion') {
        // Botón para agregar opción
        const btnAddOpt = document.createElement('button');
        btnAddOpt.type = 'button';
        btnAddOpt.className = 'btn btn-sm btn-link mb-2';
        btnAddOpt.innerHTML = '<i class="fas fa-plus"></i> Agregar Opción';
        btnAddOpt.onclick = () => addOpcionSeleccion(container);
        container.appendChild(btnAddOpt);

        if (savedOpciones) {
            savedOpciones.forEach(opt => addOpcionSeleccion(container, opt));
        } else {
            addOpcionSeleccion(container);
            addOpcionSeleccion(container);
        }

    } else if (tipo === 'verdadero_falso') {
        const uniqueName = 'vf_' + Math.random().toString(36).substr(2, 9);
        const opciones = [
            { id: 'v', texto: 'Verdadero' },
            { id: 'f', texto: 'Falso' }
        ];

        const wrapper = document.createElement('div');
        wrapper.className = 'd-flex gap-4'; // Flex container for better spacing

        opciones.forEach(opt => {
            const div = document.createElement('div');
            div.className = 'form-check form-check-inline'; // Inline layout
            const isChecked = savedOpciones ? savedOpciones.find(o => o.id == opt.id && o.correcta) : false;

            div.innerHTML = `
                <input class="form-check-input radio-correcta" type="radio" name="${uniqueName}" value="${opt.id}" ${isChecked ? 'checked' : ''} style="transform: scale(1.2);">
                <label class="form-check-label ms-2 fs-5">${opt.texto}</label>
                <input type="hidden" class="input-opcion-texto" value="${opt.texto}">
                <input type="hidden" class="input-opcion-id" value="${opt.id}">
            `;
            wrapper.appendChild(div);
        });
        container.appendChild(wrapper);

    } else if (tipo === 'texto') {
        container.innerHTML = `
            <div class="alert alert-info mb-0">
                <i class="fas fa-info-circle me-2"></i>
                El usuario verá un campo de texto libre para responder. Esta pregunta requerirá revisión manual (o se guardará tal cual).
            </div>
        `;
    } else if (tipo === 'ordenar') {
        // Botón para agregar item a ordenar
        const btnAddItem = document.createElement('button');
        btnAddItem.type = 'button';
        btnAddItem.className = 'btn btn-sm btn-link mb-2';
        btnAddItem.innerHTML = '<i class="fas fa-plus"></i> Agregar Item';
        btnAddItem.onclick = () => addOpcionOrdenar(container);
        container.appendChild(btnAddItem);

        const info = document.createElement('div');
        info.className = 'form-text mb-2';
        info.innerText = 'Define el orden correcto de arriba a abajo.';
        container.appendChild(info);

        if (savedOpciones) {
            savedOpciones.forEach(opt => addOpcionOrdenar(container, opt));
        } else {
            addOpcionOrdenar(container);
            addOpcionOrdenar(container);
        }
    }
}

function addOpcionSeleccion(container, data = null) {
    const div = document.createElement('div');
    div.className = 'input-group mb-2';

    div.innerHTML = `
        <div class="input-group-text">
            <input class="form-check-input mt-0 radio-correcta" type="radio" name="grupo_temp" aria-label="Es correcta" ${data && data.correcta ? 'checked' : ''}>
        </div>
        <input type="text" class="form-control input-opcion-texto" placeholder="Opción" value="${data ? data.texto : ''}" required>
        <button class="btn btn-outline-danger" type="button" onclick="this.parentElement.remove()"><i class="fas fa-times"></i></button>
    `;

    // Insertar antes del botón de agregar (que es el primer hijo si no hay opciones, o el último si ya hay)
    // Mejor estrategia: buscar el botón y insertar antes
    const btn = container.querySelector('button.btn-link');
    container.insertBefore(div, btn);

    // Corregir names
    updateRadioNames(container);
}

function addOpcionOrdenar(container, data = null) {
    const div = document.createElement('div');
    div.className = 'input-group mb-2 item-ordenar';
    div.innerHTML = `
        <span class="input-group-text drag-handle"><i class="fas fa-grip-lines"></i></span>
        <input type="text" class="form-control input-opcion-texto" placeholder="Item a ordenar" value="${data ? data.texto : ''}" required>
        <button class="btn btn-outline-danger" type="button" onclick="this.parentElement.remove()"><i class="fas fa-times"></i></button>
    `;

    // Insertar antes del botón de agregar y el texto de ayuda
    const btn = container.querySelector('button.btn-link');
    container.insertBefore(div, btn);
}

function updateRadioNames(container) {
    const parentCard = container.closest('.pregunta-item');
    if (!parentCard) return;
    const radios = parentCard.querySelectorAll('.radio-correcta');
    // Usar un ID único basado en el timestamp o random del padre para evitar colisiones
    const uniqueId = 'group_' + Math.random().toString(36).substr(2, 9);
    radios.forEach(r => r.name = uniqueId);
}

function updateNumeracion() {
    document.querySelectorAll('.pregunta-item').forEach((item, index) => {
        item.querySelector('.num-pregunta').textContent = index + 1;
        // Actualizar nombres de grupos de radios
        const container = item.querySelector('.container-opciones');
        if (container) updateRadioNames(container);
    });
}

function uploadMultimedia() {
    const input = document.getElementById('input-multimedia');
    if (input.files.length === 0) return alert('Selecciona un archivo');

    const file = input.files[0];
    const maxSize = 300 * 1024 * 1024; // 300MB

    if (file.size > maxSize) {
        alert('El archivo es demasiado grande. El límite es 300MB.');
        return;
    }

    const formData = new FormData();
    formData.append('file', file);

    // Enviar archivo anterior para eliminarlo
    const prevFile = document.getElementById('hidden-ruta-multi').value;
    if (prevFile) {
        formData.append('previous_file', prevFile);
    }

    // Mostrar indicador de carga (opcional pero recomendado)
    const btn = document.getElementById('btn-upload-multi');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Subiendo...';
    btn.disabled = true;

    fetch('assets/php/upload_multimedia.php', {
        method: 'POST',
        body: formData
    })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                document.getElementById('hidden-ruta-multi').value = data.path;
                document.getElementById('hidden-tipo-multi').value = data.type;

                renderMultimediaPreview(data.type, data.path);
                updateQuestionLabels(data.type); // Update labels immediately
                alert('Archivo subido correctamente');
            } else {
                alert('Error al subir: ' + data.error);
            }
        })
        .catch(err => {
            console.error('Error uploading:', err);
            alert('Error de conexión al subir archivo');
        })
        .finally(() => {
            btn.innerHTML = originalText;
            btn.disabled = false;
        });
}

function addYouTubeVideo() {
    const input = document.getElementById('input-youtube');
    const url = input.value.trim();

    if (!url) return alert('Por favor ingresa una URL de YouTube');

    const videoId = extractYouTubeID(url);
    if (!videoId) return alert('URL de YouTube no válida');

    document.getElementById('hidden-ruta-multi').value = videoId;
    document.getElementById('hidden-tipo-multi').value = 'youtube';

    renderMultimediaPreview('youtube', videoId);
    updateQuestionLabels('youtube');
    alert('Video de YouTube agregado correctamente');
}

function saveEvaluacion(idFormulario) {
    const titulo = document.getElementById('eval-titulo').value.trim();
    const instrucciones = document.getElementById('eval-instrucciones').value;
    const rutaMulti = document.getElementById('hidden-ruta-multi').value;
    const tipoMulti = document.getElementById('hidden-tipo-multi').value;

    // VALIDATION: Check Title
    if (!titulo) {
        alert('Debes ingresar un Título para la evaluación.');
        document.getElementById('eval-titulo').focus();
        return;
    }

    // VALIDATION: Check Minimum One Question
    const preguntasNodes = document.querySelectorAll('.pregunta-item');
    if (preguntasNodes.length === 0) {
        alert('Debes agregar al menos una pregunta antes de guardar.');
        return;
    }

    const preguntas = [];
    preguntasNodes.forEach(card => {
        const tipo = card.querySelector('.select-tipo-pregunta').value;
        const texto = card.querySelector('.input-pregunta-texto').value;
        const inputSegundo = card.querySelector('.input-segundo');

        let segundo = 0;
        if (inputSegundo) {
            if (tipoMulti === 'video' || tipoMulti === 'youtube') {
                segundo = timeToSeconds(inputSegundo.value);
            } else {
                segundo = parseInt(inputSegundo.value) || 0;
            }
        }

        const opciones = [];
        const container = card.querySelector('.container-opciones');

        if (tipo === 'seleccion') {
            container.querySelectorAll('.input-group').forEach((row, idx) => {
                opciones.push({
                    id: idx + 1,
                    texto: row.querySelector('.input-opcion-texto').value,
                    correcta: row.querySelector('.radio-correcta').checked
                });
            });
        } else if (tipo === 'verdadero_falso') {
            container.querySelectorAll('.form-check').forEach(row => {
                opciones.push({
                    id: row.querySelector('.input-opcion-id').value,
                    texto: row.querySelector('.input-opcion-texto').value,
                    correcta: row.querySelector('.radio-correcta').checked
                });
            });
        } else if (tipo === 'ordenar') {
            container.querySelectorAll('.item-ordenar').forEach((row, idx) => {
                opciones.push({
                    id: idx + 1,
                    texto: row.querySelector('.input-opcion-texto').value,
                    orden_correcto: idx + 1 // El orden en que se guardan es el correcto
                });
            });
        }
        // Tipo 'texto' no tiene opciones

        preguntas.push({
            tipo: tipo,
            enunciado: texto, // FIX: Usar 'enunciado' para coincidir con DB
            segundo_aparicion: segundo,
            opciones: opciones
        });
    });

    const payload = {
        id_formulario: idFormulario,
        titulo: titulo,
        instrucciones: instrucciones,
        multimedia: rutaMulti ? { ruta: rutaMulti, tipo: tipoMulti, titulo: 'Material' } : null,
        preguntas: preguntas
    };

    fetch('assets/php/evaluacion_api.php?action=save_structure', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                alert('Evaluación guardada correctamente');
                // Close Modal
                const modalEl = document.getElementById('modal-builder');
                const modal = bootstrap.Modal.getInstance(modalEl);
                if (modal) modal.hide();

                // Refresh main table if exists (coupling with programacion_evaluaciones.js)
                if (typeof loadEvaluaciones === 'function') {
                    loadEvaluaciones();
                }
            } else {
                alert('Error al guardar: ' + data.error);
            }
        })
        .catch(err => {
            console.error('Error saving:', err);
            alert('Error de conexión al guardar');
        });
}

function loadExistingData(idFormulario) {
    fetch(`assets/php/evaluacion_api.php?action=get_structure&id_formulario=${idFormulario}`)
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                console.log('Datos cargados:', data);

                const tituloInput = document.getElementById('eval-titulo');
                const instruccionesInput = document.getElementById('eval-instrucciones');

                if (tituloInput) {
                    tituloInput.value = data.header.titulo || '';
                } else {
                    console.warn('Elemento eval-titulo no encontrado');
                }

                if (instruccionesInput) {
                    instruccionesInput.value = data.header.instrucciones || '';
                } else {
                    console.warn('Elemento eval-instrucciones no encontrado');
                }

                if (data.multimedia) {
                    const hiddenRuta = document.getElementById('hidden-ruta-multi');
                    const hiddenTipo = document.getElementById('hidden-tipo-multi');

                    if (hiddenRuta) hiddenRuta.value = data.multimedia.ruta_archivo || '';
                    if (hiddenTipo) hiddenTipo.value = data.multimedia.tipo || '';

                    // Set Toggle State
                    if (data.multimedia.tipo === 'youtube') {
                        document.getElementById('source-youtube').checked = true;
                        document.getElementById('section-upload').style.display = 'none';
                        document.getElementById('section-youtube').style.display = 'block';
                        document.getElementById('input-youtube').value = 'https://youtu.be/' + data.multimedia.ruta_archivo;
                    } else {
                        document.getElementById('source-upload').checked = true;
                        document.getElementById('section-upload').style.display = 'block';
                        document.getElementById('section-youtube').style.display = 'none';
                    }

                    if (data.multimedia.ruta_archivo) {
                        renderMultimediaPreview(data.multimedia.tipo, data.multimedia.ruta_archivo);
                    }

                    // Actualizar etiquetas según el tipo de multimedia cargado
                    updateQuestionLabels(data.multimedia.tipo);
                } else {
                    updateQuestionLabels(''); // Ocultar si no hay multimedia
                }

                if (data.preguntas) {
                    data.preguntas.forEach(p => {
                        try {
                            addPregunta(p);
                        } catch (e) {
                            console.error('Error adding question:', p, e);
                        }
                    });
                }
            }
        })
        .catch(err => {
            console.error('Fetch error:', err);
            alert('Error de conexión: ' + err.message);
        });
}

function updateQuestionLabels(type) {
    const isPdf = type === 'pdf' || type === 'application/pdf';
    const isVideo = type === 'video' || type === 'video/mp4' || type === 'video/webm' || type === 'youtube';

    // Default: Hide everything
    let showContainer = false;
    let labelText = '';
    let placeholderText = '';
    let helpText = '';
    let inputType = 'number';

    if (isVideo) {
        showContainer = true;
        labelText = '<i class="fas fa-clock me-1"></i>Minuto en Video (Opcional)';
        placeholderText = 'HH:MM:SS (ej: 00:02:30)';
        helpText = 'Si hay video, la pregunta aparecerá en este tiempo. 00:00:00 = Al final.';
        inputType = 'text';
    } else if (isPdf) {
        showContainer = true;
        labelText = '<i class="fas fa-file-pdf me-1"></i>Página del PDF (Opcional)';
        placeholderText = 'Número de página (ej: 5)';
        helpText = 'La pregunta aparecerá al llegar a esta página. 0 = Al final.';
        inputType = 'number';
    }

    document.querySelectorAll('.pregunta-item').forEach(card => {
        const col = card.querySelector('.col-md-6:last-child'); // El contenedor de la columna
        const label = card.querySelector('.label-momento');
        const input = card.querySelector('.input-segundo');
        const help = card.querySelector('.help-momento');

        if (col) {
            col.style.display = showContainer ? 'block' : 'none';
        }

        if (showContainer) {
            if (label) label.innerHTML = labelText;
            if (input) {
                input.placeholder = placeholderText;
                input.type = inputType;

                // Si cambiamos a video, intentar formatear valor existente si es numérico
                if (isVideo && input.value && !isNaN(input.value)) {
                    input.value = secondsToTime(input.value);
                }
            }
            if (help) help.textContent = helpText;
        }
    });
}

function renderMultimediaPreview(type, path) {
    const preview = document.getElementById('preview-multimedia');
    const input = document.getElementById('input-multimedia');
    const inputGroup = input ? input.closest('.input-group') : null;

    if (preview) {
        preview.style.display = 'block';

        let content = '';
        if (type === 'video' || type === 'video/mp4') {
            content = `<video src="${path}" controls style="max-width: 100%; height: 200px;"></video>`;
        } else if (type === 'youtube') {
            content = `<iframe width="100%" height="200" src="https://www.youtube.com/embed/${path}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>`;
        } else if (type === 'imagen' || type === 'image/jpeg' || type === 'image/png') {
            content = `<img src="${path}" style="max-width: 100%; height: 200px;">`;
        } else {
            content = `<a href="${path}" target="_blank" class="btn btn-info"><i class="fas fa-file-pdf"></i> Ver Archivo</a>`;
        }

        preview.innerHTML = content +
            `<div class="mt-2"><button type="button" class="btn btn-sm btn-danger" onclick="removeMultimedia()">Eliminar</button></div>`;
    }

    if (inputGroup) {
        inputGroup.style.display = 'flex';
    }
}

window.removeMultimedia = function () {
    console.log('Removing multimedia...');
    const hiddenRuta = document.getElementById('hidden-ruta-multi');
    const hiddenTipo = document.getElementById('hidden-tipo-multi');
    const preview = document.getElementById('preview-multimedia');
    const input = document.getElementById('input-multimedia');
    const youtubeInput = document.getElementById('input-youtube');

    if (hiddenRuta) hiddenRuta.value = '';
    if (hiddenTipo) hiddenTipo.value = '';

    if (preview) {
        preview.style.display = 'none';
        preview.innerHTML = '';
    }

    if (input) input.value = '';
    if (youtubeInput) youtubeInput.value = '';

    updateQuestionLabels('');
};

// Helper Functions for Time Formatting
function secondsToTime(seconds) {
    if (!seconds) return '';
    const h = Math.floor(seconds / 3600).toString().padStart(2, '0');
    const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
    const s = Math.floor(seconds % 60).toString().padStart(2, '0');
    return `${h}:${m}:${s}`;
}

function timeToSeconds(timeString) {
    if (!timeString) return 0;
    // Si ya es un número, devolverlo
    if (!isNaN(timeString)) return parseInt(timeString);

    const parts = timeString.split(':');
    if (parts.length === 3) {
        return (+parts[0]) * 3600 + (+parts[1]) * 60 + (+parts[2]);
    } else if (parts.length === 2) {
        return (+parts[0]) * 60 + (+parts[1]);
    }
    return 0;
}

function extractYouTubeID(url) {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
}
