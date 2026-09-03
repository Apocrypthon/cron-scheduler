#!/usr/bin/env bash
# run-relay.sh — round-robin the five repos for 6h on one machine.
#
# Local fallback for when you would rather not burn Actions minutes, or when
# GitHub is having a day. Same contract as the workflow: one relay session per
# repo per pass, push to `loop`, move on.
#
# Usage:
#   ./scripts/run-relay.sh                 # 6h window, ask before risky edits
#   HOURS=2 ./scripts/run-relay.sh         # shorter window
#   SKIP_PERMS=1 ./scripts/run-relay.sh    # containers only — see README
set -u

REPOS=(clvi-frontend clvi-game-client clvi-backend clvi-infrastructure clvi-testing)
ROOT="${ROOT:-$HOME/clvi}"
HOURS="${HOURS:-6}"
END=$(( $(date +%s) + HOURS * 3600 ))

EXTRA=""
[ "${SKIP_PERMS:-0}" = "1" ] && EXTRA="--dangerously-skip-permissions" # containers only

mkdir -p "$ROOT/logs"
trap 'echo "relay: interrupted"; exit 130' INT TERM

echo "relay: ${HOURS}h window, ends $(date -d "@$END" 2>/dev/null || date -r "$END")"

while [ "$(date +%s)" -lt "$END" ]; do
  for R in "${REPOS[@]}"; do
    [ "$(date +%s)" -ge "$END" ] && break
    cd "$ROOT/$R" || continue
    echo "relay: $R @ $(date +%H:%M:%S)"

    git pull --rebase origin loop 2>/dev/null

    claude -p "$(cat SEED.md)" \
      --permission-mode acceptEdits \
      --allowedTools "Read,Edit,Write,Glob,Grep,Bash(git *),Bash(npm *),Bash(npx *),Bash(node *),Bash(mkdir *),Bash(ls *),Bash(cat *)" \
      --max-turns 14 $EXTRA \
      >> "$ROOT/logs/$R.log" 2>&1 || sleep 900

    git push origin loop 2>/dev/null
    sleep 60
  done
done

echo "relay: window closed."
