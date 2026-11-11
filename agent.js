// One job task: an agent that works its mission for the whole time budget.
//
//   node agent.js [minutes]
//
// Task $MOJAVE_TASK_INDEX picks the agent and its mission (missions.js). The
// agent's steps are generated, not model calls: this is a stand-in for real
// agent work, so the demo costs nothing but the machines it runs on. Every
// second it sends its new steps and counters to the app ($NIGHTSHIFT_URL).
import { assignment, rng, GENERAL } from "./missions.js";

const minutes = Number(process.argv[2] ?? process.env.AGENT_MINUTES ?? 120);
const index = Number(process.env.MOJAVE_TASK_INDEX ?? 0);
const job = process.env.MOJAVE_JOB_ID ?? "local";
const appURL = process.env.NIGHTSHIFT_URL;
const key = process.env.AGENT_KEY ?? "";
const a = assignment(index);
const m = a.mission;
const r = rng(Date.now() ^ (index * 104729));

const started = Date.now();
const deadline = started + minutes * 60_000;
const pick = (xs) => xs[Math.floor(r() * xs.length)];
// Draw from a bank without repeating until it runs out, so a trace never says
// the same thing twice in a row.
const bags = new Map();
function draw(xs) {
  let bag = bags.get(xs);
  if (!bag || !bag.length) {
    const last = bag?.last;
    bag = [...xs].sort(() => r() - 0.5);
    if (bag[0] === last && bag.length > 1) bag.push(bag.shift());
    bags.set(xs, bag);
  }
  const x = bag.shift();
  bag.last = x;
  return x;
}
const int = (lo, hi) => Math.floor(lo + r() * (hi - lo + 1));

let tokens = 0, toolCalls = 0, findings = 0, items = 0, step = 0;
let outbox = [];

function fill(text) {
  return text
    .replaceAll("{n}", String(Math.max(1, items)))
    .replaceAll("{k}", String(int(100, 99999)))
    .replaceAll("{s}", String(int(3, 48)))
    .replaceAll("{c}", a.company);
}

function emit(kind, text, extra = {}) {
  step++;
  const tin = kind === "tool" ? int(300, 2400) : int(1200, 9000);
  const tout = int(40, 700);
  tokens += tin + tout;
  if (kind === "tool") toolCalls++;
  if (kind === "find") findings++;
  outbox.push({ step, at: Date.now(), kind, text: fill(text), tokens: tin + tout, ...extra });
}

// Progress tracks the clock with a little wobble, so agents finish their
// mission as their time runs out and don't all move in lockstep.
function advance() {
  const f = Math.min(1, (Date.now() - started) / (deadline - started));
  const wobble = 1 + 0.06 * Math.sin(f * 9 + index);
  items = Math.min(a.total, Math.floor(a.total * Math.min(1, f * wobble)));
}

async function flush(done = false) {
  const events = outbox;
  outbox = [];
  const body = JSON.stringify({
    events,
    stats: {
      name: a.name, kind: a.kind, title: a.title, unit: a.unit, total: a.total,
      items, tokens, toolCalls, findings, step, started, deadline, done,
    },
  });
  if (!appURL) {
    for (const e of events) console.log(`[${a.name}] ${e.kind.padEnd(5)} ${e.text}`);
    return;
  }
  try {
    const res = await fetch(`${appURL}/agents/${job}/${index}`, {
      method: "POST", headers: { "content-type": "application/json", "x-agent-key": key }, body,
    });
    if (!res.ok) console.error(`report: ${res.status} ${await res.text()}`);
  } catch (err) {
    console.error(`report: ${err.message}`);
  }
}

const sleep = (ms) => new Promise((res) => setTimeout(res, ms));

emit("plan", `Mission: ${a.title}`);
emit("plan", `Plan: index the ${a.unit}, work through them in batches, verify, then write the report`);
emit("tool", "list_inputs(source='s3://intake/" + a.company.toLowerCase().replace(/ /g, "-") + "')");
let lastFlush = Date.now();

while (Date.now() < deadline - 20_000) {
  await sleep(int(450, 2200));
  advance();
  const x = r();
  // Findings are rare: each agent reports one every few minutes.
  const own = r() < 0.65; // most lines are about the mission, some are general agent work
  if (x < 0.55) emit("tool", draw(own ? m.tools : GENERAL.tools));
  else if (x < 0.99) emit("think", draw(own ? m.think : GENERAL.think));
  else emit("find", draw(m.finds));
  if (r() < 0.04) emit("check", `Checkpoint: ${items.toLocaleString("en-US")} of ${a.total.toLocaleString("en-US")} ${a.unit} done`);
  if (Date.now() - lastFlush >= 1000) { await flush(); lastFlush = Date.now(); }
}

// The last 20 seconds: verify and write the report.
emit("think", "All items processed; verifying a sample before the report");
emit("tool", "verify_sample(n=200)");
await sleep(8000);
items = a.total;
emit("tool", `write_report('reports/${a.name.toLowerCase()}.md')`);
emit("done", `Done: ${a.total.toLocaleString("en-US")} ${a.unit}, ${findings} findings, ${toolCalls.toLocaleString("en-US")} tool calls`);
await flush(true);
console.log(`${a.name}: ${a.kind} done in ${((Date.now() - started) / 60000).toFixed(1)} min, ${tokens.toLocaleString("en-US")} tokens`);
