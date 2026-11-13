document.addEventListener('DOMContentLoaded', () => {
  loadContactInfo();
  loadAchievements();
  document.getElementById('currentYear').textContent = new Date().getFullYear();
  hidePreloader();
});

function loadContactInfo() {
  const profileStr = localStorage.getItem('poetfolio_profile');
  if (profileStr) {
    try {
      const profile = JSON.parse(profileStr);
      if (profile.email) {
        const emailEl = document.getElementById('contactEmail');
        const emailBtn = document.getElementById('emailBtn');
        
        if (emailEl) emailEl.textContent = profile.email;
        if (emailEl) emailEl.href = `mailto:${profile.email}`;
        if (emailBtn) emailBtn.href = `mailto:${profile.email}`;
      }
    } catch (e) {
      console.error("Error parsing profile data for contact", e);
    }
  }
}

function loadAchievements() {
  const grid = document.getElementById('achievementsGrid');
  const emptyState = document.getElementById('achievementsEmpty');
  const status = document.getElementById('achievementsStatus');
  if (!grid) return;

  const showError = (error) => {
    console.error('Unable to load achievements:', error);
    grid.setAttribute('aria-busy', 'false');
    if (status) {
      status.hidden = false;
      status.textContent = 'Certificates could not be loaded. Please refresh to try again.';
    }
  };

  grid.setAttribute('aria-busy', 'true');
  if (status) {
    status.hidden = false;
    status.textContent = 'Loading achievements and certificates…';
  }
  if (!db) {
    showError(new Error('Firebase is unavailable'));
    return;
  }

  // Match the admin's shared document and keep open pages up to date after saves.
  return db.collection('portfolio').doc('achievements').onSnapshot(doc => {
    const items = doc.exists && Array.isArray(doc.data().items) ? doc.data().items : [];
    grid.replaceChildren();
    if (emptyState) {
      emptyState.style.display = items.length ? 'none' : 'block';
      grid.appendChild(emptyState);
    }

    items.forEach((achievement, index) => {
      let link = null;
      try {
        const url = new URL(achievement.link);
        if (url.protocol === 'https:' || url.protocol === 'http:') link = url.href;
      } catch (_) { /* Certificates can be displayed without an external link. */ }

      const card = document.createElement(link ? 'a' : 'article');
      card.className = `achievement-card reveal reveal-delay-${(index % 3) + 1}`;
      if (link) {
        card.href = link;
        card.target = '_blank';
        card.rel = 'noopener noreferrer';
      }
      const media = document.createElement('div');
      media.className = 'achievement-img';
      if (achievement.image) {
        const image = document.createElement('img');
        image.src = achievement.image;
        image.alt = achievement.title || 'Certificate';
        image.loading = 'lazy';
        media.appendChild(image);
      }
      const info = document.createElement('div');
      info.className = 'achievement-info';
      const title = document.createElement('h3');
      title.className = 'achievement-title';
      title.textContent = achievement.title || 'Achievement';
      const details = document.createElement('p');
      details.className = 'achievement-details';
      details.textContent = achievement.details || '';
      info.append(title, details);
      if (link) {
        const action = document.createElement('span');
        action.className = 'achievement-link-icon';
        action.textContent = 'View Certificate ↗';
        info.appendChild(action);
      }
      card.append(media, info);
      grid.appendChild(card);
    });

    grid.setAttribute('aria-busy', 'false');
    if (status) status.hidden = true;
    if (typeof initScrollReveal === 'function') initScrollReveal();
  }, showError);
}
