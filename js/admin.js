// State
let profileData = {};
let projectsData = [];
let achievementsData = [];
let experienceData = [];
let categoriesData = ['Default'];

// Working state for images
let currentProjectImages = [];
let currentAchievementImage = null;
let currentProfileImage = null;

const PROJECT_IMAGE_MAX_SIDE = 720;
const PROJECT_IMAGE_MAX_DATA_URL_LENGTH = 140000;

function projectsCollection() {
  return db.collection('portfolio').doc('projects').collection('items');
}

async function loadProjectsFromFirebase() {
  const snapshot = await projectsCollection().get();
  if (!snapshot.empty) {
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }

  const legacyDoc = await db.collection('portfolio').doc('projects').get();
  if (legacyDoc.exists && legacyDoc.data().items) {
    return legacyDoc.data().items;
  }

  return DEFAULT_DATA.projects;
}

async function saveAllProjectsToFirebase() {
  const batch = db.batch();
  const collectionRef = projectsCollection();
  const existingSnapshot = await collectionRef.get();
  const currentIds = new Set(projectsData.map(project => project.id));

  existingSnapshot.docs.forEach(doc => {
    if (!currentIds.has(doc.id)) {
      batch.delete(collectionRef.doc(doc.id));
    }
  });

  projectsData.forEach(project => {
    batch.set(collectionRef.doc(project.id), project);
  });

  batch.set(db.collection('portfolio').doc('projects'), getProjectsMetadataPayload());
  await batch.commit();
}

function getProjectsMetadataPayload() {
  const payload = {
    storage: 'subcollection',
    count: projectsData.length,
    updatedAt: Date.now()
  };

  if (firebase?.firestore?.FieldValue) {
    payload.updatedAt = firebase.firestore.FieldValue.serverTimestamp();
  }

  return payload;
}

async function saveProjectsMetadata() {
  await db.collection('portfolio').doc('projects').set(getProjectsMetadataPayload());
}

