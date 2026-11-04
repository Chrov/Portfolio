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
    contactParts: [
      { text: 'Santiago, Chile (Híbrido / Remoto / Reubicación) | +56 9 9751 3084 | camilovergarasalas.cvs@gmail.com | ' },
      { text: 'LinkedIn', link: 'https://www.linkedin.com/in/camilo-evs' },
      { text: ' | ' },
      { text: 'Portafolio Web', link: 'https://chrov.github.io/Portfolio/' },
      { text: ' | ' },
      { text: 'GitHub', link: 'https://github.com/Chrov' }
    ],
    sections: {
      education: 'EDUCACIÓN',
      skills: 'HABILIDADES TÉCNICAS',
      experience: 'EXPERIENCIA PROFESIONAL',
      projects: 'PROYECTOS E INGENIERÍA DE PRODUCTOS'
    },
    education: [
      {
        schoolBold: 'Instituto Profesional IPG',
        location: ', Santiago, Chile',
        date: 'Mar 2026 - Dic 2028',
        degreeItalic: 'Ingeniería en Ciencia de Datos (Data Science Engineering · En curso)'
      },
      {
        schoolBold: 'Instituto Profesional IPLACEX',
        location: ', Santiago, Chile',
        date: 'Mar 2026 - Dic 2027',
        degreeItalic: 'Técnico de Nivel Superior en Análisis de Datos (Analista de Datos · En curso)'
      },
      {
        schoolBold: 'Colegio Universitario IES',
        location: ', Córdoba, Argentina',
        date: 'Mar 2021 - Dic 2023',
        degreeItalic: 'Analista de Sistemas (3 años cursados en Ingeniería de Software y Bases de Datos)'
      }
    ],
    coursesLabel: 'Cursos Relevantes y Certificaciones: ',
    coursesText:
      'Machine Learning, Modelado Estadístico, Pronóstico de Series de Tiempo, Bases de Datos Relacionales y Dimensionales (SQL), Estructuras de Datos y Algoritmos, Gobernanza de Datos, Google Data Analytics Professional Certificate (2026), Google AI Fundamentals (2026), Supply Chain Management & Analytics (Coursera).',
    skills: [
      [
        'Programación y Desarrollo:',
        'Python (Pandas, NumPy, Scikit-learn, LightGBM, Prophet, SARIMAX, Matplotlib, Seaborn), SQL (PostgreSQL, MySQL, BigQuery), JavaScript, PHP, HTML/CSS, Git'
      ],
      [
        'Algoritmos y Modelos:',
        'Pronóstico de Series de Tiempo, Gradient Boosting (LightGBM), Regresión Logística y Lineal, Clasificación, Detección de Anomalías, Análisis de Cohortes, Validación Temporal Walk-Forward'
      ],
      [
        'Técnicas e Ingeniería de Datos:',
        'Pipelines ETL/ELT, Modelado Dimensional (Star Schema), Procedimientos Almacenados y Triggers, Ingeniería de Variables, Calibración y Auditoría de Deriva Temporal (AUC/Brier), Intervalos de Wilson'
      ],
      [
        'Herramientas y Plataformas:',
        'Power BI (DAX, Power Query, PBIP), Tableau Desktop/Public, dbt (21 tests de calidad), Excel Avanzado (Tablas Dinámicas, Power Query), Docker, DBeaver, Automatización Operativa'
      ]
    ],
    jobs: [
      {
        titleLine: 'Consultor de Datos, BI y Desarrollo, Práctica Independiente (Freelance), Santiago, Chile',
        date: 'Ene 2026 - Presente',
        bullets: [
          'Lideré la modernización operativa y analítica end-to-end de un comercio minorista artesanal, diseñando desde cero el modelo de datos de inventario, margen bruto diario, rotación por SKU y control de merma valorizada al costo.',
          'Reduje los quiebres de stock a casi cero, impulsé las ventas entre 10% y 15% y disminuí costos de abastecimiento entre 15% y 20% integrando SQL, Excel avanzado, tableros en Power BI/Tableau y captura automatizada por WhatsApp (voz a datos).',
          'Desarrollé soluciones independientes de ingeniería analítica y pronóstico: pipelines dimensionales en dbt, modelos recursivos LightGBM y líneas base operativas validadas mediante esquemas walk-forward sin fuga temporal.'
        ]
      },
      {
        titleLine: 'Analista de Datos / Analista Programador, Top Partners S.A. (SubContrataLey B2B), Santiago, Chile',
        date: 'Dic 2021 - Ene 2026',
        bullets: [
          'Aceleré en un 40% la entrega de reportes regulatorios (Ley 20.123) diseñando, optimizando y automatizando pipelines ETL en SQL (procedimientos almacenados, triggers, CTEs y window functions) sobre PostgreSQL y MySQL.',
          'Construí y mantuve dashboards interactivos en Power BI y Tableau sobre modelos dimensionales en esquema estrella con medidas DAX personalizadas, utilizados diariamente por más de 70 empresas cliente y +100 usuarios activos.',
          'Elevé sobre el 90% la precisión en validación documental automática implementando reglas de calidad de datos y rutinas de detección de anomalías en Python (Pandas, Seaborn), además de liderar la suite de People Analytics (RR.HH.).'
        ]
      }
    ],
    projects: [
      {
        titleLine: 'Airmed & DatBase: Gestión Clínica y Arquitectura Relacional, (Ingeniería de Productos)',
        date: '2024 - 2026',
        bullets: [
          'Airmed (Salud Digital): diseñé módulos de trazabilidad de prestaciones, utilización de agenda, control de SLA y tableros ejecutivos en SQL, Python y Power BI (DAX) para estandarizar registros clínicos y administrativos.',
          'DatBase (Plataforma de Datos y Automatización): desarrollé arquitectura relacional en SQL/MySQL/PostgreSQL, procedimientos almacenados, validación de integridad y automatización de reportes operativos con PHP, JavaScript y Python.'
        ]
      },
      {
        titleLine: 'Pronóstico de Demanda y Piloto de Reposición en Retail, (dbt + BigQuery + LightGBM + Tableau)',
        date: '2025 - 2026',
        bullets: [
          'Construí un pipeline end-to-end en esquema estrella con 21 pruebas de calidad en dbt sobre 213.480 registros calendario (360 series tienda-SKU), eliminando transacciones negativas y completando secuencias temporales con ceros explícitos.',
          'Evalué LightGBM recursivo en 4 orígenes walk-forward sin fuga de precios ni promociones futuras, logrando un WMAPE de 30,28% en bebidas frente a 44,89% del baseline estacional y diseñando reglas de piloto en sombra para demanda intermitente.'
        ]
      },
      {
        titleLine: 'Auditoría Cronológica de Modelos Bancarios y Datos Oficiales, (SQL + Python + Power BI)',
        date: '2025 - 2026',
        bullets: [
          'Audité 41.188 registros bancarios (UCI) bajo partición cronológica estricta 60/20/20 sin fuga de duración de llamada; demostré caída de ROC-AUC a 0,458 por deriva macroeconómica (conversión base 4,8% a 30,8%) evitando un despliegue defectuoso.',
          'Desarrollé estudios reproducibles de control de merma por cohortes en CLP (3.825 lotes; CLP 2,98M en aceitunas), puntualidad aérea BTS EE.UU. (577.262 vuelos con intervalos de Wilson) y conciliación histórica COCHILCO (49 años, r = 0,923).'
        ]
      }
    ]
  },
  en: {
    filename: path.join(ROOT, 'assets', 'Camilo_Vergara_Resume_EN.pdf'),
    name: 'CAMILO VERGARA SALAS',
    contactParts: [
      { text: 'Santiago, Chile (Open to Remote / Relocation) | +56 9 9751 3084 | camilovergarasalas.cvs@gmail.com | ' },
      { text: 'LinkedIn', link: 'https://www.linkedin.com/in/camilo-evs' },
      { text: ' | ' },
      { text: 'Personal Website', link: 'https://chrov.github.io/Portfolio/' },
      { text: ' | ' },
      { text: 'GitHub', link: 'https://github.com/Chrov' }
    ],
    sections: {
      education: 'EDUCATION',
      skills: 'SKILLS',
      experience: 'PROFESSIONAL EXPERIENCE',
      projects: 'PROJECTS & PRODUCT ENGINEERING'
    },
    education: [
      {
        schoolBold: 'Instituto Profesional IPG',
        location: ', Santiago, Chile',
        date: 'Mar 2026 - Dec 2028',
        degreeItalic: 'B.Eng. in Data Science Engineering (Ingeniería en Ciencia de Datos · In Progress)'
      },
      {
        schoolBold: 'Instituto Profesional IPLACEX',
        location: ', Santiago, Chile',
        date: 'Mar 2026 - Dec 2027',
        degreeItalic: 'Associate Degree in Data Analysis (Técnico de Nivel Superior en Análisis de Datos · In Progress)'
      },
      {
        schoolBold: 'Colegio Universitario IES',
        location: ', Córdoba, Argentina',
        date: 'Mar 2021 - Dec 2023',
        degreeItalic: 'Systems Analysis Studies (3 Years Completed in Software Engineering & Relational Databases)'
      }
    ],
    coursesLabel: 'Relevant Courses & Certifications: ',
    coursesText:
      'Machine Learning, Statistical Modeling, Time-Series Forecasting, Relational & Dimensional Databases (SQL), Data Structures & Algorithms, Data Governance, Google Data Analytics Professional Certificate (2026), Google AI Fundamentals (2026), Supply Chain Management & Analytics (Coursera).',
    skills: [
      [
        'Programming & Software:',
        'Python (Pandas, NumPy, Scikit-learn, LightGBM, Prophet, SARIMAX, Matplotlib, Seaborn), SQL (PostgreSQL, MySQL, BigQuery), JavaScript, PHP, HTML/CSS, Git'
      ],
      [
        'Algorithms & Models:',
        'Time-Series Forecasting, Gradient Boosting (LightGBM), Logistic & Linear Regression, Classification, Anomaly Detection, Cohort Analysis, Walk-Forward Temporal Validation'
      ],
      [
        'Techniques & Data Engineering:',
        'ETL/ELT Pipelines, Dimensional Modeling (Star Schema), Stored Procedures & Triggers, Feature Engineering, Model Calibration & Temporal Drift Auditing (AUC/Brier), Wilson Confidence Intervals'
      ],
      [
        'Tools & Platforms:',
        'Power BI (DAX, Power Query, PBIP), Tableau Desktop/Public, dbt (21 QA tests), Advanced Excel (PivotTables, Power Query), Docker, DBeaver, Workflow Automation'
      ]
    ],
    jobs: [
      {
        titleLine: 'Data, BI & Software Consultant, Independent Practice (Freelance), Santiago, Chile',
        date: 'Jan 2026 - Present',
        bullets: [
          'Delivered end-to-end operational and analytical modernization for a commercial retail business, designing daily gross margin, inventory turnover, SKU replenishment, and waste-at-cost data models from scratch.',
          'Reduced stockouts to near zero, increased sales by 10–15%, and cut procurement costs by 15–20% by deploying daily SQL/Excel tracking, Power BI and Tableau dashboards, and an automated WhatsApp voice-to-data capture bot.',
          'Engineered independent analytics and forecasting solutions: star-schema dbt pipelines, recursive LightGBM models, and walk-forward validated moving-average baselines free of temporal data leakage.'
        ]
      },
      {
        titleLine: 'Data Analyst / Analyst Programmer, Top Partners S.A. (SubContrataLey B2B SaaS), Santiago, Chile',
        date: 'Dec 2021 - Jan 2026',
        bullets: [
          'Accelerated Law 20.123 labor-compliance report delivery by 40% by designing, optimizing, and automating SQL ETL pipelines (stored procedures, triggers, CTEs, and window functions) on PostgreSQL and MySQL.',
          'Architected and maintained interactive Power BI and Tableau dashboards over star-schema dimensional models with custom DAX measures, used daily by 70+ enterprise client companies and 100+ active users.',
          'Raised automated document verification accuracy above 90% by enforcing data governance rules and deploying Python anomaly-detection routines (Pandas, Seaborn), while leading the People Analytics (HR) reporting suite.'
        ]
      }
    ],
    projects: [
      {
        titleLine: 'Airmed & DatBase: Clinical Operations & Relational Data Platforms, (Product Engineering)',
        date: '2024 - 2026',
        bullets: [
          'Airmed (Digital Health): engineered care-traceability modules, schedule utilization tracking, SLA compliance indicators, and executive Power BI (DAX) + SQL + Python workflows to standardize clinical and operational records.',
          'DatBase (Data & Workflow Platform): architected relational schemas in SQL/MySQL/PostgreSQL, automated stored procedures, data-integrity validation layers, and operational reporting modules using PHP, JavaScript, and Python.'
        ]
      },
      {
        titleLine: 'Retail Demand Forecasting & Replenishment Pipeline, (dbt + BigQuery + LightGBM + Tableau)',
        date: '2025 - 2026',
        bullets: [
          'Built a star-schema pipeline with 21 passing dbt data-quality tests across 213,480 calendar rows (360 store-SKU series), clamping negative returns and completing sparse date spines with explicit zeros.',
          'Evaluated recursive LightGBM across 4 walk-forward origins without future price/promo leakage, achieving 30.28% beverage WMAPE vs. 44.89% seasonal-naive baseline and formulating shadow-pilot rules for intermittent demand.'
        ]
      },
      {
        titleLine: 'Chronological Banking ML Drift Audit & Public Data Observatories, (SQL + Python + Power BI)',
        date: '2025 - 2026',
        bullets: [
          'Audited 41,188 UCI bank-campaign records under a strict 60/20/20 chronological split excluding call-duration leakage; diagnosed ROC-AUC collapse to 0.458 caused by macroeconomic base-rate shift (4.8% to 30.8%), preventing a flawed deployment.',
          'Developed reproducible studies across CLP retail cohort waste (3,825 batches; CLP 2.98M olives loss), US BTS airline reliability (577,262 flights with Wilson intervals), and 49-year COCHILCO copper reconciliation (r = 0.923).'
        ]
      }
    ]
  }
};

