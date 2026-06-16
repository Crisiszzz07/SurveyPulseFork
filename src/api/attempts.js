import { apiFetch } from './supabase';

/**
 * Inicia un nuevo intento de encuesta (In Progress).
 */
export async function createAttempt({ survey_id, company_id, evaluator_id }) {
  try {
    const data = await apiFetch('/attempts', {
      method: 'POST',
      body: {
        survey_id,
        company_id,
        evaluator_id
      }
    });
    return data;
  } catch (err) {
    console.error('Error al iniciar intento:', err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Obtener detalle del intento y respuestas guardadas.
 */
export async function getAttemptDetails(id) {
  try {
    const data = await apiFetch(`/attempts/${id}`, {
      method: 'GET'
    });
    return data;
  } catch (err) {
    console.error(`Error al obtener detalles del intento ${id}:`, err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Guarda respuestas parciales del evaluador.
 */
export async function savePartialAnswers(attemptId, answersArray) {
  if (!answersArray || answersArray.length === 0) {
    return { success: true };
  }

  try {
    const data = await apiFetch(`/attempts/${attemptId}/answers`, {
      method: 'POST',
      body: {
        answers: answersArray
      }
    });
    return data;
  } catch (err) {
    console.error(`Error al guardar respuestas parciales del intento ${attemptId}:`, err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Finaliza y califica el intento (Calcula madurez).
 */
export async function submitAttempt(id) {
  try {
    const data = await apiFetch(`/attempts/${id}/submit`, {
      method: 'POST'
    });
    return data;
  } catch (err) {
    console.error(`Error al finalizar intento ${id}:`, err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Historial de encuestas completadas por la empresa.
 */
export async function getCompanyAttemptHistory(companyId) {
  try {
    const data = await apiFetch(`/attempts/history/company/${companyId}`, {
      method: 'GET'
    });
    return data;
  } catch (err) {
    console.error(`Error al obtener historial de empresa ${companyId}:`, err.message);
    return { success: false, error: err.message, history: [] };
  }
}

/**
 * Obtiene todos los intentos de encuesta.
 */
export async function getSurveyAttempts() {
  try {
    const data = await apiFetch('/attempts', {
      method: 'GET'
    });
    return data || [];
  } catch (err) {
    console.error('Error al obtener todos los intentos:', err.message);
    return [];
  }
}

/**
 * Obtiene las respuestas de un intento específico.
 */
export async function getSurveyAnswers(attemptId) {
  try {
    const data = await apiFetch(`/attempts/${attemptId}/answers`, {
      method: 'GET'
    });
    return data || [];
  } catch (err) {
    console.error(`Error al obtener respuestas del intento ${attemptId}:`, err.message);
    return [];
  }
}
