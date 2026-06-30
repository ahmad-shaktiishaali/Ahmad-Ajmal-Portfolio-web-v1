// default data fallback if localStorage is empty
const DEFAULT_DATA = {
  profile: {
    name: "Ahmad Ajmal",
    title: "Software Engineer & Designer",
    email: "ahmad@example.com",
    bio: "I am a passionate software engineer and designer who builds premium, high-performance web experiences. Combining technical excellence with beautiful editorial design to create digital products that stand out.",
    photo: "assets/profile.jpg"
  },
  skills: [
    { name: "Game Development", percent: 95 },
    { name: "Graphic Design", percent: 95 },
    { name: "Programming", percent: 90 },
    { name: "Game Design", percent: 99 },
    { name: "Software Development", percent: 90 },
    { name: "Web Development", percent: 85 },
    { name: "UI/UX Design", percent: 92 },
    { name: "Level Design", percent: 88 },
    { name: "Animation", percent: 80 },
    { name: "Project Management", percent: 85 }
  ],
  experience: [
    { year: "2025", role: "Remote job", company: "Out Of box Solutions", desc: "" },
    { year: "2023", role: "Remote game dev job", company: "Flux Craft Studios", desc: "" },
    { year: "2020", role: "Freelancing", company: "", desc: "Still Continued" }
  ],
  studios: [],
  projects: [],
  achievements: [],
  bhai: []
};

const firebaseConfig = {
  apiKey: "AIzaSyADPThr4D0RvCJnJipz0lkCrdfGPyl8Am4",
  authDomain: "ahmad-ajmal-portfolio-v1.firebaseapp.com",
  projectId: "ahmad-ajmal-portfolio-v1",
  storageBucket: "ahmad-ajmal-portfolio-v1.firebasestorage.app",
  messagingSenderId: "195162801454",
  appId: "1:195162801454:web:300eb8866e31ec4680e6bf"
};

// Initialize Firebase
let db;
if (typeof firebase !== 'undefined') {
  firebase.initializeApp(firebaseConfig);
  db = firebase.firestore();
}

function initStorage() {
  // Legacy function kept to prevent undefined errors
}

// Theme Management
function initTheme() {
  const toggleBtn = document.getElementById('themeToggle');
  const icon = toggleBtn?.querySelector('.theme-icon');
  
  // 1. Initial load from local storage
  let currentTheme = localStorage.getItem('poetfolio_theme') || 'dark';
  document.body.className = currentTheme;
  updateThemeIcon(icon, currentTheme);

  // 2. Fetch global setting from Firebase
  if (db) {
    db.collection('portfolio').doc('settings').get().then(doc => {
      if (doc.exists && doc.data().theme) {
        const globalTheme = doc.data().theme;
        if (globalTheme !== currentTheme) {
          currentTheme = globalTheme;
          document.body.className = currentTheme;
          localStorage.setItem('poetfolio_theme', currentTheme);
          updateThemeIcon(icon, currentTheme);
        }
      }
    }).catch(err => console.log('Error loading global theme:', err));
  }

  if (toggleBtn) {
    toggleBtn.addEventListener('click', () => {
      const isDark = document.body.classList.contains('dark');
      const newTheme = isDark ? 'light' : 'dark';
      
      document.body.className = newTheme;
      localStorage.setItem('poetfolio_theme', newTheme);
      updateThemeIcon(icon, newTheme);
    });
  }
}

function updateThemeIcon(iconEl, theme) {
  if (!iconEl) return;
  // Moon for dark mode (to switch to light), Sun for light mode (to switch to dark)
  iconEl.innerHTML = theme === 'dark' 
    ? '☀️' // current is dark, show sun to toggle light
    : '🌙'; // current is light, show moon to toggle dark
}

