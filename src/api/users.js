import { apiFetch } from './supabase';

/**
 * Obtener listado de usuarios paginado y filtrable.
 */
export async function getUsers({ page = 1, limit = 10, search = '', empresaId = null } = {}) {
  try {
    let url = `/users?page=${page}&limit=${limit}&search=${encodeURIComponent(search)}`;
    if (empresaId) {
      url += `&empresaId=${empresaId}`;
    }
    const data = await apiFetch(url, {
      method: 'GET'
    });
    return data;
  } catch (err) {
    console.error('Error al obtener usuarios:', err.message);
    return { success: false, error: err.message, users: [], total: 0 };
  }
}

/**
 * Obtener detalles de un usuario específico.
 */
export async function getUserById(id) {
  try {
    const data = await apiFetch(`/users/${id}`, {
      method: 'GET'
    });
    return data;
  } catch (err) {
    console.error(`Error al obtener usuario ${id}:`, err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Actualiza metadatos del perfil.
 */
export async function updateUser(id, { nombre, apellido, estado, rol, empresa_id }) {
  try {
    const data = await apiFetch(`/users/${id}`, {
      method: 'PUT',
      body: {
        nombre,
        apellido,
        estado,
        rol,
        empresa_id
      }
    });
    return data;
  } catch (err) {
    console.error(`Error al actualizar usuario ${id}:`, err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Desactivación lógica de un usuario (Soft Delete).
 */
export async function deleteUser(id) {
  try {
    const data = await apiFetch(`/users/${id}`, {
      method: 'DELETE'
    });
    return data;
  } catch (err) {
    console.error(`Error al desactivar usuario ${id}:`, err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Crea un nuevo usuario en la base de datos local.
 */
export async function createUser({ nombre, apellido, email, password, rol, empresa_id, estado = 'ACTIVO' }) {
  try {
    const data = await apiFetch('/users', {
      method: 'POST',
      body: {
        nombre,
        apellido,
        email,
        password,
        rol,
        empresa_id,
        estado
      }
    });
    return data;
  } catch (err) {
    console.error('Error al crear usuario:', err.message);
    return { success: false, error: err.message };
  }
}
