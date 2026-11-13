let currentScrollY = 0;
let projectsData = [];
let categoriesData = ['Default'];
let activeCategory = 'All';
let searchQuery = '';
const PROJECT_LOADER_MIN_MS = 650;
let projectsLoadingStartedAt = 0;
let projectsLoadingTimer = null;
let projectOverlayOpen = false;
let projectCardObserver = null;
let resetProjectMagnification = () => {};
let pauseShowreel = () => {};

function initShowreel() {
  const iframe = document.getElementById('workShowreel');
  const frame = document.querySelector('.work-showreel-player');
  const soundButton = document.getElementById('showreelSound');
  const status = document.getElementById('showreelStatus');
  if (!iframe || !frame || !soundButton || !status) return;

  let player = null;
  let ready = false;
  let scrollFrame = 0;
  let initialPlayPending = true;
  let muted = true;
  let playing = false;
  let playbackTimer;

  const updateSoundButton = () => {
    soundButton.textContent = playing ? (muted ? 'Turn sound on' : 'Mute sound') : 'Play with sound';
    soundButton.setAttribute('aria-label', soundButton.textContent);
  };

  const loadTimer = window.setTimeout(() => {
    if (!ready) status.textContent = 'YouTube is taking longer to load or is blocked. You can watch using the YouTube link above.';
  }, 12000);

  const isVisible = () => {
    const rect = frame.getBoundingClientRect();
    const navHeight = document.querySelector('.nav-bar')?.offsetHeight || 64;
    const visibleHeight = Math.max(0, Math.min(rect.bottom, window.innerHeight) - Math.max(rect.top, navHeight));
    const availableHeight = Math.min(rect.height, Math.max(0, window.innerHeight - navHeight));
    const controls = soundButton.getBoundingClientRect();
    const controlsVisible = controls.top < window.innerHeight && controls.bottom > navHeight;
    return !document.hidden && !projectOverlayOpen && availableHeight > 0 &&
      (visibleHeight >= availableHeight * 0.5 || (visibleHeight > 0 && controlsVisible));
  };

  pauseShowreel = () => {
    if (ready) player.pauseVideo();
  };

  const syncVisibility = () => {
    scrollFrame = 0;
    if (!isVisible()) pauseShowreel();
    // A hidden tab must still get its first autoplay attempt when opened.
    // After playback has started, never override a visitor's manual pause.
    else if (ready && initialPlayPending) player.playVideo();
  };

  // Only autoplay on the initial load. Scrolling back up must not override a
  // visitor's decision to pause the video or turn its sound on.
  window.addEventListener('scroll', () => {
    if (!scrollFrame) scrollFrame = requestAnimationFrame(syncVisibility);
  }, { passive: true });
  window.addEventListener('resize', syncVisibility);
  document.addEventListener('visibilitychange', syncVisibility);
  window.addEventListener('pagehide', pauseShowreel);

  soundButton.addEventListener('click', () => {
    if (!ready) return;
    initialPlayPending = false;
    // Sound is enabled only by this explicit gesture, as browsers require.
    muted = playing && !player.isMuted();
    if (muted) player.mute();
    else {
      player.setVolume(80);
      player.unMute();
    }
    player.playVideo();
    updateSoundButton();
  });

  const createPlayer = () => {
    if (player) return;
    player = new window.YT.Player('workShowreel', {
      events: {
        onReady: event => {
          ready = true;
          clearTimeout(loadTimer);
          frame.classList.add('is-ready');
          soundButton.disabled = false;
          event.target.mute();
          status.textContent = '';
          updateSoundButton();
          syncVisibility();
          playbackTimer = window.setTimeout(() => {
            if (initialPlayPending && isVisible()) status.textContent = 'Press Play with sound to start the showreel.';
          }, 8000);
        },
        onStateChange: event => {
          playing = event.data === window.YT.PlayerState.PLAYING;
          if (playing) {
            initialPlayPending = false;
            clearTimeout(playbackTimer);
            muted = player.isMuted();
            status.textContent = '';
            if (!isVisible()) pauseShowreel();
          }
          updateSoundButton();
        },
        onAutoplayBlocked: () => {
          initialPlayPending = false;
          playing = false;
          status.textContent = 'Autoplay was blocked by your browser. Press Play with sound to start.';
          updateSoundButton();
        },
        onError: () => {
          clearTimeout(loadTimer);
          clearTimeout(playbackTimer);
          soundButton.disabled = true;
          soundButton.textContent = 'Video unavailable';
          frame.classList.remove('is-ready');
          status.textContent = 'The embedded video could not load. Watch it using the YouTube link above.';
        }
      }
    });
  };

  // Set the origin before the very first request, instead of reloading a live
  // iframe and interrupting YouTube's autoplay/API handshake.
  const url = new URL(iframe.dataset.src);
  url.searchParams.set('origin', window.location.origin);
  iframe.src = url.toString();

  if (window.YT?.Player) {
    createPlayer();
  } else {
    const previousReady = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      if (typeof previousReady === 'function') previousReady();
      createPlayer();
    };
    if (!document.getElementById('youtubeIframeApi')) {
      const script = document.createElement('script');
      script.id = 'youtubeIframeApi';
      script.src = 'https://www.youtube.com/iframe_api';
      script.async = true;
      document.head.appendChild(script);
    }
  }
}

