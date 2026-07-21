import { drizzle } from "drizzle-orm/d1";
import * as schema from "./schema";

type RuntimeBindings = { DB?: D1Database; BUCKET?: R2Bucket };

declare global {
  var __NORWEST_RUNTIME_BINDINGS__: RuntimeBindings | undefined;
}

export function getDb() {
  const database = globalThis.__NORWEST_RUNTIME_BINDINGS__?.DB;
  if (!database) {
    throw new Error(
      "Cloudflare D1 binding `DB` is unavailable. Set the `d1` field in .openai/hosting.json to `DB` or let your control plane inject the real binding values before using the database."
    );
  }

  return drizzle(database, { schema });
}

export function getBucket() {
  const bucket = globalThis.__NORWEST_RUNTIME_BINDINGS__?.BUCKET;
  if (!bucket) throw new Error("Cloudflare R2 binding `BUCKET` is unavailable.");
  return bucket;
}
