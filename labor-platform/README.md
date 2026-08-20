# 劳动课程平台 · 应用目录

这是前端与后端应用所在目录。项目背景、完整功能、API、数据模型及生产部署说明请查看仓库根目录的 [README.md](../README.md)。

## 功能入口

- 学生端：`/`、`/courses`、`/achievements`、`/achievements/submit`、`/profile`
- 管理端：`/admin`、`/admin/users`、`/admin/courses`、`/admin/achievements`
- AI 评价维度：`/admin/evaluation-dimensions`
- 后端健康检查：`http://localhost:3001/api/health`

## 本地启动

要求 Node.js 20+、npm 10+。前后端是两个独立 npm 项目，需要分别安装依赖和启动。

### 1. 初始化后端

```bash
cd server
cp .env.example .env
npm install
npm run db:generate
npx prisma migrate deploy
npm run db:seed
npm run dev
```

后端默认运行在 `http://localhost:3001`。

如果本地已有未记录迁移历史的旧数据库，可先备份 `server/prisma/dev.db`，再根据实际情况使用 `npm run db:push` 同步结构。生产环境应使用正式迁移，不要用 `db push` 代替迁移管理。

### 2. 启动前端

另开终端，在当前 `labor-platform` 目录执行：

```bash
npm install
npm run dev
```

前端默认运行在 `http://localhost:5173`，开发环境通过 Vite 把 `/api` 和 `/uploads` 代理到 `http://localhost:3001`。

## AI 评价配置

后端 `.env` 支持：

```dotenv
AI_AGENT_BASE_URL=
AI_AGENT_API_KEY=
```

配置后，服务端会向 `${AI_AGENT_BASE_URL}/evaluate` 发送成果信息和管理员设置的评价维度。外部服务应返回：

```json
{
  "scores": { "attitude": 4, "skill": 4, "result": 5 },
  "summary": "评价总结",
  "suggestions": ["改进建议一", "改进建议二"]
}
```

未配置地址或外部服务失败时，系统会使用本地规则生成演示评分，并返回 `source: "local"`。管理员可以在 `/admin/evaluation-dimensions` 修改维度名称、说明、权重、提示词、排序和启用状态。

## 常用命令

```bash
# 前端开发、检查与构建
npm run dev
npm run lint
npm run build
npm run preview

# 后端（在 server 目录执行）
npm run dev
npm run build
npm start
npm run db:generate
npm run db:push
npm run db:seed
npm run db:studio
```

## 数据库迁移

当前迁移包括：

- `20260408021502_init`
- `20260410055157_add_admin_role_and_cover_image`
- `20260429042000_add_course_demo_media`
- `20260810084000_add_evaluation_dimensions`

部署时执行：

```bash
cd server
npm run db:generate
npx prisma migrate deploy
npm run db:seed
```

## 生产系统支持

支持 Ubuntu Server 22.04、24.04、26.04 LTS，以及 Debian 11、12、13；Node.js 要求 20+，推荐 24 LTS。新部署优先选择 Ubuntu 24.04/26.04 LTS 或 Debian 13，Debian 11 仅建议用于存量环境短期过渡。准备好 `server/.env` 后，可以执行：

```bash
chmod +x deploy.sh
./deploy.sh
```

脚本会安装 Ubuntu/Debian 通用系统依赖、备份现有 SQLite 数据库、应用正式迁移并构建前后端。进程管理使用 `ecosystem.config.cjs`，它会通过 Node.js `--env-file` 加载 `server/.env`。完整的 PM2、Nginx 和 HTTPS 步骤见仓库根目录 README。

## 默认测试账户

| 角色 | 账号 | 密码 |
|---|---|---|
| 管理员 | `admin` | `admin123` |
| 学生 | `2024060101` | `123456` |
| 学生 | `2024060201` | `123456` |

默认账户仅用于本地开发和演示。公开注册需要用户自行设置密码；重复执行 `db:seed` 不会覆盖已修改的密码。部署到公开环境前必须修改密码与 JWT 密钥。

## 提交前检查

```bash
# 当前目录
npm run lint
npm run build

# 后端
npm --prefix server run build
```

项目当前尚未配置自动化测试。涉及评价功能时，还应手工验证管理员维度读取/保存、学生成果详情、一键 AI 评价、评分持久化及平均分更新。
