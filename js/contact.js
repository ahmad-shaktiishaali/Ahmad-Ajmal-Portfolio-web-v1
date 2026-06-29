document.addEventListener('DOMContentLoaded', () => {
  loadContactInfo();
  loadAchievements();
  document.getElementById('currentYear').textContent = new Date().getFullYear();
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
  const achievementsStr = localStorage.getItem('poetfolio_achievements');
  const grid = document.getElementById('achievementsGrid');
  const emptyState = document.getElementById('achievementsEmpty');
  
  if (!grid) return;

  if (achievementsStr) {
    try {
      const achievements = JSON.parse(achievementsStr);
      
      if (achievements.length === 0) {
        if (emptyState) emptyState.style.display = 'block';
        return;
      }
      
      let html = '';
      
      achievements.forEach((ach, index) => {
        const delayClass = `reveal-delay-${(index % 3) + 1}`;
        const targetAttr = ach.link ? 'target="_blank" rel="noopener noreferrer"' : '';
        const href = ach.link ? ach.link : '#';
        const tag = ach.link ? 'a' : 'div';
        
        html += `
          <${tag} href="${href}" ${targetAttr} class="achievement-card reveal ${delayClass}">
            <div class="achievement-img">
              <img src="${ach.image}" alt="${ach.title}" onerror="this.src='data:image/svg+xml,%3Csvg xmlns=\\\'http://www.w3.org/2000/svg\\\' width=\\\'100%25\\\' height=\\\'100%25\\\'%3E%3Crect width=\\\'100%25\\\' height=\\\'100%25\\\' fill=\\\'%231e1e21\\\'/%3E%3C/svg%3E'">
            </div>
            <div class="achievement-info">
              <h3 class="achievement-title">${ach.title}</h3>
              <p class="achievement-details">${ach.details}</p>
              ${ach.link ? `<div class="achievement-link-icon">View Certificate ↗</div>` : ''}
            </div>
          </${tag}>
        `;
      });
      
      grid.innerHTML = html;
      
      // Re-initialize scroll reveal for new items
      if (typeof initScrollReveal === 'function') {
        setTimeout(initScrollReveal, 100);
      }
      
    } catch (e) {
      console.error("Error parsing achievements data", e);
    }
  } else {
    if (emptyState) emptyState.style.display = 'block';
  }
}
