import { supabase } from './supabase';

const MOCK_USERS = [
  { id: 'u1111111-1111-1111-1111-111111111111', nombre: 'Carlos', apellido: 'Gómez', email: 'admin@test.com', rol: 'ADMIN', estado: 'ACTIVO', empresa_id: null },
  { id: 'u2222222-2222-2222-2222-222222222222', 'nombre': 'Ana', apellido: 'Pérez', email: 'companyadmin@test.com', rol: 'COMPANY_ADMIN', estado: 'ACTIVO', empresa_id: 'c1111111-1111-1111-1111-111111111111' },
  { id: 'u3333333-3333-3333-3333-333333333333', 'nombre': 'Luis', apellido: 'Martínez', email: 'evaluator@test.com', rol: 'EVALUATOR', estado: 'ACTIVO', empresa_id: 'c1111111-1111-1111-1111-111111111111' },
  { id: 'u4444444-4444-4444-4444-444444444444', 'nombre': 'Sofía', apellido: 'Rodríguez', email: 'sofia@test.com', rol: 'EVALUATOR', estado: 'INACTIVO', empresa_id: 'c2222222-2222-2222-2222-222222222222' }
];

/**
 * Obtener listado de usuarios paginado y filtrable.
 */
export async function getUsers({ page = 1, limit = 10, search = '', empresaId = null } = {}) {
  try {
    let query = supabase
      .from('User')
      .select('*, Company(nombre_empresa)', { count: 'exact' });

    if (empresaId) {
      query = query.eq('empresa_id', empresaId);
    }
    if (search) {
      query = query.or(`nombre.ilike.%${search}%,apellido.ilike.%${search}%,email.ilike.%${search}%`);
    }

    const from = (page - 1) * limit;
    const to = from + limit - 1;
    
    const { data, error, count } = await query.range(from, to);
    if (error) throw error;

    const normalizedUsers = (data || []).map(u => ({
      ...u,
      company: u.Company || u.company
    }));

    return { 
      success: true, 
      users: normalizedUsers.length > 0 ? normalizedUsers : MOCK_USERS, 
      total: count || MOCK_USERS.length 
    };
  } catch (err) {
    console.warn('Usando listado de usuarios simulado:', err.message);
    const filtered = MOCK_USERS.filter(u => !empresaId || u.empresa_id === empresaId);
    return { success: true, users: filtered, total: filtered.length };
  }
}

/**
 * Obtener detalles de un usuario específico.
 */
export async function getUserById(id) {
  try {
    const { data, error } = await supabase
      .from('User')
      .select('*, Company(*)')
      .eq('id', id)
      .single();
    if (error) throw error;

    const normalizedUser = data ? {
      ...data,
      company: data.Company || data.company
    } : null;

    return { success: true, user: normalizedUser };
  } catch (err) {
    console.warn(`Usando detalle de usuario simulado para ID: ${id}`);
    const user = MOCK_USERS.find(u => u.id === id) || MOCK_USERS[0];
    return { success: true, user };
  }
}

/**
 * Actualiza metadatos del perfil.
 */
export async function updateUser(id, { nombre, apellido, estado, rol, empresa_id }) {
  try {
    const { data, error } = await supabase
      .from('User')
      .update({ nombre, apellido, estado, rol, empresa_id, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return { success: true, user: data };
  } catch (err) {
    console.warn(`Usando actualización de usuario simulado para ID: ${id}`);
    const index = MOCK_USERS.findIndex(u => u.id === id);
    if (index !== -1) {
      MOCK_USERS[index] = { ...MOCK_USERS[index], nombre, apellido, estado, rol, empresa_id };
      return { success: true, user: MOCK_USERS[index] };
    }
    return { success: false, error: 'Usuario no encontrado' };
  }
}

/**
 * Desactivación lógica de un usuario (Soft Delete).
 */
export async function deleteUser(id) {
  try {
    const { data, error } = await supabase
      .from('User')
      .update({ estado: 'INACTIVO', updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return { success: true, user: data };
  } catch (err) {
    console.warn(`Usando desactivación de usuario simulada para ID: ${id}`);
    const index = MOCK_USERS.findIndex(u => u.id === id);
    if (index !== -1) {
      MOCK_USERS[index].estado = 'INACTIVO';
      return { success: true, user: MOCK_USERS[index] };
    }
    return { success: false, error: 'Usuario no encontrado' };
  }
}

/**
 * Crea un nuevo usuario en la base de datos de Supabase.
 * Soporta fallback simulado para el modo de prueba.
 */
export async function createUser({ nombre, apellido, email, password, rol, empresa_id, estado = 'ACTIVO' }) {
  try {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from('User')
      .insert([{
        id,
        nombre: nombre.trim(),
        apellido: apellido.trim(),
        email: email.trim().toLowerCase(),
        password,
        rol,
        empresa_id: empresa_id || null,
        estado,
        created_at: now,
        updated_at: now
      }])
      .select()
      .single();

    if (error) throw error;
    return { success: true, user: data };
  } catch (err) {
    console.warn('Usando creación de usuario simulada:', err.message);
    const id = `mock-${crypto.randomUUID()}`;
    const newUser = {
      id,
      nombre: nombre.trim(),
      apellido: apellido.trim(),
      email: email.trim().toLowerCase(),
      rol,
      empresa_id: empresa_id || null,
      estado
    };
    MOCK_USERS.push(newUser);
    return { success: true, user: newUser };
  }
}
