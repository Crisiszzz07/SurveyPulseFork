import express from 'express';
import pool from '../db.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Helper para calcular nivel de madurez
function getMaturityLevel(percentage) {
  if (percentage < 40) return 'CRITICAL';
  if (percentage < 60) return 'LOW';
  if (percentage < 75) return 'MEDIUM';
  if (percentage < 90) return 'HIGH';
  return 'EXCELLENT';
}

// 1. Obtener todos los intentos de encuesta (con Company y Survey)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const attemptsRes = await pool.query(
      `SELECT a.*, 
              c.nombre_empresa, c.nit, c.sector,
              s.titulo AS survey_titulo
       FROM "SurveyAttempt" a
       LEFT JOIN "Company" c ON a.company_id = c.id
       LEFT JOIN "Survey" s ON a.survey_id = s.id
       ORDER BY a.completed_at DESC NULLS LAST, a.started_at DESC`
    );

    const normalizedData = attemptsRes.rows.map(att => ({
      ...att,
      company: att.nombre_empresa ? { nombre_empresa: att.nombre_empresa, nit: att.nit, sector: att.sector } : null,
      Company: att.nombre_empresa ? { nombre_empresa: att.nombre_empresa, nit: att.nit, sector: att.sector } : null,
      survey: att.survey_titulo ? { titulo: att.survey_titulo } : null,
      Survey: att.survey_titulo ? { titulo: att.survey_titulo } : null
    }));

    res.json(normalizedData);
  } catch (error) {
    console.error('Error al obtener intentos de encuesta:', error);
    res.status(500).json({ success: false, error: 'Error al obtener intentos de encuesta.' });
  }
});

// 2. Iniciar un nuevo intento de encuesta (status: IN_PROGRESS)
router.post('/', authenticateToken, async (req, res) => {
  const { survey_id, company_id, evaluator_id } = req.body;

  if (!survey_id || !company_id || !evaluator_id) {
    return res.status(400).json({ success: false, error: 'Los campos survey_id, company_id y evaluator_id son requeridos.' });
  }

  try {
    const insertRes = await pool.query(
      `INSERT INTO "SurveyAttempt" (survey_id, company_id, evaluator_id, status, started_at, created_at, updated_at)
       VALUES ($1, $2, $3, 'IN_PROGRESS', NOW(), NOW(), NOW())
       RETURNING *`,
      [survey_id, company_id, evaluator_id]
    );

    res.status(201).json({
      success: true,
      attempt: insertRes.rows[0]
    });
  } catch (error) {
    console.error('Error al iniciar intento de encuesta:', error);
    res.status(500).json({ success: false, error: 'Error al iniciar el intento de encuesta en la base de datos.' });
  }
});

// 3. Obtener detalle del intento y respuestas guardadas
router.get('/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;

  try {
    // 1. Obtener intento de encuesta
    const attemptRes = await pool.query(
      `SELECT a.*, 
              c.nombre_empresa, c.nit, c.sector, c.direccion, c.telefono, c.correo,
              s.titulo AS survey_titulo, s.descripcion AS survey_descripcion
       FROM "SurveyAttempt" a
       LEFT JOIN "Company" c ON a.company_id = c.id
       LEFT JOIN "Survey" s ON a.survey_id = s.id
       WHERE a.id = $1`,
      [id]
    );

    if (attemptRes.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Intento de encuesta no encontrado.' });
    }

    const attempt = attemptRes.rows[0];

    // 2. Obtener respuestas guardadas para este intento
    const answersRes = await pool.query(
      `SELECT sa.*, 
              qo.texto AS option_texto, qo.valor AS option_valor
       FROM "SurveyAnswer" sa
       LEFT JOIN "QuestionOption" qo ON sa.selected_option_id = qo.id
       WHERE sa.attempt_id = $1`,
      [id]
    );

    const normalizedAttempt = {
      ...attempt,
      company: attempt.nombre_empresa ? {
        id: attempt.company_id,
        nombre_empresa: attempt.nombre_empresa,
        nit: attempt.nit,
        sector: attempt.sector,
        direccion: attempt.direccion,
        telefono: attempt.telefono,
        correo: attempt.correo
      } : null,
      survey: attempt.survey_titulo ? {
        id: attempt.survey_id,
        titulo: attempt.survey_titulo,
        descripcion: attempt.survey_descripcion
      } : null
    };

    const normalizedAnswers = answersRes.rows.map(ans => ({
      ...ans,
      selected_option: ans.selected_option_id ? { id: ans.selected_option_id, texto: ans.option_texto, valor: ans.option_valor } : null,
      score: ans.numeric_value || ans.option_valor || 3
    }));

    res.json({
      success: true,
      attempt: normalizedAttempt,
      answers: normalizedAnswers
    });

  } catch (error) {
    console.error(`Error al obtener detalles del intento ${id}:`, error);
    res.status(500).json({ success: false, error: 'Error al obtener detalles del intento.' });
  }
});

