import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { createSurvey, createQuestions } from '../api/surveys';
import { getCategories } from '../api/categories';
import {
  ClipboardList, Plus, Trash2, ChevronRight, ChevronLeft,
  Check, AlertTriangle, RefreshCw, GripVertical, Eye,
  FileText, HelpCircle, Star, List, ToggleLeft, Type, Hash
} from 'lucide-react';

/* ─── Constants ───────────────────────────────────────────────── */
const QUESTION_TYPES = [
  { value: 'LIKERT',          label: 'Likert (1-5)',         icon: Star,        color: '#8c6239' },
  { value: 'MULTIPLE_CHOICE', label: 'Opción múltiple',      icon: List,        color: '#a27b5c' },
  { value: 'YES_NO',          label: 'Sí / No',              icon: ToggleLeft,  color: '#6b8e23' },
  { value: 'OPEN_TEXT',       label: 'Texto abierto',        icon: Type,        color: '#d4af37' },
  { value: 'NUMERIC',         label: 'Numérico',             icon: Hash,        color: '#b23b3b' },
];

const LIKERT_OPTIONS = [
  { texto: 'Totalmente en desacuerdo', valor: 1 },
  { texto: 'En desacuerdo',           valor: 2 },
  { texto: 'Neutral',                  valor: 3 },
  { texto: 'De acuerdo',              valor: 4 },
  { texto: 'Totalmente de acuerdo',   valor: 5 },
];

const YES_NO_OPTIONS = [
  { texto: 'Sí', valor: 1 },
  { texto: 'No', valor: 0 },
];

const STEPS = ['Información General', 'Preguntas', 'Revisión y Publicación'];

/* ─── Helpers ─────────────────────────────────────────────────── */
function makeId() {
  return 'tmp-' + Math.random().toString(36).substr(2, 9);
}

function defaultQuestion(order) {
  return {
    _id:          makeId(),
    pregunta:     '',
    tipo:         'LIKERT',
    categoria_id: '',
    orden:        order,
    requerida:    true,
    opciones:     LIKERT_OPTIONS.map(o => ({ ...o })),
  };
}

