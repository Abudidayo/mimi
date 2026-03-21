import { spawn } from 'node:child_process';

const isWindows = process.platform === 'win32';
const npmCmd = isWindows ? 'npm.cmd' : 'npm';
const spawnOpts = { stdio: 'inherit', shell: isWindows };

const app = spawn(npmCmd, ['run', 'dev:app'], spawnOpts);
const bot = spawn(npmCmd, ['run', 'dev:bot'], spawnOpts);

let shuttingDown = false;

function shutdown(code = 0) {
  if (shuttingDown) return;
  shuttingDown = true;

  if (app && !app.killed) app.kill();
  if (bot && !bot.killed) bot.kill();

  process.exit(code);
}

app.on('exit', (code) => {
  if (!shuttingDown) {
    console.error(`[dev] app exited with code ${code ?? 0}`);
    shutdown(code ?? 0);
  }
});

bot.on('exit', (code) => {
  if (!shuttingDown) {
    console.error(`[dev] bot exited with code ${code ?? 0}`);
    shutdown(code ?? 0);
  }
});

process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));
