import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import useCompanyStats from '../hooks/useCompanyStats';
import { getSurveys } from '../api/surveys';
import { getCompanies, createCompany } from '../api/companies';
import { useAuth } from '../hooks/useAuth';
import {
  Building2, Calendar, ExternalLink,
  Plus, X, Check, AlertTriangle, RefreshCw,
  Briefcase, Phone, Mail, MapPin, Hash,
} from 'lucide-react';
import ScoreBarChart from '../components/charts/ScoreBarChart';
import { translateMaturityLevel } from '../utils/dataTransformers';

/* ─── Sectores sugeridos ──────────────────────────────────────── */
const SECTORES = [
  'TI & Desarrollo', 'Software', 'Finanzas', 'Comercio', 'Salud',
  'Educación', 'Manufactura', 'Logística', 'Energía', 'Telecomunicaciones',
  'Consultoría', 'Agropecuario', 'Gobierno', 'Otro',
];

/* ─── Toast ───────────────────────────────────────────────────── */
function Toast({ msg, type = 'success', onClose }) {
  const colors = {
    success: { bg: '#10b981', Icon: Check },
    error:   { bg: '#ef4444', Icon: AlertTriangle },
    warning: { bg: '#f59e0b', Icon: AlertTriangle },
  };
  const { bg, Icon } = colors[type] || colors.success;
  return (
    <div style={{
      position: 'fixed', top: '1.5rem', right: '1.5rem', zIndex: 3000,
      padding: '0.75rem 1.25rem', borderRadius: '10px',
      fontWeight: 600, fontSize: '0.875rem',
      display: 'flex', alignItems: 'center', gap: '8px',
      boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
      backgroundColor: bg, color: '#fff',
      animation: 'fadeIn 0.2s ease', cursor: 'pointer',
    }} onClick={onClose}>
      <Icon size={16} /> {msg}
    </div>
  );
}

/* ─── Input row helper ────────────────────────────────────────── */
function Field({ label, required, icon: Icon, children }) {
  return (
    <div className="form-group" style={{ marginBottom: 0 }}>
      <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
        {Icon && <Icon size={13} style={{ color: 'var(--accent)', opacity: 0.8 }} />}
        {label} {required && <span style={{ color: '#ef4444' }}>*</span>}
      </label>
      {children}
    </div>
  );
}

