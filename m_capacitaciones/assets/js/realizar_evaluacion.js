/**
 * realizar_evaluacion.js V2.2
 * Enhanced with Premium Logic: Soft Pause, Strict Blocking, Zoom, Confetti, Type-to-Sign.
 */

// --- Global State ---
const state = {
    idFormulario: null,
    idHeader: null,
    data: null,
    mediaType: null, // 'video' | 'pdf'
    pdfDoc: null,
    pageNum: 1,
    pdfScale: 1.5, // Zoom level
    signaturePad: null,
    signaturePad: null,
    answeredQuestions: new Set(),
    confirmedQuestions: new Set(), // New: Track confirmed/hidden questions
    visibleQuestions: new Set(),
    maxTimeAllowed: 0, // For video gating
    user: null,
    softPauseTimer: null,
    materialFinished: false
};

// --- Initialization ---
document.addEventListener('DOMContentLoaded', async () => {
    logStatus('Iniciando script V2.2 Premium...');

    // 1. Get Params
    const params = new URLSearchParams(window.location.search);
    state.idFormulario = params.get('id_formulario');
    state.idHeader = params.get('id_header');

    if (!state.idFormulario || !state.idHeader) {
        showError('Faltan parámetros en la URL (id_formulario o id_header).');
        return;
    }

    // 2. Init Signature Pad (Fix resize issue)
    const sigModal = document.getElementById('signatureModal');
    if (sigModal) {
        sigModal.addEventListener('shown.bs.modal', initSignaturePad);
    }

    // 3. Load Data
    await loadEvaluationData();

    // 4. Setup Event Listeners
    setupEventListeners();
});

// --- Core Functions ---

function logStatus(msg, isError = false) {
    console.log(`[EvalV2] ${msg}`);
    const statusEl = document.getElementById('welcome-status');
    const logEl = document.getElementById('error-log');

    if (statusEl) {
        statusEl.textContent = msg;
        if (isError) statusEl.classList.add('text-danger');
    }

    if (isError && logEl) {
        logEl.style.display = 'block';
        logEl.innerHTML += `<div>${msg}</div>`;
    }
}

function showError(msg) {
    logStatus(msg, true);
    // alert(msg); // Optional: Don't block UI with alert
}

async function loadEvaluationData() {
    logStatus('Conectando con el servidor...');
    const url = `assets/php/evaluacion_api.php?action=get_structure&id_formulario=${state.idFormulario}`;

    try {
        const res = await fetch(url);
        logStatus('Recibiendo datos...');

        const text = await res.text();
        let data;
        try {
            data = JSON.parse(text);
        } catch (e) {
            console.error('JSON Parse Error:', text);
            // Show the raw text in the error log for debugging
            const cleanText = text.replace(/</g, '&lt;').replace(/>/g, '&gt;');
            showError(`Error de datos: La respuesta del servidor no es válida.<br><small>${cleanText.substring(0, 200)}...</small>`);
            throw new Error('La respuesta del servidor no es un JSON válido.');
        }

        if (!data.success) {
            throw new Error(data.error || 'Error desconocido del servidor.');
        }

        state.data = data;
        logStatus('Datos cargados. Construyendo interfaz...');

        renderInterface();

        // Enable Start
        const btnStart = document.getElementById('btn-start');
        btnStart.disabled = false;
        btnStart.innerHTML = '<i class="fas fa-play me-2"></i> COMENZAR AHORA';
        btnStart.classList.add('pulse-button');

        // Update Info
        document.getElementById('welcome-title').textContent = data.header.titulo;
        const time = (data.preguntas ? data.preguntas.length : 0) * 3;
        document.getElementById('welcome-time').textContent = `${time} min aprox`;

    } catch (err) {
        showError(`Error fatal: ${err.message}`);
    }
}

function renderInterface() {
    // 1. Render Questions
    const container = document.getElementById('questions-container');
    container.innerHTML = '';

    if (state.data.preguntas) {
        state.data.preguntas.forEach((p, idx) => {
            const card = createQuestionCard(p, idx + 1);
            container.appendChild(card);
        });
        document.getElementById('progress-badge').textContent = `0/${state.data.preguntas.length}`;
    }

    // 2. Setup Media
    setupMedia();
}

