import { app, BrowserWindow, dialog, ipcMain, Menu } from "electron";
import fs from "node:fs/promises";
import path from "node:path";

const isDev = !app.isPackaged;

async function openPrintWindow(html: string, title: string) {
  const printWindow = new BrowserWindow({
    width: 1280,
    height: 860,
    autoHideMenuBar: true,
    show: false,
    title
  });

  await printWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);

  await new Promise<void>((resolve) => {
    printWindow.webContents.print({ silent: false, printBackground: true }, () => {
      if (!printWindow.isDestroyed()) {
        printWindow.close();
      }
      resolve();
    });
  });
}

function createWindow(): void {
  const rendererPath = isDev
    ? "http://localhost:5173"
    : path.join(app.getAppPath(), "dist", "index.html");

  const mainWindow = new BrowserWindow({
    width: 1600,
    height: 980,
    minWidth: 1280,
    minHeight: 820,
    title: "PVC Designer",
    backgroundColor: "#d9dde4",
    webPreferences: {
      preload: path.join(__dirname, "preload.js")
    }
  });

  if (isDev) {
    void mainWindow.loadURL(rendererPath);
    mainWindow.webContents.openDevTools({ mode: "detach" });
    return;
  }

  void mainWindow.loadFile(rendererPath);
}

app.whenReady().then(() => {
  Menu.setApplicationMenu(Menu.buildFromTemplate([]));
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

ipcMain.handle("project:save", async (_event, payload: { suggestedName: string; content: unknown }) => {
  const result = await dialog.showSaveDialog({
    title: "PVC Projesini Kaydet",
    defaultPath: `${payload.suggestedName || "pvc-proje"}.json`,
    filters: [{ name: "PVC Project", extensions: ["json"] }]
  });

  if (result.canceled || !result.filePath) {
    return { canceled: true };
  }

  await fs.writeFile(result.filePath, JSON.stringify(payload.content, null, 2), "utf-8");

  return {
    canceled: false,
    path: result.filePath
  };
});

ipcMain.handle("project:open", async () => {
  const result = await dialog.showOpenDialog({
    title: "PVC Projesi Ac",
    properties: ["openFile"],
    filters: [{ name: "PVC Project", extensions: ["json"] }]
  });

  if (result.canceled || result.filePaths.length === 0) {
    return { canceled: true };
  }

  const filePath = result.filePaths[0];
  const raw = await fs.readFile(filePath, "utf-8");

  return {
    canceled: false,
    path: filePath,
    content: JSON.parse(raw)
  };
});

ipcMain.handle("project:print-bom", async (_event, html: string) => {
  await openPrintWindow(html, "PVC Designer - BOM");
});

ipcMain.handle("project:print-technical", async (_event, html: string) => {
  await openPrintWindow(html, "PVC Designer - Teknik Pafta");
});
