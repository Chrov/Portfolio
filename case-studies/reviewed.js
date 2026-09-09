// Match the visitor's portfolio language and theme across case pages.
const storedLanguage = localStorage.getItem('lang');
if (storedLanguage === 'es' || storedLanguage === 'en') document.documentElement.lang = storedLanguage;
if (localStorage.getItem('theme') === 'dark') document.documentElement.dataset.theme = 'dark';
for (const button of document.querySelectorAll('nav button')) {
  button.addEventListener('click', () => localStorage.setItem('lang', document.documentElement.lang));
}
