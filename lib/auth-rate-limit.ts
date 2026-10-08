import "server-only";
import { createHash } from "node:crypto";
import { connectDB } from "@/lib/db";
import { AccessError } from "@/lib/access";
let indexReady: Promise<string> | undefined;
/** A shared atomic counter works across separate Vercel function instances. */
export async function limitAccessRequest(request: Request, action: string, max = 10) {
  const collection = (await connectDB()).connection.db!.collection<{ _id: string; count: number; expiresAt: Date }>("access_rate_limits");
  indexReady ??= collection.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }).catch((error) => { indexReady = undefined; throw error; });
  await indexReady;
  const ip = process.env.VERCEL ? request.headers.get("x-real-ip") || "unknown" : "local";
  const bucket = Math.floor(Date.now() / 60000);
  const key = createHash("sha256").update(`${action}:${ip}:${bucket}`).digest("hex");
  const counter = await collection.findOneAndUpdate({ _id: key }, { $inc: { count: 1 }, $setOnInsert: { expiresAt: new Date((bucket + 2) * 60000) } }, { upsert: true, returnDocument: "after" });
  if (!counter || counter.count > max) throw new AccessError("ลองหลายครั้งเกินไป กรุณารอ 1 นาที", 429);
}