function buildResume(cfg) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'LETTER',
      margins: { top: 28, bottom: 26, left: 36, right: 36 },
      info: {
        Title: `${cfg.name} - Resume`,
        Author: 'Camilo Vergara Salas',
        Subject: 'Data Analytics, Business Intelligence, Data Science & Software Engineering Resume',
        Keywords: 'Data Analyst, Business Intelligence, Data Science, SQL, Python, Power BI, Tableau, dbt, LightGBM, PostgreSQL, MySQL, PHP, JavaScript, Airmed, DatBase, Top Partners, IPLACEX, IPG'
      }
    });

    const stream = fs.createWriteStream(cfg.filename);
    doc.pipe(stream);

    const leftX = doc.page.margins.left;
    const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
    const dateColWidth = 92;
    const mainColWidth = pageWidth - dateColWidth - 6;

    const black = '#000000';
    const linkBlue = '#1155CC';

    // 1. Centered Bold Uppercase Name (Matches Harry Hu reference)
    doc
      .font('Helvetica-Bold')
      .fontSize(16.5)
      .fillColor(black)
      .text(cfg.name, leftX, doc.y, { width: pageWidth, align: 'center' });

    doc.moveDown(0.18);

    // 2. Centered Single-Line Contact Bar with Blue Underlined Links
    doc.font('Helvetica').fontSize(8.4);
    const totalContactWidth = cfg.contactParts.reduce((acc, part) => acc + doc.widthOfString(part.text), 0);
    let curX = leftX + Math.max(0, (pageWidth - totalContactWidth) / 2);
    const contactY = doc.y;

    cfg.contactParts.forEach((part) => {
      const w = doc.widthOfString(part.text);
      doc
        .font('Helvetica')
        .fontSize(8.4)
        .fillColor(part.link ? linkBlue : black)
        .text(part.text, curX, contactY, {
          lineBreak: false,
          underline: Boolean(part.link),
          link: part.link || undefined
        });
      curX += w;
    });

    doc.x = leftX;
    doc.y = contactY + 15;

    function drawSectionHeader(title) {
      doc
        .font('Helvetica-Bold')
        .fontSize(10.0)
        .fillColor(black)
        .text(title, leftX, doc.y, { width: pageWidth });
      const lineY = doc.y + 1.5;
      doc
        .moveTo(leftX, lineY)
        .lineTo(leftX + pageWidth, lineY)
        .lineWidth(0.75)
        .strokeColor(black)
        .stroke();
      doc.y = lineY + 4.5;
    }

    function drawBullet(text) {
      const startY = doc.y;
      doc
        .font('Helvetica')
        .fontSize(8.35)
        .fillColor(black)
        .text('•', leftX + 8, startY, { lineBreak: false });
      doc
        .font('Helvetica')
        .fontSize(8.35)
        .fillColor(black)
        .text(text, leftX + 18, startY, {
          width: pageWidth - 18,
          align: 'left',
          lineGap: 0.9
        });
      doc.y += 1.4;
    }

    // SECTION 1: EDUCATION
    drawSectionHeader(cfg.sections.education);
    cfg.education.forEach((ed) => {
      const rowY = doc.y;
      doc
        .font('Helvetica-Bold')
        .fontSize(8.8)
        .fillColor(black)
        .text(ed.schoolBold, leftX, rowY, { width: mainColWidth, continued: true })
        .font('Helvetica')
        .text(ed.location, { continued: false });
      const leftEnd = doc.y;

      doc
        .font('Helvetica')
        .fontSize(8.5)
        .fillColor(black)
        .text(ed.date, leftX + mainColWidth + 6, rowY, {
          width: dateColWidth,
          align: 'right'
        });
      doc.y = Math.max(leftEnd, doc.y);

      doc
        .font('Helvetica-Oblique')
        .fontSize(8.45)
        .fillColor(black)
        .text(ed.degreeItalic, leftX, doc.y, { width: pageWidth });
      doc.y += 2.2;
    });

    // Relevant Courses line
    doc
      .font('Helvetica-Bold')
      .fontSize(8.35)
      .fillColor(black)
      .text(cfg.coursesLabel, leftX, doc.y, { width: pageWidth, continued: true })
      .font('Helvetica')
      .text(cfg.coursesText, { width: pageWidth, lineGap: 0.85 });

    doc.y += 6.5;

    // SECTION 2: SKILLS
    drawSectionHeader(cfg.sections.skills);
    cfg.skills.forEach(([label, items]) => {
      doc
        .font('Helvetica-Bold')
        .fontSize(8.35)
        .fillColor(black)
        .text(`${label} `, leftX, doc.y, { width: pageWidth, continued: true })
        .font('Helvetica')
        .text(items, { width: pageWidth, lineGap: 0.85 });
      doc.y += 1.8;
    });

    doc.y += 5.0;

    // SECTION 3: PROFESSIONAL EXPERIENCE
    drawSectionHeader(cfg.sections.experience);
    cfg.jobs.forEach((job, idx) => {
      const rowY = doc.y;
      doc
        .font('Helvetica-Bold')
        .fontSize(8.75)
        .fillColor(black)
        .text(job.titleLine, leftX, rowY, { width: mainColWidth });
      const leftEnd = doc.y;

      doc
        .font('Helvetica')
        .fontSize(8.45)
        .fillColor(black)
        .text(job.date, leftX + mainColWidth + 6, rowY, {
          width: dateColWidth,
          align: 'right'
        });
      doc.y = Math.max(leftEnd, doc.y) + 1.2;

      job.bullets.forEach((b) => drawBullet(b));
      if (idx < cfg.jobs.length - 1) doc.y += 3.5;
    });

    doc.y += 5.0;

    // SECTION 4: PROJECTS & PRODUCT ENGINEERING
    drawSectionHeader(cfg.sections.projects);
    cfg.projects.forEach((proj, idx) => {
      const rowY = doc.y;
      doc
        .font('Helvetica-Bold')
        .fontSize(8.75)
        .fillColor(black)
        .text(proj.titleLine, leftX, rowY, { width: mainColWidth });
      const leftEnd = doc.y;

      doc
        .font('Helvetica')
        .fontSize(8.45)
        .fillColor(black)
        .text(proj.date, leftX + mainColWidth + 6, rowY, {
          width: dateColWidth,
          align: 'right'
        });
      doc.y = Math.max(leftEnd, doc.y) + 1.2;

      proj.bullets.forEach((b) => drawBullet(b));
      if (idx < cfg.projects.length - 1) doc.y += 3.2;
    });

    doc.end();
    stream.on('finish', resolve);
    stream.on('error', reject);
  });
}

await buildResume(DATA.es);
await buildResume(DATA.en);
console.log('Successfully generated both ES and EN resumes in classic Harry Hu single-page format.');
