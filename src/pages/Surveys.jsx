import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getSurveys, deleteSurvey } from '../api/surveys';
import { createAttempt } from '../api/attempts';
import { getSurveyAttempts } from '../api/attempts';
import { useAuth } from '../hooks/useAuth';
import { generateGeneralPDF } from '../utils/pdfGenerator';
import {
  ClipboardList,
  ArrowRight,
  CalendarDays,
  Play,
  Plus,
  Archive,
  AlertTriangle,
  RefreshCw,
  Check,
  X,
  Upload,
  FileText,
} from 'lucide-react';

/* ─── Archive Confirm Modal ───────────────────────────────────── */
function ArchiveModal({ survey, onConfirm, onClose }) {
  const [archiving, setArchiving] = useState(false);

  const handle = async () => {
    setArchiving(true);
    await onConfirm(survey.id);
    setArchiving(false);
  };

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        backgroundColor: 'rgba(0,0,0,0.70)',
        backdropFilter: 'blur(5px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem',
        animation: 'fadeIn 0.18s ease',
      }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div style={{
        background: 'var(--bg-card)',
        border: '1px solid rgba(239,68,68,0.35)',
        borderRadius: '1.25rem',
        width: '100%', maxWidth: '460px',
        boxShadow: '0 28px 72px rgba(0,0,0,0.55)',
        overflow: 'hidden',
        animation: 'slideUp 0.22s ease',
      }}>
        {/* Top danger stripe */}
        <div style={{
          height: '4px',
          background: 'linear-gradient(90deg, #ef4444, #f97316)',
        }} />

        <div style={{ padding: '2rem', textAlign: 'center' }}>
          {/* Icon */}
          <div style={{
            width: 64, height: 64, borderRadius: '50%',
            background: 'rgba(239,68,68,0.10)',
            border: '1.5px solid rgba(239,68,68,0.30)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 1.25rem',
            boxShadow: '0 0 0 6px rgba(239,68,68,0.06)',
          }}>
            <Archive size={26} color="#ef4444" />
          </div>

          <h3 style={{ margin: '0 0 0.5rem', fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)' }}>
            ¿Archivar esta encuesta?
          </h3>
          <p style={{ margin: '0 0 0.35rem', color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: 1.6 }}>
            La encuesta{' '}
            <strong style={{ color: 'var(--text-primary)' }}>"{survey.titulo}"</strong>{' '}
            quedará inactiva y con estado{' '}
            <strong style={{ color: '#ef4444' }}>ARCHIVED</strong>.
          </p>
          <p style={{
            margin: '0 0 1.75rem', color: 'var(--text-muted)', fontSize: '0.82rem',
            background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.18)',
            borderRadius: '0.6rem', padding: '0.6rem 0.9rem',
          }}>
            <AlertTriangle size={13} style={{ verticalAlign: 'middle', marginRight: '5px', color: '#ef4444' }} />
            No se eliminarán los datos. Los intentos existentes seguirán disponibles.
          </p>

          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
            <button
              onClick={onClose}
              style={{
                padding: '0.55rem 1.4rem', borderRadius: '9px',
                border: '1px solid var(--border)',
                background: 'rgba(255,255,255,0.04)',
                color: 'var(--text-secondary)',
                fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: '6px', transition: 'all 0.2s',
              }}
            >
              <X size={14} /> Cancelar
            </button>

            <button
              id="confirm-archive-survey"
              onClick={handle}
              disabled={archiving}
              style={{
                padding: '0.55rem 1.4rem', borderRadius: '9px',
                border: 'none',
                background: archiving
                  ? 'rgba(239,68,68,0.5)'
                  : 'linear-gradient(135deg, #ef4444, #f97316)',
                color: '#fff',
                fontWeight: 700, fontSize: '0.875rem', cursor: archiving ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', gap: '6px',
                boxShadow: archiving ? 'none' : '0 4px 14px rgba(239,68,68,0.35)',
                transition: 'all 0.2s',
              }}
            >
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

/* ─── Toast ───────────────────────────────────────────────────── */
function Toast({ msg, type = 'success' }) {
  const bg = type === 'success' ? '#10b981' : type === 'warning' ? '#f59e0b' : '#ef4444';
  const Icon = type === 'success' ? Check : AlertTriangle;
  return (
    <div style={{
      position: 'fixed', top: '1.5rem', right: '1.5rem', zIndex: 2000,
      padding: '0.75rem 1.25rem', borderRadius: '10px',
      fontWeight: 600, fontSize: '0.875rem',
      display: 'flex', alignItems: 'center', gap: '8px',
      boxShadow: '0 8px 32px rgba(0,0,0,0.35)',
      backgroundColor: bg, color: '#fff',
      animation: 'fadeIn 0.2s ease',
    }}>
      <Icon size={16} /> {msg}
    </div>
  );
}

