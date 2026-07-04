import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import { apiRouter } from './server/routes';
import { loadDatabase, logAction } from './server/db';
import { checkAndRunEscalations } from './server/escalation';

// Load environment variables
dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  // 1. Initialize local persistent database & run initial SLA checking on startup
  console.log('[CivicLens Server] Booting and initializing system databases...');
  try {
    loadDatabase();
    checkAndRunEscalations(0);
    logAction('SYSTEM_BOOT', 'Server-Core', 'CivicLens AI core backend started successfully.');
  } catch (err) {
    console.error('[CivicLens Server] Error initializing database:', err);
  }

  // 2. Middlewares
  app.use(express.json());

  // 3. API Routes
  app.use('/api', apiRouter);

  // Healthcheck endpoint
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'CivicLens AI Smart Governance Core API'
    });
  });

  // 4. Vite Dev Server Integration / Production Static Asset Serving
  if (process.env.NODE_ENV !== 'production') {
    console.log('[CivicLens Server] Starting Vite in middleware mode...');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    console.log('[CivicLens Server] Production mode. Serving built client assets...');
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // 5. Start Server
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`===========================================================`);
    console.log(` 🏛️  CivicLens AI Smart Governance Server running on Port ${PORT}`);
    console.log(` 🌐  Access local environment: http://localhost:${PORT}`);
    console.log(`===========================================================`);
  });
}

startServer().catch(err => {
  console.error('[CivicLens Server] Fatal error booting backend server:', err);
});
export {};
