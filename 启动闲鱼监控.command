#!/bin/bash
# 闲鱼智能监控 - 一键启动
# 双击此文件即可启动服务并打开浏览器

cd "$(dirname "$0")"

echo "🐟 闲鱼智能监控系统"
echo "===================="

# 检查 Docker 是否运行
if ! docker info > /dev/null 2>&1; then
    echo "⚠️  Docker 未运行，正在启动 Docker Desktop..."
    open -a Docker
    echo "等待 Docker 启动..."
    while ! docker info > /dev/null 2>&1; do
        sleep 2
    done
    echo "✅ Docker 已就绪"
fi

# 修复 Docker 凭证问题
python3 -c "
import json, os
config_path = os.path.expanduser('~/.docker/config.json')
if os.path.exists(config_path):
    with open(config_path) as f:
        config = json.load(f)
    if 'credsStore' in config:
        del config['credsStore']
        with open(config_path, 'w') as f:
            json.dump(config, f, indent=2)
" 2>/dev/null

# 启动服务
echo "🚀 启动服务..."
docker compose up -d

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ 服务已启动！"
    echo "📍 地址: http://127.0.0.1:8000"
    echo "👤 账号: admin / admin123"
    echo ""
    # 等待服务就绪后打开浏览器
    sleep 2
    open http://127.0.0.1:8000
    echo "按回车键停止服务并退出..."
    read
    echo "🛑 正在停止服务..."
    docker compose down
    echo "✅ 已停止"
else
    echo "❌ 启动失败，请检查配置"
fi
