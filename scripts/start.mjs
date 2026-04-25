import { spawn, execFile } from "node:child_process";
import { createWriteStream, existsSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { createPortReleasePlan } from "./dev-port-ownership.mjs";

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const backendDir = resolve(rootDir, "backend");
const frontendDir = resolve(rootDir, "frontend");

const isWindows = process.platform === "win32";
const backendPort = String(process.env.BACKEND_PORT || "8765");
const frontendPort = String(process.env.FRONTEND_PORT || "3477");
const backendLogPath = resolve(rootDir, ".dev_backend.log");
const frontendLogPath = resolve(rootDir, ".dev_frontend.log");
const devPidPath = resolve(rootDir, ".dev_pids.json");

let backendProcess;
let frontendProcess;
let stopping = false;

function sleep(ms) {
  return new Promise((resolveSleep) => setTimeout(resolveSleep, ms));
}

function execFileAsync(command, args, options = {}) {
  return new Promise((resolveExec, rejectExec) => {
    execFile(
      command,
      args,
      {
        windowsHide: true,
        maxBuffer: 10 * 1024 * 1024,
        ...options,
      },
      (error, stdout, stderr) => {
        if (error) {
          error.stdout = stdout;
          error.stderr = stderr;
          rejectExec(error);
          return;
        }
        resolveExec({ stdout, stderr });
      },
    );
  });
}

function matchesPort(localAddress, port) {
  const separatorIndex = localAddress.lastIndexOf(":");
  return separatorIndex >= 0 && localAddress.slice(separatorIndex + 1) === port;
}

async function findWindowsPortPids(port) {
  const { stdout } = await execFileAsync("netstat", ["-ano", "-p", "tcp"]);
  const pids = new Set();

  for (const line of stdout.split(/\r?\n/)) {
    const parts = line.trim().split(/\s+/);
    if (parts[0] !== "TCP" || parts.length < 5) {
      continue;
    }

    const [, localAddress, , state, pid] = parts;
    if (state === "LISTENING" && matchesPort(localAddress, port) && /^\d+$/.test(pid)) {
      pids.add(pid);
    }
  }

  return [...pids].filter((pid) => pid !== String(process.pid));
}

async function findUnixPortPids(port) {
  try {
    const { stdout } = await execFileAsync("lsof", ["-nP", `-iTCP:${port}`, "-sTCP:LISTEN", "-t"]);
    return [...new Set(stdout.split(/\s+/).filter(Boolean))];
  } catch {
    try {
      const { stdout } = await execFileAsync("fuser", [`${port}/tcp`]);
      return [...new Set(stdout.split(/\s+/).filter(Boolean))];
    } catch {
      return [];
    }
  }
}

async function findPortPids(port) {
  try {
    return isWindows ? await findWindowsPortPids(port) : await findUnixPortPids(port);
  } catch {
    return [];
  }
}

function addPid(pids, value) {
  const pid = String(value ?? "").trim();
  if (/^\d+$/.test(pid)) {
    pids.add(pid);
  }
}

function addLogPids(pids, logPath) {
  if (!existsSync(logPath)) {
    return;
  }

  const content = readFileSync(logPath, "utf8");
  const patterns = [
    /Started (?:reloader|server) process \[(\d+)\]/g,
    /\b(?:Backend|Frontend) PID:\s*(\d+)/g,
  ];

  for (const pattern of patterns) {
    for (const match of content.matchAll(pattern)) {
      addPid(pids, match[1]);
    }
  }
}

function loadKnownGraphitePids() {
  const pids = new Set();

  if (existsSync(devPidPath)) {
    try {
      const state = JSON.parse(readFileSync(devPidPath, "utf8"));
      if (state.rootDir === rootDir) {
        addPid(pids, state.launcherPid);
        addPid(pids, state.backend?.pid);
        addPid(pids, state.frontend?.pid);
      }
    } catch {
      // A corrupt stale PID file should not block startup.
    }
  }

  addLogPids(pids, backendLogPath);
  addLogPids(pids, frontendLogPath);
  return pids;
}

function parseProcessJson(stdout) {
  const trimmed = stdout.trim();
  if (!trimmed) {
    return [];
  }
  const parsed = JSON.parse(trimmed);
  return Array.isArray(parsed) ? parsed : [parsed];
}

async function listWindowsProcessInfos() {
  const script = [
    "$ErrorActionPreference = 'Stop';",
    "Get-CimInstance Win32_Process | ForEach-Object {",
    "[pscustomobject]@{",
    "pid=[string]$_.ProcessId;",
    "parentPid=[string]$_.ParentProcessId;",
    "name=$_.Name;",
    "executablePath=$_.ExecutablePath;",
    "commandLine=$_.CommandLine",
    "}",
    "} | ConvertTo-Json -Compress",
  ].join(" ");
  const { stdout } = await execFileAsync("powershell.exe", ["-NoProfile", "-Command", script]);
  return parseProcessJson(stdout);
}

async function listUnixProcessInfos() {
  const { stdout } = await execFileAsync("ps", ["-eo", "pid=,ppid=,comm=,args="]);
  return stdout
    .split(/\r?\n/)
    .map((line) => line.trim().match(/^(\d+)\s+(\d+)\s+(\S+)\s*(.*)$/))
    .filter(Boolean)
    .map((match) => ({
      pid: match[1],
      parentPid: match[2],
      name: match[3],
      commandLine: match[4],
    }));
}

async function listProcessInfos() {
  try {
    return isWindows ? await listWindowsProcessInfos() : await listUnixProcessInfos();
  } catch {
    return [];
  }
}

async function terminatePids(pids) {
  if (isWindows) {
    await Promise.all(
      pids.map((pid) =>
        execFileAsync("taskkill", ["/PID", pid, "/T", "/F"]).catch(() => undefined),
      ),
    );
    return;
  }

  for (const pid of pids) {
    try {
      process.kill(Number(pid), "SIGTERM");
    } catch {
      // The process may already be gone.
    }
  }
  await sleep(1000);
  for (const pid of pids) {
    try {
      process.kill(Number(pid), "SIGKILL");
    } catch {
      // The process may already be gone.
    }
  }
}

async function killPortPids(port) {
  const pids = await findPortPids(port);
  if (pids.length === 0) {
    return;
  }

  const processInfos = await listProcessInfos();
  const plan = createPortReleasePlan({
    port,
    portPids: pids,
    processInfos,
    context: {
      knownGraphitePids: loadKnownGraphitePids(),
      rootDir,
      backendDir,
      frontendDir,
      backendPort,
      frontendPort,
    },
  });

  if (plan.blockedOwners.length > 0) {
    console.error(`Port ${port} is used by process(es) that do not look like GraphiteUI:`);
    for (const owner of plan.blockedOwners) {
      console.error(`  ${owner}`);
    }
    throw new Error(`Port ${port} is occupied by another program. Stop that program or change the port.`);
  }

  if (plan.killPids.length === 0) {
    throw new Error(
      `Port ${port} is occupied by PID(s): ${pids.join(
        ", ",
      )}, but no live GraphiteUI process could be found to terminate.`,
    );
  }

  console.log(`Releasing GraphiteUI process(es) on port ${port}: ${plan.killPids.join(", ")}`);
  await terminatePids(plan.killPids);
  await sleep(1000);
  const remainingPids = await findPortPids(port);
  if (remainingPids.length > 0) {
    throw new Error(`Failed to release port ${port}; still used by PID(s): ${remainingPids.join(", ")}`);
  }
}

function writeDevPidState() {
  writeFileSync(
    devPidPath,
    `${JSON.stringify(
      {
        rootDir,
        startedAt: new Date().toISOString(),
        launcherPid: process.pid,
        backend: {
          pid: backendProcess?.pid,
          port: backendPort,
        },
        frontend: {
          pid: frontendProcess?.pid,
          port: frontendPort,
        },
      },
      null,
      2,
    )}\n`,
  );
}

function clearDevPidState() {
  if (existsSync(devPidPath)) {
    try {
      const state = JSON.parse(readFileSync(devPidPath, "utf8"));
      if (String(state.launcherPid ?? "") !== String(process.pid)) {
        return;
      }
    } catch {
      // Remove unreadable state written by this launcher path.
    }
  }
  rmSync(devPidPath, { force: true });
}

async function resolvePythonCommand() {
  const candidates = [];
  if (process.env.PYTHON) {
    candidates.push({ command: process.env.PYTHON, prefixArgs: [] });
  }

  if (process.env.CONDA_PREFIX) {
    candidates.push({
      command: isWindows
        ? join(process.env.CONDA_PREFIX, "python.exe")
        : join(process.env.CONDA_PREFIX, "bin", "python"),
      prefixArgs: [],
    });
  }

  if (isWindows && process.env.CONDA_EXE) {
    candidates.push({
      command: resolve(dirname(process.env.CONDA_EXE), "..", "python.exe"),
      prefixArgs: [],
    });
  }

  if (isWindows) {
    candidates.push({ command: "C:\\ProgramData\\miniconda3\\python.exe", prefixArgs: [] });
    candidates.push(
      { command: "py", prefixArgs: ["-3"] },
      { command: "python", prefixArgs: [] },
      { command: "python3", prefixArgs: [] },
    );
  } else {
    candidates.push(
      { command: "python3", prefixArgs: [] },
      { command: "python", prefixArgs: [] },
    );
  }

  for (const candidate of candidates) {
    try {
      await execFileAsync(
        candidate.command,
        [
          ...candidate.prefixArgs,
          "-c",
          "import sys; raise SystemExit(0 if sys.version_info >= (3, 11) else 1)",
        ],
        { timeout: 5000 },
      );
      return candidate;
    } catch {
      // Try the next Python executable name.
    }
  }

  return null;
}

async function waitForHttp(url, retries, delayMs) {
  for (let index = 0; index < retries; index += 1) {
    try {
      const response = await fetch(url, {
        signal: AbortSignal.timeout(1500),
      });
      if (response.ok) {
        return true;
      }
    } catch {
      // The service may still be booting.
    }
    await sleep(delayMs);
  }
  return false;
}

function writeLogHeader(stream, label) {
  stream.write(`Starting ${label} at ${new Date().toISOString()}\n`);
  stream.write("=".repeat(72));
  stream.write("\n");
}

function spawnLoggedProcess(command, args, options, logPath, label) {
  const logStream = createWriteStream(logPath, { flags: "w" });
  writeLogHeader(logStream, label);

  const child = spawn(command, args, {
    cwd: options.cwd,
    env: options.env,
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true,
    detached: !isWindows,
  });

  child.stdout.pipe(logStream);
  child.stderr.pipe(logStream);
  child.once("spawn", () => {
    const pidLine = `${label} PID: ${child.pid}`;
    console.log(pidLine);
    logStream.write(`${pidLine}\n`);
  });
  child.once("error", (error) => {
    logStream.write(`\nFailed to start ${label}: ${error.message}\n`);
  });
  child.once("exit", (code, signal) => {
    logStream.write(`\n${label} exited with code ${code ?? "null"} signal ${signal ?? "null"}\n`);
    logStream.end();
  });

  return child;
}

async function printLogTail(logPath) {
  const command = isWindows
    ? ["powershell.exe", ["-NoProfile", "-Command", `Get-Content -LiteralPath '${logPath.replace(/'/g, "''")}' -Tail 20`]]
    : ["tail", ["-20", logPath]];

  try {
    const { stdout, stderr } = await execFileAsync(command[0], command[1]);
    const output = `${stdout}${stderr}`.trim();
    if (output) {
      console.log(output);
    }
  } catch {
    // The log may not exist yet.
  }
}

async function stopProcessTree(child) {
  if (!child?.pid) {
    return;
  }

  if (isWindows) {
    await execFileAsync("taskkill", ["/PID", String(child.pid), "/T", "/F"]).catch(() => undefined);
    return;
  }

  try {
    process.kill(-child.pid, "SIGTERM");
  } catch {
    try {
      process.kill(child.pid, "SIGTERM");
    } catch {
      // The process may already be gone.
    }
  }
}

async function stopServices() {
  if (stopping) {
    return;
  }

  stopping = true;
  if (!frontendProcess && !backendProcess) {
    return;
  }

  console.log("\nStopping GraphiteUI services...");
  await Promise.all([stopProcessTree(frontendProcess), stopProcessTree(backendProcess)]);
  clearDevPidState();
  console.log("Services stopped.");
}

async function main() {
  console.log("Starting GraphiteUI dev environment...");
  console.log(`  Backend port : ${backendPort}`);
  console.log(`  Frontend port: ${frontendPort}`);
  console.log(`  Backend log  : ${backendLogPath}`);
  console.log(`  Frontend log : ${frontendLogPath}`);
  console.log("");

  const python = await resolvePythonCommand();
  if (!python) {
    throw new Error("Python 3.11+ was not found. Install Python or set PYTHON to its executable path.");
  }

  if (!existsSync(resolve(frontendDir, "node_modules"))) {
    console.warn("Warning: frontend/node_modules was not found. Run `npm.cmd install` in frontend first if startup fails.");
  }

  await killPortPids(backendPort);
  await killPortPids(frontendPort);

  backendProcess = spawnLoggedProcess(
    python.command,
    [
      ...python.prefixArgs,
      "-m",
      "uvicorn",
      "app.main:app",
      "--reload",
      "--port",
      backendPort,
    ],
    {
      cwd: backendDir,
      env: process.env,
    },
    backendLogPath,
    "Backend",
  );

  const npmExecutable = process.env.NPM || (isWindows ? "npm.cmd" : "npm");
  const npmCommand = isWindows ? process.env.ComSpec || "cmd.exe" : npmExecutable;
  const npmArgs = ["run", "dev", "--", "--host", "127.0.0.1", "--port", frontendPort];
  frontendProcess = spawnLoggedProcess(
    npmCommand,
    isWindows ? ["/d", "/s", "/c", npmExecutable, ...npmArgs] : npmArgs,
    {
      cwd: frontendDir,
      env: {
        ...process.env,
        INTERNAL_API_BASE_URL: `http://127.0.0.1:${backendPort}`,
      },
    },
    frontendLogPath,
    "Frontend",
  );

  writeDevPidState();

  const backendReady = await waitForHttp(`http://127.0.0.1:${backendPort}/health`, 20, 500);
  if (!backendReady) {
    console.error(`Backend failed to start. Check ${backendLogPath}`);
    await printLogTail(backendLogPath);
    await stopServices();
    process.exit(1);
  }

  const frontendReady = await waitForHttp(`http://127.0.0.1:${frontendPort}`, 30, 500);
  if (!frontendReady) {
    console.error(`Frontend failed to start. Check ${frontendLogPath}`);
    await printLogTail(frontendLogPath);
    await stopServices();
    process.exit(1);
  }

  console.log("");
  console.log("GraphiteUI services started.");
  console.log(`  Frontend: http://127.0.0.1:${frontendPort}`);
  console.log(`  Backend:  http://127.0.0.1:${backendPort}`);
  console.log("");
  console.log("Press Ctrl+C to stop both services.");
  console.log("");

  const exitOnChildStop = async (label, logPath) => {
    if (stopping) {
      return;
    }
    console.error(`${label} process exited unexpectedly. Check ${logPath}`);
    await printLogTail(logPath);
    await stopServices();
    process.exit(1);
  };

  backendProcess.once("exit", () => exitOnChildStop("Backend", backendLogPath));
  frontendProcess.once("exit", () => exitOnChildStop("Frontend", frontendLogPath));
}

process.on("SIGINT", async () => {
  await stopServices();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  await stopServices();
  process.exit(0);
});

main().catch(async (error) => {
  console.error(error.message);
  await stopServices();
  process.exit(1);
});
