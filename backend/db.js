import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

// Podemos usar un connection string completo o parámetros individuales
const connectionString = process.env.DATABASE_URL;

const pool = connectionString
  ? new Pool({ connectionString })
  : new Pool({
      user: process.env.DB_USER || 'postgres',
      host: process.env.DB_HOST || 'localhost',
      database: process.env.DB_NAME || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      port: parseInt(process.env.DB_PORT || '5432', 10),
    });

pool.on('connect', () => {
  console.log('Base de datos conectada exitosamente');
});

pool.on('error', (err) => {
  console.error('Error inesperado en el pool de clientes de Postgres:', err);
});

export default pool;
