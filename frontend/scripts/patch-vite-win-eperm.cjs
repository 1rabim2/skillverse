/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');

function findDepChunkFile(chunksDir) {
  if (!fs.existsSync(chunksDir)) return null;
  const names = fs.readdirSync(chunksDir).filter((n) => n.startsWith('dep-') && n.endsWith('.js'));
  for (const name of names) {
    const full = path.join(chunksDir, name);
    const txt = fs.readFileSync(full, 'utf8');
    if (txt.includes('function optimizeSafeRealPathSync()') && txt.includes('exec("net use"')) return full;
  }
  return null;
}

function patchFile(filePath) {
  const src = fs.readFileSync(filePath, 'utf8');
  if (src.includes('VITE_DISABLE_NET_USE')) return { patched: false, reason: 'already_patched' };

  const needle = 'function optimizeSafeRealPathSync() {\n  const nodeVersion';
  if (!src.includes(needle)) return { patched: false, reason: 'pattern_not_found' };

  const insert =
    'function optimizeSafeRealPathSync() {\n' +
    '  // Some locked-down Windows environments block spawning `net.exe` (EPERM),\n' +
    '  // which Vite uses to map network drives. Allow disabling that probe.\n' +
    '  if (process.env.VITE_DISABLE_NET_USE === "1") {\n' +
    '    safeRealpathSync = fs__default.realpathSync.native;\n' +
    '    return;\n' +
    '  }\n' +
    '  const nodeVersion';

  const next = src.replace(needle, insert);
  fs.writeFileSync(filePath, next, 'utf8');
  return { patched: true, reason: 'ok' };
}

function main() {
  const chunksDir = path.join(__dirname, '..', 'node_modules', 'vite', 'dist', 'node', 'chunks');
  const depFile = findDepChunkFile(chunksDir);
  if (!depFile) {
    console.log('[patch-vite] No matching Vite chunk found; skipping.');
    return;
  }
  const res = patchFile(depFile);
  if (res.patched) console.log(`[patch-vite] Patched: ${depFile}`);
  else console.log(`[patch-vite] Skipped (${res.reason}): ${depFile}`);
}

main();