function initProjectMagnification() {
  const grid = document.getElementById('projectsGrid');
  if (!grid) return;

  const motion = window.matchMedia('(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)');
  let frame = 0;
  let pointer = null;
  let states = new Map();
  let targetsDirty = false;
  let lastTime = 0;
  let pressed = false;
  const properties = ['--project-zoom', '--project-shift-x', '--project-shift-y', '--project-origin-x', '--project-origin-y', '--project-tilt'];

  resetProjectMagnification = () => {
    cancelAnimationFrame(frame);
    frame = 0;
    pointer = null;
    lastTime = 0;
    pressed = false;
    states.clear();
    grid.querySelectorAll('.project-card').forEach(card => {
      properties.forEach(property => card.style.removeProperty(property));
      card.classList.remove('is-magnified', 'is-pointer-focused');
    });
  };

  const updateTargets = () => {
    targetsDirty = false;
    if (!pointer) {
      states.forEach(state => { state.target = { zoom: 1, x: 0, y: 0, ox: 50, oy: 50, tilt: 0 }; state.focused = false; });
      return;
    }
    const { x, y } = pointer;
    const gridRect = grid.getBoundingClientRect();
    // Batch resting-layout reads before animation writes, avoiding feedback
    // from moving bounds and repeated layout work on every spring frame.
    const cards = [...grid.querySelectorAll('.project-card')].map(card => ({ card,
      left: gridRect.left + card.offsetLeft, top: gridRect.top + card.offsetTop,
      width: card.offsetWidth, height: card.offsetHeight
    }));
    const activeCard = cards.find(box => x >= box.left && x <= box.left + box.width && y >= box.top && y <= box.top + box.height)?.card || pointer.card;

    cards.forEach(({ card, left, top, width, height }) => {
      if (!width || !height) return;
      const localX = Math.max(0, Math.min(1, (x - left) / width));
      const localY = Math.max(0, Math.min(1, (y - top) / height));
      const distance = Math.hypot(
        Math.max(left - x, 0, x - left - width),
        Math.max(top - y, 0, y - top - height)
      );
      const proximity = Math.max(0, 1 - distance / 320);
      const influence = proximity * proximity * (3 - 2 * proximity);
      const focused = card === activeCard;
      const centerDistance = Math.min(1, Math.hypot(localX - 0.5, localY - 0.5) * 2);
      const zoom = focused ? 1.18 - centerDistance * 0.025 - (pressed ? 0.035 : 0) : 1 + influence * 0.018;
      const dx = left + width / 2 - x;
      const dy = top + height / 2 - y;
      const length = Math.max(1, Math.hypot(dx, dy));
      if (!states.has(card)) states.set(card, {
        value: { zoom: 1, x: 0, y: 0, ox: 50, oy: 50, tilt: 0 },
        velocity: { zoom: 0, x: 0, y: 0, ox: 0, oy: 0, tilt: 0 }
      });
      const state = states.get(card);
      state.focused = focused;
      state.target = { zoom,
        x: focused ? (localX - 0.5) * 8 : dx / length * influence * 34,
        y: focused ? (localY - 0.5) * 6 - 3 : dy / length * influence * 34,
        ox: focused ? localX * 100 : 50, oy: focused ? localY * 100 : 50,
        tilt: focused ? (localX - 0.5) * 1.6 : 0
      };
    });
  };

  const animate = time => {
    frame = 0;
    if (!motion.matches || projectOverlayOpen) { resetProjectMagnification(); return; }
    const dt = Math.min((time - (lastTime || time - 16.67)) / 1000, 1 / 30);
    lastTime = time;
    if (targetsDirty) updateTargets();
    let moving = false;
    states.forEach((state, card) => {
      let settling = false;
      Object.keys(state.value).forEach(key => {
        // Small fixed substeps keep the spring stable on slower displays.
        const steps = Math.max(1, Math.ceil(dt / (1 / 120)));
        const step = dt / steps;
        for (let i = 0; i < steps; i++) {
          const acceleration = (state.target[key] - state.value[key]) * 240 - state.velocity[key] * 25;
          state.velocity[key] += acceleration * step;
          state.value[key] += state.velocity[key] * step;
        }
        const threshold = key === 'zoom' ? 0.00015 : 0.015;
        if (Math.abs(state.target[key] - state.value[key]) > threshold || Math.abs(state.velocity[key]) > threshold * 8) settling = true;
        else { state.value[key] = state.target[key]; state.velocity[key] = 0; }
      });
      const v = state.value;
      card.style.setProperty('--project-zoom', v.zoom.toFixed(5));
      card.style.setProperty('--project-shift-x', `${v.x.toFixed(3)}px`);
      card.style.setProperty('--project-shift-y', `${v.y.toFixed(3)}px`);
      card.style.setProperty('--project-origin-x', `${v.ox.toFixed(3)}%`);
      card.style.setProperty('--project-origin-y', `${v.oy.toFixed(3)}%`);
      card.style.setProperty('--project-tilt', `${v.tilt.toFixed(3)}deg`);
      card.classList.toggle('is-pointer-focused', state.focused);
      card.classList.toggle('is-magnified', settling || v.zoom > 1.001);
      moving ||= settling;
    });
    if (moving) frame = requestAnimationFrame(animate);
    else {
      lastTime = 0;
      if (!pointer) resetProjectMagnification();
    }
  };

  const schedule = () => {
    targetsDirty = true;
    if (!frame) frame = requestAnimationFrame(animate);
  };

  grid.addEventListener('pointermove', event => {
    if (!motion.matches || event.pointerType === 'touch' || projectOverlayOpen) return;
    pointer = { x: event.clientX, y: event.clientY, card: event.target.closest('.project-card') };
    schedule();
  }, { passive: true });
  grid.addEventListener('pointerleave', () => { pointer = null; pressed = false; schedule(); });
  grid.addEventListener('pointerdown', () => { if (pointer) { pressed = true; schedule(); } });
  window.addEventListener('pointerup', () => { if (pressed) { pressed = false; schedule(); } });
  grid.addEventListener('pointercancel', resetProjectMagnification);
  window.addEventListener('blur', resetProjectMagnification);
  window.addEventListener('scroll', resetProjectMagnification, { passive: true });
  window.addEventListener('resize', resetProjectMagnification);
  motion.addEventListener('change', resetProjectMagnification);
}

