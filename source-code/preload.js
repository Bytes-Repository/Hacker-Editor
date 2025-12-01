const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  openFile: () => ipcRenderer.invoke('dialog:open'),
  saveFile: () => ipcRenderer.invoke('dialog:save'),
  readFile: (path) => ipcRenderer.invoke('read-file', path),
  saveContent: (path, content) => ipcRenderer.invoke('save-file', path, content),
  exec: (cmd, args, cwd) => ipcRenderer.invoke('exec', cmd, args, cwd),
  onFileOpened: (callback) => ipcRenderer.on('file-opened', (e, path) => callback(path))
});
