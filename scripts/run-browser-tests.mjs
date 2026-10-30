import { spawn } from "node:child_process";

const files = process.argv.slice(2);
if (!files.length) throw new Error("Pass at least one browser test file.");

const port = Number(process.env.TEST_PORT || 4173);
const baseUrl = process.env.TEST_BASE_URL || `http://127.0.0.1:${port}`;
const server = spawn(process.execPath, ["scripts/dev.mjs"], {
  env: { ...process.env, PORT: String(port), PROSPECTING_API_URL: "" },
  stdio: ["ignore", "pipe", "inherit"]
});

let serverOutput = "";
server.stdout.on("data", chunk => { serverOutput += chunk; });

async function waitForServer() {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    if (server.exitCode !== null) throw new Error(`Development server exited early. ${serverOutput}`);
    try {
      const response = await fetch(baseUrl);
      if (response.ok) return;
    } catch {}
    await new Promise(resolve => setTimeout(resolve, 250));
  }
  throw new Error(`Timed out waiting for ${baseUrl}. ${serverOutput}`);
}

let exitCode = 1;
try {
  await waitForServer();
  exitCode = await new Promise((resolve, reject) => {
    const tests = spawn(process.execPath, ["--test", ...files], {
      env: { ...process.env, TEST_BASE_URL: baseUrl },
      stdio: "inherit"
    });
    tests.on("error", reject);
    tests.on("exit", code => resolve(code ?? 1));
  });
} finally {
  server.kill("SIGTERM");
}

process.exitCode = exitCode;
