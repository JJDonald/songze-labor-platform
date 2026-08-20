#!/usr/bin/env bash
# 劳动课程平台生产构建脚本
# 支持：Ubuntu Server 22.04/24.04/26.04 LTS、Debian 11/12/13

set -Eeuo pipefail

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SERVER_DIR="$APP_DIR/server"
ENV_FILE="$SERVER_DIR/.env"
DATABASE_FILE="$SERVER_DIR/prisma/dev.db"
BACKUP_DIR="$SERVER_DIR/backups"

log() {
    printf '\n[%s] %s\n' "$(date '+%H:%M:%S')" "$1"
}

fail() {
    printf '\n错误：%s\n' "$1" >&2
    exit 1
}

[[ -r /etc/os-release ]] || fail "无法识别操作系统，仅支持 Ubuntu 和 Debian。"
# shellcheck disable=SC1091
source /etc/os-release

case "${ID:-}" in
    ubuntu)
        case "${VERSION_ID:-}" in
            22.04|24.04|26.04) ;;
            *) fail "当前 Ubuntu ${VERSION_ID:-未知} 不在支持列表中，请使用 Ubuntu Server 22.04、24.04 或 26.04 LTS。" ;;
        esac
        ;;
    debian)
        case "${VERSION_ID:-}" in
            11|12|13) ;;
            *) fail "当前 Debian ${VERSION_ID:-未知} 不在支持列表中，请使用 Debian 11、12 或 13。" ;;
        esac
        ;;
    *)
        fail "当前系统 ${PRETTY_NAME:-未知} 不受支持，请使用 Ubuntu Server 22.04/24.04/26.04 LTS 或 Debian 11/12/13。"
        ;;
esac

printf '%s\n' "========================================"
printf '%s\n' " 劳动课程平台 - 生产构建"
printf '%s\n' " 系统：${PRETTY_NAME}"
printf '%s\n' "========================================"

command -v node >/dev/null 2>&1 || fail "未找到 Node.js。请先安装 Node.js 24 LTS。"
command -v npm >/dev/null 2>&1 || fail "未找到 npm。请先安装 Node.js 24 LTS。"

NODE_MAJOR="$(node -p "process.versions.node.split('.')[0]")"
[[ "$NODE_MAJOR" -ge 20 ]] || fail "Node.js 版本过低：$(node -v)，需要 20 以上，推荐 24 LTS。"

[[ -f "$ENV_FILE" ]] || fail "缺少 $ENV_FILE。请先复制 server/.env.example 为 server/.env，并设置 JWT_SECRET、CORS_ORIGINS 等生产配置。"

if grep -Eq '^JWT_SECRET=(your-|labor-platform-secret-key-2026|$)' "$ENV_FILE"; then
    fail "server/.env 中仍是示例或空的 JWT_SECRET，请先替换为强随机密钥。"
fi

log "安装 Ubuntu/Debian 系统依赖"
sudo apt-get update
sudo apt-get install -y nginx sqlite3 certbot python3-certbot-nginx ca-certificates curl

log "安装并构建后端"
npm --prefix "$SERVER_DIR" ci --include=dev
npm --prefix "$SERVER_DIR" run db:generate

if [[ -f "$DATABASE_FILE" ]]; then
    mkdir -p "$BACKUP_DIR"
    BACKUP_FILE="$BACKUP_DIR/dev-$(date '+%Y%m%d-%H%M%S').db"
    cp "$DATABASE_FILE" "$BACKUP_FILE"
    printf '数据库备份：%s\n' "$BACKUP_FILE"
fi

DATABASE_URL="file:./dev.db" npm --prefix "$SERVER_DIR" exec prisma migrate deploy -- --schema "$SERVER_DIR/prisma/schema.prisma"
npm --prefix "$SERVER_DIR" run build
mkdir -p "$SERVER_DIR/uploads" "$SERVER_DIR/logs"

log "安装并构建前端"
npm --prefix "$APP_DIR" ci
VITE_API_URL="${VITE_API_URL:-/api}" npm --prefix "$APP_DIR" run build

log "检查 Nginx 服务"
sudo systemctl enable --now nginx

printf '\n%s\n' "构建完成。后续操作："
printf '%s\n' "1. 修改 nginx.conf 中的域名和项目绝对路径，然后复制到 /etc/nginx/sites-available/labor-platform。"
printf '%s\n' "2. 启用站点并执行：sudo nginx -t && sudo systemctl reload nginx"
printf '%s\n' "3. 在 $APP_DIR 安装 PM2 后执行：pm2 start ecosystem.config.cjs && pm2 save"
printf '%s\n' "4. 配置 HTTPS：sudo certbot --nginx -d yourdomain.com"
