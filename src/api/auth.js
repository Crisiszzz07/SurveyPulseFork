import { apiFetch } from './supabase';

/**
 * Registra un nuevo usuario en el sistema.
 * Si el rol es COMPANY_ADMIN, creará también la empresa.
 */
export async function registerUser({ email, password, nombre, apellido, rol, nombreEmpresa, nitEmpresa, sectorEmpresa }) {
  try {
    const data = await apiFetch('/auth/register', {
      method: 'POST',
      body: {
        email,
        password,
        nombre,
        apellido,
        rol,
        nombreEmpresa,
        nitEmpresa,
        sectorEmpresa
      }
    });
    return data;
  } catch (err) {
    console.error('Error en registro:', err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Inicia sesión y devuelve la sesión de usuario.
 */
export async function loginUser(email, password) {
  try {
    const data = await apiFetch('/auth/login', {
      method: 'POST',
      body: { email, password }
    });
    
    if (data.success && data.token) {
      localStorage.setItem('survey_dashboard_token', data.token);
    }
    
    return data;
  } catch (err) {
    console.error('Error al iniciar sesión:', err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Cierra la sesión activa.
 */
export async function logoutUser() {
  try {
    await apiFetch('/auth/logout', { method: 'POST' });
  } catch (err) {
    console.warn('Error al hacer logout en backend:', err.message);
  } finally {
    localStorage.removeItem('survey_dashboard_token');
  }
  return { success: true };
}

/**
 * Emite nuevos tokens refrescando la sesión. (Simulado)
 */
export async function refreshSession() {
  return { success: true };
}

/**
 * Solicita enlace de recuperación de contraseña.
 */
export async function recoverPassword(email) {
  try {
    const data = await apiFetch('/auth/recover', {
      method: 'POST',
      body: { email }
    });
    return data;
  } catch (err) {
    console.error('Error al solicitar recuperación:', err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Restablece la contraseña definitiva.
 */
export async function resetPassword(newPassword) {
  try {
    const data = await apiFetch('/auth/reset-password', {
      method: 'POST',
      body: { password: newPassword }
    });
    return data;
  } catch (err) {
    console.error('Error al reestablecer contraseña:', err.message);
    return { success: false, error: err.message };
  }
}
