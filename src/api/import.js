import { apiFetch } from './supabase';
import { createSurvey, createQuestions } from './surveys';

/**
 * Verifica si ya existe una encuesta activa con el mismo título en la base de datos local.
 */
export async function checkDuplicateSurvey(titulo) {
  try {
    const data = await apiFetch(`/surveys/check-duplicate?titulo=${encodeURIComponent(titulo.trim())}`, {
      method: 'GET'
    });
    return data.exists;
  } catch (err) {
    console.error('Error al verificar encuesta duplicada:', err.message);
    return false;
  }
}

/**
 * Obtiene los UUIDs de las categorías indicadas por nombre.
 * Si alguna categoría no existe en la BD, la crea automáticamente.
 */
export async function getOrCreateCategories(categoryNames) {
  try {
    const data = await apiFetch('/categories/get-or-create', {
      method: 'POST',
      body: {
        names: categoryNames
      }
    });
    return data.categoryMap || {};
  } catch (err) {
    console.error('Error en getOrCreateCategories:', err.message);
    throw err;
  }
}

/**
 * Realiza la importación completa de la encuesta, sus categorías, preguntas y opciones.
 */
export async function importSurvey({ surveyMeta, questions }) {
  try {
    // 1. Verificar duplicados
    const isDuplicate = await checkDuplicateSurvey(surveyMeta.titulo);
    if (isDuplicate) {
      return {
        success: false,
        error: `Ya existe una encuesta activa con el título "${surveyMeta.titulo}".`
      };
    }

    // 2. Obtener/crear categorías
    const categoryNames = questions.map(q => q.categoria_nombre);
    const categoryMap = await getOrCreateCategories(categoryNames);

    // 3. Crear encuesta
    const surveyMetaWithCreatedBy = {
      titulo: surveyMeta.titulo.trim(),
      descripcion: surveyMeta.descripcion?.trim() || null,
      status: surveyMeta.status || 'DRAFT',
      version: Number(surveyMeta.version || 1),
      created_by: surveyMeta.created_by
    };
    
    const surveyRes = await createSurvey(surveyMetaWithCreatedBy);

    if (!surveyRes.success) throw new Error(surveyRes.error || 'Error al registrar encuesta');

    const surveyId = surveyRes.survey.id;

    // 4. Crear preguntas y opciones
    const preparedQuestions = questions.map(q => ({
      pregunta: q.pregunta,
      tipo: q.tipo,
      categoria_id: categoryMap[q.categoria_nombre] || null, // Map a UUID
      categoria_indicador: q.categoria_indicador,
      requerida: q.obligatorio !== false,
      opciones: q.opciones || []
    }));

    if (preparedQuestions.length > 0) {
      const defaultCategoryId = Object.values(categoryMap)[0] || null;
      const qRes = await createQuestions(surveyId, preparedQuestions, defaultCategoryId);
      
      if (!qRes.success) {
        // Limpieza: intentar borrar la encuesta creada si fallaron las preguntas
        try {
          await apiFetch(`/surveys/${surveyId}`, {
            method: 'DELETE'
          });
        } catch (delErr) {
          console.warn('No se pudo limpiar la encuesta fallida:', delErr.message);
        }
        throw new Error(qRes.error || 'Error al registrar las preguntas de la encuesta');
      }
    }

    return { success: true, surveyId };
  } catch (err) {
    console.error('❌ Fallo en la importación de encuesta:', err);
    return { success: false, error: err.message };
  }
}
