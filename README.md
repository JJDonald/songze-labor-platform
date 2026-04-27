# 劳动课程平台

> 面向中学生的劳动教育课程管理与成果展示平台

## 📋 功能概览

### 学生端
- 📚 按年级/学期/任务群浏览劳动课程
- 📝 查看课程详情（学习目标、材料清单、操作步骤、安全提示）
- ✍️ 提交劳动成果（文字描述 + 图片上传）
- ❤️ 为同学成果点赞、互相评价
- 📊 查看个人学习档案与成长轨迹
- 🏆 查看成果展示墙（瀑布流瀑布瀑布浏览）

### 管理端
- 👥 用户管理（添加/编辑/删除学生账户）
- 📚 课程管理（创建/编辑/删除课程，支持封面图片上传）
- 🏆 成果管理（审核/公开/删除学生成果）
- 📊 数据统计面板（用户/课程/成果/点赞数）

## 🛠️ 技术栈

| 层 | 技术 |
|---|---|
| **前端** | React 19 + TypeScript + Vite 8 + Tailwind CSS 4 + Zustand + React Query |
| **后端** | Express 4 + TypeScript + Prisma 6 |
| **数据库** | SQLite（零配置，开箱即用） |
| **认证** | JWT (jsonwebtoken + bcryptjs) |
| **文件上传** | Multer（本地文件系统存储） |

## 📁 项目结构

```
songze-labor-platform/
├── labor-platform/              # 前端（React SPA）
│   ├── src/
│   │   ├── features/            # 功能模块
│   │   │   ├── admin/           # 管理后台（API、图片上传组件）
│   │   │   ├── achievements/    # 成果展示
│   │   │   ├── auth/            # 认证（登录/注册/状态管理）
│   │   │   ├── courses/         # 课程学习
│   │   │   ├── home/            # 首页
│   │   │   ├── profile/         # 个人档案
│   │   │   └── shared/          # 共享组件/工具
│   │   ├── pages/               # 页面组件（含管理页面）
│   │   ├── router/              # 路由配置
│   │   └── lib/                 # API 客户端
│   ├── public/
│   └── package.json
│
├── labor-platform/server/       # 后端（Express API）
│   ├── src/
│   │   ├── routes/              # API 路由
│   │   │   ├── auth.ts          # 登录/注册/用户信息
│   │   │   ├── admin.ts         # 管理 API（CRUD）
│   │   │   ├── upload.ts        # 图片上传
│   │   │   ├── courses.ts       # 课程查询
│   │   │   ├── achievements.ts  # 成果管理
│   │   │   └── students.ts      # 学生档案
│   │   ├── middleware/
│   │   │   └── admin.ts         # JWT 认证 & 管理员权限
│   │   ├── config.ts            # 应用配置
│   │   ├── prisma.ts            # Prisma 单例
│   │   └── index.ts             # Express 入口
│   ├── prisma/
│   │   ├── schema.prisma         # 数据库模型
│   │   └── seed.ts               # 测试数据种子
│   ├── uploads/                  # 上传文件目录
│   └── package.json
│
├── deploy.sh                     # Debian 12 部署脚本
├── nginx.conf                    # Nginx 反向代理配置
├── ecosystem.config.js           # PM2 进程管理配置
└── README.md
```

## 🚀 快速开始

### 前置要求

