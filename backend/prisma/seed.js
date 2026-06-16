import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const CATEGORIES = [
  { name: 'Planeación logística', description: 'Evaluación de metas, planes estratégicos y alineación organizativa de la cadena.' },
  { name: 'Transporte', description: 'Gestión y control de flujos de transporte interno y distribución externa.' },
  { name: 'Almacenamiento', description: 'Aprovechamiento de almacenes, control de inventarios y despacho.' },
  { name: 'Supply Chain', description: 'Integración logística con proveedores, clientes e indicadores globales.' },
  { name: 'Tecnología', description: 'Sistemas de información, trazabilidad y software logístico integrado.' },
  { name: 'Talento humano', description: 'Capacitación, cultura y liderazgo de los equipos logísticos.' },
  { name: 'Logística reversa', description: 'Procesos de recuperación, devolución de mercancías y sostenibilidad.' }
];

const SURVEYS_DATA = [
  {
    titulo: 'Encuesta 1: Concepto Logístico',
    descripcion: 'Evalúa la alineación estratégica, modelado y visión de la empresa en torno al concepto de SCM.',
    categoria: 'Planeación logística',
    preguntas: [
      '¿Tiene la empresa formalmente elaborado un plan estratégico para el desarrollo de la logística?',
      '¿En qué grado la Gerencia Logística involucra en sus decisiones sistemáticamente a las distintas actividades de la empresa?',
      '¿Las unidades que ejecutan los procesos logísticos trabajan autónomamente?',
      '¿Existe algún programa para la mejora de los procesos logísticos?',
      '¿Se elaboran planes logísticos formales?',
      '¿Con qué frecuencia se elaboran los planes logísticos?',
      '¿Están elaborados los requisitos de calidad de todos los procesos logísticos?',
      '¿Se aplica Costeo Basado en Actividades (ABC)?',
      '¿Se utilizan técnicas de Ingeniería o Análisis del Valor?',
      '¿Se aplican enfoques modernos de gestión logística?',
      '¿La Gerencia Logística tiene metas definidas?',
      '¿Existe integración logística con otras áreas?',
      '¿Los empleados conocen los objetivos logísticos?',
      '¿La empresa considera cambios radicales en logística?',
      '¿La gerencia entiende que Supply Chain y Logística no son sinónimos?',
      '¿Tiene la empresa modelado un Supply Chain?',
      '¿La empresa utiliza mejores prácticas SCM?',
      '¿Los ejecutivos entienden que compiten Supply Chains?',
      '¿Los ejecutivos comprenden la logística moderna?'
    ]
  },
  {
    titulo: 'Encuesta 2: Organización Logística',
    descripcion: 'Analiza la estructura jerárquica logísitca, el nivel de especialización y la integración organizacional.',
    categoria: 'Planeación logística',
    preguntas: [
      '¿La estructura organizativa logística está diferenciada?',
      '¿La Gerencia Logística tiene alto nivel jerárquico?',
      '¿Se utilizan mecanismos de integración logística?',
      '¿Los procedimientos logísticos están documentados?',
      '¿Se realizan pronósticos de demanda?',
      '¿Existe personal especializado?',
      '¿Se utiliza outsourcing logístico?',
      '¿Existe reglamentación escrita?',
      '¿La empresa posee certificaciones?',
      '¿El personal tiene habilidades suficientes?',
      '¿Existe coordinación entre áreas?',
      '¿Existe continuidad en el flujo logístico?',
      '¿La organización logística es plana?',
      '¿Existe racionalización de personal?',
      '¿El personal recibe capacitación?',
      '¿Existe programa formal de capacitación?',
      '¿Los servicios logísticos son centralizados?',
      '¿La estructura logística es innovadora?',
      '¿Existe integración con clientes y proveedores?'
    ]
  },
  {
    titulo: 'Encuesta 3: Tecnología de Manipulación',
    descripcion: 'Mide la mecanización, el estado de equipos y las habilidades del personal para la carga y descarga.',
    categoria: 'Almacenamiento',
    preguntas: [
      '¿Las operaciones de carga y descarga son mecanizadas?',
      '¿Las operaciones evitan interrupciones?',
      '¿Se dispone de medios adecuados?',
      '¿Los equipos están en buen estado?',
      '¿El personal posee habilidades suficientes?',
      '¿Existe capacitación continua?',
      '¿Existe programa de capacitación?'
    ]
  },
  {
    titulo: 'Encuesta 4: Tecnología de Almacenaje',
    descripcion: 'Evalúa el uso del espacio físico, el soporte informático y la eficiencia interna en almacenes.',
    categoria: 'Almacenamiento',
    preguntas: [
      '¿Se aprovecha adecuadamente el área de almacenes?',
      '¿Se utiliza adecuadamente la altura de almacenaje?',
      '¿El despacho es eficiente?',
      '¿Las operaciones son mecanizadas?',
      '¿La gestión tiene soporte informático?',
      '¿La organización interna es eficiente?',
      '¿Existe codificación de productos?',
      '¿Los almacenes garantizan seguridad?',
      '¿Existe control permanente de inventarios?',
      '¿La tecnología satisface necesidades SCM?'
    ]
  },
  {
    titulo: 'Encuesta 5: Tecnología de Transporte Interno',
    descripcion: 'Evalúa la eficiencia, el mantenimiento y el flujo de los medios de transporte interno de materiales.',
    categoria: 'Transporte',
    preguntas: [
      '¿Existen medios adecuados de transporte interno?',
      '¿Las operaciones son eficientes?',
      '¿Existe mantenimiento preventivo?',
      '¿El flujo minimiza tiempos?',
      '¿Se utilizan tecnologías modernas?',
      '¿Existe capacitación?',
      '¿La capacidad cubre demanda?'
    ]
  },
  {
    titulo: 'Encuesta 6: Tecnología de Transporte Externo',
    descripcion: 'Analiza la planificación de rutas, entregas de mercancía a clientes y monitoreo de la flota.',
    categoria: 'Transporte',
    preguntas: [
      '¿La empresa posee transporte externo adecuado?',
      '¿Existe planificación eficiente de rutas?',
      '¿Se monitorean entregas?',
      '¿Se cumplen tiempos de entrega?',
      '¿Se utilizan indicadores logísticos?',
      '¿Existe coordinación con proveedores?',
      '¿La tecnología mejora competitividad?'
    ]
  },
  {
    titulo: 'Encuesta 7: Tecnología de Información',
    descripcion: 'Evalúa la integración de la información en tiempo real, seguridad de datos y su soporte a decisiones.',
    categoria: 'Tecnología',
    preguntas: [
      '¿La empresa utiliza sistemas integrados?',
      '¿La información fluye en tiempo real?',
      '¿Los sistemas apoyan decisiones?',
      '¿Existe integración tecnológica?',
      '¿La información es segura?',
      '¿Se utilizan indicadores digitales?',
      '¿Existe capacitación tecnológica?'
    ]
  },
  {
    titulo: 'Encuesta 8: Tecnología de Software',
    descripcion: 'Mide el uso, actualización y trazabilidad que aportan las herramientas de software a la logística.',
    categoria: 'Tecnología',
    preguntas: [
      '¿La empresa utiliza software logístico?',
      '¿Existe integración entre softwares?',
      '¿El software permite trazabilidad?',
      '¿Genera reportes automáticos?',
      '¿Existe actualización constante?',
      '¿Existe capacitación?',
      '¿El software mejora eficiencia?'
    ]
  },
  {
    titulo: 'Encuesta 9: Talento Humano',
    descripcion: 'Evalúa la capacitación, liderazgo y comunicación de los equipos humanos que integran la cadena logística.',
    categoria: 'Talento humano',
    preguntas: [
      '¿El personal posee conocimientos logísticos?',
      '¿Existe cultura organizacional logística?',
      '¿Se realizan capacitaciones?',
      '¿Existen incentivos?',
      '¿La comunicación interna es eficiente?',
      '¿Existe liderazgo logístico?',
      '¿El talento humano impulsa innovación?'
    ]
  },
  {
    titulo: 'Encuesta 10: Integración del Supply Chain',
    descripcion: 'Mide la colaboración, alianzas e integración de procesos logísticos con proveedores y clientes.',
    categoria: 'Supply Chain',
    preguntas: [
      '¿Los proveedores son aliados estratégicos?',
      '¿Existen relaciones colaborativas?',
      '¿Existe integración de información?',
      '¿Se comparte información logística?',
      '¿Existe integración de procesos?',
      '¿Existe colaboración en demanda?',
      '¿Existe coordinación logística?',
      '¿Existe integración tecnológica SCM?'
    ]
  },
  {
    titulo: 'Encuesta 11: Barreras del Entorno',
    descripcion: 'Evalúa el impacto de la infraestructura nacional, regulaciones y entorno competitivo en la logística.',
    categoria: 'Planeación logística',
    preguntas: [
      '¿Existen barreras externas logísticas?',
      '¿Las regulaciones afectan logística?',
      '¿La infraestructura limita competitividad?',
      '¿Existen problemas de conectividad?',
      '¿Las condiciones económicas afectan Supply Chain?',
      '¿Existe dificultad tecnológica?',
      '¿La competencia representa barreras?'
    ]
  },
  {
    titulo: 'Encuesta 12: Logística Reversa',
    descripcion: 'Analiza las políticas de devoluciones, recuperación, reutilización de materiales y normatividad ambiental.',
    categoria: 'Logística reversa',
    preguntas: [
      '¿La empresa posee logística reversa?',
      '¿Existe recuperación de productos?',
      '¿Se gestionan devoluciones?',
      '¿Existe reutilización de materiales?',
      '¿La logística reversa reduce costos?',
      '¿Existen políticas ambientales?',
      '¿Se mide desempeño de logística reversa?'
    ]
  },
  {
    titulo: 'Encuesta 13: Medida del Desempeño Logístico',
    descripcion: 'Evalúa la existencia de KPIs, medición de costos y tiempos para la mejora continua empresarial.',
    categoria: 'Supply Chain',
    preguntas: [
      '¿La empresa mide indicadores logísticos?',
      '¿Existen KPIs definidos?',
      '¿Se evalúa satisfacción del cliente?',
      '¿Se monitorean tiempos logísticos?',
      '¿Se analizan costos logísticos?',
      '¿Existe mejora continua?',
      '¿Los resultados apoyan decisiones?'
    ]
  }
];

