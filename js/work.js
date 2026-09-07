let currentScrollY = 0;
let projectsData = [];
let categoriesData = ['Default'];
let activeCategory = 'All';
let searchQuery = '';
const PROJECT_LOADER_MIN_MS = 650;
let projectsLoadingStartedAt = 0;
let projectsLoadingTimer = null;
let projectOverlayOpen = false;

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
  setProjectsLoading(true);
  loadProjects();
  initProjectOverlay();
  initProjectSearch();
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
  
  if (data.length === 0) {
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
    hero.style.display = coverImg ? 'block' : 'none';
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