// Measure the rendered cards, not the platform label: older projects can have
// portrait screenshots even when their saved platform is "desktop".
function initProjectCardLayout(grid) {
  if (projectCardObserver) projectCardObserver.disconnect();
  if (typeof ResizeObserver === 'undefined') return;
  grid.classList.add('projects-grid-adaptive');

  const sizeCard = (card) => {
    const styles = getComputedStyle(grid);
    const rowHeight = parseFloat(styles.gridAutoRows);
    const gap = parseFloat(styles.getPropertyValue('--project-card-gap')) || 24;
    const rows = Math.ceil((card.offsetHeight + gap) / rowHeight);
    card.style.gridRowEnd = `span ${Math.max(1, rows)}`;
  };

  projectCardObserver = new ResizeObserver(entries => {
    entries.forEach(entry => sizeCard(entry.target));
  });

  grid.querySelectorAll('.project-card').forEach(card => {
    const image = card.querySelector('.project-cover');
    const onImageLoad = () => {
      if (image.naturalWidth && image.naturalHeight) {
        image.style.aspectRatio = `${image.naturalWidth} / ${image.naturalHeight}`;
        image.width = image.naturalWidth;
        image.height = image.naturalHeight;
      }
      sizeCard(card);
    };
    image.addEventListener('load', onImageLoad, { once: true });
    image.addEventListener('error', () => sizeCard(card), { once: true });
    if (image.complete) onImageLoad();
    sizeCard(card);
    projectCardObserver?.observe(card);
  });
}

