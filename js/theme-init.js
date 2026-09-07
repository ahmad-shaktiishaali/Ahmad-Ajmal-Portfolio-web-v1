(function () {
  const allowedThemes = ['dark', 'light', 'maroon', 'ocean', 'forest'];
  let savedTheme = 'dark';

  try {
    const storedTheme = localStorage.getItem('poetfolio_theme');
    if (allowedThemes.includes(storedTheme)) savedTheme = storedTheme;
  } catch (error) {
    // Storage can be unavailable in strict privacy modes. Dark is the safe default.
  }

  document.documentElement.dataset.theme = savedTheme;
})();
