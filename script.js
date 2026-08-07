/* ============================================================
   Portfolio — i18n (EN default / ES), GitHub repos, UI helpers
   ============================================================ */

const CV_FILES = {
  en: "assets/Camilo_Vergara_Resume_EN.pdf",
  es: "assets/Camilo_Vergara_CV_ES.pdf",
};

const I18N = {
  en: {
    "nav.about": "About",
    "nav.experience": "Experience",
    "nav.projects": "Projects",
    "nav.skills": "Skills",
    "nav.contact": "Contact",

    "hero.eyebrow": "Data Analyst · Business Intelligence",
    "hero.tagline": "I turn raw data into dashboards, automation and decisions that move the business.",
    "hero.summary": "Data Analyst with 4+ years of experience delivering measurable impact across the full data lifecycle — SQL, Python, Power BI and Tableau. I own the data end to end, from the pipeline that cleans and models it to the dashboard that drives the decision.",
    "hero.seeWork": "See my work",
    "hero.download": "Download Resume (EN)",
    "hero.downloadAlt": "Also available in Spanish (PDF)",
    "hero.email": "Email me",
    "hero.call": "Call me",

    "stats.years": "years of experience",
    "stats.reporting": "faster compliance reporting",
    "stats.accuracy": "automated verification accuracy",
    "stats.companies": "companies served by my dashboards",

    "proj.kicker": "01 — Projects",
    "proj.title": "Featured work",
    "proj.lead": "Three case studies, each with the same structure: the problem, what I built, and the number it moved.",
    "proj.caseLabel": "Case study",
    "proj.lblContext": "Context",
    "proj.lblAction": "What I did",
    "proj.lblImpact": "Impact",

    "proj.p1.title": "Feria Business Modernization",
    "proj.p1.context": "An artisanal-products market business ran with no data: improvised pricing, weekly stockouts and a single supplier.",
    "proj.p1.action": "Operations diagnosis, supply-chain redesign and a standardized pricing policy, plus a BI stack (SQL, Power BI, Tableau) fed by a WhatsApp bot that turns voice notes into inventory and sales data.",
    "proj.p1.m1": "stockouts",
    "proj.p1.m2": "supply costs",
    "proj.p1.m3": "sales",

    "proj.p3.title": "Compliance Verification Automation",
    "proj.p3.context": "Verifying compliance documents (Law 20.123) for 70+ client companies was manual and didn't scale.",
    "proj.p3.action": "Automated the whole workflow in SQL (stored procedures and triggers) with format validation and business rules, plus anomaly detection in Python (Pandas, Seaborn).",
    "proj.p3.m1": "verification accuracy",
    "proj.p3.m2": "faster reporting",

    "proj.p4.title": "HR & People Analytics Dashboards",
    "proj.p4.context": "The People team consolidated turnover, absenteeism and headcount by hand, from the ERP and control spreadsheets.",
    "proj.p4.action": "Modeled the data and integrated ERP and spreadsheets into Power BI: turnover, absenteeism, headcount and staffing evolution, plus cohort analysis and automated payroll reporting.",
    "proj.p4.m1": "manual consolidation",
    "proj.p4.m2": "users reached",

    "proj.platformsLabel": "Find more of my work on:",
    "proj.dashboards": "dashboards",
    "proj.ghTitle": "Latest on GitHub",
    "proj.ghLoading": "Loading repositories…",
    "proj.ghError": "Couldn't load repositories right now — visit github.com/Chrov instead.",

    "tag.automation": "Automation",
    "tag.erp": "ERP Integration",
    "tag.cohort": "Cohort Analysis",

    "exp.kicker": "02 — Experience",
    "exp.title": "Where I've made an impact",
    "exp.job2.role": "Independent Consultant — Business & Data Modernization",
    "exp.job2.period": "Apr – Jul 2026",
    "exp.job2.company": "Feria Business Modernization · Independent Project",
    "exp.job2.b1": "Led an end-to-end operations and data modernization project for an artisanal-products market business, from diagnosis to full implementation.",
    "exp.job2.b2": "Cut supply costs by 15–20% by diversifying suppliers and building an emergency supply chain.",
    "exp.job2.b3": "Contributed to a 10–15% sales increase through standardized pricing and daily data-informed decisions.",
    "exp.job2.b4": "Built a full BI stack (Excel, Power BI, Tableau, SQL) plus a WhatsApp voice-note bot with automated transcription — reducing stockouts to near zero.",
    "exp.job1.role": "Analyst Programmer",
    "exp.job1.period": "Dec 2021 – Jan 2026",
    "exp.job1.b1": "Designed and automated SQL data pipelines (stored procedures, triggers) that significantly cut report processing time.",
    "exp.job1.b2": "Built Power BI and Tableau dashboards serving 70+ contractor companies and 100+ users, including reports processing 10,000+ columns.",
    "exp.job1.b3": "Automated SQL-based document-verification workflows, raising accuracy above 90% and helping the platform scale.",
    "exp.job1.b4": "Accelerated compliance reporting (Law 20.123) by ~40% with SQL automation and Python anomaly detection (Pandas, Seaborn).",
    "exp.job1.b5": "Developed HR & People Analytics dashboards: turnover, absenteeism, headcount, payroll automation and cohort analyses.",

    "skills.kicker": "03 — Skills",
    "skills.title": "Tools I work with",
    "skills.g1": "Data & BI",
    "skills.g2": "Programming",
    "skills.g4": "Tools & Methods",
    "skills.excel": "Advanced Excel",
    "skills.modeling": "Data Modeling",
    "skills.storedproc": "Stored Procedures",
    "skills.supply": "Supply Chain Analytics",
    "skills.api": "API Integration",
    "skills.certsTitle": "Education & Certifications",
    "cert.c1t": "Systems Analyst",
    "cert.c4t": "Full Stack Web Developer (Bootcamp)",
    "cert.c5t": "JavaScript Certificate",
    "cert.c6t": "English B2 (Certified)",

    "about.kicker": "04 — About",
    "about.title": "From raw data to business impact",
    "about.p1": "I'm a Data Analyst based in Chile with 4+ years of experience across the full data lifecycle: designing SQL pipelines, automating verification workflows, detecting anomalies with Python, and building KPI dashboards in Power BI and Tableau used by 70+ companies and 100+ users.",
    "about.p2": "My work has cut compliance reporting time by ~40%, raised automated document-verification accuracy above 90%, and — in an end-to-end business modernization project — helped increase sales by 10–15% while reducing supply costs by 15–20%.",
    "about.p3": "What makes me different: I own the data lifecycle end to end. I don't just read the dashboard — I design the pipeline that feeds it, automate the validation that keeps it trustworthy, and translate the result into a decision the business can act on.",
    "about.location": "Location",
    "about.langs": "Languages",
    "about.langsValue": "Spanish (native) · English (B2, certified)",
    "about.focus": "Focus",
    "about.focusValue": "Data Analytics · BI · Automation",
    "about.education": "Education",
    "about.educationValue": "Systems Analyst — IES, Córdoba (AR)",

    "contact.kicker": "05 — Contact",
    "contact.title": "Let's work together",
    "contact.text": "Looking for someone who can turn your data into decisions — and build the tools to do it? I'd love to hear from you.",
    "contact.call": "Call me",

    "footer.built": "Built with vanilla HTML, CSS & JS — no frameworks needed.",
  },

  es: {
    "nav.about": "Sobre mí",
    "nav.experience": "Experiencia",
    "nav.projects": "Proyectos",
    "nav.skills": "Habilidades",
    "nav.contact": "Contacto",

    "hero.eyebrow": "Analista de Datos · Business Intelligence",
    "hero.tagline": "Convierto datos crudos en dashboards, automatización y decisiones que mueven el negocio.",
    "hero.summary": "Analista de Datos con más de 4 años de experiencia generando impacto medible en todo el ciclo de vida del dato — SQL, Python, Power BI y Tableau. Manejo el dato de punta a punta, desde el pipeline que lo limpia y modela hasta el dashboard que impulsa la decisión.",
    "hero.seeWork": "Ver mi trabajo",
    "hero.download": "Descargar CV (ES)",
    "hero.downloadAlt": "También disponible en inglés (PDF)",
    "hero.email": "Escríbeme",
    "hero.call": "Llámame",

    "stats.years": "años de experiencia",
    "stats.reporting": "reportes de cumplimiento más rápidos",
    "stats.accuracy": "precisión en verificación automática",
    "stats.companies": "empresas usan mis dashboards",

    "proj.kicker": "01 — Proyectos",
    "proj.title": "Trabajo destacado",
    "proj.lead": "Tres casos de estudio, todos con la misma estructura: el problema, qué construí y el número que moví.",
    "proj.caseLabel": "Caso",
    "proj.lblContext": "Contexto",
    "proj.lblAction": "Qué hice",
    "proj.lblImpact": "Impacto",

    "proj.p1.title": "Modernización de Negocio de Feria",
    "proj.p1.context": "Un negocio de feria de productos artesanales operaba sin datos: precios improvisados, quiebres de stock semanales y un solo proveedor.",
    "proj.p1.action": "Diagnóstico de la operación, rediseño de la cadena de suministro y política de precios estandarizada, más un stack de BI (SQL, Power BI, Tableau) alimentado por un bot de WhatsApp que convierte notas de voz en datos de inventario y ventas.",
    "proj.p1.m1": "quiebres de stock",
    "proj.p1.m2": "costos de abastecimiento",
    "proj.p1.m3": "ventas",

    "proj.p3.title": "Automatización de Verificación de Cumplimiento",
    "proj.p3.context": "Verificar los documentos de cumplimiento (Ley 20.123) de más de 70 empresas mandantes era manual y no escalaba.",
    "proj.p3.action": "Automaticé el flujo completo en SQL (procedimientos almacenados y triggers) con validaciones de formato y reglas de negocio, más detección de anomalías en Python (Pandas, Seaborn).",
    "proj.p3.m1": "precisión de verificación",
    "proj.p3.m2": "más rápido el reporte",

    "proj.p4.title": "Dashboards de RR.HH. y People Analytics",
    "proj.p4.context": "El equipo de personas consolidaba a mano rotación, ausentismo y dotación desde el ERP y planillas de control.",
    "proj.p4.action": "Modelé los datos e integré ERP y planillas en Power BI: rotación, ausentismo, headcount y evolución de dotación, más análisis de cohortes y reporte de nómina automatizado.",
    "proj.p4.m1": "consolidación manual",
    "proj.p4.m2": "usuarios alcanzados",

    "proj.platformsLabel": "Encuentra más de mi trabajo en:",
    "proj.dashboards": "dashboards",
    "proj.ghTitle": "Lo último en GitHub",
    "proj.ghLoading": "Cargando repositorios…",
    "proj.ghError": "No se pudieron cargar los repositorios — visita github.com/Chrov.",

    "tag.automation": "Automatización",
    "tag.erp": "Integración ERP",
    "tag.cohort": "Análisis de Cohortes",

    "exp.kicker": "02 — Experiencia",
    "exp.title": "Dónde he generado impacto",
    "exp.job2.role": "Consultor Independiente — Modernización de Negocio y Datos",
    "exp.job2.period": "Abr – Jul 2026",
    "exp.job2.company": "Modernización de Negocio de Feria · Proyecto Independiente",
    "exp.job2.b1": "Lideré un proyecto integral de modernización operativa y de datos para una feria de productos artesanales, desde el diagnóstico hasta la implementación completa.",
    "exp.job2.b2": "Reduje los costos de abastecimiento en un 15–20% diversificando proveedores y construyendo una cadena de suministro de emergencia.",
    "exp.job2.b3": "Contribuí a un aumento de 10–15% en ventas mediante precios estandarizados y decisiones diarias basadas en datos.",
    "exp.job2.b4": "Construí un stack completo de BI (Excel, Power BI, Tableau, SQL) más un bot de WhatsApp con transcripción automática — reduciendo los quiebres de stock a casi cero.",
    "exp.job1.role": "Analista Programador",
    "exp.job1.period": "Dic 2021 – Ene 2026",
    "exp.job1.b1": "Diseñé y automaticé pipelines de datos en SQL (procedimientos almacenados, triggers) que redujeron significativamente el tiempo de procesamiento de reportes.",
    "exp.job1.b2": "Construí dashboards en Power BI y Tableau para más de 70 empresas mandantes y 100 usuarios, incluyendo reportes con más de 10.000 columnas.",
    "exp.job1.b3": "Automaticé flujos de verificación de documentos en SQL, elevando la precisión sobre el 90% e impulsando el escalamiento de la plataforma.",
    "exp.job1.b4": "Aceleré los reportes de cumplimiento (Ley 20.123) en ~40% con automatización SQL y detección de anomalías en Python (Pandas, Seaborn).",
    "exp.job1.b5": "Desarrollé dashboards de RR.HH. y People Analytics: rotación, ausentismo, headcount, automatización de nómina y análisis de cohortes.",

    "skills.kicker": "03 — Habilidades",
    "skills.title": "Herramientas con las que trabajo",
    "skills.g1": "Datos y BI",
    "skills.g2": "Programación",
    "skills.g4": "Herramientas y Métodos",
    "skills.excel": "Excel Avanzado",
    "skills.modeling": "Modelado de Datos",
    "skills.storedproc": "Procedimientos Almacenados",
    "skills.supply": "Analítica de Cadena de Suministro",
    "skills.api": "Integración de APIs",
    "skills.certsTitle": "Educación y Certificaciones",
    "cert.c1t": "Analista de Sistemas",
    "cert.c4t": "Full Stack Web Developer (Bootcamp)",
    "cert.c5t": "Certificado JavaScript",
    "cert.c6t": "Inglés B2 (Certificado)",

    "about.kicker": "04 — Sobre mí",
    "about.title": "De datos crudos a impacto en el negocio",
    "about.p1": "Soy Analista de Datos en Chile con más de 4 años de experiencia en todo el ciclo de vida del dato: diseño de pipelines SQL, automatización de flujos de verificación, detección de anomalías con Python y dashboards de KPIs en Power BI y Tableau usados por más de 70 empresas y 100 usuarios.",
    "about.p2": "Mi trabajo ha reducido el tiempo de reportes de cumplimiento en ~40%, elevado la precisión de verificación automática de documentos sobre el 90%, y — en un proyecto integral de modernización de negocio — ayudó a aumentar las ventas un 10–15% reduciendo costos de abastecimiento un 15–20%.",
    "about.p3": "Lo que me diferencia: manejo el ciclo de vida del dato de punta a punta. No solo leo el dashboard — diseño el pipeline que lo alimenta, automatizo la validación que lo mantiene confiable y traduzco el resultado en una decisión que el negocio puede ejecutar.",
    "about.location": "Ubicación",
    "about.langs": "Idiomas",
    "about.langsValue": "Español (nativo) · Inglés (B2, certificado)",
    "about.focus": "Enfoque",
    "about.focusValue": "Análisis de Datos · BI · Automatización",
    "about.education": "Educación",
    "about.educationValue": "Analista de Sistemas — IES, Córdoba (AR)",

    "contact.kicker": "05 — Contacto",
    "contact.title": "Trabajemos juntos",
    "contact.text": "¿Buscas a alguien que convierta tus datos en decisiones — y que construya las herramientas para lograrlo? Me encantaría saber de ti.",
    "contact.call": "Llámame",

    "footer.built": "Hecho con HTML, CSS y JS puro — sin frameworks.",
  },
};

