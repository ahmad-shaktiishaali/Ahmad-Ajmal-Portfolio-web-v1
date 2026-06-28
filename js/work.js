let currentScrollY = 0;
let projectsData = [];

document.addEventListener('DOMContentLoaded', () => {
  loadProjects();
  initProjectOverlay();
  document.getElementById('currentYear').textContent = new Date().getFullYear();
});

function loadProjects() {
  const projectsStr = localStorage.getItem('poetfolio_projects');
  const grid = document.getElementById('projectsGrid');
  const emptyState = document.getElementById('projectsEmpty');
  
  if (!grid) return;

  if (projectsStr) {
    try {
      projectsData = JSON.parse(projectsStr);
      
      if (projectsData.length === 0) {
        if (emptyState) emptyState.style.display = 'block';
        return;
      }
      
      // Sort projects: Top Tier first
      projectsData.sort((a, b) => (b.isTopTier ? 1 : 0) - (a.isTopTier ? 1 : 0));
      
      let html = '';
      
      projectsData.forEach((project, index) => {
        const delayClass = `reveal-delay-${(index % 3) + 1}`;
        const coverImg = (project.images && project.images.length > 0) 
          ? project.images[0] 
          : 'data:image/svg+xml,%3Csvg xmlns=\\\'http://www.w3.org/2000/svg\\\' width=\\\'100%25\\\' height=\\\'100%25\\\'%3E%3Crect width=\\\'100%25\\\' height=\\\'100%25\\\' fill=\\\'%231e1e21\\\'/%3E%3C/svg%3E';
          
        const topTierClass = project.isTopTier ? 'project-card-top-tier' : '';
        const badgeHtml = project.isTopTier ? '<div class="top-tier-badge">⭐ TOP TIER</div>' : '';
          
        html += `
          <div class="project-card reveal ${delayClass} ${topTierClass}" data-id="${project.id}">
            <img src="${coverImg}" alt="${project.title}" class="project-cover">
            ${badgeHtml}
            <div class="project-info">
              <h3 class="project-title">${project.title}</h3>
              <div class="project-subtitle">${project.subtitle}</div>
            </div>
          </div>
        `;
      });
      
      grid.innerHTML = html;
      
      // Re-initialize scroll reveal for new items
      if (typeof initScrollReveal === 'function') {
        setTimeout(initScrollReveal, 100);
      }
      
    } catch (e) {
      console.error("Error parsing projects data", e);
    }
  } else {
    if (emptyState) emptyState.style.display = 'block';
  }
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
  document.getElementById('overlaySubtitle').textContent = project.subtitle;
  
  // Preserve line breaks in detail
  const detailEl = document.getElementById('overlayDetail');
  detailEl.innerHTML = project.detail ? project.detail.replace(/\n/g, '<br>') : '';
  
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
