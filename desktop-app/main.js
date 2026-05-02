const { app, BrowserWindow, ipcMain, dialog } = require('electron')
const path = require('path')
const { spawn, execSync } = require('child_process')
const fs = require('fs')

let mainWindow
let backendProcess = null
const APP_PORT = 8000

// 日志文件路径
const userDataPath = app.getPath('userData')
const envFilePath = path.join(userDataPath, '.env')
const logsDir = path.join(userDataPath, 'logs')
const logFile = path.join(logsDir, 'app.log')

function ensureDirectories() {
  ;[logsDir].forEach(dir => {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  })
}

function log(message) {
  const timestamp = new Date().toISOString()
  const logMessage = `[${timestamp}] ${message}\n`
  
  // 写入日志文件
  try {
    fs.appendFileSync(logFile, logMessage)
  } catch (e) {
    // 忽略日志写入错误
  }
  
  // 同时输出到控制台
  console.log(logMessage.trim())
}

function isConfigured() {
  // 只要 .env 文件存在就认为已配置过（用户可能选择不填 API Key）
  return fs.existsSync(envFilePath)
}

function getPythonPath() {
  log('Checking for bundled backend...')
  
  // 打包模式：使用内嵌的 PyInstaller 可执行文件
  const bundledBackendDir = path.join(process.resourcesPath, 'backend', 'xianyu-backend')
  const bundledBackendExe = path.join(process.resourcesPath, 'backend', 'xianyu-backend.exe')
  
  if (fs.existsSync(bundledBackendExe)) {
    log(`Found bundled backend (single file): ${bundledBackendExe}`)
    // 单文件模式
    return { mode: 'bundled', path: bundledBackendExe }
  } else if (fs.existsSync(bundledBackendDir)) {
    log(`Found bundled backend directory: ${bundledBackendDir}`)
    // 目录模式 - 查找 .exe 文件
    const files = fs.readdirSync(bundledBackendDir)
    const exeFile = files.find(f => f.endsWith('.exe'))
    if (exeFile) {
      const fullPath = path.join(bundledBackendDir, exeFile)
      log(`Found backend executable: ${fullPath}`)
      return { mode: 'bundled', path: fullPath }
    }
    log('No .exe file found in backend directory')
  } else {
    log('No bundled backend found')
  }
  
  return null
}

function startBackend() {
  const runtime = getPythonPath()
  if (!runtime) {
    log('ERROR: No backend found!')
    dialog.showErrorBox('启动失败', '未找到后端程序，请重新安装。')
    app.quit()
    return
  }

  log(`Backend runtime mode: ${runtime.mode}`)
  log(`Backend path: ${runtime.path}`)

  // 创建数据目录
  const dataDir = path.join(userDataPath, 'data')
  const stateDir = path.join(userDataPath, 'state')
  const imagesDir = path.join(userDataPath, 'images')
  
  ;[dataDir, stateDir, logsDir, imagesDir].forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
      log(`Created directory: ${dir}`)
    }
  })

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
    log(`Using bundled backend: ${runtime.path}`)
    
    // 设置 Playwright 浏览器路径
    const browsersPath = path.join(process.resourcesPath, 'playwright-browsers')
    log(`Playwright browsers path: ${browsersPath}`)
    if (fs.existsSync(browsersPath)) {
      env.PLAYWRIGHT_BROWSERS_PATH = browsersPath
      log('PLAYWRIGHT_BROWSERS_PATH set')
    } else {
      log('WARNING: Playwright browsers not found')
    }
    
    // 设置前端静态文件路径
    const frontendPath = path.join(process.resourcesPath, 'dist')
    log(`Frontend path: ${frontendPath}`)
    if (fs.existsSync(frontendPath)) {
      env.STATIC_FILES_DIR = frontendPath
      log(`Frontend path set: ${frontendPath}`)
    } else {
      log(`ERROR: Frontend path not found: ${frontendPath}`)
      dialog.showErrorBox('启动失败', `前端文件不存在: ${frontendPath}`)
      app.quit()
      return
    }
    
    // 设置数据目录
    env.STATE_DIR = stateDir
    env.LOGS_DIR = logsDir
    env.IMAGES_DIR = imagesDir

    log('Starting backend process...')
    log(`Backend cwd: ${process.resourcesPath}`)
    log(`Backend env: ${JSON.stringify(env, null, 2)}`)
    
    backendProcess = spawn(runtime.path, [], {
      env,
      stdio: ['pipe', 'pipe', 'pipe'],  // 改为 pipe 以便捕获输出
      cwd: process.resourcesPath
    })
    
    // 添加后端进程的输出监听
    backendProcess.stdout.on('data', (data) => {
      log(`[Backend] ${data}`)
    })
    
    backendProcess.stderr.on('data', (data) => {
      log(`[Backend Error] ${data}`)
    })
    
    backendProcess.on('close', (code) => {
      log(`Backend exited with code ${code}`)
      backendProcess = null
    })
    
    log(`Backend process PID: ${backendProcess.pid}`)
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

  // 已在上面添加了监听器
  log(`Backend process started, waiting for port ${APP_PORT}...`)
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
    log(`Checking backend on port ${APP_PORT}...`)
    http.get(`http://127.0.0.1:${APP_PORT}`, (res) => {
      log(`Backend is ready, loading URL`)
      mainWindow.loadURL(`http://127.0.0.1:${APP_PORT}`)
    }).on('error', (e) => {
      log(`Backend not ready: ${e.message}`)
      setTimeout(checkBackend, 1000)
    })
  }

  startBackend()
  setTimeout(checkBackend, 3000)  // 增加等待时间
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
  log('Application starting...')
  ensureDirectories()
  log(`User data path: ${userDataPath}`)
  log(`Logs directory: ${logsDir}`)
  log(`Config file exists: ${isConfigured()}`)
  
  if (isConfigured()) {
    log('Loading main window...')
    createMainWindow()
  } else {
    log('Loading setup window...')
    createSetupWindow()
  }
})

app.on('window-all-closed', () => {
  log('All windows closed')
  stopBackend()
  app.quit()
})

app.on('before-quit', () => {
  log('Application quitting...')
  stopBackend()
})
