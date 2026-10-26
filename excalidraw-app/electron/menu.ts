import {
  Menu,
  MenuItemConstructorOptions,
  app,
  shell,
  BrowserWindow,
} from "electron";
import type { MenuAction } from "./types";

const APP_NAME = process.env.VITE_APP_NAME || "0xBoard";

export interface MenuCallbacks {
  onAction: (action: MenuAction) => void;
  onOpenRecentFile: (filePath: string) => void;
  onClearRecentFiles: () => void;
  getRecentFiles: () => string[];
}

export function buildApplicationMenu(
  win: BrowserWindow,
  callbacks: MenuCallbacks,
): Menu {
  const isMac = process.platform === "darwin";
  const recentFiles = callbacks.getRecentFiles();

  const recentFilesSubmenu: MenuItemConstructorOptions[] =
    recentFiles.length > 0
      ? [
          ...recentFiles.map((file) => ({
            label: file,
            click: () => callbacks.onOpenRecentFile(file),
          })),
          { type: "separator" as const },
          {
            label: "Clear Recent Files",
            click: () => callbacks.onClearRecentFiles(),
          },
        ]
      : [{ label: "No Recent Files", enabled: false }];

  const fileMenu: MenuItemConstructorOptions = {
    label: "&File",
    submenu: [
      {
        label: "New",
        accelerator: "CmdOrCtrl+N",
        click: () => callbacks.onAction("new-file"),
      },
      {
        label: "Open...",
        accelerator: "CmdOrCtrl+O",
        click: () => callbacks.onAction("open-file"),
      },
      {
        label: "Open Recent",
        submenu: recentFilesSubmenu,
      },
      { type: "separator" },
      {
        label: "Save",
        accelerator: "CmdOrCtrl+S",
        click: () => callbacks.onAction("save-file"),
      },
      {
        label: "Save As...",
        accelerator: "CmdOrCtrl+Shift+S",
        click: () => callbacks.onAction("save-file-as"),
      },
      { type: "separator" },
      {
        label: "Export",
        submenu: [
          {
            label: "Export as PNG...",
            accelerator: "CmdOrCtrl+Shift+E",
            click: () => callbacks.onAction("export-png"),
          },
          {
            label: "Export as SVG...",
            accelerator: "CmdOrCtrl+Alt+E",
            click: () => callbacks.onAction("export-svg"),
          },
        ],
      },
      { type: "separator" },
      isMac ? { role: "close" } : { role: "quit" },
    ],
  };

  const editMenu: MenuItemConstructorOptions = {
    label: "&Edit",
    submenu: [
      {
        label: "Undo",
        accelerator: "CmdOrCtrl+Z",
        click: () => callbacks.onAction("undo"),
      },
      {
        label: "Redo",
        accelerator: isMac ? "Shift+CmdOrCtrl+Z" : "CmdOrCtrl+Y",
        click: () => callbacks.onAction("redo"),
      },
      { type: "separator" },
      { role: "cut" },
      { role: "copy" },
      { role: "paste" },
      { role: "selectAll" },
      {
        label: "Delete",
        accelerator: "Delete",
        click: () => callbacks.onAction("delete"),
      },
      { type: "separator" },
      {
        label: "Clear Canvas",
        click: () => callbacks.onAction("clear-canvas"),
      },
    ],
  };

  const viewMenu: MenuItemConstructorOptions = {
    label: "&View",
    submenu: [
      {
        label: "Zoom In",
        accelerator: "CmdOrCtrl+=",
        click: () => callbacks.onAction("zoom-in"),
      },
      {
        label: "Zoom Out",
        accelerator: "CmdOrCtrl+-",
        click: () => callbacks.onAction("zoom-out"),
      },
      {
        label: "Reset Zoom",
        accelerator: "CmdOrCtrl+0",
        click: () => callbacks.onAction("reset-zoom"),
      },
      { type: "separator" },
      {
        label: "Toggle Dark Mode",
        accelerator: "CmdOrCtrl+Shift+D",
        click: () => callbacks.onAction("toggle-theme"),
      },
      { type: "separator" },
      { role: "togglefullscreen" },
      { role: "reload" },
      { role: "forceReload" },
      { role: "toggleDevTools" },
    ],
  };

  const helpMenu: MenuItemConstructorOptions = {
    role: "help",
    submenu: [
      {
        label: `${APP_NAME} Whiteboard Help`,
        click: () => {
          shell.openExternal("https://github.com/s4rrar/0xBoard#readme");
        },
      },
      {
        label: `${APP_NAME} on GitHub`,
        click: () => {
          shell.openExternal("https://github.com/s4rrar");
        },
      },
      {
        label: `Visit ${APP_NAME} Website`,
        click: () => {
          shell.openExternal("https://github.com/s4rrar/0xBoard");
        },
      },
      { type: "separator" },
      {
        label: `About ${APP_NAME}`,
        click: () => callbacks.onAction("about"),
      },
    ],
  };

  const template: MenuItemConstructorOptions[] = [
    ...(isMac
      ? [
          {
            label: app.name,
            submenu: [
              {
                label: `About ${app.name}`,
                click: () => callbacks.onAction("about"),
              },
              { type: "separator" as const },
              { role: "services" as const },
              { type: "separator" as const },
              { role: "hide" as const },
              { role: "hideOthers" as const },
              { role: "unhide" as const },
              { type: "separator" as const },
              { role: "quit" as const },
            ],
          },
        ]
      : []),
    fileMenu,
    editMenu,
    viewMenu,
    ...(isMac ? [{ role: "windowMenu" as const }] : []),
    helpMenu,
  ];

  return Menu.buildFromTemplate(template);
}
