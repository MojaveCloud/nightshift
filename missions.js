// The agents' jobs. Every agent gets one mission, chosen by its task index,
// and works it for its whole time budget. All companies are fictional.
//
// Each mission names a unit of work and a total, plus banks of lines the agent
// draws from: what it thinks, which tools it calls, and what it finds.
// {n} is the item it's on, {c} the company, {k} a random number.

export const COMPANIES = [
  "Halcyon Freight", "Brightwater Health", "Corvid Insurance", "Lumen Grid", "Pinecrest Bank",
  "Tidewell Foods", "Northloop Logistics", "Saltmarsh Energy", "Quarry Labs", "Ironbark Retail",
  "Kestrel Air", "Meridian Legal", "Fernhollow Pharma", "Cobalt Mutual", "Oakline Telecom", "Driftwood Media",
];

export const MISSIONS = [
  {
    kind: "Contract review", unit: "contracts", total: [2400, 4200],
    title: "Review {t} supplier contracts at {c} for auto-renewal and liability caps",
    think: ["Clause 14.2 references an exhibit that isn't attached; checking the amendment folder", "Renewal notice period is 90 days, not 30; flagging against policy", "This MSA was superseded in 2024; skipping to the amended terms", "Liability cap is tied to fees paid in the prior 12 months; computing exposure"],
    tools: ["read_pdf(contract_{n}.pdf)", "extract_clauses(contract_{n}, ['renewal','liability','termination'])", "search_amendments(vendor_id={k})", "compare_to_playbook(contract_{n})"],
    finds: ["Auto-renews for 36 months unless canceled by Mar 1", "Uncapped indemnity in contract #{n}", "Termination for convenience missing", "Price escalator of 9% per year buried in Exhibit C"],
  },
  {
    kind: "Code migration", unit: "files", total: [900, 1800],
    title: "Migrate {c}'s billing service from Django 2.2 to Django 5.1",
    think: ["url() is gone; rewriting routes with path() and re_path()", "This middleware still uses MIDDLEWARE_CLASSES; porting it", "Test suite has 14 failures, all from the new timezone defaults", "on_delete is now required on ForeignKey; picking CASCADE vs PROTECT per model"],
    tools: ["read_file(billing/models/{n}.py)", "apply_patch(billing/views.py)", "run_tests('billing', shard={k})", "grep('render_to_response', path='templates')"],
    finds: ["Found a raw SQL query vulnerable to injection in invoices/export.py", "Removed 41 deprecated imports", "All 2,318 tests passing on Django 5.1", "Migration 0087 needed a data fix for NULL currencies"],
  },
  {
    kind: "Reconciliation", unit: "invoices", total: [30000, 52000],
    title: "Reconcile {t} Q3 invoices at {c} against bank and Stripe payouts",
    think: ["Payout po_{k} bundles 37 charges; splitting by invoice", "Currency mismatch: invoice in EUR, payout settled in USD at a different rate", "Two invoices share a PO number; matching on amount and date instead", "Refund issued after period close; booking it to October"],
    tools: ["stripe.payouts.list(after={k})", "query_ledger(\"SELECT * FROM invoices WHERE id = {n}\")", "match_transactions(batch={k})", "fetch_bank_statement(account='ops', day={k})"],
    finds: ["$18,240 paid twice to the same vendor", "Invoice #{n} paid but never recorded", "Unmatched payout of $4,112.07", "FX losses of $2,930 not booked"],
  },
  {
    kind: "Support triage", unit: "tickets", total: [6000, 11000],
    title: "Triage {t} open support tickets at {c} and draft replies",
    think: ["Customer is asking about the same outage as #{k}; linking them", "Tone is angry and the account is enterprise; escalating", "This is a feature request, not a bug; tagging for product", "Drafting a reply that includes the workaround from the runbook"],
    tools: ["get_ticket({n})", "search_kb('export to csv timeout')", "draft_reply(ticket={n}, tone='calm')", "tag(ticket={n}, ['billing','p2'])"],
    finds: ["312 tickets trace to one bug in the CSV export", "Enterprise customer at risk: 9 tickets in 3 days", "Top request: SSO for the starter plan", "47 tickets resolved by the same KB article"],
  },
  {
    kind: "Embeddings backfill", unit: "listings", total: [1600000, 2400000],
    title: "Backfill embeddings for {t} product listings at {c}",
    think: ["Batch {k} has 212 listings with empty descriptions; embedding titles only", "Rate limit hit; backing off 2 s and resuming from the cursor", "Deduplicating near-identical listings before embedding", "Writing vectors to the index in 4,096-row chunks"],
    tools: ["fetch_listings(cursor={k}, limit=4096)", "embed(batch={k}, dims=1024)", "upsert_vectors(index='catalog', n=4096)", "checkpoint(cursor={k})"],
    finds: ["18,400 duplicate listings collapsed", "Search recall up 23% on the eval set", "9,210 listings missing images", "Checkpoint saved; safe to resume anywhere"],
  },
  {
    kind: "Model evals", unit: "prompts", total: [40000, 64000],
    title: "Run {c}'s eval suite: {t} prompts across 4 candidate models",
    think: ["Model C refuses 3% more often on the medical subset; sampling failures", "Judge disagrees with the reference on prompt {n}; queuing for a human", "Latency p95 on long contexts is 11 s; noting it", "Scoring rubric v3 penalizes hedging; rescoring the finance set"],
    tools: ["generate(model='candidate-b', prompt={n})", "judge(prompt={n}, rubric='v3')", "score_batch(shard={k})", "write_results('evals/run_{k}.jsonl')"],
    finds: ["Candidate B wins 61% of head-to-heads", "Regression on SQL generation: −8 points", "Hallucinated citations in 2.1% of answers", "Candidate D is 40% cheaper at equal quality"],
  },
  {
    kind: "Call analysis", unit: "minutes of audio", total: [30000, 42000],
    title: "Transcribe and summarize {t} minutes of {c} sales calls",
    think: ["Two speakers overlap here; diarizing again with a smaller window", "Prospect mentions a competitor by name; tagging the deal", "Pricing objection at 23:40; extracting the exact wording", "This call is in Spanish; translating the summary"],
    tools: ["transcribe(call_{n}.wav)", "diarize(call_{n}, speakers=2)", "summarize(call_{n}, template='deal')", "update_crm(deal_id={k})"],
    finds: ["Pricing objection in 38% of lost deals", "Competitor named in 214 calls", "Deals with a demo in week 1 close 2× faster", "12 calls promised features that don't exist"],
  },
  {
    kind: "Due diligence", unit: "filings", total: [1100, 2600],
    title: "Due diligence on {c}: read {t} filings, contracts and board minutes",
    think: ["Revenue in the deck doesn't match the audited statements; reconciling", "Board minutes mention a pending lawsuit not in the data room", "Customer concentration: top 3 are 58% of revenue", "The cap table has a SAFE that isn't in the summary"],
    tools: ["read_pdf(filing_{n}.pdf)", "search_dataroom('litigation')", "extract_table(financials_{k}.xlsx, 'P&L')", "cross_check(revenue, source='audit_2025')"],
    finds: ["Undisclosed litigation in minutes from June", "ARR overstated by $1.2M in the deck", "Change-of-control clause in the largest customer contract", "Key-person risk: one engineer owns 70% of commits"],
  },
  {
    kind: "Test generation", unit: "functions", total: [900, 1500],
    title: "Write and verify unit tests for {t} untested functions in {c}'s API",
    think: ["This function has three branches; writing a case for each", "Mocking the payment client so the test doesn't hit the network", "Property test found a crash on empty input; filing it", "Coverage for the auth module went from 41% to 88%"],
    tools: ["read_file(api/handlers/{n}.ts)", "write_test(api/handlers/{n}.test.ts)", "run_tests(filter='handlers/{n}')", "coverage(report='lcov')"],
    finds: ["Off-by-one in pagination found by a generated test", "Null deref when the user has no org", "Coverage 34% → 81%", "3 functions are dead code; flagged for removal"],
  },
  {
    kind: "Log forensics", unit: "GB of logs", total: [800, 1400],
    title: "Find churn signals in 18 months of {c} product logs ({t} GB)",
    think: ["Sessions drop sharply after the March pricing change; segmenting by plan", "Users who never connect an integration churn 3× more", "This spike is a bot, not a cohort; filtering it out", "Building a weekly retention table per signup month"],
    tools: ["scan_logs(day={k}, events=['login','export'])", "query_warehouse(\"SELECT cohort, retained FROM weekly WHERE w={k}\")", "cluster_sessions(n=12)", "plot_retention(cohort={k})"],
    finds: ["No integration in week 1 → 3.1× churn", "Churn spike after the March price change", "Power users export daily; build a scheduled export", "Mobile signups retain 22% worse"],
  },
  {
    kind: "Localization", unit: "articles", total: [2800, 4200],
    title: "Translate {c}'s help center ({t} articles) into 14 languages",
    think: ["Keeping product names untranslated per the glossary", "Japanese UI strings are shorter; checking screenshot captions", "This article references a retired feature; flagging instead of translating", "Back-translating a sample of German to check meaning"],
    tools: ["fetch_article({n})", "translate(article={n}, lang='de')", "apply_glossary(article={n})", "qa_check(article={n}, lang='ja')"],
    finds: ["212 articles reference retired features", "Glossary conflict on 'workspace' in French", "Spanish set complete: 3,140 articles", "Broken links in 96 articles"],
  },
  {
    kind: "Security sweep", unit: "endpoints", total: [600, 1100],
    title: "Probe {t} internal API endpoints at {c} for auth and input bugs",
    think: ["This endpoint trusts the org id in the body; testing with another org", "Rate limit is per IP only; checking per-token", "Fuzzing the date parser with malformed inputs", "Error messages leak stack traces in staging"],
    tools: ["http.get('/api/v2/accounts/{k}')", "fuzz(endpoint={n}, cases=500)", "check_authz(endpoint={n}, role='viewer')", "replay(request_id={k})"],
    finds: ["IDOR: viewers can read other orgs' invoices", "Stack traces exposed on 14 endpoints", "Missing rate limit on password reset", "SQL error on a malformed date in /reports"],
  },
];