/* ─── Status Badge ────────────────────────────────────────────── */
function SurveyStatusBadge({ survey }) {
  const status = survey.status || (survey.is_active !== false ? 'ACTIVE' : 'ARCHIVED');
  const meta = {
    ACTIVE:   { label: 'Activa',    color: '#10b981', bg: '#10b98120' },
    DRAFT:    { label: 'Borrador',  color: '#f59e0b', bg: '#f59e0b20' },
    ARCHIVED: { label: 'Archivada', color: '#6b7280', bg: '#6b728020' },
  }[status] || { label: status, color: '#6b7280', bg: '#6b728020' };

  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '5px',
      padding: '3px 10px', borderRadius: '999px', fontSize: '0.72rem',
      fontWeight: 700, color: meta.color,
      backgroundColor: meta.bg, border: `1px solid ${meta.color}44`,
    }}>
      <span style={{
        width: 6, height: 6, borderRadius: '50%',
        backgroundColor: meta.color, display: 'inline-block',
      }} />
      {meta.label}
    </span>
  );
}

/* ═══════════════════════════════════════════════════════════════ */
/*  MAIN COMPONENT                                                  */
/* ═══════════════════════════════════════════════════════════════ */
export const Surveys = () => {
  const [surveys, setSurveys]           = useState([]);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState(null);
  const [archivingTarget, setArchivingTarget] = useState(null);
  const [toast, setToast]               = useState(null);
  const [isMockData, setIsMockData]     = useState(false);
  const [exportingPDF, setExportingPDF] = useState(false);

  const navigate  = useNavigate();
  const { user }  = useAuth();
  const isAdmin   = user?.role === 'ADMIN' || user?.role === 'COMPANY_ADMIN';

  /* ── Load surveys ── */
  const load = async () => {
    try {
      setLoading(true);
      const data = await getSurveys();  // returns real array or mock fallback
      const sorted = [...data].sort((a, b) => {
        const da = a.created_at || a.createdAt;
        const db = b.created_at || b.createdAt;
        if (!da || !db) return 0;
        return new Date(db) - new Date(da);
      });
      setSurveys(sorted);
      // Si todos los IDs empiezan con 'mock-', estamos en modo demo
      setIsMockData(sorted.length > 0 && sorted.every(s => s.id.startsWith('mock-')));
    } catch (err) {
      console.error(err);
      setError('Error cargando las encuestas');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  /* ── Soft Delete ── */
  const handleArchive = async (id) => {
    const res = await deleteSurvey(id);
    if (res.success) {
      setSurveys(prev =>
        prev.map(s => s.id === id
          ? { ...s, is_active: false, status: 'ARCHIVED' }
          : s
        )
      );
      showToast('Encuesta archivada correctamente.', 'warning');
    } else {
      showToast('Error al archivar la encuesta.', 'error');
    }
    setArchivingTarget(null);
  };

  /* ── Attempt start ── */
  const handleStartAttempt = async (surveyId) => {
    try {
      if (!user?.id) {
        showToast('Debes iniciar sesión con una cuenta registrada para responder encuestas.', 'error');
        return;
      }

      // The company_id: use the user's company if available, otherwise use first available company
      const companyId = user.empresa_id || '5d9dc581-64c4-40ad-a56c-740927393f35';

      const result = await createAttempt({
        survey_id:    surveyId,
        company_id:   companyId,
        evaluator_id: user.id,
      });

      if (result.success && result.attempt) {
        navigate(`/attempts/${result.attempt.id}/take`);
      } else {
        showToast(`Error al iniciar la encuesta: ${result.error || 'error desconocido'}`, 'error');
      }
    } catch (err) {
      console.error('Error al iniciar intento:', err);
      showToast('Error inesperado al iniciar la encuesta.', 'error');
    }
  };

  /* ── Toast helper ── */
  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3200);
  };

  /* ── Export General PDF ── */
  const handleExportGeneralPDF = async () => {
    if (exportingPDF) return;
    setExportingPDF(true);
    try {
      const allAttempts = await getSurveyAttempts();
      await generateGeneralPDF(surveys, allAttempts);
    } catch (err) {
      console.error('Error generando PDF general:', err);
      showToast('Error al generar el reporte PDF', 'error');
    } finally {
      setExportingPDF(false);
    }
  };

  /* ── Loading ── */
  if (loading) {
    return (
      <div className="page-loading">
        <div className="spinner" />
        <p>Cargando encuestas disponibles...</p>
      </div>
    );
  }

  /* ── Error ── */
  if (error) {
    return (
      <div className="page-container">
        <div className="error-state">
          <h2>Ocurrió un problema</h2>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  /* ── Empty ── */
  if (!surveys.length) {
    return (
      <div className="page-container">
        <div className="empty-state">
          <ClipboardList size={48} />
          <h2>No hay encuestas disponibles</h2>
          <p>Aún no existen encuestas registradas.</p>
          {isAdmin && (
            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
              <Link
                to="/surveys/import"
                className="btn-secondary"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  textDecoration: 'none',
                  padding: '0.6rem 1.25rem',
                  borderRadius: 'var(--border-radius)',
                  background: 'rgba(99, 102, 241, 0.1)',
                  border: '1px solid rgba(99, 102, 241, 0.3)',
                  color: 'var(--primary-color)',
                  fontSize: '0.88rem',
                  fontWeight: 600,
                  transition: 'all 0.2s'
                }}
              >
                <Upload size={14} /> Importar Excel
              </Link>
              <Link
                to="/surveys/new"
                className="btn-primary"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', textDecoration: 'none' }}
              >
                <Plus size={15} /> Crear primera encuesta
              </Link>
            </div>
          )}
        </div>
      </div>
    );
  }

  /* ── Main render ── */
  return (
    <div className="page-container">

      {/* Toast */}
      {toast && <Toast msg={toast.msg} type={toast.type} />}

      {/* Archive Modal */}
      {archivingTarget && (
        <ArchiveModal
          survey={archivingTarget}
          onConfirm={handleArchive}
          onClose={() => setArchivingTarget(null)}
        />
      )}

      <header className="page-header">
        <div>
          <h1>Catálogo de Encuestas</h1>
          <p className="page-subtitle">
            Selecciona una encuesta para explorar estadísticas e informes de respuestas.
          </p>
        </div>
        {isAdmin && (
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            {/* Botón PDF General */}
            <button
              id="export-general-pdf"
              onClick={handleExportGeneralPDF}
              disabled={exportingPDF}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '0.6rem 1.25rem',
                borderRadius: 'var(--border-radius)',
                background: exportingPDF ? 'rgba(16,185,129,0.5)' : 'rgba(16,185,129,0.1)',
                border: '1px solid rgba(16,185,129,0.35)',
                color: '#10b981',
                fontSize: '0.88rem',
                fontWeight: 700,
                cursor: exportingPDF ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s',
              }}
              onMouseEnter={e => { if (!exportingPDF) e.currentTarget.style.backgroundColor = 'rgba(16,185,129,0.2)'; }}
              onMouseLeave={e => { if (!exportingPDF) e.currentTarget.style.backgroundColor = 'rgba(16,185,129,0.1)'; }}
            >
              {exportingPDF
                ? <><RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} /> Generando…</>
                : <><FileText size={14} /> Reporte General PDF</>
              }
            </button>

            <Link
              to="/surveys/import"
              className="btn-secondary"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                textDecoration: 'none',
                padding: '0.6rem 1.25rem',
                borderRadius: 'var(--border-radius)',
                background: 'rgba(99, 102, 241, 0.1)',
                border: '1px solid rgba(99, 102, 241, 0.3)',
                color: 'var(--primary-color)',
                fontSize: '0.88rem',
                fontWeight: 600,
                transition: 'all 0.2s'
              }}
            >
              <Upload size={14} /> Importar Excel
            </Link>
            <Link
              to="/surveys/new"
              className="btn-primary"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', textDecoration: 'none' }}
            >
              <Plus size={15} /> Nueva Encuesta
            </Link>
          </div>
        )}
      </header>

      {/* Demo mode banner */}
      {isMockData && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: '10px',
          padding: '0.75rem 1.25rem', borderRadius: '0.75rem', marginBottom: '1rem',
          background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.3)',
          color: '#f59e0b', fontSize: '0.83rem', fontWeight: 600,
        }}>
          <AlertTriangle size={15} />
          Modo demostración — Sin conexión a Supabase. Configura{' '}
          <code style={{ background: 'rgba(245,158,11,0.15)', padding: '1px 5px', borderRadius: '4px' }}>
            VITE_SUPABASE_URL
          </code>{' '}y{' '}
          <code style={{ background: 'rgba(245,158,11,0.15)', padding: '1px 5px', borderRadius: '4px' }}>
            VITE_SUPABASE_ANON_KEY
          </code>{' '}en el archivo{' '}
          <code style={{ background: 'rgba(245,158,11,0.15)', padding: '1px 5px', borderRadius: '4px' }}>.env</code>.
        </div>
      )}

      <div className="surveys-grid">
        {surveys.map((survey) => {
          const questionsCount =
            survey.questions_count ??
            survey.questions?.length ??
            survey._count?.questions ??
            0;

          const isArchived = survey.status === 'ARCHIVED' || survey.is_active === false;

          return (
            <div
              key={survey.id}
              className="survey-card"
              style={{ opacity: isArchived ? 0.6 : 1, transition: 'opacity 0.3s' }}
            >
              {/* Header */}
              <div className="survey-card-header">
                <span className="survey-category-badge">
                  {survey.category || 'General'}
                </span>
                <ClipboardList size={24} className="survey-icon" />
              </div>

              {/* Body */}
              <div className="survey-card-body">
                <h3 style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', flexWrap: 'wrap' }}>
                  {survey.titulo}
                  {isArchived && (
                    <span style={{
                      fontSize: '0.68rem', fontWeight: 700, padding: '2px 8px',
                      borderRadius: '999px', background: 'rgba(107,114,128,0.15)',
                      color: '#6b7280', border: '1px solid rgba(107,114,128,0.3)',
                      whiteSpace: 'nowrap', alignSelf: 'center',
                    }}>
                      Archivada
                    </span>
                  )}
                </h3>

                <p>{survey.descripcion || 'Sin descripción disponible'}</p>

                {/* Status badge */}
                <div className="survey-status-container">
                  <SurveyStatusBadge survey={survey} />
                  {survey.version && (
                    <span style={{
                      fontSize: '0.72rem', fontWeight: 600, color: 'var(--accent)',
                      background: 'rgba(168,85,247,0.1)', padding: '2px 8px',
                      borderRadius: '999px', border: '1px solid rgba(168,85,247,0.25)',
                    }}>
                      v{survey.version}
                    </span>
                  )}
                </div>

                {/* Date */}
                {(survey.created_at || survey.createdAt) && (
                  <div className="survey-date">
                    <CalendarDays size={14} />
                    <span>
                      {new Date(survey.created_at || survey.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div
                className="survey-card-footer"
                style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  borderTop: '1px solid var(--border-color)',
                  paddingTop: '1rem', marginTop: 'auto',
                }}
              >
                <div className="survey-stats">
                  <span className="questions-count" style={{ fontSize: '0.85rem' }}>
                    <strong>{questionsCount}</strong> preguntas
                  </span>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                  {/* Analyze */}
                  <Link
                    to={`/surveys/${survey.id}`}
                    className="survey-action-btn"
                    style={{ fontSize: '0.85rem' }}
                  >
                    <span>Analizar</span>
                    <ArrowRight size={14} />
                  </Link>

                  {/* Respond — only if active */}
                  {!isArchived && (
                    <button
                      id={`start-attempt-${survey.id}`}
                      onClick={() => handleStartAttempt(survey.id)}
                      className="survey-action-btn"
                      style={{
                        background: 'var(--primary-light)',
                        border: '1px solid var(--primary-color)',
                        color: 'var(--primary-color)',
                        padding: '0.35rem 0.75rem', borderRadius: '6px',
                        fontSize: '0.85rem', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', gap: '0.35rem',
                        fontWeight: 600, fontFamily: 'var(--font-sans)',
                      }}
                    >
                      <Play size={12} fill="var(--primary-color)" />
                      <span>Responder</span>
                    </button>
                  )}

                  {/* Archive — only for ADMIN and non-archived */}
                  {isAdmin && !isArchived && (
                    <button
                      id={`archive-survey-${survey.id}`}
                      title="Archivar encuesta"
                      onClick={() => setArchivingTarget(survey)}
                      style={{
                        background: 'rgba(239,68,68,0.08)',
                        border: '1px solid rgba(239,68,68,0.22)',
                        color: '#ef4444', borderRadius: '7px',
                        padding: '0.35rem 0.65rem', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', gap: '4px',
                        fontSize: '0.8rem', fontWeight: 600, transition: 'all 0.2s',
                      }}
                      onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(239,68,68,0.18)'}
                      onMouseLeave={e => e.currentTarget.style.backgroundColor = 'rgba(239,68,68,0.08)'}
                    >
                      <Archive size={13} />
                      <span>Archivar</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Surveys;