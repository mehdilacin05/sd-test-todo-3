import { z } from "zod";

// Match PostgreSQL's explicitly enumerated Unicode White_Space, not JS trim().
const edgeWhitespace =
  /^[\u0009-\u000d\u0020\u0085\u00a0\u1680\u2000-\u200a\u2028\u2029\u202f\u205f\u3000]+|[\u0009-\u000d\u0020\u0085\u00a0\u1680\u2000-\u200a\u2028\u2029\u202f\u205f\u3000]+$/gu;

export function parseTodoText(value: unknown): string | null {
  const result = z.string().safeParse(value);
  if (!result.success || Array.from(result.data).length > 1000) return null;
  const text = result.data.replace(edgeWhitespace, "");
  return Array.from(text).length >= 4 ? text : null;
}

export function parsePage(value: unknown): number | null {
  if (value === undefined) return 1;
  const result = z
    .string()
    .regex(/^[1-9]\d*$/)
    .safeParse(value);
  if (!result.success) return null;
  const page = Number(result.data);
  // PostgREST offsets are signed 32-bit integers.
  return Number.isSafeInteger(page) && page <= 21474836 ? page : null;
}

export function parseStatus(value: unknown): boolean | null {
  const result = z.enum(["true", "false"]).safeParse(value);
  return result.success ? result.data === "true" : null;
}

export function parseId(value: unknown): string | null {
  const result = z.uuid().safeParse(value);
  return result.success ? result.data : null;
}
