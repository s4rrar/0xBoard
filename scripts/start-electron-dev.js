const { spawn } = require("child_process");
const http = require("http");
const path = require("path");
const esbuild = require("esbuild");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });

const APP_NAME = process.env.VITE_APP_NAME || "0xBoard";
const PORT = process.env.VITE_APP_PORT || 3000;
const DEV_URL = `http://localhost:${PORT}`;

async function buildElectronScripts() {
  console.log("[Electron] Building main and preload scripts...");
  await esbuild.build({
    entryPoints: [
      path.resolve(__dirname, "../excalidraw-app/electron/main.ts"),
      path.resolve(__dirname, "../excalidraw-app/electron/preload.ts"),
    ],
    bundle: true,
    platform: "node",
    target: "node18",
    external: ["electron"],
    outdir: path.resolve(__dirname, "../dist-electron"),
    sourcemap: "inline",
    define: {
      "process.env.VITE_APP_NAME": JSON.stringify(APP_NAME),
    },
    logLevel: "warning",
  });
  console.log("[Electron] Main and preload scripts built.");
}

function waitForServer(url, timeoutMs = 60000) {
  const startTime = Date.now();
  return new Promise((resolve, reject) => {
    const check = () => {
      const req = http.get(url, (res) => {
        if (res.statusCode && res.statusCode >= 200 && res.statusCode < 400) {
          resolve();
        } else {
          retry();
        }
      });

      req.on("error", () => {
        retry();
      });

      req.setTimeout(1000, () => {
        req.destroy();
        retry();
      });
    };

    const retry = () => {
      if (Date.now() - startTime > timeoutMs) {
        reject(new Error(`Timeout waiting for dev server at ${url}`));
      } else {
        setTimeout(check, 500);
      }
    };

    check();
  });
}

async function start() {
  try {
    await buildElectronScripts();

    console.log(`[Electron] Starting Vite dev server on port ${PORT}...`);
    const isWindows = process.platform === "win32";
    const yarnCmd = isWindows ? "yarn.cmd" : "yarn";

    const vite = spawn(
      yarnCmd,
      ["--cwd", "./excalidraw-app", "vite", "--port", String(PORT)],
      {
        stdio: "inherit",
        shell: true,
        env: {
          ...process.env,
          VITE_APP_NAME: APP_NAME,
          VITE_ELECTRON: "true",
          BROWSER: "none", // Prevent Vite from auto-opening standard browser
        },
      },
    );

    console.log(`[Electron] Waiting for ${DEV_URL} to be ready...`);
    await waitForServer(DEV_URL);
    console.log(`[Electron] Dev server is ready. Launching Electron...`);

    const electronBinary = path.resolve(
      __dirname,
      "../node_modules/.bin",
      isWindows ? "electron.cmd" : "electron",
    );

    const electron = spawn(
      electronBinary,
      [path.resolve(__dirname, "../dist-electron/main.js")],
      {
        stdio: "inherit",
        shell: true,
        env: {
          ...process.env,
          VITE_APP_NAME: APP_NAME,
          VITE_DEV_SERVER_URL: DEV_URL,
        },
      },
    );

    const cleanup = () => {
      console.log("[Electron] Shutting down dev server...");
      try {
        if (isWindows) {
          spawn("taskkill", ["/pid", vite.pid, "/f", "/t"]);
        } else {
          vite.kill("SIGTERM");
        }
      } catch (e) {
        // ignore
      }
      process.exit(0);
    };

    electron.on("close", () => {
      cleanup();
    });

    process.on("SIGINT", cleanup);
    process.on("SIGTERM", cleanup);
  } catch (err) {
    console.error("[Electron] Error during dev startup:", err);
    process.exit(1);
  }
}

start();