function createQuestionCard(p, index) {
    const div = document.createElement('div');
    div.className = 'card pregunta-card';
    div.id = `q-card-${p.id}`;
    div.dataset.trigger = p.segundo_aparicion || 0;

    let optionsHtml = '';
    const name = `q_${p.id}`;

    if (p.tipo === 'seleccion' || p.tipo === 'verdadero_falso') {
        p.opciones.forEach(opt => {
            optionsHtml += `
                <div class="form-check mb-2">
                    <input class="form-check-input" type="radio" name="${name}" value="${opt.id}" required style="transform: scale(1.2); margin-right: 10px;">
                    <label class="form-check-label" style="font-size: 1.05rem;">${opt.texto}</label>
                </div>`;
        });
    } else if (p.tipo === 'ordenar') {
        optionsHtml = '<p class="small text-muted">Ordena los elementos:</p>';
        p.opciones.forEach((_, i) => {
            optionsHtml += `
                <div class="input-group mb-2">
                    <span class="input-group-text bg-light fw-bold">${i + 1}</span>
                    <select class="form-select orden-select" name="${name}_rank_${i + 1}" required>
                        <option value="">Seleccionar...</option>
                        ${p.opciones.map(o => `<option value="${o.id}">${o.texto}</option>`).join('')}
                    </select>
                </div>`;
        });
    } else {
        optionsHtml = `<textarea class="form-control" name="${name}" rows="3" required placeholder="Escribe tu respuesta aquí..."></textarea>`;
    }

    div.innerHTML = `
        <div class="card-body p-4">
            <div class="d-flex justify-content-between mb-3">
                <h6 class="fw-bold text-primary">Pregunta ${index}</h6>
                <span class="badge bg-warning text-dark">Nueva</span>
            </div>
            <p class="lead" style="font-size: 1.1rem;">${p.enunciado}</p>
            <div class="options-area mt-3">${optionsHtml}</div>
            <div class="mt-3 text-end">
                <button type="button" class="btn btn-primary btn-sm btn-continue pulse-button" data-id="${p.id}" style="display:none; border-radius: 50px; padding: 0.5rem 1.5rem;">
                    Continuar <i class="fas fa-play ms-2"></i>
                </button>
            </div>
        </div>
    `;
    return div;
}

function setupMedia() {
    const media = state.data.multimedia;
    const panel = document.getElementById('media-content');
    const controls = document.getElementById('media-controls');

    if (!media) {
        panel.innerHTML = '<h4 class="text-white">Sin Multimedia</h4>';
        showAllQuestions();
        return;
    }

    state.mediaType = media.tipo;
    controls.style.display = 'flex';

    // Clear previous
    panel.innerHTML = '';

    if (state.mediaType === 'video') {
        const video = document.createElement('video');
        video.src = media.ruta_archivo;
        video.style.width = '100%';
        video.style.height = '100%';
        video.style.objectFit = 'contain';
        video.id = 'main-video';

        // Video Events
        video.ontimeupdate = () => onVideoTimeUpdate(video);
        video.onloadedmetadata = () => {
            document.getElementById('time-total').textContent = formatTime(video.duration);
            state.maxTimeAllowed = 0;
            checkGates(0); // Check initial gates

            setupProgressBar(video.duration, (t) => {
                video.currentTime = t;
            });
        };
        video.onended = () => {
            state.materialFinished = true;
            checkAnswers(); // Re-check to show button
        };

        panel.appendChild(video);

    } else if (state.mediaType === 'pdf') {
        // PDF Setup
        const canvas = document.createElement('canvas');
        canvas.id = 'pdf-canvas';
        canvas.style.maxWidth = '100%';
        canvas.style.maxHeight = '100%';

        panel.appendChild(canvas);

        // Hide unused controls for PDF
        document.getElementById('btn-play').style.display = 'none';
        document.getElementById('progress-bar-container').style.visibility = 'hidden';
        document.getElementById('time-current').style.marginRight = '10px';

        pdfjsLib.getDocument(media.ruta_archivo).promise.then(pdf => {
            state.pdfDoc = pdf;
            document.getElementById('time-total').textContent = `${pdf.numPages} Pág`;
            renderPage(1);
            checkGates(1);
        }).catch(err => {
            console.error('PDF Error:', err);
            panel.innerHTML = '<p class="text-danger">Error cargando PDF</p>';
            showAllQuestions();
        });
    } else if (state.mediaType === 'youtube') {
        // YouTube Setup
        panel.innerHTML = '<div id="youtube-player"></div>';
        loadYouTubeAPI(media.ruta_archivo);
    }
}

