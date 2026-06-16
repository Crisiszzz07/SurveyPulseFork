import express from 'express';
import bcrypt from 'bcryptjs';
import pool from '../db.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// 1. Obtener listado de usuarios paginado y filtrable
router.get('/', authenticateToken, async (req, res) => {
  const page = parseInt(req.query.page || '1', 10);
  const limit = parseInt(req.query.limit || '10', 10);
  const search = req.query.search || '';
  const empresaId = req.query.empresaId || null;

  const offset = (page - 1) * limit;

  try {
    let countQuery = 'SELECT COUNT(*) FROM "User" u';
    let dataQuery = `
      SELECT u.id, u.nombre, u.apellido, u.email, u.rol, u.empresa_id, u.estado, u.created_at, u.updated_at,
             c.nombre_empresa
      FROM "User" u
      LEFT JOIN "Company" c ON u.empresa_id = c.id
    `;
    
    const countParams = [];
    const dataParams = [];
    const conditions = [];

    if (empresaId) {
      conditions.push(`u.empresa_id = $${conditions.length + 1}`);
      countParams.push(empresaId);
      dataParams.push(empresaId);
    }

    if (search) {
      conditions.push(`(u.nombre ILIKE $${conditions.length + 1} OR u.apellido ILIKE $${conditions.length + 1} OR u.email ILIKE $${conditions.length + 1})`);
      const searchPattern = `%${search}%`;
      countParams.push(searchPattern);
      dataParams.push(searchPattern);
    }

    if (conditions.length > 0) {
      const conditionStr = ' WHERE ' + conditions.join(' AND ');
      countQuery += conditionStr;
      dataQuery += conditionStr;
    }

    // Agregar límites y paginación
    dataParams.push(limit);
    dataParams.push(offset);
    dataQuery += ` ORDER BY u.created_at DESC LIMIT $${dataParams.length - 1} OFFSET $${dataParams.length}`;

    // Ejecutar consultas
    const totalRes = await pool.query(countQuery, countParams);
    const total = parseInt(totalRes.rows[0].count, 10);

    const usersRes = await pool.query(dataQuery, dataParams);
    
    // Normalizar la respuesta para el frontend (colocar la empresa como objeto Company)
    const normalizedUsers = usersRes.rows.map(u => ({
      id: u.id,
      nombre: u.nombre,
      apellido: u.apellido,
      email: u.email,
      rol: u.rol,
      empresa_id: u.empresa_id,
      estado: u.estado,
      created_at: u.created_at,
      updated_at: u.updated_at,
      Company: u.nombre_empresa ? { nombre_empresa: u.nombre_empresa } : null,
      company: u.nombre_empresa ? { nombre_empresa: u.nombre_empresa } : null
    }));

    res.json({
      success: true,
      users: normalizedUsers,
      total
    });
  } catch (error) {
    console.error('Error al obtener usuarios:', error);
    res.status(500).json({ success: false, error: 'Error al obtener usuarios de la base de datos.' });
  }
});

// 2. Obtener detalles de un usuario específico
router.get('/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;

  try {
    const userRes = await pool.query(
      `SELECT u.id, u.nombre, u.apellido, u.email, u.rol, u.empresa_id, u.estado, u.created_at, u.updated_at,
              c.nombre_empresa, c.nit, c.sector, c.direccion, c.telefono, c.correo AS company_correo
       FROM "User" u
       LEFT JOIN "Company" c ON u.empresa_id = c.id
       WHERE u.id = $1`,
      [id]
    );

    if (userRes.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Usuario no encontrado.' });
    }

    const u = userRes.rows[0];
    const normalizedUser = {
      id: u.id,
      nombre: u.nombre,
      apellido: u.apellido,
      email: u.email,
      rol: u.rol,
      empresa_id: u.empresa_id,
      estado: u.estado,
      created_at: u.created_at,
      updated_at: u.updated_at,
      Company: u.empresa_id ? {
        id: u.empresa_id,
        nombre_empresa: u.nombre_empresa,
        nit: u.nit,
        sector: u.sector,
        direccion: u.direccion,
        telefono: u.telefono,
        correo: u.company_correo
      } : null,
      company: u.empresa_id ? {
        id: u.empresa_id,
        nombre_empresa: u.nombre_empresa,
        nit: u.nit,
        sector: u.sector,
        direccion: u.direccion,
        telefono: u.telefono,
        correo: u.company_correo
      } : null
    };

    res.json({
      success: true,
      user: normalizedUser
    });
  } catch (error) {
    console.error(`Error al obtener usuario ${id}:`, error);
    res.status(500).json({ success: false, error: 'Error al obtener detalles del usuario.' });
  }
});

