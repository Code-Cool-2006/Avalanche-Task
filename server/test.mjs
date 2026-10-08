// Smoke test: node server/test.mjs  (spawns server against DATABASE_URL, reads OTPs from stdout, cleans up its test user)
import { spawn } from "node:child_process";
import assert from "node:assert/strict";
import pg from "pg";
process.loadEnvFile(".env");

const PORT = 4555, B = `http://localhost:${PORT}/api/auth`;
const srv = spawn("node", ["server/index.js"], { env: { ...process.env, PORT, SMTP_HOST: "" } });
let out = "";
srv.stdout.on("data", (d) => (out += d));
srv.stderr.on("data", (d) => /warn/i.test(d) || process.stderr.write(d));
await new Promise((r) => setTimeout(r, 5000));
const otp = () => [...out.matchAll(/: (\d{6})/g)].at(-1)[1];

let cookies = {};
const post = async (p, body, hdr = { "X-Requested-With": "fetch" }) => {
  const r = await fetch(`${B}/${p}`, {
    method: body === undefined ? "GET" : "POST",
    headers: { "Content-Type": "application/json", Cookie: Object.entries(cookies).map(([k, v]) => `${k}=${v}`).join("; "), ...hdr },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  for (const c of r.headers.getSetCookie()) { const [kv] = c.split(";"); const [k, v] = kv.split("="); v ? (cookies[k] = v) : delete cookies[k]; }
  return { s: r.status, d: await r.json() };
};
const u = { name: "Test User", email: `t${Date.now()}@example.com`, phone: "", password: "Sup3rSecret99" };

try {
  assert.equal((await post("register", u, {})).s, 403, "CSRF header required");
  assert.equal((await post("register", { ...u, password: "short" })).s, 400, "weak pw rejected");
  assert.equal((await post("register", u)).s, 200);
  assert.equal((await post("login", u)).s, 403, "unverified cannot login");
  assert.equal((await post("verify-otp", { email: u.email, code: "000000" })).s, 400, "wrong otp");
  const v = await post("verify-otp", { email: u.email, code: otp() });
  assert.equal(v.s, 200); assert.ok(cookies.at && cookies.rt, "cookies set");
  assert.equal((await post("me")).s, 200);
  const old = cookies.rt;
  assert.equal((await post("refresh", {})).s, 200); assert.notEqual(cookies.rt, old, "refresh rotates");
  const fresh = cookies.rt; cookies.rt = old;
  assert.equal((await post("refresh", {})).s, 401, "reused refresh rejected");
  cookies.rt = fresh;
  assert.equal((await post("refresh", {})).s, 401, "reuse revoked whole family");
  cookies = {};
  assert.equal((await post("me")).s, 401);
  assert.equal((await post("login", { ...u, password: "wrongpass123" })).s, 401);
  for (let i = 0; i < 5; i++) await post("login", { ...u, password: "wrongpass123" });
  const locked = await post("login", u);
  assert.ok([401, 429].includes(locked.s), "locked after repeated failures");
  console.log("ALL OK");
} catch (e) { console.error("FAIL", e.message); process.exitCode = 1; } finally {
  srv.kill();
  const db = new pg.Client({ connectionString: process.env.DATABASE_URL }); await db.connect(); // remove test data
  await db.query("DELETE FROM users WHERE email=$1", [u.email]);
  await db.query("DELETE FROM audit WHERE email=$1", [u.email]);
  await db.query("DELETE FROM otps WHERE email=$1", [u.email]);
  await db.end();
}