// --- YouTube Logic ---
let ytPlayer = null;
let ytPollingInterval = null;

function loadYouTubeAPI(videoId) {
    if (window.YT && window.YT.Player) {
        initYouTubePlayer(videoId);
    } else {
        const tag = document.createElement('script');
        tag.src = "https://www.youtube.com/iframe_api";
        const firstScriptTag = document.getElementsByTagName('script')[0];
        firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

        window.onYouTubeIframeAPIReady = () => {
            initYouTubePlayer(videoId);
        };
    }
}

function initYouTubePlayer(videoId) {
    ytPlayer = new YT.Player('youtube-player', {
        height: '100%',
        width: '100%',
        videoId: videoId,
        playerVars: {
            'playsinline': 1,
            'controls': 0, // Hide default controls to enforce our custom ones/logic
            'rel': 0,
            'modestbranding': 1
        },
        events: {
            'onReady': onPlayerReady,
            'onStateChange': onPlayerStateChange
        }
    });
}

function onPlayerReady(event) {
    const duration = event.target.getDuration();
    document.getElementById('time-total').textContent = formatTime(duration);
    state.maxTimeAllowed = 0;
    checkGates(0);

    setupProgressBar(duration, (t) => {
        ytPlayer.seekTo(t);
    });
}

function onPlayerStateChange(event) {
    if (event.data == YT.PlayerState.PLAYING) {
        updatePlayIcon(true);
        startYouTubePolling();
    } else {
        updatePlayIcon(false);
        stopYouTubePolling();
    }
}

function startYouTubePolling() {
    if (ytPollingInterval) clearInterval(ytPollingInterval);
    ytPollingInterval = setInterval(() => {
        if (ytPlayer && ytPlayer.getCurrentTime) {
            const currentTime = ytPlayer.getCurrentTime();
            onVideoTimeUpdate({ currentTime: currentTime, duration: ytPlayer.getDuration() });
        }
    }, 250); // Poll every 250ms
}

function stopYouTubePolling() {
    if (ytPollingInterval) clearInterval(ytPollingInterval);
}

function setupProgressBar(duration, seekCallback) {
    const progContainer = document.getElementById('progress-bar-container');
    // Clone to remove old listeners
    const newContainer = progContainer.cloneNode(true);
    progContainer.parentNode.replaceChild(newContainer, progContainer);

    const handler = (e) => {
        // Support Click or Touch
        let clientX;
        if (e.touches) {
            clientX = e.touches[0].clientX;
        } else {
            clientX = e.clientX;
        }

        const rect = newContainer.getBoundingClientRect();
        const pos = (clientX - rect.left) / rect.width;
        const targetTime = Math.max(0, Math.min(1, pos)) * duration; // Clamp 0-1

        // Strict Blocking
        if (targetTime > state.maxTimeAllowed + 2) {
            showErrorToast('Debes responder las preguntas para avanzar.');
            // seekCallback(state.maxTimeAllowed); // Optional: Snap back
        } else {
            seekCallback(targetTime);
        }
    };

    newContainer.addEventListener('click', handler);
    newContainer.addEventListener('touchstart', handler, { passive: true }); // Seek on touch

    // Optional: Allow dragging (touchmove)
    newContainer.addEventListener('touchmove', (e) => {
        // Debounce or just update visual? For now, simple seek is fine.
        // If we want smooth dragging, we'd need to pause video while dragging. 
        // Let's stick to 'tap to seek' for simplicity and stability first.
        handler(e);
    }, { passive: true });
}

// --- Idle Controls Logic ---
let idleTimer = null;
const controlsEl = document.getElementById('media-controls');
controlsEl.style.transition = 'opacity 0.5s ease'; // Add transition via JS

