import app from './app.js';
import { isDefaultJwtSecret, NODE_ENV } from './config.js';

const PORT = parseInt(process.env.PORT || '3001', 10);

if (NODE_ENV === 'production' && isDefaultJwtSecret()) {
  console.error('错误：生产环境必须设置独立的 JWT_SECRET，不能使用默认密钥！');
  console.error('请在 .env 文件中设置 JWT_SECRET="your-secret-key"');
  process.exit(1);
}

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT} (${NODE_ENV})`);
  console.log('API endpoints:');
  console.log('POST /api/auth/register');
  console.log('POST /api/auth/login');
  console.log('GET  /api/achievements');
  console.log('POST /api/achievements');
  console.log('GET  /api/courses');
  console.log('GET  /api/students/:id/profile');
  console.log('Admin endpoints (require admin auth):');
  console.log('GET/POST/PUT/DELETE /api/admin/users');
  console.log('GET/POST/PUT/DELETE /api/admin/courses');
  console.log('GET/PATCH/DELETE /api/admin/achievements');
  console.log('GET  /api/admin/task-groups');
  console.log('GET  /api/admin/grades');
  console.log('GET  /api/admin/stats');
  console.log('POST /api/upload (media upload)');
});
