import express from 'express';
import crypto from 'crypto';
import pool from '../db.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// 1. Obtener todas las encuestas activas
router.get('/', authenticateToken, async (req, res) => {
  try {
    const surveysRes = await pool.query(
      `SELECT s.*, COALESCE(q.q_count, 0)::integer AS questions_count
       FROM "Survey" s
       LEFT JOIN (
         SELECT survey_id, COUNT(*) AS q_count
         FROM "Question"
         GROUP BY survey_id
       ) q ON s.id = q.survey_id
       WHERE s.is_active = true
       ORDER BY s.created_at DESC`
    );
    res.json(surveysRes.rows);
  } catch (error) {
    console.error('Error al obtener encuestas:', error);
    res.status(500).json({ success: false, error: 'Error al obtener encuestas.' });
  }
});

// 1.5 Verificar si existe una encuesta por título
router.get('/check-duplicate', authenticateToken, async (req, res) => {
  const { titulo } = req.query;
  if (!titulo) {
    return res.status(400).json({ success: false, error: 'El parámetro titulo es requerido.' });
  }

  try {
    const checkRes = await pool.query(
      'SELECT id FROM "Survey" WHERE titulo = $1 AND is_active = true LIMIT 1',
      [titulo.trim()]
    );
    res.json({ success: true, exists: checkRes.rows.length > 0 });
  } catch (error) {
    console.error('Error al verificar duplicado de encuesta:', error);
    res.status(500).json({ success: false, error: 'Error al verificar duplicado.' });
  }
});

// 2. Obtener detalles de una encuesta con preguntas y opciones
router.get('/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;

  try {
    // 1. Obtener datos de la encuesta
    const surveyRes = await pool.query('SELECT * FROM "Survey" WHERE id = $1', [id]);
    if (surveyRes.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Encuesta no encontrada.' });
    }

    const survey = surveyRes.rows[0];

    // 2. Obtener preguntas con su categoría
    const questionsRes = await pool.query(
      `SELECT q.id, q.pregunta, q.tipo, q.obligatorio, q.orden, q.categoria_indicador, q.category_id,
              c.name AS category_name
       FROM "Question" q
       LEFT JOIN "Category" c ON q.category_id = c.id
       WHERE q.survey_id = $1
       ORDER BY q.orden ASC`,
      [id]
    );

    const questions = questionsRes.rows;

    if (questions.length > 0) {
      // 3. Obtener opciones para todas las preguntas de esta encuesta
      const questionIds = questions.map(q => q.id);
      const optionsRes = await pool.query(
        `SELECT id, question_id, texto, valor 
         FROM "QuestionOption" 
         WHERE question_id = ANY($1)`,
        [questionIds]
      );

      const options = optionsRes.rows;

      // Unir opciones y categorías con cada pregunta
      questions.forEach(q => {
        q.requerida = q.obligatorio; // alias de compatibilidad para TakeSurvey
        q.Category = q.category_name ? { id: q.category_id, name: q.category_name } : null;
        q.category = q.category_name ? { id: q.category_id, name: q.category_name } : null;
        q.QuestionOption = options.filter(opt => opt.question_id === q.id);
        q.options = q.QuestionOption; // alias de compatibilidad para TakeSurvey
      });
    }

    res.json({
      ...survey,
      questions
    });
  } catch (error) {
    console.error(`Error al obtener detalles de encuesta ${id}:`, error);
    res.status(500).json({ success: false, error: 'Error al obtener detalles de la encuesta.' });
  }
});

