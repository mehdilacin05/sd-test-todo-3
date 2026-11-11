import { createHmac } from "node:crypto";

const encode = (value) =>
  Buffer.from(JSON.stringify(value)).toString("base64url");
const body = `${encode({ alg: "HS256", typ: "JWT" })}.${encode({ role: process.argv[2], iss: "supabase", exp: 4102444800 })}`;
const signature = createHmac(
  "sha256",
  "test-only-jwt-secret-at-least-32-characters-long",
)
  .update(body)
  .digest("base64url");
process.stdout.write(`${body}.${signature}`);
