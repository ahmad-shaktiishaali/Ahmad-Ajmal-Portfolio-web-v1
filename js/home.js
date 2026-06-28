document.addEventListener('DOMContentLoaded', () => {
  loadHomeData();
  
  // Set current year in footer
  document.getElementById('currentYear').textContent = new Date().getFullYear();
});

function loadHomeData() {
  // Load Profile
  const profileStr = localStorage.getItem('poetfolio_profile');
  if (profileStr) {
    try {
      const profile = JSON.parse(profileStr);
      document.getElementById('heroName').textContent = profile.name;
      document.getElementById('footerName').textContent = profile.name;
      document.getElementById('heroTitle').textContent = profile.title;
      document.getElementById('heroEmail').textContent = profile.email;
      document.getElementById('heroBio').textContent = profile.bio;
      
      if (profile.photo) {
        document.getElementById('heroPhoto').src = profile.photo;
      }
    } catch (e) {
      console.error("Error parsing profile data", e);
    }
  }

  // Load Skills
  const skillsStr = localStorage.getItem('poetfolio_skills');
  const skillsContainer = document.getElementById('skillsContainer');
  
  if (skillsStr && skillsContainer) {
    try {
      const skills = JSON.parse(skillsStr);
      let html = '';
      
      skills.forEach((skill, index) => {
        // Stagger animations slightly
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
    } catch (e) {
      console.error("Error parsing skills data", e);
    }
  }

  // Load Experience
  const expStr = localStorage.getItem('poetfolio_experience');
  const expContainer = document.getElementById('experienceContainer');
  
  if (expStr && expContainer) {
    try {
      const experience = JSON.parse(expStr);
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
    } catch (e) {
      console.error("Error parsing experience data", e);
    }
  }

  // Load Studios
  const studiosStr = localStorage.getItem('poetfolio_studios');
  const studiosContainer = document.getElementById('studiosContainer');
  
  if (studiosStr && studiosContainer) {
    try {
      const studios = JSON.parse(studiosStr);
      let html = '';
      
      studios.forEach((studio) => {
        html += `<span class="studio-tag">${studio}</span>`;
      });
      
      studiosContainer.innerHTML = html;
    } catch (e) {
      console.error("Error parsing studios data", e);
    }
  }
}
