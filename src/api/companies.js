import { apiFetch } from './supabase';

/**
 * Obtener lista de empresas registradas (Paginado).
 */
export async function getCompanies({ page = 1, limit = 10, search = '' } = {}) {
  try {
    const data = await apiFetch(`/companies?page=${page}&limit=${limit}&search=${encodeURIComponent(search)}`, {
      method: 'GET'
    });
    return data;
  } catch (err) {
    console.error('Error al obtener empresas:', err.message);
    return { success: false, error: err.message, companies: [], total: 0 };
  }
}

/**
 * Registra una empresa directamente en el sistema.
 */
export async function createCompany({ nombre_empresa, nit, sector, direccion = null, telefono = null, correo }) {
  try {
    const data = await apiFetch('/companies', {
      method: 'POST',
      body: {
        nombre_empresa,
        nit,
        sector,
        direccion,
        telefono,
        correo
      }
    });
    return data;
  } catch (err) {
    console.error('Error al registrar empresa:', err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Obtiene metadatos y usuarios vinculados de la empresa.
 */
export async function getCompanyById(id) {
  try {
    const data = await apiFetch(`/companies/${id}`, {
      method: 'GET'
    });
    return data;
  } catch (err) {
    console.error(`Error al obtener empresa ${id}:`, err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Actualiza los datos de contacto corporativos.
 */
export async function updateCompany(id, { nombre_empresa, nit, sector, direccion, telefono, correo }) {
  try {
    const data = await apiFetch(`/companies/${id}`, {
      method: 'PUT',
      body: {
        nombre_empresa,
        nit,
        sector,
        direccion,
        telefono,
        correo
      }
    });
    return data;
  } catch (err) {
    console.error(`Error al actualizar empresa ${id}:`, err.message);
    return { success: false, error: err.message };
  }
}
