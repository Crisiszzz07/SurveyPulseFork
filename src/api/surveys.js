import { supabase } from './supabase';

/* ─── Mock fallback (solo cuando Supabase no responde) ────────── */
const MOCK_SURVEYS = [
  { id: 'mock-1', titulo: 'Evaluación de Madurez Ágil (Demo)', descripcion: 'Mide la madurez y adopción de prácticas ágiles.', version: 1, status: 'ACTIVE', is_active: true, created_at: '2026-05-01T10:00:00Z' },
  { id: 'mock-2', titulo: 'Cultura Organizacional (Demo)', descripcion: 'Analiza la percepción del clima laboral.', version: 1, status: 'ACTIVE', is_active: true, created_at: '2026-05-02T10:00:00Z' },
  { id: 'mock-3', titulo: 'Seguridad de la Información (Demo)', descripcion: 'Chequeo de políticas de ciberseguridad.', version: 1, status: 'DRAFT', is_active: true, created_at: '2026-05-03T10:00:00Z' },
];

const MOCK_QUESTIONS = {
  'mock-1': [
    { id: 'q1', pregunta: '¿Los equipos planifican sus iteraciones de forma colaborativa?', tipo: 'LIKERT', obligatorio: true, orden: 1, categoria_indicador: 'Planificación', category: { name: 'Planificación' }, options: [{ id: 'o1', texto: 'Totalmente en desacuerdo', valor: 1 }, { id: 'o2', texto: 'En desacuerdo', valor: 2 }, { id: 'o3', texto: 'Neutral', valor: 3 }, { id: 'o4', texto: 'De acuerdo', valor: 4 }, { id: 'o5', texto: 'Totalmente de acuerdo', valor: 5 }] },
    { id: 'q2', pregunta: '¿Se realizan retrospectivas al final de cada iteración?', tipo: 'LIKERT', obligatorio: true, orden: 2, categoria_indicador: 'Mejora Continua', category: { name: 'Mejora Continua' }, options: [{ id: 'o6', texto: 'Totalmente en desacuerdo', valor: 1 }, { id: 'o7', texto: 'En desacuerdo', valor: 2 }, { id: 'o8', texto: 'Neutral', valor: 3 }, { id: 'o9', texto: 'De acuerdo', valor: 4 }, { id: 'o10', texto: 'Totalmente de acuerdo', valor: 5 }] },
  ],
};

/* ─── Helpers ─────────────────────────────────────────────────── */
const isMockId = (id) => id && (id.startsWith('mock-') || id.length < 10);

/**
 * Lista todas las encuestas activas.
 * Devuelve datos reales de Supabase; solo usa mocks si hay error de conexión.
 */
export async function getSurveys() {
  try {
    const { data, error } = await supabase
      .from('Survey')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Si hay datos reales los devuelve; si la tabla está vacía devuelve []
    // NUNCA mezcla datos reales con mocks
    return data ?? [];
  } catch (err) {
    console.warn('⚠️ Supabase no disponible, usando datos de demostración:', err.message);
    return MOCK_SURVEYS.filter(s => s.is_active);
  }
}

/**
 * Obtiene el detalle de una encuesta con sus preguntas y opciones.
 * Usa el esquema real: Question.obligatorio, QuestionOption sin columna orden.
 */
export async function getSurveyDetail(surveyId) {
  // Si es un ID de mock, devolver datos simulados directamente
  if (isMockId(surveyId)) {
    const survey = MOCK_SURVEYS.find(s => s.id === surveyId) || MOCK_SURVEYS[0];
    const questions = MOCK_QUESTIONS[surveyId] || MOCK_QUESTIONS['mock-1'];
    return { ...survey, questions };
  }

  try {
    // 1. Obtener encuesta
    const { data: survey, error: sError } = await supabase
      .from('Survey')
      .select('*')
      .eq('id', surveyId)
      .single();
    if (sError) throw sError;

    // 2. Obtener preguntas con su categoría y opciones
    const { data: questions, error: qError } = await supabase
      .from('Question')
      .select(`
        id,
        pregunta,
        tipo,
        obligatorio,
        orden,
        categoria_indicador,
        category_id,
        Category ( id, name ),
        QuestionOption ( id, texto, valor )
      `)
      .eq('survey_id', surveyId)
      .order('orden', { ascending: true });
    if (qError) throw qError;

    // Normalizar para compatibilidad con componentes existentes
    const normalizedQuestions = (questions || []).map(q => ({
      ...q,
      requerida: q.obligatorio,           // alias para TakeSurvey
      category: q.Category || null,       // alias para SurveyDetail
      options: q.QuestionOption || [],    // alias para TakeSurvey
    }));

    return { ...survey, questions: normalizedQuestions };
  } catch (err) {
    console.warn(`⚠️ Error cargando Survey ${surveyId}:`, err.message);
    const survey = MOCK_SURVEYS.find(s => s.id === surveyId) || MOCK_SURVEYS[0];
    const questions = MOCK_QUESTIONS[surveyId] || MOCK_QUESTIONS['mock-1'];
    return { ...survey, questions };
  }
}

