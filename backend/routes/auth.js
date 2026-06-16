import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pool from '../db.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'survey_pulse_secret_key_2026_xyz';

// Helper para verificar contraseñas (con soporte fallback para texto plano de semillas)
async function verifyPassword(inputPassword, storedPassword) {
  try {
    const match = await bcrypt.compare(inputPassword, storedPassword);
    if (match) return true;
  } catch (e) {
    // Si falla bcrypt (por ejemplo si la contraseña almacenada no es un hash válido)
  }
  // Fallback a texto plano para usuarios semilla
  return inputPassword === storedPassword;
}

// 1. Registro de usuario
router.post('/register', async (req, res) => {
  const { email, password, nombre, apellido, rol, nombreEmpresa, nitEmpresa, sectorEmpresa } = req.body;

  if (!email || !password || !nombre || !apellido || !rol) {
    return res.status(400).json({ success: false, error: 'Faltan campos obligatorios.' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    let empresaId = null;
    // Si el rol es COMPANY_ADMIN y se pasaron los datos de la empresa, la creamos
    if (rol === 'COMPANY_ADMIN' && nombreEmpresa) {
      const companyRes = await client.query(
        `INSERT INTO "Company" (nombre_empresa, nit, sector, correo)
         VALUES ($1, $2, $3, $4)
         RETURNING id`,
        [nombreEmpresa, nitEmpresa || `NIT-${Date.now()}`, sectorEmpresa || 'General', email]
      );
      empresaId = companyRes.rows[0].id;
    }

    // Encriptar contraseña
    const hashedPassword = await bcrypt.hash(password, 10);
    const userEmail = email.trim().toLowerCase();

    // Insertar usuario
    const userRes = await client.query(
      `INSERT INTO "User" (nombre, apellido, email, password, rol, empresa_id, estado)
       VALUES ($1, $2, $3, $4, $5, $6, 'ACTIVO')
       RETURNING id, nombre, apellido, email, rol, empresa_id, estado`,
      [nombre.trim(), apellido.trim(), userEmail, hashedPassword, rol, empresaId]
    );

    await client.query('COMMIT');

    res.status(201).json({
      success: true,
      user: userRes.rows[0]
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error al registrar usuario:', error);
    res.status(500).json({ success: false, error: 'Error interno al registrar el usuario: ' + error.message });
  } finally {
    client.release();
  }
});

// 2. Inicio de sesión (Login)
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ success: false, error: 'Correo y contraseña son requeridos.' });
  }

  try {
    const userEmail = email.trim().toLowerCase();
    const userRes = await pool.query(
      `SELECT id, nombre, apellido, email, password, rol, empresa_id, estado 
       FROM "User" 
       WHERE email = $1 LIMIT 1`,
      [userEmail]
    );

    if (userRes.rows.length === 0) {
      return res.status(401).json({ success: false, error: 'Correo electrónico no registrado.' });
    }

    const dbUser = userRes.rows[0];

    // Verificar contraseña (encriptada o plano de semilla)
    const isPasswordCorrect = await verifyPassword(password, dbUser.password);
    if (!isPasswordCorrect) {
      return res.status(401).json({ success: false, error: 'Contraseña incorrecta.' });
    }

    if (dbUser.estado !== 'ACTIVO') {
      return res.status(403).json({ success: false, error: 'Usuario inactivo. Contacte al administrador.' });
    }

    // Generar Token JWT
    const tokenPayload = {
      id: dbUser.id,
      email: dbUser.email,
      nombre: dbUser.nombre,
      apellido: dbUser.apellido,
      rol: dbUser.rol,
      empresa_id: dbUser.empresa_id
    };

    const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '7d' });

    res.json({
      success: true,
      token,
      user: {
        id: dbUser.id,
        email: dbUser.email,
        name: `${dbUser.nombre} ${dbUser.apellido}`,
        nombre: dbUser.nombre,
        apellido: dbUser.apellido,
        role: dbUser.rol,
        empresa_id: dbUser.empresa_id,
        estado: dbUser.estado
      }
    });

  } catch (error) {
    console.error('Error al iniciar sesión:', error);
    res.status(500).json({ success: false, error: 'Error interno del servidor al iniciar sesión.' });
  }
});

// 3. Recuperar contraseña (Simulado)
router.post('/recover', (req, res) => {
  const { email } = req.body;
  console.log(`Solicitud de recuperación para: ${email}`);
  res.json({ success: true, message: 'Enlace de recuperación enviado (simulado).' });
});

// 4. Actualizar contraseña (Reset)
router.post('/reset-password', authenticateToken, async (req, res) => {
  const { password } = req.body;
  const userId = req.user.id;

  if (!password) {
    return res.status(400).json({ success: false, error: 'La nueva contraseña es requerida.' });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    await pool.query(
      `UPDATE "User" 
       SET password = $1, updated_at = NOW() 
       WHERE id = $2`,
      [hashedPassword, userId]
    );

    res.json({ success: true, message: 'Contraseña actualizada correctamente.' });
  } catch (error) {
    console.error('Error al actualizar contraseña:', error);
    res.status(500).json({ success: false, error: 'Error al actualizar la contraseña.' });
  }
});

// 5. Cerrar sesión
router.post('/logout', (req, res) => {
  res.json({ success: true });
});

export default router;
