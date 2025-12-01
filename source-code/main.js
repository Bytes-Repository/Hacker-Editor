const { app, BrowserWindow, ipcMain, dialog, Menu } = require('electron');
const path = require('path');
const fs = require('fs').promises;
const { exec } = require('child_process');
const os = require('os');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 900,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true
    },
    title: "Hacker Editor",
    icon: path.join(__dirname, 'icon.png') // opcjonalnie dodaj ikonę
  });

  mainWindow.loadFile('index.html');
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// Otwieranie pliku z linii poleceń (hli editor plik.hacker)
app.on('open-file', (event, filePath) => {
  event.preventDefault();
  if (mainWindow) {
    mainWindow.webContents.send('file-opened', filePath);
  }
});

// IPC
ipcMain.handle('dialog:open', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
    filters: [{ name: 'Hacker Script', extensions: ['hacker'] }]
  });
  if (canceled) return null;
  return filePaths[0];
});

ipcMain.handle('dialog:save', async () => {
  const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
    filters: [{ name: 'Hacker Script', extensions: ['hacker'] }]
  });
  if (canceled) return null;
  return filePath;
});

ipcMain.handle('read-file', async (event, filePath) => {
  return await fs.readFile(filePath, 'utf-8');
});

ipcMain.handle('save-file', async (event, filePath, content) => {
  await fs.writeFile(filePath, content);
});

ipcMain.handle('exec', async (event, cmd, args = [], cwd = process.cwd()) => {
  return new Promise((resolve) => {
    const fullCmd = `${cmd} ${args.map(a => `"${a}"`).join(' ')}`;
    exec(fullCmd, { cwd }, (error, stdout, stderr) => {
      resolve({ error: error?.message || null, stdout, stderr });
    });
  });
});
