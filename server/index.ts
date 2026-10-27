import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import requestsRouter from './routes/requests';
import usersRouter from './routes/users';
import versionsRouter from './routes/versions';
import { pool, testConnection } from './db';
import { runAutoMigrations } from './migrate';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Health Check
app.get('/api/health', async (_req, res) => {
  const dbConnected = await testConnection();
  res.json({
    status: 'ok',
    database: dbConnected ? 'connected' : 'disconnected',
    serverTime: new Date().toISOString(),
  });
});

// Rotas de API
app.use('/api/requests', requestsRouter);
app.use('/api/users', usersRouter);
app.use('/api/versions', versionsRouter);

// Servir frontend compilado em ambiente de produção (CapRover / Docker)
const distPath = path.resolve(__dirname, '../dist');
app.use(express.static(distPath));

app.get('*', (_req, res) => {
  const indexPath = path.join(distPath, 'index.html');
  res.sendFile(indexPath, (err) => {
    if (err) {
      res.status(404).send('SmartBuy API Server is running. Frontend build not found.');
    }
  });
});

app.listen(PORT, async () => {
  console.log(`[SmartBuy Server] Servidor backend rodando na porta ${PORT}`);
  console.log(`[SmartBuy Server] Endpoint de Saúde: http://localhost:${PORT}/api/health`);
  
  // Tentar migração automática em segundo plano
  runAutoMigrations().catch((err) => {
    console.warn('[SmartBuy Server] Aviso ao verificar banco:', err.message);
  });
});

export default app;
