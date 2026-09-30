document.addEventListener('DOMContentLoaded', () => {
  loadHomeData();
  
  // Set current year in footer
  document.getElementById('currentYear').textContent = new Date().getFullYear();
});

let homeProfilePhotos = null;

function updateHomeProfilePhoto(theme = document.documentElement.dataset.theme || 'dark') {
  if (!homeProfilePhotos) return;

  const heroPhoto = document.getElementById('heroPhoto');
  if (!heroPhoto) return;

  const nextPhoto = theme === 'light'
    ? homeProfilePhotos.light
    : homeProfilePhotos.dark;

  if (nextPhoto) heroPhoto.src = nextPhoto;
}

document.addEventListener('portfolio:themechange', (event) => {
  updateHomeProfilePhoto(event.detail?.theme);
});

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

  return sortProjectsByOrder(DEFAULT_DATA.projects || []);
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function stripHtml(value) {
  const template = document.createElement('template');
  template.innerHTML = value || '';
  return template.content.textContent || '';
}

async function loadHomeData() {
  let profile = DEFAULT_DATA.profile;
  let skills = DEFAULT_DATA.skills;
  let experience = DEFAULT_DATA.experience;
  let featuredProjects = DEFAULT_DATA.projects || [];
  if (db) {
    try {
      const profileDoc = await db.collection('portfolio').doc('profile').get();
      if (profileDoc.exists) profile = profileDoc.data();
    } catch (e) { console.error("Firebase profile error:", e); }

    try {
      const skillsDoc = await db.collection('portfolio').doc('skills').get();
      if (skillsDoc.exists && skillsDoc.data().items) skills = skillsDoc.data().items;
    } catch (e) { console.error("Firebase skills error:", e); }

    try {
      const expDoc = await db.collection('portfolio').doc('experience').get();
      if (expDoc.exists && expDoc.data().items) experience = expDoc.data().items;
    } catch (e) { console.error("Firebase exp error:", e); }

    try {
      featuredProjects = await loadProjectsFromFirebase();
    } catch (e) { console.error("Firebase featured projects error:", e); }

  }

  let bhaiData = DEFAULT_DATA.bhai || [];
  if (db) {
    try {
      const bhaiDoc = await db.collection('portfolio').doc('bhaiLog').get();
      if (bhaiDoc.exists && bhaiDoc.data().items) bhaiData = bhaiDoc.data().items;
    } catch (e) { console.error("Firebase bhai error:", e); }
  }
  window._bhaiData = bhaiData;

  // Render Profile
  try {
    document.getElementById('heroName').textContent = profile.name;
    document.getElementById('footerName').textContent = profile.name;
    document.getElementById('heroTitle').textContent = profile.title;
    const heroEmail = document.getElementById('heroEmail');
    heroEmail.textContent = profile.email;
    heroEmail.href = `mailto:${profile.email}`;
    document.getElementById('heroBio').textContent = profile.bio;
    const currentPhoto = document.getElementById('heroPhoto').src;
    const darkPhoto = profile.photo || currentPhoto;
    homeProfilePhotos = {
      dark: darkPhoto,
      light: profile.photoLight || DEFAULT_DATA.profile.photoLight || darkPhoto
    };
    updateHomeProfilePhoto();
  } catch (e) { console.error(e); }

  renderFeaturedProjects(featuredProjects);

  // Render Skills
  const skillsContainer = document.getElementById('skillsContainer');
  if (skillsContainer) {
    let html = '';
    skills.forEach((skill, index) => {
      const delayClass = `reveal-delay-${(index % 4) + 1}`;
      html += `
        <div class="skill-item reveal ${delayClass}">
          <div class="skill-header">
            <span class="skill-name">${skill.name}</span>
            <span class="skill-percent">${skill.percent}%</span>
          </div>
          <div class="skill-bar">
            <div class="skill-fill" data-percent="${skill.percent}"></div>
          </div>
        </div>
      `;
    });
    skillsContainer.innerHTML = html;
  }

  // Render Experience
  const expContainer = document.getElementById('experienceContainer');
  if (expContainer) {
    experience.sort((a, b) => parseInt(b.year) - parseInt(a.year));
    let html = '';
    experience.forEach((exp, index) => {
      const delayClass = `reveal-delay-${(index % 3) + 1}`;
      html += `
        <div class="timeline-item reveal ${delayClass}">
          <div class="timeline-year">${exp.year}</div>
          <h3 class="timeline-role">${exp.role}</h3>
          <div class="timeline-company">${exp.company}</div>
          <p class="timeline-desc">${exp.desc}</p>
        </div>
      `;
    });
    expContainer.innerHTML = html;
  }

  // Render Bhai Log
  renderBhaiLog();

  setTimeout(initScrollReveal, 100);
  hidePreloader();
}

