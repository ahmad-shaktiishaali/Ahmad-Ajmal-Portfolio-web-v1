document.addEventListener('DOMContentLoaded', () => {
  loadHomeData();
  document.getElementById('currentYear').textContent = new Date().getFullYear();
});

async function loadHomeData() {
  let profile = DEFAULT_DATA.profile;
  let skills = DEFAULT_DATA.skills;
  let experience = DEFAULT_DATA.experience;
  let studios = DEFAULT_DATA.studios;

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
      const studiosDoc = await db.collection('portfolio').doc('studios').get();
      if (studiosDoc.exists && studiosDoc.data().items) studios = studiosDoc.data().items;
    } catch (e) { console.error("Firebase studios error:", e); }
  }

  // Render Profile
  try {
    const heroName = document.getElementById('heroName');
    heroName.textContent = profile.name;
    heroName.classList.remove('skeleton');
    const footerName = document.getElementById('footerName');
    footerName.textContent = profile.name;
    const heroTitle = document.getElementById('heroTitle');
    heroTitle.textContent = profile.title;
    heroTitle.classList.remove('skeleton');
    const heroEmail = document.getElementById('heroEmail');
    heroEmail.textContent = profile.email;
    heroEmail.classList.remove('skeleton');
    const heroBio = document.getElementById('heroBio');
    heroBio.textContent = profile.bio;
    heroBio.classList.remove('skeleton');
    if (profile.photo) {
      document.getElementById('heroPhoto').src = profile.photo;
    }
    // Hide preloader once profile loads
    hidePreloader();
  } catch (e) { console.error(e); }

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

  // Render Studios
  const studiosContainer = document.getElementById('studiosContainer');
  if (studiosContainer) {
    let html = '';
    studios.forEach((studio) => {
      html += `<span class="studio-tag">${studio}</span>`;
    });
    studiosContainer.innerHTML = html;
  }
  
  setTimeout(initScrollReveal, 100);
}
