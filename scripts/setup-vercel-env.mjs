import nextEnv from '@next/env';
import { spawnSync } from 'node:child_process';
const { loadEnvConfig } = nextEnv;
loadEnvConfig(process.cwd());
const uri = process.env.MONGODB_URI;
if (!uri) throw new Error('MongoDB server setting is missing.');
const secretValues = [uri, new URL(uri).password];
function safeOutput(value) {
  for (const secret of secretValues) {
    if (secret) value = value.replaceAll(secret, '[redacted]').replaceAll(decodeURIComponent(secret), '[redacted]');
  }
  return value;
}
for (const [name, value, type] of [
  ['MONGODB_URI', uri, 'secret'],
  ['MONGODB_DB', process.env.MONGODB_DB || 'manage_from', 'config'],
]) {
  const result = spawnSync('npx.cmd', ['-y', 'vercel@latest', 'env', 'add', name, 'production,preview', '--type', type, '--yes', '--scope', 'warunyoo1s-projects'], {
    shell: true, input: value, encoding: 'utf8', timeout: 120000,
  });
  if (result.status !== 0) {
    console.error(safeOutput(result.stderr || 'Vercel environment configuration failed.'));
    process.exit(1);
  }
  console.log(`${name}: configured for production and preview (${type}).`);
}
