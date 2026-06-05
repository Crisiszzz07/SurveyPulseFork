import { supabase } from './supabase';
import { getMaturityLevel } from '../utils/dataTransformers';

const MOCK_ATTEMPTS = [
  { id: 'att-1', survey_id: '1', company_id: 'c1111111-1111-1111-1111-111111111111', evaluator_id: 'u3333333-3333-3333-3333-333333333333', status: 'COMPLETED', started_at: '2026-05-10T14:00:00Z', completed_at: '2026-05-10T14:30:00Z', total_score: 85, percentage: 85, maturity_level: 'HIGH' },
  { id: 'att-2', survey_id: '1', company_id: 'c2222222-2222-2222-2222-222222222222', evaluator_id: 'u3333333-3333-3333-3333-333333333333', status: 'IN_PROGRESS', started_at: '2026-05-12T16:00:00Z', completed_at: null, total_score: null, percentage: null, maturity_level: null }
];

const MOCK_ANSWERS = {
  'att-1': [
    { id: 'ans-1', attempt_id: 'att-1', question_id: 'q1', score: 4, answer_text: 'Frecuentemente se hace' },
    { id: 'ans-2', attempt_id: 'att-1', question_id: 'q2', score: 5, answer_text: 'Siempre se hace sin falta' },
    { id: 'ans-3', attempt_id: 'att-1', question_id: 'q3', score: 3, answer_text: 'A veces está disponible' },
    { id: 'ans-4', attempt_id: 'att-1', question_id: 'q4', score: 4, answer_text: 'Frecuentemente se hace' },
    { id: 'ans-5', attempt_id: 'att-1', question_id: 'q5', score: 5, answer_text: 'Siempre se hace sin falta' }
  ],
  'att-2': [
    { id: 'ans-6', attempt_id: 'att-2', question_id: 'q1', score: 3, answer_text: 'A veces se hace' }
  ]
};

/**
 * Inicia un nuevo intento de encuesta (In Progress).
 */
export async function createAttempt({ survey_id, company_id, evaluator_id }) {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from('SurveyAttempt')
    .insert([{
      id,
      survey_id,
      company_id,
      evaluator_id,
      status: 'IN_PROGRESS',
      started_at: now,
      created_at: now,
      updated_at: now,
    }])
    .select()
    .single();

  if (error) {
    console.error('❌ Error creando SurveyAttempt:', error.message);
    return { success: false, error: error.message };
  }

  return { success: true, attempt: data };
}


/**
 * Obtener detalle del intento y respuestas guardadas.
 */
export async function getAttemptDetails(id) {
  try {
    const { data: attempt, error: attError } = await supabase
      .from('SurveyAttempt')
      .select('*, Company(*), Survey(*)')
      .eq('id', id)
      .single();
    if (attError) throw attError;

    const { data: answers, error: ansError } = await supabase
      .from('SurveyAnswer')
      .select('*, selected_option:QuestionOption(*)')
      .eq('attempt_id', id);
    if (ansError) throw ansError;

    const normalizedAttempt = attempt ? {
      ...attempt,
      company: attempt.Company || attempt.company,
      survey: attempt.Survey || attempt.survey
    } : null;

    const normalizedAnswers = (answers || []).map(ans => ({
      ...ans,
      score: ans.numeric_value || ans.selected_option?.valor || 3
    }));

    return { success: true, attempt: normalizedAttempt, answers: normalizedAnswers };
  } catch (err) {
    console.warn(`Usando detalle del intento simulado para ID: ${id}`);
    const attempt = MOCK_ATTEMPTS.find(a => a.id === id) || MOCK_ATTEMPTS[0];
    const answers = MOCK_ANSWERS[attempt.id] || [];
    return { success: true, attempt, answers };
  }
}

/**
 * Guarda respuestas parciales del evaluador.
 * Estrategia: DELETE las respuestas existentes de este intento, luego INSERT las nuevas.
 * Esto evita depender de una restricción UNIQUE que puede no existir en la BD.
 */
export async function savePartialAnswers(attemptId, answersArray) {
  if (!answersArray || answersArray.length === 0) {
    return { success: true };
  }

  // 1. Borrar respuestas anteriores de este intento
  const { error: delError } = await supabase
    .from('SurveyAnswer')
    .delete()
    .eq('attempt_id', attemptId);

  if (delError) {
    console.error('❌ Error borrando respuestas anteriores:', delError.message);
    return { success: false, error: delError.message };
  }

  // 2. Insertar las respuestas actuales con IDs nuevos
  const now = new Date().toISOString();
  const payload = answersArray.map(ans => ({
    id: crypto.randomUUID(),
    attempt_id: attemptId,
    question_id: ans.question_id,
    selected_option_id: ans.selected_option_id || null,
    answer_text: ans.answer_text || null,
    numeric_value: ans.numeric_value != null ? Number(ans.numeric_value)
                  : ans.score != null       ? Number(ans.score)
                  : null,
    created_at: now,
  }));

  const { error: insError } = await supabase
    .from('SurveyAnswer')
    .insert(payload);

  if (insError) {
    console.error('❌ Error guardando respuestas:', insError.message);
    return { success: false, error: insError.message };
  }

  return { success: true };
}

