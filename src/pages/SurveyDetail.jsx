import React, { useState } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import useSurveyResults from '../hooks/useSurveyResults';
import { deleteSurvey } from '../api/surveys';
import { useAuth } from '../hooks/useAuth';
import MaturityRadar from '../components/charts/MaturityRadar';
import AnswerPieChart from '../components/charts/AnswerPieChart';
import { Award, ClipboardCheck, PieChart, ChevronDown, ChevronUp, Archive, AlertTriangle, RefreshCw, X, Check, FileDown } from 'lucide-react';
import { translateMaturityLevel } from '../utils/dataTransformers';
import { generateSurveyPDF } from '../utils/pdfGenerator';

function ArchiveModal({ titulo, onConfirm, onClose }) {
  const [archiving, setArchiving] = useState(false);
  const handle = async () => { setArchiving(true); await onConfirm(); setArchiving(false); };
  return (
    <div
      onClick={e => e.target === e.currentTarget && onClose()}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        backgroundColor: 'rgba(0,0,0,0.70)', backdropFilter: 'blur(5px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem',
      }}
    >
      <div style={{
        background: 'var(--bg-card)', border: '1px solid rgba(239,68,68,0.35)',
        borderRadius: '1.25rem', width: '100%', maxWidth: '460px',
        boxShadow: '0 28px 72px rgba(0,0,0,0.55)', overflow: 'hidden',
      }}>
        <div style={{ height: 4, background: 'linear-gradient(90deg,#ef4444,#f97316)' }} />
        <div style={{ padding: '2rem', textAlign: 'center' }}>
          <div style={{
            width: 64, height: 64, borderRadius: '50%',
            background: 'rgba(239,68,68,0.10)', border: '1.5px solid rgba(239,68,68,0.30)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 1.25rem', boxShadow: '0 0 0 6px rgba(239,68,68,0.06)',
          }}>
            <Archive size={26} color="#ef4444" />
          </div>
          <h3 style={{ margin: '0 0 0.5rem', fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)' }}>
            Archivar encuesta
          </h3>
          <p style={{ margin: '0 0 0.4rem', color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: 1.6 }}>
            La encuesta <strong style={{ color: 'var(--text-primary)' }}>&#34;{titulo}&#34;</strong> quedará
            inactiva con estado <strong style={{ color: '#ef4444' }}>ARCHIVED</strong>.
          </p>
          <p style={{
            margin: '0 0 1.75rem', color: 'var(--text-muted)', fontSize: '0.82rem',
            background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.18)',
            borderRadius: '0.6rem', padding: '0.6rem 0.9rem',
          }}>
            <AlertTriangle size={13} style={{ verticalAlign: 'middle', marginRight: 5, color: '#ef4444' }} />
            Los datos e intentos existentes no se eliminarán.
          </p>
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
            <button onClick={onClose} style={{
              padding: '0.55rem 1.4rem', borderRadius: '9px',
              border: '1px solid var(--border)', background: 'rgba(255,255,255,0.04)',
              color: 'var(--text-secondary)', fontWeight: 600, fontSize: '0.875rem',
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
            }}>
              <X size={14} /> Cancelar
            </button>
            <button id="confirm-archive-detail" onClick={handle} disabled={archiving} style={{
              padding: '0.55rem 1.4rem', borderRadius: '9px', border: 'none',
              background: archiving ? 'rgba(239,68,68,0.5)' : 'linear-gradient(135deg,#ef4444,#f97316)',
              color: '#fff', fontWeight: 700, fontSize: '0.875rem',
              cursor: archiving ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', gap: 6,
              boxShadow: archiving ? 'none' : '0 4px 14px rgba(239,68,68,0.35)',
            }}>
              {archiving
                ? <><RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} /> Archivando…</>
                : <><Archive size={14} /> Sí, archivar</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export const SurveyDetail = () => {
  const { id } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const attemptId = searchParams.get('attempt');
  const navigate  = useNavigate();
  const { user }  = useAuth();
  const isAdmin   = user?.role === 'ADMIN';
  
  const {
    survey,
    attempts,
    selectedAttempt,
    answers,
    radarData,
    loading,
    selectAttempt,
    getQuestionDistribution
  } = useSurveyResults(id, attemptId);

  const [expandedQuestion, setExpandedQuestion] = useState(null);
  const [showArchiveModal, setShowArchiveModal]   = useState(false);
  const [archiveDone, setArchiveDone]             = useState(false);
  const [archiveError, setArchiveError]           = useState('');
  const [exportingPDF, setExportingPDF]           = useState(false);

  const handleExportPDF = async () => {
    if (!survey || !selectedAttempt) return;
    setExportingPDF(true);
    try {
      await generateSurveyPDF(
        survey.titulo,
        survey.descripcion || '',
        {
          company:    selectedAttempt.company?.nombre_empresa || 'Empresa Desconocida',
          date:       selectedAttempt.completed_at
                        ? new Date(selectedAttempt.completed_at).toLocaleDateString('es-CO')
                        : 'N/A',
          totalScore: selectedAttempt.total_score ?? 'N/A',
        },
        survey.questions || [],
        answers
      );
    } catch (err) {
      console.error('Error generando PDF:', err);
    } finally {
      setExportingPDF(false);
    }
  };

  if (loading) {
    return (
      <div className="page-loading">
        <div className="spinner"></div>
        <p>Cargando resultados de la encuesta...</p>
      </div>
    );
  }

  if (!survey) {
    return (
      <div className="page-container">
        <h2>Encuesta no encontrada</h2>
      </div>
    );
  }

  // Helper to find the score of a specific question in this attempt
  const getQuestionScore = (qId) => {
    const ans = answers.find(a => a.question_id === qId);
    return ans ? ans.score : '-';
  };

  // Helper to find the text response of a specific question in this attempt
  const getQuestionAnswerText = (qId) => {
    const ans = answers.find(a => a.question_id === qId);
    return ans ? ans.answer_text : 'Sin respuesta';
  };

  const handleAttemptChange = (e) => {
    selectAttempt(e.target.value);
    setSearchParams({ attempt: e.target.value });
  };

  const toggleQuestionDistribution = (qId) => {
    if (expandedQuestion === qId) {
      setExpandedQuestion(null);
    } else {
      setExpandedQuestion(qId);
    }
  };

  const handleArchiveConfirm = async () => {
    const res = await deleteSurvey(id);
    if (res.success) {
      setArchiveDone(true);
      setShowArchiveModal(false);
      setTimeout(() => navigate('/'), 1800);
    } else {
      setArchiveError('Error al archivar la encuesta.');
      setShowArchiveModal(false);
    }
  };

  return (
    <div className="page-container">
      {showArchiveModal && (
        <ArchiveModal
          titulo={survey.titulo}
          onConfirm={handleArchiveConfirm}
          onClose={() => setShowArchiveModal(false)}
        />
      )}

      {archiveDone && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '0.85rem 1.25rem', borderRadius: '0.75rem', marginBottom: '1rem',
          background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)',
          color: '#10b981', fontWeight: 600, fontSize: '0.875rem',
        }}>
          <Check size={16} /> Encuesta archivada. Redirigiendo al catálogo…
        </div>
      )}
      {archiveError && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '0.85rem 1.25rem', borderRadius: '0.75rem', marginBottom: '1rem',
          background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)',
          color: '#ef4444', fontWeight: 600, fontSize: '0.875rem',
        }}>
          <AlertTriangle size={16} /> {archiveError}
        </div>
      )}

      <header className="page-header">
        <div>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
            {survey.titulo}
            {(survey.status === 'ARCHIVED' || survey.is_active === false) && (
              <span style={{
                fontSize: '0.72rem', fontWeight: 700, padding: '3px 10px',
                borderRadius: '999px', background: 'rgba(107,114,128,0.15)',
                color: '#6b7280', border: '1px solid rgba(107,114,128,0.3)',
              }}>Archivada</span>
            )}
          </h1>
          <p className="page-subtitle">{survey.descripcion}</p>
        </div>
        <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Botón PDF individual */}
          {selectedAttempt && (
            <button
              id="export-survey-pdf"
              onClick={handleExportPDF}
              disabled={exportingPDF}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '0.5rem 1.1rem', borderRadius: '9px',
                background: exportingPDF ? 'rgba(99,102,241,0.5)' : 'rgba(99,102,241,0.12)',
                border: '1px solid rgba(99,102,241,0.35)',
                color: 'var(--primary-color)', fontWeight: 700, fontSize: '0.85rem',
                cursor: exportingPDF ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s',
              }}
              onMouseEnter={e => { if (!exportingPDF) e.currentTarget.style.backgroundColor = 'rgba(99,102,241,0.22)'; }}
              onMouseLeave={e => { if (!exportingPDF) e.currentTarget.style.backgroundColor = 'rgba(99,102,241,0.12)'; }}
            >
              {exportingPDF
                ? <><RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} /> Generando…</>
                : <><FileDown size={14} /> Exportar PDF</>
              }
            </button>
          )}

          {isAdmin && survey.status !== 'ARCHIVED' && survey.is_active !== false && (
            <button
              id="archive-survey-detail"
              onClick={() => setShowArchiveModal(true)}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '0.5rem 1.1rem', borderRadius: '9px',
                background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)',
                color: '#ef4444', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer',
                transition: 'all 0.2s',
              }}
              onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(239,68,68,0.18)'}
              onMouseLeave={e => e.currentTarget.style.backgroundColor = 'rgba(239,68,68,0.08)'}
            >
              <Archive size={15} /> Archivar encuesta
            </button>
          )}
        </div>
      </header>

      {/* Attempt Selector */}
      {attempts.length > 0 ? (
        <div className="selector-section">
          <label htmlFor="attempt-select">Selecciona el Reporte del Envío:</label>
          <div className="select-wrapper">
            <select 
              id="attempt-select" 
              value={selectedAttempt?.id || ''} 
              onChange={handleAttemptChange}
            >
              {attempts.map(att => (
                <option key={att.id} value={att.id}>
                  {att.company?.nombre_empresa || 'Empresa Desconocida'} - {new Date(att.completed_at).toLocaleDateString()} ({att.total_score}%)
                </option>
              ))}
            </select>
          </div>
        </div>
      ) : (
        <div className="info-alert">No hay intentos registrados para esta encuesta en la base de datos.</div>
      )}

      {selectedAttempt && (
        <div className="survey-detail-grid">
          {/* Attempt info & radar */}
          <div className="dashboard-card stats-radar-card">
            <div className="card-header">
              <h3>Resultado de {selectedAttempt.company?.nombre_empresa || 'Empresa Desconocida'}</h3>
              <p className="card-subtitle">Desglose de madurez general y por categorías.</p>
            </div>
            <div className="card-body">
              <div className="attempt-summary-badges">
                <div className="summary-badge">
                  <Award size={18} />
                  <span>Puntuación: <strong>{selectedAttempt.total_score}%</strong></span>
                </div>
                <div className="summary-badge">
                  <ClipboardCheck size={18} />
                  <span>Nivel: <strong>{translateMaturityLevel(selectedAttempt.maturity_level)}</strong></span>
                </div>
              </div>
              <MaturityRadar data={radarData} />
            </div>
          </div>

          {/* Question by question list */}
          <div className="dashboard-card questions-list-card">
            <div className="card-header">
              <h3>Respuestas por Pregunta</h3>
              <p className="card-subtitle">Puntuaciones individuales y distribución global.</p>
            </div>
            <div className="card-body">
              <div className="questions-list">
                {survey.questions.map((q, idx) => {
                  const score = getQuestionScore(q.id);
                  const isExpanded = expandedQuestion === q.id;
                  
                  return (
                    <div key={q.id} className="question-item-box">
                      <div className="question-item-header">
                        <div className="question-text-block">
                          <span className="question-index">Pregunta {idx + 1}</span>
                          <span className="question-cat-tag">{q.category?.name || 'General'}</span>
                          <p className="question-text">{q.pregunta}</p>
                        </div>
                        <div className="question-score-block">
                          <span className="score-label">Puntaje</span>
                          <span className="score-value">{score}/5</span>
                        </div>
                      </div>
                      
                      <div className="question-item-footer">
                        <div className="answer-text-preview">
                          <strong>Respuesta:</strong> "{getQuestionAnswerText(q.id)}"
                        </div>
                        <button 
                          className="view-distribution-btn"
                          onClick={() => toggleQuestionDistribution(q.id)}
                        >
                          <PieChart size={14} style={{ marginRight: '6px' }} />
                          <span>Distribución Global</span>
                          {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        </button>
                      </div>

                      {isExpanded && (
                        <div className="question-distribution-box">
                          <h4>Frecuencia de Respuestas en todas las Evaluaciones</h4>
                          <AnswerPieChart data={getQuestionDistribution(q.id)} />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SurveyDetail;
