import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const uploadsDir = path.join(__dirname, '../uploads');

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const IMAGE_TYPES: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/gif': '.gif',
  'image/webp': '.webp',
};

const VIDEO_TYPES: Record<string, string> = {
  'video/mp4': '.mp4',
  'video/webm': '.webm',
  'video/ogg': '.ogv',
};

const mimeToExt = (mime: string, allowVideo: boolean) => {
  if (IMAGE_TYPES[mime]) return IMAGE_TYPES[mime];
  if (allowVideo && VIDEO_TYPES[mime]) return VIDEO_TYPES[mime];
  return null;
};

const createStorage = (allowVideo: boolean) =>
  multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadsDir),
    filename: (_req, file, cb) => {
      const ext = mimeToExt(file.mimetype, allowVideo) || '.bin';
      cb(null, `${uuidv4()}${ext}`);
    },
  });

export const studentImageUpload = multer({
  storage: createStorage(false),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (IMAGE_TYPES[file.mimetype]) {
      cb(null, true);
      return;
    }
    cb(new Error('只支持 JPG、PNG、GIF、WEBP 格式的图片'));
  },
});

export const adminMediaUpload = multer({
  storage: createStorage(true),
  limits: { fileSize: 200 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (mimeToExt(file.mimetype, true)) {
      cb(null, true);
      return;
    }
    cb(new Error('不支持的文件类型'));
  },
});
