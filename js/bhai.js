document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('currentYear').textContent = new Date().getFullYear();
  loadBhaiMembers();
  document.getElementById('becomeBhaiBtn').addEventListener('click', startQuiz);
});

async function loadBhaiMembers() {
  let data = [];
  if (typeof db !== 'undefined' && db) {
    try {
      const doc = await db.collection('portfolio').doc('bhaiLog').get();
      if (doc.exists && doc.data().items) data = doc.data().items;
    } catch (e) { console.error(e); }
  }
  renderBhaiPage(data);
  hidePreloader();
}

function renderBhaiPage(data) {
  const grid = document.getElementById('bhaiPageGrid');
  const empty = document.getElementById('bhaiPageEmpty');
  if (data.length === 0) { if (empty) empty.style.display = 'block'; return; }
  if (empty) empty.style.display = 'none';
  let html = '';
  data.forEach((m, i) => {
    html += `
      <div class="bhai-card reveal reveal-delay-${(i % 4) + 1}" data-name="${(m.name || '').replace(/"/g, '&quot;')}" data-intro="${(m.intro || '').replace(/"/g, '&quot;')}" data-gender="${(m.gender || '').replace(/"/g, '&quot;')}" data-photo="${(m.photo || '').replace(/"/g, '&quot;')}">
        <div class="bhai-card-photo">${m.photo ? `<img src="${m.photo}" alt="${m.name}">` : '<span class="bhai-card-avatar">' + (m.name ? m.name[0].toUpperCase() : '?') + '</span>'}</div>
        <div class="bhai-card-body">
          <div class="bhai-card-name">${m.name}</div>
          <div class="bhai-card-intro">${m.intro || ''}</div>
          <div class="bhai-card-gender">${m.gender || ''}</div>
        </div>
      </div>
    `;
  });
  grid.innerHTML = html;

  grid.querySelectorAll('.bhai-card').forEach(card => {
    card.addEventListener('click', () => {
      openBhaiOverlay({
        name: card.dataset.name,
        intro: card.dataset.intro,
        gender: card.dataset.gender,
        photo: card.dataset.photo
      });
    });
  });

  if (typeof initScrollReveal === 'function') setTimeout(initScrollReveal, 100);
}

// ==================== QUIZ ====================
const QUESTIONS = [
  { q: 'Is Ahmad Shakti Shaali?', options: ['Yes', 'No'], correct: 0 },
  { q: 'Ahmad likes which character more?', options: ['Goku', 'Naruto'], correct: 0 },
  { q: 'Ahmad\'s favorite color?', options: ['Black', 'Blue'], correct: 0 },
  { q: 'Ahmad likes?', options: ['Biryani', 'Karahi', 'Both'], correct: 2 },
  { q: 'Your Gender?', options: ['Male', 'Female', 'Khtrnaak'], correct: -1 }
];

let quizState = { current: 0, correct: 0, gender: '', passed: false };

function startQuiz() {
  document.getElementById('bhaiPageGrid').style.display = 'none';
  document.getElementById('becomeBhaiBtn').style.display = 'none';
  const section = document.getElementById('quizSection');
  section.style.display = 'block';
  quizState = { current: 0, correct: 0, gender: '', passed: false };
  showQuestion();
}

function showQuestion() {
  const section = document.getElementById('quizSection');
  if (quizState.current >= QUESTIONS.length) {
    if (quizState.correct >= 2) {
      quizState.passed = true;
      askPhoto();
    } else {
      section.innerHTML = `
        <div class="bhai-modal" style="text-align:center;padding:2rem;">
          <h3 style="font-family:'Playfair Display',serif;font-size:1.3rem;color:var(--accent);margin-bottom:0.5rem;">Almost! 😅</h3>
          <p style="color:var(--text-secondary);margin-bottom:1rem;">You need at least 2 correct answers. You got ${quizState.correct}.</p>
          <p style="color:var(--text-muted);font-size:0.8rem;margin-bottom:1.5rem;">Try again — show your Bhai credentials!</p>
          <button class="btn-play" onclick="startQuiz()">Try Again <span>→</span></button>
          <button class="btn-secondary" style="margin-left:0.5rem;" onclick="cancelQuiz()">Cancel</button>
        </div>
      `;
    }
    return;
  }

  const q = QUESTIONS[quizState.current];
  const isGender = quizState.current === 4;
  let html = `
    <div class="bhai-quiz-card">
      <div class="bhai-quiz-progress">Question ${quizState.current + 1} of ${QUESTIONS.length}</div>
      <h3 class="bhai-quiz-question">${q.q}</h3>
      <div class="bhai-quiz-options">
  `;
  q.options.forEach((opt, i) => {
    html += `<button class="bhai-quiz-btn" data-idx="${i}">${opt}</button>`;
  });
  html += `</div></div>`;
  section.innerHTML = html;

  section.querySelectorAll('.bhai-quiz-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.dataset.idx);
      const q = QUESTIONS[quizState.current];
      const isGender = quizState.current === 4;

      btn.style.transform = 'scale(0.95)';
      setTimeout(() => {
        if (q.correct === -1 || idx === q.correct) {
          quizState.correct++;
          if (isGender) quizState.gender = q.options[idx];
        }
        quizState.current++;
        showQuestion();
      }, 200);
    });
  });
}

