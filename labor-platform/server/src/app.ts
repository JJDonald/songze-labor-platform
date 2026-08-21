import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import authRoutes from './routes/auth.js';
import achievementRoutes from './routes/achievements.js';
import courseRoutes from './routes/courses.js';
import studentRoutes from './routes/students.js';
import adminRoutes from './routes/admin.js';
import uploadRoutes from './routes/upload.js';
import { NODE_ENV } from './config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const corsOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(',').map(origin => origin.trim())
  : ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175'];

export function createApp() {
  const app = express();

  app.use(cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (corsOrigins.includes('*')) {
        if (NODE_ENV === 'production') {
          return callback(new Error('生产环境不允许 CORS_ORIGINS=*'));
        }
        return callback(null, true);
      }
      if (corsOrigins.includes(origin)) {
        return callback(null, true);
      }
      callback(new Error('CORS 策略阻止'));
    },
    credentials: true,
  }));

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  const uploadsDir = path.join(__dirname, '../uploads');
  app.use('/uploads', express.static(uploadsDir, {
    setHeaders: (res) => {
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('Content-Security-Policy', "default-src 'none'; img-src 'self'; media-src 'self'; style-src 'none'; script-src 'none'");
    },
  }));

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  app.use('/api/auth', authRoutes);
  app.use('/api/achievements', achievementRoutes);
  app.use('/api/courses', courseRoutes);
  app.use('/api/students', studentRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api/upload', uploadRoutes);

  app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error(err.stack);
    res.status(500).json({ code: 500, message: '服务器内部错误', data: null });
  });

  return app;
}

export default createApp();
