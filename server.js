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
const STYLE = `@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap');
:root {
  --primary: #0f4c5c;
  --primary-hover: #118ab2;
  --primary-light: #e0f2fe;
  --primary-text: #0f4c5c;
  --bg: #f8fafc;
  --card-bg: #ffffff;
  --text: #0f172a;
  --text-muted: #64748b;
  --border: #e2e8f0;
  --success: #065f46;
  --success-light: #dcfce7;
  --success-text: #166534;
  --warning-light: #fef3c7;
  --warning-text: #92400e;
}
body {
  font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
  margin: 0;
  background: var(--bg);
  color: var(--text);
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}
header {
  background: linear-gradient(135deg, #0f4c5c 0%, #03071e 100%);
  color: #fff;
  padding: 14px 20px;
  display: flex;
  gap: 18px;
  align-items: center;
  box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1);
}
header strong {
  font-size: 1.25rem;
  font-weight: 800;
  letter-spacing: -0.025em;
  background: linear-gradient(to right, #90e0ef, #00b4d8);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}
header a {
  color: #90e0ef;
  text-decoration: none;
  font-weight: 500;
  font-size: 0.925rem;
  padding: 0.375rem 0.75rem;
  border-radius: 0.375rem;
  transition: all 0.2s;
}
header a:hover {
  color: #fff;
  background: rgba(255,255,255,0.1);
}
header a.on {
  color: #fff;
  background: rgba(255,255,255,0.15);
  font-weight: 600;
}
main {
  max-width: 900px;
  width: 100%;
  margin: 22px auto;
  padding: 0 16px;
  box-sizing: border-box;
  flex-grow: 1;
}
h1 {
  font-size: 1.875rem;
  font-weight: 800;
  letter-spacing: -0.025em;
  margin-top: 0;
  margin-bottom: 1.5rem;
  color: #0f4c5c;
}
.card {
  background: var(--card-bg);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 24px;
  margin-bottom: 18px;
  box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05),0 2px 4px -2px rgba(0,0,0,0.05);
}
table {
  border-collapse: collapse;
  width: 100%;
}
th, td {
  text-align: left;
  padding: 12px 14px;
  border-bottom: 1px solid var(--border);
}
th {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--text-muted);
}
td {
  font-size: 14px;
}
tr:last-child td {
  border-bottom: none;
}
label {
  display: block;
  margin: 12px 0 6px;
  font-size: 13px;
  font-weight: 600;
  color: var(--text);
}
input, select {
  padding: 10px 14px;
  border: 1px solid var(--border);
  border-radius: 8px;
  min-width: 230px;
  font-size: 14px;
  transition: all 0.2s;
  background-color: #f1f5f9;
  width: 100%;
  max-width: 400px;
  box-sizing: border-box;
}
input:focus, select:focus {
  outline: none;
  border-color: #0f4c5c;
  box-shadow: 0 0 0 3px #90e0ef;
  background-color: #fff;
}
button, .btn {
  background: #0f4c5c;
  color: #fff;
  border: 0;
  border-radius: 8px;
  padding: 10px 18px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  text-decoration: none;
  display: inline-block;
  transition: all 0.2s;
  text-align: center;
  box-shadow: 0 1px 2px 0 rgba(0,0,0,0.05);
}
button:hover, .btn:hover {
  background: #118ab2;
  transform: translateY(-1px);
}
button:active, .btn:active {
  transform: translateY(0);
}
.pill {
  display: inline-block;
  padding: 4px 12px;
  border-radius: 9999px;
  font-size: 11px;
  font-weight: 600;
  background: #f1f5f9;
  color: #475569;
  text-decoration: none;
  transition: all 0.2s;
}
.pill.hired {
  background: var(--success-light);
  color: var(--success-text);
}
.pill.offer {
  background: var(--warning-light);
  color: var(--warning-text);
}
.muted {
  color: var(--text-muted);
  font-size: 13px;
}
.err {
  background: #fee2e2;
  border: 1px solid #fca5a5;
  color: #991b1b;
  padding: 10px 14px;
  border-radius: 8px;
  margin-bottom: 12px;
}
footer {
  margin-top: auto;
  text-align: center;
  padding: 24px;
  border-top: 1px solid var(--border);
  font-size: 12px;
  color: var(--text-muted);
  background: #fff;
}`;
const layout = (a, t, b) => `<!doctype html><html><head><meta charset="utf-8"><title>${esc(t)} · Harbor Hire</title><meta name="viewport" content="width=device-width,initial-scale=1"><script src="https://cdn.jsdelivr.net/npm/alpinejs@3.x.x/dist/cdn.min.js" defer></script><style>${STYLE}</style></head><body><header><strong>Harbor Hire</strong>${[["/", "Dashboard"], ["/applications", "Applications"], ["/applications?stage=offer", "Offers"], ["/applications/new", "New application"]].map(([h, l]) => `<a href="${h}" class="${a === h ? "on" : ""}">${l}</a>`).join("")}<span style="margin-left:auto"><a href="/logout">Sign out</a></span></header><main><h1>${esc(t)}</h1>${b}</main><footer>&copy; 2026 Harbor Hire. Powered by Alpine.js & custom style bindings.</footer></body></html>`;
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
