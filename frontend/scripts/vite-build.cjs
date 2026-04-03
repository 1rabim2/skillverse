/* eslint-disable no-console */
const { spawnSync } = require('child_process');
const path = require('path');

function run() {
  const env = { ...process.env };
  if (process.platform === 'win32') env.VITE_DISABLE_NET_USE = env.VITE_DISABLE_NET_USE || '1';

  let viteBin;
  try {
    viteBin = require.resolve('vite/bin/vite.js', { paths: [process.cwd()] });
  } catch {
    viteBin = path.join(process.cwd(), 'node_modules', 'vite', 'bin', 'vite.js');
  }

  const args = [viteBin, 'build'];
  const res = spawnSync(process.execPath, args, { stdio: 'inherit', env });
  process.exit(typeof res.status === 'number' ? res.status : 1);
}

run();

