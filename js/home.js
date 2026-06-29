document.addEventListener('DOMContentLoaded', () => {
  loadHomeData();
  
  // Set current year in footer
  document.getElementById('currentYear').textContent = new Date().getFullYear();
});

async function loadHomeData() {
  let profile = DEFAULT_DATA.profile;
  let skills = DEFAULT_DATA.skills;
  let experience = DEFAULT_DATA.experience;
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
  }

  // Render Profile
  try {
    document.getElementById('heroName').textContent = profile.name;
    document.getElementById('footerName').textContent = profile.name;
    document.getElementById('heroTitle').textContent = profile.title;
    const heroEmail = document.getElementById('heroEmail');
    heroEmail.textContent = profile.email;
    heroEmail.href = `mailto:${profile.email}`;
    document.getElementById('heroBio').textContent = profile.bio;
    if (profile.photo) {
      document.getElementById('heroPhoto').src = profile.photo;
    }
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

  // Init Golden Tap
  initGoldenTap();
  
  setTimeout(initScrollReveal, 100);
}

function initGoldenTap() {
  const orb = document.getElementById('goldenOrb');
  const scoreEl = document.getElementById('gameScore');
  const msgEl = document.getElementById('gameMessage');
  if (!orb) return;

  let score = parseInt(localStorage.getItem('poetfolio_taps') || '0', 10);
  scoreEl.textContent = score;

  const messages = [
    '✨ Radiant!', '💫 Stellar!', '🌟 Glowing!', '⚡ Brilliant!',
    '🔥 On fire!', '💎 Precious!', '🌙 Lunar!', '☀️ Golden!',
    '🎯 On point!', '🌈 Magical!', '⭐ Legendary!', '👑 Royal!',
    '🌀 Hypnotic!', '✨ Dazzling!', '🌊 Flowing!', '🎆 Sparkling!'
  ];

  function handleTap(e) {
    e.preventDefault();
    score++;
    localStorage.setItem('poetfolio_taps', score);

    orb.classList.remove('orb-bounce');
    void orb.offsetWidth;
    orb.classList.add('orb-bounce');

    scoreEl.classList.remove('pop');
    void scoreEl.offsetWidth;
    scoreEl.classList.add('pop');
    scoreEl.textContent = score;

    const msg = messages[Math.floor(Math.random() * messages.length)];
    msgEl.textContent = msg;
    msgEl.classList.remove('fade');
    void msgEl.offsetWidth;
    msgEl.classList.add('fade');

    if (typeof spawnSparkle === 'function') {
      const rect = orb.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      for (let i = 0; i < 18; i++) {
        setTimeout(() => spawnSparkle(cx, cy), i * 20);
      }
    }
  }

  orb.addEventListener('click', handleTap);
  orb.addEventListener('touchstart', (e) => {
    if (!e.cancelable) return;
    e.preventDefault();
    handleTap(e);
  }, { passive: false });
}
