(function () {
  const DESKTOP_STATE_KEY = 'sidebarDesktopState'; // 'collapsed', 'expanded', 'hidden'

  function isSM() { return window.innerWidth <= 768; }

  // --- STATE MANAGEMENT ---

  function getDesktopState() {
    // Default to 'collapsed' (icon mode) per user request
    return localStorage.getItem(DESKTOP_STATE_KEY) || 'collapsed';
  }

  function setDesktopState(state) {
    if (!isSM()) {
      console.log('OSM: Saving sidebar state:', state);
      localStorage.setItem(DESKTOP_STATE_KEY, state);
      applyState(state);
    }
  }

  function applyState(state) {
    const sidebar = document.querySelector('.sidebar');
    const container = document.getElementById('sidebar');
    if (!sidebar) return;

    // console.log('OSM: Applying sidebar state:', state);

    if (isSM()) {
      // MOBILE: Reset desktop specific classes to avoid conflicts
      sidebar.classList.remove('collapsed');
      updateLogoVisibility('expanded'); // Always show Text OSM in mobile when open
      return;
    }

    // DESKTOP LOGIC
    if (state === 'hidden') {
      sidebar.style.display = 'none';
      if (container) container.style.display = 'none';
      // We don't change .collapsed class here to preserve "width" memory when unhiding
    } else {
      // Ensure specific visibility
      sidebar.style.removeProperty('display');
      sidebar.style.display = 'block';
      if (container) container.style.display = 'block';

      if (state === 'collapsed') {
        sidebar.classList.add('collapsed');
        updateLogoVisibility('collapsed');
      } else if (state === 'expanded') {
        sidebar.classList.remove('collapsed');
        updateLogoVisibility('expanded');
      }
    }

    // Mark as ready
    sidebar.setAttribute('data-filtering-complete', 'true');
  }

  function updateLogoVisibility(visualState) {
    const logoImg = document.querySelector('.logo-collapsed');
    const brandText = document.querySelector('.sidebar-brand-text');

    if (visualState === 'collapsed') {
      if (logoImg) logoImg.style.display = 'block';
      if (brandText) brandText.style.display = 'none';
    } else {
      // Expanded or Mobile
      if (logoImg) logoImg.style.display = 'none';
      if (brandText) brandText.style.display = 'block';
    }
  }

  // --- INITIALIZATION ---

  function setInitialSidebar() {
    const sidebar = document.querySelector('.sidebar');
    const container = document.getElementById('sidebar');

    // If sidebar component isn't loaded yet, we can't do anything.
    // However, since we use display:none !important in CSS, it starts hidden.
    if (!sidebar) return;

    if (isSM()) {
      // Mobile: Force hidden (with priority) and expanded logic
      sidebar.style.setProperty('display', 'none', 'important');
      if (container) container.style.setProperty('display', 'none', 'important');

      sidebar.classList.remove('collapsed');
      sidebar.classList.remove('toggled');
      updateLogoVisibility('expanded');
    } else {
      // Desktop: Apply saved state immediately
      const savedState = getDesktopState();
      applyState(savedState);

      // Force display block if allowed, to override the !important css
      if (savedState !== 'hidden') {
        sidebar.style.removeProperty('display'); // Remove inline none first if needed
        sidebar.style.display = 'block';
        if (container) container.style.display = 'block';
      }
    }
  }

  // --- INTERACTIONS ---

  function toggleSidebarHamburger() {
    const sidebar = document.querySelector('.sidebar');
    const container = document.getElementById('sidebar');

    console.log('OSM: Toggle called. Width:', window.innerWidth, 'isSM:', isSM());

    if (isSM()) {
      // Mobile: Class-based Toggle for robustness
      // Check if it has the class OR is explicitly visible
      const isVisible = sidebar.classList.contains('mobile-open') || (sidebar.style.display === 'block' && sidebar.style.display !== 'none');
      console.log('OSM: Mobile Toggle. Current isVisible:', isVisible);

      if (isVisible) {
        // HIDING
        sidebar.classList.remove('mobile-open');
        sidebar.classList.remove('toggled'); // cleanup

        // Force style clear/none to ensure CSS takes over or it hides
        sidebar.style.setProperty('display', 'none', 'important');
        if (container) {
          container.classList.remove('mobile-open');
          container.style.setProperty('display', 'none', 'important');
        }
      } else {
        // OPENING
        sidebar.classList.remove('collapsed'); // CRITICAL: Ensure full width
        sidebar.classList.add('mobile-open');
        updateLogoVisibility('expanded'); // CRITICAL: Show text

        // Force inline display block to beat any specific rules
        sidebar.style.setProperty('display', 'block', 'important');

        if (container) {
          container.classList.add('mobile-open');
          container.style.setProperty('display', 'block', 'important');
        }
      }
    } else {
      // Desktop: Toggle Hidden <-> Last Visible State
      const currentState = getDesktopState();
      if (currentState === 'hidden') {
        // Default to 'collapsed' when unhiding from hamburger
        setDesktopState('collapsed');
      } else {
        // If visible, hide it
        setDesktopState('hidden');
      }
    }
  }

  // EXPOSE GLOBAL FOR HTML ONCLICK
  window.toggleSidebarHamburger = function () {
    // DEBUG: Alert to confirm click reception
    // alert('DEBUG: Hamburger Clicked! Checking sidebar...');

    const sidebar = document.querySelector('.sidebar');
    if (!sidebar) {
      alert('ERROR: Sidebar element not found!');
      return;
    }

    // Call the internal function
    toggleSidebarHamburger();
  };

  function handleSidebarClick(e) {
    if (isSM()) return; // Mobile handled by toggle button only

    // User: "si clickeamos la barra que se abra".

    const sidebar = document.querySelector('.sidebar');
    if (!sidebar.classList.contains('collapsed')) return; // Already expanded

    // If target is the bottom toggle button (or child), ignore (it handles collapse)
    if (e.target.closest('#sidebarToggle')) return;

    // Expand
    setDesktopState('expanded');
  }

  function handleBottomToggle(e) {
    if (isSM()) return;

    // This button is explicitly for "plegar" (fold/collapse)
    const currentState = getDesktopState();
    if (currentState === 'expanded') {
      setDesktopState('collapsed');
      e.stopPropagation(); // Prevent bubbling to sidebar click
    } else {
      // If collapsed, maybe it expands? 
      setDesktopState('expanded');
      e.stopPropagation();
    }
  }

  // --- FILTERING LOGIC (Preserved from Fix) ---

  const normalize = (str) =>
    String(str || '')
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, '_');

  async function filtrarSidebarPorRol() {
    const sidebar = document.querySelector('.sidebar');
    if (!sidebar) return;

    try {
      const userPermissions = JSON.parse(sessionStorage.getItem('userPermissions'));

      if (!userPermissions) {
        // Fallback safety
        const timeout = setTimeout(() => filtrarSidebarPorRol(), 2000);
        document.addEventListener('auth_checked', () => {
          clearTimeout(timeout);
          filtrarSidebarPorRol();
        }, { once: true });
        return;
      }

      const isAdmin = userPermissions.is_admin;
      const userRoles = (userPermissions.roles || []).map(normalize);
      const allowedPaths = (userPermissions.permissions || []).map(p => {
        let path = p.resource_path.toLowerCase().trim();
        return path.startsWith('/') ? path : '/' + path;
      });

      const checkPathAccess = (path) => {
        if (!path || path === '#' || path === 'javascript:void(0)') return true;
        let cleanPath = path.split('?')[0].toLowerCase().trim();
        if (!cleanPath.startsWith('/')) cleanPath = '/' + cleanPath;
        return allowedPaths.some(allowed => cleanPath === allowed);
      };

      // Admin Bypass
      if (isAdmin) {
        if (!isSM()) {
          applyState(getDesktopState());
        }
        sidebar.setAttribute('data-filtering-complete', 'true');
        return;
      }

      // Filter Logic
      document.querySelectorAll('.dropdown-item').forEach(item => {
        if (item.hasAttribute('data-role')) {
          const roles = item.dataset.role.split(',').map(normalize);
          const hasRole = userRoles.some(r => roles.includes(r));
          item.style.display = hasRole ? 'block' : 'none';
        } else {
          item.style.display = checkPathAccess(item.getAttribute('href')) ? 'block' : 'none';
        }
      });

      document.querySelectorAll('.nav-item.dropdown[data-role]').forEach(item => {
        const roles = item.dataset.role.split(',').map(normalize);
        const hasRole = userRoles.some(r => roles.includes(r));
        item.style.display = hasRole ? 'block' : 'none';
      });

      document.querySelectorAll('.nav-item.dropdown').forEach(dropdown => {
        if (dropdown.style.display === 'none') return;
        const visibleChildren = Array.from(dropdown.querySelectorAll('.dropdown-item'))
          .filter(item => item.style.display !== 'none');
        if (visibleChildren.length === 0) {
          dropdown.style.display = 'none';
        } else {
          dropdown.style.display = 'block';
        }
      });

      // Finalize display
      if (!isSM()) {
        const currentState = getDesktopState();
        applyState(currentState);
      } else {
        sidebar.setAttribute('data-filtering-complete', 'true');
      }

    } catch (e) {
      console.error('Error CRÍTICO en filtrarSidebarPorRol:', e);
      // Emergency Show
      if (!isSM()) {
        sidebar.style.removeProperty('display');
        sidebar.style.display = 'block';
        const c = document.getElementById('sidebar');
        if (c) c.style.display = 'block';
        sidebar.classList.remove('collapsed'); // Safe default
      }
    }
  }

  // --- MAIN INIT ---

  function init() {
    const sidebar = document.querySelector('.sidebar');
    if (sidebar) {
      setInitialSidebar();
      filtrarSidebarPorRol();

      // Events
      sidebar.addEventListener('click', handleSidebarClick);

      const bottomToggle = document.getElementById('sidebarToggle');
      if (bottomToggle) bottomToggle.addEventListener('click', handleBottomToggle);
    }

    // ROBUST INITIALIZATION: Watch for sidebar injection via MutationObserver
    // This allows sidebar.js to work regardless of which script (main.js, agronomia.js, etc.) loads the sidebar
    // and eliminates the need for manual event dispatching or race-condition guessing.
    const observer = new MutationObserver((mutations, obs) => {
      const sidebar = document.querySelector('.sidebar');
      if (sidebar) {
        // Sidebar found! Initialize it.
        // console.log('OSM: Sidebar detected by observer. Initializing...');
        setInitialSidebar();
        filtrarSidebarPorRol();

        // Re-attach listeners just in case
        sidebar.removeEventListener('click', handleSidebarClick); // prevent duplicates
        sidebar.addEventListener('click', handleSidebarClick);

        const bottomToggle = document.getElementById('sidebarToggle');
        if (bottomToggle) {
          bottomToggle.removeEventListener('click', handleBottomToggle);
          bottomToggle.addEventListener('click', handleBottomToggle);
        }

        // ROBUST: Find the top toggle button and attach directly
        const topToggle = document.querySelector('#sidebarToggleTop');
        if (topToggle) {
          console.log('OSM: Top toggle found via observer. Attaching listener.');
          // Remove any old one
          topToggle.onclick = null;
          // Direct attachment
          topToggle.addEventListener('click', function (e) {
            e.preventDefault();
            e.stopPropagation();
            console.log('OSM: Top toggle clicked (Direct Listener)');
            window.toggleSidebarHamburger();
          });
        }

        // Apply state again to be sure
        if (!isSM()) {
          applyState(getDesktopState());
        }

        // We can disconnect if we only expect one sidebar, but for safety with re-renders, we'll keep it observing
        // or just rely on the checks.
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    // Failsafe: Try to unhide if it remains hidden after short delay (DESKTOP ONLY)
    setTimeout(() => {
      if (isSM()) return; // Never auto-show on mobile
      const s = document.querySelector('.sidebar');
      if (s && s.style.display === 'none' && getDesktopState() !== 'hidden') {
        s.style.display = 'block';
        const c = document.getElementById('sidebar');
        if (c) c.style.display = 'block';
        // Apply collapsed class if needed
        if (getDesktopState() === 'collapsed') s.classList.add('collapsed');
      }
    }, 250);
  }

  document.addEventListener('components_loaded', init);
  document.addEventListener('DOMContentLoaded', () => {
    init();

    // Hamburger Listener (Delegated with Capture to beat other scripts)
    // Hamburger Listener (Delegated)
    // Removed 'true' capture phase to play nice with other scripts, rely on bubbling or direct attachment above.
    // The MutationObserver above already attaches a direct listener to #sidebarToggleTop, so this is just a backup for other buttons.
    document.addEventListener('click', function (e) {
      if (e.target.closest('#sidebarToggleTop')) {
        // Already handled by direct listener in observer?
        // Let's check if direct listener is missing or failed.
        // But to be safe, we can rely on this global capture if we dedupe.
        // However, the best approach is to let the direct listener handle it if possible.
        return;
      }

      // Check for other potential hamburger buttons (e.g. if the ID is wrong but class matches)
      // NEW DEDICATED MOBILE TOGGLE
      const mobileBtn = e.target.closest('#mobileSidebarToggle');
      if (mobileBtn) {
        console.log('OSM: Dedicated #mobileSidebarToggle clicked');
        toggleSidebarHamburger();
        return;
      }

      const btn = e.target.closest('.btn-link') || e.target.closest('button');
      if (btn) {
        const hasBars = btn.querySelector('.fa-bars') || btn.classList.contains('fa-bars') || (e.target.classList.contains('fa-bars'));
        if (hasBars && btn.id !== 'sidebarToggleTop') { // Don't double handle the main one
          console.log('OSM: Generic mobile hamburger clicked');
          // e.preventDefault();
          toggleSidebarHamburger();
        }
      }
    });

    // Resize Listener
    window.addEventListener('resize', () => {
      if (isSM()) {
        const sidebar = document.querySelector('.sidebar');
        if (sidebar) {
          sidebar.classList.remove('collapsed');
          updateLogoVisibility('expanded');
          sidebar.style.setProperty('display', 'none', 'important'); // Revert to mobile hidden
          const c = document.getElementById('sidebar');
          if (c) c.style.setProperty('display', 'none', 'important');
        }
      } else {
        applyState(getDesktopState());
      }
    });
  });

})();