import { spawn } from "node:child_process";
import path from "node:path";
import process from "node:process";
import { config as loadEnv } from "dotenv";

loadEnv();

const [command = "dev", ...restArgs] = process.argv.slice(2);
const supportedCommands = new Set(["dev", "start"]);

if (!supportedCommands.has(command)) {
  console.error(`Unsupported command \"${command}\". Use \"dev\" or \"start\".`);
  process.exit(1);
}

const hasPortArg = restArgs.some((arg) => {
  return arg === "--port" || arg === "-p" || arg.startsWith("--port=") || arg.startsWith("-p=");
});

const envPort = process.env.PORT?.trim();

if (envPort && !/^\d+$/.test(envPort)) {
  console.error(`Invalid PORT value \"${envPort}\". Use a numeric port value.`);
  process.exit(1);
}

const nextBinPath = path.join(process.cwd(), "node_modules", "next", "dist", "bin", "next");
const nextArgs = [nextBinPath, command];

if (!hasPortArg && envPort) {
  nextArgs.push("--port", envPort);
}

nextArgs.push(...restArgs);

const child = spawn(process.execPath, nextArgs, {
  stdio: "inherit",
  env: process.env,
});

child.on("error", (error) => {
  console.error("Failed to start Next.js process:", error);
  process.exit(1);
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 1);
});