// Helper to compress images before saving to Firebase
function compressImage(file, callback) {
  const reader = new FileReader();
  reader.onload = function(event) {
    const img = new Image();
    img.onload = function() {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;
      const MAX_SIZE = PROJECT_IMAGE_MAX_SIDE;
      
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

      let quality = 0.55;
      let dataUrl = canvas.toDataURL('image/jpeg', quality);

      while (dataUrl.length > PROJECT_IMAGE_MAX_DATA_URL_LENGTH && quality > 0.28) {
        quality -= 0.07;
        dataUrl = canvas.toDataURL('image/jpeg', quality);
      }

      while (dataUrl.length > PROJECT_IMAGE_MAX_DATA_URL_LENGTH && canvas.width > 420 && canvas.height > 420) {
        const resized = document.createElement('canvas');
        resized.width = Math.round(canvas.width * 0.85);
        resized.height = Math.round(canvas.height * 0.85);
        resized.getContext('2d').drawImage(canvas, 0, 0, resized.width, resized.height);
        canvas.width = resized.width;
        canvas.height = resized.height;
        canvas.getContext('2d').drawImage(resized, 0, 0);
        dataUrl = canvas.toDataURL('image/jpeg', quality);
      }

      callback(dataUrl);
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
  initExperienceForm();
  initCategoriesForm();
  initFormatToolbar('projectSubtitle');
  initFormatToolbar('projectDetail');
  initSettingsForm();
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

async function loadAllData() {
  if (!db) {
    populateProfileForm();
    renderProjectsList();
    renderAchievementsList();
    experienceData = DEFAULT_DATA.experience;
    renderExperienceList();
    categoriesData = ['Default'];
    renderCategoriesList();
    return;
  }
  
  try {
    const profileDoc = await db.collection('portfolio').doc('profile').get();
    if (profileDoc.exists) {
      profileData = profileDoc.data();
    } else {
      profileData = DEFAULT_DATA.profile;
    }
  } catch (err) {
    console.error("Firebase profile error:", err);
    profileData = DEFAULT_DATA.profile;
  }
  populateProfileForm();

  try {
    projectsData = await loadProjectsFromFirebase();
  } catch (err) {
    console.error("Firebase projects error:", err);
    projectsData = DEFAULT_DATA.projects;
  }
  renderProjectsList();

  try {
    const achievementsDoc = await db.collection('portfolio').doc('achievements').get();
    if (achievementsDoc.exists) {
      achievementsData = achievementsDoc.data().items || [];
    } else {
      achievementsData = DEFAULT_DATA.achievements;
    }
  } catch (err) {
    console.error("Firebase achievements error:", err);
    achievementsData = DEFAULT_DATA.achievements;
  }
  renderAchievementsList();

  try {
    const expDoc = await db.collection('portfolio').doc('experience').get();
    if (expDoc.exists) {
      experienceData = expDoc.data().items || [];
    } else {
      experienceData = DEFAULT_DATA.experience;
    }
  } catch (err) {
    console.error("Firebase experience error:", err);
    experienceData = DEFAULT_DATA.experience;
  }
  renderExperienceList();

  try {
    const catDoc = await db.collection('portfolio').doc('categories').get();
    if (catDoc.exists && catDoc.data().items) {
      categoriesData = catDoc.data().items;
    } else {
      categoriesData = ['Default'];
    }
  } catch (err) {
    console.error("Firebase categories error:", err);
    categoriesData = ['Default'];
  }
  renderCategoriesList();
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

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    profileData.name = document.getElementById('profileName').value;
    profileData.email = document.getElementById('profileEmail').value;
    profileData.title = document.getElementById('profileTitle').value;
    profileData.bio = document.getElementById('profileBio').value;
    
    if (currentProfileImage) {
      profileData.photo = currentProfileImage;
    }
    
    try {
      showLoading();
      if (db) await db.collection('portfolio').doc('profile').set(profileData);
      hideLoading();
      showToast('Profile updated successfully!');
    } catch (err) {
      hideLoading();
      alert("Error saving profile: " + err.message);
    }
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

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const id = document.getElementById('projectId').value || Date.now().toString();
    const isNew = !document.getElementById('projectId').value;
    
    const subtitleEl = document.getElementById('projectSubtitle');
    const detailEl = document.getElementById('projectDetail');
    const subtitleHtml = subtitleEl.innerHTML.replace(/<br>/g, '').trim();
    const detailHtml = detailEl.innerHTML.replace(/<br>/g, '').trim();
    if (!subtitleHtml) { alert('Subtitle is required.'); subtitleEl.focus(); return; }
    if (!detailHtml) { alert('Detail is required.'); detailEl.focus(); return; }

    const project = {
      id: id,
      title: document.getElementById('projectTitle').value,
      subtitle: subtitleEl.innerHTML,
      detail: detailEl.innerHTML,
      isTopTier: document.getElementById('projectIsTopTier').checked,
      images: currentProjectImages,
      category: document.getElementById('projectCategory').value || 'Default'
    };
    
    if (isNew) {
      projectsData.push(project);
    } else {
      const index = projectsData.findIndex(p => p.id === id);
      if (index !== -1) projectsData[index] = project;
    }
    
    try {
      showLoading();
      if (db) await saveAllProjectsToFirebase();
      hideLoading();
      showToast(isNew ? 'Project created!' : 'Project updated!');
      renderProjectsList();
      closeProjectForm();
    } catch (err) {
      hideLoading();
      alert("Error saving project: " + err.message);
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

function populateCategoryDropdown(selected) {
  const sel = document.getElementById('projectCategory');
  if (!sel) return;
  let opts = '';
  categoriesData.forEach(c => {
    opts += `<option value="${c}"${c === selected ? ' selected' : ''}>${c}</option>`;
  });
  sel.innerHTML = opts;
}

function openProjectForm(project = null) {
  document.getElementById('projectsListContainer').style.display = 'none';
  document.getElementById('btnAddNewProject').style.display = 'none';
  document.getElementById('projectFormContainer').style.display = 'block';
  
  const form = document.getElementById('projectForm');
  form.reset();
  document.getElementById('projectSubtitle').innerHTML = '';
  document.getElementById('projectDetail').innerHTML = '';
  
  if (project) {
    document.getElementById('projectFormTitle').textContent = 'Edit Project';
    document.getElementById('projectId').value = project.id;
    document.getElementById('projectTitle').value = project.title;
    document.getElementById('projectSubtitle').innerHTML = project.subtitle || '';
    document.getElementById('projectDetail').innerHTML = project.detail || '';
    document.getElementById('projectIsTopTier').checked = !!project.isTopTier;
    currentProjectImages = [...(project.images || [])];
    populateCategoryDropdown(project.category || 'Default');
  } else {
    document.getElementById('projectFormTitle').textContent = 'Add New Project';
    document.getElementById('projectId').value = '';
    document.getElementById('projectIsTopTier').checked = false;
    currentProjectImages = [];
    populateCategoryDropdown('Default');
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

window.deleteProject = async function(id) {
  if (confirm("Are you sure you want to delete this project?")) {
    projectsData = projectsData.filter(p => p.id !== id);
    try {
      if (db) await saveAllProjectsToFirebase();
      renderProjectsList();
      showToast('Project deleted', 'error');
    } catch (err) {
      alert("Error deleting project: " + err.message);
    }
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

  form.addEventListener('submit', async (e) => {
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
    
    try {
      showLoading();
      if (db) await db.collection('portfolio').doc('achievements').set({ items: achievementsData });
      hideLoading();
      showToast(isNew ? 'Achievement created!' : 'Achievement updated!');
      renderAchievementsList();
      closeAchievementForm();
    } catch(err) {
      hideLoading();
      alert("Error saving achievement: " + err.message);
    }
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

window.deleteAchievement = async function(id) {
  if (confirm("Are you sure you want to delete this achievement?")) {
    achievementsData = achievementsData.filter(a => a.id !== id);
    try {
      if (db) await db.collection('portfolio').doc('achievements').set({ items: achievementsData });
      renderAchievementsList();
      showToast('Achievement deleted', 'error');
    } catch(err) {
      alert("Error deleting achievement: " + err.message);
    }
  }
}

/* ================= EXPERIENCE LOGIC ================= */
function renderExperienceList() {
  const list = document.getElementById('adminExperienceList');

  if (experienceData.length === 0) {
    list.innerHTML = '<div style="padding: 2rem; text-align: center; color: var(--text-muted);">No experience entries found. Create one!</div>';
    return;
  }

  let html = '';
  experienceData.forEach((exp, idx) => {
    html += `
      <div class="admin-list-item">
        <div class="admin-list-info">
          <div class="admin-list-title">${exp.role}</div>
          <div class="admin-list-sub">${exp.year}${exp.company ? ' &middot; ' + exp.company : ''}</div>
        </div>
        <div class="admin-item-actions">
          <button class="btn-secondary" onclick="editExperience('${idx}')">Edit</button>
          <button class="btn-danger" onclick="deleteExperience('${idx}')">Delete</button>
        </div>
      </div>
    `;
  });
  list.innerHTML = html;
}

function initExperienceForm() {
  const form = document.getElementById('experienceForm');

  document.getElementById('btnAddNewExperience').addEventListener('click', () => {
    openExperienceForm();
  });

  document.getElementById('btnCancelExperience').addEventListener('click', closeExperienceForm);
  document.getElementById('btnCancelExperience2').addEventListener('click', closeExperienceForm);

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const id = document.getElementById('experienceId').value;
    const isNew = !id;

    const entry = {
      year: document.getElementById('experienceYear').value,
      role: document.getElementById('experienceRole').value,
      company: document.getElementById('experienceCompany').value,
      desc: document.getElementById('experienceDetail').value
    };

    if (isNew) {
      experienceData.push(entry);
    } else {
      experienceData[id] = entry;
    }

    try {
      showLoading();
      if (db) await db.collection('portfolio').doc('experience').set({ items: experienceData });
      hideLoading();
      showToast(isNew ? 'Experience added!' : 'Experience updated!');
      renderExperienceList();
      closeExperienceForm();
    } catch (err) {
      hideLoading();
      alert("Error saving experience: " + err.message);
    }
  });
}

function openExperienceForm(entry = null, idx = null) {
  document.getElementById('experienceListContainer').style.display = 'none';
  document.getElementById('btnAddNewExperience').style.display = 'none';
  document.getElementById('experienceFormContainer').style.display = 'block';

  const form = document.getElementById('experienceForm');
  form.reset();

  if (entry) {
    document.getElementById('experienceFormTitle').textContent = 'Edit Experience';
    document.getElementById('experienceId').value = idx;
    document.getElementById('experienceYear').value = entry.year || '';
    document.getElementById('experienceRole').value = entry.role || '';
    document.getElementById('experienceCompany').value = entry.company || '';
    document.getElementById('experienceDetail').value = entry.desc || '';
  } else {
    document.getElementById('experienceFormTitle').textContent = 'Add New Experience';
    document.getElementById('experienceId').value = '';
  }
}

function closeExperienceForm() {
  document.getElementById('experienceListContainer').style.display = 'block';
  document.getElementById('btnAddNewExperience').style.display = 'block';
  document.getElementById('experienceFormContainer').style.display = 'none';
}

window.editExperience = function(idx) {
  const entry = experienceData[idx];
  if (entry) openExperienceForm(entry, idx);
}

window.deleteExperience = async function(idx) {
  if (confirm("Are you sure you want to delete this experience entry?")) {
    experienceData.splice(idx, 1);
    try {
      if (db) await db.collection('portfolio').doc('experience').set({ items: experienceData });
      renderExperienceList();
      showToast('Experience deleted', 'error');
    } catch (err) {
      alert("Error deleting experience: " + err.message);
    }
  }
}

/* ================= FORMATTING TOOLBAR ================= */
function initFormatToolbar(editorId) {
  const editor = document.getElementById(editorId);
  if (!editor) return;

  const toolbar = editor.parentElement.querySelector('.fmt-toolbar');
  if (!toolbar) return;

  toolbar.querySelectorAll('.fmt-btn').forEach(btn => {
    btn.addEventListener('mousedown', (e) => {
      e.preventDefault();
      const cmd = btn.getAttribute('data-cmd');
      editor.focus();

      switch (cmd) {
        case 'bold':
          document.execCommand('bold');
          break;
        case 'italic':
          document.execCommand('italic');
          break;
        case 'link': {
          const url = prompt('Enter URL:', 'https://');
          if (url) document.execCommand('createLink', false, url);
          break;
        }
        case 'color': {
          const color = prompt('Enter color (hex, name):', '#c8a951');
          if (color) document.execCommand('foreColor', false, color);
          break;
        }
        case 'icon': {
          const icon = prompt('Enter emoji or icon:', '✨');
          if (icon) document.execCommand('insertHTML', false, icon);
          break;
        }
      }
    });
  });
}

/* ================= CATEGORIES LOGIC ================= */
function renderCategoriesList() {
  const list = document.getElementById('adminCategoriesList');
  if (!list) return;

  if (categoriesData.length === 0) {
    list.innerHTML = '<div style="padding: 2rem; text-align: center; color: var(--text-muted);">No categories. "Default" will be used.</div>';
    return;
  }

  let html = '';
  categoriesData.forEach((cat, idx) => {
    const isDefault = cat === 'Default';
    html += `
      <div class="admin-list-item">
        <div class="admin-list-info">
          <div class="admin-list-title">${cat}${isDefault ? ' <span style="font-size:0.65rem;color:var(--accent);font-weight:600;">— DEFAULT</span>' : ''}</div>
        </div>
        <div class="admin-item-actions">
          ${isDefault ? '' : `<button class="btn-danger" onclick="deleteCategory('${idx}')">Delete</button>`}
        </div>
      </div>
    `;
  });
  list.innerHTML = html;
}

function initCategoriesForm() {
  const addBtn = document.getElementById('btnAddNewCategory');
  if (!addBtn) return;

  addBtn.addEventListener('click', () => {
    const name = prompt('Enter category name:');
    if (!name || !name.trim()) return;
    const trimmed = name.trim();
    if (categoriesData.includes(trimmed)) {
      alert('Category already exists.');
      return;
    }
    categoriesData.push(trimmed);
    saveCategories();
  });
}

window.deleteCategory = async function(idx) {
  const cat = categoriesData[idx];
  if (cat === 'Default') return;
  if (!confirm(`Delete "${cat}"? Projects in this category will move to "Default".`)) return;
  categoriesData.splice(idx, 1);
  projectsData.forEach(p => { if (p.category === cat) p.category = 'Default'; });
  await saveCategories();
  if (db) await saveAllProjectsToFirebase();
  renderProjectsList();
}

async function saveCategories() {
  try {
    if (db) await db.collection('portfolio').doc('categories').set({ items: categoriesData });
    renderCategoriesList();
    showToast('Categories updated!');
  } catch (err) {
    alert("Error saving categories: " + err.message);
  }
}

/* ================= SETTINGS / THEMES LOGIC ================= */
let selectedGlobalTheme = 'dark'; // Default

function initSettingsForm() {
  const themeBtns = document.querySelectorAll('.theme-select-btn');
  const saveBtn = document.getElementById('btnSaveGlobalTheme');
  
  // Load current settings if available
  if (db) {
    db.collection('portfolio').doc('settings').get().then(doc => {
      if (doc.exists && doc.data().theme) {
        selectedGlobalTheme = doc.data().theme;
        updateActiveThemeBtn(selectedGlobalTheme);
      }
    }).catch(err => console.log("No global theme loaded", err));
  }
  
  themeBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const theme = btn.getAttribute('data-theme');
      selectedGlobalTheme = theme;
      
      // Preview it locally
      document.body.className = theme;
      
      updateActiveThemeBtn(theme);
    });
  });
  
  saveBtn.addEventListener('click', async () => {
    try {
      showLoading();
      if (db) {
        await db.collection('portfolio').doc('settings').set({
          theme: selectedGlobalTheme
        }, { merge: true });
      }
      hideLoading();
      showToast('Global theme updated!');
    } catch (err) {
      hideLoading();
      alert("Error saving theme: " + err.message);
    }
  });
}

function updateActiveThemeBtn(theme) {
  const themeBtns = document.querySelectorAll('.theme-select-btn');
  themeBtns.forEach(b => {
    if (b.getAttribute('data-theme') === theme) {
      b.style.boxShadow = '0 0 0 3px var(--accent)';
      b.style.transform = 'scale(1.05)';
    } else {
      b.style.boxShadow = 'none';
      b.style.transform = 'scale(1)';
    }
  });
}

/* ================= LOADING ANIMATION ================= */
function showLoading() {
  const overlay = document.getElementById('adminLoadingOverlay');
  if (overlay) overlay.classList.add('active');
}

function hideLoading() {
  const overlay = document.getElementById('adminLoadingOverlay');
  if (overlay) overlay.classList.remove('active');
}
