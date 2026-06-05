import { supabase } from './supabase';
import { createSurvey, createQuestions } from './surveys';

/**
 * Verifica si ya existe una encuesta activa con el mismo título en Supabase.
 */
export async function checkDuplicateSurvey(titulo) {
  try {
    const { data, error } = await supabase
      .from('Survey')
      .select('id')
      .eq('titulo', titulo.trim())
      .eq('is_active', true)
      .limit(1);

    if (error) throw error;
    return data && data.length > 0;
  } catch (err) {
    console.warn('⚠️ No se pudo verificar duplicado en BD, asumiendo falso para demo:', err.message);
    return false;
  }
}

/**
 * Obtiene los UUIDs de las categorías indicadas por nombre.
 * Si alguna categoría no existe en la BD, la crea automáticamente.
 */
export async function getOrCreateCategories(categoryNames) {
  const uniqueNames = [...new Set(categoryNames.map(n => n.trim()))].filter(Boolean);
  const nameToId = {};

  if (uniqueNames.length === 0) {
    return nameToId;
  }

  try {
    // 1. Obtener todas las categorías existentes
    const { data: existing, error: selectErr } = await supabase
      .from('Category')
      .select('id, name');

    if (selectErr) throw selectErr;

    const existingMap = {};
    if (existing) {
      existing.forEach(cat => {
        existingMap[cat.name.toLowerCase().trim()] = cat.id;
      });
    }

    // 2. Identificar cuáles faltan por crear
    const missingNames = uniqueNames.filter(name => !existingMap[name.toLowerCase().trim()]);

    if (missingNames.length > 0) {
      // Insertar las categorías faltantes en lote
      const insertPayload = missingNames.map(name => ({
        id: crypto.randomUUID(),
        name,
        description: `Categoría importada automáticamente`
      }));

      const { data: inserted, error: insertErr } = await supabase
        .from('Category')
        .insert(insertPayload)
        .select('id, name');

      if (insertErr) throw insertErr;

      if (inserted) {
        inserted.forEach(cat => {
          existingMap[cat.name.toLowerCase().trim()] = cat.id;
        });
      }
    }

    // 3. Mapear todos los nombres de entrada a sus respectivos UUIDs
    uniqueNames.forEach(name => {
      nameToId[name] = existingMap[name.toLowerCase().trim()];
    });

    return nameToId;
  } catch (err) {
    console.warn('⚠️ Error al obtener/crear categorías en Supabase, simulando IDs para demo:', err.message);
    // Simular IDs para modo demostración
    uniqueNames.forEach((name, i) => {
      nameToId[name] = `mock-cat-${i + 1}`;
    });
    return nameToId;
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
    const surveyRes = await createSurvey({
      titulo: surveyMeta.titulo.trim(),
      descripcion: surveyMeta.descripcion?.trim() || null,
      status: surveyMeta.status || 'DRAFT',
      version: Number(surveyMeta.version || 1),
      created_by: surveyMeta.created_by,
    });

    if (!surveyRes.success) throw new Error(surveyRes.error || 'Error al registrar encuesta');

    const surveyId = surveyRes.survey.id;
    const isMock = surveyId.startsWith('mock-');

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
        // Limpieza si no es mock (intentar revertir inserción de la encuesta)
        if (!isMock) {
          await supabase.from('Survey').delete().eq('id', surveyId);
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
