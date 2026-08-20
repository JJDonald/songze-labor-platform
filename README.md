# 劳动课程平台

> 面向中学生的劳动教育课程管理与成果展示平台

## 📋 功能概览

### 学生端
- 📚 按年级/学期/任务群浏览劳动课程
- 📝 查看课程详情（演示视频/图片、学习目标、材料清单、操作步骤、安全提示）
- ✍️ 提交劳动成果（文字描述 + 图片上传）
- ❤️ 为同学成果点赞、手动评价或使用 AI 辅助评价
- 🤖 按管理员配置的评价维度生成评分、总结与改进建议
- 📊 查看个人学习档案与成长轨迹
- 🏆 查看成果展示墙（瀑布流浏览）

### 管理端
- 👥 用户管理（添加/编辑/删除学生账户）
- 📚 课程管理（创建/编辑/删除课程，支持封面图片、演示视频和演示图片）
- 🏆 成果管理（审核/公开/删除学生成果）
- 🤖 评价维度管理（名称、说明、权重、提示词、启用状态）
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
│   │   │   ├── admin/           # 管理后台（API、媒体上传组件）
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
│   │   │   ├── upload.ts        # 图片/视频上传
│   │   │   ├── courses.ts       # 课程查询
│   │   │   ├── achievements.ts  # 成果管理
│   │   │   └── students.ts      # 学生档案
│   │   ├── middleware/
│   │   │   └── admin.ts         # JWT 认证 & 管理员权限
│   │   ├── services/
│   │   │   ├── aiEvaluation.ts  # 外部 AI 调用与本地降级评价
│   │   │   └── evaluationDimensions.ts # 默认评价维度与评分归一化
│   │   ├── config.ts            # 应用配置
│   │   ├── prisma.ts            # Prisma 单例
│   │   └── index.ts             # Express 入口
│   ├── prisma/
│   │   ├── schema.prisma         # 数据库模型
│   │   └── seed.ts               # 测试数据种子
│   ├── uploads/                  # 上传文件目录
│   └── package.json
│
│   ├── deploy.sh                 # Ubuntu/Debian 生产构建脚本
│   ├── nginx.conf                # Nginx 反向代理配置
│   ├── ecosystem.config.cjs      # PM2 进程管理配置
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
npm run db:generate         # 生成 Prisma Client
npx prisma migrate deploy   # 应用仓库中已有迁移
npm run db:seed             # 灌入或更新幂等测试数据

# 3. 启动后端（终端 1）
npm run dev                 # 监听模式，http://localhost:3001

# 4. 启动前端（终端 2）
cd ..
npm install                 # 安装依赖
npm run dev                 # 开发服务器，http://localhost:5173
```

### 测试账户

| 角色 | 学籍号/账号 | 密码 | 权限 |
|------|--------|------|------|
| 👨‍💼 管理员 | `admin` | `admin123` | 完整管理权限 |
| 👨‍🎓 学生 | `2024060101` | `123456` | 浏览课程、提交成果 |
| 👩‍🎓 学生 | `2024060201` | `123456` | 浏览课程、提交成果 |

默认账户仅用于本地演示。公开注册必须由用户自己设置密码，不再使用 `123456`。`db:seed` 只会在账户不存在时写入默认密码，不会覆盖已修改的密码。公开部署前请立即修改管理员密码和 JWT 密钥。

## 🖥️ 生产部署（Ubuntu / Debian）

### 支持环境

| 系统 | 状态 | 建议用途 |
|---|---|---|
| Ubuntu Server 26.04 LTS | 推荐 | 新部署，标准安全维护至 2031 年 |
| Ubuntu Server 24.04 LTS | 推荐 | 云平台镜像成熟，适合稳健部署 |
| Ubuntu Server 22.04 LTS | 兼容 | 支持存量服务器，建议规划升级 |
| Debian 13（Trixie） | 推荐 | 当前稳定版，适合精简服务器 |
| Debian 12（Bookworm） | 兼容 | 适合现有服务器，已进入 LTS 阶段 |
| Debian 11（Bullseye） | 有限兼容 | 仅建议存量环境短期过渡，尽快升级 |

运行时要求 Node.js 20+，推荐 **Node.js 24 LTS**。不要在生产服务器使用 Ubuntu 非 LTS 版本或 Debian testing/unstable。Debian 11 的常规支持已经结束，使用前应确认安全更新来源和计划升级窗口。

### 自动构建

```bash
# 安装 Node.js 24 LTS（NodeSource）
curl -fsSL https://deb.nodesource.com/setup_24.x | sudo -E bash -
sudo apt-get install -y nodejs

# 克隆代码并切换分支
git clone https://github.com/JJDonald/songze-labor-platform.git
cd songze-labor-platform
git checkout feat/admin-management
cd labor-platform

# 准备生产环境变量
cp server/.env.example server/.env
nano server/.env
# 至少修改 JWT_SECRET、NODE_ENV=production、CORS_ORIGINS

chmod +x deploy.sh
./deploy.sh
```

`deploy.sh` 会验证操作系统和 Node.js 版本、安装 Nginx/SQLite/Certbot、备份现有数据库、应用 Prisma 正式迁移，并构建前后端。它不会自动覆盖 Nginx 站点，也不会签发证书。

### PM2 与 Nginx

```bash
# 安装并启动 PM2
sudo npm install -g pm2
mkdir -p server/logs
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup   # 按命令输出继续执行 systemd 注册命令

