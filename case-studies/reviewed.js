// Synchronize portfolio language and light/dark theme across all 6 case study pages
const storedLanguage = localStorage.getItem('lang');
if (storedLanguage === 'es' || storedLanguage === 'en') {
  document.documentElement.lang = storedLanguage;
}
if (localStorage.getItem('theme') === 'dark') {
  document.documentElement.dataset.theme = 'dark';
}

const nav = document.querySelector('nav.downloads');
if (nav && !document.getElementById('caseThemeToggle')) {
  const themeBtn = document.createElement('button');
  themeBtn.id = 'caseThemeToggle';
  themeBtn.type = 'button';
  themeBtn.textContent = document.documentElement.dataset.theme === 'dark' ? '☀ Light' : '☾ Dark';
  themeBtn.addEventListener('click', () => {
    const isDark = document.documentElement.dataset.theme === 'dark';
    if (isDark) {
      delete document.documentElement.dataset.theme;
      localStorage.setItem('theme', 'light');
      themeBtn.textContent = '☾ Dark';
    } else {
      document.documentElement.dataset.theme = 'dark';
      localStorage.setItem('theme', 'dark');
      themeBtn.textContent = '☀ Light';
    }
  });
  nav.appendChild(themeBtn);
}

for (const button of document.querySelectorAll('nav button')) {
  if (button.id === 'caseThemeToggle') continue;
  button.addEventListener('click', () => {
    localStorage.setItem('lang', document.documentElement.lang);
  });
}
