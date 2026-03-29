import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("desktopApi", {
  platform: process.platform,
  saveProject: (payload: unknown) => ipcRenderer.invoke("project:save", payload),
  openProject: () => ipcRenderer.invoke("project:open"),
  printBom: (html: string) => ipcRenderer.invoke("project:print-bom", html)
});