// Helper to reset timer
function resetIdleTimer() {
    controlsEl.style.opacity = '1';
    controlsEl.style.cursor = 'default';
    if (idleTimer) clearTimeout(idleTimer);

    // Only hide if playing
    const isPlaying = (state.mediaType === 'video' && !document.getElementById('main-video').paused) ||
        (state.mediaType === 'youtube' && ytPlayer && ytPlayer.getPlayerState() === YT.PlayerState.PLAYING);

    if (isPlaying) {
        idleTimer = setTimeout(() => {
            controlsEl.style.opacity = '0';
            controlsEl.style.cursor = 'none';
        }, 3000); // 3 seconds
    }
}
// Attach listeners for idle
['mousemove', 'touchstart', 'click'].forEach(evt => {
    document.getElementById('media-panel').addEventListener(evt, resetIdleTimer);
});

// --- Interaction Logic ---

function setupEventListeners() {
    // Continue Button Delegation
    document.getElementById('questions-container').addEventListener('click', (e) => {
        if (e.target.closest('.btn-continue')) {
            const btn = e.target.closest('.btn-continue');
            confirmAnswer(btn.dataset.id);
        }
    });

    // Start Button
    document.getElementById('btn-start').addEventListener('click', () => {
        const overlay = document.getElementById('welcome-overlay');
        overlay.style.opacity = '0';
        setTimeout(() => overlay.style.display = 'none', 500);

        if (state.mediaType === 'video') {
            const v = document.getElementById('main-video');
            if (v) v.play().catch(e => console.warn('Autoplay blocked'));
            updatePlayIcon(true);
        }
    });

    // Media Controls
    document.getElementById('btn-play').addEventListener('click', togglePlay);
    document.getElementById('btn-next').addEventListener('click', nextMedia);
    document.getElementById('btn-prev').addEventListener('click', prevMedia);
    document.getElementById('btn-fullscreen').addEventListener('click', toggleFullscreen);

    // Form Changes (Gating)
    document.getElementById('eval-form').addEventListener('change', (e) => {
        checkAnswers();
        // Exclusive select logic for 'ordenar'
        if (e.target.classList.contains('orden-select')) handleOrderSelect(e.target);
    });

    // Submit
    document.getElementById('eval-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const modal = new bootstrap.Modal(document.getElementById('signatureModal'));
        modal.show();
    });

    // Signature Tabs
    const radios = document.querySelectorAll('input[name="sign-mode"]');
    radios.forEach(r => {
        r.addEventListener('change', (e) => {
            const mode = e.target.id;
            if (mode === 'mode-draw') {
                document.getElementById('area-draw').classList.remove('d-none');
                document.getElementById('area-draw').classList.add('d-flex');
                document.getElementById('area-type').classList.add('d-none');
                document.getElementById('area-type').classList.remove('d-flex');
            } else {
                document.getElementById('area-draw').classList.add('d-none');
                document.getElementById('area-draw').classList.remove('d-flex');
                document.getElementById('area-type').classList.remove('d-none');
                document.getElementById('area-type').classList.add('d-flex');
            }
        });
    });

    // Type Preview
    document.getElementById('type-input').addEventListener('input', (e) => {
        const val = e.target.value || 'Tu Nombre Aquí';
        document.getElementById('type-preview').textContent = val;
    });

    // Signature Clear
    document.getElementById('btn-clear-sign').addEventListener('click', () => state.signaturePad.clear());
    document.getElementById('btn-confirm-submit').addEventListener('click', submitFinal);
}

// --- Media Logic ---

function onVideoTimeUpdate(source) {
    // source can be HTML5 video element or object {currentTime, duration} from YouTube
    const current = source.currentTime !== undefined ? source.currentTime : source;
    const duration = source.duration || (state.mediaType === 'video' ? document.getElementById('main-video').duration : ytPlayer.getDuration());

    // Safety check
    if (isNaN(current)) return;

    document.getElementById('time-current').textContent = formatTime(current);
    const pct = (current / duration) * 100;
    document.getElementById('progress-bar').style.width = `${pct}%`;

    // Strict Blocking: Prevent seeking past max allowed
    if (current > state.maxTimeAllowed + 1) {
        // ... (existing block logic) ...
        if (state.mediaType === 'video') {
            const v = document.getElementById('main-video');
            v.currentTime = state.maxTimeAllowed;
            v.pause();
        } else if (state.mediaType === 'youtube') {
            ytPlayer.seekTo(state.maxTimeAllowed);
            ytPlayer.pauseVideo();
        }
        updatePlayIcon(false);
        showErrorToast('Responde la pregunta para continuar.');
    }

    // Check complete
    if (Math.abs(current - duration) < 1 && duration > 0) {
        state.materialFinished = true;
        checkAnswers();
    }

    // Check Gates
    checkGates(current);
}