function projectsCollection() {
  return db.collection('portfolio').doc('projects').collection('items');
}

async function loadProjectsFromFirebase() {
  const snapshot = await projectsCollection().get();
  if (!snapshot.empty) {
    return sortProjectsByOrder(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
  }

  const legacyDoc = await db.collection('portfolio').doc('projects').get();
  if (legacyDoc.exists && legacyDoc.data().items) {
    return sortProjectsByOrder(legacyDoc.data().items);
  }

  return [];
}

document.addEventListener('DOMContentLoaded', () => {
  initShowreel();
  setProjectsLoading(true);
  loadProjects();
  initProjectOverlay();
  initProjectSearch();
  initProjectMagnification();
  document.getElementById('currentYear').textContent = new Date().getFullYear();
});

async function loadProjects() {
  if (!db) {
    setProjectsLoading(false);
    projectsData = window.PORTFOLIO_PROJECTS || [];
    renderProjects(projectsData);
    openProjectFromUrl();
    hidePreloader();
    return;
  }
  
  try {
    const [projects, catDoc] = await Promise.all([
      loadProjectsFromFirebase(),
      db.collection('portfolio').doc('categories').get()
    ]);
    
    projectsData = projects;
    
    if (catDoc.exists && catDoc.data().items) {
      categoriesData = catDoc.data().items;
    } else {
      categoriesData = ['Default'];
    }
    
    projectsData.sort((a, b) => (b.isTopTier ? 1 : 0) - (a.isTopTier ? 1 : 0));
    renderCategoryFilters();
    applyFilters();
    openProjectFromUrl();
    
  } catch (e) {
    console.error("Error loading projects from Firebase", e);
    projectsData = window.PORTFOLIO_PROJECTS || [];
    renderProjects(projectsData);
    openProjectFromUrl();
  } finally {
    setProjectsLoading(false);
    hidePreloader();
  }
}

function setProjectsLoading(isLoading) {
  const loader = document.getElementById('projectsLoader');
  const grid = document.getElementById('projectsGrid');

  if (projectsLoadingTimer) {
    clearTimeout(projectsLoadingTimer);
    projectsLoadingTimer = null;
  }

  if (isLoading) {
    projectsLoadingStartedAt = Date.now();
  }

  const updateLoadingState = () => {
    if (loader) loader.classList.toggle('active', isLoading);
    if (grid) grid.setAttribute('aria-busy', isLoading ? 'true' : 'false');
  };

  if (!isLoading) {
    const elapsed = Date.now() - projectsLoadingStartedAt;
    const remaining = Math.max(0, PROJECT_LOADER_MIN_MS - elapsed);
    projectsLoadingTimer = setTimeout(updateLoadingState, remaining);
    return;
  }

  if (grid) {
    grid.innerHTML = '';
  }

  updateLoadingState();
}

function renderCategoryFilters() {
  const container = document.getElementById('categoryFilters');
  if (!container) return;
  
  let html = `<button class="category-btn active" data-cat="All">All</button>`;
  categoriesData.forEach(cat => {
    html += `<button class="category-btn" data-cat="${cat}">${cat}</button>`;
  });
  container.innerHTML = html;
  
  container.querySelectorAll('.category-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      container.querySelectorAll('.category-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeCategory = btn.getAttribute('data-cat');
      applyFilters();
    });
  });
}