/* ─── Step indicator ──────────────────────────────────────────── */
function StepBar({ current }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: '2rem' }}>
      {STEPS.map((label, i) => {
        const done    = i < current;
        const active  = i === current;
        const color   = done ? '#10b981' : active ? '#a855f7' : 'var(--text-muted)';
        const bgColor = done ? '#10b98122' : active ? '#a855f722' : 'var(--bg-card)';
        return (
          <React.Fragment key={i}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{
                width: 32, height: 32, borderRadius: '50%',
                border: `2px solid ${color}`,
                backgroundColor: bgColor,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color, fontWeight: 700, fontSize: '0.85rem', transition: 'all 0.3s', flexShrink: 0
              }}>
                {done ? <Check size={15} /> : i + 1}
              </div>
              <span style={{
                fontSize: '0.82rem', fontWeight: active ? 700 : 500,
                color: active ? 'var(--text-primary)' : 'var(--text-muted)',
                whiteSpace: 'nowrap'
              }}>{label}</span>
            </div>
            {i < STEPS.length - 1 && (
              <div style={{
                flex: 1, height: 2, margin: '0 0.75rem',
                background: done ? '#10b981' : 'var(--border)', transition: 'background 0.3s'
              }} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

/* ─── Question Type Picker ────────────────────────────────────── */
function TypePicker({ value, onChange }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
      {QUESTION_TYPES.map(t => {
        const Icon = t.icon;
        const sel  = value === t.value;
        return (
          <button key={t.value} type="button" onClick={() => onChange(t.value)}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '0.4rem 0.85rem', borderRadius: '8px',
              border: `1.5px solid ${sel ? t.color : 'var(--border)'}`,
              backgroundColor: sel ? t.color + '22' : 'var(--bg-card)',
              color: sel ? t.color : 'var(--text-muted)',
              fontWeight: sel ? 700 : 500, fontSize: '0.78rem',
              cursor: 'pointer', transition: 'all 0.18s'
            }}
          >
            <Icon size={13} /> {t.label}
          </button>
        );
      })}
    </div>
  );
}

/* ─── Options Editor ──────────────────────────────────────────── */
function OptionsEditor({ tipo, opciones, onChange }) {
  if (tipo === 'OPEN_TEXT') {
    return (
      <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
        Este tipo de pregunta no requiere opciones predefinidas.
      </p>
    );
  }

  if (tipo === 'LIKERT' || tipo === 'YES_NO') {
    return (
      <div>
        <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
          Opciones predefinidas (no editables para este tipo):
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
          {opciones.map((o, i) => (
            <span key={i} style={{
              padding: '3px 10px', borderRadius: '999px', fontSize: '0.76rem',
              background: 'var(--bg-surface)', border: '1px solid var(--border)',
              color: 'var(--text-secondary)'
            }}>
              {o.texto} <strong style={{ color: 'var(--accent)' }}>({o.valor})</strong>
            </span>
          ))}
        </div>
      </div>
    );
  }

  /* MULTIPLE_CHOICE or NUMERIC: editable options */
  const add = () => onChange([...opciones, { texto: '', valor: opciones.length + 1 }]);
  const remove = (i) => onChange(opciones.filter((_, idx) => idx !== i));
  const update = (i, field, val) => {
    const next = [...opciones];
    next[i] = { ...next[i], [field]: field === 'valor' ? Number(val) : val };
    onChange(next);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      {opciones.map((op, i) => (
        <div key={i} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <input
            className="form-input"
            placeholder={`Opción ${i + 1}`}
            value={op.texto}
            onChange={e => update(i, 'texto', e.target.value)}
            style={{ flex: 3, marginBottom: 0 }}
          />
          <input
            className="form-input"
            type="number"
            placeholder="Valor"
            value={op.valor}
            min={0} max={100}
            onChange={e => update(i, 'valor', e.target.value)}
            style={{ flex: 1, marginBottom: 0 }}
          />
          <button type="button" onClick={() => remove(i)} style={{
            background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
            color: '#ef4444', borderRadius: '7px', padding: '0.35rem 0.5rem',
            cursor: 'pointer', display: 'flex', alignItems: 'center'
          }}>
            <Trash2 size={13} />
          </button>
        </div>
      ))}
      <button type="button" onClick={add} style={{
        display: 'inline-flex', alignItems: 'center', gap: '5px',
        padding: '0.4rem 0.85rem', borderRadius: '8px',
        border: '1px dashed var(--accent)', background: 'rgba(168,85,247,0.05)',
        color: 'var(--accent)', fontSize: '0.8rem', fontWeight: 600,
        cursor: 'pointer', alignSelf: 'flex-start', marginTop: '0.25rem'
      }}>
        <Plus size={13} /> Agregar opción
      </button>
    </div>
  );
}

/* ─── Question Card ───────────────────────────────────────────── */
function QuestionCard({ q, idx, categories, onChange, onRemove }) {
  const [expanded, setExpanded] = useState(true);

  const typeMeta = QUESTION_TYPES.find(t => t.value === q.tipo) || QUESTION_TYPES[0];
  const Icon = typeMeta.icon;

  const handleTypeChange = (newTipo) => {
    let opciones = q.opciones;
    if (newTipo === 'LIKERT')          opciones = LIKERT_OPTIONS.map(o => ({ ...o }));
    else if (newTipo === 'YES_NO')     opciones = YES_NO_OPTIONS.map(o => ({ ...o }));
    else if (newTipo === 'OPEN_TEXT')  opciones = [];
    else if (newTipo === 'NUMERIC')    opciones = [{ texto: 'Valor', valor: 0 }];
    else                               opciones = [];
    onChange({ ...q, tipo: newTipo, opciones });
  };

  return (
    <div style={{
      background: 'var(--bg-card)', border: `1px solid ${expanded ? 'rgba(168,85,247,0.25)' : 'var(--border)'}`,
      borderRadius: '1rem', overflow: 'hidden', transition: 'border-color 0.2s'
    }}>
      {/* Card header */}
      <div
        onClick={() => setExpanded(e => !e)}
        style={{
          display: 'flex', alignItems: 'center', gap: '0.75rem',
          padding: '0.9rem 1.1rem', cursor: 'pointer',
          background: expanded ? 'rgba(168,85,247,0.04)' : 'transparent',
          borderBottom: expanded ? '1px solid var(--border)' : 'none',
          transition: 'background 0.2s'
        }}
      >
        <GripVertical size={16} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
        <div style={{
          width: 28, height: 28, borderRadius: '50%',
          background: typeMeta.color + '22', border: `1.5px solid ${typeMeta.color}55`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
        }}>
          <Icon size={13} style={{ color: typeMeta.color }} />
        </div>
        <span style={{
          fontWeight: 600, fontSize: '0.88rem', color: 'var(--text-primary)', flex: 1,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
        }}>
          {q.pregunta || <em style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>Pregunta {idx + 1} sin texto…</em>}
        </span>
        <span style={{
          fontSize: '0.72rem', fontWeight: 600, color: typeMeta.color,
          background: typeMeta.color + '18', padding: '2px 8px', borderRadius: '999px'
        }}>{typeMeta.label}</span>
        <button type="button" onClick={e => { e.stopPropagation(); onRemove(); }} style={{
          background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
          color: '#ef4444', borderRadius: '7px', padding: '0.3rem 0.45rem',
          cursor: 'pointer', display: 'flex', alignItems: 'center'
        }}>
          <Trash2 size={13} />
        </button>
      </div>

      {/* Card body */}
      {expanded && (
        <div style={{ padding: '1.1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Pregunta text */}
          <div className="form-group">
            <label className="form-label">Enunciado de la pregunta <span style={{ color: '#ef4444' }}>*</span></label>
            <textarea
              className="form-input"
              rows={2}
              placeholder="Escribe aquí el enunciado de la pregunta…"
              value={q.pregunta}
              onChange={e => onChange({ ...q, pregunta: e.target.value })}
              style={{ resize: 'vertical', marginBottom: 0 }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            {/* Categoría — obligatoria en el esquema real (NOT NULL) */}
            <div className="form-group">
              <label className="form-label">
                Categoría <span style={{ color: '#ef4444' }}>*</span>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 400, marginLeft: 4 }}>(requerida en BD)</span>
              </label>
              <select
                className="form-select"
                value={q.categoria_id}
                onChange={e => onChange({ ...q, categoria_id: e.target.value })}
                style={{ marginBottom: 0, borderColor: !q.categoria_id ? 'rgba(239,68,68,0.5)' : undefined }}
              >
                <option value="">— Selecciona categoría —</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            {/* Requerida */}
            <div className="form-group" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
              <label className="form-label">Obligatoria</label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                <input type="checkbox" checked={q.requerida}
                  onChange={e => onChange({ ...q, requerida: e.target.checked })} />
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  {q.requerida ? 'Sí, es obligatoria' : 'No es obligatoria'}
                </span>
              </label>
            </div>
          </div>

          {/* Tipo */}
          <div className="form-group">
            <label className="form-label">Tipo de respuesta</label>
            <TypePicker value={q.tipo} onChange={handleTypeChange} />
          </div>

          {/* Opciones */}
          <div className="form-group">
            <label className="form-label">Opciones de respuesta</label>
            <OptionsEditor tipo={q.tipo} opciones={q.opciones}
              onChange={opts => onChange({ ...q, opciones: opts })} />
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Review Step ─────────────────────────────────────────────── */
function ReviewStep({ meta, questions }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Meta */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(168,85,247,0.06), rgba(59,130,246,0.04))',
        border: '1px solid rgba(168,85,247,0.2)', borderRadius: '1rem', padding: '1.25rem'
      }}>
        <h3 style={{ margin: '0 0 0.75rem', fontSize: '0.95rem', color: 'var(--text-primary)', fontWeight: 700 }}>
          📋 Información General
        </h3>
        <dl style={{ margin: 0, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem 1.5rem' }}>
          {[
            ['Título',       meta.titulo        || '—'],
            ['Estado',       meta.status        || 'DRAFT'],
            ['Versión',      meta.version       || 1],
            ['Descripción',  meta.descripcion   || '—'],
          ].map(([k, v]) => (
            <div key={k}>
              <dt style={{ fontSize: '0.73rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{k}</dt>
              <dd style={{ margin: '2px 0 0', fontSize: '0.9rem', color: 'var(--text-primary)', fontWeight: 500 }}>{v}</dd>
            </div>
          ))}
        </dl>
      </div>

      {/* Questions summary */}
      <div>
        <h3 style={{ margin: '0 0 0.75rem', fontSize: '0.95rem', color: 'var(--text-primary)', fontWeight: 700 }}>
          ❓ {questions.length} Pregunta{questions.length !== 1 ? 's' : ''}
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
          {questions.map((q, i) => {
            const tm = QUESTION_TYPES.find(t => t.value === q.tipo) || QUESTION_TYPES[0];
            const Icon = tm.icon;
            return (
              <div key={q._id} style={{
                display: 'flex', alignItems: 'flex-start', gap: '0.75rem',
                padding: '0.75rem 1rem', background: 'var(--bg-card)',
                border: '1px solid var(--border)', borderRadius: '0.75rem'
              }}>
                <div style={{
                  width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                  background: tm.color + '22', border: `1.5px solid ${tm.color}55`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  marginTop: '1px'
                }}>
                  <Icon size={13} style={{ color: tm.color }} />
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ margin: 0, fontSize: '0.87rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                    {i + 1}. {q.pregunta || <em style={{ color: 'var(--text-muted)' }}>Sin texto</em>}
                  </p>
                  <p style={{ margin: '3px 0 0', fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                    {tm.label} · {q.opciones.length} opción{q.opciones.length !== 1 ? 'es' : ''}
                    {q.requerida ? ' · Obligatoria' : ''}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════ */
/*  MAIN PAGE                                                       */
/* ═══════════════════════════════════════════════════════════════ */
export default function CreateSurvey() {
  const navigate  = useNavigate();
  const { user }  = useAuth();

  /* Guard – only ADMIN and COMPANY_ADMIN */
  if (user && user.role !== 'ADMIN' && user.role !== 'COMPANY_ADMIN') {
    return (
      <div className="page-container" style={{ maxWidth: 600, textAlign: 'center', paddingTop: '4rem' }}>
        <AlertTriangle size={48} style={{ color: '#f59e0b', marginBottom: '1rem' }} />
        <h2 style={{ color: 'var(--text-primary)' }}>Acceso restringido</h2>
        <p style={{ color: 'var(--text-muted)' }}>Solo los administradores pueden crear encuestas.</p>
      </div>
    );
  }

  /* ── State ── */
  const [step, setStep]           = useState(0);
  const [categories, setCategories] = useState([]);
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState('');
  const [validationErrors, setValidationErrors] = useState([]);

  const [meta, setMeta] = useState({
    titulo:      '',
    descripcion: '',
    status:      'DRAFT',
    version:     1,
  });

  const [questions, setQuestions] = useState([defaultQuestion(1)]);

  /* ── Load categories ── */
  useEffect(() => {
    getCategories().then(r => { if (r.success) setCategories(r.categories); });
  }, []);

  /* ── Setters ── */
  const setMf = (k, v) => setMeta(m => ({ ...m, [k]: v }));

  const addQuestion = () =>
    setQuestions(qs => [...qs, defaultQuestion(qs.length + 1)]);

  const removeQuestion = (id) =>
    setQuestions(qs => qs.filter(q => q._id !== id).map((q, i) => ({ ...q, orden: i + 1 })));

  const updateQuestion = (id, next) =>
    setQuestions(qs => qs.map(q => q._id === id ? next : q));

  /* ── Validation ── */
  const validateStep0 = () => {
    const errs = [];
    if (!meta.titulo.trim()) errs.push('El título es obligatorio.');
    if (meta.titulo.trim().length < 5) errs.push('El título debe tener al menos 5 caracteres.');
    return errs;
  };

  const validateStep1 = () => {
    const errs = [];
    if (questions.length === 0) errs.push('Debes agregar al menos una pregunta.');
    // category_id es NOT NULL en el esquema real — requerir si hay categorías disponibles
    const needsCategory = categories.length > 0;
    questions.forEach((q, i) => {
      if (!q.pregunta.trim()) errs.push(`Pregunta ${i + 1}: el enunciado es obligatorio.`);
      if (needsCategory && !q.categoria_id)
        errs.push(`Pregunta ${i + 1}: la categoría es obligatoria (requerida por la BD).`);
      if (['MULTIPLE_CHOICE', 'NUMERIC'].includes(q.tipo) && q.opciones.length === 0)
        errs.push(`Pregunta ${i + 1}: debes agregar al menos una opción.`);
      if (['MULTIPLE_CHOICE', 'NUMERIC'].includes(q.tipo) && q.opciones.some(o => !o.texto.trim()))
        errs.push(`Pregunta ${i + 1}: todas las opciones deben tener texto.`);
    });
    return errs;
  };

  const goNext = () => {
    const errs = step === 0 ? validateStep0() : step === 1 ? validateStep1() : [];
    if (errs.length) { setValidationErrors(errs); return; }
    setValidationErrors([]);
    setStep(s => s + 1);
  };

  const goBack = () => { setValidationErrors([]); setStep(s => s - 1); };

  /* ── Submit → Supabase (esquema real) ── */
  const handleSubmit = async () => {
    setSaving(true);
    setError('');
    try {
      /* 1. Crear la encuesta */
      const surveyRes = await createSurvey({
        titulo:      meta.titulo.trim(),
        descripcion: meta.descripcion.trim() || null,
        status:      meta.status,
        version:     Number(meta.version),
        created_by:  user?.id || 'mock-id-admin',
      });
      if (!surveyRes.success) throw new Error(surveyRes.error || 'Error al crear la encuesta');

      const surveyId = surveyRes.survey.id;
      const isMockSurvey = surveyId.startsWith('mock-');

      /* 2. Crear preguntas y opciones (solo si es guardado real en Supabase) */
      if (!isMockSurvey && questions.length > 0) {
        // Usamos la primera categoría como fallback para category_id NOT NULL
        const defaultCategoryId = categories[0]?.id || null;

        const qRes = await createQuestions(surveyId, questions, defaultCategoryId);
        if (!qRes.success) throw new Error(qRes.error || 'Error al crear las preguntas');
      }

      /* 3. Navegar al detalle de la nueva encuesta */
      navigate(`/surveys/${surveyId}`);
    } catch (err) {
      console.error('Error guardando encuesta:', err);
      const msg = err.message || '';
      if (msg.includes('fetch') || msg.includes('JWT') || msg.includes('PGRST') || msg.includes('Failed')) {
        setError(`Sin conexión a Supabase: ${msg}. Verifica VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY en tu .env`);
      } else if (msg.includes('category_id')) {
        setError('Error: category_id es obligatorio. Asegúrate de que existan categorías en la BD y selecciona una por pregunta.');
      } else if (msg.includes('created_by')) {
        setError('Error: created_by requiere un User ID válido en la BD. El usuario de prueba no existe en Supabase.');
      } else {
        setError(`Error al guardar: ${msg}`);
      }
    } finally {
      setSaving(false);
    }
  };

  /* ─── Render ─── */
  return (
    <div className="page-container" style={{ maxWidth: '860px' }}>

      {/* Header */}
      <div className="page-header" style={{ marginBottom: '1.5rem' }}>
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <ClipboardList size={26} style={{ color: 'var(--accent)' }} />
            Nueva Encuesta
          </h1>
          <p className="page-subtitle">Crea una encuesta de diagnóstico y define sus preguntas.</p>
        </div>
        <button className="btn-secondary" onClick={() => navigate('/')}>
          <ChevronLeft size={15} /> Cancelar
        </button>
      </div>

      {/* Step bar */}
      <StepBar current={step} />

      {/* Validation errors */}
      {validationErrors.length > 0 && (
        <div style={{
          background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)',
          borderRadius: '0.75rem', padding: '1rem 1.25rem', marginBottom: '1.25rem',
          display: 'flex', flexDirection: 'column', gap: '0.35rem'
        }}>
          {validationErrors.map((e, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', color: '#ef4444' }}>
              <AlertTriangle size={14} /> {e}
            </div>
          ))}
        </div>
      )}

      {/* ─── STEP 0: Metadata ─── */}
      {step === 0 && (
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.25rem' }}>
            <FileText size={18} style={{ color: 'var(--accent)' }} />
            <h2 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              Información General
            </h2>
          </div>

          <div className="form-group">
            <label className="form-label">
              Título <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <input
              id="survey-title"
              className="form-input"
              placeholder="Ej: Evaluación de Madurez Ágil 2025"
              value={meta.titulo}
              onChange={e => setMf('titulo', e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Descripción</label>
            <textarea
              id="survey-description"
              className="form-input"
              rows={3}
              placeholder="Describe brevemente el objetivo y alcance de esta encuesta…"
              value={meta.descripcion}
              onChange={e => setMf('descripcion', e.target.value)}
              style={{ resize: 'vertical' }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Estado inicial</label>
              <select id="survey-status" className="form-select" value={meta.status}
                onChange={e => setMf('status', e.target.value)}>
                <option value="DRAFT">Borrador (DRAFT)</option>
                <option value="ACTIVE">Activa (ACTIVE)</option>
                <option value="ARCHIVED">Archivada (ARCHIVED)</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Número de versión</label>
              <input
                id="survey-version"
                className="form-input"
                type="number"
                min={1}
                value={meta.version}
                onChange={e => setMf('version', e.target.value)}
              />
            </div>
          </div>

          {/* Preview badge */}
          {meta.titulo && (
            <div style={{
              background: 'linear-gradient(135deg, rgba(168,85,247,0.07), rgba(59,130,246,0.05))',
              border: '1px solid rgba(168,85,247,0.2)', borderRadius: '0.75rem',
              padding: '1rem', display: 'flex', gap: '0.75rem', alignItems: 'flex-start'
            }}>
              <Eye size={16} style={{ color: 'var(--accent)', marginTop: '2px', flexShrink: 0 }} />
              <div>
                <p style={{ margin: 0, fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                  {meta.titulo}
                </p>
                {meta.descripcion && (
                  <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    {meta.descripcion}
                  </p>
                )}
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
                  <span style={{
                    padding: '2px 10px', borderRadius: '999px', fontSize: '0.72rem', fontWeight: 700,
                    backgroundColor: meta.status === 'ACTIVE' ? '#10b98122' : meta.status === 'DRAFT' ? '#f59e0b22' : '#6b728022',
                    color: meta.status === 'ACTIVE' ? '#10b981' : meta.status === 'DRAFT' ? '#f59e0b' : '#6b7280',
                    border: `1px solid ${meta.status === 'ACTIVE' ? '#10b98144' : meta.status === 'DRAFT' ? '#f59e0b44' : '#6b728044'}`
                  }}>
                    {meta.status}
                  </span>
                  <span style={{
                    padding: '2px 10px', borderRadius: '999px', fontSize: '0.72rem', fontWeight: 600,
                    background: 'rgba(168,85,247,0.1)', color: 'var(--accent)',
                    border: '1px solid rgba(168,85,247,0.25)'
                  }}>
                    v{meta.version}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─── STEP 1: Questions ─── */}
      {step === 1 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <HelpCircle size={18} style={{ color: 'var(--accent)' }} />
              <h2 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                Preguntas
                <span style={{
                  marginLeft: '0.5rem', fontSize: '0.78rem', fontWeight: 600,
                  background: 'rgba(168,85,247,0.1)', color: 'var(--accent)',
                  padding: '2px 10px', borderRadius: '999px'
                }}>{questions.length}</span>
              </h2>
            </div>
            <button type="button" className="btn-primary" onClick={addQuestion} style={{ gap: '6px' }}>
              <Plus size={15} /> Agregar pregunta
            </button>
          </div>

          {questions.length === 0 ? (
            <div style={{
              textAlign: 'center', padding: '3rem', background: 'var(--bg-card)',
              border: '1px dashed var(--border)', borderRadius: '1rem', color: 'var(--text-muted)'
            }}>
              <HelpCircle size={36} style={{ marginBottom: '0.75rem', opacity: 0.4 }} />
              <p style={{ fontWeight: 600 }}>Sin preguntas aún</p>
              <p style={{ fontSize: '0.85rem' }}>Haz clic en "Agregar pregunta" para comenzar.</p>
            </div>
          ) : (
            questions.map((q, i) => (
              <QuestionCard
                key={q._id}
                q={q}
                idx={i}
                categories={categories}
                onChange={next => updateQuestion(q._id, next)}
                onRemove={() => removeQuestion(q._id)}
              />
            ))
          )}
        </div>
      )}

      {/* ─── STEP 2: Review ─── */}
      {step === 2 && (
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1.25rem' }}>
            <Eye size={18} style={{ color: 'var(--accent)' }} />
            <h2 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              Revisión Final
            </h2>
          </div>
          <ReviewStep meta={meta} questions={questions} />

          {/* DB connection note */}
          <div style={{
            marginTop: '1.5rem', padding: '0.9rem 1rem',
            background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.2)',
            borderRadius: '0.75rem', display: 'flex', gap: '0.6rem', alignItems: 'flex-start'
          }}>
            <AlertTriangle size={15} style={{ color: '#3b82f6', marginTop: '2px', flexShrink: 0 }} />
            <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              Al publicar, la encuesta y sus preguntas se insertarán directamente en <strong>Supabase</strong>.
              Asegúrate de que las variables <code>VITE_SUPABASE_URL</code> y <code>VITE_SUPABASE_ANON_KEY</code> estén configuradas en tu <code>.env</code>.
            </p>
          </div>

          {/* Submit error */}
          {error && (
            <div style={{
              marginTop: '1rem', padding: '0.9rem 1rem',
              background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)',
              borderRadius: '0.75rem', display: 'flex', gap: '0.6rem', alignItems: 'flex-start'
            }}>
              <AlertTriangle size={15} style={{ color: '#ef4444', marginTop: '2px', flexShrink: 0 }} />
              <p style={{ margin: 0, fontSize: '0.82rem', color: '#ef4444' }}>{error}</p>
            </div>
          )}
        </div>
      )}

      {/* ─── Navigation buttons ─── */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginTop: '1.75rem', paddingTop: '1.25rem', borderTop: '1px solid var(--border)'
      }}>
        <button
          type="button" className="btn-secondary"
          onClick={step === 0 ? () => navigate('/') : goBack}
        >
          <ChevronLeft size={15} /> {step === 0 ? 'Cancelar' : 'Anterior'}
        </button>

        {step < STEPS.length - 1 ? (
          <button type="button" className="btn-primary" onClick={goNext}>
            Siguiente <ChevronRight size={15} />
          </button>
        ) : (
          <button
            id="submit-survey"
            type="button"
            className="btn-primary"
            onClick={handleSubmit}
            disabled={saving}
            style={{ background: 'linear-gradient(135deg, #a855f7, #3b82f6)', minWidth: '160px' }}
          >
            {saving
              ? <><RefreshCw size={15} style={{ animation: 'spin 1s linear infinite' }} /> Guardando…</>
              : <><Check size={15} /> Crear Encuesta</>}
          </button>
        )}
      </div>
    </div>
  );
}
