import { spawn } from "node:child_process";
import pg from "pg";

process.loadEnvFile(".env");
const PORT = 4556;
const BASE = `http://localhost:${PORT}`;

const srv = spawn("node", ["backend/index.js"], {
  env: { ...process.env, PORT: String(PORT), SMTP_HOST: "" },
});

let out = "";
srv.stdout.on("data", (d) => (out += d));
srv.stderr.on("data", (d) => (out += d));

for (let i = 0; i < 30; i++) {
  if (out.includes("Auth API on")) break;
  await new Promise((r) => setTimeout(r, 500));
}

let cookies = {};
async function req(method, path, body, headers = {}) {
  const cookieHdr = Object.entries(cookies)
    .map(([k, v]) => `${k}=${v}`)
    .join("; ");
  const opts = {
    method,
    headers: {
      "Content-Type": "application/json",
      "X-Requested-With": "fetch",
      ...(cookieHdr ? { Cookie: cookieHdr } : {}),
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  };
  try {
    const res = await fetch(`${BASE}${path}`, opts);
    if (res.headers.getSetCookie) {
      for (const c of res.headers.getSetCookie()) {
        const [kv] = c.split(";");
        const [k, v] = kv.split("=");
        if (v) cookies[k] = v;
        else delete cookies[k];
      }
    }
    let data;
    const ct = res.headers.get("content-type") || "";
    if (ct.includes("json")) {
      data = await res.json();
    } else {
      data = await res.text();
    }
    return { status: res.status, data, ok: res.ok };
  } catch (err) {
    return { status: 0, error: err.message, ok: false };
  }
}

const results = [];
function report(endpoint, method, status, ok, detail = "") {
  results.push({ endpoint, method, status, ok, detail });
  console.log(`[${ok ? "PASS" : "FAIL"}] ${method.padEnd(6)} ${endpoint.padEnd(35)} -> Status ${status} ${detail}`);
}

const testEmail = `test_${Date.now()}@example.com`;
let createdMovieId, createdTheatreId, createdScreenId, createdSeatId;

try {
  // 1. Health check
  const h = await req("GET", "/");
  report("/", "GET", h.status, h.status === 200);

  // 2. Auth Endpoints
  const reg = await req("POST", "/api/auth/register", {
    name: "Tester",
    email: testEmail,
    password: "Password@1234",
  });
  report("/api/auth/register", "POST", reg.status, reg.status === 200);

  const otpMatch = [...out.matchAll(/: (\d{6})/g)].at(-1);
  const otpCode = otpMatch ? otpMatch[1] : null;

  if (otpCode) {
    const ver = await req("POST", "/api/auth/verify-otp", {
      email: testEmail,
      code: otpCode,
    });
    report("/api/auth/verify-otp", "POST", ver.status, ver.status === 200);
  } else {
    report("/api/auth/verify-otp", "POST", 0, false, "OTP not captured from stdout");
  }

  const me = await req("GET", "/api/auth/me");
  report("/api/auth/me", "GET", me.status, me.status === 200);

  const ref = await req("POST", "/api/auth/refresh", {});
  report("/api/auth/refresh", "POST", ref.status, ref.status === 200);

  const lgt = await req("POST", "/api/auth/logout", {});
  report("/api/auth/logout", "POST", lgt.status, lgt.status === 200);

  const log = await req("POST", "/api/auth/login", {
    email: testEmail,
    password: "Password@1234",
  });
  report("/api/auth/login", "POST", log.status, log.status === 200);

  const resend = await req("POST", "/api/auth/resend-otp", { email: testEmail });
  report("/api/auth/resend-otp", "POST", resend.status, resend.status === 200);

  const forgot = await req("POST", "/api/auth/forgot", { email: testEmail });
  report("/api/auth/forgot", "POST", forgot.status, forgot.status === 200);

  // 3. Movies
  const allMovies = await req("GET", "/api/movies");
  report("/api/movies", "GET", allMovies.status, allMovies.status === 200, `(${Array.isArray(allMovies.data) ? allMovies.data.length : 0} items)`);

  const createMov = await req("POST", "/api/movies/create", {
    title: "Test Movie " + Date.now(),
    description: "Automated test movie",
    genre: "Action",
    language: "English",
    duration_min: 120,
    rating: 5,
    release_date: "2026-10-10",
  });
  createdMovieId = createMov.data?.movie?.id || createMov.data?.id;
  report("/api/movies/create", "POST", createMov.status, [200, 201].includes(createMov.status), `ID: ${createdMovieId}`);

  if (createdMovieId) {
    const getMov = await req("GET", `/api/movies/${createdMovieId}`);
    report(`/api/movies/:id`, "GET", getMov.status, getMov.status === 200);

    const updMov = await req("PUT", `/api/movies/update/${createdMovieId}`, {
      title: "Updated Test Movie",
    });
    report(`/api/movies/update/:id`, "PUT", updMov.status, getMov.status === 200);

    const delMov = await req("DELETE", `/api/movies/delete/${createdMovieId}`);
    report(`/api/movies/delete/:id`, "DELETE", delMov.status, delMov.status === 200);
  }

  // 4. Theatres
  const allTheatres = await req("GET", "/api/theatres");
  report("/api/theatres", "GET", allTheatres.status, allTheatres.status === 200, `(${Array.isArray(allTheatres.data) ? allTheatres.data.length : 0} items)`);

  const createTh = await req("POST", "/api/theatres/create", {
    name: "Test Theatre " + Date.now(),
    city: "Bengaluru",
    address: "MG Road",
  });
  createdTheatreId = createTh.data?.theatre?.id || createTh.data?.id;
  report("/api/theatres/create", "POST", createTh.status, [200, 201].includes(createTh.status), `ID: ${createdTheatreId}`);

  if (createdTheatreId) {
    const getTh = await req("GET", `/api/theatres/${createdTheatreId}`);
    report(`/api/theatres/:id`, "GET", getTh.status, getTh.status === 200);

    const updTh = await req("PUT", `/api/theatres/update/${createdTheatreId}`, {
      name: "Updated Theatre Name",
    });
    report(`/api/theatres/update/:id`, "PUT", updTh.status, updTh.status === 200);
  }

  // 5. Screens
  const allScreens = await req("GET", "/api/screens");
  report("/api/screens", "GET", allScreens.status, allScreens.status === 200, `(${Array.isArray(allScreens.data) ? allScreens.data.length : 0} items)`);

  if (createdTheatreId) {
    const createSc = await req("POST", "/api/screens/create", {
      theatre_id: createdTheatreId,
      name: "Screen 99",
    });
    createdScreenId = createSc.data?.screen?.id || createSc.data?.id;
    report("/api/screens/create", "POST", createSc.status, [200, 201].includes(createSc.status), `ID: ${createdScreenId}`);
  }

  if (createdScreenId) {
    const getSc = await req("GET", `/api/screens/${createdScreenId}`);
    report(`/api/screens/:id`, "GET", getSc.status, getSc.status === 200);

    const updSc = await req("PUT", `/api/screens/update/${createdScreenId}`, {
      name: "Screen 99 Updated",
    });
    report(`/api/screens/update/:id`, "PUT", updSc.status, updSc.status === 200);

    // 6. Seats for Screen
    const createSt = await req("POST", `/api/screens/${createdScreenId}/seats/create`, {
      row_label: "A",
      seat_number: 1,
      tier: "recliner",
    });
    createdSeatId = createSt.data?.id;
    report(`/api/screens/:screenId/seats/create`, "POST", createSt.status, [200, 201].includes(createSt.status), `ID: ${createdSeatId}`);

    const getSeats = await req("GET", `/api/screens/${createdScreenId}/seats`);
    report(`/api/screens/:screenId/seats`, "GET", getSeats.status, getSeats.status === 200);

    if (createdSeatId) {
      const updSt = await req("PUT", `/api/seats/update/${createdSeatId}`, {
        row_label: "A",
        seat_number: 1,
        tier: "premium",
      });
      report(`/api/seats/update/:id`, "PUT", updSt.status, updSt.status === 200);

      const delSt = await req("DELETE", `/api/seats/delete/${createdSeatId}`);
      report(`/api/seats/delete/:id`, "DELETE", delSt.status, delSt.status === 200);
    }

    const delSc = await req("DELETE", `/api/screens/delete/${createdScreenId}`);
    report(`/api/screens/delete/:id`, "DELETE", delSc.status, delSc.status === 200);
  }

  if (createdTheatreId) {
    const delTh = await req("DELETE", `/api/theatres/delete/${createdTheatreId}`);
    report(`/api/theatres/delete/:id`, "DELETE", delTh.status, delTh.status === 200);
  }

} catch (err) {
  console.error("Test error:", err);
} finally {
  srv.kill();
  const db = new pg.Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });
  await db.connect();
  await db.query("DELETE FROM users WHERE email=$1", [testEmail]);
  await db.query("DELETE FROM audit WHERE email=$1", [testEmail]);
  await db.query("DELETE FROM otps WHERE email=$1", [testEmail]);
  if (createdMovieId) await db.query("DELETE FROM movies WHERE id=$1", [createdMovieId]);
  if (createdSeatId) await db.query("DELETE FROM seats WHERE id=$1", [createdSeatId]);
  if (createdScreenId) await db.query("DELETE FROM screens WHERE id=$1", [createdScreenId]);
  if (createdTheatreId) await db.query("DELETE FROM theatres WHERE id=$1", [createdTheatreId]);
  await db.end();
}
