import { test } from "node:test";
import assert from "node:assert/strict";
import { health } from "../lib/health.mjs";

test("reports revision after database query", async () => {
  let query;
  const result = await health("abc123", async (sql) => {
    query = sql;
  });
  assert.equal(query, "SELECT 1");
  assert.deepEqual(result, {
    status: 200,
    body: { status: "ok", revision: "abc123" },
  });
});

test("hides database errors and returns 503", async () => {
  const result = await health("abc123", async () => {
    throw new Error("password");
  });
  assert.deepEqual(result, {
    status: 503,
    body: { status: "unavailable", revision: "abc123" },
  });
});
