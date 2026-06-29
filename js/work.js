let currentScrollY = 0;
let projectsData = [];
let categoriesData = ['Default'];
let activeCategory = 'All';
let searchQuery = '';

function projectsCollection() {
  return db.collection('portfolio').doc('projects').collection('items');
}

async function loadProjectsFromFirebase() {
  const snapshot = await projectsCollection().get();
  if (!snapshot.empty) {
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }

  const legacyDoc = await db.collection('portfolio').doc('projects').get();
  if (legacyDoc.exists && legacyDoc.data().items) {
    return legacyDoc.data().items;
  }

  return [];
}

document.addEventListener('DOMContentLoaded', () => {
  loadProjects();
  initProjectOverlay();
  initProjectSearch();
  document.getElementById('currentYear').textContent = new Date().getFullYear();
});

async function loadProjects() {
  if (!db) return;
  
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
    
  } catch (e) {
    console.error("Error loading projects from Firebase", e);
    renderProjects([]);
  }
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
  const allowedTags = /<\/?(strong|em|b|i|a|span|br)(\s[^>]*)?>/gi;
  const placeholders = [];
  let idx = 0;

  const saved = str.replace(allowedTags, (match) => {
    const ph = `\x00FMT${idx}\x00`;
    placeholders.push(match);
    idx++;
    return ph;
  });

  const escaped = saved
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

  return escaped.replace(/\x00FMT\d+\x00/g, (match) => {
    const phIdx = parseInt(match.replace(/\x00FMT(\d+)\x00/, '$1'), 10);
    const original = placeholders[phIdx];
    const lower = original.toLowerCase();
    if (lower.startsWith('</')) return original;
    if (lower.startsWith('<br')) return '<br>';
    if (lower.startsWith('<strong') || lower.startsWith('<b')) return '<strong>';
    if (lower.startsWith('<em') || lower.startsWith('<i')) return '<em>';
    if (lower.startsWith('<a ')) {
      const hrefMatch = original.match(/href="([^"]*)"/i);
      const url = hrefMatch ? hrefMatch[1].replace(/"/g, '&quot;') : '#';
      return `<a href="${url}" target="_blank" rel="noopener noreferrer" style="color:var(--accent);text-decoration:underline;">`;
    }
    if (lower.startsWith('<span')) {
      const colorMatch = original.match(/style="color:([^"]*)"/i);
      const color = colorMatch ? colorMatch[1].replace(/"/g, '&quot;') : 'inherit';
      return `<span style="color:${color}">`;
    }
    return '';
  });
}

function renderProjects(data) {
  const grid = document.getElementById('projectsGrid');
  const emptyState = document.getElementById('projectsEmpty');
  if (!grid) return;
  
  if (data.length === 0) {
    grid.innerHTML = '';
    if (emptyState) emptyState.style.display = 'block';
    return;
  }
  if (emptyState) emptyState.style.display = 'none';
  
  let html = '';
  data.forEach((project, index) => {
    const delayClass = `reveal-delay-${(index % 3) + 1}`;
    const coverImg = (project.images && project.images.length > 0) 
      ? project.images[0] 
      : 'data:image/svg+xml,%3Csvg xmlns=\\\'http://www.w3.org/2000/svg\\\' width=\\\'100%25\\\' height=\\\'100%25\\\'%3E%3Crect width=\\\'100%25\\\' height=\\\'100%25\\\' fill=\\\'%231e1e21\\\'/%3E%3C/svg%3E';
      
    const topTierClass = project.isTopTier ? 'project-card-top-tier' : '';
    const badgeHtml = project.isTopTier ? '<div class="top-tier-badge">⭐ TOP TIER</div>' : '';
    const subtitleHtml = renderSafeHtml(project.subtitle);
      
    html += `
      <div class="project-card reveal ${delayClass} ${topTierClass}" data-id="${project.id}">
        <img src="${coverImg}" alt="${project.title}" class="project-cover">
        ${badgeHtml}
        <div class="project-info">
          <h3 class="project-title">${project.title}</h3>
          <div class="project-subtitle">${subtitleHtml}</div>
        </div>
      </div>
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
  
  if (!grid || !overlay) return;
  
  // Event delegation for project cards
  grid.addEventListener('click', (e) => {
    const card = e.target.closest('.project-card');
    if (!card) return;
    
    const projectId = card.getAttribute('data-id');
    openProjectDetails(projectId);
  });
  
  closeBtn.addEventListener('click', closeProjectOverlay);
}

function openProjectDetails(id) {
  const project = projectsData.find(p => p.id == id);
  if (!project) return;
  
  const overlay = document.getElementById('projectOverlay');
  
  // Populate details
  document.getElementById('overlayTitle').textContent = project.title;
  document.getElementById('overlaySubtitle').innerHTML = renderSafeHtml(project.subtitle);
  
  // Render formatted detail
  const detailEl = document.getElementById('overlayDetail');
  detailEl.innerHTML = project.detail ? renderSafeHtml(project.detail).replace(/\n/g, '<br>') : '';
  
  // Populate Gallery
  const gallery = document.getElementById('overlayGallery');
  const counter = document.getElementById('overlayCounter');
  gallery.innerHTML = '';
  
  if (project.images && project.images.length > 0) {
    let galleryHtml = '';
    project.images.forEach((img, idx) => {
      // Create individual wrapper for each image for potential lightbox/expansion
      galleryHtml += `<img src="${img}" alt="Gallery image ${idx + 1}" class="overlay-gallery-img">`;
    });
    gallery.innerHTML = galleryHtml;
    counter.textContent = `${project.images.length} Image${project.images.length !== 1 ? 's' : ''}`;
  } else {
    counter.textContent = 'No images';
  }
  
  // Save scroll position and show overlay
  currentScrollY = window.scrollY;
  document.body.style.position = 'fixed';
  document.body.style.top = `-${currentScrollY}px`;
  document.body.style.width = '100%';
  
  overlay.classList.add('active');
  overlay.scrollTop = 0; // Reset scroll inside overlay
}

function closeProjectOverlay() {
  const overlay = document.getElementById('projectOverlay');
  overlay.classList.remove('active');
  
  // Restore body scroll
  document.body.style.position = '';
  document.body.style.top = '';
  document.body.style.width = '';
  window.scrollTo(0, currentScrollY);
}
