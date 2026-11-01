import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

const DATA = {
  es: {
    filename: path.join(ROOT, 'assets', 'Camilo_Vergara_CV_ES.pdf'),
    name: 'CAMILO VERGARA SALAS',
    headline: 'Analista de Datos | Business Intelligence & Ingeniería en Ciencia de Datos (c)',
    contact1: 'Santiago, Chile · camilovergarasalas.cvs@gmail.com · +56 9 9751 3084',
    contact2: 'linkedin.com/in/camilo-evs · chrov.github.io/Portfolio · github.com/Chrov · Modalidad Híbrida / Remota / Presencial',
    sections: {
      summary: 'PERFIL PROFESIONAL',
      experience: 'EXPERIENCIA PROFESIONAL',
      education: 'EDUCACIÓN SUPERIOR Y CERTIFICACIONES',
      projects: 'PROYECTOS DE ANALÍTICA APLICADA Y CIENCIA DE DATOS',
      skills: 'COMPETENCIAS TÉCNICAS Y DOMINIOS DE NEGOCIO'
    },
    summaryText:
      'Analista de Datos y especialista en Business Intelligence con más de 4 años de experiencia transformando datos complejos en decisiones operativas, clínicas y comerciales. Trayectoria comprobada en plataformas SaaS B2B (Top Partners S.A. · +70 empresas cliente) y operaciones de salud (Airmed), combinando SQL avanzado (PostgreSQL, BigQuery), modelado dimensional (Star Schema, dbt), automatización en Python y reportería ejecutiva en Power BI (DAX) y Tableau. Próximo a titularse como Analista de Datos (2027) y cursando Ingeniería en Ciencia de Datos (2028), con sello distintivo en validación temporal rigurosa, gobernanza de datos y criterio ejecutivo orientado a impacto medible.',
    jobs: [
      {
        role: 'Analista de Datos & Business Intelligence',
        company: 'Airmed (Salud Digital y Operaciones Clínicas)',
        period: 'Analítica de Salud y Operaciones',
        bullets: [
          'Modelé y automaticé indicadores clave (KPIs) de operación clínica, agendamiento, niveles de servicio (SLA) y trazabilidad de prestaciones mediante consultas SQL avanzadas (CTEs, window functions) y flujos estructurados de extracción.',
          'Desarrollé dashboards ejecutivos y operativos en Power BI (DAX, Power Query) y Excel avanzado para monitorear utilización de capacidad, tiempos de atención, retención de pacientes y control de ingresos.',
          'Implementé controles de calidad e integridad de datos (Data Quality) y análisis exploratorio en Python (Pandas) para identificar cuellos de botella operativos y estandarizar registros entre áreas clínicas y administrativas.'
        ]
      },
      {
        role: 'Analista de Datos / Analista Programador',
        company: 'Top Partners S.A. · SubContrataLey (SaaS B2B)',
        period: 'Dic 2021 – Ene 2026',
        bullets: [
          'Aceleré en un 40% la entrega de reportes de cumplimiento laboral (Ley 20.123) diseñando y automatizando pipelines ETL en SQL (procedimientos almacenados, triggers, CTEs y window functions) sobre PostgreSQL.',
          'Construí y mantuve dashboards interactivos en Power BI y Tableau sobre un modelo dimensional (Star Schema) con medidas DAX, utilizados a diario por más de 70 empresas mandantes y +100 usuarios activos.',
          'Elevé sobre el 90% la precisión de la verificación automática de documentos implementando reglas de gobernanza de datos y rutinas de detección de anomalías en Python (Pandas, Seaborn) sobre el flujo documental diario.',
          'Lideré la línea de People Analytics (RR.HH.): modelé cohortes de permanencia, rotación, ausentismo, headcount y métricas de selección, reduciendo la consolidación manual de nómina y ERP mediante Power Query.'
        ]
      },
      {
        role: 'Consultor de Business Intelligence y Operaciones',
        company: 'Modernización Comercial · Retail de Productos Artesanales',
        period: 'Abr 2026 – Jul 2026',
        bullets: [
          'Lideré la modernización operativa y analítica de punta a punta en 4 meses, definiendo desde cero KPIs de margen diario, rotación de inventario, merma valorizada y abastecimiento.',
          'Reduje los quiebres de stock a casi cero e impulsé las ventas entre 10% y 15% implementando control diario en SQL, Excel avanzado, Power BI, Tableau y un flujo automatizado de captura por WhatsApp (voz a datos).',
          'Disminuí los costos de abastecimiento entre 15% y 20% eliminando la dependencia de proveedor único y estandarizando formatos de pesaje, envases y política de precios en todo el catálogo.'
        ]
      }
    ],
    education: [
      {
        degree: 'Ingeniería en Ciencia de Datos',
        school: 'Instituto Profesional AIEP, Chile',
        date: 'En curso · Titulación 2028'
      },
      {
        degree: 'Técnico de Nivel Superior en Análisis de Datos (Analista de Datos)',
        school: 'Instituto Profesional AIEP, Chile',
        date: 'En curso · Titulación 2027'
      },
      {
        degree: 'Analista de Sistemas (3 años cursados)',
        school: 'Colegio Universitario IES, Córdoba, Argentina',
        date: '2021 – 2023'
      },
      {
        degree: 'Certificaciones Profesionales',
        school: 'Google Data Analytics Professional Certificate (2026) · Google AI Fundamentals (2026) · Supply Chain Management & Analytics (Coursera) · Full Stack Web Developer Bootcamp (Soy Henry, 2021)',
        date: ''
      }
    ],
    projects: [
      {
        title: 'Pronóstico de Demanda y Piloto de Reposición (SQL/dbt · BigQuery · LightGBM · Tableau)',
        bullets: [
          'Construí un pipeline end-to-end en esquema estrella con 21 tests de calidad en dbt sobre 213.480 registros calendario (360 series tienda-SKU), evaluando LightGBM recursivo con validación walk-forward sin fuga temporal (WMAPE 30,28% en bebidas vs. 44,89% baseline estacional).'
        ]
      },
      {
        title: 'Control de Merma en Retail, Confiabilidad Aérea BTS y Auditoría de Modelos (SQL · Python · Power BI)',
        bullets: [
          'Desarrollé 5 casos reproducibles adicionales con datos oficiales (577.262 vuelos BTS EE.UU.; 49 años de series COCHILCO; 41.188 registros bancarios UCI) y simulaciones auditables, incluyendo diccionarios de datos, pruebas de deriva temporal (data drift) y reportes ejecutivos bilingües.'
        ]
      }
    ],
    skills: [
      ['SQL & Bases de Datos:', 'SQL Avanzado (CTEs, Window Functions, Stored Procedures, Triggers), PostgreSQL, Google BigQuery, dbt, Star Schema, ETL/ELT.'],
      ['Business Intelligence:', 'Power BI (DAX, Power Query, PBIP), Tableau Public/Desktop, Excel Avanzado (Tablas Dinámicas, Power Query, Modelado Operativo).'],
      ['Python & Data Science:', 'Python (Pandas, NumPy, scikit-learn, LightGBM, Prophet, SARIMAX, Matplotlib, Seaborn), Validación Temporal Walk-Forward, Auditoría de Drift.'],
      ['Dominios & Gobernanza:', 'Operaciones Clínicas y Salud (Airmed), Cumplimiento B2B (Ley 20.123), People Analytics (RR.HH.), Supply Chain & Inventarios (ABC, Safety Stock).'],
      ['Idiomas & Herramientas:', 'Español (Nativo) · Inglés (B2 Profesional Funcional) · Git/GitHub, Docker, DBeaver, Scrum, Automatización de Reportes.']
    ]
  },
  en: {
    filename: path.join(ROOT, 'assets', 'Camilo_Vergara_Resume_EN.pdf'),
    name: 'CAMILO VERGARA SALAS',
    headline: 'Data Analyst | Business Intelligence & Data Science Engineering (c)',
    contact1: 'Santiago, Chile · camilovergarasalas.cvs@gmail.com · +56 9 9751 3084',
    contact2: 'linkedin.com/in/camilo-evs · chrov.github.io/Portfolio · github.com/Chrov · Open to Remote / Hybrid / Relocation',
    sections: {
      summary: 'EXECUTIVE SUMMARY',
      experience: 'PROFESSIONAL EXPERIENCE',
      education: 'EDUCATION & PROFESSIONAL CERTIFICATIONS',
      projects: 'APPLIED ANALYTICS & DATA SCIENCE PROJECTS',
      skills: 'TECHNICAL SKILLS & BUSINESS DOMAINS'
    },
    summaryText:
      'Data Analyst and Business Intelligence specialist with 4+ years of experience turning complex operational, clinical, and commercial datasets into measurable decisions. Proven track record across B2B SaaS compliance (Top Partners S.A. · 70+ enterprise clients) and healthcare operations (Airmed), combining advanced SQL (PostgreSQL, BigQuery), dimensional modeling (Star Schema, dbt), Python automation, and executive dashboards in Power BI (DAX) and Tableau. Completing a Data Analyst degree in 2027 and a B.Eng. in Data Science Engineering in 2028, distinguished by leakage-free temporal validation, data governance rigor, and decision-first analytical judgment.',
    jobs: [
      {
        role: 'Data Analyst & Business Intelligence Specialist',
        company: 'Airmed (Digital Health & Clinical Operations)',
        period: 'Healthcare & Operations Analytics',
        bullets: [
          'Modeled and automated clinical operations, scheduling utilization, service-level (SLA) compliance, and patient journey KPIs using advanced SQL queries (CTEs, window functions) and structured ETL workflows.',
          'Built executive and operational dashboards in Power BI (DAX, Power Query) and advanced Excel to track capacity utilization, service turnaround times, patient retention, and revenue performance.',
          'Implemented data quality controls and exploratory data analysis (EDA) routines in Python (Pandas) to surface operational bottlenecks and standardize data capture across clinical and administrative teams.'
        ]
      },
      {
        role: 'Data Analyst / Analyst Programmer',
        company: 'Top Partners S.A. · SubContrataLey (B2B SaaS)',
        period: 'Dec 2021 – Jan 2026',
        bullets: [
          'Accelerated labor compliance report delivery (Law 20.123) by 40% by designing and automating PostgreSQL ETL pipelines using stored procedures, triggers, CTEs, and window functions.',
          'Architected interactive Power BI and Tableau dashboards on a star-schema dimensional model with custom DAX measures, used daily by 70+ enterprise clients and 100+ active users.',
          'Raised automated document verification accuracy above 90% by enforcing data governance rules and deploying Python anomaly-detection routines (Pandas, Seaborn) across daily document ingestion.',
          'Spearheaded People Analytics (HR): modeled employee tenure cohorts, attrition, absenteeism, headcount, and recruitment funnel metrics while automating ERP payroll consolidation with Power Query.'
        ]
      },
      {
        role: 'Business Intelligence & Operations Consultant',
        company: 'Retail & Artisanal Market Modernization',
        period: 'Apr 2026 – Jul 2026',
        bullets: [
          'Delivered a 4-month end-to-end operational and analytics modernization, defining inventory turnover, daily gross margin, waste-at-cost, and procurement KPIs from scratch.',
          'Reduced stockouts to near zero and drove a 10–15% sales increase by deploying daily tracking across SQL, advanced Excel, Power BI, Tableau, and an automated WhatsApp voice-to-data bot.',
          'Lowered procurement costs by 15–20% by eliminating single-supplier dependency, establishing emergency supply routes, and standardizing catalog pricing and packaging.'
        ]
      }
    ],
    education: [
      {
        degree: 'B.Eng. in Data Science Engineering (Ingeniería en Ciencia de Datos)',
        school: 'AIEP, Chile',
        date: 'Enrolled · Graduation 2028'
      },
      {
        degree: 'Associate Degree in Data Analysis (Analista de Datos)',
        school: 'AIEP, Chile',
        date: 'Enrolled · Graduation 2027'
      },
      {
        degree: 'Systems Analysis Studies (3 Years Completed)',
        school: 'Colegio Universitario IES, Córdoba, Argentina',
        date: '2021 – 2023'
      },
      {
        degree: 'Professional Certifications',
        school: 'Google Data Analytics Professional Certificate (2026) · Google AI Fundamentals (2026) · Supply Chain Management & Analytics (Coursera) · Full Stack Web Developer Bootcamp (Soy Henry, 2021)',
        date: ''
      }
    ],
    projects: [
      {
        title: 'Demand Forecasting & Replenishment Pilot (SQL/dbt · BigQuery · LightGBM · Tableau)',
        bullets: [
          'Engineered a star-schema pipeline with 21 passing dbt data-quality tests across 213,480 calendar rows (360 store-SKU series); benchmarked recursive LightGBM via walk-forward temporal validation (30.28% beverage WMAPE vs. 44.89% seasonal-naive baseline).'
        ]
      },
      {
        title: 'Retail Cohort Waste, BTS Airline Reliability & ML Drift Auditing (SQL · Python · Power BI)',
        bullets: [
          'Published 5 additional reproducible studies across official public datasets (577,262 US BTS flights; 49-year COCHILCO copper series; 41,188 UCI bank records) and audited simulations with full data dictionaries, drift diagnostics, and native BI workbooks.'
        ]
      }
    ],
    skills: [
      ['SQL & Data Engineering:', 'Advanced SQL (CTEs, Window Functions, Stored Procedures, Triggers), PostgreSQL, Google BigQuery, dbt, Star Schema Modeling, ETL/ELT.'],
      ['Business Intelligence:', 'Power BI (DAX, Power Query, PBIP), Tableau Public/Desktop, Advanced Excel (Native PivotTables, Power Query, Operational & Cohort Modeling).'],
      ['Python & Data Science:', 'Python (Pandas, NumPy, scikit-learn, LightGBM, Prophet, SARIMAX, Matplotlib, Seaborn), Walk-Forward Temporal Validation, Model Drift Auditing.'],
      ['Analytics Domains:', 'Healthcare & Clinical Operations (Airmed), B2B Regulatory Compliance (Law 20.123), People Analytics (HR), Supply Chain & Inventory (ABC, Safety Stock).'],
      ['Languages & Workflow:', 'Spanish (Native) · English (B2 Functional Professional Proficiency) · Git/GitHub, Docker, DBeaver, Scrum, Process Automation.']
    ]
  }
};

