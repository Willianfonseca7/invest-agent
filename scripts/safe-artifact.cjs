const fs = require("node:fs");
const crypto = require("node:crypto");
const path = require("node:path");
const { spawn } = require("node:child_process");

const [command, service] = process.argv.slice(2);
const targets = { api: "apps/api/dist/server.js", worker: "apps/worker/dist/index.js" };
if (!Object.hasOwn(targets, service) || !["verify", "start"].includes(command)) {
  throw new Error("Invalid artifact command");
}
const bundlePath = path.resolve(__dirname, "..", targets[service]);
const marker = `INVEST_AGENT_PAPER_ONLY_ARTIFACT_V1_${service}`;
const bundle = fs.readFileSync(bundlePath);
if (!bundle.includes(Buffer.from(marker))) throw new Error("Artifact safety marker missing");
if (bundle.includes(Buffer.from("/api/v3/order"))) throw new Error("Legacy live-order endpoint in artifact");
const manifest = JSON.parse(fs.readFileSync(`${bundlePath}.safety.json`, "utf8"));
const digest = crypto.createHash("sha256").update(bundle).digest("hex");
if (manifest.service !== service || manifest.marker !== marker || manifest.sha256 !== digest) {
  throw new Error("Artifact safety verification failed");
}
if (command === "start") {
  if (process.env.EXECUTION_MODE === "live") throw new Error("Live trading is disabled");
  const child = spawn(process.execPath, [bundlePath], { stdio: "inherit", env: process.env });
  for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => child.kill(signal));
  child.on("error", (error) => { throw error; });
  child.on("exit", (code, signal) => { process.exitCode = code ?? (signal ? 1 : 0); });
}