function checkGates(metric) {
    // metric is currentTime (video/youtube) or pageNum (pdf)
    if (!state.data.preguntas) return;

    state.data.preguntas.forEach(p => {
        const trigger = parseFloat(p.segundo_aparicion || 0);

        // Should we show this question?
        let shouldShow = false;
        if ((state.mediaType === 'video' || state.mediaType === 'youtube') && metric >= trigger) shouldShow = true;
        if (state.mediaType === 'pdf' && metric === trigger) shouldShow = true;

        if (shouldShow && !state.visibleQuestions.has(p.id)) {
            // Show Question
            const card = document.getElementById(`q-card-${p.id}`);
            if (card) {
                card.classList.add('visible');
                card.scrollIntoView({ behavior: 'smooth', block: 'center' });
                state.visibleQuestions.add(p.id);

                // Soft Pause Logic
                if ((state.mediaType === 'video' || state.mediaType === 'youtube') && !state.answeredQuestions.has(p.id)) {
                    // Set max time allowed to this trigger point
                    state.maxTimeAllowed = trigger;

                    // Pause after 0.5s to let user hear context
                    if (!state.softPauseTimer) {
                        state.softPauseTimer = setTimeout(() => {
                            pauseMedia(true);
                            state.softPauseTimer = null;
                        }, 500);
                    }
                }
            }
        }
    });

    // If all visible questions are answered, extend maxTimeAllowed
    if ((state.mediaType === 'video' || state.mediaType === 'youtube') && !isBlocked()) {
        // Find NEXT gate
        let nextGate = Infinity;
        state.data.preguntas.forEach(p => {
            const t = parseFloat(p.segundo_aparicion || 0);
            if (t > state.maxTimeAllowed && t < nextGate) nextGate = t;
        });

        let duration = 0;
        if (state.mediaType === 'video') {
            const v = document.getElementById('main-video');
            if (v) duration = v.duration;
        } else if (state.mediaType === 'youtube' && ytPlayer) {
            duration = ytPlayer.getDuration();
        }

        if (nextGate === Infinity) state.maxTimeAllowed = duration;
        else state.maxTimeAllowed = nextGate;
    }

    updateProgress();
}

function pauseMedia(force = false) {
    if (state.mediaType === 'video') {
        const v = document.getElementById('main-video');
        if (v) {
            v.pause();
            updatePlayIcon(false);
            resetIdleTimer();
        }
    } else if (state.mediaType === 'youtube' && ytPlayer) {
        ytPlayer.pauseVideo();
        updatePlayIcon(false);
        resetIdleTimer();
    }
}

function togglePlay() {
    if (state.mediaType === 'video') {
        const v = document.getElementById('main-video');
        if (v.paused) {
            if (isBlocked()) {
                showErrorToast('Responde la pregunta para continuar.');
                return;
            }
            v.play();
            updatePlayIcon(true);
            resetIdleTimer();
        } else {
            v.pause();
            updatePlayIcon(false);
            resetIdleTimer();
        }
    } else if (state.mediaType === 'youtube' && ytPlayer) {
        const state = ytPlayer.getPlayerState();
        if (state !== YT.PlayerState.PLAYING) {
            if (isBlocked()) {
                showErrorToast('Responde la pregunta para continuar.');
                return;
            }
            ytPlayer.playVideo();
            resetIdleTimer();
        } else {
            ytPlayer.pauseVideo();
            resetIdleTimer();
        }
    }
}

function isBlocked() {
    for (let id of state.visibleQuestions) {
        if (!state.confirmedQuestions.has(id)) return true;
    }
    return false;
}

