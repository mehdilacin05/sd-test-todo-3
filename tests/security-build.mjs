import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import {
  cpSync,
  mkdtempSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  realpathSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";

import { join, relative } from "node:path";
import { spawnSync } from "node:child_process";

const root = process.cwd();
const temp = mkdtempSync(join(root, ".security-build-"));
const project = join(temp, "project");
const nonce = () => randomBytes(32).toString("hex");
const secrets = [
  nonce(),
  nonce(),
  `postgres://test:${nonce()}@localhost:5432/test`,
];
const markers = ["sb_secret_", "sk_live", "BEGIN PRIVATE"];

function contains(directory, needles, visited = new Set()) {
  const real = realpathSync(directory);
  if (!real.startsWith(project + "/"))
    throw new Error("Build link outside isolated project");
  if (visited.has(real)) return false;
  visited.add(real);
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      if (contains(path, needles, visited)) return true;
    } else if (entry.isFile()) {
      const data = readFileSync(path);
      if (needles.some((needle) => data.includes(Buffer.from(needle))))
        return true;
    } else if (entry.isSymbolicLink()) {
      const target = realpathSync(path);
      if (!target.startsWith(project + "/"))
        throw new Error("Build link outside isolated project");
      if (statSync(path).isDirectory()) {
        if (contains(path, needles, visited)) return true;
      } else if (
        needles.some((needle) =>
          readFileSync(path).includes(Buffer.from(needle)),
        )
      )
        return true;
    }
  }
  return false;
}

try {
  mkdirSync(project);
  for (const entry of readdirSync(root)) {
    if (entry.startsWith(".security-build-")) continue;
    cpSync(join(root, entry), join(project, entry), {
      recursive: true,
      filter: (source) => {
        const top = relative(root, source).split("/")[0];
        return (
          !top.startsWith(".security-build-") &&
          ![".git", ".next", ".ae", ".docker-config", ".npm-cache"].includes(
            top,
          ) &&
          !top.startsWith(".env")
        );
      },
    });
  }
  const result = spawnSync(
    process.execPath,
    ["node_modules/next/dist/bin/next", "build"],
    {
      cwd: project,
      env: {
        PATH: process.env.PATH,
        HOME: temp,
        TMPDIR: temp,
        NODE_ENV: "production",
        NEXT_TELEMETRY_DISABLED: "1",
        NEXT_PUBLIC_SUPABASE_URL: "http://localhost:54321",
        NEXT_PUBLIC_SUPABASE_ANON_KEY: "synthetic-public-key",
        NEXT_PUBLIC_SITE_URL: "http://localhost:3000",
        SUPABASE_SERVICE_ROLE_KEY: secrets[0],
        SECRET_KEY: secrets[1],
        DATABASE_URL: secrets[2],
      },
      stdio: "ignore",
    },
  );
  if (result.error || result.status !== 0)
    throw new Error("Isolated production build failed");
  const build = join(project, ".next");
  const staticDir = join(build, "static");
  const check = () => {
    assert.equal(
      contains(staticDir, markers),
      false,
      "Forbidden marker in static build",
    );
    assert.equal(contains(build, secrets), false, "Synthetic secret in build");
  };
  check();

  // Exercise each detector against a real file in the build tree, never logging values.
  const probe = join(staticDir, "security-negative-control.tmp");
  for (const marker of markers) {
    writeFileSync(probe, marker);
    assert.throws(
      check,
      /Forbidden marker in static build/,
      "Marker negative control failed",
    );
  }
  for (const secret of secrets) {
    writeFileSync(probe, secret);
    assert.throws(
      check,
      /Synthetic secret in build/,
      "Secret negative control failed",
    );
  }
  rmSync(probe);
  console.log("Production build secret scan and negative controls passed.");
} finally {
  rmSync(temp, { recursive: true, force: true });
}