/* ===== Language ===== */
function setLang(lang) {
  const dict = I18N[lang] || I18N.en;
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const key = el.getAttribute("data-i18n");
    if (dict[key]) el.textContent = dict[key];
  });
  document.documentElement.lang = lang;
  document.getElementById("btnEn").classList.toggle("active", lang === "en");
  document.getElementById("btnEs").classList.toggle("active", lang === "es");

  // Primary download = current language; alt link = the other one
  const primary = document.getElementById("cvDownload");
  const alt = document.getElementById("cvDownloadAlt");
  primary.href = CV_FILES[lang];
  alt.href = CV_FILES[lang === "en" ? "es" : "en"];

  localStorage.setItem("lang", lang);
}

/* ===== GitHub repos ===== */
async function loadRepos() {
  const grid = document.getElementById("ghGrid");
  try {
    const res = await fetch("https://api.github.com/users/Chrov/repos?sort=updated&per_page=6");
    if (!res.ok) throw new Error(res.status);
    const repos = (await res.json()).filter((r) => !r.fork);
    if (!repos.length) throw new Error("empty");
    grid.innerHTML = "";
    repos.slice(0, 6).forEach((r) => {
      const a = document.createElement("a");
      a.className = "repo";
      a.href = r.html_url;
      a.target = "_blank";
      a.rel = "noopener";

      const name = document.createElement("span");
      name.className = "repo__name";
      name.textContent = r.name;

      const desc = document.createElement("span");
      desc.className = "repo__desc";
      desc.textContent = r.description || "—";

      const meta = document.createElement("span");
      meta.className = "repo__meta";
      if (r.language) {
        const lang = document.createElement("span");
        lang.className = "repo__lang";
        lang.textContent = r.language;
        meta.appendChild(lang);
      }
      const stars = document.createElement("span");
      stars.textContent = `★ ${r.stargazers_count}`;
      meta.appendChild(stars);

      a.append(name, desc, meta);
      grid.appendChild(a);
    });
  } catch (e) {
    const lang = localStorage.getItem("lang") || "en";
    grid.innerHTML = "";
    const p = document.createElement("p");
    p.className = "gh__loading";
    p.textContent = I18N[lang]["proj.ghError"];
    grid.appendChild(p);
  }
}