const STANDARD_OPTIONS = [
  { texto: 'Muy Deficiente', valor: 1.0 },
  { texto: 'Deficiente', valor: 2.0 },
  { texto: 'Aceptable', valor: 3.0 },
  { texto: 'Bueno', valor: 4.0 },
  { texto: 'Excelente', valor: 5.0 }
];

async function main() {
  console.log('Iniciando seeder...');

  // 1. Limpieza de base de datos
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE "AuditLog", "RefreshToken", "SurveyAnswer", "SurveyAttempt", "SurveyAssignment", "QuestionOption", "Question", "Survey", "Category", "User", "Company" CASCADE;`);
  console.log('Base de datos limpiada.');

  // 2. Crear Categorías
  const categoryMap = {};
  for (const cat of CATEGORIES) {
    const createdCat = await prisma.category.create({
      data: cat
    });
    categoryMap[cat.name] = createdCat.id;
  }
  console.log('Categorías creadas.');

  // 3. Crear Empresa de Prueba
  const company = await prisma.company.create({
    data: {
      nombre_empresa: 'Logix Solutions S.A.S.',
      nit: '900.123.456-7',
      sector: 'Transporte y Almacenamiento',
      direccion: 'Calle 45 # 12-34',
      telefono: '6012345678',
      correo: 'contacto@logixsolutions.com'
    }
  });
  console.log('Empresa de prueba creada.');

  // 4. Crear Usuarios
  const adminPasswordHash = await bcrypt.hash('Admin123*', 12);
  const companyAdminPasswordHash = await bcrypt.hash('Company123*', 12);
  const evaluatorPasswordHash = await bcrypt.hash('Evaluator123*', 12);

  const admin = await prisma.user.create({
    data: {
      nombre: 'Administrador',
      apellido: 'Global',
      email: 'admin@supplychain.com',
      password: adminPasswordHash,
      rol: 'ADMIN',
      estado: 'ACTIVO'
    }
  });

  const companyAdmin = await prisma.user.create({
    data: {
      nombre: 'Carlos',
      apellido: 'Gómez',
      email: 'carlos.gomez@logixsolutions.com',
      password: companyAdminPasswordHash,
      rol: 'COMPANY_ADMIN',
      empresa_id: company.id,
      estado: 'ACTIVO'
    }
  });

  const evaluator = await prisma.user.create({
    data: {
      nombre: 'María',
      apellido: 'Rojas',
      email: 'maria.rojas@logixsolutions.com',
      password: evaluatorPasswordHash,
      rol: 'EVALUATOR',
      empresa_id: company.id,
      estado: 'ACTIVO'
    }
  });
  console.log('Usuarios de prueba creados (ADMIN, COMPANY_ADMIN, EVALUATOR).');

  // 5. Cargar las 13 Encuestas
  for (const surveyInfo of SURVEYS_DATA) {
    const categoryId = categoryMap[surveyInfo.categoria];

    // Crear encuesta
    const survey = await prisma.survey.create({
      data: {
        titulo: surveyInfo.titulo,
        descripcion: surveyInfo.descripcion,
        version: 1,
        is_active: true,
        status: 'ACTIVE',
        created_by: admin.id
      }
    });

    // Crear preguntas y sus opciones
    for (let i = 0; i < surveyInfo.preguntas.length; i++) {
      const questionText = surveyInfo.preguntas[i];
      const question = await prisma.question.create({
        data: {
          survey_id: survey.id,
          category_id: categoryId,
          pregunta: questionText,
          tipo: 'LIKERT',
          orden: i + 1,
          obligatorio: true,
          categoria_indicador: surveyInfo.categoria
        }
      });

      // Añadir las opciones estándar Likert 1-5
      for (const opt of STANDARD_OPTIONS) {
        await prisma.questionOption.create({
          data: {
            question_id: question.id,
            texto: opt.texto,
            valor: opt.valor
          }
        });
      }
    }
    console.log(`Creada: ${surveyInfo.titulo} (${surveyInfo.preguntas.length} preguntas)`);
  }

  console.log('Seeder completado con éxito.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