function renderFeaturedProjects(projects) {
  const grid = document.getElementById('featuredProjectsGrid');
  const section = document.getElementById('featuredProjectsSection');
  if (!grid || !section) return;

  const featured = [...(projects || [])]
    .sort((a, b) => (b.isTopTier ? 1 : 0) - (a.isTopTier ? 1 : 0))
    .slice(0, 3);

  if (featured.length === 0) {
    section.style.display = 'none';
    return;
  }

  section.style.display = '';
  grid.innerHTML = featured.map((project, index) => {
    const cover = project.images && project.images.length
      ? project.images[0]
      : 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22800%22 height=%22600%22%3E%3Crect width=%22100%25%22 height=%22100%25%22 fill=%22%231e1e21%22/%3E%3C/svg%3E';
    const subtitle = escapeHtml(stripHtml(project.subtitle));
    const title = escapeHtml(project.title);
    const url = `work.html?id=${encodeURIComponent(project.id)}`;
    const delay = `reveal-delay-${(index % 3) + 1}`;
    const rank = String(index + 1).padStart(2, '0');

    return `
      <a class="featured-card reveal ${delay}" href="${url}">
        <img src="${cover}" alt="${title}" class="featured-card-img">
        <div class="featured-card-shade"></div>
        <div class="featured-card-meta">
          <span class="featured-rank">${rank}</span>
          ${project.isTopTier ? '<span class="featured-pill">Top Tier</span>' : ''}
        </div>
        <div class="featured-card-body">
          <h3>${title}</h3>
          <p>${subtitle}</p>
          <span class="featured-card-link">View Project →</span>
        </div>
      </a>
    `;
  }).join('');
}

function renderBhaiLog() {
  const grid = document.getElementById('bhaiGrid');
  const empty = document.getElementById('bhaiEmpty');
  const data = window._bhaiData || [];
  if (!grid) return;
  if (data.length === 0) { if (empty) empty.style.display = 'block'; return; }
  if (empty) empty.style.display = 'none';
  let html = '';
  data.forEach((member, i) => {
    const delay = `reveal-delay-${(i % 3) + 1}`;
    html += `
      <div class="bhai-card reveal ${delay}" data-name="${member.name}" data-intro="${(member.intro || '').replace(/"/g, '&quot;')}" data-gender="${(member.gender || '').replace(/"/g, '&quot;')}" data-photo="${(member.photo || '').replace(/"/g, '&quot;')}">
        <div class="bhai-card-photo">${member.photo ? `<img src="${member.photo}" alt="${member.name}">` : '<span class="bhai-card-avatar">' + (member.name ? member.name[0].toUpperCase() : '?') + '</span>'}</div>
        <div class="bhai-card-body">
          <div class="bhai-card-name">${member.name}</div>
          <div class="bhai-card-intro">${member.intro || ''}</div>
          <div class="bhai-card-gender">${member.gender || ''}</div>
        </div>
      </div>
    `;
  });
  grid.innerHTML = html;

  grid.querySelectorAll('.bhai-card').forEach(card => {
    card.addEventListener('click', () => {
      openBhaiOverlay({
        name: card.dataset.name,
        intro: card.dataset.intro,
        gender: card.dataset.gender,
        photo: card.dataset.photo
      });
    });
  });

  if (typeof initScrollReveal === 'function') setTimeout(initScrollReveal, 100);
}
