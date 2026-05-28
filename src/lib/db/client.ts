import "server-only";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "@/lib/db/schema";

const globalForDb = globalThis as unknown as {
  queryClient: ReturnType<typeof postgres> | undefined;
};

const poolMax =
  Number(process.env.DB_POOL_MAX ?? 0) ||
  (process.env.NODE_ENV === "production" ? 3 : 6);

const queryClient =
  globalForDb.queryClient ??
  postgres(process.env.DATABASE_URL!, {
    prepare: false,
    max: poolMax,
    idle_timeout: 20,
    connect_timeout: 10,
  });

if (process.env.NODE_ENV !== "production") {
  globalForDb.queryClient = queryClient;
}

export const db = drizzle(queryClient, { schema });
