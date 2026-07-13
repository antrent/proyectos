import React, { useState } from 'react';
import { authService } from '../services/AuthService';

export default function Login({ onLoginSuccess }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!username.trim() || !password) {
      setError('Por favor complete todos los campos.');
      return;
    }

    setLoading(true);
    // Add brief artificial delay for micro-animation feel
    try {
      const user = await authService.login(username, password);
      onLoginSuccess(user);
    } catch (err) {
      setError(err.message || 'Error de autenticación.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-wrapper">
      <div className="login-card">
        <div className="login-header">
          <div className="logo-icon">BE</div>
          <h1 className="login-title">Be Casual</h1>
          <p className="login-desc">Vístete para ser tú mismo.</p>
        </div>

        {error && (
          <div className="alert alert-error">
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        <form className="login-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="username">Usuario</label>
            <input
              type="text"
              id="username"
              className="form-control"
              placeholder="Ej. admin, cajero..."
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={loading}
              autoFocus
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="password">Contraseña</label>
            <input
              type="password"
              id="password"
              className="form-control"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
            />
          </div>

          <button 
            type="submit" 
            className="btn btn-primary" 
            style={{ marginTop: '8px', padding: '14px' }}
            disabled={loading}
          >
            {loading ? 'Iniciando sesión...' : 'Ingresar al Sistema'}
          </button>
        </form>

        <div style={{ textAlign: 'center', fontSize: '12px', color: 'var(--text-muted)', marginTop: '8px' }}>
          <p>Credenciales de demostración (Usuario / Clave):</p>
          <p style={{ marginTop: '4px' }}>
            <span style={{ color: 'var(--secondary)' }}>admin</span> / 123 &nbsp;|&nbsp; 
            <span style={{ color: 'var(--secondary)' }}>cajero</span> / 123 &nbsp;|&nbsp; 
            <span style={{ color: 'var(--secondary)' }}>comprador</span> / 123
          </p>
        </div>
      </div>
    </div>
  );
}