export const NAMES = [
  "Atlas", "Juniper", "Vesper", "Orion", "Wren", "Sable", "Harbor", "Quill", "Ember", "Lark", "Nova", "Cedar",
  "Rook", "Indigo", "Marlow", "Sterling", "Aster", "Briar", "Calder", "Delta", "Echo", "Fable", "Gale", "Hollis",
  "Ione", "Jett", "Kit", "Lyra", "Moss", "Nash", "Onyx", "Pike", "Reed", "Sol", "Tamsin", "Umber", "Vale", "Wilder",
  "Yarrow", "Zephyr", "Arden", "Bishop", "Cove", "Dune", "Ellis", "Flint", "Grove", "Hale", "Iris", "Jules",
  "Kai", "Linden", "Mira", "Nico", "Oren", "Pax", "Rune", "Sage", "Thorne", "Ula", "Vireo", "West", "Yuki", "Zane",
];

// A small deterministic RNG, so agent i always gets the same mission.
export function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function assignment(index) {
  const r = rng(index * 7919 + 17);
  const m = MISSIONS[index % MISSIONS.length];
  const c = COMPANIES[Math.floor(r() * COMPANIES.length)];
  const total = Math.round(m.total[0] + r() * (m.total[1] - m.total[0]));
  return {
    name: NAMES[index % NAMES.length],
    kind: m.kind,
    unit: m.unit,
    total,
    company: c,
    title: m.title.replace("{t}", total.toLocaleString("en-US")).replace("{c}", c),
    mission: m,
  };
}
