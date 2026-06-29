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
  studios: ["Design Lab", "Creative Tech", "Web Solutions", "Innovate Studios"],
  projects: [],
  achievements: []
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

// ========== PRELOADER ==========
function hidePreloader() {
  const preloader = document.getElementById('preloader');
  if (preloader) {
    preloader.classList.add('hidden');
  }
}

// ========== PAGE TRANSITIONS ==========
function initPageTransitions() {
  const links = document.querySelectorAll('.nav-link');
  const transition = document.getElementById('pageTransition');

  links.forEach(link => {
    link.addEventListener('click', (e) => {
      const href = link.getAttribute('href');
      if (!href || href === '#') return;

      e.preventDefault();
      if (transition) {
        transition.classList.add('active');
      }
      setTimeout(() => {
        window.location.href = href;
      }, 350);
    });
  });
}

// ========== CUSTOM CURSOR ==========
function initCursor() {
  // Only on devices with a real mouse
  if (!matchMedia('(hover: hover) and (pointer: fine)').matches) return;

  const dot = document.getElementById('cursorDot');
  const trailContainer = document.getElementById('cursorTrails');
  if (!dot) return;

  const trails = [];
  const TRAIL_COUNT = 6;

  // Create trail dots
  for (let i = 0; i < TRAIL_COUNT; i++) {
    const t = document.createElement('div');
    t.className = 'cursor-trail';
    t.style.transitionDelay = `${i * 30}ms`;
    trailContainer.appendChild(t);
    trails.push({ el: t, x: 0, y: 0 });
  }

  let mouseX = 0, mouseY = 0;
  let currentX = 0, currentY = 0;
  let rafId = null;

  document.addEventListener('mousemove', (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
    dot.style.left = mouseX + 'px';
    dot.style.top = mouseY + 'px';

    if (!rafId) {
      rafId = requestAnimationFrame(updateTrails);
    }
  });

  function updateTrails() {
    // Smooth trailing
    currentX += (mouseX - currentX) * 0.3;
    currentY += (mouseY - currentY) * 0.3;

    for (let i = trails.length - 1; i >= 0; i--) {
      const t = trails[i];
      if (i === 0) {
        t.x += (currentX - t.x) * 0.25;
        t.y += (currentY - t.y) * 0.25;
      } else {
        const prev = trails[i - 1];
        t.x += (prev.x - t.x) * 0.2;
        t.y += (prev.y - t.y) * 0.2;
      }
      t.el.style.left = t.x + 'px';
      t.el.style.top = t.y + 'px';

      // Fade out later trails
      t.el.style.opacity = 0.5 - (i / trails.length) * 0.4;
    }

    rafId = null;
  }

  // Enlarge on interactive elements
  document.addEventListener('mouseover', (e) => {
    const target = e.target.closest('a, button, .project-card, .btn-primary, .btn-secondary, .achievement-card, input, textarea, select');
    dot.classList.toggle('active', !!target);
  });
}

// ========== MOUSE TILT ON PROJECT CARDS ==========
function initTilt() {
  const cards = document.querySelectorAll('.project-card');
  cards.forEach(card => {
    card.addEventListener('mousemove', (e) => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      const rotateX = ((y - centerY) / centerY) * -6;
      const rotateY = ((x - centerX) / centerX) * 6;
      card.style.transform = card.classList.contains('project-card-top-tier')
        ? `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-4px)`
        : `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
    });

    card.addEventListener('mouseleave', () => {
      card.style.transform = card.classList.contains('project-card-top-tier')
        ? 'perspective(1000px) translateY(-4px)'
        : 'perspective(1000px) rotateX(0) rotateY(0)';
    });
  });
}

// ========== SEARCH / FILTER ==========
function initSearch() {
  const input = document.getElementById('projectSearch');
  const clear = document.getElementById('searchClear');
  const grid = document.getElementById('projectsGrid');
  if (!input || !grid) return;

  input.addEventListener('input', () => {
    const q = input.value.toLowerCase().trim();
    clear.classList.toggle('visible', q.length > 0);

    const cards = grid.querySelectorAll('.project-card');
    let visibleCount = 0;

    cards.forEach(card => {
      const title = card.querySelector('.project-title')?.textContent?.toLowerCase() || '';
      const subtitle = card.querySelector('.project-subtitle')?.textContent?.toLowerCase() || '';
      const match = !q || title.includes(q) || subtitle.includes(q);
      card.classList.toggle('hidden', !match);
      if (match) visibleCount++;
    });

    // Show/hide no-results
    let noResults = grid.querySelector('.search-no-results');
    if (visibleCount === 0 && cards.length > 0) {
      if (!noResults) {
        noResults = document.createElement('div');
        noResults.className = 'search-no-results';
        noResults.innerHTML = '<div class="search-no-icon">🔍</div><div class="search-no-text">No projects match your search</div><div class="search-no-sub">Try a different keyword</div>';
        grid.appendChild(noResults);
      }
      noResults.style.display = 'block';
    } else if (noResults) {
      noResults.style.display = 'none';
    }
  });

  if (clear) {
    clear.addEventListener('click', () => {
      input.value = '';
      input.dispatchEvent(new Event('input'));
      input.focus();
    });
  }
}

// Initialize everything on DOM load
document.addEventListener('DOMContentLoaded', () => {
  initStorage();
  initTheme();
  initAdminModal();
  initNav();
  initPageTransitions();
  initCursor();
  initSearch();
  initTilt();
  // Small delay for scroll reveal to ensure layout is ready
  setTimeout(initScrollReveal, 100);
  // Hide preloader after everything is ready
  setTimeout(hidePreloader, 400);
});
