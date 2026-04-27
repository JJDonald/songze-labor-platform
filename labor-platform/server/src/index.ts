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

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 环境变量配置
const PORT = parseInt(process.env.PORT || '3001', 10);
const NODE_ENV = process.env.NODE_ENV || 'development';

// CORS 配置：从环境变量读取允许的域名，支持逗号分隔
const CORS_ORIGINS = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(',').map(origin => origin.trim())
  : ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175'];

const app = express();

app.use(cors({
  origin: (origin, callback) => {
    // 允许不带 origin 的请求（如 curl、Postman）
    if (!origin) return callback(null, true);
    if (CORS_ORIGINS.includes(origin) || CORS_ORIGINS.includes('*')) {
      return callback(null, true);
    }
    callback(new Error('CORS 策略阻止'));
  },
  credentials: true,
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 静态文件服务（上传目录）
const uploadsDir = path.join(__dirname, '../uploads');
app.use('/uploads', express.static(uploadsDir));

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/auth', authRoutes);
app.use('/api/achievements', achievementRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/upload', uploadRoutes);

app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ code: 500, message: '服务器内部错误', data: null });
});

// 生产环境 JWT Secret 检查
if (NODE_ENV === 'production' && !process.env.JWT_SECRET) {
  console.error('❌ 错误：生产环境必须设置 JWT_SECRET 环境变量！');
  console.error('   请在 .env 文件中设置 JWT_SECRET="your-secret-key"');
  process.exit(1);
}

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT} (${NODE_ENV})`);
  console.log(`📁 API endpoints:`);
  console.log(`   POST /api/auth/register`);
  console.log(`   POST /api/auth/login`);
  console.log(`   GET  /api/achievements`);
  console.log(`   POST /api/achievements`);
  console.log(`   GET  /api/courses`);
  console.log(`   GET  /api/students/:id/profile`);
  console.log(`   👨‍💼 Admin endpoints (require admin auth):`);
  console.log(`   GET/POST/PUT/DELETE /api/admin/users`);
  console.log(`   GET/POST/PUT/DELETE /api/admin/courses`);
  console.log(`   GET/PUT/DELETE /api/admin/achievements`);
  console.log(`   GET  /api/admin/task-groups`);
  console.log(`   GET  /api/admin/grades`);
  console.log(`   GET  /api/admin/stats`);
  console.log(`   POST /api/upload (image upload)`);
});