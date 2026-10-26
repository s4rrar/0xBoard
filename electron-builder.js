const path = require("path");
const dotenv = require("dotenv");

dotenv.config({ path: path.resolve(__dirname, ".env") });
if (process.env.NODE_ENV === "production") {
  dotenv.config({
    path: path.resolve(__dirname, ".env.production"),
    override: true,
  });
}

const appName = process.env.VITE_APP_NAME || "0xBoard";
const appSlug = appName.toLowerCase().replace(/[^a-z0-9]/g, "-");

/**
 * @type {import('electron-builder').Configuration}
 * @see https://www.electron.build/configuration/configuration
 */
module.exports = {
  appId: `com.${appSlug}.desktop`,
  productName: appName,
  directories: {
    output: "dist-desktop",
    buildResources: "public",
  },
  files: ["dist-electron/**/*", "excalidraw-app/build/**/*", "public/**/*"],
  extraResources: [
    {
      from: "resources/node.exe",
      to: "node.exe",
    },
    {
      from: "dist-electron/server.js",
      to: "server.js",
    },
  ],
  asarUnpack: ["excalidraw-app/build/**/*"],
  extraMetadata: {
    name: `${appSlug}-desktop`,
    version: "1.0.0",
    description: `${appName} Whiteboard Desktop Application`,
    author: appName,
    main: "dist-electron/main.js",
  },
  fileAssociations: [
    {
      ext: "excalidraw",
      name: `${appName} Drawing`,
      description: `${appName} whiteboard drawing file`,
      role: "Editor",
    },
  ],
  win: {
    target: [
      {
        target: "nsis",
        arch: ["x64"],
      },
      {
        target: "portable",
        arch: ["x64"],
      },
    ],
    icon: "public/android-chrome-512x512.png",
  },
  nsis: {
    oneClick: false,
    allowToChangeInstallationDirectory: true,
    createDesktopShortcut: true,
    createStartMenuShortcut: true,
    shortcutName: appName,
  },
  portable: {
    artifactName: "${productName} Portable ${version}.${ext}",
  },
  mac: {
    target: ["dmg", "zip"],
    category: "public.app-category.graphics-design",
    icon: "public/android-chrome-512x512.png",
  },
  linux: {
    target: ["AppImage", "deb"],
    category: "Graphics",
    icon: "public/android-chrome-512x512.png",
  },
};
