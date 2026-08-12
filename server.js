// HARBOR HIRE — an applicant tracker with a STAGE PIPELINE (cross-step continuity).
//   PIPELINE      an application moves applied -> screen -> offer -> hired, one step
//                 at a time; skipping a stage is not offered. The action shown
//                 depends on the current stage.
//   CONTINUITY    the candidate + job an application was created with must survive
//                 every stage move — dropping them mid-pipeline is a silent bug.
//   FILTER        "By stage" returns a SUBSET; a leak is unsound.
// Faults (healthy when DEMO_BUGS empty):
//   skipstage     "Advance" jumps two stages instead of one
//   ghostmove     the advance renders success but the stage never changes
//   dropcandidate advancing past screen forgets which candidate it was
import express from "express";
import cookieParser from "cookie-parser";
import { DatabaseSync } from "node:sqlite";
const app = express();
app.use(express.urlencoded({ extended: true })); app.use(express.json()); app.use(cookieParser());
const BUGS = new Set(String(process.env.DEMO_BUGS || "").split(",").map(s => s.trim()).filter(Boolean));
const RESET_TOKEN = process.env.DEMO_RESET_TOKEN || "ats-reset";
const SESSION = "ats_session_v1";
const USERS = { "recruiter@harborhire.test": { password: "hire12345", name: "Recruiter" } };
const b64 = s => Buffer.from(String(s)).toString("base64url");
const unb64 = s => { try { return Buffer.from(String(s || ""), "base64url").toString(); } catch { return ""; } };
const currentUser = req => USERS[unb64(req.cookies?.[SESSION])] ? { email: unb64(req.cookies[SESSION]) } : null;
const STAGES = ["applied", "screen", "offer", "hired"];
const nextStage = s => STAGES[Math.min(STAGES.length - 1, STAGES.indexOf(s) + (BUGS.has("skipstage") ? 2 : 1))];
let seq = 400; const id = () => String(++seq);
const seed = () => ({
  jobs: [{ id: "401", title: "Warehouse Lead" }, { id: "402", title: "Cold-Chain Technician" }],
  apps: [
    { id: "410", jobId: "401", job: "Warehouse Lead", candidate: "Dana Ops", stage: "screen" },
    { id: "411", jobId: "401", job: "Warehouse Lead", candidate: "Sam Clerk", stage: "applied" },
    { id: "412", jobId: "402", job: "Cold-Chain Technician", candidate: "Lee Cold", stage: "offer" },
  ],
});
let { jobs, apps } = seed();
const DB_PATH = process.env.DEMO_DB || "/data/app.db";
let db = null; try { db = new DatabaseSync(DB_PATH); db.exec(`CREATE TABLE IF NOT EXISTS kv (k TEXT PRIMARY KEY, v TEXT)`); } catch { db = null; }
const persist = () => { if (db) try { db.prepare(`INSERT INTO kv(k,v) VALUES('s',?) ON CONFLICT(k) DO UPDATE SET v=excluded.v`).run(JSON.stringify({ seq, jobs, apps })); } catch {} };
(() => { if (db) try { const r = db.prepare(`SELECT v FROM kv WHERE k='s'`).get(); if (r?.v) { const s = JSON.parse(r.v); seq = s.seq; jobs = s.jobs; apps = s.apps; } } catch {} })();
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const STYLE = `body{font:15px/1.5 system-ui,sans-serif;margin:0;background:#f6f7f9;color:#1b2430}header{background:#0f3d56;color:#fff;padding:12px 20px;display:flex;gap:18px;align-items:center}header a{color:#c8e2ef;text-decoration:none;font-weight:500}header a.on{color:#fff;text-decoration:underline}main{max-width:900px;margin:22px auto;padding:0 16px}.card{background:#fff;border:1px solid #dde5ea;border-radius:8px;padding:18px;margin-bottom:18px}table{border-collapse:collapse;width:100%}th,td{text-align:left;padding:8px 10px;border-bottom:1px solid #eaeff2}th{font-size:12px;text-transform:uppercase;color:#5b6b7c}label{display:block;margin:10px 0 4px;font-size:13px;color:#41505f}input,select{padding:8px 10px;border:1px solid #c9d2db;border-radius:6px;min-width:230px;font-size:14px}button,.btn{background:#0f3d56;color:#fff;border:0;border-radius:6px;padding:9px 16px;font-size:14px;cursor:pointer;text-decoration:none;display:inline-block}.pill{display:inline-block;padding:2px 9px;border-radius:12px;font-size:12px;background:#e6ecef}.pill.hired{background:#e4f6ea;color:#1c6b39}.pill.offer{background:#fff4e0;color:#8a5a12}.muted{color:#6b7a89;font-size:13px}.err{background:#fdecea;border:1px solid #f5b3ab;color:#8a1c10;padding:9px 12px;border-radius:6px;margin-bottom:12px}`;
const layout = (a, t, b) => `<!doctype html><html><head><meta charset="utf-8"><title>${esc(t)} · Harbor Hire</title><meta name="viewport" content="width=device-width,initial-scale=1"><style>${STYLE}</style></head><body><header><strong>Harbor Hire</strong>${[["/", "Dashboard"], ["/applications", "Applications"], ["/applications?stage=offer", "Offers"], ["/applications/new", "New application"]].map(([h, l]) => `<a href="${h}" class="${a === h ? "on" : ""}">${l}</a>`).join("")}<span style="margin-left:auto"><a href="/logout">Sign out</a></span></header><main><h1>${esc(t)}</h1>${b}</main></body></html>`;
app.get("/healthz", (_q, r) => r.type("text").send("ok"));
app.use((req, res, next) => { if (["/login", "/healthz", "/api/reset"].includes(req.path)) return next(); if (!currentUser(req)) return res.redirect("/login"); next(); });
app.get("/login", (_q, res) => res.send(`<!doctype html><html><head><meta charset="utf-8"><title>Sign in · Harbor Hire</title><style>${STYLE}</style></head><body><main><div class="card" style="max-width:380px;margin:60px auto"><h1>Sign in</h1><form method="post" action="/login"><label for="email">Email</label><input id="email" name="email" type="email" value="recruiter@harborhire.test"><label for="password">Password</label><input id="password" name="password" type="password" value="hire12345"><p><button>Sign in</button></p></form></div></main></body></html>`));
app.post("/login", (req, res) => { const u = USERS[String(req.body.email || "").toLowerCase()]; if (!u || u.password !== req.body.password) return res.status(401).send(`<p class="err">Wrong email or password.</p><a href="/login">Back</a>`); res.cookie(SESSION, b64(String(req.body.email).toLowerCase()), { httpOnly: true }); res.redirect("/"); });
app.get("/logout", (_q, res) => { res.clearCookie(SESSION); res.redirect("/login"); });
app.get("/", (_q, res) => res.send(layout("/", "Dashboard", `<div class="card"><table><tr><th>Open applications</th><td>${apps.filter(a => a.stage !== "hired").length}</td></tr><tr><th>Offers out</th><td>${apps.filter(a => a.stage === "offer").length}</td></tr><tr><th>Hired</th><td>${apps.filter(a => a.stage === "hired").length}</td></tr></table></div><div class="card"><a class="btn" href="/applications/new">New application</a></div>`)));
app.get("/applications", (req, res) => {
  const stage = String(req.query.stage || "");
  const rows = stage ? apps.filter(a => a.stage === stage) : apps;
  res.send(layout(stage === "offer" ? "/applications?stage=offer" : "/applications", stage ? `${stage} stage` : "Applications",
    `<div class="card">${["", ...STAGES].map(s => `<a class="pill" href="/applications${s ? "?stage=" + s : ""}">${s || "All"}</a>`).join(" ")}</div>
<div class="card"><table><tr><th>Candidate</th><th>Job</th><th>Stage</th></tr>${rows.map(a => `<tr><td><a href="/applications/${a.id}">${esc(a.candidate)}</a></td><td>${esc(a.job)}</td><td><span class="pill ${a.stage}">${a.stage}</span></td></tr>`).join("") || `<tr><td colspan="3" class="muted">None.</td></tr>`}</table></div>`));
});
app.get("/applications/new", (_q, res) => res.send(layout("/applications/new", "New application", `<div class="card"><form method="post" action="/applications/new"><label for="jobId">Job</label><select id="jobId" name="jobId">${jobs.map(j => `<option value="${j.id}">${esc(j.title)}</option>`).join("")}</select><label for="candidate">Candidate name</label><input id="candidate" name="candidate" value="New Candidate"><p><button>Create application</button></p></form></div>`)));
app.post("/applications/new", (req, res) => {
  const j = jobs.find(x => x.id === String(req.body.jobId)) || jobs[0];
  const cand = String(req.body.candidate || "").trim() || "Candidate";
  const aid = id(); apps.push({ id: aid, jobId: j.id, job: j.title, candidate: cand, stage: "applied" }); persist();
  res.redirect(`/applications/${aid}`);
});
app.get("/applications/:id", (req, res) => {
  const a = apps.find(x => x.id === req.params.id);
  if (!a) return res.status(404).send(layout("/applications", "Not found", `<div class="card">No such application.</div>`));
  const action = a.stage === "hired" ? `<span class="muted">Hired — pipeline complete.</span>` : `<form method="post" action="/applications/${a.id}/advance"><button>Advance to ${nextStage(a.stage)}</button></form>`;
  res.send(layout("/applications", `${a.candidate} — ${a.job}`, `<div class="card"><table><tr><th>Candidate</th><td>${esc(a.candidate)}</td></tr><tr><th>Job</th><td>${esc(a.job)}</td></tr><tr><th>Stage</th><td><span class="pill ${a.stage}">${a.stage}</span></td></tr></table></div><div class="card">${action}</div>`));
});
app.post("/applications/:id/advance", (req, res) => {
  const a = apps.find(x => x.id === req.params.id);
  if (!a) return res.status(404).send("no");
  // GHOSTMOVE: render success without changing the stage.
  if (!BUGS.has("ghostmove") && a.stage !== "hired") {
    a.stage = nextStage(a.stage);
    // DROPCANDIDATE: advancing past screen forgets the candidate identity.
    if (BUGS.has("dropcandidate") && a.stage === "offer") a.candidate = "(unknown)";
    persist();
  }
  res.redirect(`/applications/${a.id}`);
});
app.post("/api/reset", (req, res) => { if (req.get("X-Reset-Token") !== RESET_TOKEN) return res.status(403).json({ error: "bad token" }); seq = 400; ({ jobs, apps } = seed()); persist(); res.json({ ok: true, counts: { jobs: jobs.length, applications: apps.length } }); });
app.listen(Number(process.env.PORT || 3000), () => console.log(`harbor-hire on ${process.env.PORT || 3000}; bugs=${[...BUGS].join(",") || "none"}`));
