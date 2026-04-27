#!/bin/bash
# =========================================
# 劳动平台 - Debian 12 部署脚本
# =========================================
# 使用方法:
#   chmod +x deploy.sh
#   ./deploy.sh
#
# 首次部署前请确保:
#   1. 已安装 Node.js 20+
#   2. 已复制 .env.example 为 .env 并修改配置
# =========================================

set -e

echo "========================================"
echo " 劳动平台 - 部署脚本"
echo "========================================"

# 检查 Node.js 版本
echo ""
echo "📋 检查 Node.js..."
if ! command -v node &> /dev/null; then
    echo "❌ 未找到 Node.js，请先安装"
    echo "   安装方式:"
    echo "   curl -fsSL https://deb.nodesource.com/setup_20.x | sudo bash -"
    echo "   sudo apt-get install -y nodejs"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 20 ]; then
    echo "❌ Node.js 版本过低 (当前: $(node -v), 需要: >= 20)"
    echo "   请升级 Node.js"
    exit 1
fi

echo "✅ Node.js $(node -v) 已安装"

# 检查 npm
if ! command -v npm &> /dev/null; then
    echo "❌ 未找到 npm"
    exit 1
fi

# 安装系统依赖
echo ""
echo "📦 安装系统依赖..."
sudo apt-get update -qq
sudo apt-get install -y -qq libsqlite3-dev nginx certbot python3-certbot-nginx > /dev/null 2>&1 || true
echo "✅ 系统依赖安装完成"

# 安装 SQLite 支持
echo ""
echo "🗄️ 检查 SQLite..."
if command -v sqlite3 &> /dev/null; then
    echo "✅ SQLite $(sqlite3 --version) 已安装"
else
    echo "⚠️  SQLite 命令行未安装（可选）"
fi

# 后端部署
echo ""
echo "🔧 部署后端..."
cd "$(dirname "$0")/server"

# 安装后端依赖
echo "   📥 安装依赖..."
npm install --include=dev

# 生成 Prisma Client
echo "   🔗 生成 Prisma Client..."
npm run db:generate

# 初始化数据库
if [ ! -f "prisma/dev.db" ]; then
    echo "   🗄️ 初始化数据库..."
    npx prisma db push
    echo "   📊 灌入测试数据..."
    npm run db:seed
else
    echo "   ✅ 数据库存在，跳过初始化"
    echo "   🔗 同步数据库结构..."
    npx prisma db push
fi

# 构建后端
echo "   🔨 构建后端..."
rm -rf dist/
npm run build

# 确保 uploads 目录存在
mkdir -p uploads
echo "   📁 uploads 目录已就绪"

# 前端部署
echo ""
echo "🎨 部署前端..."
cd ../labor-platform

# 安装前端依赖
echo "   📥 安装依赖..."
npm install

# 构建前端（生产模式）
echo "   🔨 构建前端..."
npm run build

echo ""
echo "========================================"
echo " ✅ 部署完成！"
echo "========================================"
echo ""
echo "启动后端服务:"
echo "   cd server"
echo "   NODE_ENV=production npm start"
echo "   # 或使用 PM2:"
echo "   pm2 start dist/index.js --name labor-api"
echo ""
echo "配置 Nginx:"
echo "   sudo cp nginx.conf /etc/nginx/sites-available/labor-platform"
echo "   sudo nano /etc/nginx/sites-available/labor-platform  # 修改域名"
echo "   sudo ln -s /etc/nginx/sites-available/labor-platform /etc/nginx/sites-enabled/"
echo "   sudo nginx -t && sudo systemctl reload nginx"
echo ""
echo "配置 HTTPS:"
echo "   sudo certbot --nginx -d yourdomain.com"
