import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";

const env = { ...process.env };
for (const key of [
  "POSTGRES_PASSWORD",
  "AUTH_DB_PASSWORD",
  "REST_DB_PASSWORD",
  "HEALTH_DB_PASSWORD",
  "JWT_SECRET",
  "ANON_KEY",
  "SERVICE_KEY",
  "META_CRYPTO_KEY",
  "SMTP_HOST",
  "SMTP_PORT",
  "SMTP_FROM",
  "SMTP_USER",
  "SMTP_PASSWORD",
  "APP_IMAGE",
  "SITE_URL",
])
  env[key] = "test-placeholder";
Object.assign(env, {
  GATEWAY_PORT: "31001",
  STUDIO_PORT: "31002",
  MAILPIT_PORT: "31003",
});
for (const kind of ["test", "live"]) {
  const config = JSON.parse(
    execFileSync(
      "docker",
      [
        "compose",
        "-f",
        "ops/compose.yml",
        "-f",
        `ops/compose.${kind}.yml`,
        "config",
        "--format",
        "json",
      ],
      { env, encoding: "utf8" },
    ),
  );
  const expected =
    kind === "test" ? ["gateway", "mailpit", "studio"] : ["gateway", "studio"];
  const published = Object.entries(config.services)
    .filter(([, service]) => service.ports?.length)
    .map(([name]) => name)
    .sort();
  assert.deepEqual(published, expected);
  for (const name of expected) {
    assert.equal(config.services[name].ports.length, 1, name);
    assert.equal(config.services[name].ports[0].host_ip, "127.0.0.1", name);
  }
}
console.log("Compose test/live ports restricted to expected loopback services");
