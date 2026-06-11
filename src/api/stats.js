import { supabase } from './supabase';
import { getSurveyAttempts, getSurveyAnswers } from './attempts';
import { groupStatsByCompany, transformAnswersToCategoryRadar, getAnswerDistribution } from '../utils/dataTransformers';
import { getSurveyDetail } from './surveys';

/**
 * Obtiene promedios globales por categoría, benchmarking y ranking.
 * [ADMIN]
 */
export async function getGlobalStats() {
  try {
    const attempts = await getSurveyAttempts();
    
    // 1. Promedio global general
    const totalAttempts = attempts.length;
    const avgScoreGlobal = Math.round(attempts.reduce((acc, curr) => acc + (curr.total_score || 0), 0) / (totalAttempts || 1));
    
    // 2. Ranking de empresas
    const companyStats = groupStatsByCompany(attempts);
    const ranking = [...companyStats].sort((a, b) => b.averagePercentage - a.averagePercentage);
    
    // 3. Distribución global de niveles de madurez
    const distribution = attempts.reduce((acc, curr) => {
      const level = curr.maturity_level || 'MEDIUM';
      acc[level] = (acc[level] || 0) + 1;
      return acc;
    }, {});

    // 4. Benchmarking de categorías
    // Hacemos una aproximación estática de las categorías promedio
    const categoryAverages = [
      { subject: 'Planificación', score: 68, fullMark: 100 },
      { subject: 'Mejora Continua', score: 74, fullMark: 100 },
      { subject: 'Roles', score: 80, fullMark: 100 },
      { subject: 'Métricas', score: 55, fullMark: 100 },
      { subject: 'Ingeniería', score: 62, fullMark: 100 }
    ];

    return {
      success: true,
      totalAttempts,
      avgScoreGlobal,
      ranking,
      distribution,
      categoryAverages
    };
  } catch (err) {
    console.error('Error al obtener estadísticas globales:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Dashboard corporativo para una empresa (Radar y línea de tiempo).
 * [ADMIN / COMPANY_ADMIN]
 */
export async function getCompanyStats(companyId) {
  try {
    const attempts = await getSurveyAttempts();
    // En Supabase filtraríamos por el id de la empresa. Para mock filtramos por nombre o id ficticio
    // Suponemos que companyId mapea a un nombre de empresa en los mocks
    const companyAttempts = attempts.filter(att => 
      att.company_id === companyId || 
      att.company?.nombre_empresa.toLowerCase() === companyId.toLowerCase()
    );

    if (companyAttempts.length === 0) {
      return { success: false, error: 'Empresa no encontrada o sin intentos' };
    }

    const companyName = companyAttempts[0].company?.nombre_empresa || 'Empresa';
    const nit = companyAttempts[0].company?.nit || '';
    const sector = companyAttempts[0].company?.sector || '';
    
    const attemptsCount = companyAttempts.length;
    const averageScore = Math.round(companyAttempts.reduce((acc, curr) => acc + (curr.total_score || 0), 0) / (attemptsCount || 1));

    // Línea de tiempo
    const timeline = companyAttempts.map(att => ({
      attemptId: att.id,
      completed_at: att.completed_at,
      total_score: att.total_score,
      maturity_level: att.maturity_level
    })).sort((a, b) => new Date(a.completed_at) - new Date(b.completed_at));

    // Promedio Radar de la empresa (mock basado en sus intentos)
    const companyRadar = [
      { subject: 'Planificación', score: Math.round(averageScore * 0.95), fullMark: 100 },
      { subject: 'Mejora Continua', score: Math.round(averageScore * 1.05), fullMark: 100 },
      { subject: 'Roles', score: Math.round(averageScore * 1.1), fullMark: 100 },
      { subject: 'Métricas', score: Math.round(averageScore * 0.8), fullMark: 100 },
      { subject: 'Ingeniería', score: Math.round(averageScore * 0.9), fullMark: 100 }
    ];

    return {
      success: true,
      company: {
        id: companyId,
        nombre_empresa: companyName,
        nit,
        sector
      },
      attemptsCount,
      averageScore,
      timeline,
      companyRadar
    };
  } catch (err) {
    console.error('Error al obtener estadísticas de empresa:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Análisis de frecuencia y promedios por pregunta de una encuesta.
 * [ADMIN / COMPANY_ADMIN]
 */
export async function getSurveyStats(surveyId) {
  try {
    const surveyDetail = await getSurveyDetail(surveyId);
    const attempts = await getSurveyAttempts();
    const surveyAttempts = attempts.filter(att => att.survey_id === surveyId && att.status === 'COMPLETED');
    
    const totalAttempts = surveyAttempts.length;
    const avgScore = Math.round(surveyAttempts.reduce((acc, curr) => acc + (curr.total_score || 0), 0) / (totalAttempts || 1));

    // Mapear frecuencia de respuestas por pregunta
    const questionStats = surveyDetail.questions.map(q => {
      // Simular algunas distribuciones de respuestas para la pregunta
      const distribution = [
        { name: 'Excelente (5)', value: 12 },
        { name: 'Bueno (4)', value: 18 },
        { name: 'Regular (3)', value: 8 },
        { name: 'Bajo (2)', value: 4 },
        { name: 'Crítico (1)', value: 2 }
      ];

      const averageScore = 3.8; // Puntaje promedio simulado de la pregunta (escala 1-5)

      return {
        questionId: q.id,
        pregunta: q.pregunta,
        category: q.category?.name || 'General',
        averageScore,
        distribution
      };
    });

    return {
      success: true,
      survey: {
        id: surveyId,
        titulo: surveyDetail.titulo,
        descripcion: surveyDetail.descripcion
      },
      totalAttempts,
      avgScore,
      questions: questionStats
    };
  } catch (err) {
    console.error('Error al obtener estadísticas de encuesta:', err);
    return { success: false, error: err.message };
  }
}
export { getSurveyAttempts, getSurveyAnswers };
export default getGlobalStats;