// Admin Modal Logic
function initAdminModal() {
  const diamondBtn = document.getElementById('adminBtn');
  const modal = document.getElementById('passwordModal');
  const closeBtn = document.getElementById('closeModal');
  const form = document.getElementById('passwordForm');
  const input = document.getElementById('adminPassword');
  const errorMsg = document.getElementById('passwordError');

  if (!diamondBtn || !modal) return;

  diamondBtn.addEventListener('click', () => {
    modal.classList.add('active');
    input.value = '';
    errorMsg.textContent = '';
    setTimeout(() => input.focus(), 100);
  });

  closeBtn?.addEventListener('click', () => {
    modal.classList.remove('active');
  });

  // Close on outside click
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.classList.remove('active');
    }
  });

  form?.addEventListener('submit', (e) => {
    e.preventDefault();
    const pwd = input.value;
    
    if (pwd === 'Nizam123') {
      // Correct password
      modal.classList.remove('active');
      window.open('admin.html', '_blank');
    } else {
      errorMsg.textContent = 'Incorrect password. Try again.';
      input.classList.add('shake');
      setTimeout(() => input.classList.remove('shake'), 500);
    }
  });
}

// Scroll Reveal Animation
function initScrollReveal() {
  const elements = document.querySelectorAll('.reveal');
  
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('revealed');
        
        // Specific trigger for skill bars
        if (entry.target.classList.contains('skill-item')) {
          entry.target.classList.add('animated');
          const bar = entry.target.querySelector('.skill-fill');
          if (bar) {
            const percent = bar.getAttribute('data-percent');
            bar.style.width = percent + '%';
          }
        }
        
        observer.unobserve(entry.target); // Only animate once
      }
    });
  }, {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
  });

  elements.forEach(el => observer.observe(el));
}

// Navigation Highlighting
function initNav() {
  const path = window.location.pathname;
  const page = path.split('/').pop() || 'index.html';
  
  const links = document.querySelectorAll('.nav-link');
  links.forEach(link => {
    const href = link.getAttribute('href');
    if (href === page || (page === '' && href === 'index.html')) {
      link.classList.add('active');
    } else {
      link.classList.remove('active');
    }
  });
}

// Show Toast Notification
function showToast(message, type = 'success') {
  let toast = document.getElementById('toastMsg');
  
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toastMsg';
    toast.className = 'toast';
    document.body.appendChild(toast);
  }
  
  toast.textContent = message;
  toast.className = `toast show ${type}`;
  
  setTimeout(() => {
    toast.classList.remove('show');
  }, 3000);
}

// Click Sparkle Effect
function initClickSparkles() {
  if (window.innerWidth <= 768) return;
  document.addEventListener('click', (e) => {
    const count = 5 + Math.floor(Math.random() * 6);
    for (let i = 0; i < count; i++) {
      spawnSparkle(e.clientX, e.clientY);
    }
  });
}

function spawnSparkle(x, y) {
  const el = document.createElement('div');
  const size = 4 + Math.random() * 8;
  const angle = Math.random() * Math.PI * 2;
  const velocity = 60 + Math.random() * 120;
  const dx = Math.cos(angle) * velocity;
  const dy = Math.sin(angle) * velocity;
  const drift = (Math.random() - 0.5) * 20;
  const life = 400 + Math.random() * 600;

  el.style.cssText = `
    position: fixed; pointer-events: none; z-index: 99999; left: ${x}px; top: ${y}px;
    width: ${size}px; height: ${size}px; border-radius: 50%;
    background: radial-gradient(circle, #fff8e0, ${Math.random() > 0.5 ? '#c8a951' : '#dbb95e'});
    box-shadow: 0 0 ${6 + Math.random() * 8}px rgba(200,169,81,0.8), 0 0 ${20 + Math.random() * 20}px rgba(200,169,81,0.3);
    transform: translate(-50%, -50%);
  `;

  document.body.appendChild(el);

  const start = performance.now();

  function animate(now) {
    const t = (now - start) / life;
    if (t >= 1) { el.remove(); return; }

    const eased = 1 - Math.pow(1 - t, 3);
    const cx = dx * eased + drift * Math.sin(t * Math.PI * 3);
    const cy = dy * eased - 60 * eased * eased;
    const scale = 1 - t * 0.6;
    const opacity = 1 - eased;

    el.style.transform = `translate(calc(-50% + ${cx}px), calc(-50% + ${cy}px)) scale(${scale})`;
    el.style.opacity = opacity;
    requestAnimationFrame(animate);
  }

  requestAnimationFrame(animate);
}

