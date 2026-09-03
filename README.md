# cron-scheduler — the cron heart

This repo is the metronome and kill-switch for the Strata loop. It holds:
`RUN_UNTIL` (a single unix-epoch number; loops run only while now < RUN_UNTIL),
`start-run.yml` (phone-tap start/stop), and the `strata-loop.yml` template that
each of the five loop repos carries in `.github/workflows/`.

| Path | What it is |
|---|---|
| `RUN_UNTIL` | The deadline. One unix-epoch integer. `0` = stopped. |
| `.github/workflows/start-run.yml` | Writes `RUN_UNTIL`. The only thing you tap. |
| `templates/strata-loop.yml` | Template to copy into each loop repo. Does **not** run here. |
| `scripts/run-relay.sh` | Optional local fallback relay. |
| `.github/workflows/main.yml`, `src/run.js` | Unrelated daily scheduler — see [Appendix](#appendix-daily-scheduler). |

## 1) RUN_UNTIL

A file at repo root containing just a unix-epoch deadline. It ships as:

```
0
```

Zero means every loop repo skips its tick. Nothing else reads or writes this file
except `start-run.yml` and the kill-switch check in each loop repo.

## 2) start-run.yml — the phone tap

Already installed at `.github/workflows/start-run.yml`.

- **Start 6 hours**: GitHub app → this repo → Actions → start-run → Run workflow → hours `6`
- **Stop**: run it again with hours `0`

It validates the input is a whole number, computes `now + hours*3600`, commits
`RUN_UNTIL`, and prints the expiry to the run summary. Running it with a value
that is already set commits nothing.

> **Stop is not instant.** `raw.githubusercontent.com` caches for roughly five
> minutes, so a tick already in flight — and possibly the next one — will still
> run after you set `0`. Budget one cycle of lag.

## 3) strata-loop.yml — copy into EACH loop repo

The template lives at [`templates/strata-loop.yml`](templates/strata-loop.yml).
Copy it to `.github/workflows/strata-loop.yml` **in each loop repo** and set that
repo's cron minutes from the stagger table below.

It is a template rather than a live workflow here on purpose: this repo has no
`SEED.md` and no `loop` branch, so a copy in this repo's `.github/workflows/`
would fail every 20 minutes forever.

Each loop repo needs:

1. branch `loop` exists
2. Settings → Actions → General → Workflow permissions → **Read and write**
3. the auth secret (below)
4. cron minutes replaced per the stagger table

The kill-switch step fetches
`https://raw.githubusercontent.com/Apocrypthon/cron-scheduler/main/RUN_UNTIL`
and fails closed — an unreachable file, or anything that is not digits, is
treated as `0` and the tick skips. If you fork or rename this repo, that URL is
the one line to update in every copy.

### Auth note — two options for the secret

- `ANTHROPIC_API_KEY` (API billing), as the template ships; or
- your Claude subscription via an OAuth token: run `claude setup-token` once on any
  machine, store the result as secret `CLAUDE_CODE_OAUTH_TOKEN`, and swap the input
  to `claude_code_oauth_token: ${{ secrets.CLAUDE_CODE_OAUTH_TOKEN }}`. Input names
  vary by action version — confirm against
  [the claude-code-action README](https://github.com/anthropics/claude-code-action)
  before the run.

`--dangerously-skip-permissions` is acceptable HERE because the runner is an
ephemeral container that is destroyed after the tick and holds no secrets beyond
the scoped job token. Do not carry this flag to a machine you keep.

## 4) Stagger table (*/20 per repo, offset so ticks never collide)

| Repo | cron minutes |
|---|---|
| clvi-frontend | `1,21,41` |
| clvi-game-client | `5,25,45` |
| clvi-backend | `9,29,49` |
| clvi-infrastructure | `13,33,53` |
| clvi-testing | `17,37,57` |

GitHub's scheduler is best-effort and runs late under load, so treat these as
intent rather than guarantees. The four-minute gaps absorb normal drift.

## 5) Local fallback relay (optional, laptop/Chromebook)

[`scripts/run-relay.sh`](scripts/run-relay.sh) round-robins the five repos on one
machine — useful when you would rather not spend Actions minutes.

```bash
./scripts/run-relay.sh                 # 6h window
HOURS=2 ./scripts/run-relay.sh         # shorter window
ROOT=~/code/clvi ./scripts/run-relay.sh
SKIP_PERMS=1 ./scripts/run-relay.sh    # containers only
```

It expects the five repos cloned under `$ROOT` (default `~/clvi`), each with a
`SEED.md` and a `loop` branch, and logs per repo to `$ROOT/logs/`. It does not
read `RUN_UNTIL` — its window is its own `HOURS`, so stop it with Ctrl-C.

## 6) Audit trail

v0: the Actions run history + `git log loop` on each repo IS the immutable record
(timestamped, per-cycle, diffable). A later scheduler milestone can roll these into
a persist-ant-style signed report (HMAC over `{repo, run_id, sha_before, sha_after,
ts}`) — the same integrity pattern clvi-backend already applies to Guardian tokens.

---

## Appendix: daily scheduler

Predates the loop work and is unrelated to it. `.github/workflows/main.yml` runs
`src/run.js` on a daily cron (`33 11 * * *` UTC) to send one message to the
Anthropic API and log the reply.

Secrets: `ANTHROPIC_API_KEY`, optional `WEBHOOK_URL` (Slack/Discord/ntfy.sh).
Repository variables: `TASK_TITLE`, `TASK_MESSAGE`, `TASK_MODEL`
(default `claude-haiku-4-5-20251001`).

```bash
npm install
npm test    # runs src/run.js with TASK_TITLE=hi TASK_MESSAGE=hi
```

It shares no state with the loop — it neither reads nor writes `RUN_UNTIL`.
