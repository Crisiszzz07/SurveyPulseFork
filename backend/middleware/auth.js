import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

export function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  // Se espera el formato "Bearer <token>"
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ success: false, error: 'Token de acceso no proporcionado.' });
  }

  jwt.verify(token, process.env.JWT_SECRET || 'survey_pulse_secret_key_2026_xyz', (err, user) => {
    if (err) {
      return res.status(403).json({ success: false, error: 'Token de acceso inválido o expirado.' });
    }
    
    // Adjuntamos el usuario decodificado al request
    req.user = user;
    next();
  });
}
