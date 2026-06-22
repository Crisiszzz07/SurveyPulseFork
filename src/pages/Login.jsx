import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import './Login.css';

const features = [
  {
    icon: '📊',
    title: 'Diagnóstico de Madurez',
    desc: 'Evalúa el nivel organizacional con encuestas especializadas y métricas por categoría.',
  },
  {
    icon: '🏢',
    title: 'Gestión Multi-Empresa',
    desc: 'Administra múltiples organizaciones en un solo panel, con benchmarking entre empresas.',
  },
  {
    icon: '📈',
    title: 'Reportes Automáticos',
    desc: 'Genera PDFs con gráficas de radar, distribuciones de respuestas y rankings.',
  },
  {
    icon: '🔐',
    title: 'Roles y Permisos',
    desc: 'Control granular: Admin Global, Admin de Empresa y Evaluador.',
  },
];

export const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showPass, setShowPass] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSubmitting(true);
    const result = await login(email, password);
    setSubmitting(false);
    if (result.success) {
      navigate('/');
    } else {
      setErrorMsg(result.error || 'Credenciales incorrectas');
    }
  };

  return (
    <div className="lp-root">
      {/* Background blobs */}
      <div className="lp-blob lp-blob-tl" />
      <div className="lp-blob lp-blob-br" />

      {/* ── Left panel ───────────────────────────────────── */}
      <div className="lp-left">
        <div className="lp-brand">
          <span className="lp-brand-icon">📊</span>
          <span className="lp-brand-name">SurveyPulse</span>
        </div>

        <h1 className="lp-headline">
          Diagnóstico inteligente de madurez organizacional
        </h1>

        <p className="lp-sub">
          Mide, analiza y mejora el nivel de madurez de tus equipos con encuestas
          especializadas, reportes automáticos y benchmarking entre empresas.
        </p>

        <div className="lp-grid">
          {features.map((f) => (
            <div key={f.title} className="lp-card">
              <span className="lp-card-icon">{f.icon}</span>
              <p className="lp-card-title">{f.title}</p>
              <p className="lp-card-desc">{f.desc}</p>
            </div>
          ))}
        </div>

        <p className="lp-secure">
          <span>🔒</span> Plataforma segura · Autenticación JWT · Control de roles
        </p>
      </div>

      {/* ── Right panel (form) ───────────────────────────── */}
      <div className="lp-right">
        <div className="lp-form-card">
          {/* Header */}
          <div className="lp-form-header">
            <div className="lp-form-avatar">📊</div>
            <h2 className="lp-form-title">Iniciar sesión</h2>
            <p className="lp-form-desc">Accede a tu panel de SurveyPulse</p>
          </div>

          {/* Error */}
          {errorMsg && (
            <div className="lp-error" key={errorMsg}>
              ⚠️ {errorMsg}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="lp-form">
            {/* Email */}
            <div className="lp-field">
              <label htmlFor="email" className="lp-label">Correo electrónico</label>
              <div className="lp-input-wrap">
                <span className="lp-input-icon">✉️</span>
                <input
                  id="email"
                  type="email"
                  className="lp-input"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="ejemplo@correo.com"
                  required
                  autoComplete="email"
                />
              </div>
            </div>

            {/* Password */}
            <div className="lp-field">
              <label htmlFor="password" className="lp-label">Contraseña</label>
              <div className="lp-input-wrap">
                <span className="lp-input-icon">🔑</span>
                <input
                  id="password"
                  type={showPass ? 'text' : 'password'}
                  className="lp-input lp-input--password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="lp-eye"
                  onClick={() => setShowPass(p => !p)}
                  title={showPass ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  aria-label={showPass ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                >
                  {showPass ? '🙈' : '👁️'}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              id="login-submit-btn"
              className="lp-submit"
              disabled={submitting}
            >
              {submitting ? (
                <>
                  <span className="lp-spinner" />
                  Iniciando sesión…
                </>
              ) : (
                'Ingresar →'
              )}
            </button>
          </form>

          <div className="lp-divider">
            <div className="lp-divider-line" />
            <span className="lp-divider-text">SurveyPulse © 2026</span>
            <div className="lp-divider-line" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
