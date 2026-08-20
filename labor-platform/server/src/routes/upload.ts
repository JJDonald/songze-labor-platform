import { Router } from 'express';
import { authenticate, requireAdmin, rateLimit, AuthRequest } from '../middleware/admin.js';
import { adminMediaUpload } from '../upload.js';

const router = Router();

router.post('/', authenticate, requireAdmin, rateLimit('admin-upload', 30, 10 * 60 * 1000), (req: AuthRequest, res) => {
  adminMediaUpload.single('file')(req, res, (err) => {
    if (err) {
      const message = err.message || '上传失败';
      return res.status(400).json({
        code: 400,
        message: message.includes('File too large') ? '文件大小不能超过 200MB' : message,
        data: null,
      });
    }

    if (!req.file) {
      return res.status(400).json({
        code: 400,
        message: '请选择要上传的文件',
        data: null,
      });
    }

    res.json({
      code: 0,
      message: '上传成功',
      data: {
        url: `/uploads/${req.file.filename}`,
        filename: req.file.filename,
      },
    });
  });
});

export default router;