| 依赖 | 版本 | 说明 |
|------|------|------|
| Node.js | ≥ 20.0 | [官方下载](https://nodejs.org/) 或使用 nvm |
| npm | ≥ 10.0 | 随 Node.js 一起安装 |
| Git | 任意版本 | 用于克隆仓库 |

### 本地开发

```bash
# 1. 克隆项目
git clone https://github.com/JJDonald/songze-labor-platform.git
cd songze-labor-platform

# 切换到开发分支
git checkout feat/admin-management

# 2. 安装后端依赖并初始化数据库
cd labor-platform/server
cp .env.example .env        # 复制配置模板
npm install                 # 安装依赖
npx prisma generate         # 生成 Prisma Client
npx prisma db push          # 创建数据库表
npx tsx prisma/seed.ts      # 灌入测试数据

# 3. 启动后端（终端 1）
npm run dev                 # 监听模式，http://localhost:3001

# 4. 启动前端（终端 2）
cd ../labor-platform
npm install                 # 安装依赖
npm run dev                 # 开发服务器，http://localhost:5173
```

### 测试账户

| 角色 | 用户名 | 密码 | 权限 |
|------|--------|------|------|
| 👨‍💼 管理员 | `admin` | `admin123` | 完整管理权限 |
| 👨‍🎓 学生 | `2024060101` | `123456` | 浏览课程、提交成果 |
| 👩‍🎓 学生 | `2024060201` | `123456` | 浏览课程、提交成果 |

## 🖥️ 生产部署（Debian 12 VPS）

### 一键部署

```bash
# 1. 安装 Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo bash -
sudo apt-get install -y nodejs

# 2. 克隆并部署
git clone https://github.com/JJDonald/songze-labor-platform.git
cd songze-labor-platform/labor-platform
git checkout feat/admin-management
chmod +x deploy.sh
./deploy.sh
```

### 手动部署

```bash
# 配置环境变量
cd server
cp .env.example .env
nano .env
# 必须修改 JWT_SECRET:
# JWT_SECRET=$(openssl rand -base64 32)

# 构建并启动后端
npm install --include=dev
npm run db:generate
npx prisma db push
npm run db:seed          # 仅首次运行
npm run build            # TypeScript → JavaScript
npm start                # 或 pm2 start ecosystem.config.js

# Nginx 配置
sudo cp ../nginx.conf /etc/nginx/sites-available/labor-platform
sudo nano /etc/nginx/sites-available/labor-platform  # 修改域名
sudo ln -s /etc/nginx/sites-available/labor-platform /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx

# HTTPS (Let's Encrypt)
sudo certbot --nginx -d yourdomain.com
```

### 环境变量说明

| 变量名 | 说明 | 默认值 | 生产必填 |
|--------|------|--------|----------|
| `DATABASE_URL` | SQLite 数据库路径 | `file:./prisma/dev.db` | 否 |
| `JWT_SECRET` | JWT 签名密钥 | *(开发默认)* | **是** |
| `PORT` | 后端服务端口 | `3001` | 否 |
| `NODE_ENV` | 运行环境 | `development` | 设为 `production` |
| `CORS_ORIGINS` | 允许的域名（逗号分隔） | `localhost:5173-5175` | **是** |
| `VITE_API_URL` | 前端 API 地址（构建时） | `http://localhost:3001/api` | **是** |

前端构建时设置 API 地址:

```bash
cd labor-platform
VITE_API_URL=https://api.yourdomain.com/api npm run build
```

## 📡 API 文档

### 公开接口

| 方法 | 路径 | 说明 |
|------|------|------|
| `GET` | `/api/health` | 健康检查 |
| `POST` | `/api/auth/register` | 注册学生账户 |
| `POST` | `/api/auth/login` | 登录 |
| `GET` | `/api/courses` | 课程列表（支持 `?gradeId=&taskGroupId=&search=` 筛选） |
| `GET` | `/api/courses/:id` | 课程详情 |
| `GET` | `/api/achievements` | 成果列表 |
| `GET` | `/api/courses/grades` | 年级列表 |
| `GET` | `/api/courses/task-groups` | 任务群列表 |

### 认证接口 (需要 Bearer Token)

| 方法 | 路径 | 说明 |
|------|------|------|
| `GET` | `/api/auth/me` | 获取当前用户信息 |
| `POST` | `/api/auth/update-avatar` | 更新头像 |
| `POST` | `/api/auth/change-password` | 修改密码 |
| `POST` | `/api/achievements` | 提交成果 |
| `POST` | `/api/achievements/:id/like` | 点赞 |
| `POST` | `/api/achievements/:id/evaluate` | 评价 |
| `GET` | `/api/students/:id/profile` | 查看学生档案 |

### 管理员接口 (需要 admin 角色)

| 方法 | 路径 | 说明 |
|------|------|------|
| `GET` | `/api/admin/stats` | 统计数据 |
| `GET/POST/PUT/DELETE` | `/api/admin/users` | 用户管理 |
| `GET/POST/PUT/DELETE` | `/api/admin/courses` | 课程管理 |
| `GET/PUT/DELETE` | `/api/admin/achievements` | 成果管理 |
| `GET` | `/api/admin/task-groups` | 任务群列表 |
| `GET` | `/api/admin/grades` | 年级列表 |
| `POST` | `/api/upload` | 图片上传 (multipart/form-data, field: `image`) |

### 认证方式

```bash
curl -H "Authorization: Bearer <your-jwt-token>" http://localhost:3001/api/auth/me
```

## 🗄️ 数据库模型

```
TaskGroup ──┐
             ├── Course ──── Achievement ──── Like
Grade ───────┘                   │                │
                                 ├── Evaluation ──┘
                                 └── Student ──── StudentBadge
                                                       └── Badge
```

## ⚠️ 注意事项

1. **生产安全**: 部署前务必修改 `.env` 中的 `JWT_SECRET`，使用强随机字符串
2. **数据库备份**: SQLite 是单文件数据库，定期备份 `server/prisma/dev.db`
3. **上传目录**: `server/uploads/` 目录需要在 Nginx 中配置静态文件服务或通过后端代理
4. **文件上传限制**: 单个文件最大 5MB，支持 jpg/png/gif/webp 格式
5. **权限控制**: admin 路由受 JWT + 角色双重验证，普通学生无法访问

## 📄 许可证

本项目仅供教学使用
