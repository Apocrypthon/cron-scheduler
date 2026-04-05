# Claude Scheduler — GitHub Actions Cron

A zero-infrastructure daily scheduler that calls the Anthropic API on a cron schedule.
Runs on GitHub's cloud — works 24/7 even when your laptop is off.

## Setup (5 minutes)

### 1. Create a GitHub repo
Push this folder to a new repo (public or private).

```bash
gh repo create claude-scheduler --private --source=. --push
# or: git init && git add . && git commit -m "init" && git remote add origin ... && git push
```

### 2. Add your API key as a secret
Go to your repo → **Settings → Secrets and variables → Actions → New repository secret**

| Name | Value |
|------|-------|
| `ANTHROPIC_API_KEY` | `sk-ant-...` |
| `WEBHOOK_URL` *(optional)* | Slack/Discord/ntfy.sh URL |

### 3. Customize via Repository Variables (optional)
Go to **Settings → Secrets and variables → Actions → Variables**

| Variable | Default | Description |
|----------|---------|-------------|
| `TASK_TITLE` | `hi` | Label for the task |
| `TASK_MESSAGE` | `hi` | Message sent to Claude |
| `TASK_MODEL` | `claude-haiku-4-5-20251001` | Model to use |

### 4. Change the schedule
Edit `.github/workflows/daily-hi.yml` — the `cron:` line uses UTC:

```
# Format: minute hour day month weekday
33 11 * * *   →  3:33 AM PST (UTC-8) / 4:33 AM PDT (UTC-7)
```
Use https://crontab.guru to build cron expressions.

### 5. Run manually anytime
Go to **Actions → Daily Scheduler — hi → Run workflow**
You can override the message before firing.

## Local testing

```bash
npm install
cp .env.example .env  # fill in your API key
npm test
```

## Viewing results
Each run logs the full Claude response in **Actions → [run] → send → Run scheduler**.
If you set `WEBHOOK_URL`, results are also POSTed there in JSON.
