import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

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

// Manejo de errores global
app.use((err, req, res, next) => {
  console.error('Error no controlado en el servidor:', err);
  res.status(500).json({ success: false, error: 'Ocurrió un error interno en el servidor.' });
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`Servidor Express corriendo localmente en: http://localhost:${PORT}`);
});
