const API_URL = import.meta.env.VITE_API_URL || 'https://gisistinfo.unicartagena.edu.co/api';

/**
 * Cliente HTTP personalizado para comunicarse con nuestro backend local.
 * Adjunta automáticamente el token JWT almacenado en localStorage.
 */
export async function apiFetch(endpoint, options = {}) {
  const token = localStorage.getItem('survey_dashboard_token');
  
  const headers = {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` }),
    ...options.headers,
  };

  const config = {
    ...options,
    headers,
  };

  if (config.body && typeof config.body === 'object') {
    config.body = JSON.stringify(config.body);
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...config
  });

  // Para respuestas sin cuerpo (ej: DELETE exitoso con status 204 o json vacio)
  if (response.status === 204) {
    return { success: true };
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || `Error del Servidor (Código HTTP: ${response.status})`);
  }

  return data;
}

// Exportamos un objeto ficticio por retrocompatibilidad temporal si fuera necesario
export const supabase = {};
export default apiFetch;
