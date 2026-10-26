const esbuild = require("esbuild");
const path = require("path");
const dotenv = require("dotenv");

dotenv.config({ path: path.resolve(__dirname, "../.env") });
if (process.env.NODE_ENV === "production") {
  dotenv.config({ path: path.resolve(__dirname, "../.env.production"), override: true });
}

const APP_NAME = process.env.VITE_APP_NAME || "0xBoard";

// Ensure resources/node.exe is prepared
try {
  require("./prepare-node.js");
} catch (e) {
  console.warn("Could not prepare node resource:", e);
}

async function build() {
  const isDev = process.argv.includes("--watch");

  console.log(`Building Electron main, preload, and server scripts for ${APP_NAME}...`);

  const buildOptions = {
    entryPoints: [
      path.resolve(__dirname, "../excalidraw-app/electron/main.ts"),
      path.resolve(__dirname, "../excalidraw-app/electron/preload.ts"),
      path.resolve(__dirname, "../excalidraw-app/electron/server.ts"),
    ],
    bundle: true,
    platform: "node",
    target: "node18",
    external: ["electron"],
    outdir: path.resolve(__dirname, "../dist-electron"),
    sourcemap: isDev ? "inline" : false,
    minify: !isDev,
    define: {
      "process.env.VITE_APP_NAME": JSON.stringify(APP_NAME),
    },
    logLevel: "info",
  };

  if (isDev) {
    const ctx = await esbuild.context(buildOptions);
    await ctx.watch();
    console.log("Watching Electron files for changes...");
  } else {
    await esbuild.build(buildOptions);
    console.log("Electron build complete.");
  }
}

build().catch((err) => {
  console.error("Failed to build Electron files:", err);
  process.exit(1);
});