function buildResume(cfg) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      margins: { top: 28, bottom: 24, left: 36, right: 36 },
      info: {
        Title: `${cfg.name} - ${cfg.headline}`,
        Author: 'Camilo Vergara Salas',
        Subject: 'ATS-Optimized Data Analyst & Business Intelligence Resume',
        Keywords: 'Data Analyst, Business Intelligence, SQL, Python, Power BI, Tableau, dbt, BigQuery, Data Science, Airmed, Top Partners'
      }
    });

    const stream = fs.createWriteStream(cfg.filename);
    doc.pipe(stream);

    const leftX = doc.page.margins.left;
    const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
    const rightColWidth = 140;
    const leftColWidth = pageWidth - rightColWidth - 8;

    const primaryColor = '#1B365D';
    const accentColor = '#2E4F3E';
    const textColor = '#1E1E1E';
    const mutedColor = '#4A4A4A';
    const lineColor = '#D0D5DD';

    // Header
    doc
      .font('Helvetica-Bold')
      .fontSize(17.5)
      .fillColor(primaryColor)
      .text(cfg.name, leftX, doc.y, { width: pageWidth, align: 'center', characterSpacing: 0.7 });

    doc.moveDown(0.12);
    doc
      .font('Helvetica-Bold')
      .fontSize(9.8)
      .fillColor(accentColor)
      .text(cfg.headline, leftX, doc.y, { width: pageWidth, align: 'center' });

    doc.moveDown(0.18);
    doc
      .font('Helvetica')
      .fontSize(8.3)
      .fillColor(mutedColor)
      .text(cfg.contact1, leftX, doc.y, { width: pageWidth, align: 'center' });

    doc
      .font('Helvetica')
      .fontSize(8.1)
      .fillColor(mutedColor)
      .text(cfg.contact2, leftX, doc.y, { width: pageWidth, align: 'center' });

    doc.moveDown(0.4);

    function drawSectionHeader(title) {
      doc
        .font('Helvetica-Bold')
        .fontSize(9.0)
        .fillColor(primaryColor)
        .text(title, leftX, doc.y, { width: pageWidth, characterSpacing: 0.5 });
      const y = doc.y + 1.5;
      doc
        .moveTo(leftX, y)
        .lineTo(leftX + pageWidth, y)
        .lineWidth(0.75)
        .strokeColor(lineColor)
        .stroke();
      doc.y = y + 4.5;
    }

    function drawTwoColRow(leftBold, leftRegular, rightText, isAccentRight = false) {
      const startY = doc.y;
      doc
        .font('Helvetica-Bold')
        .fontSize(8.7)
        .fillColor(textColor)
        .text(leftBold, leftX, startY, { width: leftColWidth, continued: Boolean(leftRegular) });
      if (leftRegular) {
        doc
          .font('Helvetica-Bold')
          .fillColor(accentColor)
          .text(leftRegular, { width: leftColWidth, continued: false });
      }
      const leftEndY = doc.y;

      let rightEndY = startY;
      if (rightText) {
        doc
          .font(isAccentRight ? 'Helvetica-Bold' : 'Helvetica-Oblique')
          .fontSize(8.1)
          .fillColor(isAccentRight ? accentColor : mutedColor)
          .text(rightText, leftX + leftColWidth + 8, startY, {
            width: rightColWidth,
            align: 'right'
          });
        rightEndY = doc.y;
      }
      doc.y = Math.max(leftEndY, rightEndY) + 1.5;
    }

    // 1. Summary
    drawSectionHeader(cfg.sections.summary);
    doc
      .font('Helvetica')
      .fontSize(8.45)
      .fillColor(textColor)
      .text(cfg.summaryText, leftX, doc.y, {
        width: pageWidth,
        align: 'justify',
        lineGap: 1.3
      });
    doc.moveDown(0.45);

    // 2. Experience
    drawSectionHeader(cfg.sections.experience);
    cfg.jobs.forEach((job, idx) => {
      drawTwoColRow(`${job.role} · `, job.company, job.period, false);
      job.bullets.forEach((b) => {
        const bY = doc.y;
        doc
          .font('Helvetica-Bold')
          .fontSize(8.3)
          .fillColor(accentColor)
          .text('•', leftX + 2, bY);
        doc
          .font('Helvetica')
          .fontSize(8.35)
          .fillColor(textColor)
          .text(b, leftX + 11, bY, {
            width: pageWidth - 11,
            lineGap: 1.1
          });
        doc.moveDown(0.1);
      });
      if (idx < cfg.jobs.length - 1) doc.moveDown(0.25);
    });
    doc.moveDown(0.35);

    // 3. Education
    drawSectionHeader(cfg.sections.education);
    cfg.education.forEach((ed) => {
      if (!ed.date) {
        doc
          .font('Helvetica-Bold')
          .fontSize(8.35)
          .fillColor(textColor)
          .text(`${ed.degree}: `, leftX, doc.y, { width: pageWidth, continued: true })
          .font('Helvetica')
          .fillColor(mutedColor)
          .text(ed.school, { width: pageWidth, lineGap: 1.1 });
        doc.moveDown(0.12);
      } else {
        const startY = doc.y;
        doc
          .font('Helvetica-Bold')
          .fontSize(8.5)
          .fillColor(textColor)
          .text(ed.degree, leftX, startY, { width: leftColWidth, continued: true })
          .font('Helvetica')
          .fillColor(mutedColor)
          .text(` — ${ed.school}`, { width: leftColWidth, continued: false });
        const leftEndY = doc.y;

        doc
          .font('Helvetica-Bold')
          .fontSize(8.0)
          .fillColor(accentColor)
          .text(ed.date, leftX + leftColWidth + 8, startY, {
            width: rightColWidth,
            align: 'right'
          });
        const rightEndY = doc.y;
        doc.y = Math.max(leftEndY, rightEndY) + 1.5;
      }
    });
    doc.moveDown(0.28);

    // 4. Projects
    drawSectionHeader(cfg.sections.projects);
    cfg.projects.forEach((proj) => {
      doc
        .font('Helvetica-Bold')
        .fontSize(8.5)
        .fillColor(textColor)
        .text(proj.title, leftX, doc.y, { width: pageWidth });
      doc.moveDown(0.08);
      proj.bullets.forEach((b) => {
        const bY = doc.y;
        doc
          .font('Helvetica-Bold')
          .fontSize(8.3)
          .fillColor(accentColor)
          .text('•', leftX + 2, bY);
        doc
          .font('Helvetica')
          .fontSize(8.3)
          .fillColor(textColor)
          .text(b, leftX + 11, bY, {
            width: pageWidth - 11,
            lineGap: 1.05
          });
      });
      doc.moveDown(0.18);
    });
    doc.moveDown(0.2);

    // 5. Technical Skills
    drawSectionHeader(cfg.sections.skills);
    cfg.skills.forEach(([label, items]) => {
      doc
        .font('Helvetica-Bold')
        .fontSize(8.3)
        .fillColor(textColor)
        .text(`${label} `, leftX, doc.y, { width: pageWidth, continued: true })
        .font('Helvetica')
        .fillColor(textColor)
        .text(items, { width: pageWidth, lineGap: 1.05 });
      doc.moveDown(0.1);
    });

    doc.end();
    stream.on('finish', resolve);
    stream.on('error', reject);
  });
}

await buildResume(DATA.es);
await buildResume(DATA.en);
console.log('Generated both ATS-optimized PDF resumes cleanly.');