/* ─── Register Company Modal ──────────────────────────────────── */
function RegisterCompanyModal({ onSuccess, onClose }) {
  const [form, setForm] = useState({
    nombre_empresa: '',
    nit:            '',
    sector:         '',
    sectorCustom:   '',
    correo:         '',
    telefono:       '',
    direccion:      '',
  });
  const [saving, setSaving]   = useState(false);
  const [errors, setErrors]   = useState({});
  const [apiError, setApiError] = useState('');

  const set = (k, v) => {
    setForm(f => ({ ...f, [k]: v }));
    setErrors(e => ({ ...e, [k]: '' }));
  };

  /* Validation */
  const validate = () => {
    const errs = {};
    if (!form.nombre_empresa.trim())         errs.nombre_empresa = 'El nombre es obligatorio.';
    if (form.nombre_empresa.trim().length < 3) errs.nombre_empresa = 'Mínimo 3 caracteres.';
    if (!form.nit.trim())                    errs.nit = 'El NIT es obligatorio.';
    if (!/^[\d.\-]+$/.test(form.nit.trim())) errs.nit = 'Formato inválido. Ej: 900.123.456-7';
    if (!form.sector && !form.sectorCustom)  errs.sector = 'Selecciona o escribe un sector.';
    if (!form.correo.trim())                 errs.correo = 'El correo es obligatorio.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.correo)) errs.correo = 'Correo inválido.';
    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }

    setSaving(true);
    setApiError('');
    const sector = form.sector === 'Otro' ? form.sectorCustom : form.sector;
    const res = await createCompany({
      nombre_empresa: form.nombre_empresa.trim(),
      nit:            form.nit.trim(),
      sector,
      correo:         form.correo.trim(),
      telefono:       form.telefono.trim() || null,
      direccion:      form.direccion.trim() || null,
    });

    setSaving(false);
    if (res.success) {
      onSuccess(res.company);
    } else {
      setApiError(res.error || 'Error al registrar la empresa. Verifica las credenciales de Supabase.');
    }
  };

  const inputStyle = (field) => ({
    marginBottom: 0,
    borderColor: errors[field] ? 'rgba(239,68,68,0.6)' : undefined,
    boxShadow:   errors[field] ? '0 0 0 3px rgba(239,68,68,0.12)' : undefined,
  });

  return (
    <div
      onClick={e => e.target === e.currentTarget && onClose()}
      style={{
        position: 'fixed', inset: 0, zIndex: 2000,
        backgroundColor: 'rgba(0,0,0,0.70)', backdropFilter: 'blur(5px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem',
        animation: 'fadeIn 0.18s ease',
      }}
    >
      <div style={{
        background: 'var(--bg-card)',
        border: '1px solid rgba(168,85,247,0.25)',
        borderRadius: '1.25rem',
        width: '100%', maxWidth: '560px',
        maxHeight: '90vh', overflowY: 'auto',
        boxShadow: '0 32px 80px rgba(0,0,0,0.55)',
        animation: 'slideUp 0.22s ease',
      }}>
        {/* Top accent stripe */}
        <div style={{ height: 4, background: 'linear-gradient(90deg,#a855f7,#3b82f6)' }} />

        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '1.35rem 1.5rem',
          borderBottom: '1px solid var(--border)',
          background: 'linear-gradient(135deg, rgba(168,85,247,0.06), rgba(59,130,246,0.04))',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{
              width: 42, height: 42, borderRadius: '10px',
              background: 'rgba(168,85,247,0.12)', border: '1px solid rgba(168,85,247,0.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Building2 size={20} style={{ color: 'var(--accent)' }} />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                Registrar Empresa
              </h2>
              <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                Nueva organización en el sistema
              </p>
            </div>
          </div>
          <button onClick={onClose} style={{
            background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)',
            borderRadius: '8px', padding: '0.4rem', cursor: 'pointer',
            color: 'var(--text-muted)', display: 'flex', alignItems: 'center',
            transition: 'all 0.2s',
          }}>
            <X size={18} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{
          padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem',
        }}>

          {/* Nombre */}
          <Field label="Nombre de la empresa" required icon={Briefcase}>
            <input
              id="company-nombre"
              className="form-input"
              placeholder="Ej: TechCorp Solutions S.A.S"
              value={form.nombre_empresa}
              onChange={e => set('nombre_empresa', e.target.value)}
              style={inputStyle('nombre_empresa')}
            />
            {errors.nombre_empresa && (
              <span style={{ fontSize: '0.76rem', color: '#ef4444', marginTop: '3px', display: 'block' }}>
                {errors.nombre_empresa}
              </span>
            )}
          </Field>

          {/* NIT */}
          <Field label="NIT" required icon={Hash}>
            <input
              id="company-nit"
              className="form-input"
              placeholder="Ej: 900.123.456-7"
              value={form.nit}
              onChange={e => set('nit', e.target.value)}
              style={inputStyle('nit')}
            />
            {errors.nit && (
              <span style={{ fontSize: '0.76rem', color: '#ef4444', marginTop: '3px', display: 'block' }}>
                {errors.nit}
              </span>
            )}
          </Field>

          {/* Sector */}
          <Field label="Sector" required icon={Briefcase}>
            <select
              id="company-sector"
              className="form-select"
              value={form.sector}
              onChange={e => set('sector', e.target.value)}
              style={{ ...inputStyle('sector'), marginBottom: 0 }}
            >
              <option value="">— Selecciona un sector —</option>
              {SECTORES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            {form.sector === 'Otro' && (
              <input
                className="form-input"
                placeholder="Escribe el sector"
                value={form.sectorCustom}
                onChange={e => set('sectorCustom', e.target.value)}
                style={{ marginTop: '0.5rem', marginBottom: 0 }}
              />
            )}
            {errors.sector && (
              <span style={{ fontSize: '0.76rem', color: '#ef4444', marginTop: '3px', display: 'block' }}>
                {errors.sector}
              </span>
            )}
          </Field>

          {/* Correo */}
          <Field label="Correo corporativo" required icon={Mail}>
            <input
              id="company-correo"
              className="form-input"
              type="email"
              placeholder="contacto@empresa.com"
              value={form.correo}
              onChange={e => set('correo', e.target.value)}
              style={inputStyle('correo')}
            />
            {errors.correo && (
              <span style={{ fontSize: '0.76rem', color: '#ef4444', marginTop: '3px', display: 'block' }}>
                {errors.correo}
              </span>
            )}
          </Field>

          {/* Telefono + Dirección en grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <Field label="Teléfono" icon={Phone}>
              <input
                id="company-telefono"
                className="form-input"
                placeholder="555-0199"
                value={form.telefono}
                onChange={e => set('telefono', e.target.value)}
                style={{ marginBottom: 0 }}
              />
            </Field>
            <Field label="Dirección" icon={MapPin}>
              <input
                id="company-direccion"
                className="form-input"
                placeholder="Calle 100 #15-30"
                value={form.direccion}
                onChange={e => set('direccion', e.target.value)}
                style={{ marginBottom: 0 }}
              />
            </Field>
          </div>

          {/* API error */}
          {apiError && (
            <div style={{
              display: 'flex', alignItems: 'flex-start', gap: '8px',
              background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)',
              borderRadius: '8px', padding: '0.7rem 1rem',
              color: '#ef4444', fontSize: '0.82rem', lineHeight: 1.5,
            }}>
              <AlertTriangle size={15} style={{ flexShrink: 0, marginTop: '1px' }} />
              {apiError}
            </div>
          )}

          {/* Divider */}
          <div style={{ borderTop: '1px solid var(--border)', margin: '0.25rem 0' }} />

          {/* Actions */}
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
            <button type="button" onClick={onClose} style={{
              padding: '0.55rem 1.25rem', borderRadius: '9px',
              border: '1px solid var(--border)', background: 'rgba(255,255,255,0.04)',
              color: 'var(--text-secondary)', fontWeight: 600, fontSize: '0.875rem',
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px',
            }}>
              <X size={14} /> Cancelar
            </button>
            <button
              id="submit-register-company"
              type="submit"
              disabled={saving}
              style={{
                padding: '0.55rem 1.5rem', borderRadius: '9px', border: 'none',
                background: saving
                  ? 'rgba(168,85,247,0.4)'
                  : 'linear-gradient(135deg, #a855f7, #3b82f6)',
                color: '#fff', fontWeight: 700, fontSize: '0.875rem',
                cursor: saving ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', gap: '6px',
                boxShadow: saving ? 'none' : '0 4px 14px rgba(168,85,247,0.35)',
                transition: 'all 0.2s',
              }}
            >
              {saving
                ? <><RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} /> Registrando…</>
                : <><Check size={14} /> Registrar Empresa</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════ */
