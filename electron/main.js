const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { spawn } = require('child_process');

let mainWindow;
let pythonProcess;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 900,
    minHeight: 600,
    frame: false,
    backgroundColor: '#0e0e0e',
    titleBarStyle: 'hidden',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    icon: path.join(__dirname, '..', 'public', 'icon.png'),
  });

  // In dev, load from Vite dev server
  if (process.env.NODE_ENV === 'development' || !app.isPackaged) {
    mainWindow.loadURL('http://localhost:5173');
  } else {
    mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Window controls IPC
ipcMain.handle('window:minimize', () => mainWindow?.minimize());
ipcMain.handle('window:maximize', () => {
  if (mainWindow?.isMaximized()) {
    mainWindow.unmaximize();
  } else {
    mainWindow?.maximize();
  }
});
ipcMain.handle('window:close', () => mainWindow?.close());
ipcMain.handle('window:isMaximized', () => mainWindow?.isMaximized());

// Start Python backend
function startBackend() {
  // Allow overriding Python executable (e.g. venv) via env var
  const pythonCmd =
    process.env.LEGACYLIFT_PYTHON ||
    (process.platform === 'win32' ? 'python' : 'python3');

  if (pythonProcess) {
    return;
  }

  pythonProcess = spawn(pythonCmd, ['-m', 'uvicorn', 'legacylift.api.server:app', '--host', '0.0.0.0', '--port', '8420', '--reload'], {
    cwd: path.join(__dirname, '..'),
    stdio: 'pipe',
  });

  pythonProcess.stdout?.on('data', (data) => {
    console.log(`[Backend] ${data}`);
  });

  pythonProcess.stderr?.on('data', (data) => {
    console.log(`[Backend] ${data}`);
  });

  pythonProcess.on('error', (err) => {
    console.error('[Backend] Failed to start:', err);
  });

  pythonProcess.on('exit', (code, signal) => {
    console.log(`[Backend] exited with code=${code} signal=${signal}`);
    pythonProcess = null;
  });
}

app.whenReady().then(() => {
  startBackend();

  // Wait a moment for backend to start
  setTimeout(createWindow, 1500);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (pythonProcess) {
    pythonProcess.kill();
    pythonProcess = null;
  }
  if (process.platform !== 'darwin') app.quit();
});