// 3. Crear una nueva encuesta de diagnóstico
router.post('/', authenticateToken, async (req, res) => {
  const { titulo, descripcion, created_by, status = 'DRAFT', version = 1 } = req.body;

  if (!titulo || !created_by) {
    return res.status(400).json({ success: false, error: 'El título y el creador de la encuesta son requeridos.' });
  }

  try {
    const id = crypto.randomUUID();
    const insertRes = await pool.query(
      `INSERT INTO "Survey" (id, titulo, descripcion, version, is_active, status, created_by, updated_at)
       VALUES ($1, $2, $3, $4, true, $5, $6, NOW())
       RETURNING *`,
      [id, titulo, descripcion || null, version, status, created_by]
    );

    res.status(201).json({
      success: true,
      survey: insertRes.rows[0]
    });
  } catch (error) {
    console.error('Error al crear encuesta:', error);
    res.status(500).json({ success: false, error: 'Error al crear la encuesta en la base de datos.' });
  }
});

// 4. Crear preguntas y opciones para una encuesta (Transaccional)
router.post('/:id/questions', authenticateToken, async (req, res) => {
  const { id: surveyId } = req.params;
  const { questions, defaultCategoryId } = req.body;

  if (!questions || !Array.isArray(questions)) {
    return res.status(400).json({ success: false, error: 'La lista de preguntas es inválida.' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const insertedQuestions = [];

    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      const categoryId = q.categoria_id || defaultCategoryId;

      if (!categoryId) {
        throw new Error(`La pregunta "${q.pregunta}" no tiene un category_id válido.`);
      }

      // Insertar pregunta
      const questionId = crypto.randomUUID();
      const qRes = await client.query(
        `INSERT INTO "Question" (id, survey_id, category_id, pregunta, tipo, orden, obligatorio, categoria_indicador)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING *`,
        [
          questionId,
          surveyId,
          categoryId,
          q.pregunta.trim(),
          q.tipo || 'LIKERT',
          i + 1,
          q.requerida !== false, // mapeado desde frontend a "obligatorio"
          q.categoria_indicador || null
        ]
      );

      const dbQ = qRes.rows[0];
      insertedQuestions.push(dbQ);

      // Insertar opciones de la pregunta si las hay
      if (q.opciones && Array.isArray(q.opciones)) {
        for (const opt of q.opciones) {
          const optionId = crypto.randomUUID();
          await client.query(
            `INSERT INTO "QuestionOption" (id, question_id, texto, valor)
             VALUES ($1, $2, $3, $4)`,
            [optionId, dbQ.id, opt.texto, Number(opt.valor)]
          );
        }
      }
    }

    await client.query('COMMIT');

    res.status(201).json({
      success: true,
      questions: insertedQuestions
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error al insertar preguntas:', error);
    res.status(500).json({ success: false, error: 'Error al insertar preguntas en la base de datos: ' + error.message });
  } finally {
    client.release();
  }
});

// 5. Modificar datos de una encuesta
router.put('/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { titulo, descripcion, status, is_active } = req.body;

  if (!titulo) {
    return res.status(400).json({ success: false, error: 'El título es requerido.' });
  }

  try {
    const updateRes = await pool.query(
      `UPDATE "Survey"
       SET titulo = $1, descripcion = $2, status = $3, is_active = $4, updated_at = NOW()
       WHERE id = $5
       RETURNING *`,
      [titulo, descripcion || null, status, is_active !== false, id]
    );

    if (updateRes.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Encuesta no encontrada.' });
    }

    res.json({
      success: true,
      survey: updateRes.rows[0]
    });
  } catch (error) {
    console.error(`Error al actualizar encuesta ${id}:`, error);
    res.status(500).json({ success: false, error: 'Error al actualizar la encuesta.' });
  }
});

// 6. Desactivar y archivar encuesta (Soft Delete)
router.delete('/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;

  try {
    const deleteRes = await pool.query(
      `UPDATE "Survey"
       SET is_active = false, status = 'ARCHIVED', updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [id]
    );

    if (deleteRes.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Encuesta no encontrada.' });
    }

    res.json({
      success: true,
      survey: deleteRes.rows[0]
    });
  } catch (error) {
    console.error(`Error al archivar encuesta ${id}:`, error);
    res.status(500).json({ success: false, error: 'Error al archivar la encuesta.' });
  }
});

export default router;
