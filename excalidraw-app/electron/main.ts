import fs from "fs";
import path from "path";
import { app, BrowserWindow, dialog, ipcMain, Menu, shell } from "electron";
import { buildApplicationMenu } from "./menu";
import { WindowStateManager } from "./windowState";
import type {
  FileData,
  SaveResult,
  ElectronWindowState,
  MenuAction,
} from "./types";

let mainWindow: BrowserWindow | null = null;
let windowStateManager: WindowStateManager | null = null;
let recentFiles: string[] = [];
let initialFilePath: string | null = null;
let isQuitting = false;

const APP_NAME = process.env.VITE_APP_NAME || "0xBoard";

const RECENT_FILES_FILE = path.join(
  app.getPath("userData"),
  "recent-files.json",
);

function loadRecentFiles(): string[] {
  try {
    if (fs.existsSync(RECENT_FILES_FILE)) {
      const data = fs.readFileSync(RECENT_FILES_FILE, "utf-8");
      const list = JSON.parse(data);
      if (Array.isArray(list)) {
        return list.filter((f) => typeof f === "string" && fs.existsSync(f));
      }
    }
  } catch (e) {
    console.warn("Failed to load recent files:", e);
  }
  return [];
}

function saveRecentFiles(files: string[]) {
  try {
    fs.writeFileSync(
      RECENT_FILES_FILE,
      JSON.stringify(files.slice(0, 10)),
      "utf-8",
    );
  } catch (e) {
    console.warn("Failed to save recent files:", e);
  }
}

function addRecentFile(filePath: string) {
  if (!filePath) return;
  recentFiles = [filePath, ...recentFiles.filter((f) => f !== filePath)].slice(
    0,
    10,
  );
  saveRecentFiles(recentFiles);
  app.addRecentDocument(filePath);
  updateMenu();
}

function updateMenu() {
  if (mainWindow && !mainWindow.isDestroyed()) {
    const menu = buildApplicationMenu(mainWindow, {
      onAction: (action: MenuAction) => {
        mainWindow?.webContents.send("menu:action", action);
      },
      onOpenRecentFile: async (filePath: string) => {
        try {
          const fileData = readFile(filePath);
          mainWindow?.webContents.send("file:opened", fileData);
          addRecentFile(filePath);
        } catch (error: any) {
          dialog.showErrorBox(
            "Failed to Open File",
            error?.message || "File could not be opened.",
          );
        }
      },
      onClearRecentFiles: () => {
        recentFiles = [];
        saveRecentFiles(recentFiles);
        updateMenu();
      },
      getRecentFiles: () => recentFiles,
    });
    Menu.setApplicationMenu(menu);
  }
}

function readFile(filePath: string): FileData {
  const content = fs.readFileSync(filePath, "utf-8");
  return {
    filePath,
    data: content,
    fileName: path.basename(filePath),
  };
}

function parseCommandLineFile(argv: string[]): string | null {
  for (let i = 1; i < argv.length; i++) {
    const arg = argv[i];
    if (
      !arg.startsWith("--") &&
      !arg.startsWith("-") &&
      (arg.endsWith(".excalidraw") || arg.endsWith(".json"))
    ) {
      if (fs.existsSync(arg)) {
        return path.resolve(arg);
      }
    }
  }
  return null;
}

// Check initial args
initialFilePath = parseCommandLineFile(process.argv);

// Handle single instance
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on("second-instance", (_event, commandLine) => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) {
        mainWindow.restore();
      }
      mainWindow.focus();

      const filePath = parseCommandLineFile(commandLine);
      if (filePath) {
        try {
          const fileData = readFile(filePath);
          mainWindow.webContents.send("file:opened", fileData);
          addRecentFile(filePath);
        } catch (e) {
          console.error("Failed to open file from second instance:", e);
        }
      }
    }
  });
}

// macOS open file
app.on("open-file", (event, filePath) => {
  event.preventDefault();
  if (mainWindow && !mainWindow.isDestroyed()) {
    try {
      const fileData = readFile(filePath);
      mainWindow.webContents.send("file:opened", fileData);
      addRecentFile(filePath);
    } catch (e) {
      console.error("Failed to open file via macOS open-file:", e);
    }
  } else {
    initialFilePath = filePath;
  }
});

