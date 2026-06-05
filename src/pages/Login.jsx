import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [submitting, setSubmitting] = useState(false);
  
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

  const handleQuickFill = (mockEmail, mockPassword) => {
    setEmail(mockEmail);
    setPassword(mockPassword);
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <span className="login-logo">📊</span>
          <h1>Acceso al Portal</h1>
          <p className="login-subtitle">SurveyPulse Analytics</p>
        </div>

        {errorMsg && <div className="error-alert">{errorMsg}</div>}

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label htmlFor="email">Correo Electrónico</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="ejemplo@correo.com"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Contraseña</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>

          <button type="submit" className="login-submit-btn" disabled={submitting}>
            {submitting ? 'Iniciando sesión...' : 'Entrar'}
          </button>
        </form>

        <div className="demo-credentials">
          <p className="demo-title">Accesos Rápidos:</p>
          <div className="demo-buttons">
            <button 
              type="button" 
              className="demo-btn admin"
              onClick={() => handleQuickFill('admin@supplychain.com', 'Admin1234!')}
            >
              Administrador Global
            </button>
            <button 
              type="button" 
              className="demo-btn evaluator"
              onClick={() => handleQuickFill('carlos.gomez@logixsolutions.com', 'Carlos1234!')}
            >
              Admin Empresa
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
