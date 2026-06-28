// State
let profileData = {};
let projectsData = [];
let achievementsData = [];

// Working state for images
let currentProjectImages = [];
let currentAchievementImage = null;
let currentProfileImage = null;

// Helper to compress images before saving to localStorage
function compressImage(file, callback) {
  const reader = new FileReader();
  reader.onload = function(event) {
    const img = new Image();
    img.onload = function() {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;
      const MAX_SIZE = 1000;
      
      if (width > height) {
        if (width > MAX_SIZE) {
          height *= MAX_SIZE / width;
          width = MAX_SIZE;
        }
      } else {
        if (height > MAX_SIZE) {
          width *= MAX_SIZE / height;
          height = MAX_SIZE;
        }
      }
      
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);
      callback(canvas.toDataURL('image/jpeg', 0.6)); // 60% quality JPEG
    };
    img.src = event.target.result;
  };
  reader.readAsDataURL(file);
}


document.addEventListener('DOMContentLoaded', () => {
  // Simple auth check - in real app, use proper session
  if (!document.referrer && window.location.protocol !== 'file:') {
    // Basic protection against direct linking, though file:// makes it tricky
  }

  initTabs();
  loadAllData();
  
  // Initialize Forms
  initProfileForm();
  initProjectForm();
  initAchievementForm();
});

function initTabs() {
  const tabs = document.querySelectorAll('.admin-tab');
  const sections = document.querySelectorAll('.admin-section');
  
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      // Remove active from all
      tabs.forEach(t => t.classList.remove('active'));
      sections.forEach(s => s.classList.remove('active'));
      
      // Add active to clicked
      tab.classList.add('active');
      const targetId = tab.getAttribute('data-target');
      document.getElementById(targetId).classList.add('active');
    });
  });
}

function loadAllData() {
  // Load Profile
  const profileStr = localStorage.getItem('poetfolio_profile');
  if (profileStr) {
    profileData = JSON.parse(profileStr);
    populateProfileForm();
  }

  // Load Projects
  const projectsStr = localStorage.getItem('poetfolio_projects');
  if (projectsStr) {
    projectsData = JSON.parse(projectsStr);
    renderProjectsList();
  }

  // Load Achievements
  const achievementsStr = localStorage.getItem('poetfolio_achievements');
  if (achievementsStr) {
    achievementsData = JSON.parse(achievementsStr);
    renderAchievementsList();
  }
}

/* ================= PROFILE LOGIC ================= */
function initProfileForm() {
  const form = document.getElementById('profileForm');
  const photoInput = document.getElementById('profilePhotoInput');
  
  photoInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
      compressImage(file, (compressedData) => {
        currentProfileImage = compressedData;
        updateProfilePhotoPreview(currentProfileImage);
      });
    }
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    
    profileData.name = document.getElementById('profileName').value;
    profileData.email = document.getElementById('profileEmail').value;
    profileData.title = document.getElementById('profileTitle').value;
    profileData.bio = document.getElementById('profileBio').value;
    
    if (currentProfileImage) {
      profileData.photo = currentProfileImage;
    }
    
    localStorage.setItem('poetfolio_profile', JSON.stringify(profileData));
    showToast('Profile updated successfully!');
  });
}

function populateProfileForm() {
  document.getElementById('profileName').value = profileData.name || '';
  document.getElementById('profileEmail').value = profileData.email || '';
  document.getElementById('profileTitle').value = profileData.title || '';
  document.getElementById('profileBio').value = profileData.bio || '';
  
  if (profileData.photo) {
    currentProfileImage = profileData.photo;
    updateProfilePhotoPreview(currentProfileImage);
  }
}

function updateProfilePhotoPreview(src) {
  const preview = document.getElementById('adminPhotoPreview');
  const placeholder = document.getElementById('adminPhotoPlaceholder');
  
  if (src) {
    preview.src = src;
    preview.style.display = 'block';
    placeholder.style.display = 'none';
  } else {
    preview.style.display = 'none';
    placeholder.style.display = 'flex';
  }
}

/* ================= PROJECTS LOGIC ================= */
function renderProjectsList() {
  const list = document.getElementById('adminProjectsList');
  
  if (projectsData.length === 0) {
    list.innerHTML = '<div style="padding: 2rem; text-align: center; color: var(--text-muted);">No projects found. Create one!</div>';
    return;
  }
  
  let html = '';
  projectsData.forEach(project => {
    const thumb = (project.images && project.images.length > 0) ? project.images[0] : '';
    html += `
      <div class="admin-list-item">
        ${thumb ? `<img src="${thumb}" class="admin-list-thumb">` : `<div class="admin-list-thumb" style="background: var(--bg-primary);"></div>`}
        <div class="admin-list-info">
          <div class="admin-list-title" style="display: flex; align-items: center; gap: 0.5rem;">
            ${project.title}
            ${project.isTopTier ? '<span style="font-size: 0.65rem; background: var(--accent); color: #000; padding: 0.1rem 0.4rem; border-radius: 4px; font-weight: bold;">TOP TIER</span>' : ''}
          </div>
          <div class="admin-list-sub">${project.subtitle}</div>
        </div>
        <div class="admin-item-actions">
          <button class="btn-secondary" onclick="editProject('${project.id}')">Edit</button>
          <button class="btn-danger" onclick="deleteProject('${project.id}')">Delete</button>
        </div>
      </div>
    `;
  });
  list.innerHTML = html;
}

