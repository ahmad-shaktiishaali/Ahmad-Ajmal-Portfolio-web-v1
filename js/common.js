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

// Click Sparkle Effect
function initClickSparkles() {
  document.addEventListener('click', (e) => {
    const count = 10 + Math.floor(Math.random() * 8);
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
    will-change: transform, opacity;
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

// Initialize everything on DOM load
document.addEventListener('DOMContentLoaded', () => {
  initStorage();
  initTheme();
  initAdminModal();
  initNav();
  // Small delay for scroll reveal to ensure layout is ready
  setTimeout(initScrollReveal, 100);
  initClickSparkles();
});
