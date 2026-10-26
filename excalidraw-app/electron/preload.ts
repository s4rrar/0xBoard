import { contextBridge, ipcRenderer } from "electron";

import type {
  ElectronAPI,
  FileData,
  SaveResult,
  ElectronWindowState,
  MenuAction,
} from "./types";

const electronAPI: ElectronAPI = {
  isElectron: true,

  openFile: () => ipcRenderer.invoke("file:open"),
  openFilePath: (filePath: string) =>
    ipcRenderer.invoke("file:open-path", filePath),
  saveFile: (content: string, filePath?: string | null) =>
    ipcRenderer.invoke("file:save", content, filePath),
  saveFileAs: (content: string, defaultName?: string) =>
    ipcRenderer.invoke("file:save-as", content, defaultName),
  exportImage: (
    data: Uint8Array | string,
    defaultName: string,
    type: "png" | "svg",
  ) => ipcRenderer.invoke("file:export", data, defaultName, type),

  updateWindowState: (state: ElectronWindowState) =>
    ipcRenderer.invoke("window:update-state", state),
  confirmDiscardChanges: (fileName?: string) =>
    ipcRenderer.invoke("window:confirm-discard", fileName),

  getRecentFiles: () => ipcRenderer.invoke("recent:get"),
  clearRecentFiles: () => ipcRenderer.invoke("recent:clear"),

  openExternal: (url: string) => ipcRenderer.invoke("shell:open-external", url),
  getAppVersion: () => ipcRenderer.invoke("app:version"),
  getInitialFile: () => ipcRenderer.invoke("app:initial-file"),

  onMenuAction: (callback: (action: MenuAction) => void) => {
    const listener = (
      _event: Electron.IpcRendererEvent,
      action: MenuAction,
    ) => {
      callback(action);
    };
    ipcRenderer.on("menu:action", listener);
    return () => {
      ipcRenderer.removeListener("menu:action", listener);
    };
  },

  onFileOpened: (callback: (fileData: FileData) => void) => {
    const listener = (
      _event: Electron.IpcRendererEvent,
      fileData: FileData,
    ) => {
      callback(fileData);
    };
    ipcRenderer.on("file:opened", listener);
    return () => {
      ipcRenderer.removeListener("file:opened", listener);
    };
  },

  onCheckDirtyBeforeClose: (
    callback: () => Promise<{
      shouldClose: boolean;
      saveBeforeClose?: boolean;
    }>,
  ) => {
    const listener = async () => {
      try {
        const result = await callback();
        ipcRenderer.send("window:close-response", result);
      } catch (e) {
        ipcRenderer.send("window:close-response", { shouldClose: true });
      }
    };
    ipcRenderer.on("window:check-dirty", listener);
    return () => {
      ipcRenderer.removeListener("window:check-dirty", listener);
    };
  },
};

contextBridge.exposeInMainWorld("electronAPI", electronAPI);
