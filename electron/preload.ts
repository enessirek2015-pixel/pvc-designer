import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("desktopApi", {
  platform: process.platform,
  saveProject: (payload: unknown) => ipcRenderer.invoke("project:save", payload),
  openProject: () => ipcRenderer.invoke("project:open"),
  openProjectPath: (filePath: string) => ipcRenderer.invoke("project:open-path", filePath),
  printBom: (html: string) => ipcRenderer.invoke("project:print-bom", html),
  printTechnical: (html: string) => ipcRenderer.invoke("project:print-technical", html)
});
