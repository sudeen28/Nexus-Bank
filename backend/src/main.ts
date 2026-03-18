import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import path from 'path';
import fs from 'fs';

import { config } from './config';
import { logger } from './common/logger';
import { errorHandler, notFoundHandler } from './common/errors';
import { connectDB, disconnectDB } from './prisma/client';

import authRoutes from './auth/auth.routes';
import usersRoutes from './users/users.routes';
import accountsRoutes from './accounts/accounts.routes';
import transactionsRoutes from './transactions/transactions.routes';
import cardsRoutes from './cards/cards.routes';
import notificationsRoutes from './notifications/notifications.routes';
import kycRoutes from './kyc/kyc.routes';
import adminRoutes from './admin/admin.routes';

const app = express();

// ─── Ensure directories exist ───
[config.upload.dir, config.logDir, path.join(config.upload.dir, 'kyc')].forEach((dir) => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// ─── Security middleware ───
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));
app.use(cors({
  origin: [config.frontendUrl, 'http://localhost:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// ─── Global rate limit ───
app.use(rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.max,
  message: { success: false, error: { code: 'RATE_LIMITED', message: 'Too many requests' } },
  standardHeaders: true,
  legacyHeaders: false,
}));

// ─── Body parsing ───
// Raw body for Stripe webhooks
app.use(`${config.apiPrefix}/transactions/webhook`, express.raw({ type: 'application/json' }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(compression());

// ─── Logging ───
app.use(morgan('combined', {
  stream: { write: (msg) => logger.http(msg.trim()) },
  skip: (req) => req.url === '/health',
}));

// ─── Static files ───
app.use('/uploads', express.static(path.join(process.cwd(), config.upload.dir)));

// ─── Health check ───
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', env: config.env, timestamp: new Date().toISOString() });
});

// ─── API Routes ───
const api = config.apiPrefix;
app.use(`${api}/auth`, authRoutes);
app.use(`${api}/users`, usersRoutes);
app.use(`${api}/accounts`, accountsRoutes);
app.use(`${api}/transactions`, transactionsRoutes);
app.use(`${api}/cards`, cardsRoutes);
app.use(`${api}/notifications`, notificationsRoutes);
app.use(`${api}/kyc`, kycRoutes);
app.use(`${api}/admin`, adminRoutes);

// ─── Error handling ───
app.use(notFoundHandler);
app.use(errorHandler);

// ─── Start server ───
async function bootstrap() {
  await connectDB();

  const server = app.listen(config.port, () => {
    logger.info(`🚀 NexusBank API running on port ${config.port}`);
    logger.info(`📍 API prefix: ${config.apiPrefix}`);
    logger.info(`🌍 Environment: ${config.env}`);
    logger.info(`🔗 Frontend URL: ${config.frontendUrl}`);
  });

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    logger.info(`${signal} received. Shutting down gracefully...`);
    server.close(async () => {
      await disconnectDB();
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('unhandledRejection', (reason) => {
    logger.error('Unhandled rejection:', reason);
  });
}

bootstrap();

export default app;
