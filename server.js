// Nightshift's app: receives reports from the agent tasks and streams them to
// the page. It keeps the newest run only, in memory; every report carries the
// agent's full counters, so a restart refills within a few seconds.
import { createServer } from "node:http";
import { readFileSync } from "node:fs";

const port = Number(process.env.PORT ?? 3000);
const key = process.env.AGENT_KEY ?? "";
const files = {
  "/": ["index.html", "text/html; charset=utf-8"],
  "/missions.js": ["missions.js", "text/javascript"],
};
const cache = Object.fromEntries(Object.entries(files).map(([p, [f, t]]) => [p, [readFileSync(new URL(`./${f}`, import.meta.url)), t]]));

const AGENTS = 64, KEEP = 60;
let run = { job: "", started: 0, agents: new Map() };
const watchers = new Set();

function send(res, status, body, type = "text/plain") {
  res.writeHead(status, { "content-type": type, "cache-control": "no-store" });
  res.end(body);
}

function broadcast(event) {
  const line = `data: ${JSON.stringify(event)}\n\n`;
  for (const w of watchers) w.write(line);
}

createServer(async (req, res) => {
  const url = new URL(req.url, "http://x");
  const report = url.pathname.match(/^\/agents\/([\w-]+)\/(\d+)$/);

  if (req.method === "GET" && cache[url.pathname]) return send(res, 200, ...cache[url.pathname]);
  if (req.method === "GET" && url.pathname === "/healthz") return send(res, 200, "ok");

  if (req.method === "GET" && url.pathname === "/state") {
    return send(res, 200, JSON.stringify({
      job: run.job, now: Date.now(),
      agents: [...run.agents].map(([index, a]) => ({ index, stats: a.stats, events: a.events, at: a.at })),
    }), "application/json");
  }

  if (req.method === "GET" && url.pathname === "/events") {
    res.writeHead(200, { "content-type": "text/event-stream", "cache-control": "no-store", connection: "keep-alive" });
    res.write(": hello\n\n");
    watchers.add(res);
    req.on("close", () => watchers.delete(res));
    return;
  }

  if (req.method === "POST" && report) {
    if (!key || req.headers["x-agent-key"] !== key) return send(res, 403, "bad agent key");
    const index = Number(report[2]);
    if (index >= AGENTS) return send(res, 400, "index out of range");
    let size = 0;
    const chunks = [];
    for await (const c of req) {
      size += c.length;
      if (size > 256 << 10) return send(res, 413, "report too large");
      chunks.push(c);
    }
    let body;
    try { body = JSON.parse(Buffer.concat(chunks)); } catch { return send(res, 400, "bad json"); }
    const stats = body.stats ?? {};
    const events = Array.isArray(body.events) ? body.events.slice(-KEEP) : [];
    if (run.job !== report[1]) {
      // An older run's straggler never replaces a newer run.
      if (run.job && Number(stats.started) < run.started) return send(res, 409, "a newer run is going");
      run = { job: report[1], started: Number(stats.started) || Date.now(), agents: new Map() };
      broadcast({ type: "run", job: run.job });
    }
    const prev = run.agents.get(index);
    const kept = [...(prev?.events ?? []), ...events].slice(-KEEP);
    const at = Date.now();
    run.agents.set(index, { stats, events: kept, at });
    broadcast({ type: "agent", job: run.job, index, stats, events, at });
    return send(res, 201, "ok");
  }

  send(res, 404, "not found");
}).listen(port, "0.0.0.0", () => console.log(`nightshift listening on :${port}`));
