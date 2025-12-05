document.addEventListener('DOMContentLoaded', function () {
    // --- Toggle Logic (Existing) ---
    const btnColaborador = document.getElementById('btn-colaborador');
    const btnAdmin = document.getElementById('btn-admin');
    const sectionColaborador = document.getElementById('section-colaborador');
    const sectionAdmin = document.getElementById('section-admin');

    function switchTab(type) {
        if (type === 'colaborador') {
            btnColaborador.classList.add('active');
            btnAdmin.classList.remove('active');
            sectionColaborador.classList.add('active');
            sectionAdmin.classList.remove('active');
        } else {
            btnAdmin.classList.add('active');
            btnColaborador.classList.remove('active');
            sectionAdmin.classList.add('active');
            sectionColaborador.classList.remove('active');
        }
    }

    if (btnColaborador && btnAdmin) {
        btnColaborador.addEventListener('click', () => switchTab('colaborador'));
        btnAdmin.addEventListener('click', () => switchTab('admin'));
    }

    // --- Advanced Particle System ---
    const container = document.getElementById('particles-container');
    let currentEffect = 'oil';
    let currentSpeed = 5;
    let isPaused = false;

    // Create Pause Button
    createPauseButton();

    // Listen for config updates
    window.addEventListener('loginEffectUpdate', (e) => {
        applyEffect(e.detail.type, e.detail.speed);
    });

    // Check for pre-loaded config
    if (window.loginEffectConfig) {
        applyEffect(window.loginEffectConfig.type, window.loginEffectConfig.speed);
    } else {
        // Default fallback
        applyEffect('oil', 5);
    }

    function createPauseButton() {
        if (!container) return;

        // Remove existing button if any
        const existingBtn = document.getElementById('effect-pause-btn');
        if (existingBtn) existingBtn.remove();

        const btn = document.createElement('button');
        btn.id = 'effect-pause-btn';
        btn.innerHTML = '<i class="fas fa-pause"></i>';
        btn.className = 'btn btn-sm btn-light rounded-circle shadow';
        btn.style.position = 'fixed';
        btn.style.bottom = '20px';
        btn.style.right = '20px';
        btn.style.zIndex = '1000';
        btn.style.width = '40px';
        btn.style.height = '40px';
        btn.style.display = 'flex';
        btn.style.alignItems = 'center';
        btn.style.justifyContent = 'center';

        btn.addEventListener('click', () => {
            isPaused = !isPaused;
            btn.innerHTML = isPaused ? '<i class="fas fa-play"></i>' : '<i class="fas fa-pause"></i>';
            toggleAnimationState();
        });

        document.body.appendChild(btn);
    }

    function toggleAnimationState() {
        // Pause/Resume wrappers
        const wrappers = container.querySelectorAll('.particle-wrapper');
        wrappers.forEach(w => {
            w.style.animationPlayState = isPaused ? 'paused' : 'running';
        });

        // Pause/Resume inner elements (for blinking/rotating)
        const inners = container.querySelectorAll('.particle-wrapper > div');
        inners.forEach(i => {
            i.style.animationPlayState = isPaused ? 'paused' : 'running';
        });
    }

    function applyEffect(type, speed) {
        if (!container) return;

        currentEffect = type;
        currentSpeed = parseInt(speed) || 5;

        // Clear existing
        container.innerHTML = '';

        const btn = document.getElementById('effect-pause-btn');
        if (type === 'none') {
            if (btn) btn.style.display = 'none';
            return;
        } else {
            if (btn) btn.style.display = 'flex';
        }

        // Generate particles based on type
        switch (type) {
            case 'oil':
                createParticles('oil-drop', 150, false);
                break;
            case 'snow':
                createParticles('snowflake', 200, false);
                break;
            case 'lights':
                createParticles('light-bulb', 100, false); // Rotation handled by CSS blink scale if needed, but here we just fall
                break;
            case 'rain':
                createParticles('rain-drop', 300, false);
                break;
            case 'leaves':
                createParticles('leaf', 80, true);
                break;
        }
    }

    function createParticles(className, count, hasRotation) {
        // Base speed factor: 1 (slow) to 10 (fast)
        // We invert this for duration: higher speed = lower duration
        const baseDuration = 15 - currentSpeed; // 14s to 5s range roughly

        for (let i = 0; i < count; i++) {
            // Create Wrapper for Falling Animation
            const wrapper = document.createElement('div');
            wrapper.classList.add('particle-wrapper');

            // Create Inner for Visuals and Secondary Animation
            const inner = document.createElement('div');
            inner.classList.add(className);

            // Random positioning
            const startX = Math.random() * 100;

            // Speed variation
            const duration = Math.random() * 5 + baseDuration;
            const delay = Math.random() * 5;

            wrapper.style.left = `${startX}%`;
            wrapper.style.animationDuration = `${duration}s`;
            wrapper.style.animationDelay = `${delay}s`;

            // Specific styles per effect
            if (className === 'light-bulb') {
                // Random colors for lights
                const colors = ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff'];
                inner.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
                inner.style.boxShadow = `0 0 10px ${inner.style.backgroundColor}`;

                // Random blink delay
                inner.style.animationDelay = `${Math.random() * 2}s`;
            }

            if (className === 'leaf') {
                // Random rotation duration
                const rotDuration = Math.random() * 3 + 2;
                inner.style.animationDuration = `${rotDuration}s`;
                inner.style.animationDelay = `${Math.random()}s`;
            }

            wrapper.appendChild(inner);
            container.appendChild(wrapper);
        }
    }
});
