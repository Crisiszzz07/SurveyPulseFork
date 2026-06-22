import express from 'express';
import crypto from 'crypto';
import pool from '../db.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// 1. Obtener todas las categorías principales
router.get('/', authenticateToken, async (req, res) => {
  try {
    const categoriesRes = await pool.query(
      'SELECT * FROM "Category" ORDER BY name ASC'
    );
    res.json({ success: true, categories: categoriesRes.rows });
  } catch (error) {
    console.error('Error al obtener categorías:', error);
    res.status(500).json({ success: false, error: 'Error al obtener categorías.' });
  }
});

// 2. Obtener o crear categorías en bloque (para la importación de encuestas)
router.post('/get-or-create', authenticateToken, async (req, res) => {
  const { names } = req.body;

  if (!names || !Array.isArray(names)) {
    return res.status(400).json({ success: false, error: 'Se requiere una lista de nombres de categorías.' });
  }

  const uniqueNames = [...new Set(names.map(n => n.trim()))].filter(Boolean);
  if (uniqueNames.length === 0) {
    return res.json({ success: true, categoryMap: {} });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Consultar categorías existentes
    const existingRes = await client.query('SELECT id, name FROM "Category"');
    const existingMap = {};
    existingRes.rows.forEach(cat => {
      existingMap[cat.name.toLowerCase().trim()] = cat.id;
    });

    const categoryMap = {};

    // 2. Para cada nombre, si no existe, lo creamos
    for (const name of uniqueNames) {
      const normalizedName = name.toLowerCase().trim();
      if (!existingMap[normalizedName]) {
        const id = crypto.randomUUID();
        const insertRes = await client.query(
          `INSERT INTO "Category" (id, name, description, updated_at) 
           VALUES ($1, $2, $3, NOW()) 
           RETURNING id, name`,
          [id, name, 'Categoría importada automáticamente']
        );
        const newCat = insertRes.rows[0];
        existingMap[normalizedName] = newCat.id;
      }
      categoryMap[name] = existingMap[normalizedName];
    }

    await client.query('COMMIT');
    res.json({ success: true, categoryMap });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error en get-or-create categorías:', error);
    res.status(500).json({ success: false, error: 'Error al procesar las categorías.' });
  } finally {
    client.release();
  }
});

export default router;