function initProjectForm() {
  const fileInput = document.getElementById('projectFileInput');
  const form = document.getElementById('projectForm');
  
  document.getElementById('btnAddNewProject').addEventListener('click', () => {
    openProjectForm();
  });
  
  document.getElementById('btnCancelProject').addEventListener('click', closeProjectForm);
  document.getElementById('btnCancelProject2').addEventListener('click', closeProjectForm);
  
  fileInput.addEventListener('change', (e) => {
    const files = Array.from(e.target.files);
    
    if (currentProjectImages.length + files.length > 5) {
      alert("Maximum 5 images allowed per project.");
      return;
    }
    
    files.forEach(file => {
      if (currentProjectImages.length >= 5) return;
      
      compressImage(file, (compressedData) => {
        currentProjectImages.push(compressedData);
        renderProjectImages();
      });
    });
    
    // Reset input
    fileInput.value = '';
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const id = document.getElementById('projectId').value || Date.now().toString();
    const isNew = !document.getElementById('projectId').value;
    
    const project = {
      id: id,
      title: document.getElementById('projectTitle').value,
      subtitle: document.getElementById('projectSubtitle').value,
      detail: document.getElementById('projectDetail').value,
      isTopTier: document.getElementById('projectIsTopTier').checked,
      images: currentProjectImages
    };
    
    if (isNew) {
      projectsData.push(project);
    } else {
      const index = projectsData.findIndex(p => p.id === id);
      if (index !== -1) projectsData[index] = project;
    }
    
    try {
      localStorage.setItem('poetfolio_projects', JSON.stringify(projectsData));
      showToast(isNew ? 'Project created!' : 'Project updated!');
      renderProjectsList();
      closeProjectForm();
    } catch (err) {
      if (err.name === 'QuotaExceededError' || err.name === 'NS_ERROR_DOM_QUOTA_REACHED') {
        alert("Storage limit exceeded! Even with compression, you have saved too many images. Please delete old projects or use fewer images.");
        // Revert projectsData change
        projectsData = JSON.parse(localStorage.getItem('poetfolio_projects') || '[]');
      } else {
        alert("Error saving project: " + err.message);
      }
    }
  });
}

function renderProjectImages() {
  const container = document.getElementById('projectImagePreview');
  const uploadBtn = document.getElementById('projectImageUpload');
  
  container.innerHTML = '';
  
  currentProjectImages.forEach((img, idx) => {
    container.innerHTML += `
      <div class="image-preview-item">
        <img src="${img}">
        <button type="button" class="image-preview-remove" onclick="removeProjectImage(${idx})">✕</button>
      </div>
    `;
  });
  
  if (currentProjectImages.length >= 5) {
    uploadBtn.style.display = 'none';
  } else {
    uploadBtn.style.display = 'block';
  }
}

// Need to make it global to be called from inline onclick
window.removeProjectImage = function(index) {
  currentProjectImages.splice(index, 1);
  renderProjectImages();
}

function openProjectForm(project = null) {
  document.getElementById('projectsListContainer').style.display = 'none';
  document.getElementById('btnAddNewProject').style.display = 'none';
  document.getElementById('projectFormContainer').style.display = 'block';
  
  const form = document.getElementById('projectForm');
  form.reset();
  
  if (project) {
    document.getElementById('projectFormTitle').textContent = 'Edit Project';
    document.getElementById('projectId').value = project.id;
    document.getElementById('projectTitle').value = project.title;
    document.getElementById('projectSubtitle').value = project.subtitle;
    document.getElementById('projectDetail').value = project.detail;
    document.getElementById('projectIsTopTier').checked = !!project.isTopTier;
    currentProjectImages = [...(project.images || [])];
  } else {
    document.getElementById('projectFormTitle').textContent = 'Add New Project';
    document.getElementById('projectId').value = '';
    document.getElementById('projectIsTopTier').checked = false;
    currentProjectImages = [];
  }
  
  renderProjectImages();
}

function closeProjectForm() {
  document.getElementById('projectsListContainer').style.display = 'block';
  document.getElementById('btnAddNewProject').style.display = 'block';
  document.getElementById('projectFormContainer').style.display = 'none';
}

window.editProject = function(id) {
  const project = projectsData.find(p => p.id === id);
  if (project) openProjectForm(project);
}

window.deleteProject = function(id) {
  if (confirm("Are you sure you want to delete this project?")) {
    projectsData = projectsData.filter(p => p.id !== id);
    localStorage.setItem('poetfolio_projects', JSON.stringify(projectsData));
    renderProjectsList();
    showToast('Project deleted', 'error');
  }
}

