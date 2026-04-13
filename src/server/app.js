const express = require('express');
const { getLatestSnapshot, getMemoryPalace } = require('../state/store');
const { buildBrowserReaderPlan, buildDiscussionSummary, normalizeXUrl } = require('../x-reader');

function createApp(config) {
  const app = express();

  app.get('/healthz', (_req, res) => {
    res.json({ ok: true, service: 'clawops' });
  });

  app.get('/api/status', async (_req, res) => {
    const snapshot = await getLatestSnapshot(config);
    res.json(snapshot);
  });

  app.get('/api/memory-palace', async (_req, res) => {
    const memoryPalace = await getMemoryPalace(config);
    res.json(memoryPalace);
  });

  app.get('/api/plugins/codex', async (_req, res) => {
    res.json(config.plugins?.codex || null);
  });

  app.get('/api/x-reader', async (req, res) => {
    const url = normalizeXUrl(req.query?.url);
    if (!url) {
      res.status(400).json({ ok: false, error: 'Invalid X/Twitter URL' });
      return;
    }

    const plan = buildBrowserReaderPlan(url);
    const discussion = buildDiscussionSummary({
      url,
      post: {
        id: null,
        text: 'Browser extraction route is ready. Live browser capture can populate this object.',
        author: { handle: null }
      },
      replies: []
    });

    res.json({ ok: true, plan, discussion });
  });

  app.get('/', async (_req, res) => {
    const snapshot = await getLatestSnapshot(config);
    const memoryPalace = await getMemoryPalace(config);
    const data = snapshot || { generatedAt: null, summary: { state: 'unknown' }, attention: [] };

    res.type('html').send(`<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>ClawOps</title>
  <style>
    body { font-family: Inter, Arial, sans-serif; margin: 24px; background: #101114; color: #eceef3; }
    h1, h2, h3 { margin-top: 0; }
    .muted { color: #98a2b3; }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 16px; margin-bottom: 16px; }
    .card { background: #171923; border: 1px solid #2b3040; border-radius: 14px; padding: 16px; margin-bottom: 16px; box-shadow: 0 2px 10px rgba(0,0,0,0.18); }
    .status { display: inline-block; padding: 4px 10px; border-radius: 999px; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; }
    .status-healthy, .severity-info { background: rgba(56, 203, 137, 0.15); color: #78f0b0; }
    .status-degraded, .severity-warning { background: rgba(255, 194, 71, 0.15); color: #ffd166; }
    .status-broken, .severity-critical { background: rgba(255, 107, 107, 0.15); color: #ff8b8b; }
    .metric { font-size: 24px; font-weight: 800; margin: 8px 0; }
    .label { font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em; color: #98a2b3; }
    .attention-item { border-left: 4px solid #2b3040; padding-left: 12px; margin-bottom: 12px; }
    .attention-item.severity-critical { border-left-color: #ff6b6b; }
    .attention-item.severity-warning { border-left-color: #ffd166; }
    .attention-item.severity-info { border-left-color: #38cb89; }
    pre { white-space: pre-wrap; word-break: break-word; overflow-x: auto; background: #0f1218; padding: 12px; border-radius: 10px; border: 1px solid #272c39; }
    .two-col { display: grid; grid-template-columns: 1.2fr 1fr; gap: 16px; }
    @media (max-width: 900px) { .two-col { grid-template-columns: 1fr; } }
    .error { color: #ff8b8b; }
  </style>
</head>
<body>
  <h1>ClawOps</h1>
  <p class="muted">Practical internal ops console for OpenClaw</p>

  <div class="card">
    <div style="display:flex;justify-content:space-between;gap:12px;align-items:center;flex-wrap:wrap;">
      <div>
        <div class="label">Overall system state</div>
        <div class="metric">${escapeHtml(data.summary?.state || 'unknown')}</div>
      </div>
      <div>
        <span class="status status-${escapeHtml(data.summary?.state || 'unknown')}">${escapeHtml(data.summary?.state || 'unknown')}</span>
      </div>
    </div>
    <p class="muted">Last successful poll: ${escapeHtml(data.lastSuccessfulPollAt || 'never')}</p>
    <p class="muted">Status source: ${escapeHtml(data.summary?.statusSource || 'unknown')}</p>
    ${data.summary?.statusParseError ? `<p class="error"><strong>Status parse fallback:</strong> ${escapeHtml(data.summary.statusParseError)}</p>` : ''}
  </div>

  <div class="grid">
    ${renderSummaryCard('Telegram', data.channels?.telegram?.state, data.channels?.telegram?.detail, [
      ['Configured', yesNo(data.channels?.telegram?.configured)],
      ['Recent send OK', yesNo(data.channels?.telegram?.recentSendOk)],
      ['Network warnings', String(data.channels?.telegram?.networkWarnings ?? 0)]
    ])}
    ${renderSummaryCard('Gateway', data.gateway?.state, data.gateway?.detail, [
      ['Reachable', yesNo(data.gateway?.reachable)],
      ['Bind', data.gateway?.bind || 'unknown'],
      ['QR usable', yesNo(data.gateway?.qrUsable)]
    ])}
    ${renderSummaryCard('Nodes', data.nodes?.state, data.nodes?.detail, [
      ['Known', stringify(data.nodes?.known)],
      ['Paired', stringify(data.nodes?.paired)],
      ['Connected', stringify(data.nodes?.connected)]
    ])}
    ${renderSummaryCard('Pairing', data.pairing?.state, data.pairing?.detail, [
      ['Paired devices', stringify(data.pairing?.pairedDevices)]
    ])}
    ${renderSummaryCard('Codex Harness', data.harness?.codex?.active ? 'healthy' : (data.harness?.codex?.pluginEnabled ? 'degraded' : 'broken'), data.harness?.codex?.detail, [
      ['Plugin enabled', yesNo(data.harness?.codex?.pluginEnabled)],
      ['Model', stringify(data.harness?.codex?.model)],
      ['Runtime', stringify(data.harness?.codex?.runtime)],
      ['Fallback', stringify(data.harness?.codex?.fallback)]
    ])}
    ${renderSummaryCard('Bundled Codex Plugin', config.plugins?.codex?.active ? 'healthy' : (config.plugins?.codex?.pluginEnabled ? 'degraded' : 'broken'), config.plugins?.codex?.active ? 'Bundled plugin is active' : 'Bundled plugin is installed but not active', [
      ['Enabled', yesNo(config.plugins?.codex?.enabled)],
      ['Plugin enabled', yesNo(config.plugins?.codex?.pluginEnabled)],
      ['Model', stringify(config.plugins?.codex?.model)],
      ['Runtime', stringify(config.plugins?.codex?.runtime)]
    ])}
    ${renderSummaryCard('Strict Mode', data.harness?.strictMode?.active ? 'healthy' : (data.harness?.strictMode?.executionContract ? 'degraded' : 'broken'), data.harness?.strictMode?.detail, [
      ['Enabled', yesNo(data.harness?.strictMode?.enabled)],
      ['Execution contract', stringify(data.harness?.strictMode?.executionContract)],
      ['Agentic mode', stringify(data.harness?.strictMode?.agenticMode)]
    ])}
  </div>

  <div class="two-col">
    <div>
      <div class="card">
        <h2>Memory Palace</h2>
        <p class="muted">Structured memory rooms for imported chats, active memories, and dream-like recall.</p>
        <p><strong>Imported chats:</strong> ${escapeHtml(String(memoryPalace?.importedChats ?? 0))}</p>
        <p><strong>Rooms:</strong> ${escapeHtml(String((memoryPalace?.rooms || []).length))}</p>
        <p><strong>Active memories:</strong> ${escapeHtml(String((memoryPalace?.activeMemory || []).length))}</p>
        ${(memoryPalace?.rooms || []).length ? `<pre>${escapeHtml(JSON.stringify(memoryPalace.rooms, null, 2))}</pre>` : '<p class="muted">No rooms yet.</p>'}
      </div>
      <div class="card">
        <h2>Needs Attention</h2>
        ${(data.attention || []).length ? data.attention.map(renderAttentionItem).join('') : '<p class="muted">No active attention items.</p>'}
      </div>

      <div class="card">
        <h2>Watcher Suggestions</h2>
        ${(data.watcher || []).length ? `<pre>${escapeHtml(JSON.stringify(data.watcher, null, 2))}</pre>` : '<p class="muted">No watcher suggestions.</p>'}
      </div>

      <div class="card">
        <h2>Ops Queue</h2>
        ${(data.opsQueue || []).length ? `<pre>${escapeHtml(JSON.stringify(data.opsQueue, null, 2))}</pre>` : '<p class="muted">Queue is empty.</p>'}
      </div>
    </div>

    <div>
      <div class="card">
        <h2>Active Memory</h2>
        ${(memoryPalace?.activeMemory || []).length ? `<pre>${escapeHtml(JSON.stringify(memoryPalace.activeMemory, null, 2))}</pre>` : '<p class="muted">No active memory items.</p>'}
      </div>

      <div class="card">
        <h2>Bundled Codex Plugin</h2>
        <pre>${escapeHtml(JSON.stringify(config.plugins?.codex || null, null, 2))}</pre>
      </div>

      <div class="card">
        <h2>Strict Mode</h2>
        <pre>${escapeHtml(JSON.stringify(data.harness?.strictMode || null, null, 2))}</pre>
      </div>

      <div class="card">
        <h2>Recent Errors & Logs</h2>
        <p class="muted">Source: ${escapeHtml(data.recentLogs?.source || 'none')}</p>
        <pre>${escapeHtml(data.recentLogs?.text || 'No recent log lines available.')}</pre>
      </div>

      <div class="card">
        <h2>Command Errors</h2>
        ${renderCommandErrors(data.commands)}
      </div>
    </div>
  </div>

  <div class="card">
    <h2>Raw Snapshot</h2>
    <pre>${escapeHtml(JSON.stringify(data, null, 2))}</pre>
  </div>
</body>
</html>`);
  });

  return app;
}