function askPhoto() {
  const section = document.getElementById('quizSection');
  section.innerHTML = `
    <div class="bhai-modal" style="text-align:center;padding:2rem;">
      <h3 style="font-family:'Playfair Display',serif;font-size:1.3rem;color:#2ecc71;margin-bottom:0.5rem;">You Passed! 🎉</h3>
      <p style="color:var(--text-secondary);margin-bottom:1rem;">You got ${quizState.correct} correct! Now add your details to get your Bhai card.</p>
      <div style="display:flex;flex-direction:column;gap:0.75rem;max-width:320px;margin:0 auto;">
        <input type="text" id="bhaiNameInput" class="form-input" placeholder="Your Name" required>
        <input type="text" id="bhaiIntroInput" class="form-input" placeholder="One line introduction" required>
        <label class="btn-secondary" style="cursor:pointer;font-size:0.8rem;text-align:center;">🖼 Upload Photo<input type="file" id="bhaiPhotoUpload" accept="image/*" style="display:none;"></label>
        <div id="bhaiPhotoFeedback" style="font-size:0.8rem;color:var(--text-muted);min-height:1.2rem;"></div>
        <div id="bhaiPhotoPreview" style="width:80px;height:80px;border-radius:50%;border:2px solid var(--accent);margin:0 auto;overflow:hidden;display:none;"><img src="" style="width:100%;height:100%;object-fit:cover;"></div>
        <button class="btn-play" id="bhaiSaveBtn">Save My Card <span>→</span></button>
        <button class="btn-secondary" onclick="cancelQuiz()">Cancel</button>
      </div>
    </div>
  `;

  let photoData = '';
  const feedback = document.getElementById('bhaiPhotoFeedback');

  document.getElementById('bhaiPhotoUpload').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    feedback.textContent = 'Processing image...';
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const max = 200;
        let w = img.width, h = img.height;
        if (w > h) { if (w > max) { h *= max / w; w = max; } }
        else { if (h > max) { w *= max / h; h = max; } }
        canvas.width = w; canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, w, h);
        photoData = canvas.toDataURL('image/jpeg', 0.7);
        const preview = document.getElementById('bhaiPhotoPreview');
        preview.style.display = 'block';
        preview.querySelector('img').src = photoData;
        feedback.textContent = 'Photo uploaded successfully ✅';
        feedback.style.color = '#2ecc71';
      };
      img.onerror = () => { feedback.textContent = 'Error loading image. Try another.'; feedback.style.color = '#e74c3c'; };
      img.src = ev.target.result;
    };
    reader.onerror = () => { feedback.textContent = 'Error reading file.'; feedback.style.color = '#e74c3c'; };
    reader.readAsDataURL(file);
  });

  document.getElementById('bhaiSaveBtn').addEventListener('click', async () => {
    const name = document.getElementById('bhaiNameInput').value.trim();
    const intro = document.getElementById('bhaiIntroInput').value.trim();
    if (!name) { alert('Please enter your name.'); return; }
    if (!intro) { alert('Please enter an introduction.'); return; }

    const btn = document.getElementById('bhaiSaveBtn');
    btn.textContent = 'Saving...';
    btn.disabled = true;

    const member = {
      id: Date.now().toString(),
      name,
      intro,
      gender: quizState.gender || '',
      photo: photoData || ''
    };

    try {
      if (typeof db !== 'undefined' && db) {
        const doc = await db.collection('portfolio').doc('bhaiLog').get();
        let items = [];
        if (doc.exists && doc.data().items) items = doc.data().items;
        items.push(member);
        await db.collection('portfolio').doc('bhaiLog').set({ items });
      }
    } catch (e) {
      console.error(e);
      alert('Error saving. Try again.');
      btn.textContent = 'Save My Card →';
      btn.disabled = false;
      return;
    }

    document.getElementById('quizSection').style.display = 'none';
    document.getElementById('bhaiPageGrid').style.display = '';
    document.getElementById('becomeBhaiBtn').style.display = '';
    if (typeof showToast === 'function') showToast('Card saved! Welcome to Bhai Log 🎉');
    loadBhaiMembers();
  });
}

function cancelQuiz() {
  document.getElementById('quizSection').style.display = 'none';
  document.getElementById('bhaiPageGrid').style.display = '';
  document.getElementById('becomeBhaiBtn').style.display = '';
}
