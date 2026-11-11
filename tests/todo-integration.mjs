import assert from "node:assert/strict";
import { chromium } from "playwright";
import pg from "pg";

const app = "http://runner:3000";
const auth = "http://auth:9999";
const mail = "http://mail:8025";
const adminHeaders = {
  apikey: process.env.TEST_SERVICE_KEY,
  Authorization: `Bearer ${process.env.TEST_SERVICE_KEY}`,
  "Content-Type": "application/json",
};
async function createUser(email) {
  const response = await fetch(`${auth}/admin/users`, {
    method: "POST",
    headers: adminHeaders,
    body: JSON.stringify({ email, email_confirm: true }),
  });
  assert.equal(response.status, 200, await response.clone().text());
  return response.json();
}
async function waitForLink() {
  for (let i = 0; i < 80; i++) {
    const list = await (await fetch(`${mail}/api/v1/messages`)).json();
    if (list.messages?.length) {
      const message = await (
        await fetch(`${mail}/api/v1/message/${list.messages[0].ID}`)
      ).json();
      const link = message.HTML.match(/href="([^"]+)"/);
      assert.ok(link);
      return link[1].replaceAll("&amp;", "&");
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error("No test login email");
}
const a = await createUser("todo-a@example.invalid");
const b = await createUser("todo-b@example.invalid");
const db = new pg.Client(
  "postgres://postgres:test-only-password@db:5432/postgres",
);
await db.connect();
const foreign = await db.query(
  "INSERT INTO public.todos(user_id,text) VALUES ($1,'Fremdes Todo') RETURNING id",
  [b.id],
);
const foreignId = foreign.rows[0].id;
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 375, height: 812 },
  isMobile: true,
  hasTouch: true,
});
const page = await context.newPage();
try {
  await page.goto(`${app}/login`);
  const loginResponse = await page.request.get(`${app}/login`);
  assert.equal(loginResponse.headers()["x-content-type-options"], "nosniff");
  assert.equal(loginResponse.headers()["x-frame-options"], "DENY");
  assert.equal(loginResponse.headers()["referrer-policy"], "same-origin");
  assert.equal(loginResponse.headers()["x-powered-by"], undefined);
  for (const path of [
    "/",
    "/forgotten-private-path",
    "/login-private",
    "/auth-private",
    "/health-private",
  ]) {
    const result = await page.request.get(`${app}${path}`, { maxRedirects: 0 });
    assert.equal(result.status(), 307, path);
    assert.equal(new URL(result.headers().location).pathname, "/login", path);
  }
  await page.getByLabel("E-Mail").fill("todo-a@example.invalid");
  await page.getByRole("button", { name: "Anmeldelink anfordern" }).click();
  await page.goto(await waitForLink());
  await page.waitForURL(`${app}/`);
  const payload = '<img src=x onerror="window.__xss=1">';
  await page.getByLabel("Neues Todo").fill(payload);
  await page.getByRole("button", { name: "Anlegen" }).click();
  await page.getByText(payload, { exact: true }).waitFor();
  await page.reload();
  await page.getByText(payload, { exact: true }).waitFor();
  assert.equal(await page.locator(".todos img").count(), 0);
  assert.equal(await page.evaluate(() => window.__xss), undefined);
  await db.query("DELETE FROM public.todos WHERE user_id=$1 AND text=$2", [
    a.id,
    payload,
  ]);
  await page.reload();
  await page.getByLabel("Neues Todo").fill("abc");
  const invalid = await Promise.all([
    page.waitForResponse(
      (r) => r.url() === `${app}/todos` && r.request().method() === "POST",
    ),
    page.getByRole("button", { name: "Anlegen" }).click(),
  ]);
  assert.equal(invalid[0].status(), 400);
  assert.equal(await page.getByLabel("Neues Todo").inputValue(), "abc");
  await page.getByLabel("Neues Todo").fill("<x>");
  const escaped = await Promise.all([
    page.waitForResponse(
      (r) => r.url() === `${app}/todos` && r.request().method() === "POST",
    ),
    page.getByRole("button", { name: "Anlegen" }).click(),
  ]);
  assert.equal(escaped[0].status(), 400);
  assert.equal(await page.getByLabel("Neues Todo").inputValue(), "<x>");
  assert.equal(await page.locator("x").count(), 0);
  await page.getByLabel("Neues Todo").fill("Erstes gültiges Todo");
  await page.getByRole("button", { name: "Anlegen" }).click();
  await page.getByText("Erstes gültiges Todo").waitFor();
  await page.getByRole("button", { name: "Erledigen" }).click();
  await page.getByRole("button", { name: "Wieder öffnen" }).waitFor();
  await page.getByRole("button", { name: "Wieder öffnen" }).click();
  await page.getByRole("button", { name: "Erledigen" }).waitFor();
  const noJsContext = await browser.newContext({
    javascriptEnabled: false,
    storageState: await context.storageState(),
    viewport: { width: 375, height: 812 },
  });
  const noJsPage = await noJsContext.newPage();
  await noJsPage.goto(`${app}/`);
  await noJsPage.getByRole("button", { name: "Löschen" }).click();
  await noJsPage
    .getByRole("dialog")
    .getByText("Dieses Todo wirklich löschen?")
    .waitFor();
  await noJsPage.getByRole("link", { name: "Abbrechen" }).click();
  await noJsPage.getByText("Erstes gültiges Todo").waitFor();
  await noJsContext.close();
  await page.getByRole("button", { name: "Löschen" }).click();
  await page
    .getByRole("dialog")
    .getByText("Dieses Todo wirklich löschen?")
    .waitFor();
  await page.getByRole("link", { name: "Abbrechen" }).click();
  await page.getByText("Erstes gültiges Todo").waitFor();
  await page.getByRole("button", { name: "Löschen" }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Löschen bestätigen" })
    .click();
  await page.getByText("Keine Todos auf dieser Seite.").waitFor();
  for (const action of ["confirm", "status", "delete"]) {
    const response = await page.request.post(`${app}/todos`, {
      headers: { Origin: app },
      form: { action, id: foreignId, completed: "true" },
    });
    assert.equal(response.status(), 404, action);
  }
  const foreignState = await db.query(
    "SELECT completed FROM public.todos WHERE id=$1",
    [foreignId],
  );
  assert.deepEqual(foreignState.rows, [{ completed: false }]);
  const anonymous = await (
    await browser.newContext()
  ).request.post(`${app}/todos`, {
    headers: { Origin: app },
    form: { action: "delete", id: foreignId },
  });
  assert.equal(anonymous.status(), 401);
  await db.query(
    "INSERT INTO public.todos(user_id,text,created_at) SELECT $1, 'Todo ' || lpad(n::text,3,'0'), '2020-01-01'::timestamptz + n * interval '1 second' FROM generate_series(1,205) n",
    [a.id],
  );
  await page.goto(`${app}/`);
  assert.equal(await page.locator(".todos li").count(), 100);
  assert.equal(
    await page.locator(".todos li").first().locator("span").innerText(),
    "Todo 001",
  );
  assert.equal(
    await page.locator(".todos li").last().locator("span").innerText(),
    "Todo 100",
  );
  await page.getByRole("link", { name: "Nächste Seite" }).click();
  await page.getByText("Todo 101", { exact: true }).waitFor();
  assert.equal(
    await page.locator(".todos li").first().locator("span").innerText(),
    "Todo 101",
  );
  await page.getByRole("link", { name: "Nächste Seite" }).click();
  await page.getByText("Todo 201", { exact: true }).waitFor();
  assert.equal(await page.locator(".todos li").count(), 5);
  assert.equal(
    await page.locator(".todos li").last().locator("span").innerText(),
    "Todo 205",
  );
  assert.equal(
    await page.getByRole("link", { name: "Nächste Seite" }).count(),
    0,
  );
  await page.getByRole("link", { name: "Vorherige Seite" }).click();
  await page.getByText("Todo 101", { exact: true }).waitFor();
  assert.equal(
    await page.locator(".todos li").first().locator("span").innerText(),
    "Todo 101",
  );
  assert.ok(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
    "no mobile horizontal overflow",
  );
  console.log(
    "Todo integration: mobile create, validation, status, confirmation, paging and ownership passed",
  );
} finally {
  await browser.close();
  await db.end();
}