function renderSummaryCard(title, state, detail, rows) {
  return `<div class="card">
    <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;">
      <h3>${escapeHtml(title)}</h3>
      <span class="status status-${escapeHtml(normalizeState(state))}">${escapeHtml(state || 'unknown')}</span>
    </div>
    <p class="muted">${escapeHtml(detail || 'No details')}</p>
    ${rows.map(([label, value]) => `<p><strong>${escapeHtml(label)}:</strong> ${escapeHtml(value)}</p>`).join('')}
  </div>`;
}

function renderAttentionItem(item) {
  return `<div class="attention-item severity-${escapeHtml(item.severity)}">
    <div style="display:flex;justify-content:space-between;gap:8px;align-items:center;flex-wrap:wrap;">
      <strong>${escapeHtml(item.message)}</strong>
      <span class="status severity-${escapeHtml(item.severity)}">${escapeHtml(item.severity)}</span>
    </div>
    <p class="muted">Area: ${escapeHtml(item.area || 'unknown')} · Code: ${escapeHtml(item.code || 'unknown')}</p>
    <p><strong>Suggested action:</strong> ${escapeHtml(item.action || 'None')}</p>
  </div>`;
}

function renderCommandErrors(commands = {}) {
  const failures = [];

  flattenCommands(commands).forEach((entry) => {
    if ((entry.value?.code ?? 0) !== 0 || entry.value?.error || entry.value?.stderr) {
      failures.push(entry);
    }
  });

  if (!failures.length) {
    return '<p class="muted">No command errors captured in the latest poll.</p>';
  }

  return failures.map(({ key, value }) => `
    <div class="card" style="margin-bottom:12px; padding:12px;">
      <p><strong>${escapeHtml(key)}</strong></p>
      <p><strong>Exit code:</strong> ${escapeHtml(String(value.code ?? 'unknown'))}</p>
      ${value.error ? `<p class="error"><strong>Error:</strong> ${escapeHtml(value.error)}</p>` : ''}
      ${value.stderr ? `<pre>${escapeHtml(value.stderr)}</pre>` : ''}
    </div>
  `).join('');
}

function flattenCommands(commands, prefix = '') {
  const entries = [];
  for (const [key, value] of Object.entries(commands || {})) {
    const nextKey = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === 'object' && !Array.isArray(value) && !('command' in value) && !('code' in value)) {
      entries.push(...flattenCommands(value, nextKey));
    } else {
      entries.push({ key: nextKey, value });
    }
  }
  return entries;
}

function normalizeState(state) {
  if (state === 'healthy' || state === 'ok' || state === 'info') return 'healthy';
  if (state === 'degraded' || state === 'warning' || state === 'configured') return 'degraded';
  if (state === 'broken' || state === 'critical') return 'broken';
  return 'degraded';
}

function yesNo(value) {
  if (value === true) return 'yes';
  if (value === false) return 'no';
  return 'unknown';
}

function stringify(value) {
  return value === null || value === undefined ? 'unknown' : String(value);
}

function escapeHtml(input) {
  return String(input)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

module.exports = { createApp };