/**
 * Finaliza y califica el intento (Calcula madurez).
 */
export async function submitAttempt(id) {
  try {
    // 1. Obtener todas las respuestas del intento
    const { data: answers, error: ansError } = await supabase
      .from('SurveyAnswer')
      .select('numeric_value, selected_option_id')
      .eq('attempt_id', id);
    if (ansError) throw ansError;

    if (!answers || answers.length === 0) {
      return { success: false, error: 'No se encontraron respuestas guardadas para este intento.' };
    }

    // 2. Calcular la puntuación total y porcentaje (escala Likert 1-5)
    const totalScoreSum = answers.reduce((acc, curr) => {
      return acc + Number(curr.numeric_value || 3);
    }, 0);
    
    const maxPossibleScore = answers.length * 5;
    const percentage = Math.round((totalScoreSum / maxPossibleScore) * 100);
    const level = getMaturityLevel(percentage);

    // 3. Actualizar la cabecera del intento
    const { data: attempt, error: updError } = await supabase
      .from('SurveyAttempt')
      .update({
        status: 'COMPLETED',
        completed_at: new Date().toISOString(),
        total_score: percentage,
        percentage: percentage,
        maturity_level: level,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();
    if (updError) throw updError;

    return { success: true, attempt };
  } catch (err) {
    console.error(`❌ Error al finalizar intento ${id}:`, err.message);
    // Solo hacemos fallback a mock si el intento es un ID de mock
    if (id.startsWith('mock-')) {
      const attempt = MOCK_ATTEMPTS.find(a => a.id === id);
      if (attempt) {
        const answers = MOCK_ANSWERS[attempt.id] || [];
        const totalScoreSum = answers.reduce((acc, curr) => acc + (curr.score || 3), 0);
        const maxPossibleScore = (answers.length || 5) * 5;
        const percentage = Math.round((totalScoreSum / maxPossibleScore) * 100);
        const level = getMaturityLevel(percentage);
        attempt.status = 'COMPLETED';
        attempt.completed_at = new Date().toISOString();
        attempt.total_score = percentage;
        attempt.percentage = percentage;
        attempt.maturity_level = level;
        return { success: true, attempt };
      }
      return { success: false, error: 'Intento simulado no encontrado' };
    }
    return { success: false, error: err.message };
  }
}


/**
 * Historial de encuestas completadas por la empresa.
 */
export async function getCompanyAttemptHistory(companyId) {
  try {
    const { data, error } = await supabase
      .from('SurveyAttempt')
      .select('*, Survey(titulo, descripcion)')
      .eq('company_id', companyId)
      .eq('status', 'COMPLETED')
      .order('completed_at', { ascending: false });
    if (error) throw error;

    const normalizedHistory = (data || []).map(att => ({
      ...att,
      survey: att.Survey || att.survey
    }));

    return { success: true, history: normalizedHistory };
  } catch (err) {
    console.warn(`Usando historial de intentos simulado para Empresa: ${companyId}`);
    // Filtrar mocks completados
    return { success: true, history: MOCK_ATTEMPTS.filter(a => a.status === 'COMPLETED') };
  }
}

/**
 * Obtiene todos los intentos de encuesta.
 */
export async function getSurveyAttempts() {
  try {
    const { data, error } = await supabase
      .from('SurveyAttempt')
      .select('*, Company(nombre_empresa, nit, sector), Survey(titulo)')
      .order('completed_at', { ascending: false });
    if (error) throw error;

    const normalizedData = (data || []).map(att => ({
      ...att,
      company: att.Company || att.company,
      survey: att.Survey || att.survey
    }));

    return normalizedData && normalizedData.length > 0 ? normalizedData : MOCK_ATTEMPTS;
  } catch (err) {
    console.warn('Usando datos de prueba para Survey Attempts:', err.message);
    return MOCK_ATTEMPTS;
  }
}

/**
 * Obtiene las respuestas de un intento específico.
 */
export async function getSurveyAnswers(attemptId) {
  try {
    const { data, error } = await supabase
      .from('SurveyAnswer')
      .select('*, selected_option:QuestionOption(texto, valor)')
      .eq('attempt_id', attemptId);
    if (error) throw error;
    
    // Normalize data to include score for compatibility
    const normalizedData = (data || []).map(ans => ({
      ...ans,
      score: ans.numeric_value || ans.selected_option?.valor || 3
    }));
    
    return normalizedData && normalizedData.length > 0 ? normalizedData : (MOCK_ANSWERS[attemptId] || MOCK_ANSWERS['att-1']);
  } catch (err) {
    console.warn(`Usando datos de prueba para Survey Answers (${attemptId}):`, err.message);
    return MOCK_ANSWERS[attemptId] || MOCK_ANSWERS['att-1'];
  }
}