function confirmAnswer(id) {
    const pId = parseInt(id);
    state.confirmedQuestions.add(pId);

    // Hide Card
    const card = document.getElementById(`q-card-${pId}`);
    if (card) {
        card.style.transition = 'all 0.5s ease';
        card.style.opacity = '0';
        card.style.transform = 'translateX(100%)';
        setTimeout(() => {
            card.style.display = 'none';
        }, 500);
    }

    // Attempt to resume media
    if (state.mediaType === 'video' || state.mediaType === 'youtube') {
        // Only resume if NOT blocked by another visible question
        if (!isBlocked()) {

            // FIX: Explicitly release the gate before playing to prevent "timeupdate" race condition
            // Find current time to check gates against
            let currentTime = 0;
            if (state.mediaType === 'video') {
                const v = document.getElementById('main-video');
                if (v) currentTime = v.currentTime;
            } else if (state.mediaType === 'youtube' && ytPlayer && ytPlayer.getCurrentTime) {
                currentTime = ytPlayer.getCurrentTime();
            }

            // Force gate check to extend maxTimeAllowed immediately
            checkGates(currentTime);

            // Small delay to feel natural
            setTimeout(() => {
                if (state.mediaType === 'video') {
                    const v = document.getElementById('main-video');
                    if (v) { v.play(); updatePlayIcon(true); }
                } else if (state.mediaType === 'youtube' && ytPlayer) {
                    ytPlayer.playVideo();
                }
            }, 300);
        }
    }

    checkAnswers(); // Update progress and final submit visibility
}

function nextMedia() {
    if (state.mediaType === 'pdf') {
        // Require explicit click on last page to mark as finished
        if (state.pageNum >= state.pdfDoc.numPages) {
            if (!state.materialFinished) {
                state.materialFinished = true;
                checkAnswers();
                showErrorToast('<i class="fas fa-check-circle"></i> Lectura completada.');
            }
            return;
        }

        if (isBlocked()) {
            showErrorToast('Responde la pregunta para continuar.');
            return;
        }

        state.pageNum++;
        renderPage(state.pageNum);
        checkGates(state.pageNum);
    }
}

function prevMedia() {
    if (state.mediaType === 'pdf' && state.pageNum > 1) {
        state.pageNum--;
        renderPage(state.pageNum);
    }
}

function renderPage(num) {
    state.pdfDoc.getPage(num).then(page => {
        const canvas = document.getElementById('pdf-canvas');
        const ctx = canvas.getContext('2d');
        const viewport = page.getViewport({ scale: state.pdfScale });
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        page.render({ canvasContext: ctx, viewport: viewport });
        document.getElementById('time-current').textContent = `Pág ${num}`;
    });
}

function updatePlayIcon(isPlaying) {
    const btn = document.getElementById('btn-play');
    btn.innerHTML = isPlaying ? '<i class="fas fa-pause"></i>' : '<i class="fas fa-play"></i>';
}

function toggleFullscreen() {
    const el = document.getElementById('media-panel');
    if (!document.fullscreenElement) {
        el.requestFullscreen().catch(err => console.log(err));
    } else {
        document.exitFullscreen();
    }
}

// --- Helper Logic ---

function checkAnswers() {
    const form = document.getElementById('eval-form');
    const formData = new FormData(form);

    // Check which questions are answered
    state.data.preguntas.forEach(p => {
        const name = `q_${p.id}`;
        if (p.tipo === 'ordenar') {
            const selects = form.querySelectorAll(`select[name^="${name}_"]`);
            let allFilled = true;
            selects.forEach(s => { if (!s.value) allFilled = false; });
            if (allFilled) state.answeredQuestions.add(p.id);
        } else {
            if (formData.has(name) && formData.get(name).trim() !== '') {
                state.answeredQuestions.add(p.id);
            }
        }

        // UI: Show Continue button if answered but NOT confirmed
        if (state.answeredQuestions.has(p.id) && !state.confirmedQuestions.has(p.id)) {
            const btn = document.querySelector(`.btn-continue[data-id="${p.id}"]`);
            if (btn) btn.style.display = 'inline-block';
        }
    });

    updateProgress();

    // Show submit if all shown
    // Show submit if all shown + blocked clear + MATERIAL FINISHED
    const allQuestionsVisible = state.visibleQuestions.size === state.data.preguntas.length;
    const allAnswered = !isBlocked();

    // Logic: 
    // 1. All questions must be triggered (visible).
    // 2. All visible questions must be answered.
    // 3. Material must be finished (Video ended or Last Page reached).

    if (allQuestionsVisible && allAnswered && state.materialFinished) {
        document.getElementById('submit-area').style.display = 'block';
    } else {
        document.getElementById('submit-area').style.display = 'none';
    }
}

