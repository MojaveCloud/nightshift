# Nightshift

64 AI agents on hours-long jobs, each in its own microVM, built on
[Mojave Jobs](https://mojave.sh/docs/jobs).

Each agent works one long mission: reviewing thousands of contracts, migrating a codebase,
reconciling a quarter's invoices, running an eval suite. The page shows all 64 working live,
zooms into one agent's trace every 20 seconds, and keeps a clock against Lambda's 15-minute limit.

The agents' steps are generated (`missions.js`), not model calls, so a run costs only the
machines. Swap `agent.js` for a real agent loop and the rest stays the same.

- `server.js` is the app. It takes agent reports and streams them to the page.
- `agent.js` is the task: agent `$MOJAVE_TASK_INDEX` works for the given minutes.
- `missions.js` holds the missions and the lines agents draw from.

## Run it

```sh
mojave deploy --repo MojaveCloud/nightshift
mojave env set <project> AGENT_KEY=$(openssl rand -hex 16)
mojave env set --plain <project> NIGHTSHIFT_URL=https://<project>.mojavedev.sh
mojave deploy --repo MojaveCloud/nightshift   # the app reads AGENT_KEY at start
mojave jobs run --tasks 64 --vcpus 1 --mem 256 --timeout 10800 --detach <project> -- node agent.js 170
```

The argument is each agent's time budget in minutes; a task may run for up to 3 hours. On the
page, `?spot=0` turns the spotlight off and `?spot=5` waits 5 seconds between spotlights.

Locally, `node agent.js 1` with `MOJAVE_TASK_INDEX=0` prints one agent's steps.

MIT licensed.
