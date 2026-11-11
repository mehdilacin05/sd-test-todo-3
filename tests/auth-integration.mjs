import assert from "node:assert/strict";
import pg from "pg";

const app = "http://runner:3000";
const auth = "http://auth:9999";
const mail = "http://mail:8025";
const adminHeaders = {
  apikey: process.env.TEST_SERVICE_KEY,
  Authorization: `Bearer ${process.env.TEST_SERVICE_KEY}`,
  "Content-Type": "application/json",
};
const email = "person@example.invalid";
let cookies = new Map();
async function request(url, options = {}) {
  const response = await fetch(url, {
    redirect: "manual",
    ...options,
    headers: {
      ...(options.headers || {}),
      Origin: app,
      Cookie: [...cookies].map(([k, v]) => `${k}=${v}`).join("; "),
    },
  });
  for (const cookie of response.headers.getSetCookie()) {
    const [pair] = cookie.split(";");
    const index = pair.indexOf("=");
    if (pair.slice(index + 1))
      cookies.set(pair.slice(0, index), pair.slice(index + 1));
    else cookies.delete(pair.slice(0, index));
  }
  return response;
}
async function follow(response) {
  for (
    let i = 0;
    i < 8 && response.status >= 300 && response.status < 400;
    i++
  ) {
    response = await request(
      new URL(response.headers.get("location"), response.url),
    );
  }
  return response;
}
async function submit(address) {
  return request(`${app}/auth/request`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ email: address }),
  });
}
async function link() {
  for (let i = 0; i < 40; i++) {
    const list = await (await fetch(`${mail}/api/v1/messages`)).json();
    if (list.messages?.length) {
      const message = await (
        await fetch(`${mail}/api/v1/message/${list.messages[0].ID}`)
      ).json();
      const match = message.HTML.match(/href="([^"]+)"/);
      assert.ok(match, "message contains a link");
      return match[1].replaceAll("&amp;", "&");
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error("No email in Mailpit");
}
async function clearMail() {
  await fetch(`${mail}/api/v1/messages`, { method: "DELETE" });
}

const protectedPage = await request(`${app}/`);
assert.equal(protectedPage.status, 307);
assert.match(protectedPage.headers.get("location"), /\/login/);
const created = await fetch(`${auth}/admin/users`, {
  method: "POST",
  headers: adminHeaders,
  body: JSON.stringify({ email, email_confirm: true }),
});
assert.equal(created.status, 200, await created.clone().text());
const original = await (
  await fetch(`${auth}/admin/users`, { headers: adminHeaders })
).json();
const unknown = "unknown@example.invalid";
await submit(unknown);
const direct = await fetch(`${auth}/otp`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ email: unknown, create_user: true }),
});
assert.ok(!direct.ok, "direct OTP cannot register");
const signup = await fetch(`${auth}/signup`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ email: unknown, password: "test-only-password" }),
});
assert.ok(!signup.ok, "direct signup disabled");
const after = await (
  await fetch(`${auth}/admin/users`, { headers: adminHeaders })
).json();
assert.equal(after.users.length, original.users.length);
await clearMail();
await submit(email);
const first = await link();
let response = await follow(await request(first));
assert.equal(response.status, 200, await response.clone().text());
assert.match(response.url, /\/$/);
assert.equal((await request(`${app}/`)).status, 200);
await follow(await request(`${app}/auth/logout`, { method: "POST" }));
assert.equal((await request(`${app}/`)).status, 307);
cookies = new Map();
response = await follow(await request(first));
assert.notEqual(response.url, `${app}/`, "magic link is single-use");
await clearMail();
const expiryEmail = "expiry@example.invalid";
const expiryUser = await fetch(`${auth}/admin/users`, {
  method: "POST",
  headers: adminHeaders,
  body: JSON.stringify({ email: expiryEmail, email_confirm: true }),
});
assert.equal(expiryUser.status, 200);
await submit(expiryEmail);
const expired = await link();
const db = new pg.Client(
  "postgres://postgres:test-only-password@db:5432/postgres",
);
await db.connect();
const changed = await db.query(
  "UPDATE auth.users SET recovery_sent_at = now() - interval '31 minutes' WHERE email = $1",
  [expiryEmail],
);
assert.equal(changed.rowCount, 1);
await db.query(
  "UPDATE auth.one_time_tokens SET created_at = now() - interval '31 minutes', updated_at = now() - interval '31 minutes' WHERE user_id = (SELECT id FROM auth.users WHERE email = $1)",
  [expiryEmail],
);
await db.end();
response = await follow(await request(expired));
assert.notEqual(response.url, `${app}/`, "expired magic link rejected");
assert.equal((await request(`${app}/`)).status, 307);
console.log(
  "Auth integration: login, logout, disabled registration, single-use and expiry passed",
);
