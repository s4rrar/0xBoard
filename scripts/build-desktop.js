const { spawnSync } = require("child_process");
const path = require("path");

function run(command, args, extraEnv = {}) {
  const isWindows = process.platform === "win32";
  const cmd = isWindows && !command.endsWith(".cmd") && !command.endsWith(".exe") && command !== "node"
    ? `${command}.cmd`
    : command;

  console.log(`\n> ${cmd} ${args.join(" ")}`);

  const result = spawnSync(cmd, args, {
    stdio: "inherit",
    shell: isWindows,
    cwd: path.resolve(__dirname, ".."),
    env: {
      ...process.env,
      NODE_OPTIONS: `${process.env.NODE_OPTIONS || ""} --max-old-space-size=4096`.trim(),
      ...extraEnv,
    },
  });

  if (result.status !== 0) {
    console.error(`\nCommand failed with exit code ${result.status}`);
    process.exit(result.status || 1);
  }
}

const target = process.argv[2] || "all";

console.log("=================================================");
console.log(" 0xBoard Desktop Packaging Pipeline");
console.log(` Target: ${target.toUpperCase()}`);
console.log("=================================================");

// Step 1: Prepare resources/node.exe and build Electron scripts
console.log("\n==> [1/3] Preparing node.exe and compiling Electron scripts...");
run("node", ["scripts/build-electron.js"]);

// Step 2: Build Web Application
console.log("\n==> [2/3] Building Web Application with Vite...");
run("yarn", ["--cwd", "./excalidraw-app", "build:app"], { VITE_ELECTRON: "true" });

// Step 3: Run electron-builder packaging
console.log(`\n==> [3/3] Packaging Desktop Application with electron-builder...`);
const electronBuilderBin = path.resolve(
  __dirname,
  "../node_modules/electron-builder/cli.js",
);

let winTargets = ["nsis", "portable"];
if (target === "nsis") {
  winTargets = ["nsis"];
} else if (target === "portable") {
  winTargets = ["portable"];
}

run("node", [electronBuilderBin, "build", "--config", "electron-builder.js", "--win", ...winTargets]);

console.log("\n=================================================");
console.log(" SUCCESS: 0xBoard desktop build complete!");
console.log(" Packaged files located in: dist-desktop/");
console.log("=================================================\n");
