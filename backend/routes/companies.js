import express from 'express';
import pool from '../db.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// 1. Obtener lista de empresas registradas (Paginado y Filtrado)
router.get('/', authenticateToken, async (req, res) => {
  const page = parseInt(req.query.page || '1', 10);
  const limit = parseInt(req.query.limit || '10', 10);
  const search = req.query.search || '';

  const offset = (page - 1) * limit;

  try {
    let countQuery = 'SELECT COUNT(*) FROM "Company"';
    let dataQuery = 'SELECT * FROM "Company"';
    const params = [];
    const countParams = [];

    if (search) {
      const searchPattern = `%${search}%`;
      countQuery += ' WHERE nombre_empresa ILIKE $1 OR nit ILIKE $1 OR sector ILIKE $1';
      dataQuery += ' WHERE nombre_empresa ILIKE $1 OR nit ILIKE $1 OR sector ILIKE $1';
      params.push(searchPattern);
      countParams.push(searchPattern);
    }

    // Ordenar y paginar
    params.push(limit);
    params.push(offset);
    dataQuery += ` ORDER BY nombre_empresa ASC LIMIT $${params.length - 1} OFFSET $${params.length}`;

    const totalRes = await pool.query(countQuery, countParams);
    const total = parseInt(totalRes.rows[0].count, 10);

    const companiesRes = await pool.query(dataQuery, params);

    res.json({
      success: true,
      companies: companiesRes.rows,
      total
    });
  } catch (error) {
    console.error('Error al obtener empresas:', error);
    res.status(500).json({ success: false, error: 'Error al obtener las empresas de la base de datos.' });
  }
});

// 2. Obtener detalles y usuarios vinculados de una empresa
router.get('/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;

  try {
    // 1. Obtener datos de la empresa
    const companyRes = await pool.query('SELECT * FROM "Company" WHERE id = $1', [id]);
    if (companyRes.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Empresa no encontrada.' });
    }

    const company = companyRes.rows[0];

    // 2. Obtener usuarios vinculados
    const usersRes = await pool.query(
      'SELECT id, nombre, apellido, email, rol, estado FROM "User" WHERE empresa_id = $1',
      [id]
    );

    res.json({
      success: true,
      company: {
        ...company,
        users: usersRes.rows
      }
    });
  } catch (error) {
    console.error(`Error al obtener detalles de empresa ${id}:`, error);
    res.status(500).json({ success: false, error: 'Error al obtener detalles de la empresa.' });
  }
});

// 3. Registrar una nueva empresa
router.post('/', authenticateToken, async (req, res) => {
  const { nombre_empresa, nit, sector, direccion, telefono, correo } = req.body;

  if (!nombre_empresa || !nit || !sector || !correo) {
    return res.status(400).json({ success: false, error: 'Los campos nombre_empresa, nit, sector y correo son requeridos.' });
  }

  try {
    const insertRes = await pool.query(
      `INSERT INTO "Company" (nombre_empresa, nit, sector, direccion, telefono, correo, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())
       RETURNING *`,
      [nombre_empresa, nit, sector, direccion || null, telefono || null, correo]
    );

    res.status(201).json({
      success: true,
      company: insertRes.rows[0]
    });
  } catch (error) {
    console.error('Error al crear empresa:', error);
    res.status(500).json({ success: false, error: 'Error al registrar la empresa en la base de datos. Puede que el NIT ya esté registrado.' });
  }
});

// 4. Actualizar datos de contacto corporativos
router.put('/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { nombre_empresa, nit, sector, direccion, telefono, correo } = req.body;

  if (!nombre_empresa || !nit || !sector || !correo) {
    return res.status(400).json({ success: false, error: 'Los campos nombre_empresa, nit, sector y correo son requeridos.' });
  }

  try {
    const updateRes = await pool.query(
      `UPDATE "Company"
       SET nombre_empresa = $1, nit = $2, sector = $3, direccion = $4, telefono = $5, correo = $6, updated_at = NOW()
       WHERE id = $7
       RETURNING *`,
      [nombre_empresa, nit, sector, direccion || null, telefono || null, correo, id]
    );

    if (updateRes.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Empresa no encontrada para actualizar.' });
    }

    res.json({
      success: true,
      company: updateRes.rows[0]
    });
  } catch (error) {
    console.error(`Error al actualizar empresa ${id}:`, error);
    res.status(500).json({ success: false, error: 'Error al actualizar la empresa.' });
  }
});

export default router;
