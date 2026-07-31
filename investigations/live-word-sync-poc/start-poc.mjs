import net from 'node:net';
import { spawn } from 'node:child_process';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname);
const preferredPort = Number(process.env.POC_PORT || 5181);
const explicitPort = Boolean(process.env.POC_PORT);

if (!Number.isInteger(preferredPort) || preferredPort < 1 || preferredPort > 65535) {
  throw new Error('POC_PORT must be a valid TCP port.');
}

function canListen(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once('error', () => resolve(false));
    server.listen(port, '127.0.0.1', () => {
      server.close(() => resolve(true));
    });
  });
}

let port = preferredPort;
if (explicitPort) {
  if (!(await canListen(port))) throw new Error(`POC_PORT=${port} is already in use.`);
} else {
  while (port < preferredPort + 20 && !(await canListen(port))) port += 1;
  if (port === preferredPort + 20) {
    throw new Error(`No free POC port found in ${preferredPort}-${preferredPort + 19}.`);
  }
}

const url = `http://127.0.0.1:${port}`;
console.log(`Starting POC at ${url}`);
console.log(`For capture: POC_URL=${url} npm run poc:compare`);
const child = spawn(process.execPath, [resolve(root, 'serve-poc.mjs')], {
  env: { ...process.env, POC_PORT: String(port) },
  stdio: 'inherit',
});
child.on('exit', (code, signal) => (process.exitCode = code ?? (signal ? 1 : 0)));
