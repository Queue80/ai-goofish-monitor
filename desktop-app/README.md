# 闲鱼智能监控 - Windows 桌面版

完全独立的 Windows 安装包，无需安装 Python、Docker 或任何依赖。

## 用户使用流程

1. 下载 `闲鱼智能监控-Setup.exe`
2. 双击安装（默认安装到 Program Files）
3. 首次打开弹出配置向导，填写 AI API Key
4. 点击"保存并启动"
5. 自动打开监控管理界面，开始使用

## 系统要求

- Windows 10/11 (64位)
- 无需安装其他软件

## 打包方式

### 通过 GitHub Actions（推荐）

1. 推送代码到 GitHub
2. 进入 Actions → "Build Windows Desktop App" → Run workflow
3. 等待构建完成（约 10-15 分钟）
4. 从 Artifacts 下载 `.exe` 安装包

### 本地打包（需要 Windows 环境）

```bash
# 1. 构建前端
cd web-ui && npm ci && npm run build && cd ..

# 2. 打包 Python 后端
pip install -r requirements-runtime.txt pyinstaller
pyinstaller desktop-app/build-backend.spec --distpath desktop-app/pyinstaller-dist

# 3. 安装 Playwright 浏览器并复制
python -m playwright install chromium
# 将浏览器目录复制到 desktop-app/playwright-browsers/

# 4. 构建 Electron 安装包
cd desktop-app && npm ci && npm run build:win
```

产物在 `desktop-app/release/` 目录下。

## 架构

```
安装包 (~500-700MB)
├── Electron 壳 (窗口管理、配置向导)
├── xianyu-backend.exe (PyInstaller 打包的 Python 后端)
├── Chromium 浏览器 (Playwright 用于爬虫)
└── 前端静态文件 (Vue 构建产物)
```

运行时数据存储在 `%APPDATA%/xianyu-monitor/`：
- `.env` — 用户配置
- `data/app.sqlite3` — 数据库
- `state/` — 闲鱼登录态
- `logs/` — 运行日志
- `images/` — 商品图片缓存
