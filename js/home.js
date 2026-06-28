document.addEventListener('DOMContentLoaded', () => {
  loadHomeData();
  
  // Set current year in footer
  document.getElementById('currentYear').textContent = new Date().getFullYear();
});

async function loadHomeData() {
  if (!db) return;
  
  try {
    // Load Profile
    const profileDoc = await db.collection('portfolio').doc('profile').get();
    let profile = DEFAULT_DATA.profile;
    if (profileDoc.exists) {
      profile = profileDoc.data();
    }
    document.getElementById('heroName').textContent = profile.name;
    document.getElementById('footerName').textContent = profile.name;
    document.getElementById('heroTitle').textContent = profile.title;
    document.getElementById('heroEmail').textContent = profile.email;
    document.getElementById('heroBio').textContent = profile.bio;
    if (profile.photo) {
      document.getElementById('heroPhoto').src = profile.photo;
    }

    // Load Skills
    const skillsDoc = await db.collection('portfolio').doc('skills').get();
    let skills = DEFAULT_DATA.skills;
    if (skillsDoc.exists && skillsDoc.data().items) {
      skills = skillsDoc.data().items;
    }
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

    // Load Experience
    const expDoc = await db.collection('portfolio').doc('experience').get();
    let experience = DEFAULT_DATA.experience;
    if (expDoc.exists && expDoc.data().items) {
      experience = expDoc.data().items;
    }
    const expContainer = document.getElementById('experienceContainer');
    if (expContainer) {
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

    // Load Studios
    const studiosDoc = await db.collection('portfolio').doc('studios').get();
    let studios = DEFAULT_DATA.studios;
    if (studiosDoc.exists && studiosDoc.data().items) {
      studios = studiosDoc.data().items;
    }
    const studiosContainer = document.getElementById('studiosContainer');
    if (studiosContainer) {
      let html = '';
      studios.forEach((studio) => {
        html += `<span class="studio-tag">${studio}</span>`;
      });
      studiosContainer.innerHTML = html;
    }
    
    // Re-trigger scroll reveal for newly injected elements
    setTimeout(initScrollReveal, 100);
  } catch (e) {
    console.error("Error loading home data from Firebase", e);
  }
}
