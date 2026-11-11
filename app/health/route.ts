import { Pool } from "pg";
import { health } from "../../lib/health.mjs";

export const dynamic = "force-dynamic";
const pool = process.env.DATABASE_URL
  ? new Pool({
      connectionString: process.env.DATABASE_URL,
      connectionTimeoutMillis: 2000,
      max: 2,
    })
  : null;

export async function GET() {
  const result = await health(
    process.env.GIT_SHA || "unknown",
    async (sql: string) => {
      if (!pool) throw new Error("Database unavailable");
      await pool.query(sql);
    },
  );
  return Response.json(result.body, {
    status: result.status,
    headers: { "Cache-Control": "no-store" },
  });
}