function updateProgress() {
    const total = state.data.preguntas.length;
    const answered = state.answeredQuestions.size;
    document.getElementById('progress-badge').textContent = `${answered}/${total}`;
}

function showAllQuestions() {
    document.querySelectorAll('.pregunta-card').forEach(c => c.classList.add('visible'));
    document.getElementById('submit-area').style.display = 'block';
}

function initSignaturePad() {
    const canvas = document.getElementById('signature-pad');
    if (!canvas) return;

    // Destroy old instance if exists
    if (state.signaturePad) {
        state.signaturePad.off();
        state.signaturePad = null;
    }

    // Resize properly
    const ratio = Math.max(window.devicePixelRatio || 1, 1);
    canvas.width = canvas.offsetWidth * ratio;
    canvas.height = canvas.offsetHeight * ratio;
    canvas.getContext("2d").scale(ratio, ratio);

    state.signaturePad = new SignaturePad(canvas, { backgroundColor: 'rgb(255, 255, 255)' });
}

function handleOrderSelect(select) {
    const container = select.closest('.options-area');
    const allSelects = container.querySelectorAll('select');
    const selected = new Set();

    allSelects.forEach(s => { if (s.value) selected.add(s.value); });

    allSelects.forEach(s => {
        const current = s.value;
        Array.from(s.options).forEach(opt => {
            if (opt.value && selected.has(opt.value) && opt.value !== current) {
                opt.disabled = true;
            } else {
                opt.disabled = false;
            }
        });
    });
}

function formatTime(s) {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
}

function showErrorToast(msg) {
    // Premium Toast
    const toast = document.createElement('div');
    toast.className = 'position-fixed top-50 start-50 translate-middle p-4 rounded-4 shadow-lg text-white text-center';
    toast.style.zIndex = 10000;
    toast.style.background = 'rgba(220, 53, 69, 0.95)';
    toast.style.backdropFilter = 'blur(10px)';
    toast.style.minWidth = '300px';
    toast.style.maxWidth = '90%';
    toast.innerHTML = `
        <div class="mb-2"><i class="fas fa-exclamation-triangle fa-2x"></i></div>
        <div class="fw-bold">${msg}</div>
    `;
    document.body.appendChild(toast);

    // Animation
    toast.animate([
        { opacity: 0, transform: 'translate(-50%, -60%)' },
        { opacity: 1, transform: 'translate(-50%, -50%)' }
    ], { duration: 300, easing: 'cubic-bezier(0.175, 0.885, 0.32, 1.275)' });

    setTimeout(() => {
        toast.animate([
            { opacity: 1, transform: 'translate(-50%, -50%)' },
            { opacity: 0, transform: 'translate(-50%, -40%)' }
        ], { duration: 300, fill: 'forwards' }).onfinish = () => toast.remove();
    }, 2500);
}

function triggerConfetti() {
    for (let i = 0; i < 50; i++) {
        const conf = document.createElement('div');
        conf.className = 'confetti';
        conf.style.left = Math.random() * 100 + 'vw';
        conf.style.backgroundColor = ['#f00', '#0f0', '#00f', '#ff0', '#f0f'][Math.floor(Math.random() * 5)];
        conf.style.animationDuration = (Math.random() * 3 + 2) + 's';
        document.body.appendChild(conf);
        setTimeout(() => conf.remove(), 5000);
    }
}

// --- Submission ---

