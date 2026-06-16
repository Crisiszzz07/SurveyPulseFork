import { apiFetch } from './supabase';

/**
 * Lista de encuestas asignadas a responder (Filtrado opcional por evaluador o rol).
 */
export async function getAssignments({ evaluatorId = null, role = 'EVALUATOR' } = {}) {
  try {
    let url = `/assignments?role=${role}`;
    if (evaluatorId) {
      url += `&evaluatorId=${evaluatorId}`;
    }
    const data = await apiFetch(url, {
      method: 'GET'
    });
    return data;
  } catch (err) {
    console.error('Error al obtener asignaciones:', err.message);
    return { success: false, error: err.message, assignments: [] };
  }
}

/**
 * Asigna encuesta a un evaluador de la empresa.
 */
export async function createAssignment({ survey_id, evaluator_id, assigned_by, due_date }) {
  try {
    const data = await apiFetch('/assignments', {
      method: 'POST',
      body: {
        survey_id,
        evaluator_id,
        assigned_by,
        due_date
      }
    });
    return data;
  } catch (err) {
    console.error('Error al crear asignación:', err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Modifica fechas límites o estados de asignación.
 */
export async function updateAssignment(id, { due_date, status }) {
  try {
    const data = await apiFetch(`/assignments/${id}`, {
      method: 'PUT',
      body: {
        due_date,
        status
      }
    });
    return data;
  } catch (err) {
    console.error(`Error al actualizar asignación ${id}:`, err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Elimina o cancela una asignación.
 */
export async function deleteAssignment(id) {
  try {
    const data = await apiFetch(`/assignments/${id}`, {
      method: 'DELETE'
    });
    return data;
  } catch (err) {
    console.error(`Error al eliminar asignación ${id}:`, err.message);
    return { success: false, error: err.message };
  }
}
