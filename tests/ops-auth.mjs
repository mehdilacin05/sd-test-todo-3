import assert from "node:assert/strict";

const site = "http://example.invalid";
const gateway = "http://gateway:3001";
const privateGateway = "http://gateway-private:3001";
const adminHeaders = {
  apikey: process.env.TEST_SERVICE_KEY,
  Authorization: `Bearer ${process.env.TEST_SERVICE_KEY}`,
  "Content-Type": "application/json",
};
const email = "ops-person@example.invalid";
const created = await fetch(`${privateGateway}/auth/v1/admin/users`, {
  method: "POST",
  headers: adminHeaders,
  body: JSON.stringify({ email, email_confirm: true }),
});
assert.equal(created.status, 200, await created.clone().text());
assert.equal(
  (await fetch(`${gateway}/auth/v1/admin/users`, { headers: adminHeaders }))
    .status,
  404,
);
assert.equal(
  (await fetch(`${gateway}/auth/v1/%61dmin/users`, { headers: adminHeaders }))
    .status,
  404,
);
const forbiddenSignup = await fetch(`${gateway}/auth/v1/signup`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    email: "unknown@example.invalid",
    password: "test-only-password",
  }),
});
assert.equal(forbiddenSignup.status, 404);
const forbiddenOtp = await fetch(`${gateway}/auth/v1/otp`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ email: "unknown@example.invalid", create_user: true }),
});
assert.ok(!forbiddenOtp.ok, "public OTP cannot create users");
const cookies = new Map();
async function request(url, options = {}) {
  const actual = new URL(url, site);
  assert.equal(actual.origin, site);
  const response = await fetch(`${gateway}${actual.pathname}${actual.search}`, {
    redirect: "manual",
    ...options,
    headers: {
      ...(options.headers || {}),
      Origin: site,
      Cookie: [...cookies].map(([k, v]) => `${k}=${v}`).join("; "),
    },
  });
  for (const cookie of response.headers.getSetCookie()) {
    const pair = cookie.split(";")[0];
    const index = pair.indexOf("=");
    if (pair.slice(index + 1))
      cookies.set(pair.slice(0, index), pair.slice(index + 1));
    else cookies.delete(pair.slice(0, index));
  }
  return response;
}
assert.equal((await request("/")).status, 307);
const submitted = await request("/auth/request", {
  method: "POST",
  headers: { "Content-Type": "application/x-www-form-urlencoded" },
  body: new URLSearchParams({ email }),
});
assert.equal(submitted.status, 303);
let messages;
for (let i = 0; i < 40; i++) {
  messages = (await (await fetch("http://mailpit:8025/api/v1/messages")).json())
    .messages;
  if (messages?.length) break;
  await new Promise((resolve) => setTimeout(resolve, 250));
}
assert.ok(messages?.length, "mail delivered to Mailpit");
const mail = await (
  await fetch(`http://mailpit:8025/api/v1/message/${messages[0].ID}`)
).json();
const match = mail.HTML.match(/href="([^"]+)"/);
assert.ok(match);
let url = match[1].replaceAll("&amp;", "&");
let response;
for (let i = 0; i < 8; i++) {
  response = await request(url);
  console.log(
    "login step",
    new URL(url, site).pathname,
    response.status,
    "cookies",
    [...cookies.keys()],
  );
  if (response.status < 300 || response.status >= 400) break;
  url = new URL(response.headers.get("location"), site).href;
}
assert.equal(response.status, 200, "magic link reaches app");
assert.equal((await request("/")).status, 200, "session authenticated");
const todo = await request("/todos", {
  method: "POST",
  headers: { "Content-Type": "application/x-www-form-urlencoded" },
  body: new URLSearchParams({
    action: "create",
    text: "Persisted operations probe",
  }),
});
assert.equal(todo.status, 303, "authenticated todo created");
assert.match(await (await request("/")).text(), /Persisted operations probe/);
assert.equal(
  (await fetch("http://studio:3000/api/platform/profile")).status,
  200,
  "Studio responds privately",
);
console.log("Isolated stack login and protected admin route passed.");
