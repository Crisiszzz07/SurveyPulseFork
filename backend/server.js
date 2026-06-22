import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
// Importar rutas
import authRoutes from './routes/auth.js';
import companyRoutes from './routes/companies.js';
import userRoutes from './routes/users.js';
import surveyRoutes from './routes/surveys.js';
import attemptRoutes from './routes/attempts.js';
import assignmentRoutes from './routes/assignments.js';
import categoryRoutes from './routes/categories.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors()); // Permitir peticiones de cualquier origen (para desarrollo)
app.use(express.json());

// Registrar rutas de la API
app.use('/api/auth', authRoutes);
app.use('/api/companies', companyRoutes);
app.use('/api/users', userRoutes);
app.use('/api/surveys', surveyRoutes);
app.use('/api/attempts', attemptRoutes);
app.use('/api/assignments', assignmentRoutes);
app.use('/api/categories', categoryRoutes);

// Ruta de diagnóstico simple
app.get('/health', (req, res) => {
  res.json({ status: 'UP', timestamp: new Date() });
});
//conexión con el frontend porque antes no había
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Servir los archivos estáticos de la carpeta dist (subiendo un nivel a la raíz)
app.use(express.static(path.join(__dirname, '../dist')));

// Cualquier ruta que no sea de la API, devuelve el index.html para React Router
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../dist/index.html'));
});
// Manejo de errores global
app.use((err, req, res, next) => {
  console.error('Error no controlado en el servidor:', err);
  res.status(500).json({ success: false, error: 'Ocurrió un error interno en el servidor.' });
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`Servidor Express corriendo localmente en: http://localhost:${PORT}`);
});
