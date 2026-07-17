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
    "hero.summary": "Data Analyst with 4+ years of experience delivering measurable impact across the full data lifecycle — SQL, Python, Power BI and Tableau — with a Full Stack background that lets me build and deploy the tools behind the analysis, not just the analysis itself.",
    "hero.download": "Download Resume (EN)",
    "hero.downloadAlt": "Also available in Spanish (PDF)",
    "hero.email": "Email me",

    "stats.years": "years of experience",
    "stats.reporting": "faster compliance reporting",
    "stats.accuracy": "automated verification accuracy",
    "stats.companies": "companies served by my dashboards",

    "about.kicker": "01 — About",
    "about.title": "From raw data to business impact",
    "about.p1": "I'm a Data Analyst based in Chile with 4+ years of experience across the full data lifecycle: designing SQL pipelines, automating verification workflows, detecting anomalies with Python, and building KPI dashboards in Power BI and Tableau used by 70+ companies and 100+ users.",
    "about.p2": "My work has cut compliance reporting time by ~40%, raised automated document-verification accuracy above 90%, and — in an end-to-end business modernization project — helped increase sales by 10–15% while reducing supply costs by 15–20%.",
    "about.p3": "What makes me different: a Full Stack background (React, Node.js, FastAPI, Firebase) that lets me build and deploy the tools behind the analysis — from web platforms to a WhatsApp voice-note bot that turns audio into inventory data.",
    "about.location": "Location",
    "about.langs": "Languages",
    "about.langsValue": "Spanish (native) · English (B2, certified)",
    "about.focus": "Focus",
    "about.focusValue": "Data Analytics · BI · Automation",
    "about.education": "Education",
    "about.educationValue": "Systems Analyst — IES, Córdoba (AR)",

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

    "proj.kicker": "03 — Projects",
    "proj.title": "Featured work",
    "proj.p1.title": "Feria Business Modernization",
    "proj.p1.desc": "End-to-end modernization of a street-market business: supply chain redesign, standardized pricing, and a full BI stack with a WhatsApp voice-to-data bot for daily inventory and sales tracking.",
    "proj.p1.result": "▲ 10–15% sales · ▼ 15–20% supply costs · ~0 stockouts",
    "proj.p2.desc": "Data management & consulting web platform for automated report visualization, with AI integration (OpenAI Assistants) to enhance large-scale data analysis.",
    "proj.p3.title": "Compliance Verification Automation",
    "proj.p3.desc": "Automated SQL verification workflows for contractor compliance documents on the SubContrataLey platform — standardized formats and validation checks at scale.",
    "proj.p3.result": "90%+ automated verification accuracy · ~40% faster reporting",
    "proj.p4.title": "HR & People Analytics Dashboards",
    "proj.p4.desc": "Power BI dashboards tracking turnover, absenteeism, headcount and staffing evolution, plus automated payroll reporting integrating ERP and control-sheet data.",
    "proj.p4.result": "Manual consolidation time cut for the whole People team",
    "proj.visit": "Visit site →",
    "proj.platformsLabel": "Find more of my work on:",
    "proj.dashboards": "dashboards",
    "proj.ghTitle": "Latest on GitHub",
    "proj.ghLoading": "Loading repositories…",
    "proj.ghError": "Couldn't load repositories right now — visit github.com/Chrov instead.",

    "skills.kicker": "04 — Skills",
    "skills.title": "Tools I work with",
    "skills.g1": "Data & BI",
    "skills.g2": "Programming",
    "skills.g3": "Web & Cloud",
    "skills.g4": "Tools & Methods",
    "skills.excel": "Advanced Excel",
    "skills.modeling": "Data Modeling",
    "skills.storedproc": "Stored Procedures",
    "skills.api": "API Integration",
    "skills.certsTitle": "Education & Certifications",
    "cert.c1t": "Systems Analyst",
    "cert.c4t": "Full Stack Web Developer (Bootcamp)",
    "cert.c5t": "JavaScript Certificate",
    "cert.c6t": "English B2 (Certified)",

    "contact.kicker": "05 — Contact",
    "contact.title": "Let's work together",
    "contact.text": "Looking for someone who can turn your data into decisions — and build the tools to do it? I'd love to hear from you.",

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
    "hero.summary": "Analista de Datos con más de 4 años de experiencia generando impacto medible en todo el ciclo de vida del dato — SQL, Python, Power BI y Tableau — con base Full Stack que me permite construir y desplegar las herramientas detrás del análisis, no solo el análisis en sí.",
    "hero.download": "Descargar CV (ES)",
    "hero.downloadAlt": "También disponible en inglés (PDF)",
    "hero.email": "Escríbeme",

    "stats.years": "años de experiencia",
    "stats.reporting": "reportes de cumplimiento más rápidos",
    "stats.accuracy": "precisión en verificación automática",
    "stats.companies": "empresas usan mis dashboards",

    "about.kicker": "01 — Sobre mí",
    "about.title": "De datos crudos a impacto en el negocio",
    "about.p1": "Soy Analista de Datos en Chile con más de 4 años de experiencia en todo el ciclo de vida del dato: diseño de pipelines SQL, automatización de flujos de verificación, detección de anomalías con Python y dashboards de KPIs en Power BI y Tableau usados por más de 70 empresas y 100 usuarios.",
    "about.p2": "Mi trabajo ha reducido el tiempo de reportes de cumplimiento en ~40%, elevado la precisión de verificación automática de documentos sobre el 90%, y — en un proyecto integral de modernización de negocio — ayudó a aumentar las ventas un 10–15% reduciendo costos de abastecimiento un 15–20%.",
    "about.p3": "Lo que me diferencia: una base Full Stack (React, Node.js, FastAPI, Firebase) que me permite construir y desplegar las herramientas detrás del análisis — desde plataformas web hasta un bot de WhatsApp que convierte notas de voz en datos de inventario.",
    "about.location": "Ubicación",
    "about.langs": "Idiomas",
    "about.langsValue": "Español (nativo) · Inglés (B2, certificado)",
    "about.focus": "Enfoque",
    "about.focusValue": "Análisis de Datos · BI · Automatización",
    "about.education": "Educación",
    "about.educationValue": "Analista de Sistemas — IES, Córdoba (AR)",

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

    "proj.kicker": "03 — Proyectos",
    "proj.title": "Trabajo destacado",
    "proj.p1.title": "Modernización de Negocio de Feria",
    "proj.p1.desc": "Modernización integral de un negocio de feria: rediseño de cadena de suministro, precios estandarizados y un stack completo de BI con un bot de WhatsApp de voz a datos para inventario y ventas diarias.",
    "proj.p1.result": "▲ 10–15% ventas · ▼ 15–20% costos · ~0 quiebres de stock",
    "proj.p2.desc": "Plataforma web de gestión de datos y consultoría para visualización automatizada de reportes, con integración de IA (OpenAI Assistants) para potenciar el análisis masivo de datos.",
    "proj.p3.title": "Automatización de Verificación de Cumplimiento",
    "proj.p3.desc": "Flujos automatizados de verificación en SQL para documentos de cumplimiento de contratistas en la plataforma SubContrataLey — formatos estandarizados y validaciones a escala.",
    "proj.p3.result": "90%+ precisión de verificación automática · ~40% reportes más rápidos",
    "proj.p4.title": "Dashboards de RR.HH. y People Analytics",
    "proj.p4.desc": "Dashboards en Power BI de rotación, ausentismo, headcount y evolución de dotación, más reportes de nómina automatizados integrando ERP y planillas de control.",
    "proj.p4.result": "Menos tiempo de consolidación manual para todo el equipo de personas",
    "proj.visit": "Visitar sitio →",
    "proj.platformsLabel": "Encuentra más de mi trabajo en:",
    "proj.dashboards": "dashboards",
    "proj.ghTitle": "Lo último en GitHub",
    "proj.ghLoading": "Cargando repositorios…",
    "proj.ghError": "No se pudieron cargar los repositorios — visita github.com/Chrov.",

    "skills.kicker": "04 — Habilidades",
    "skills.title": "Herramientas con las que trabajo",
    "skills.g1": "Datos y BI",
    "skills.g2": "Programación",
    "skills.g3": "Web y Cloud",
    "skills.g4": "Herramientas y Métodos",
    "skills.excel": "Excel Avanzado",
    "skills.modeling": "Modelado de Datos",
    "skills.storedproc": "Procedimientos Almacenados",
    "skills.api": "Integración de APIs",
    "skills.certsTitle": "Educación y Certificaciones",
    "cert.c1t": "Analista de Sistemas",
    "cert.c4t": "Full Stack Web Developer (Bootcamp)",
    "cert.c5t": "Certificado JavaScript",
    "cert.c6t": "Inglés B2 (Certificado)",

    "contact.kicker": "05 — Contacto",
    "contact.title": "Trabajemos juntos",
    "contact.text": "¿Buscas a alguien que convierta tus datos en decisiones — y que construya las herramientas para lograrlo? Me encantaría saber de ti.",

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

/* ===== Mobile menu ===== */
const burger = document.getElementById("burger");
const navLinks = document.getElementById("navLinks");
burger.addEventListener("click", () => navLinks.classList.toggle("open"));
navLinks.querySelectorAll("a").forEach((a) =>
  a.addEventListener("click", () => navLinks.classList.remove("open"))
);

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
  .querySelectorAll(".section .container > *, .card, .timeline__item")
  .forEach((el) => {
    el.classList.add("reveal");
    observer.observe(el);
  });

/* ===== Init ===== */
setLang(localStorage.getItem("lang") || "en");
loadRepos();
