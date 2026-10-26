export interface FileData {
  filePath: string;
  data: string;
  fileName: string;
}

export interface SaveResult {
  canceled: boolean;
  filePath?: string;
  error?: string;
}

export type MenuAction =
  | "new-file"
  | "open-file"
  | "save-file"
  | "save-file-as"
  | "export-png"
  | "export-svg"
  | "clear-canvas"
  | "undo"
  | "redo"
  | "cut"
  | "copy"
  | "paste"
  | "select-all"
  | "delete"
  | "zoom-in"
  | "zoom-out"
  | "reset-zoom"
  | "toggle-theme"
  | "about";

export interface ElectronWindowState {
  filePath?: string | null;
  isDirty: boolean;
  title?: string;
}

export interface ElectronAPI {
  isElectron: true;

  // File system operations
  openFile: () => Promise<FileData | null>;
  openFilePath: (filePath: string) => Promise<FileData | null>;
  saveFile: (content: string, filePath?: string | null) => Promise<SaveResult>;
  saveFileAs: (content: string, defaultName?: string) => Promise<SaveResult>;
  exportImage: (
    data: Uint8Array | string,
    defaultName: string,
    type: "png" | "svg",
  ) => Promise<SaveResult>;

  // Window state and document dirty indicators
  updateWindowState: (state: ElectronWindowState) => Promise<void>;
  confirmDiscardChanges: (
    fileName?: string,
  ) => Promise<"save" | "discard" | "cancel">;

  // Recent files
  getRecentFiles: () => Promise<string[]>;
  clearRecentFiles: () => Promise<void>;

  // App & system
  openExternal: (url: string) => Promise<void>;
  getAppVersion: () => Promise<string>;
  getInitialFile: () => Promise<FileData | null>;

  // Subscriptions from main process
  onMenuAction: (callback: (action: MenuAction) => void) => () => void;
  onFileOpened: (callback: (fileData: FileData) => void) => () => void;
  onCheckDirtyBeforeClose: (
    callback: () => Promise<{
      shouldClose: boolean;
      saveBeforeClose?: boolean;
    }>,
  ) => () => void;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}
