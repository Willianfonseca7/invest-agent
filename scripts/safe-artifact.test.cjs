const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const root = path.resolve(__dirname, "..");
const temp = fs.mkdtempSync(path.join(os.tmpdir(), "artifact-guard-"));
const marker = (service) => `INVEST_AGENT_PAPER_ONLY_ARTIFACT_V1_${service}`;
const run = (command, service, env = {}) => spawnSync(process.execPath,
  [path.join(temp, "scripts", command === "build" ? "build-safe-artifact.cjs" : "safe-artifact.cjs"),
    ...(command === "build" ? [service] : [command, service])],
  { encoding: "utf8", env: { ...process.env, ...env }, timeout: 10000 });

try {
  fs.mkdirSync(path.join(temp, "scripts"));
  fs.mkdirSync(path.join(temp, "node_modules"));
  for (const script of ["safe-artifact.cjs", "build-safe-artifact.cjs"]) {
    fs.copyFileSync(path.join(__dirname, script), path.join(temp, "scripts", script));
  }
  // Isolated source tree; only the existing build dependency is mapped in.
  fs.symlinkSync(path.join(root, "node_modules", "esbuild"), path.join(temp, "node_modules", "esbuild"), "dir");
  for (const service of ["api", "worker"]) {
    const name = service === "api" ? "server" : "index";
    const source = path.join(temp, "apps", service, "src", `${name}.ts`);
    const bundle = path.join(temp, "apps", service, "dist", `${name}.js`);
    const sentinel = path.join(temp, `${service}-invoked`);
    fs.mkdirSync(path.dirname(source), { recursive: true });
    const safeSource = `if (require.main !== module) throw new Error("not main");\nrequire("node:fs").writeFileSync(${JSON.stringify(sentinel)}, "ran");\n`;
    fs.writeFileSync(source, safeSource);
    assert.equal(run("build", service).status, 0);
    assert.equal(run("verify", service).status, 0);
    assert.equal(run("start", service).status, 0);
    assert.equal(fs.readFileSync(sentinel, "utf8"), "ran");
    fs.rmSync(sentinel);
    assert.notEqual(run("start", service, { EXECUTION_MODE: "live" }).status, 0);
    assert.equal(fs.existsSync(sentinel), false);
    fs.writeFileSync(source, `process.stdout.write("/api/v3/order");\n`);
    assert.match(run("build", service).stderr, /Legacy live-order endpoint in build artifact/);
    assert.equal(fs.existsSync(`${bundle}.safety.json`), false);
    fs.writeFileSync(source, safeSource);
    assert.equal(run("build", service).status, 0);
    fs.appendFileSync(bundle, `\n/* ${marker(service)} altered */\n`);
    assert.notEqual(run("start", service).status, 0);
    assert.equal(fs.existsSync(sentinel), false);
    // Synthetic legacy-capable bytes with a forged matching digest must still fail before launch.
    const forgedBundle = Buffer.from(`/* ${marker(service)} */\nconst endpoint = "/api/v3/order";\n`);
    fs.writeFileSync(bundle, forgedBundle);
    fs.writeFileSync(`${bundle}.safety.json`, JSON.stringify({
      service,
      marker: marker(service),
      sha256: crypto.createHash("sha256").update(forgedBundle).digest("hex")
    }));
    assert.match(run("verify", service).stderr, /Legacy live-order endpoint in artifact/);
    assert.match(run("start", service).stderr, /Legacy live-order endpoint in artifact/);
    assert.equal(fs.existsSync(sentinel), false);
    // A failed build cannot leave the previously sealed bundle runnable.
    fs.writeFileSync(source, "this is invalid TypeScript !!!");
    assert.notEqual(run("build", service).status, 0);
    assert.equal(fs.existsSync(`${bundle}.safety.json`), false);
    assert.notEqual(run("start", service).status, 0);
    assert.notEqual(run("seal", service).status, 0);
  }
  const paths = [
    ["koyeb.yaml", "run_command: node scripts/safe-artifact.cjs start worker"],
    ["railway.json", "node scripts/safe-artifact.cjs start worker"],
    ["render.yaml", "node scripts/safe-artifact.cjs start api"],
    ["apps/api/Dockerfile", "CMD [\"node\", \"scripts/safe-artifact.cjs\", \"start\", \"api\"]"],
    ["apps/worker/Dockerfile", "CMD [\"node\", \"scripts/safe-artifact.cjs\", \"start\", \"worker\"]"],
    [".github/workflows/worker.yml", "node scripts/safe-artifact.cjs start worker"]
  ];
  for (const [file, expected] of paths) assert.ok(fs.readFileSync(path.join(root, file), "utf8").includes(expected), file);
  for (const service of ["api", "worker"]) {
    const packageJson = JSON.parse(fs.readFileSync(path.join(root, "apps", service, "package.json"), "utf8"));
    assert.equal(packageJson.scripts.start, `node ../../scripts/safe-artifact.cjs start ${service}`);
    assert.equal(packageJson.scripts.build, `node ../../scripts/build-safe-artifact.cjs ${service}`);
  }
  console.log("Artifact guard: isolated builds, main-module launch, live rejection, legacy endpoint rejection, tamper and failed-build rejection, supported start paths passed");
} finally {
  fs.rmSync(temp, { recursive: true, force: true });
}