function getIconPath(): string | undefined {
  const candidates = [
    path.join(__dirname, "../public/favicon.ico"),
    path.join(__dirname, "../../public/favicon.ico"),
    path.join(app.getAppPath(), "public/favicon.ico"),
    path.join(__dirname, "../public/favicon-32x32.png"),
    path.join(__dirname, "../../public/favicon-32x32.png"),
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }
  return undefined;
}

function getIndexPath(): string {
  const candidates = [
    path.join(__dirname, "../excalidraw-app/build/index.html"),
    path.join(__dirname, "../build/index.html"),
    path.join(app.getAppPath(), "excalidraw-app/build/index.html"),
    path.join(app.getAppPath(), "build/index.html"),
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }
  return candidates[0];
}

function createWindow() {
  windowStateManager = new WindowStateManager();
  const windowState = windowStateManager.getState();

  const iconPath = getIconPath();

  mainWindow = new BrowserWindow({
    x: windowState.x,
    y: windowState.y,
    width: windowState.width,
    height: windowState.height,
    minWidth: 640,
    minHeight: 480,
    title: APP_NAME,
    icon: iconPath,
    frame: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  windowStateManager.track(mainWindow);

  recentFiles = loadRecentFiles();
  updateMenu();

  const devServerUrl = process.env.VITE_DEV_SERVER_URL;
  if (devServerUrl) {
    mainWindow.loadURL(devServerUrl);
  } else {
    // In production, load the built HTML
    mainWindow.loadFile(getIndexPath());
  }

  // Handle external links securely
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (
      url.startsWith("http:") ||
      url.startsWith("https:") ||
      url.startsWith("mailto:")
    ) {
      shell.openExternal(url);
    }
    return { action: "deny" };
  });

  mainWindow.webContents.on("will-navigate", (event, url) => {
    if (
      !url.startsWith("http://localhost") &&
      !url.startsWith("file://") &&
      !url.startsWith("about:")
    ) {
      event.preventDefault();
      shell.openExternal(url);
    }
  });

  // Handle window close confirmation
  mainWindow.on("close", (e) => {
    if (isQuitting) {
      return;
    }
    e.preventDefault();
    mainWindow?.webContents.send("window:check-dirty");
  });

  ipcMain.on("window:close-response", (_event, { shouldClose }) => {
    if (shouldClose) {
      isQuitting = true;
      mainWindow?.destroy();
      app.quit();
    }
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

// Setup IPC handlers
ipcMain.handle("file:open", async () => {
  if (!mainWindow) return null;
  const result = await dialog.showOpenDialog(mainWindow, {
    title: `Open ${APP_NAME} Drawing`,
    properties: ["openFile"],
    filters: [
      {
        name: `${APP_NAME} Drawings (*.excalidraw, *.json)`,
        extensions: ["excalidraw", "json"],
      },
      { name: "All Files (*.*)", extensions: ["*"] },
    ],
  });

  if (result.canceled || result.filePaths.length === 0) {
    return null;
  }

  const filePath = result.filePaths[0];
  const fileData = readFile(filePath);
  addRecentFile(filePath);
  return fileData;
});

ipcMain.handle("file:open-path", async (_event, filePath: string) => {
  if (!filePath || !fs.existsSync(filePath)) {
    return null;
  }
  const fileData = readFile(filePath);
  addRecentFile(filePath);
  return fileData;
});

ipcMain.handle(
  "file:save",
  async (
    _event,
    content: string,
    filePath?: string | null,
  ): Promise<SaveResult> => {
    if (!mainWindow) return { canceled: true };

    let targetPath = filePath;
    if (!targetPath) {
      const result = await dialog.showSaveDialog(mainWindow, {
        title: `Save ${APP_NAME} Drawing`,
        defaultPath: "drawing.excalidraw",
        filters: [
          {
            name: `${APP_NAME} Drawing (*.excalidraw)`,
            extensions: ["excalidraw"],
          },
          { name: "JSON File (*.json)", extensions: ["json"] },
        ],
      });

      if (result.canceled || !result.filePath) {
        return { canceled: true };
      }
      targetPath = result.filePath;
    }

    try {
      fs.writeFileSync(targetPath, content, "utf-8");
      addRecentFile(targetPath);
      return { canceled: false, filePath: targetPath };
    } catch (error: any) {
      return { canceled: false, error: error.message };
    }
  },
);

ipcMain.handle(
  "file:save-as",
  async (
    _event,
    content: string,
    defaultName?: string,
  ): Promise<SaveResult> => {
    if (!mainWindow) return { canceled: true };

    const name = defaultName
      ? defaultName.endsWith(".excalidraw")
        ? defaultName
        : `${defaultName}.excalidraw`
      : "drawing.excalidraw";
    const result = await dialog.showSaveDialog(mainWindow, {
      title: "Save As",
      defaultPath: name,
      filters: [
        {
          name: `${APP_NAME} Drawing (*.excalidraw)`,
          extensions: ["excalidraw"],
        },
        { name: "JSON File (*.json)", extensions: ["json"] },
      ],
    });

    if (result.canceled || !result.filePath) {
      return { canceled: true };
    }

    try {
      fs.writeFileSync(result.filePath, content, "utf-8");
      addRecentFile(result.filePath);
      return { canceled: false, filePath: result.filePath };
    } catch (error: any) {
      return { canceled: false, error: error.message };
    }
  },
);

ipcMain.handle(
  "file:export",
  async (
    _event,
    data: Uint8Array | string,
    defaultName: string,
    type: "png" | "svg",
  ): Promise<SaveResult> => {
    if (!mainWindow) return { canceled: true };

    const extension = type === "png" ? "png" : "svg";
    const name = defaultName
      ? `${defaultName}.${extension}`
      : `export.${extension}`;
    const result = await dialog.showSaveDialog(mainWindow, {
      title: `Export as ${type.toUpperCase()}`,
      defaultPath: name,
      filters: [
        type === "png"
          ? { name: "PNG Image (*.png)", extensions: ["png"] }
          : { name: "SVG Image (*.svg)", extensions: ["svg"] },
      ],
    });

    if (result.canceled || !result.filePath) {
      return { canceled: true };
    }

    try {
      if (typeof data === "string") {
        fs.writeFileSync(result.filePath, data, "utf-8");
      } else {
        fs.writeFileSync(result.filePath, Buffer.from(data));
      }
      return { canceled: false, filePath: result.filePath };
    } catch (error: any) {
      return { canceled: false, error: error.message };
    }
  },
);

ipcMain.handle(
  "window:update-state",
  async (_event, state: ElectronWindowState) => {
    if (!mainWindow || mainWindow.isDestroyed()) return;

    const fileName = state.filePath
      ? path.basename(state.filePath)
      : "Untitled";
    const dirtyIndicator = state.isDirty ? "● " : "";
    const title = `${dirtyIndicator}${fileName} - ${APP_NAME}`;

    mainWindow.setTitle(title);
    if (process.platform === "darwin") {
      mainWindow.setDocumentEdited(state.isDirty);
      if (state.filePath) {
        mainWindow.setRepresentedFilename(state.filePath);
      }
    }
  },
);

ipcMain.handle("window:confirm-discard", async (_event, fileName?: string) => {
  if (!mainWindow) return "cancel";
  const name = fileName || "Untitled";
  const response = await dialog.showMessageBox(mainWindow, {
    type: "question",
    buttons: ["Save", "Don't Save", "Cancel"],
    defaultId: 0,
    cancelId: 2,
    title: "Unsaved Changes",
    message: `Do you want to save changes to "${name}" before continuing?`,
    detail: "Your changes will be lost if you don't save them.",
  });

  if (response.response === 0) return "save";
  if (response.response === 1) return "discard";
  return "cancel";
});

ipcMain.handle("recent:get", async () => {
  return recentFiles;
});

ipcMain.handle("recent:clear", async () => {
  recentFiles = [];
  saveRecentFiles(recentFiles);
  updateMenu();
});

ipcMain.handle("shell:open-external", async (_event, url: string) => {
  await shell.openExternal(url);
});

ipcMain.handle("app:version", async () => {
  return app.getVersion();
});

ipcMain.handle("app:initial-file", async () => {
  if (initialFilePath && fs.existsSync(initialFilePath)) {
    const file = readFile(initialFilePath);
    initialFilePath = null;
    return file;
  }
  return null;
});

app.whenReady().then(() => {
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
