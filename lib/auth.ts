import "server-only";
import { betterAuth } from "better-auth/minimal";
import { mongodbAdapter } from "@better-auth/mongo-adapter";
import { admin } from "better-auth/plugins/admin";
import { connectDB } from "@/lib/db";

async function createAuth() {
  if (!process.env.BETTER_AUTH_SECRET) throw new Error("Authentication secret missing");
  const connection = await connectDB();
  const db = connection.connection.db!;
  await Promise.all([
    db.collection("auth_users").createIndex({ email: 1 }, { unique: true }),
    db.collection("auth_sessions").createIndex({ token: 1 }, { unique: true }),
    db.collection("auth_sessions").createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
    db.collection("auth_rate_limits").createIndex({ key: 1 }, { unique: true }),
  ]);
  const hosts = process.env.VERCEL
    ? [process.env.VERCEL_URL, process.env.VERCEL_PROJECT_PRODUCTION_URL, process.env.BETTER_AUTH_URL && new URL(process.env.BETTER_AUTH_URL).host].filter((value): value is string => !!value)
    : ["localhost:3000", "127.0.0.1:3000"];
  return betterAuth({
    appName: "Manage From",
    secret: process.env.BETTER_AUTH_SECRET,
    baseURL: { allowedHosts: hosts, protocol: process.env.VERCEL ? "https" : "http", fallback: process.env.VERCEL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL}` : "http://localhost:3000" },
    database: mongodbAdapter(db),
    user: { modelName: "auth_users" },
    account: { modelName: "auth_accounts" },
    verification: { modelName: "auth_verifications" },
    session: { modelName: "auth_sessions", expiresIn: 60 * 60 * 24 * 7, updateAge: 60 * 60 * 24, cookieCache: { enabled: false } },
    emailAndPassword: { enabled: true, minPasswordLength: 10, maxPasswordLength: 128 },
    plugins: [admin()],
    advanced: { cookiePrefix: "manage-from", ipAddress: { ipAddressHeaders: ["x-real-ip"] } },
    rateLimit: { enabled: true, storage: "database", modelName: "auth_rate_limits", window: 60, max: 60,
      customRules: { "/sign-in/email": { window: 60, max: 5 }, "/change-password": { window: 60, max: 5 } } },
    logger: { disabled: true },
  });
}

let authPromise: ReturnType<typeof createAuth> | undefined;
export function getAuth() {
  authPromise ??= createAuth().catch((error) => { authPromise = undefined; throw error; });
  return authPromise;
}
