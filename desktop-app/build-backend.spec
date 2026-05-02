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
        (os.path.join(ROOT, 'dist'), 'dist'),
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
