import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { parseSurveyExcel } from '../utils/excelParser';
import { importSurvey, checkDuplicateSurvey } from '../api/import';
import {
  UploadCloud,
  FileSpreadsheet,
  AlertTriangle,
  CheckCircle,
  HelpCircle,
  ArrowLeft,
  Loader2,
  Settings,
  Plus,
  Play,
  Layers,
  X,
  FileText,
  AlertCircle
} from 'lucide-react';

const QUESTION_TYPE_LABELS = {
  LIKERT: { text: 'Likert (1-5)', color: '#8c6239', bg: 'rgba(140, 98, 57, 0.12)' },
  MULTIPLE_CHOICE: { text: 'Opción Múltiple', color: '#a27b5c', bg: 'rgba(162, 123, 92, 0.12)' },
  YES_NO: { text: 'Sí / No', color: '#6b8e23', bg: 'rgba(107, 142, 35, 0.12)' },
  OPEN_TEXT: { text: 'Texto Abierto', color: '#d4af37', bg: 'rgba(212, 175, 55, 0.12)' },
  NUMERIC: { text: 'Numérico', color: '#b23b3b', bg: 'rgba(178, 59, 59, 0.12)' }
};

export default function ImportSurvey() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const fileInputRef = useRef(null);

  // Guard – only ADMIN and COMPANY_ADMIN
  if (user && user.role !== 'ADMIN' && user.role !== 'COMPANY_ADMIN') {
    return (
      <div className="page-container" style={{ maxWidth: 600, textAlign: 'center', paddingTop: '4rem', margin: '0 auto' }}>
        <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '1rem', padding: '3rem', boxShadow: 'var(--shadow-premium)' }}>
          <AlertTriangle size={48} style={{ color: '#f59e0b', marginBottom: '1.5rem' }} />
          <h2 style={{ color: 'var(--text-primary)', marginBottom: '0.75rem' }}>Acceso restringido</h2>
          <p style={{ color: 'var(--text-secondary)' }}>Solo los administradores pueden importar encuestas desde archivos Excel.</p>
          <Link to="/" className="btn-primary" style={{ marginTop: '1.5rem', display: 'inline-flex', textDecoration: 'none' }}>
            Volver a Encuestas
          </Link>
        </div>
      </div>
    );
  }

  /* ── State ── */
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [dragActive, setDragActive] = useState(false);

  // Excel workbook data
  const [fileName, setFileName] = useState('');
  const [sheetsList, setSheetsList] = useState([]); // [{ name, score, questions, isValid }]
  const [selectedSheetIndex, setSelectedSheetIndex] = useState(0);

  // Survey Metadata
  const [meta, setMeta] = useState({
    titulo: '',
    descripcion: '',
    status: 'DRAFT',
    version: 1,
  });

  const [isDuplicate, setIsDuplicate] = useState(false);
  const [duplicateChecking, setDuplicateChecking] = useState(false);

  const activeSheet = sheetsList[selectedSheetIndex] || null;
  const questions = activeSheet ? activeSheet.questions : [];

  // Categorías detectadas
  const detectedCategories = [...new Set(questions.map(q => q.categoria_nombre))].filter(Boolean);

  /* ── Verify Duplicates ── */
  useEffect(() => {
    if (!meta.titulo.trim()) {
      setIsDuplicate(false);
      return;
    }
    const check = async () => {
      setDuplicateChecking(true);
      try {
        const dup = await checkDuplicateSurvey(meta.titulo.trim());
        setIsDuplicate(dup);
      } catch (err) {
        console.error(err);
      } finally {
        setDuplicateChecking(false);
      }
    };
    const timer = setTimeout(check, 600);
    return () => clearTimeout(timer);
  }, [meta.titulo]);

  /* ── File Handlers ── */
  const handleFile = async (file) => {
    if (!file) return;
    
    // Check file extension
    const extension = file.name.split('.').pop().toLowerCase();
    if (extension !== 'xlsx') {
      setError('Formato inválido. Por favor, selecciona un archivo Excel (.xlsx).');
      return;
    }

    setLoading(true);
    setError('');
    setFileName(file.name);

    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const arrayBuffer = e.target.result;
          const reports = parseSurveyExcel(arrayBuffer);
          
          if (reports.length === 0 || !reports.some(r => r.isValid)) {
            throw new Error('No se detectó ninguna estructura de encuesta válida en las hojas del archivo Excel. Asegúrate de tener al menos una columna "Pregunta" o "Enunciado".');
          }

          setSheetsList(reports);
          
          // Encontrar la hoja con preguntas válidas y mayor score
          const bestIndex = reports.findIndex(r => r.isValid);
          setSelectedSheetIndex(bestIndex !== -1 ? bestIndex : 0);

          // Rellenar título por defecto (nombre de la hoja o del archivo limpio)
          const targetReport = reports[bestIndex !== -1 ? bestIndex : 0];
          const cleanName = file.name.replace(/\.[^/.]+$/, "").replace(/[_\-]/g, ' ');
          
          setMeta({
            titulo: targetReport ? `${cleanName} - ${targetReport.name}` : cleanName,
            descripcion: `Encuesta importada desde el archivo ${file.name} de la hoja ${targetReport?.name || 'principal'}.`,
            status: 'DRAFT',
            version: 1
          });
        } catch (err) {
          setError(err.message || 'Error al procesar el contenido del archivo.');
          setFileName('');
          setSheetsList([]);
        } finally {
          setLoading(false);
        }
      };
      reader.readAsArrayBuffer(file);
    } catch (err) {
      setError('Error al leer el archivo.');
      setLoading(false);
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const clearFile = () => {
    setFileName('');
    setSheetsList([]);
    setSelectedSheetIndex(0);
    setError('');
    setMeta({ titulo: '', descripcion: '', status: 'DRAFT', version: 1 });
    setIsDuplicate(false);
  };

  /* ── Submit to database ── */
  const handleImport = async () => {
    if (!meta.titulo.trim()) {
      setError('El título de la encuesta es obligatorio.');
      return;
    }
    if (questions.length === 0) {
      setError('No hay preguntas para importar en la hoja seleccionada.');
      return;
    }
    if (isDuplicate) {
      setError('No se puede importar. Ya existe una encuesta activa con ese título.');
      return;
    }

    setImporting(true);
    setError('');

    try {
      const res = await importSurvey({
        surveyMeta: {
          titulo: meta.titulo.trim(),
          descripcion: meta.descripcion.trim(),
          status: meta.status,
          version: meta.version,
          created_by: user?.id || 'u1111111-1111-1111-1111-111111111111'
        },
        questions: questions
      });

      if (!res.success) {
        throw new Error(res.error || 'Error al importar datos en Supabase.');
      }

      setSuccessMsg('Encuesta importada exitosamente.');
      setTimeout(() => {
        navigate(`/surveys/${res.surveyId}`);
      }, 1500);

    } catch (err) {
      setError(`Error durante la importación: ${err.message}`);
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="page-container" style={{ maxWidth: '1200px', margin: '0 auto', paddingBottom: '4rem' }}>
      
      {/* Header */}
      <header className="page-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <Link to="/" style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', textDecoration: 'none', fontSize: '0.9rem', gap: '4px' }}>
              <ArrowLeft size={16} /> Volver a Encuestas
            </Link>
          </div>
          <h1>Importar Encuesta desde Excel</h1>
          <p className="page-subtitle">Sube un archivo de Excel para generar automáticamente la estructura completa de una encuesta.</p>
        </div>
      </header>

      {/* Main Area */}
      {error && (
        <div style={{
          background: 'rgba(239, 68, 68, 0.08)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          color: '#ef4444',
          padding: '1rem 1.25rem',
          borderRadius: '0.75rem',
          marginBottom: '1.5rem',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          fontSize: '0.9rem'
        }}>
          <AlertCircle size={20} style={{ flexShrink: 0 }} />
          <span>{error}</span>
        </div>
      )}

      {successMsg && (
        <div style={{
          background: 'rgba(16, 185, 129, 0.08)',
          border: '1px solid rgba(16, 185, 129, 0.3)',
          color: '#10b981',
          padding: '1rem 1.25rem',
          borderRadius: '0.75rem',
          marginBottom: '1.5rem',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          fontSize: '0.9rem'
        }}>
          <CheckCircle size={20} style={{ flexShrink: 0 }} />
          <span>{successMsg} Redirigiendo al detalle...</span>
        </div>
      )}

      {/* STEP 1: Upload File */}
      {!fileName && !loading && (
        <div 
          onDragEnter={handleDrag}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          style={{
            background: dragActive ? 'rgba(99, 102, 241, 0.08)' : 'var(--bg-secondary)',
            border: `2px dashed ${dragActive ? 'var(--primary-color)' : 'var(--border-color)'}`,
            borderRadius: '1.25rem',
            padding: '5rem 2rem',
            textAlign: 'center',
            cursor: 'pointer',
            boxShadow: 'var(--shadow-premium)',
            transition: 'all 0.25s ease',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '1.25rem'
          }}
          className="excel-upload-zone"
        >
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileChange} 
            accept=".xlsx" 
            style={{ display: 'none' }} 
          />
          <div style={{
            width: 80, height: 80, borderRadius: '50%',
            background: 'var(--primary-light)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--primary-color)',
            boxShadow: '0 0 0 8px rgba(99, 102, 241, 0.04)'
          }}>
            <UploadCloud size={40} />
          </div>
          <div>
            <h3 style={{ fontSize: '1.35rem', fontWeight: 700, marginBottom: '0.5rem', color: 'var(--text-primary)' }}>
              Arrastra tu archivo Excel aquí
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
              o haz clic para explorar en tu equipo (.xlsx)
            </p>
          </div>

          <div style={{
            background: 'var(--bg-primary)',
            border: '1px solid var(--border-color)',
            borderRadius: '0.75rem',
            padding: '1rem 1.5rem',
            maxWidth: '560px',
            marginTop: '1rem',
            textAlign: 'left',
            fontSize: '0.82rem',
            color: 'var(--text-secondary)',
            lineHeight: '1.6'
          }}>
            <strong style={{ color: 'var(--text-primary)', display: 'block', marginBottom: '0.5rem' }}>
              💡 Formato recomendado del archivo Excel:
            </strong>
            <ul style={{ paddingLeft: '1.25rem', margin: 0, display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <li><strong>Pregunta:</strong> Columna obligatoria con el texto del enunciado.</li>
              <li><strong>Categoría:</strong> Columna para agrupar preguntas en indicadores de madurez.</li>
              <li><strong>Tipo (opcional):</strong> Tipos soportados: <em>Likert, Sí/No, Opción Múltiple, Abierta o Numérica</em>.</li>
              <li><strong>Opciones (opcional):</strong> Opciones de respuestas separadas por comas, o múltiples columnas llamadas Opción 1, Opción 2...</li>
            </ul>
          </div>
        </div>
      )}

      {/* LOADING STATE */}
      {loading && (
        <div style={{
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-color)',
          borderRadius: '1.25rem',
          padding: '5rem 2rem',
          textAlign: 'center',
          boxShadow: 'var(--shadow-premium)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '1rem'
        }}>
          <Loader2 size={40} className="spinner" style={{ color: 'var(--primary-color)', animation: 'spin 1s linear infinite' }} />
          <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>Analizando archivo Excel...</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem' }}>Detectando automáticamente pestañas y estructura de preguntas</p>
        </div>
      )}

      {/* STEP 2: Preview & Configuration */}
      {fileName && !loading && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '2rem' }}>
          
          {/* Top Info Bar */}
          <div style={{
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-color)',
            borderRadius: '1rem',
            padding: '1.25rem 1.5rem',
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{
                background: 'rgba(16, 185, 129, 0.12)',
                color: 'var(--accent-color)',
                width: 42, height: 42, borderRadius: '8px',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <FileSpreadsheet size={22} />
              </div>
              <div>
                <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Archivo cargado</p>
                <h4 style={{ margin: 0, fontSize: '1rem', color: 'var(--text-primary)', fontWeight: 600 }}>{fileName}</h4>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              {/* Selector de Hoja */}
              {sheetsList.length > 1 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <label htmlFor="sheet-select" style={{ fontSize: '0.83rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Hoja:</label>
                  <select 
                    id="sheet-select"
                    value={selectedSheetIndex}
                    onChange={(e) => setSelectedSheetIndex(Number(e.target.value))}
                    style={{
                      background: 'var(--bg-card)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '8px',
                      color: 'var(--text-primary)',
                      padding: '0.4rem 2rem 0.4rem 0.75rem',
                      fontSize: '0.85rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      outline: 'none'
                    }}
                  >
                    {sheetsList.map((sheet, index) => (
                      <option key={sheet.name} value={index} disabled={!sheet.isValid}>
                        {sheet.name} {sheet.isValid ? `(${sheet.questions.length} preguntas)` : '(Sin estructura)'}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <button 
                type="button" 
                onClick={clearFile}
                disabled={importing}
                style={{
                  background: 'transparent',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-secondary)',
                  borderRadius: '8px',
                  padding: '0.4rem 0.85rem',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  transition: 'all 0.2s'
                }}
                className="btn-clear"
              >
                <X size={15} /> Cambiar Archivo
              </button>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '2rem', alignItems: 'start' }}>
            
            {/* Form & Table (Left) */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
              
              {/* Form Metadata */}
              <div style={{
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-color)',
                borderRadius: '1rem',
                padding: '2rem',
                boxShadow: 'var(--shadow-premium)'
              }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1.25rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem', color: 'var(--text-primary)' }}>
                  Configuración de la Encuesta
                </h3>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  <div className="form-group">
                    <label style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Título de la encuesta *</span>
                      {duplicateChecking && <span style={{ color: 'var(--primary-color)', fontSize: '0.75rem' }}>Verificando título...</span>}
                    </label>
                    <input 
                      type="text" 
                      value={meta.titulo} 
                      onChange={(e) => setMeta(prev => ({ ...prev, titulo: e.target.value }))}
                      placeholder="Ej. Evaluación de Madurez de Procesos Ágiles"
                      style={{
                        padding: '0.85rem 1rem',
                        backgroundColor: 'var(--bg-card)',
                        border: `1px solid ${isDuplicate ? 'var(--danger-color)' : 'var(--border-color)'}`,
                        borderRadius: 'var(--border-radius)',
                        color: 'var(--text-primary)',
                        outline: 'none',
                      }}
                    />
                    {isDuplicate && (
                      <span style={{ color: 'var(--danger-color)', fontSize: '0.76rem', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <AlertTriangle size={12} /> Ya existe una encuesta activa con este título. Se creará un duplicado si continúas.
                      </span>
                    )}
                  </div>

                  <div className="form-group">
                    <label>Descripción</label>
                    <textarea 
                      value={meta.descripcion} 
                      onChange={(e) => setMeta(prev => ({ ...prev, descripcion: e.target.value }))}
                      placeholder="Indica el propósito del diagnóstico..."
                      rows={3}
                      style={{
                        padding: '0.85rem 1rem',
                        backgroundColor: 'var(--bg-card)',
                        border: '1px solid var(--border-color)',
                        borderRadius: 'var(--border-radius)',
                        color: 'var(--text-primary)',
                        outline: 'none',
                        resize: 'vertical',
                        fontFamily: 'var(--font-sans)',
                        fontSize: '0.9rem',
                        lineHeight: '1.5'
                      }}
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
                    <div className="form-group">
                      <label>Versión</label>
                      <input 
                        type="number" 
                        min="1"
                        value={meta.version} 
                        onChange={(e) => setMeta(prev => ({ ...prev, version: Math.max(1, Number(e.target.value)) }))}
                        style={{
                          padding: '0.85rem 1rem',
                          backgroundColor: 'var(--bg-card)',
                          border: '1px solid var(--border-color)',
                          borderRadius: 'var(--border-radius)',
                          color: 'var(--text-primary)',
                          outline: 'none',
                        }}
                      />
                    </div>

                    <div className="form-group">
                      <label>Estado Inicial</label>
                      <select 
                        value={meta.status} 
                        onChange={(e) => setMeta(prev => ({ ...prev, status: e.target.value }))}
                        style={{
                          padding: '0.85rem 1rem',
                          backgroundColor: 'var(--bg-card)',
                          border: '1px solid var(--border-color)',
                          borderRadius: 'var(--border-radius)',
                          color: 'var(--text-primary)',
                          outline: 'none',
                          cursor: 'pointer'
                        }}
                      >
                        <option value="DRAFT">Borrador (DRAFT)</option>
                        <option value="ACTIVE">Activo (ACTIVE)</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {/* Table Preview */}
              <div style={{
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-color)',
                borderRadius: '1rem',
                padding: '2rem',
                boxShadow: 'var(--shadow-premium)',
                overflow: 'hidden'
              }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem', color: 'var(--text-primary)' }}>
                  Vista Previa de Preguntas ({questions.length})
                </h3>

                <div style={{ overflowX: 'auto', margin: '0 -2rem' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--border-color)', background: 'rgba(255,255,255,0.01)' }}>
                        <th style={{ padding: '0.75rem 1rem 0.75rem 2rem', color: 'var(--text-secondary)', fontWeight: 600, width: '50px' }}>#</th>
                        <th style={{ padding: '0.75rem 1rem', color: 'var(--text-secondary)', fontWeight: 600, minWidth: '240px' }}>Pregunta</th>
                        <th style={{ padding: '0.75rem 1rem', color: 'var(--text-secondary)', fontWeight: 600, width: '140px' }}>Categoría</th>
                        <th style={{ padding: '0.75rem 1rem', color: 'var(--text-secondary)', fontWeight: 600, width: '130px' }}>Tipo</th>
                        <th style={{ padding: '0.75rem 2rem 0.75rem 1rem', color: 'var(--text-secondary)', fontWeight: 600, minWidth: '160px' }}>Opciones Detectadas</th>
                      </tr>
                    </thead>
                    <tbody>
                      {questions.map((q, idx) => {
                        const styleInfo = QUESTION_TYPE_LABELS[q.tipo] || { text: q.tipo, color: '#9ca3af', bg: 'rgba(156,163,175,0.1)' };
                        return (
                          <tr key={q._id} style={{ borderBottom: '1px solid var(--border-color)', transition: 'background-color 0.15s' }} className="preview-row">
                            <td style={{ padding: '0.9rem 1rem 0.9rem 2rem', color: 'var(--text-muted)', fontWeight: 600 }}>{q.orden}</td>
                            <td style={{ padding: '0.9rem 1rem', color: 'var(--text-primary)', fontWeight: 500, lineHeight: 1.4 }}>
                              {q.pregunta}
                              {q.categoria_indicador && (
                                <span style={{ display: 'block', fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                                  Indicador: {q.categoria_indicador}
                                </span>
                              )}
                            </td>
                            <td style={{ padding: '0.9rem 1rem' }}>
                              <span style={{
                                display: 'inline-block',
                                fontSize: '0.72rem',
                                padding: '2px 8px',
                                borderRadius: '4px',
                                background: 'rgba(255,255,255,0.05)',
                                border: '1px solid var(--border-color)',
                                color: 'var(--text-secondary)',
                                fontWeight: 500
                              }}>
                                {q.categoria_nombre}
                              </span>
                            </td>
                            <td style={{ padding: '0.9rem 1rem' }}>
                              <span style={{
                                display: 'inline-block',
                                fontSize: '0.72rem',
                                padding: '2px 8px',
                                borderRadius: '4px',
                                background: styleInfo.bg,
                                color: styleInfo.color,
                                border: `1px solid ${styleInfo.color}33`,
                                fontWeight: 600
                              }}>
                                {styleInfo.text}
                              </span>
                            </td>
                            <td style={{ padding: '0.9rem 2rem 0.9rem 1rem' }}>
                              {q.opciones.length > 0 ? (
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px' }}>
                                  {q.opciones.map((o, oIdx) => (
                                    <span key={oIdx} style={{
                                      fontSize: '0.7rem',
                                      padding: '1px 5px',
                                      borderRadius: '4px',
                                      background: 'var(--bg-primary)',
                                      border: '1px solid var(--border-color)',
                                      color: 'var(--text-secondary)'
                                    }} title={`Valor: ${o.valor}`}>
                                      {o.texto}
                                    </span>
                                  ))}
                                </div>
                              ) : (
                                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                                  Sin opciones
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Sidebar Stats & Actions (Right) */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', position: 'sticky', top: '2rem' }}>
              
              {/* Stats Card */}
              <div style={{
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-color)',
                borderRadius: '1rem',
                padding: '1.5rem',
                boxShadow: 'var(--shadow-premium)'
              }}>
                <h4 style={{ margin: '0 0 1rem', fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
                  Resumen de la Estructura
                </h4>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Total Preguntas</span>
                    <strong style={{ fontSize: '1rem', color: 'var(--text-primary)' }}>{questions.length}</strong>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Categorías Detectadas</span>
                    <strong style={{ fontSize: '1rem', color: 'var(--text-primary)' }}>{detectedCategories.length}</strong>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Nombre Pestaña</span>
                    <strong style={{ fontSize: '0.85rem', color: 'var(--primary-color)', background: 'var(--primary-light)', padding: '2px 6px', borderRadius: '4px' }}>
                      {activeSheet?.name}
                    </strong>
                  </div>
                </div>

                <div style={{
                  marginTop: '1.25rem',
                  padding: '0.75rem',
                  borderRadius: '8px',
                  background: 'rgba(16, 185, 129, 0.05)',
                  border: '1px solid rgba(16, 185, 129, 0.25)',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '8px'
                }}>
                  <CheckCircle size={16} style={{ color: 'var(--accent-color)', marginTop: '2px', flexShrink: 0 }} />
                  <div>
                    <span style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--accent-color)' }}>Estructura Validada</span>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>El archivo contiene columnas válidas para crear la encuesta.</span>
                  </div>
                </div>
              </div>

              {/* Categorías a Crear/Asociar */}
              <div style={{
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-color)',
                borderRadius: '1rem',
                padding: '1.5rem',
                boxShadow: 'var(--shadow-premium)'
              }}>
                <h4 style={{ margin: '0 0 0.75rem', fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  Categorías ({detectedCategories.length})
                </h4>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', maxHeight: '140px', overflowY: 'auto', paddingRight: '4px' }}>
                  {detectedCategories.map((cat, i) => (
                    <span key={i} style={{
                      fontSize: '0.75rem',
                      padding: '3px 8px',
                      borderRadius: '4px',
                      background: 'var(--bg-card)',
                      border: '1px solid var(--border-color)',
                      color: 'var(--text-secondary)'
                    }}>
                      {cat}
                    </span>
                  ))}
                </div>
                <span style={{ display: 'block', fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.75rem' }}>
                  Se asociarán automáticamente. Si no existen en el sistema, serán creadas de forma automática.
                </span>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={handleImport}
                  disabled={importing || isDuplicate || questions.length === 0}
                  style={{
                    padding: '0.85rem',
                    background: isDuplicate 
                      ? 'rgba(107, 114, 128, 0.2)' 
                      : 'linear-gradient(135deg, var(--primary-color) 0%, var(--primary-hover) 100%)',
                    color: isDuplicate ? 'var(--text-muted)' : '#fff',
                    border: 'none',
                    borderRadius: 'var(--border-radius)',
                    fontSize: '0.95rem',
                    fontWeight: 600,
                    cursor: isDuplicate ? 'not-allowed' : 'pointer',
                    boxShadow: isDuplicate ? 'none' : '0 4px 12px rgba(99, 102, 241, 0.25)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    transition: 'opacity 0.2s',
                    width: '100%'
                  }}
                >
                  {importing ? (
                    <>
                      <Loader2 size={18} className="spinner" style={{ animation: 'spin 1s linear infinite' }} />
                      Importando...
                    </>
                  ) : (
                    <>
                      <Play size={15} fill="currentColor" />
                      Importar Encuesta
                    </>
                  )}
                </button>

                <Link
                  to="/"
                  style={{
                    padding: '0.85rem',
                    background: 'transparent',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-secondary)',
                    borderRadius: 'var(--border-radius)',
                    fontSize: '0.95rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    textDecoration: 'none',
                    transition: 'all 0.2s',
                    width: '100%'
                  }}
                  className="btn-cancel"
                >
                  Cancelar
                </Link>
              </div>

            </div>

          </div>

        </div>
      )}

    </div>
  );
}