/* ================= ACHIEVEMENTS LOGIC ================= */
function renderAchievementsList() {
  const list = document.getElementById('adminAchievementsList');
  
  if (achievementsData.length === 0) {
    list.innerHTML = '<div style="padding: 2rem; text-align: center; color: var(--text-muted);">No achievements found. Create one!</div>';
    return;
  }
  
  let html = '';
  achievementsData.forEach(ach => {
    html += `
      <div class="admin-list-item">
        ${ach.image ? `<img src="${ach.image}" class="admin-list-thumb">` : `<div class="admin-list-thumb" style="background: var(--bg-primary);"></div>`}
        <div class="admin-list-info">
          <div class="admin-list-title">${ach.title}</div>
          <div class="admin-list-sub">${ach.details}</div>
        </div>
        <div class="admin-item-actions">
          <button class="btn-secondary" onclick="editAchievement('${ach.id}')">Edit</button>
          <button class="btn-danger" onclick="deleteAchievement('${ach.id}')">Delete</button>
        </div>
      </div>
    `;
  });
  list.innerHTML = html;
}

function initAchievementForm() {
  const fileInput = document.getElementById('achievementFileInput');
  const form = document.getElementById('achievementForm');
  
  document.getElementById('btnAddNewAchievement').addEventListener('click', () => {
    openAchievementForm();
  });
  
  document.getElementById('btnCancelAchievement').addEventListener('click', closeAchievementForm);
  document.getElementById('btnCancelAchievement2').addEventListener('click', closeAchievementForm);
  
  fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
      compressImage(file, (compressedData) => {
        currentAchievementImage = compressedData;
        renderAchievementImage();
      });
    }
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    
    if (!currentAchievementImage) {
      alert("Certificate image is required.");
      return;
    }
    
    const id = document.getElementById('achievementId').value || Date.now().toString();
    const isNew = !document.getElementById('achievementId').value;
    
    const achievement = {
      id: id,
      title: document.getElementById('achievementTitle').value,
      details: document.getElementById('achievementDetails').value,
      link: document.getElementById('achievementLink').value,
      image: currentAchievementImage
    };
    
    if (isNew) {
      achievementsData.push(achievement);
    } else {
      const index = achievementsData.findIndex(a => a.id === id);
      if (index !== -1) achievementsData[index] = achievement;
    }
    
    localStorage.setItem('poetfolio_achievements', JSON.stringify(achievementsData));
    showToast(isNew ? 'Achievement created!' : 'Achievement updated!');
    
    renderAchievementsList();
    closeAchievementForm();
  });
}

function renderAchievementImage() {
  const container = document.getElementById('achievementImagePreview');
  
  if (currentAchievementImage) {
    container.innerHTML = `
      <div class="image-preview-item" style="width: 150px; height: 100px;">
        <img src="${currentAchievementImage}">
        <button type="button" class="image-preview-remove" onclick="removeAchievementImage()">✕</button>
      </div>
    `;
    document.getElementById('achievementFileInput').required = false;
  } else {
    container.innerHTML = '';
    document.getElementById('achievementFileInput').required = true;
  }
}

window.removeAchievementImage = function() {
  currentAchievementImage = null;
  renderAchievementImage();
  document.getElementById('achievementFileInput').value = '';
}

function openAchievementForm(achievement = null) {
  document.getElementById('achievementsListContainer').style.display = 'none';
  document.getElementById('btnAddNewAchievement').style.display = 'none';
  document.getElementById('achievementFormContainer').style.display = 'block';
  
  const form = document.getElementById('achievementForm');
  form.reset();
  
  if (achievement) {
    document.getElementById('achievementFormTitle').textContent = 'Edit Achievement';
    document.getElementById('achievementId').value = achievement.id;
    document.getElementById('achievementTitle').value = achievement.title;
    document.getElementById('achievementDetails').value = achievement.details;
    document.getElementById('achievementLink').value = achievement.link || '';
    currentAchievementImage = achievement.image;
    
    // Not strictly required if editing existing
    document.getElementById('achievementFileInput').required = false;
  } else {
    document.getElementById('achievementFormTitle').textContent = 'Add Achievement';
    document.getElementById('achievementId').value = '';
    currentAchievementImage = null;
    document.getElementById('achievementFileInput').required = true;
  }
  
  renderAchievementImage();
}

function closeAchievementForm() {
  document.getElementById('achievementsListContainer').style.display = 'block';
  document.getElementById('btnAddNewAchievement').style.display = 'block';
  document.getElementById('achievementFormContainer').style.display = 'none';
}

window.editAchievement = function(id) {
  const achievement = achievementsData.find(a => a.id === id);
  if (achievement) openAchievementForm(achievement);
}

window.deleteAchievement = function(id) {
  if (confirm("Are you sure you want to delete this achievement?")) {
    achievementsData = achievementsData.filter(a => a.id !== id);
    localStorage.setItem('poetfolio_achievements', JSON.stringify(achievementsData));
    renderAchievementsList();
    showToast('Achievement deleted', 'error');
  }
}
