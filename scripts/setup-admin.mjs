import fs from 'node:fs';
import path from 'node:path';
import { randomBytes } from 'node:crypto';
import { createRequire } from 'node:module';
import nextEnv from '@next/env';
import ts from 'typescript';
import mongoose from 'mongoose';
nextEnv.loadEnvConfig(process.cwd());
const requireDependency = createRequire(import.meta.url);
const cache = new Map();
function load(relative) {
  const filename = path.resolve(relative);
  if (cache.has(filename)) return cache.get(filename).exports;
  const loadedModule = { exports: {} };
  cache.set(filename, loadedModule);
  const source = ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;
  new Function('require', 'module', 'exports', source)((id) => id === 'server-only' ? {} : id.startsWith('@/') ? load(id.slice(2) + '.ts') : requireDependency(id), loadedModule, loadedModule.exports);
  return loadedModule.exports;
}
const email = process.env.ADMIN_EMAIL || 'admin@managefrom.local';
const file = '.vercel/admin-initial-credentials.json';
try {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Invalid administrator email.');
  const { getAuth } = load('lib/auth.ts');
  const auth = await getAuth();
  const db = mongoose.connection.db;
  const members = db.collection('workspace_members');
  const existing = await members.findOne({ workspaceId: 'main', role: 'owner' });
  if (existing) {
    console.log(JSON.stringify({ status: 'already-exists', email: existing.email, mustChangePassword: !!existing.mustChangePassword, passwordUnchanged: true }));
  } else {
    if (await db.collection('auth_users').findOne({ email })) throw new Error('This email is already used; no existing account was promoted or reset.');
    const password = randomBytes(18).toString('base64url');
    fs.mkdirSync('.vercel', { recursive: true });
    // The temporary password is kept only in an ignored local handoff file; never source code or Vercel uploads.
    fs.writeFileSync(file, JSON.stringify({ email, password, createdAt: new Date().toISOString() }));
    const result = await auth.api.createUser({ body: { email, name: 'แอดมินหลัก', password, role: 'admin' } });
    await members.insertOne({ _id: result.user.id, workspaceId: 'main', role: 'owner', name: result.user.name, email, createdAt: new Date(), createdBy: 'server-setup', mustChangePassword: true });
    await db.collection('workspace_invites').updateOne({ _id: 'bootstrap' }, { $set: { email, acceptedBy: result.user.id, expiresAt: new Date(), workspaceId: 'main', role: 'owner', createdBy: 'server-setup' } }, { upsert: true });
    const account = await db.collection('auth_accounts').findOne({ userId: new mongoose.Types.ObjectId(result.user.id), providerId: 'credential' });
    if (!account?.password || account.password === password) throw new Error('Password persistence check failed.');
    console.log('Primary administrator created in MongoDB with a hashed temporary password and mandatory first-login password change. Credentials omitted.');
  }
} catch (error) {
  console.error('Administrator setup failed (' + error.name + '). Connection and credential details omitted.');
  process.exitCode = 1;
} finally { await mongoose.disconnect(); }