// 3. Crear un nuevo usuario en la base de datos
router.post('/', authenticateToken, async (req, res) => {
  const { nombre, apellido, email, password, rol, empresa_id, estado = 'ACTIVO' } = req.body;

  if (!nombre || !apellido || !email || !password || !rol) {
    return res.status(400).json({ success: false, error: 'Todos los campos requeridos (nombre, apellido, email, password, rol) deben ser provistos.' });
  }

  try {
    // Verificar si el email ya existe
    const existsRes = await pool.query('SELECT id FROM "User" WHERE email = $1', [email.trim().toLowerCase()]);
    if (existsRes.rows.length > 0) {
      return res.status(400).json({ success: false, error: 'El correo electrónico ya está registrado.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const insertRes = await pool.query(
      `INSERT INTO "User" (nombre, apellido, email, password, rol, empresa_id, estado, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
       RETURNING id, nombre, apellido, email, rol, empresa_id, estado, created_at, updated_at`,
      [nombre.trim(), apellido.trim(), email.trim().toLowerCase(), hashedPassword, rol, empresa_id || null, estado]
    );

    res.status(201).json({
      success: true,
      user: insertRes.rows[0]
    });
  } catch (error) {
    console.error('Error al crear usuario:', error);
    res.status(500).json({ success: false, error: 'Error al crear el usuario en la base de datos.' });
  }
});

// 4. Actualizar metadatos del perfil de usuario
router.put('/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { nombre, apellido, estado, rol, empresa_id } = req.body;

  if (!nombre || !apellido || !rol) {
    return res.status(400).json({ success: false, error: 'Los campos nombre, apellido y rol son requeridos.' });
  }

  try {
    const updateRes = await pool.query(
      `UPDATE "User"
       SET nombre = $1, apellido = $2, estado = $3, rol = $4, empresa_id = $5, updated_at = NOW()
       WHERE id = $6
       RETURNING id, nombre, apellido, email, rol, empresa_id, estado, created_at, updated_at`,
      [nombre, apellido, estado || 'ACTIVO', rol, empresa_id || null, id]
    );

    if (updateRes.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Usuario no encontrado para actualizar.' });
    }

    res.json({
      success: true,
      user: updateRes.rows[0]
    });
  } catch (error) {
    console.error(`Error al actualizar usuario ${id}:`, error);
    res.status(500).json({ success: false, error: 'Error al actualizar el usuario.' });
  }
});

// 5. Desactivación lógica de un usuario (Soft Delete)
router.delete('/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;

  try {
    const deleteRes = await pool.query(
      `UPDATE "User"
       SET estado = 'INACTIVO', updated_at = NOW()
       WHERE id = $1
       RETURNING id, nombre, apellido, email, rol, empresa_id, estado, created_at, updated_at`,
      [id]
    );

    if (deleteRes.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Usuario no encontrado para desactivar.' });
    }

    res.json({
      success: true,
      user: deleteRes.rows[0]
    });
  } catch (error) {
    console.error(`Error al desactivar usuario ${id}:`, error);
    res.status(500).json({ success: false, error: 'Error al desactivar el usuario.' });
  }
});

export default router;