// 4. Guarda respuestas parciales (DELETE e INSERT transaccional)
router.post('/:id/answers', authenticateToken, async (req, res) => {
  const { id: attemptId } = req.params;
  const { answers } = req.body; // Array de respuestas

  if (!answers || !Array.isArray(answers)) {
    return res.status(400).json({ success: false, error: 'Las respuestas son requeridas y deben ser un array.' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Borrar respuestas anteriores de este intento
    await client.query('DELETE FROM "SurveyAnswer" WHERE attempt_id = $1', [attemptId]);

    // 2. Insertar las respuestas actuales
    if (answers.length > 0) {
      for (const ans of answers) {
        const numericValue = ans.numeric_value != null ? Number(ans.numeric_value)
                           : ans.score != null ? Number(ans.score)
                           : null;

        await client.query(
          `INSERT INTO "SurveyAnswer" (attempt_id, question_id, selected_option_id, answer_text, numeric_value, created_at)
           VALUES ($1, $2, $3, $4, $5, NOW())`,
          [
            attemptId,
            ans.question_id,
            ans.selected_option_id || null,
            ans.answer_text || null,
            numericValue
          ]
        );
      }
    }

    await client.query('COMMIT');
    res.json({ success: true });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error(`Error al guardar respuestas del intento ${attemptId}:`, error);
    res.status(500).json({ success: false, error: 'Error al guardar respuestas en la base de datos: ' + error.message });
  } finally {
    client.release();
  }
});

// 5. Finaliza y califica el intento (Calcula madurez)
router.post('/:id/submit', authenticateToken, async (req, res) => {
  const { id } = req.params;

  try {
    // 1. Obtener todas las respuestas guardadas del intento
    const answersRes = await pool.query(
      'SELECT numeric_value FROM "SurveyAnswer" WHERE attempt_id = $1',
      [id]
    );

    const answers = answersRes.rows;
    if (answers.length === 0) {
      return res.status(400).json({ success: false, error: 'No se encontraron respuestas guardadas para este intento.' });
    }

    // 2. Calcular puntuación total y porcentaje (escala 1 a 5)
    const totalScoreSum = answers.reduce((acc, curr) => acc + Number(curr.numeric_value || 3), 0);
    const maxPossibleScore = answers.length * 5;
    const percentage = Math.round((totalScoreSum / maxPossibleScore) * 100);
    const level = getMaturityLevel(percentage);

    // 3. Actualizar la cabecera del intento
    const updateRes = await pool.query(
      `UPDATE "SurveyAttempt"
       SET status = 'COMPLETED',
           completed_at = NOW(),
           total_score = $1,
           percentage = $2,
           maturity_level = $3,
           updated_at = NOW()
       WHERE id = $4
       RETURNING *`,
      [percentage, percentage, level, id]
    );

    if (updateRes.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Intento de encuesta no encontrado.' });
    }

    res.json({
      success: true,
      attempt: updateRes.rows[0]
    });

  } catch (error) {
    console.error(`Error al enviar intento ${id}:`, error);
    res.status(500).json({ success: false, error: 'Error al procesar la calificación del intento.' });
  }
});

// 6. Historial de intentos completados de una empresa específica
router.get('/history/company/:companyId', authenticateToken, async (req, res) => {
  const { companyId } = req.params;

  try {
    const historyRes = await pool.query(
      `SELECT a.*,
              s.titulo AS survey_titulo, s.descripcion AS survey_descripcion
       FROM "SurveyAttempt" a
       LEFT JOIN "Survey" s ON a.survey_id = s.id
       WHERE a.company_id = $1 AND a.status = 'COMPLETED'
       ORDER BY a.completed_at DESC`,
      [companyId]
    );

    const history = historyRes.rows.map(att => ({
      ...att,
      survey: att.survey_titulo ? { titulo: att.survey_titulo, descripcion: att.survey_descripcion } : null
    }));

    res.json({ success: true, history });
  } catch (error) {
    console.error(`Error al obtener historial de empresa ${companyId}:`, error);
    res.status(500).json({ success: false, error: 'Error al obtener historial de intentos de la empresa.' });
  }
});

// 7. Obtener respuestas de un intento específico
router.get('/:id/answers', authenticateToken, async (req, res) => {
  const { id: attemptId } = req.params;

  try {
    const answersRes = await pool.query(
      `SELECT sa.*, 
              qo.texto AS option_texto, qo.valor AS option_valor
       FROM "SurveyAnswer" sa
       LEFT JOIN "QuestionOption" qo ON sa.selected_option_id = qo.id
       WHERE sa.attempt_id = $1`,
      [attemptId]
    );

    const normalizedAnswers = answersRes.rows.map(ans => ({
      ...ans,
      selected_option: ans.selected_option_id ? { texto: ans.option_texto, valor: ans.option_valor } : null,
      score: ans.numeric_value || ans.option_valor || 3
    }));

    res.json(normalizedAnswers);
  } catch (error) {
    console.error(`Error al obtener respuestas del intento ${attemptId}:`, error);
    res.status(500).json({ success: false, error: 'Error al obtener las respuestas.' });
  }
});

export default router;