async function submitFinal() {
    // 1. Legal Disclaimer & Confirmation
    const result = await Swal.fire({
        title: 'Confirmación de Identidad',
        html: `
            <div class="text-start small text-muted">
                <p>Al firmar y enviar esta evaluación, usted declara que:</p>
                <ul class="mb-3">
                    <li>Ha recibido y comprendido el contenido de la capacitación.</li>
                    <li>La firma proporcionada es auténtica y corresponde a su identidad.</li>
                    <li>Acepta que esta firma se utilice como medio de autenticación y validación legal de su participación.</li>
                </ul>
            </div>
        `,
        icon: 'info',
        showCancelButton: true,
        confirmButtonText: 'Acepto y Enviar',
        cancelButtonText: 'Cancelar',
        confirmButtonColor: getComputedStyle(document.documentElement).getPropertyValue('--bs-primary'),
        reverseButtons: true
    });

    if (!result.isConfirmed) return;
    const mode = document.querySelector('input[name="sign-mode"]:checked').id;

    if (mode === 'mode-draw') {
        if (state.signaturePad.isEmpty()) {
            showErrorToast('Debes firmar para continuar.');
            return;
        }
    } else {
        const name = document.getElementById('type-input').value.trim();
        if (!name) {
            showErrorToast('Debes escribir tu nombre.');
            return;
        }

        // Render text to canvas
        const canvas = document.getElementById('signature-pad');
        const ctx = canvas.getContext('2d');

        // Clear and set white background
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Draw Text
        ctx.font = "60px 'Great Vibes', cursive";
        ctx.fillStyle = "black";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(name, canvas.width / 2, canvas.height / 2);
    }

    const btn = document.getElementById('btn-confirm-submit');
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i> Enviando...';

    // Collect Data
    const form = document.getElementById('eval-form');
    const respuestas = [];

    state.data.preguntas.forEach(p => {
        const name = `q_${p.id}`;
        if (p.tipo === 'ordenar') {
            const selects = Array.from(form.querySelectorAll(`select[name^="${name}_"]`));
            const values = selects.map(s => parseInt(s.value));
            respuestas.push({ id_pregunta: p.id, valor: values });
        } else if (p.tipo === 'seleccion' || p.tipo === 'verdadero_falso') {
            const val = form.querySelector(`input[name="${name}"]:checked`)?.value;
            respuestas.push({ id_pregunta: p.id, valor: val });
        } else {
            const val = form.querySelector(`textarea[name="${name}"]`)?.value;
            respuestas.push({ id_pregunta: p.id, valor: val });
        }
    });

    const user = window.getCurrentUser ? window.getCurrentUser() : {};
    const payload = {
        action: 'save_response',
        id_header: state.idHeader,
        id_colaborador: user.usuario_id || user.id,
        firma: state.signaturePad.toDataURL(),
        respuestas: respuestas
    };

    try {
        const res = await fetch('assets/php/evaluacion_api.php?action=save_response', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await res.json();

        if (data.success) {
            bootstrap.Modal.getInstance(document.getElementById('signatureModal')).hide();

            const resultModal = new bootstrap.Modal(document.getElementById('resultModal'));
            document.getElementById('result-score').textContent = `${Math.round(data.calificacion)}%`;

            const icon = document.getElementById('result-icon');
            const title = document.getElementById('result-title');
            const msg = document.getElementById('result-msg');
            const actions = document.getElementById('result-actions');

            if (data.passed) {
                triggerConfetti();
                icon.innerHTML = '<i class="fas fa-check-circle text-success"></i>';
                title.textContent = '¡Aprobado!';
                title.className = 'fw-bold text-success';
                msg.textContent = 'Has completado la evaluación satisfactoriamente.';
                actions.innerHTML = '<a href="mis_evaluaciones.html" class="btn btn-primary btn-lg rounded-pill shadow w-100">Volver al Inicio</a>';
            } else {
                icon.innerHTML = '<i class="fas fa-times-circle text-danger"></i>';
                title.textContent = 'Reprobado';
                title.className = 'fw-bold text-danger';
                msg.textContent = 'No has alcanzado la nota mínima.';
                actions.innerHTML = '<button onclick="location.reload()" class="btn btn-warning btn-lg rounded-pill shadow w-100">Intentar de Nuevo</button>';
            }

            resultModal.show();
        } else {
            showErrorToast('Error al guardar: ' + data.error);
            btn.disabled = false;
            btn.innerHTML = 'Confirmar y Enviar';
        }
    } catch (e) {
        console.error(e);
        showErrorToast('Error de red al enviar.');
        btn.disabled = false;
        btn.innerHTML = 'Confirmar y Enviar';
    }
}
