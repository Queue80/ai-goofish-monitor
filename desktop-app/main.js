const { app, BrowserWindow, ipcMain, dialog } = require('electron')
const path = require('path')
const { spawn, execSync } = require('child_process')
const fs = require('fs')

let mainWindow
let backendProcess = null
const APP_PORT = 8000

// 应用数据目录
const userDataPath = app.getPath('userData')
const envFilePath = path.join(userDataPath, '.env')
const dataDir = path.join(userDataPath, 'data')
const stateDir = path.join(userDataPath, 'state')
const logsDir = path.join(userDataPath, 'logs')
const imagesDir = path.join(userDataPath, 'images')

function ensureDirectories() {
  ;[dataDir, stateDir, logsDir, imagesDir].forEach(dir => {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  })
}

function isConfigured() {
  // 只要 .env 文件存在就认为已配置过（用户可能选择不填 API Key）
  return fs.existsSync(envFilePath)
}

function getPythonPath() {
  // 打包模式：使用内嵌的 PyInstaller 可执行文件
  const bundledBackend = path.join(process.resourcesPath, 'backend', 'xianyu-backend.exe')
  if (fs.existsSync(bundledBackend)) {
    return { mode: 'bundled', path: bundledBackend }
  }

  // 开发模式：使用系统 Python
  const candidates = ['python', 'python3', 'py']
  for (const cmd of candidates) {
    try {
      const result = execSync(`${cmd} --version`, { encoding: 'utf-8', timeout: 5000 })
      if (result.includes('Python 3')) return { mode: 'python', path: cmd }
    } catch (e) { /* ignore */ }
  }
  return null
}

function startBackend() {
  const runtime = getPythonPath()
  if (!runtime) {
    dialog.showErrorBox('启动失败', '未找到后端程序，请重新安装。')
    app.quit()
    return
  }

  const env = {
    ...process.env,
    APP_DATABASE_FILE: path.join(dataDir, 'app.sqlite3'),
    SERVER_PORT: String(APP_PORT),
  }

  // 读取 .env 文件并注入环境变量
  if (fs.existsSync(envFilePath)) {
    const lines = fs.readFileSync(envFilePath, 'utf-8').split('\n')
    lines.forEach(line => {
      const match = line.match(/^([^#=]+)=(.*)$/)
      if (match) {
        env[match[1].trim()] = match[2].trim().replace(/^["']|["']$/g, '')
      }
    })
  }

  if (runtime.mode === 'bundled') {
    // 使用打包好的可执行文件
    // 设置 Playwright 浏览器路径
    const browsersPath = path.join(process.resourcesPath, 'playwright-browsers')
    if (fs.existsSync(browsersPath)) {
      env.PLAYWRIGHT_BROWSERS_PATH = browsersPath
    }
    // 设置前端静态文件路径
    const frontendPath = path.join(process.resourcesPath, 'dist')
    if (fs.existsSync(frontendPath)) {
      env.STATIC_FILES_DIR = frontendPath
      console.log(`[Backend] Using frontend path: ${frontendPath}`)
    } else {
      console.error(`[Backend] Frontend path not found: ${frontendPath}`)
    }
    // 设置数据目录
    env.STATE_DIR = stateDir
    env.LOGS_DIR = logsDir
    env.IMAGES_DIR = imagesDir

    backendProcess = spawn(runtime.path, [], {
      env,
      stdio: ['ignore', 'pipe', 'pipe'],
      cwd: process.resourcesPath
    })
  } else {
    // 开发模式：使用 Python
    const backendDir = path.join(__dirname, '..')
    env.PYTHONPATH = backendDir
    backendProcess = spawn(runtime.path, ['-m', 'src.app'], {
      cwd: backendDir,
      env,
      stdio: ['ignore', 'pipe', 'pipe']
    })
  }

  backendProcess.stdout.on('data', (data) => {
    console.log(`[Backend] ${data}`)
  })

  backendProcess.stderr.on('data', (data) => {
    console.error(`[Backend] ${data}`)
  })

  backendProcess.on('close', (code) => {
    console.log(`Backend exited with code ${code}`)
    backendProcess = null
  })
}

function stopBackend() {
  if (backendProcess) {
    backendProcess.kill()
    backendProcess = null
  }
}

function createSetupWindow() {
  mainWindow = new BrowserWindow({
    width: 600,
    height: 700,
    resizable: false,
    title: '闲鱼智能监控 - 初始配置',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true
    }
  })
  mainWindow.loadFile('setup.html')
  mainWindow.setMenuBarVisibility(false)
}

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    title: '闲鱼智能监控',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true
    }
  })
  mainWindow.setMenuBarVisibility(false)

  // 等待后端启动后加载页面
  const checkBackend = () => {
    const http = require('http')
    http.get(`http://127.0.0.1:${APP_PORT}`, (res) => {
      mainWindow.loadURL(`http://127.0.0.1:${APP_PORT}`)
    }).on('error', () => {
      setTimeout(checkBackend, 1000)
    })
  }

  startBackend()
  setTimeout(checkBackend, 2000)
}

// IPC: 保存配置
ipcMain.handle('save-config', async (event, config) => {
  const envContent = `# 闲鱼智能监控配置 (自动生成)
OPENAI_API_KEY=${config.apiKey}
OPENAI_BASE_URL=${config.baseUrl}
OPENAI_MODEL_NAME=${config.modelName}
WEB_USERNAME=${config.username || 'admin'}
WEB_PASSWORD=${config.password || 'admin123'}
SERVER_PORT=${APP_PORT}
RUN_HEADLESS=true
PCURL_TO_MOBILE=true
AI_DEBUG_MODE=false
ENABLE_RESPONSE_FORMAT=true
`
  fs.writeFileSync(envFilePath, envContent, 'utf-8')
  return { success: true }
})

ipcMain.handle('start-app', async () => {
  if (mainWindow) mainWindow.close()
  createMainWindow()
  return { success: true }
})

app.whenReady().then(() => {
  ensureDirectories()
  if (isConfigured()) {
    createMainWindow()
  } else {
    createSetupWindow()
  }
})

app.on('window-all-closed', () => {
  stopBackend()
  app.quit()
})

app.on('before-quit', () => {
  stopBackend()
})
