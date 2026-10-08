import nextEnv from '@next/env';
import { spawnSync } from 'node:child_process';
nextEnv.loadEnvConfig(process.cwd());
for (const name of ['BETTER_AUTH_SECRET', 'AUTH_SETUP_TOKEN']) {
  const value = process.env[name];
  if (!value || value.length < 40) throw new Error(`${name} must be configured locally.`);
  const result = spawnSync('npx.cmd', ['-y', 'vercel@latest', 'env', 'add', name, 'production,preview', '--type', 'secret', '--yes', '--scope', 'warunyoo1s-projects'], { shell: true, input: value, encoding: 'utf8', timeout: 120000 });
  if (result.status !== 0) { console.error(`${name}: configuration failed. Secret values omitted.`); process.exit(1); }
  console.log(`${name}: configured as a secret for production and preview.`);
}
