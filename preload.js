const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // File operations
  saveFile: (content, filePath) => ipcRenderer.invoke('save-file', content, filePath),
  exportPDF: (data) => ipcRenderer.invoke('export-pdf', data),
  exportHTML: (data) => ipcRenderer.invoke('export-html', data),
  
  // Menu events
  onMenuNewFile: (callback) => ipcRenderer.on('menu-new-file', callback),
  onMenuOpenFile: (callback) => ipcRenderer.on('menu-open-file', callback),
  onMenuSaveFile: (callback) => ipcRenderer.on('menu-save-file', callback),
  onMenuSaveAsFile: (callback) => ipcRenderer.on('menu-save-as-file', callback),
  onMenuExportPDF: (callback) => ipcRenderer.on('menu-export-pdf', callback),
  onMenuExportHTML: (callback) => ipcRenderer.on('menu-export-html', callback),
  
  // Remove listeners
  removeAllListeners: (channel) => ipcRenderer.removeAllListeners(channel)
});