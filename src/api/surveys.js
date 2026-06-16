import { apiFetch } from './supabase';

/**
 * Lista todas las encuestas activas.
 */
export async function getSurveys() {
  try {
    const data = await apiFetch('/surveys', {
      method: 'GET'
    });
    return data || [];
  } catch (err) {
    console.error('Error al obtener encuestas:', err.message);
    return [];
  }
}

/**
 * Obtiene el detalle de una encuesta con sus preguntas y opciones.
 */
export async function getSurveyDetail(surveyId) {
  try {
    const data = await apiFetch(`/surveys/${surveyId}`, {
      method: 'GET'
    });
    return data;
  } catch (err) {
    console.error(`Error al obtener encuesta ${surveyId}:`, err.message);
    throw err;
  }
}

/**
 * Crear una nueva encuesta de diagnóstico.
 */
export async function createSurvey({ titulo, descripcion, created_by, status = 'DRAFT', version = 1 }) {
  try {
    const data = await apiFetch('/surveys', {
      method: 'POST',
      body: {
        titulo,
        descripcion,
        created_by,
        status,
        version
      }
    });
    return data;
  } catch (err) {
    console.error('Error al crear encuesta:', err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Crear preguntas para una encuesta recién creada.
 */
export async function createQuestions(surveyId, questions, defaultCategoryId) {
  try {
    const data = await apiFetch(`/surveys/${surveyId}/questions`, {
      method: 'POST',
      body: {
        questions,
        defaultCategoryId
      }
    });
    return data;
  } catch (err) {
    console.error(`Error al crear preguntas para encuesta ${surveyId}:`, err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Modifica datos/metadatos de la encuesta.
 */
export async function updateSurvey(id, { titulo, descripcion, status, is_active }) {
  try {
    const data = await apiFetch(`/surveys/${id}`, {
      method: 'PUT',
      body: {
        titulo,
        descripcion,
        status,
        is_active
      }
    });
    return data;
  } catch (err) {
    console.error(`Error al actualizar encuesta ${id}:`, err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Desactiva y archiva una encuesta (Soft Delete).
 */
export async function deleteSurvey(id) {
  try {
    const data = await apiFetch(`/surveys/${id}`, {
      method: 'DELETE'
    });
    return data;
  } catch (err) {
    console.error(`Error al archivar encuesta ${id}:`, err.message);
    return { success: false, error: err.message };
  }
}