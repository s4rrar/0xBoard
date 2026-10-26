const fs = require("fs");
const path = require("path");

function prepareNode() {
  const resourcesDir = path.resolve(__dirname, "../resources");
  if (!fs.existsSync(resourcesDir)) {
    fs.mkdirSync(resourcesDir, { recursive: true });
  }

  const targetNodePath = path.join(resourcesDir, "node.exe");

  if (fs.existsSync(targetNodePath)) {
    try {
      const stats = fs.statSync(targetNodePath);
      if (stats.size > 10000000) {
        console.log(
          `[prepare-node] resources/node.exe already present (${(
            stats.size /
            1024 /
            1024
          ).toFixed(1)} MB).`,
        );
        return;
      }
    } catch (e) {
      // re-copy if stat failed
    }
  }

  const currentNode = process.execPath;
  console.log(`[prepare-node] Copying ${currentNode} -> ${targetNodePath}...`);
  fs.copyFileSync(currentNode, targetNodePath);
  const size = fs.statSync(targetNodePath).size;
  console.log(
    `[prepare-node] node.exe ready in resources/node.exe (${(
      size /
      1024 /
      1024
    ).toFixed(1)} MB)`,
  );
}

prepareNode();
