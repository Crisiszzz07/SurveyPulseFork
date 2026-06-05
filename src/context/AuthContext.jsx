import React, { createContext, useState, useEffect } from 'react';
import { supabase } from '../api/supabase';

export const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // On mount, restore session from localStorage
  useEffect(() => {
    const savedUser = localStorage.getItem('survey_dashboard_user');
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch {
        localStorage.removeItem('survey_dashboard_user');
      }
    }
    setLoading(false);
  }, []);

  /**
   * Login: queries the custom User table directly.
   * The password in the DB is stored in plain text (as per the current schema).
   */
  const login = async (email, password) => {
    setLoading(true);
    try {
      // Query the real User table by email
      const { data: users, error } = await supabase
        .from('User')
        .select('id, nombre, apellido, email, rol, empresa_id, estado, password')
        .eq('email', email.trim().toLowerCase())
        .limit(1);

      if (error) throw error;

      if (!users || users.length === 0) {
        setLoading(false);
        return { success: false, error: 'Correo electrónico no registrado en el sistema.' };
      }

      const dbUser = users[0];

      // Check password (plain text comparison as per schema)
      if (dbUser.password !== password) {
        setLoading(false);
        return { success: false, error: 'Contraseña incorrecta.' };
      }

      if (dbUser.estado && dbUser.estado !== 'ACTIVO') {
        setLoading(false);
        return { success: false, error: 'Usuario inactivo. Contacte al administrador.' };
      }

      // Build the session user object — includes real DB id and empresa_id
      const sessionUser = {
        id: dbUser.id,
        email: dbUser.email,
        name: `${dbUser.nombre} ${dbUser.apellido}`,
        nombre: dbUser.nombre,
        apellido: dbUser.apellido,
        role: dbUser.rol,   // ADMIN | COMPANY_ADMIN | EVALUATOR
        empresa_id: dbUser.empresa_id || null,
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

  const logout = async () => {
    setUser(null);
    localStorage.removeItem('survey_dashboard_user');
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
