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

  // Render Bhai Log
  renderBhaiLog();
  
  // Golden Touch Interactive
  initGoldenTouch();
  
  setTimeout(initScrollReveal, 100);
  hidePreloader();
}

let audioCtx;

function playGoldenSound() {
  try {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const now = audioCtx.currentTime;

    // Main chime tone
    const osc1 = audioCtx.createOscillator();
    const gain1 = audioCtx.createGain();
    osc1.connect(gain1);
    gain1.connect(audioCtx.destination);
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(1318, now);
    osc1.frequency.exponentialRampToValueAtTime(1760, now + 0.06);
    gain1.gain.setValueAtTime(0.14, now);
    gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.55);
    osc1.start(now);
    osc1.stop(now + 0.55);

    // Harmonic fifth (richer)
    const osc2 = audioCtx.createOscillator();
    const gain2 = audioCtx.createGain();
    osc2.connect(gain2);
    gain2.connect(audioCtx.destination);
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(1976, now);
    gain2.gain.setValueAtTime(0.06, now);
    gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.35);
    osc2.start(now);
    osc2.stop(now + 0.35);

    // Bright sparkle overtone
    const osc3 = audioCtx.createOscillator();
    const gain3 = audioCtx.createGain();
    osc3.connect(gain3);
    gain3.connect(audioCtx.destination);
    osc3.type = 'sine';
    osc3.frequency.setValueAtTime(2636, now);
    gain3.gain.setValueAtTime(0.03, now);
    gain3.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
    osc3.start(now);
    osc3.stop(now + 0.15);
  } catch (e) {}
}

function initGoldenTouch() {
  const zone = document.getElementById('goldenZone');
  const counter = document.getElementById('goldCounter');
  if (!zone || !counter) return;

  let count = 0;

  function handleTap(e) {
    const rect = zone.getBoundingClientRect();
    const x = (e.clientX || e.touches?.[0]?.clientX || 0) - rect.left;
    const y = (e.clientY || e.touches?.[0]?.clientY || 0) - rect.top;

    playGoldenSound();
    count++;
    counter.textContent = count;
    counter.style.transform = 'scale(1.3)';
    setTimeout(() => { counter.style.transform = 'scale(1)'; }, 200);

    // Ripple
    const ripple = document.createElement('div');
    ripple.className = 'golden-ripple';
    ripple.style.left = x + 'px';
    ripple.style.top = y + 'px';
    zone.appendChild(ripple);
    ripple.addEventListener('animationend', () => ripple.remove());

    // Particles
    for (let i = 0; i < 6; i++) {
      const p = document.createElement('div');
      p.className = 'golden-particle';
      const angle = (Math.PI * 2 / 6) * i + (Math.random() - 0.5) * 0.5;
      const dist = 40 + Math.random() * 50;
      p.style.setProperty('--dx', Math.cos(angle) * dist + 'px');
      p.style.setProperty('--dy', Math.sin(angle) * dist + 'px');
      p.style.left = x + 'px';
      p.style.top = y + 'px';
      zone.appendChild(p);
      p.addEventListener('animationend', () => p.remove());
    }
  }

  zone.addEventListener('click', handleTap);
  zone.addEventListener('touchstart', (e) => { e.preventDefault(); handleTap(e); }, { passive: false });
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
      <a href="bhai.html" class="bhai-card reveal ${delay}">
        <div class="bhai-card-photo">${member.photo ? `<img src="${member.photo}" alt="${member.name}">` : '<span class="bhai-card-avatar">' + (member.name ? member.name[0].toUpperCase() : '?') + '</span>'}</div>
        <div class="bhai-card-body">
          <div class="bhai-card-name">${member.name}</div>
          <div class="bhai-card-intro">${member.intro || ''}</div>
          <div class="bhai-card-gender">${member.gender || ''}</div>
        </div>
      </a>
    `;
  });
  grid.innerHTML = html;
  if (typeof initScrollReveal === 'function') setTimeout(initScrollReveal, 100);
}