function applyFilters() {
  let filtered = projectsData;
  
  if (activeCategory !== 'All') {
    filtered = filtered.filter(p => (p.category || 'Default') === activeCategory);
  }
  
  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    filtered = filtered.filter(p =>
      (p.title && p.title.toLowerCase().includes(q)) ||
      (p.subtitle && p.subtitle.toLowerCase().includes(q)) ||
      (p.detail && p.detail.toLowerCase().includes(q))
    );
  }
  
  renderProjects(filtered);
}

function renderSafeHtml(str) {
  if (!str) return '';
  const template = document.createElement('template');
  template.innerHTML = str;
  const allowedTags = new Set(['A', 'BR', 'STRONG', 'B', 'EM', 'I', 'SPAN', 'UL', 'OL', 'LI']);

  function cleanNode(node) {
    if (node.nodeType === Node.TEXT_NODE) {
      return document.createTextNode(node.textContent);
    }

    if (node.nodeType !== Node.ELEMENT_NODE) {
      return document.createTextNode('');
    }

    if (!allowedTags.has(node.tagName)) {
      const fragment = document.createDocumentFragment();
      node.childNodes.forEach(child => fragment.appendChild(cleanNode(child)));
      return fragment;
    }

    const tagName = node.tagName === 'B' ? 'strong' : node.tagName === 'I' ? 'em' : node.tagName.toLowerCase();
    const el = document.createElement(tagName);

    if (node.tagName === 'A') {
      const href = node.getAttribute('href') || '#';
      const safeHref = /^(https?:|mailto:|tel:|#)/i.test(href) ? href : '#';
      el.setAttribute('href', safeHref);
      el.setAttribute('target', '_blank');
      el.setAttribute('rel', 'noopener noreferrer');
      el.className = 'safe-rich-link';
    }

    if (node.tagName === 'SPAN') {
      const color = node.style?.color;
      if (color) el.style.color = color;
    }

    node.childNodes.forEach(child => el.appendChild(cleanNode(child)));
    return el;
  }

  const cleanFragment = document.createDocumentFragment();
  template.content.childNodes.forEach(child => cleanFragment.appendChild(cleanNode(child)));

  const output = document.createElement('div');
  output.appendChild(cleanFragment);
  return output.innerHTML;
}

function renderProjects(data) {
  const grid = document.getElementById('projectsGrid');
  const emptyState = document.getElementById('projectsEmpty');
  if (!grid) return;
  resetProjectMagnification();
  
  if (data.length === 0) {
    projectCardObserver?.disconnect();
    grid.classList.remove('projects-grid-adaptive');
    grid.innerHTML = `
      <div class="empty-state reveal reveal-delay-2">
        <div class="empty-icon">ðŸ“</div>
        <div class="empty-text">No projects yet.</div>
        <div class="empty-sub">Add some from the admin dashboard.</div>
      </div>
    `;
    if (emptyState) emptyState.style.display = 'none';
    return;
  }
  if (emptyState) emptyState.style.display = 'none';
  
  let html = '';
  data.forEach((project, index) => {
    const delayClass = `reveal-delay-${(index % 3) + 1}`;
    const isMobile = project.platform === 'mobile';
    const orientation = project.orientation || 'portrait';
    
    const topTierClass = project.isTopTier ? 'project-card-top-tier' : '';
    const badgeHtml = project.isTopTier ? '<div class="top-tier-badge">⭐ TOP TIER</div>' : '';
    const subtitleHtml = renderSafeHtml(project.subtitle);
    const platformClass = isMobile ? `project-card-mobile project-card-mobile-${orientation}` : '';
    
    const coverImg = (project.images && project.images.length > 0) 
      ? project.images[0] 
      : 'data:image/svg+xml,%3Csvg xmlns=\\\'http://www.w3.org/2000/svg\\\' width=\\\'100%25\\\' height=\\\'100%25\\\'%3E%3Crect width=\\\'100%25\\\' height=\\\'100%25\\\' fill=\\\'%231e1e21\\\'/%3E%3C/svg%3E';
      
    html += `
      <a href="${getProjectPagePath(project.id)}" class="project-card reveal ${delayClass} ${topTierClass} ${platformClass}" data-id="${project.id}">
        <img src="${coverImg}" alt="${project.title}" class="project-cover" draggable="false" decoding="async">
        ${badgeHtml}
        <div class="project-info">
          <h3 class="project-title">${project.title}</h3>
          <div class="project-subtitle">${subtitleHtml}</div>
        </div>
        ${isMobile ? `<div class="platform-badge">${orientation === 'portrait' ? '📱' : '📱↔'}</div>` : ''}
      </a>
    `;
  });
  
  grid.innerHTML = html;
  initProjectCardLayout(grid);
  
  if (typeof initScrollReveal === 'function') {
    setTimeout(initScrollReveal, 100);
  }
}

function initProjectSearch() {
  const input = document.getElementById('projectSearch');
  if (!input) return;
  
  let debounceTimer;
  input.addEventListener('input', () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      searchQuery = input.value.trim();
      applyFilters();
    }, 200);
  });
}

