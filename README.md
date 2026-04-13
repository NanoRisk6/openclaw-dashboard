# ClawOps

Lean internal ops layer for OpenClaw.

## Goal
ClawOps provides a practical control plane on top of an existing OpenClaw install:
- health visibility
- recent errors and degraded states
- safe remediation hooks
- lightweight ops queue
- Telegram-friendly admin actions

## MVP priorities
1. Health collector
2. Simple web dashboard
3. Background watcher
4. Telegram admin command layer

## Architecture
- `src/server/` Express web app + JSON API
- `src/collector/` OpenClaw CLI + log collectors
- `src/watcher/` background checks and safe remediation policy
- `src/ops/` lightweight in-process work queue / attention model
- `src/lib/` shared utilities
- `src/config/` runtime config loading and defaults
- `data/` snapshots, state, and queue files

## First implementation target
- collect status from `openclaw status`
- collect gateway QR/connectivity diagnostics
- expose JSON API
- render a minimal dashboard

## Run plan
- dev: one node process running server + polling loop
- prod: systemd or pm2 later; keep single-process first

## Codex harness visibility
ClawOps now exposes a small Codex harness status block in snapshots and the dashboard.

Environment variables:
- `OPENCLAW_CODEX_PLUGIN_ENABLED=true` to indicate the codex plugin is enabled
- `OPENCLAW_DEFAULT_MODEL=codex/gpt-5.4` to mirror the selected default model
- `OPENCLAW_EMBEDDED_HARNESS_RUNTIME=codex` to force the embedded harness runtime
- `OPENCLAW_EMBEDDED_HARNESS_FALLBACK=none` to mirror the configured fallback
- `OPENCLAW_EXECUTION_CONTRACT=strict-agentic` to mirror strict mode

Example:
```bash
OPENCLAW_CODEX_PLUGIN_ENABLED=true \
OPENCLAW_DEFAULT_MODEL=codex/gpt-5.4 \
OPENCLAW_EMBEDDED_HARNESS_RUNTIME=codex \
OPENCLAW_EMBEDDED_HARNESS_FALLBACK=none \
node src/index.js
```

When these are set, the dashboard reports whether Codex harnessing is merely available or actually active for embedded turns.

## Memory Palace
ClawOps now seeds a lightweight "Memory Palace" file at `clawops/data/memory-palace.json` and exposes it at:
- `GET /api/memory-palace`
- the main dashboard

The initial shape includes:
- rooms
- activeMemory
- recentDreams
- importedChats count

This is a lightweight scaffold for the newer OpenClaw memory direction: imported chats, structured memory rooms, and an "active memory" surface that can be explored in the UI.

## Bundled Codex plugin
ClawOps now includes a bundled Codex plugin module at `src/plugins/codex/`.

It exposes:
- plugin metadata
- activation logic
- guided setup steps
- `GET /api/plugins/codex`
- dashboard visibility

This does not replace OpenClaw core plugin loading, but it gives you a first-class bundled plugin surface inside this repo that mirrors the intended Codex harness behavior.

## Strict mode
ClawOps now also surfaces strict mode support for:
- `agents.defaults.embeddedPi.executionContract = "strict-agentic"`

It appears in snapshot data, the dashboard, and the bundled Codex plugin setup flow.
