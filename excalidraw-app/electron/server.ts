import http from "http";
import fs from "fs";
import path from "path";
import { exec } from "child_process";

const MIME_TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".mjs": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".webp": "image/webp",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".webmanifest": "application/manifest+json",
};

function parseArgs() {
  const args = process.argv.slice(2);
  let port = 0;
  let host = "127.0.0.1";
  let parentPid: number | null = null;
  let openBrowser = false;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--port" && args[i + 1]) {
      port = parseInt(args[++i], 10) || 0;
    } else if (arg === "--host" && args[i + 1]) {
      host = args[++i];
    } else if (arg === "--parent-pid" && args[i + 1]) {
      parentPid = parseInt(args[++i], 10) || null;
    } else if (arg === "--open") {
      openBrowser = true;
    }
  }

  return { port, host, parentPid, openBrowser };
}

function findWebDir(): string {
  const candidates = [
    // Packaged asar unpacked in resources
    path.join(__dirname, "app.asar.unpacked", "excalidraw-app", "build"),
    path.join(path.dirname(__dirname), "app.asar.unpacked", "excalidraw-app", "build"),
    path.join(process.cwd(), "resources", "app.asar.unpacked", "excalidraw-app", "build"),
    // If copied directly to resources
    path.join(__dirname, "excalidraw-app", "build"),
    path.join(path.dirname(__dirname), "excalidraw-app", "build"),
    path.join(__dirname, "build"),
    path.join(path.dirname(__dirname), "build"),
    // Development or local repo paths
    path.resolve(__dirname, "../../excalidraw-app/build"),
    path.resolve(__dirname, "../excalidraw-app/build"),
    path.resolve(process.cwd(), "excalidraw-app/build"),
    path.resolve(process.cwd(), "build"),
  ];

  for (const dir of candidates) {
    if (fs.existsSync(path.join(dir, "index.html"))) {
      return dir;
    }
  }

  return candidates[0];
}

const { port, host, parentPid, openBrowser } = parseArgs();
const webDir = findWebDir();

// Monitor parent PID if provided to avoid orphaned processes
if (parentPid) {
  setInterval(() => {
    try {
      // Sending signal 0 checks if process exists without killing it
      process.kill(parentPid, 0);
    } catch (e) {
      // Parent is dead, terminate cleanly
      process.exit(0);
    }
  }, 2000).unref();
}

const server = http.createServer((req, res) => {
  if (req.method !== "GET" && req.method !== "HEAD") {
    res.statusCode = 405;
    res.end("Method Not Allowed");
    return;
  }

  const urlPath = req.url ? req.url.split("?")[0] : "/";
  let safePath = path.normalize(decodeURIComponent(urlPath)).replace(/^(\.\.[/\\])+/, "");
  if (safePath === "/" || safePath === "\\") {
    safePath = "/index.html";
  }

  let filePath = path.join(webDir, safePath);

  // If path doesn't exist, check if appending .html works
  if (!fs.existsSync(filePath) && fs.existsSync(`${filePath}.html`)) {
    filePath = `${filePath}.html`;
  }

  // SPA fallback: if not found, serve index.html
  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    const indexPath = path.join(webDir, "index.html");
    if (fs.existsSync(indexPath)) {
      filePath = indexPath;
    } else {
      res.statusCode = 404;
      res.end("404 Not Found");
      return;
    }
  }

  try {
    const stat = fs.statSync(filePath);
    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || "application/octet-stream";

    res.statusCode = 200;
    res.setHeader("Content-Type", contentType);
    res.setHeader("Content-Length", stat.size);
    res.setHeader("Cache-Control", ext === ".html" ? "no-cache" : "public, max-age=31536000, immutable");
    res.setHeader("Access-Control-Allow-Origin", "*");

    if (req.method === "HEAD") {
      res.end();
      return;
    }

    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
  } catch (err: any) {
    res.statusCode = 500;
    res.end(`Internal Server Error: ${err?.message || err}`);
  }
});

server.listen(port, host, () => {
  const address = server.address();
  const actualPort = typeof address === "object" && address ? address.port : port;
  const readyUrl = `http://${host}:${actualPort}`;

  // Emit protocol message for Electron to capture
  console.log(`0XBOARD_SERVER_READY:${readyUrl}`);

  if (openBrowser) {
    const startCmd =
      process.platform === "win32"
        ? `start ${readyUrl}`
        : process.platform === "darwin"
        ? `open ${readyUrl}`
        : `xdg-open ${readyUrl}`;
    exec(startCmd);
  }
});

function cleanup() {
  server.close(() => {
    process.exit(0);
  });
  setTimeout(() => process.exit(0), 1000).unref();
}

process.on("SIGINT", cleanup);
process.on("SIGTERM", cleanup);