function initProjectOverlay() {
  const grid = document.getElementById('projectsGrid');
  const overlay = document.getElementById('projectOverlay');
  const closeBtn = document.getElementById('closeProjectOverlay');
  const backLink = document.getElementById('overlayBackLink');
  const copyLinkBtn = document.getElementById('copyProjectLink');
  
  if (!grid || !overlay) return;
  
  // Event delegation for project cards
  grid.addEventListener('click', (e) => {
    const card = e.target.closest('.project-card');
    if (!card) return;
    if (e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    
    const projectId = card.getAttribute('data-id');
    openProjectDetails(projectId, { updateUrl: true });
  });
  
  closeBtn.addEventListener('click', closeProjectOverlay);
  backLink?.addEventListener('click', (e) => {
    e.preventDefault();
    closeProjectOverlay({ updateUrl: true });
  });

  copyLinkBtn?.addEventListener('click', async () => {
    const projectId = overlay.getAttribute('data-project-id');
    if (!projectId) return;
    const url = getProjectUrl(projectId);
    try {
      await navigator.clipboard.writeText(url);
      showToast('Project link copied!');
    } catch (e) {
      window.prompt('Copy this project link:', url);
    }
  });

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeProjectOverlay({ updateUrl: true });
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && projectOverlayOpen) {
      closeProjectOverlay({ updateUrl: true });
    }
  });

  window.addEventListener('popstate', () => {
    const id = new URLSearchParams(window.location.search).get('id');
    if (id) {
      openProjectDetails(id, { updateUrl: false });
    } else if (projectOverlayOpen) {
      closeProjectOverlay({ updateUrl: false });
    }
  });
}

function getProjectUrl(id) {
  const url = new URL(window.location.href);
  url.pathname = url.pathname.replace(/[^/]*$/, 'work.html');
  url.search = '';
  url.searchParams.set('id', id);
  url.hash = '';
  return url.toString();
}

function openProjectFromUrl() {
  const id = new URLSearchParams(window.location.search).get('id');
  if (id) openProjectDetails(id, { updateUrl: false });
}