# 修改 nginx.conf 中的域名和项目绝对路径后启用站点
sudo cp nginx.conf /etc/nginx/sites-available/labor-platform
sudo ln -s /etc/nginx/sites-available/labor-platform /etc/nginx/sites-enabled/labor-platform
sudo nginx -t
sudo systemctl reload nginx

# HTTPS（Let's Encrypt）
sudo certbot --nginx -d yourdomain.com
```

PM2 配置通过 Node.js 的 `--env-file` 加载 `server/.env`。生产服务器升级时建议先备份 `server/prisma/dev.db`，再执行：

```bash
git pull
./deploy.sh
pm2 restart labor-api
```

### 环境变量说明

| 变量名 | 说明 | 默认值 | 生产必填 |
|--------|------|--------|----------|
| `DATABASE_URL` | SQLite 数据库路径 | `file:./dev.db` | 否 |
| `JWT_SECRET` | JWT 签名密钥 | *(开发默认)* | **是** |
| `PORT` | 后端服务端口 | `3001` | 否 |
| `NODE_ENV` | 运行环境 | `development` | 设为 `production` |
| `CORS_ORIGINS` | 允许的域名（逗号分隔） | `http://localhost:5173` | **是** |
| `AI_AGENT_BASE_URL` | AI 智能体服务基础地址，后端调用 `${AI_AGENT_BASE_URL}/evaluate` | 空（使用本地演示评价） | 否 |
| `AI_AGENT_API_KEY` | AI 智能体 Bearer Token | 空 | 按服务要求 |
| `VITE_API_URL` | 前端 API 地址（构建时） | `http://localhost:3001/api` | **是** |

前端构建时设置 API 地址:

```bash
cd labor-platform
VITE_API_URL=https://api.yourdomain.com/api npm run build
```

## 🤖 AI 评价说明

成果评价保留固定的三类数据字段：`attitude`（劳动态度）、`skill`（劳动技能）和 `result`（劳动成果）。管理员可在 `/admin/evaluation-dimensions` 调整每个维度的显示名称、说明、权重、提示词、排序和启用状态。

学生对其他同学的成果点击“一键 AI 评价”后，后端会：

1. 读取当前启用的评价维度；
2. 将成果标题、描述、反思、图片路径和维度配置发送给 AI 服务；
3. 将返回分数归一化为 1–5 的整数；
4. 新增或更新当前学生的评价，并重新计算成果平均分；
5. 返回评价总结和改进建议。

外部服务需要实现：

```http
POST ${AI_AGENT_BASE_URL}/evaluate
Authorization: Bearer ${AI_AGENT_API_KEY}
Content-Type: application/json
```

响应格式：

```json
{
  "scores": { "attitude": 4, "skill": 4, "result": 5 },
  "summary": "成果完成度较高，过程描述清楚。",
  "suggestions": ["补充工具使用细节", "进一步说明改进过程"]
}
```

未配置 `AI_AGENT_BASE_URL`，或外部服务调用失败、响应无效的时候，系统会自动使用本地规则生成演示评价，并在响应中返回 `source: "local"`。本地评价用于开发和演示，不应视为正式 AI 判断。

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
| `POST` | `/api/achievements/:id/evaluate` | 手动提交或更新评价 |
| `POST` | `/api/achievements/:id/ai-evaluate` | 生成并保存 AI 评价（不能评价自己的成果） |
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
| `GET` | `/api/admin/evaluation-dimensions` | 获取评价维度配置 |
| `PUT` | `/api/admin/evaluation-dimensions` | 更新评价维度配置 |
| `POST` | `/api/admin/evaluation-dimensions/reset` | 恢复默认评价维度 |
| `POST` | `/api/upload` | 图片/视频上传 (multipart/form-data, field: `file`) |

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

EvaluationDimension（独立配置表，供手动评价展示和 AI 评价使用）
```

## 🧱 数据库迁移

新增或更新环境时，优先应用仓库中已提交的迁移：

```bash
cd labor-platform/server
cp .env.example .env
npm run db:generate
npx prisma migrate deploy
npm run db:seed
```

`db:seed` 使用 `upsert`，可重复运行。开发阶段快速同步 Schema 可使用 `npm run db:push`，但生产部署应保留并执行正式迁移。本次 AI 评价功能对应迁移为 `20260810084000_add_evaluation_dimensions`。

## ✅ 质量检查

```bash
# 前端
cd labor-platform
npm run lint
npm run build

# 后端
cd server
npm run build
```

目前项目尚未配置自动化测试与 CI，合并重要功能前至少应执行以上检查，并手工验证登录、成果详情、评价维度管理和 AI 评价链路。

## ⚠️ 注意事项

1. **生产安全**：部署前务必修改 `.env` 中的 `JWT_SECRET`，使用强随机字符串。
2. **AI 服务**：未配置外部服务时使用的是本地演示评价；生产环境应配置真实服务，并保护 `AI_AGENT_API_KEY`。
3. **数据库备份**：SQLite 是单文件数据库，执行迁移或部署前应先备份 `server/prisma/dev.db`。
4. **上传目录**：`server/uploads/` 需要在 Nginx 中配置静态文件服务或通过后端代理。
5. **文件上传限制**：成果图片接口限制为 5MB；管理端媒体接口允许更大文件，但还需同步调整 Nginx 的 `client_max_body_size`。
6. **权限控制**：admin 路由受 JWT + 角色双重验证，普通学生无法访问；后端权限校验才是安全边界。

## 📄 许可证

本项目仅供教学使用