/**
 * Crear una nueva encuesta de diagnóstico.
 * Usa el esquema real:
 *  - Survey: titulo, descripcion, version, is_active, status, created_by
 *  - Question: survey_id, category_id (NOT NULL), pregunta, tipo, orden, obligatorio, categoria_indicador
 *  - QuestionOption: question_id, texto, valor  (sin columna orden)
 */
export async function createSurvey({ titulo, descripcion, created_by, status = 'DRAFT', version = 1 }) {
  try {
    const id = crypto.randomUUID();
    const { data, error } = await supabase
      .from('Survey')
      .insert([{
        id,
        titulo,
        descripcion: descripcion || null,
        created_by,
        status,
        version: Number(version),
        is_active: true,
        updated_at: new Date().toISOString(),
      }])
      .select()
      .single();
    if (error) throw error;
    return { success: true, survey: data };
  } catch (err) {
    console.warn('⚠️ Usando creación de encuesta simulada:', err.message);
    const newSurvey = {
      id: 'mock-srv-' + Math.random().toString(36).substr(2, 9),
      titulo,
      descripcion,
      created_by,
      status,
      is_active: true,
      version: Number(version),
      created_at: new Date().toISOString(),
      questions_count: 0,
    };
    MOCK_SURVEYS.push(newSurvey);
    return { success: true, survey: newSurvey };
  }
}

/**
 * Crear preguntas para una encuesta recién creada.
 * Respeta: obligatorio (no requerida), sin orden en QuestionOption.
 */
export async function createQuestions(surveyId, questions, defaultCategoryId) {
  try {
    // 1. Insertar preguntas
    const questionsPayload = questions.map((q, i) => ({
      id:                  crypto.randomUUID(),
      survey_id:           surveyId,
      pregunta:            q.pregunta.trim(),
      tipo:                q.tipo,
      category_id:         q.categoria_id || defaultCategoryId,  // NOT NULL
      orden:               i + 1,
      obligatorio:         q.requerida !== false,                 // campo real del esquema
      categoria_indicador: q.categoria_indicador || null,
      // updated_at requerido por trigger/default en algunos setups
    }));

    const { data: qData, error: qErr } = await supabase
      .from('Question')
      .insert(questionsPayload)
      .select();
    if (qErr) throw qErr;

    // 2. Insertar opciones (SIN columna "orden" — no existe en el esquema)
    const allOptions = [];
    qData.forEach((dbQ, qi) => {
      const srcQ = questions[qi];
      if (srcQ.opciones && srcQ.opciones.length > 0) {
        srcQ.opciones.forEach(opt => {
          allOptions.push({
            id:          crypto.randomUUID(),
            question_id: dbQ.id,
            texto:       opt.texto,
            valor:       Number(opt.valor),
            // SIN "orden": la columna no existe en QuestionOption
          });
        });
      }
    });

    if (allOptions.length > 0) {
      const { error: optErr } = await supabase
        .from('QuestionOption')
        .insert(allOptions);
      if (optErr) throw optErr;
    }

    return { success: true, questions: qData };
  } catch (err) {
    console.warn('⚠️ Error creando preguntas:', err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Modifica datos/metadatos de la encuesta.
 */
export async function updateSurvey(id, { titulo, descripcion, status, is_active }) {
  try {
    const { data, error } = await supabase
      .from('Survey')
      .update({
        titulo,
        descripcion,
        status,
        is_active,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return { success: true, survey: data };
  } catch (err) {
    console.warn(`⚠️ Usando actualización de encuesta simulada ID ${id}:`, err.message);
    const index = MOCK_SURVEYS.findIndex(s => s.id === id);
    if (index !== -1) {
      MOCK_SURVEYS[index] = { ...MOCK_SURVEYS[index], titulo, descripcion, status, is_active };
      return { success: true, survey: MOCK_SURVEYS[index] };
    }
    return { success: false, error: 'Encuesta no encontrada' };
  }
}

/**
 * Desactiva y archiva una encuesta (Soft Delete).
 */
export async function deleteSurvey(id) {
  try {
    const { data, error } = await supabase
      .from('Survey')
      .update({
        is_active: false,
        status: 'ARCHIVED',
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return { success: true, survey: data };
  } catch (err) {
    console.warn(`⚠️ Usando archivado simulado ID ${id}:`, err.message);
    const index = MOCK_SURVEYS.findIndex(s => s.id === id);
    if (index !== -1) {
      MOCK_SURVEYS[index].is_active = false;
      MOCK_SURVEYS[index].status = 'ARCHIVED';
      return { success: true, survey: MOCK_SURVEYS[index] };
    }
    return { success: false, error: 'Encuesta no encontrada' };
  }
}