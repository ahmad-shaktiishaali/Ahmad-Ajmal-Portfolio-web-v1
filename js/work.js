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
  if (!iframe || !frame) return;

  const url = new URL(iframe.src);
  url.searchParams.set('origin', window.location.origin);
  iframe.src = url.toString();

  let player = null;
  let ready = false;
  let scrollFrame = 0;

  const isVisible = () => {
    const rect = frame.getBoundingClientRect();
    const navHeight = document.querySelector('.nav-bar')?.offsetHeight || 64;
    const visibleHeight = Math.max(0, Math.min(rect.bottom, window.innerHeight) - Math.max(rect.top, navHeight));
    const availableHeight = Math.min(rect.height, Math.max(0, window.innerHeight - navHeight));
    return !document.hidden && !projectOverlayOpen && availableHeight > 0 &&
      visibleHeight >= availableHeight * 0.5;
  };

  pauseShowreel = () => {
    if (ready) player.pauseVideo();
  };

  const pauseIfHidden = () => {
    scrollFrame = 0;
    if (!isVisible()) pauseShowreel();
  };

  // Only autoplay on the initial load. Scrolling back up must not override a
  // visitor's decision to pause the video or turn its sound on.
  window.addEventListener('scroll', () => {
    if (!scrollFrame) scrollFrame = requestAnimationFrame(pauseIfHidden);
  }, { passive: true });
  window.addEventListener('resize', pauseIfHidden);
  document.addEventListener('visibilitychange', pauseIfHidden);
  window.addEventListener('pagehide', pauseShowreel);

  const createPlayer = () => {
    if (player) return;
    player = new window.YT.Player('workShowreel', {
      events: {
        onReady: event => {
          ready = true;
          event.target.mute();
          // The visitor may have scrolled to the projects before YouTube loaded.
          if (isVisible()) event.target.playVideo();
          else event.target.pauseVideo();
        },
        onStateChange: event => {
          if (event.data === window.YT.PlayerState.PLAYING) pauseIfHidden();
        }
      }
    });
  };

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

  resetProjectMagnification = () => {
    cancelAnimationFrame(frame);
    frame = 0;
    pointer = null;
    grid.querySelectorAll('.project-card').forEach(card => {
      ['--project-zoom', '--project-shift-x', '--project-shift-y', '--project-origin-x', '--project-origin-y'].forEach(property => card.style.removeProperty(property));
      card.classList.remove('is-magnified', 'is-pointer-focused');
    });
  };

  const updateMagnification = () => {
    frame = 0;
    if (!pointer || !motion.matches || projectOverlayOpen) return;
    const { x, y } = pointer;
    const gridRect = grid.getBoundingClientRect();
    const cards = [...grid.querySelectorAll('.project-card')];
    // Keep focus anchored to the resting grid as neighbors move. Hit-testing
    // only the animated elements can otherwise swap focus at their edges.
    const activeCard = cards.find(card => {
      const left = gridRect.left + card.offsetLeft;
      const top = gridRect.top + card.offsetTop;
      return x >= left && x <= left + card.offsetWidth &&
        y >= top && y <= top + card.offsetHeight;
    }) || pointer.card;

    cards.forEach(card => {
      // Read the resting layout, not the zoomed bounds, to avoid feedback and
      // jitter while the card grows under the pointer.
      const left = gridRect.left + card.offsetLeft;
      const top = gridRect.top + card.offsetTop;
      const width = card.offsetWidth;
      const height = card.offsetHeight;
      const localX = Math.max(0, Math.min(1, (x - left) / width));
      const localY = Math.max(0, Math.min(1, (y - top) / height));
      const distance = Math.hypot(
        Math.max(left - x, 0, x - left - width),
        Math.max(top - y, 0, y - top - height)
      );
      const proximity = Math.max(0, 1 - distance / 340);
      const influence = proximity * proximity * (3 - 2 * proximity);
      const focused = card === activeCard;
      const centerDistance = Math.min(1, Math.hypot(localX - 0.5, localY - 0.5) * 2);
      const zoom = focused ? 1.14 - centerDistance * 0.04 : 1 + influence * 0.025;
      const dx = left + width / 2 - x;
      const dy = top + height / 2 - y;
      const length = Math.max(1, Math.hypot(dx, dy));
      const shiftX = focused ? (localX - 0.5) * 7 : dx / length * influence * 36;
      const shiftY = focused ? (localY - 0.5) * 7 : dy / length * influence * 36;

      card.style.setProperty('--project-origin-x', `${localX * 100}%`);
      card.style.setProperty('--project-origin-y', `${localY * 100}%`);
      card.style.setProperty('--project-zoom', String(zoom));
      card.style.setProperty('--project-shift-x', `${shiftX}px`);
      card.style.setProperty('--project-shift-y', `${shiftY}px`);
      card.classList.toggle('is-magnified', proximity > 0);
      card.classList.toggle('is-pointer-focused', focused);
    });
  };

  grid.addEventListener('pointermove', event => {
    if (!motion.matches || event.pointerType === 'touch' || projectOverlayOpen) return;
    pointer = { x: event.clientX, y: event.clientY, card: event.target.closest('.project-card') };
    if (!frame) frame = requestAnimationFrame(updateMagnification);
  }, { passive: true });
  grid.addEventListener('pointerleave', resetProjectMagnification);
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
    renderProjects([]);
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
    renderProjects([]);
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
      <article class="project-card reveal ${delayClass} ${topTierClass} ${platformClass}" data-id="${project.id}">
        <img src="${coverImg}" alt="${project.title}" class="project-cover">
        ${badgeHtml}
        <div class="project-info">
          <h3 class="project-title">${project.title}</h3>
          <div class="project-subtitle">${subtitleHtml}</div>
        </div>
        ${isMobile ? `<div class="platform-badge">${orientation === 'portrait' ? '📱' : '📱↔'}</div>` : ''}
      </article>
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
  document.title = `${project.title} | Portfolio`;

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
  document.title = 'Portfolio | Work';
  
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