function hidePreloader() {
  const el = document.getElementById('preloader');
  if (el) el.classList.add('hidden');
}

// ==================== KILL BUTTON FUN ====================
function initKillBtn() {
  const btn = document.createElement('button');
  btn.id = 'killBtn';
  btn.textContent = '✕';
  btn.title = 'Destroy this website';
  document.body.appendChild(btn);

  let step = 0;

  btn.addEventListener('click', () => {
    if (step === 0) {
      showKillModal(
        'Are you sure?',
        'Do you really want to destroy this website?',
        'Yes, Destroy!',
        'Cancel',
        () => { step = 1; showKillModal(
          'Last Warning!',
          'The developer will cry if you do that. Please stop! 😢',
          'DESTROY ANYWAY',
          'OK, I\'ll stop',
          () => { step = 2; startPanicSequence(); },
          () => { step = 0; }
        );},
        () => { step = 0; }
      );
    }
  });
}

function showKillModal(title, msg, confirmText, cancelText, onConfirm, onCancel) {
  const overlay = document.createElement('div');
  overlay.className = 'kill-overlay';
  overlay.innerHTML = `
    <div class="kill-modal">
      <h3>${title}</h3>
      <p>${msg}</p>
      <div class="kill-modal-actions">
        <button class="kill-btn-danger" id="killConfirm">${confirmText}</button>
        <button class="kill-btn-safe" id="killCancel">${cancelText}</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  overlay.querySelector('#killConfirm').addEventListener('click', () => {
    overlay.remove();
    if (onConfirm) onConfirm();
  });
  overlay.querySelector('#killCancel').addEventListener('click', () => {
    overlay.remove();
    if (onCancel) onCancel();
  });
}

function startPanicSequence() {
  // Siren border
  const siren = document.createElement('div');
  siren.className = 'kill-siren';
  document.body.appendChild(siren);

  // Red overlay
  const panicOv = document.createElement('div');
  panicOv.className = 'kill-panic-overlay';
  document.body.appendChild(panicOv);

  // Counter
  const counter = document.createElement('div');
  counter.className = 'kill-counter';
  counter.textContent = '10';
  document.body.appendChild(counter);

  // Beep sound
  const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  function beep() {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.type = 'square';
    osc.frequency.setValueAtTime(880, audioCtx.currentTime);
    gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.15);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.15);
  }

  let count = 10;
  counter.textContent = count;
  beep();

  const interval = setInterval(() => {
    count--;
    counter.textContent = count;
    beep();
    if (count <= 0) {
      clearInterval(interval);
      siren.remove();
      panicOv.remove();
      counter.remove();
      startBlackoutSequence();
    }
  }, 1000);
}

function playBoomSound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(80, now);
    osc.frequency.exponentialRampToValueAtTime(30, now + 0.8);
    gain.gain.setValueAtTime(0.4, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.9);
    osc.start(now);
    osc.stop(now + 0.9);
  } catch (e) {}
}

function startBlackoutSequence() {
  playBoomSound();
  document.body.classList.add('kill-blackout');

  const overlay = document.createElement('div');
  overlay.className = 'kill-blackout-msg';
  overlay.style.opacity = '0';
  document.body.appendChild(overlay);
  requestAnimationFrame(() => { overlay.style.opacity = '1'; });

  // Show "Muaahhahahha" after 3s
  setTimeout(() => {
    overlay.style.transition = 'opacity 0.6s ease';
    overlay.style.opacity = '0';
    setTimeout(() => {
      overlay.innerHTML = `<h2>Muaahhahahha</h2>`;
      overlay.style.transition = 'opacity 0.6s ease';
      overlay.style.opacity = '1';
    }, 600);
  }, 3000);

  // Show joke message after another 3s
  setTimeout(() => {
    overlay.style.transition = 'opacity 0.6s ease';
    overlay.style.opacity = '0';
    setTimeout(() => {
      overlay.innerHTML = `
        <h2 style="font-size:1.5rem;color:#c8a951;text-shadow:none;">Just kidding! 😅</h2>
        <p>I will never destroy this awesome web.<br>You're safe!</p>
        <button class="btn-primary" id="killRestore">OK</button>
      `;
      overlay.style.transition = 'opacity 0.6s ease';
      overlay.style.opacity = '1';
      overlay.querySelector('#killRestore').addEventListener('click', () => {
        overlay.style.transition = 'opacity 0.6s ease';
        overlay.style.opacity = '0';
        setTimeout(() => {
          overlay.remove();
          document.body.classList.remove('kill-blackout');
        }, 600);
      });
    }, 600);
  }, 6500);
}

function initCursorGlow() {
  if (window.innerWidth <= 768) return;
  document.body.classList.add('custom-cursor');

  const cursor = document.createElement('div');
  cursor.id = 'cursorGlow';
  document.body.appendChild(cursor);

  const trailCount = 5;
  const trailEls = [];
  for (let i = 0; i < trailCount; i++) {
    const dot = document.createElement('div');
    dot.className = 'cursor-trail-dot';
    document.body.appendChild(dot);
    trailEls.push({ el: dot, life: 0, x: 0, y: 0 });
  }

  let mouseX = 0, mouseY = 0;
  let trailIndex = 0;
  let frameSkip = 0;

  document.addEventListener('mousemove', (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
    cursor.style.left = mouseX + 'px';
    cursor.style.top = mouseY + 'px';

    if (frameSkip++ % 2 !== 0) return;
    const dot = trailEls[trailIndex];
    dot.x = mouseX;
    dot.y = mouseY;
    dot.life = 1;
    trailIndex = (trailIndex + 1) % trailCount;
  });

  function animateTrail() {
    for (const dot of trailEls) {
      if (dot.life > 0) {
        dot.life -= 0.06;
        const size = 8 + dot.life * 14;
        const opacity = dot.life * 0.5;
        dot.el.style.width = size + 'px';
        dot.el.style.height = size + 'px';
        dot.el.style.left = dot.x + 'px';
        dot.el.style.top = dot.y + 'px';
        dot.el.style.opacity = opacity;
        dot.el.style.background = `radial-gradient(circle, rgba(200,169,81,${opacity}) 0%, transparent 70%)`;
      } else {
        dot.el.style.opacity = 0;
      }
    }
    requestAnimationFrame(animateTrail);
  }
  animateTrail();

  const interactive = 'a, button, .project-card, .btn-primary, .btn-secondary, input, textarea, select, .golden-zone';
  document.addEventListener('mouseover', (e) => {
    if (e.target.closest(interactive)) cursor.classList.add('enlarged');
  });
  document.addEventListener('mouseout', (e) => {
    if (e.target.closest(interactive)) cursor.classList.remove('enlarged');
  });
}

function initNoiseOverlay() {
  if (window.innerWidth <= 768) return;
  const div = document.createElement('div');
  div.className = 'noise-overlay';
  document.body.appendChild(div);
}

// Initialize everything on DOM load
document.addEventListener('DOMContentLoaded', () => {
  initStorage();
  initTheme();
  initAdminModal();
  initNav();
  // Small delay for scroll reveal to ensure layout is ready
  setTimeout(initScrollReveal, 100);
  initClickSparkles();
  initNoiseOverlay();
  initCursorGlow();
  initKillBtn();
});
