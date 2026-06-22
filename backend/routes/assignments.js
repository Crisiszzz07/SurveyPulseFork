import express from 'express';
import crypto from 'crypto';
import pool from '../db.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// 1. Obtener lista de encuestas asignadas (Filtrado por evaluador/rol/empresa)
router.get('/', authenticateToken, async (req, res) => {
  const { evaluatorId, role } = req.query;

  try {
    let query = `
      SELECT sa.*, 
             s.titulo AS survey_titulo, s.descripcion AS survey_descripcion,
             u.nombre AS evaluator_nombre, u.apellido AS evaluator_apellido
      FROM "SurveyAssignment" sa
      LEFT JOIN "Survey" s ON sa.survey_id = s.id
      LEFT JOIN "User" u ON sa.evaluator_id = u.id
    `;
    const params = [];
    const conditions = [];

    if (role === 'EVALUATOR' && evaluatorId) {
      conditions.push(`sa.evaluator_id = $${conditions.length + 1}`);
      params.push(evaluatorId);
    }

    if (req.user.rol !== 'ADMIN' && req.user.empresa_id) {
      conditions.push(`u.empresa_id = $${conditions.length + 1}`);
      params.push(req.user.empresa_id);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY sa.created_at DESC';

    const assignmentsRes = await pool.query(query, params);

    const normalizedAssignments = assignmentsRes.rows.map(asg => ({
      ...asg,
      survey: asg.survey_titulo ? { titulo: asg.survey_titulo, descripcion: asg.survey_descripcion } : null,
      evaluator: asg.evaluator_nombre ? { nombre: asg.evaluator_nombre, apellido: asg.evaluator_apellido } : null
    }));

    res.json({ success: true, assignments: normalizedAssignments });
  } catch (error) {
    console.error('Error al obtener asignaciones:', error);
    res.status(500).json({ success: false, error: 'Error al obtener asignaciones de la base de datos.' });
  }
});

// 2. Asignar encuesta a un evaluador
router.post('/', authenticateToken, async (req, res) => {
  const { survey_id, evaluator_id, assigned_by, due_date } = req.body;

  if (!survey_id || !evaluator_id || !assigned_by) {
    return res.status(400).json({ success: false, error: 'Los campos survey_id, evaluator_id y assigned_by son requeridos.' });
  }

  if (req.user.rol !== 'ADMIN' && req.user.empresa_id) {
    try {
      const checkEval = await pool.query('SELECT empresa_id FROM "User" WHERE id = $1', [evaluator_id]);
      if (checkEval.rows.length === 0 || checkEval.rows[0].empresa_id !== req.user.empresa_id) {
        return res.status(403).json({ success: false, error: 'Solo puedes asignar encuestas a evaluadores de tu propia empresa.' });
      }
    } catch (err) {
      console.error('Error al verificar evaluador:', err);
      return res.status(500).json({ success: false, error: 'Error interno del servidor.' });
    }
  }

  try {
    const id = crypto.randomUUID();
    const insertRes = await pool.query(
      `INSERT INTO "SurveyAssignment" (id, survey_id, evaluator_id, assigned_by, due_date, status, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, 'PENDING', NOW(), NOW())
       RETURNING *`,
      [id, survey_id, evaluator_id, assigned_by, due_date || null]
    );

    res.status(201).json({
      success: true,
      assignment: insertRes.rows[0]
    });
  } catch (error) {
    console.error('Error al crear asignación:', error);
    res.status(500).json({ success: false, error: 'Error al crear la asignación en la base de datos.' });
  }
});

// 3. Modificar fechas límites o estados de asignación
router.put('/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { due_date, status } = req.body;

  if (!status) {
    return res.status(400).json({ success: false, error: 'El campo status es requerido.' });
  }

  if (req.user.rol !== 'ADMIN' && req.user.empresa_id) {
    try {
      const checkAsg = await pool.query(
        `SELECT sa.id FROM "SurveyAssignment" sa
         JOIN "User" u ON sa.evaluator_id = u.id
         WHERE sa.id = $1 AND u.empresa_id = $2`,
        [id, req.user.empresa_id]
      );
      if (checkAsg.rows.length === 0) {
        return res.status(403).json({ success: false, error: 'Acceso denegado.' });
      }
    } catch (err) {
      console.error('Error al verificar asignación:', err);
      return res.status(500).json({ success: false, error: 'Error interno del servidor.' });
    }
  }

  try {
    const updateRes = await pool.query(
      `UPDATE "SurveyAssignment"
       SET due_date = $1, status = $2, updated_at = NOW()
       WHERE id = $3
       RETURNING *`,
      [due_date || null, status, id]
    );

    if (updateRes.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Asignación no encontrada.' });
    }

    res.json({
      success: true,
      assignment: updateRes.rows[0]
    });
  } catch (error) {
    console.error(`Error al actualizar asignación ${id}:`, error);
    res.status(500).json({ success: false, error: 'Error al actualizar la asignación.' });
  }
});

// 4. Eliminar o cancelar una asignación
router.delete('/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;

  if (req.user.rol !== 'ADMIN' && req.user.empresa_id) {
    try {
      const checkAsg = await pool.query(
        `SELECT sa.id FROM "SurveyAssignment" sa
         JOIN "User" u ON sa.evaluator_id = u.id
         WHERE sa.id = $1 AND u.empresa_id = $2`,
        [id, req.user.empresa_id]
      );
      if (checkAsg.rows.length === 0) {
        return res.status(403).json({ success: false, error: 'Acceso denegado.' });
      }
    } catch (err) {
      console.error('Error al verificar asignación para eliminar:', err);
      return res.status(500).json({ success: false, error: 'Error interno del servidor.' });
    }
  }

  try {
    const deleteRes = await pool.query(
      'DELETE FROM "SurveyAssignment" WHERE id = $1 RETURNING id',
      [id]
    );

    if (deleteRes.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Asignación no encontrada para eliminar.' });
    }

    res.json({ success: true });
  } catch (error) {
    console.error(`Error al eliminar asignación ${id}:`, error);
    res.status(500).json({ success: false, error: 'Error al eliminar la asignación.' });
  }
});

export default router;