/*  MAIN PAGE                                                       */
/* ═══════════════════════════════════════════════════════════════ */
export const CompanyView = () => {
  const { companiesStats, loading } = useCompanyStats();
  const { user }  = useAuth();
  const isAdmin   = user?.role === 'ADMIN';

  const [selectedCompany, setSelectedCompany] = useState(null);
  const [surveysMap, setSurveysMap]           = useState({});
  const [showModal, setShowModal]             = useState(false);
  const [toast, setToast]                     = useState(null);
  /* Local list of registered companies for the selector,
     merged with companiesStats (which come from attempts) */
  const [extraCompanies, setExtraCompanies]   = useState([]);

  /* Load survey titles */
  useEffect(() => {
    async function loadSurveys() {
      const surveys = await getSurveys();
      const sMap = surveys.reduce((acc, curr) => {
        acc[curr.id] = curr.titulo;
        return acc;
      }, {});
      setSurveysMap(sMap);
    }
    loadSurveys();
  }, []);

  /* Auto-select first company */
  useEffect(() => {
    if (companiesStats.length > 0 && !selectedCompany) {
      setSelectedCompany(companiesStats[0]);
    }
  }, [companiesStats, selectedCompany]);

  if (loading) {
    return (
      <div className="page-loading">
        <div className="spinner" />
        <p>Cargando información corporativa...</p>
      </div>
    );
  }

  const handleCompanyChange = (e) => {
    const company = companiesStats.find(c => c.name === e.target.value);
    setSelectedCompany(company || null);
  };

  /* Chart data */
  const chartData = selectedCompany
    ? selectedCompany.attempts.map((att, idx) => ({
        id:           att.id,
        name:         surveysMap[att.survey_id] || `Evaluación ${idx + 1}`,
        total_score:  att.total_score,
        completed_at: att.completed_at,
      }))
    : [];

  /* After successful register */
  const handleRegisterSuccess = (newCompany) => {
    setShowModal(false);
    setExtraCompanies(prev => [...prev, newCompany]);
    showToast(`Empresa "${newCompany.nombre_empresa}" registrada correctamente.`, 'success');
  };

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  return (
    <div className="page-container">

      {/* Toast */}
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

      {/* Modal */}
      {showModal && (
        <RegisterCompanyModal
          onSuccess={handleRegisterSuccess}
          onClose={() => setShowModal(false)}
        />
      )}

      {/* Header */}
      <header className="page-header">
        <div>
          <h1>Vista por Empresa</h1>
          <p className="page-subtitle">
            Analiza el rendimiento histórico y niveles de madurez específicos de cada organización.
          </p>
        </div>
        {isAdmin && (
          <button
            id="open-register-company"
            className="btn-primary"
            onClick={() => setShowModal(true)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <Plus size={15} /> Nueva Empresa
          </button>
        )}
      </header>

      {/* Recently registered companies (only if there are extras not in attempts) */}
      {extraCompanies.length > 0 && (
        <div style={{
          background: 'var(--bg-card)', border: '1px solid rgba(16,185,129,0.2)',
          borderRadius: '1rem', padding: '1rem 1.25rem', marginBottom: '1.25rem',
        }}>
          <p style={{
            margin: '0 0 0.65rem', fontSize: '0.8rem', fontWeight: 700,
            color: '#10b981', letterSpacing: '0.05em', textTransform: 'uppercase',
          }}>
            ✅ Empresas registradas recientemente
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            {extraCompanies.map(c => (
              <div key={c.id} style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                padding: '0.5rem 1rem', borderRadius: '8px',
                background: 'rgba(168,85,247,0.07)', border: '1px solid rgba(168,85,247,0.2)',
              }}>
                <Building2 size={14} style={{ color: 'var(--accent)', flexShrink: 0 }} />
                <div>
                  <p style={{ margin: 0, fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-primary)' }}>
                    {c.nombre_empresa}
                  </p>
                  <p style={{ margin: 0, fontSize: '0.73rem', color: 'var(--text-muted)' }}>
                    NIT: {c.nit} · {c.sector}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Select Company Dropdown */}
      {companiesStats.length > 0 ? (
        <>
          <div className="selector-section">
            <label htmlFor="company-select">Selecciona una Empresa:</label>
            <div className="select-wrapper">
              <select
                id="company-select"
                value={selectedCompany?.name || ''}
                onChange={handleCompanyChange}
              >
                {companiesStats.map(c => (
                  <option key={c.name} value={c.name}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>

          {selectedCompany && (
            <div className="company-details-grid">
              {/* Stats Cards */}
              <div className="company-info-panel">
                <div className="company-header-card">
                  <Building2 size={36} className="company-large-icon" />
                  <h2>{selectedCompany.name}</h2>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                    NIT: {selectedCompany.nit} | Sector: {selectedCompany.sector}
                  </p>
                  <span className={`maturity-tag large ${selectedCompany.maturityLevel?.toLowerCase()}`}>
                    {translateMaturityLevel(selectedCompany.maturityLevel)}
                  </span>
                </div>

                <div className="company-mini-stats">
                  <div className="mini-stat">
                    <span className="mini-stat-label">Puntaje Promedio</span>
                    <span className="mini-stat-value">{selectedCompany.averagePercentage}%</span>
                  </div>
                  <div className="mini-stat">
                    <span className="mini-stat-label">Evaluaciones</span>
                    <span className="mini-stat-value">{selectedCompany.attemptsCount}</span>
                  </div>
                </div>
              </div>

              {/* Chart */}
              <div className="dashboard-card chart-card">
                <div className="card-header">
                  <h3>Historial de Puntuaciones</h3>
                  <p className="card-subtitle">Puntuación obtenida en cada una de las evaluaciones completadas.</p>
                </div>
                <div className="card-body">
                  <ScoreBarChart data={chartData} />
                </div>
              </div>

              {/* Historical Attempts Table */}
              <div className="dashboard-card full-width-card">
                <div className="card-header">
                  <h3>Historial de Intentos</h3>
                  <p className="card-subtitle">Listado de todas las evaluaciones enviadas.</p>
                </div>
                <div className="card-body">
                  <div className="data-table-container">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Evaluación</th>
                          <th>Fecha de Finalización</th>
                          <th>Resultado</th>
                          <th>Nivel de Madurez</th>
                          <th>Acciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedCompany.attempts.map((attempt) => (
                          <tr key={attempt.id}>
                            <td><strong>{surveysMap[attempt.survey_id] || 'Encuesta general'}</strong></td>
                            <td>
                              <div className="table-date">
                                <Calendar size={14} style={{ marginRight: '6px' }} />
                                {new Date(attempt.completed_at).toLocaleDateString('es-ES', {
                                  year: 'numeric', month: 'long', day: 'numeric',
                                })}
                              </div>
                            </td>
                            <td><span className="table-score">{attempt.total_score}%</span></td>
                            <td>
                              <span className={`maturity-tag ${attempt.maturity_level?.toLowerCase()}`}>
                                {translateMaturityLevel(attempt.maturity_level)}
                              </span>
                            </td>
                            <td>
                              <Link
                                to={`/surveys/${attempt.survey_id}?attempt=${attempt.id}`}
                                className="table-action-link"
                              >
                                <span>Ver reporte</span>
                                <ExternalLink size={14} />
                              </Link>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      ) : (
        /* Empty state — no companies with attempts yet */
        <div style={{
          textAlign: 'center', padding: '4rem 2rem',
          background: 'var(--bg-card)', border: '1px dashed var(--border)',
          borderRadius: '1.25rem', marginTop: '1rem',
        }}>
          <Building2 size={48} style={{ color: 'var(--accent)', opacity: 0.4, marginBottom: '1rem' }} />
          <h2 style={{ color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
            Sin datos de empresas aún
          </h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
            Aún no hay evaluaciones completadas. Puedes registrar empresas en el sistema
            {isAdmin ? ' usando el botón "Nueva Empresa".' : '.'}
          </p>
          {isAdmin && (
            <button
              className="btn-primary"
              onClick={() => setShowModal(true)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              <Plus size={15} /> Registrar primera empresa
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default CompanyView;
