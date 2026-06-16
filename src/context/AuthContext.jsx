import React, { createContext, useState, useEffect } from 'react';
import { loginUser, logoutUser } from '../api/auth';

export const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Al montar, restauramos la sesión de localStorage si existe
  useEffect(() => {
    const savedUser = localStorage.getItem('survey_dashboard_user');
    const token = localStorage.getItem('survey_dashboard_token');
    
    if (savedUser && token) {
      try {
        setUser(JSON.parse(savedUser));
      } catch {
        localStorage.removeItem('survey_dashboard_user');
        localStorage.removeItem('survey_dashboard_token');
      }
    } else {
      // Si falta el token o el usuario, limpiamos todo
      localStorage.removeItem('survey_dashboard_user');
      localStorage.removeItem('survey_dashboard_token');
    }
    setLoading(false);
  }, []);

  /**
   * Inicio de sesión utilizando nuestro backend propio.
   */
  const login = async (email, password) => {
    setLoading(true);
    try {
      const result = await loginUser(email, password);

      if (!result.success) {
        setLoading(false);
        return { success: false, error: result.error || 'Credenciales incorrectas.' };
      }

      // El usuario retornado por el backend ya viene en el formato adecuado
      const sessionUser = {
        id: result.user.id,
        email: result.user.email,
        name: result.user.name || `${result.user.nombre} ${result.user.apellido}`,
        nombre: result.user.nombre,
        apellido: result.user.apellido,
        role: result.user.role || result.user.rol,
        empresa_id: result.user.empresa_id || null,
        isMock: false,
      };

      setUser(sessionUser);
      localStorage.setItem('survey_dashboard_user', JSON.stringify(sessionUser));
      setLoading(false);
      return { success: true };

    } catch (err) {
      console.error('Login error:', err.message);
      setLoading(false);
      return { success: false, error: `Error al iniciar sesión: ${err.message}` };
    }
  };

  /**
   * Cierre de sesión eliminando tokens e información local.
   */
  const logout = async () => {
    try {
      await logoutUser();
    } catch (err) {
      console.error('Error durante logout:', err);
    } finally {
      setUser(null);
      localStorage.removeItem('survey_dashboard_user');
      localStorage.removeItem('survey_dashboard_token');
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
