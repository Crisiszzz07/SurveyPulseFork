import { apiFetch } from './supabase';

/**
 * Lista las categorías principales de la cadena de suministro/diagnóstico.
 */
export async function getCategories() {
  try {
    const data = await apiFetch('/categories', {
      method: 'GET'
    });
    return data;
  } catch (err) {
    console.error('Error al obtener categorías:', err.message);
    return { success: false, error: err.message, categories: [] };
  }
}
