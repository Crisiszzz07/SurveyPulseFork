import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getGlobalStats, getSurveyAttempts } from '../api/stats';
import { getSurveys } from '../api/surveys';
import { ClipboardList, TrendingUp, Users, Calendar, Award } from 'lucide-react';
import ScoreBarChart from '../components/charts/ScoreBarChart';
import { translateMaturityLevel } from '../utils/dataTransformers';

export const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [recentAttempts, setRecentAttempts] = useState([]);
  const [surveysMap, setSurveysMap] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const globalStats = await getGlobalStats();
        setStats(globalStats);

        const attempts = await getSurveyAttempts();
        setRecentAttempts(attempts.slice(0, 5)); // show top 5 recent

        const surveys = await getSurveys();
        const sMap = surveys.reduce((acc, curr) => {
          acc[curr.id] = curr.titulo;
          return acc;
        }, {});
        setSurveysMap(sMap);
      } catch (err) {
        console.error('Error cargando métricas de dashboard:', err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  if (loading) {
    return (
      <div className="page-loading">
        <div className="spinner"></div>
        <p>Generando métricas consolidadas...</p>
      </div>
    );
  }

  // Convert distribution object into array format for chart
  const distributionChartData = stats 
    ? Object.keys(stats.distribution).map(key => ({
        name: translateMaturityLevel(key),
        averageScore: stats.distribution[key] * 20, // arbitrary value to show on bar chart for visual
        total_score: stats.distribution[key] // actual count
      }))
    : [];

  return (
    <div className="page-container">
      <header className="page-header">
        <div>
          <h1>Métricas Globales</h1>
          <p className="page-subtitle">Panel consolidado de rendimiento, niveles de madurez y participación de empresas.</p>
        </div>
      </header>

      {/* KPI Cards Grid */}
      <div className="kpis-grid">
        <div className="kpi-card">
          <div className="kpi-header">
            <span className="kpi-icon-wrapper blue">
              <ClipboardList size={22} />
            </span>
            <span className="kpi-title">Formularios Completados</span>
          </div>
          <div className="kpi-value">{stats?.totalAttempts || 0}</div>
          <div className="kpi-desc">Intentos totales registrados</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-header">
            <span className="kpi-icon-wrapper green">
              <TrendingUp size={22} />
            </span>
            <span className="kpi-title">Puntaje Promedio General</span>
          </div>
          <div className="kpi-value">{stats?.avgScoreGlobal || 0}%</div>
          <div className="kpi-desc">Nivel de madurez global</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-header">
            <span className="kpi-icon-wrapper purple">
              <Users size={22} />
            </span>
            <span className="kpi-title">Empresas Participantes</span>
          </div>
          <div className="kpi-value">{stats?.ranking?.length || 0}</div>
          <div className="kpi-desc">Organizaciones evaluadas</div>
        </div>
      </div>

      <div className="dashboard-charts-section">
        {/* Main Chart */}
        <div className="dashboard-card chart-card">
          <div className="card-header">
            <h3>Distribución de Niveles de Madurez</h3>
            <p className="card-subtitle">Número de evaluaciones según categoría de madurez obtenida.</p>
          </div>
          <div className="card-body">
            <ScoreBarChart data={distributionChartData} />
          </div>
        </div>

        {/* Recent Attempts Table */}
        <div className="dashboard-card list-card">
          <div className="card-header">
            <h3>Evaluaciones Recientes</h3>
            <p className="card-subtitle">Últimos envíos completados por las empresas.</p>
          </div>
          <div className="card-body">
            <div className="recent-list">
              {recentAttempts.map((attempt) => (
                <div key={attempt.id} className="recent-item">
                  <div className="item-meta">
                    <span className="item-company">{attempt.company?.nombre_empresa || 'Empresa Desconocida'}</span>
                    <span className="item-survey">{surveysMap[attempt.survey_id] || 'Encuesta general'}</span>
                  </div>
                  <div className="item-results">
                    <span className={`maturity-tag ${attempt.maturity_level?.toLowerCase()}`}>
                      <Award size={12} style={{ marginRight: '4px' }} />
                      {translateMaturityLevel(attempt.maturity_level)}
                    </span>
                    <span className="item-score">{attempt.total_score}%</span>
                    <Link to={`/surveys/${attempt.survey_id}?attempt=${attempt.id}`} className="item-link" title="Ver reporte">
                      Ver reporte
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
