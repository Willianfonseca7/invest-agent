const fs = require("node:fs");
const crypto = require("node:crypto");
const path = require("node:path");
const esbuild = require("esbuild");

const service = process.argv[2];
const targets = {
  api: { entry: "apps/api/src/server.ts", output: "apps/api/dist/server.js" },
  worker: { entry: "apps/worker/src/index.ts", output: "apps/worker/dist/index.js" }
};
if (!Object.hasOwn(targets, service)) throw new Error("Invalid artifact service");
const root = path.resolve(__dirname, "..");
const { entry, output } = targets[service];
const bundlePath = path.join(root, output);
const manifestPath = `${bundlePath}.safety.json`;
const marker = `INVEST_AGENT_PAPER_ONLY_ARTIFACT_V1_${service}`;

async function build() {
  // A failed build must invalidate an earlier bundle before esbuild starts.
  fs.rmSync(manifestPath, { force: true });
  const result = await esbuild.build({
    entryPoints: [path.join(root, entry)],
    outfile: bundlePath,
    bundle: true,
    platform: "node",
    target: "node20",
    banner: { js: `/* ${marker} */` },
    write: false
  });
  const bytes = result.outputFiles[0]?.contents;
  if (!bytes || !Buffer.from(bytes).includes(Buffer.from(marker))) throw new Error("Build artifact missing marker");
  if (Buffer.from(bytes).includes(Buffer.from("/api/v3/order"))) throw new Error("Legacy live-order endpoint in build artifact");
  const sha256 = crypto.createHash("sha256").update(bytes).digest("hex");
  fs.mkdirSync(path.dirname(bundlePath), { recursive: true });
  fs.writeFileSync(bundlePath, bytes);
  fs.writeFileSync(manifestPath, JSON.stringify({ service, marker, sha256 }) + "\n");
}

build().catch((error) => { console.error(error); process.exitCode = 1; });