/* ===== Theme (light default, dark via toggle; respects system preference) ===== */
function setTheme(theme) {
  if (theme === "dark") {
    document.documentElement.setAttribute("data-theme", "dark");
  } else {
    document.documentElement.removeAttribute("data-theme");
  }
  localStorage.setItem("theme", theme);
}

document.getElementById("themeToggle").addEventListener("click", () => {
  const isDark = document.documentElement.getAttribute("data-theme") === "dark";
  setTheme(isDark ? "light" : "dark");
});

setTheme(
  localStorage.getItem("theme") ||
    (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light")
);

/* ===== Mobile menu ===== */
const burger = document.getElementById("burger");
const navLinks = document.getElementById("navLinks");
burger.addEventListener("click", () => navLinks.classList.toggle("open"));
navLinks.querySelectorAll("a").forEach((a) =>
  a.addEventListener("click", () => navLinks.classList.remove("open"))
);

/* ===== Motion preference ===== */
const REDUCED_MOTION = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ===== Scroll progress bar ===== */
const progressBar = document.getElementById("progress");
function updateProgress() {
  const scrollable = document.documentElement.scrollHeight - window.innerHeight;
  const pct = scrollable > 0 ? (window.scrollY / scrollable) * 100 : 0;
  progressBar.style.width = `${Math.min(pct, 100)}%`;
}
window.addEventListener("scroll", updateProgress, { passive: true });
window.addEventListener("resize", updateProgress);
updateProgress();

/* ===== Animated stat counters ===== */
function countUp(el) {
  const target = Number(el.dataset.count);
  const suffix = el.dataset.suffix || "";
  if (!Number.isFinite(target)) return;
  if (REDUCED_MOTION) {
    el.textContent = target + suffix;
    return;
  }
  const duration = 1100;
  const start = performance.now();
  function frame(now) {
    const t = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - t, 3); // ease-out cubic
    el.textContent = Math.round(target * eased) + suffix;
    if (t < 1) requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

const counterObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) {
        countUp(e.target);
        counterObserver.unobserve(e.target);
      }
    });
  },
  { threshold: 0.5 }
);
document.querySelectorAll(".stat__num[data-count]").forEach((el) => {
  el.textContent = "0" + (el.dataset.suffix || "");
  counterObserver.observe(el);
});

/* ===== Scroll reveal ===== */
const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) {
        e.target.classList.add("visible");
        observer.unobserve(e.target);
      }
    });
  },
  { threshold: 0.12 }
);
document
  .querySelectorAll(".section .container > *, .case, .timeline__item")
  .forEach((el) => {
    el.classList.add("reveal");
    observer.observe(el);
  });

/* ===== Scrollspy — highlight the section you're reading ===== */
const spyLinks = new Map();
navLinks.querySelectorAll("a[href^='#']").forEach((a) => {
  const section = document.querySelector(a.getAttribute("href"));
  if (section) spyLinks.set(section, a);
});

const spyObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((e) => {
      const link = spyLinks.get(e.target);
      if (!link) return;
      if (e.isIntersecting) {
        spyLinks.forEach((l) => l.classList.remove("active"));
        link.classList.add("active");
      }
    });
  },
  { rootMargin: "-45% 0px -50% 0px" }
);
spyLinks.forEach((_, section) => spyObserver.observe(section));

/* ===== Init ===== */
setLang(localStorage.getItem("lang") || "en");
loadRepos();
