# -*- mode: python ; coding: utf-8 -*-
# PyInstaller spec file for the backend

import os
import sys

block_cipher = None

# 项目根目录
ROOT = os.path.abspath(os.path.join(SPECPATH, '..'))

a = Analysis(
    [os.path.join(ROOT, 'src', 'app.py')],
    pathex=[ROOT],
    binaries=[],
    datas=[
        (os.path.join(ROOT, 'prompts'), 'prompts'),
        (os.path.join(ROOT, 'static'), 'static'),
        (os.path.join(ROOT, 'config.json.example'), '.'),
    ],
    hiddenimports=[
        'uvicorn',
        'uvicorn.logging',
        'uvicorn.loops',
        'uvicorn.loops.auto',
        'uvicorn.protocols',
        'uvicorn.protocols.http',
        'uvicorn.protocols.http.auto',
        'uvicorn.protocols.websockets',
        'uvicorn.protocols.websockets.auto',
        'uvicorn.lifespan',
        'uvicorn.lifespan.on',
        'fastapi',
        'starlette',
        'pydantic',
        'httpx',
        'openai',
        'playwright',
        'playwright.async_api',
        'sqlite3',
        'src',
        'src.app',
        'src.api',
        'src.api.routes',
        'src.services',
        'src.domain',
        'src.infrastructure',
        'src.scraper',
        'src.ai_handler',
        'src.config',
        'src.utils',
        'src.parsers',
    ],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=['tkinter', 'matplotlib', 'numpy', 'pandas'],
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=block_cipher,
    noarchive=False,
)

pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)

exe = EXE(
    pyz,
    a.scripts,
    [],
    exclude_binaries=True,
    name='xianyu-backend',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    console=True,
)

coll = COLLECT(
    exe,
    a.binaries,
    a.zipfiles,
    a.datas,
    strip=False,
    upx=True,
    upx_exclude=[],
    name='xianyu-backend',
)

# 复制 dist 目录到输出目录
import shutil
dist_src = os.path.join(ROOT, 'dist')
dist_dst = os.path.join(ROOT, 'desktop-app', 'pyinstaller-dist', 'xianyu-backend', 'dist')
if os.path.exists(dist_src):
    if os.path.exists(dist_dst):
        shutil.rmtree(dist_dst)
    shutil.copytree(dist_src, dist_dst)
    print(f'Copied dist to {dist_dst}')

# 复制 static 目录到输出目录
static_src = os.path.join(ROOT, 'static')
static_dst = os.path.join(ROOT, 'desktop-app', 'pyinstaller-dist', 'xianyu-backend', 'static')
if os.path.exists(static_src):
    if os.path.exists(static_dst):
        shutil.rmtree(static_dst)
    shutil.copytree(static_src, static_dst)
    print(f'Copied static to {static_dst}')

# 复制 prompts 目录到输出目录
prompts_src = os.path.join(ROOT, 'prompts')
prompts_dst = os.path.join(ROOT, 'desktop-app', 'pyinstaller-dist', 'xianyu-backend', 'prompts')
if os.path.exists(prompts_src):
    if os.path.exists(prompts_dst):
        shutil.rmtree(prompts_dst)
    shutil.copytree(prompts_src, prompts_dst)
    print(f'Copied prompts to {prompts_dst}')

# 复制 src 目录到输出目录（spider_v2.py 依赖的模块）
src_src = os.path.join(ROOT, 'src')
src_dst = os.path.join(ROOT, 'desktop-app', 'pyinstaller-dist', 'xianyu-backend', 'src')
if os.path.exists(src_src):
    if os.path.exists(src_dst):
        shutil.rmtree(src_dst)
    shutil.copytree(src_src, src_dst)
    print(f'Copied src to {src_dst}')

# 复制 spider_v2.py 到输出目录
spider_src = os.path.join(ROOT, 'spider_v2.py')
spider_dst = os.path.join(ROOT, 'desktop-app', 'pyinstaller-dist', 'xianyu-backend', 'spider_v2.py')
if os.path.exists(spider_src):
    shutil.copy2(spider_src, spider_dst)
    print(f'Copied spider_v2.py to {spider_dst}')

# 复制 pyproject.toml 或 requirements.txt（如果需要）
requirements_src = os.path.join(ROOT, 'requirements-runtime.txt')
requirements_dst = os.path.join(ROOT, 'desktop-app', 'pyinstaller-dist', 'xianyu-backend', 'requirements-runtime.txt')
if os.path.exists(requirements_src):
    shutil.copy2(requirements_src, requirements_dst)
    print(f'Copied requirements-runtime.txt to {requirements_dst}')