function openProjectDetails(id, options = {}) {
  const { updateUrl = false } = options;
  const project = projectsData.find(p => p.id == id);
  if (!project) return;
  pauseShowreel();
  resetProjectMagnification();
  
  const overlay = document.getElementById('projectOverlay');
  const hero = document.getElementById('overlayHero');
  const badges = document.getElementById('overlayBadges');
  const copyLinkBtn = document.getElementById('copyProjectLink');
  const isMobile = project.platform === 'mobile';
  const orientation = project.orientation || 'portrait';
  const coverImg = (project.images && project.images.length > 0) ? project.images[0] : '';
  
  // Populate details
  document.getElementById('overlayTitle').textContent = project.title;
  document.getElementById('overlaySubtitle').innerHTML = renderSafeHtml(project.subtitle);
  overlay.setAttribute('data-project-id', project.id);
  document.title = `${project.title} | Ahmad Ajmal’s Game Portfolio`;
  const canonical = document.querySelector('link[rel="canonical"]');
  if (canonical) canonical.href = new URL(getProjectPagePath(project.id), 'https://ahmadajmal.vercel.app').href;

  if (hero) {
    hero.innerHTML = coverImg
      ? `<img src="${coverImg}" alt="${project.title}" class="overlay-hero-img ${isMobile ? `overlay-hero-${orientation}` : ''}">`
      : '';
    hero.style.display = coverImg ? 'flex' : 'none';
  }

  if (badges) {
    const badgesHtml = [
      project.isTopTier ? '<span>Top Tier</span>' : '',
      project.category ? `<span>${project.category}</span>` : '',
      isMobile ? `<span>${orientation === 'portrait' ? 'Mobile Portrait' : 'Mobile Landscape'}</span>` : ''
    ].filter(Boolean).join('');
    badges.innerHTML = badgesHtml;
    badges.style.display = badgesHtml ? 'flex' : 'none';
  }

  if (copyLinkBtn) {
    copyLinkBtn.textContent = 'Copy Link';
  }
  
  // Render formatted detail
  const detailEl = document.getElementById('overlayDetail');
  detailEl.innerHTML = project.detail ? renderSafeHtml(project.detail).replace(/\n/g, '<br>') : '';
  
  // Populate Gallery
  const gallery = document.getElementById('overlayGallery');
  const counter = document.getElementById('overlayCounter');
  gallery.innerHTML = '';
  
  if (project.images && project.images.length > 0) {
    let galleryHtml = '';
    project.images.slice(coverImg ? 1 : 0).forEach((img, idx) => {
      const imgClass = isMobile
        ? `overlay-gallery-img overlay-gallery-${orientation}`
        : 'overlay-gallery-img';
      galleryHtml += `<img src="${img}" alt="Gallery image ${idx + 2}" class="${imgClass}" loading="lazy">`;
    });
    gallery.innerHTML = galleryHtml;
    counter.textContent = `${project.images.length} Image${project.images.length !== 1 ? 's' : ''}`;
  } else {
    counter.textContent = 'No images';
  }
  
  // Save scroll position and show overlay
  if (!projectOverlayOpen) {
    currentScrollY = window.scrollY;
    document.body.style.position = 'fixed';
    document.body.style.top = `-${currentScrollY}px`;
    document.body.style.width = '100%';
  }
  
  projectOverlayOpen = true;
  overlay.classList.add('active');
  overlay.scrollTop = 0; // Reset scroll inside overlay

  if (updateUrl) {
    const url = new URL(window.location.href);
    url.searchParams.set('id', project.id);
    history.pushState({ projectId: project.id }, '', url);
  }
}

function closeProjectOverlay(options = {}) {
  const { updateUrl = false } = options;
  const overlay = document.getElementById('projectOverlay');
  overlay.classList.remove('active');
  overlay.removeAttribute('data-project-id');
  projectOverlayOpen = false;
  document.title = 'Game Development Portfolio | Ahmad Ajmal';
  const canonical = document.querySelector('link[rel="canonical"]');
  if (canonical) canonical.href = 'https://ahmadajmal.vercel.app/work.html';
  
  // Restore body scroll
  document.body.style.position = '';
  document.body.style.top = '';
  document.body.style.width = '';
  window.scrollTo(0, currentScrollY);

  if (updateUrl) {
    const url = new URL(window.location.href);
    url.searchParams.delete('id');
    history.replaceState({}, '', url);
  }
}
