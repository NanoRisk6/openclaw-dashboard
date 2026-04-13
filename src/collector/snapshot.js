const { runCommand } = require('../lib/exec');
const {
  parseStatusJson,
  deriveTelegram,
  deriveGateway,
  deriveNodes,
  derivePairing,
  deriveLogSummary
} = require('./parsers');
const { buildAttention } = require('../ops/attention');
const { deriveWatcherSuggestions } = require('../watcher/policy');
const { deriveOpsQueue } = require('../ops/queue');

async function collectSnapshot(config) {
  const commandResults = await runChecks(config);
  const {
    statusResult,
    qrResult,
    devicesResult,
    nodesResult,
    logsResult,
    journalResult,
    bindResult,
    modeResult
  } = commandResults;

  const statusJson = parseStatusJson(statusResult);
  const statusData = statusJson.ok ? statusJson.data : null;

  const telegram = deriveTelegram(statusData, logsResult);
  const gateway = deriveGateway(statusData, { bind: bindResult, mode: modeResult }, qrResult);
  const nodes = deriveNodes(nodesResult);
  const pairing = derivePairing(devicesResult);
  const recentLogs = deriveLogSummary(logsResult, journalResult);
  const attention = buildAttention({ telegram, gateway, nodes, pairing, logs: recentLogs });
  const watcher = deriveWatcherSuggestions({ attention, telegram, gateway, nodes, pairing, recentLogs });
  const opsQueue = deriveOpsQueue({ attention });

  const codexHarness = deriveCodexHarness(config);
  const strictMode = deriveStrictMode(config);

  const overallState = attention.some((item) => item.severity === 'critical')
    ? 'broken'
    : attention.some((item) => item.severity === 'warning')
      ? 'degraded'
      : 'healthy';

  return {
    generatedAt: new Date().toISOString(),
    lastSuccessfulPollAt: new Date().toISOString(),
    summary: {
      state: overallState,
      statusSource: statusJson.ok ? 'openclaw status --json' : 'fallback probes',
      statusParseError: statusJson.ok ? null : statusJson.error
    },
    harness: {
      codex: codexHarness,
      strictMode
    },
    channels: {
      telegram
    },
    gateway,
    nodes,
    pairing,
    recentLogs,
    attention,
    watcher,
    opsQueue,
    commands: {
      status: slimResult(statusResult),
      qr: slimResult(qrResult),
      devices: slimResult(devicesResult),
      nodes: slimResult(nodesResult),
      logs: slimResult(logsResult),
      journal: slimResult(journalResult),
      config: {
        bind: slimResult(bindResult),
        mode: slimResult(modeResult)
      }
    }
  };
}

async function runChecks(config) {
  let statusResult = await runCommand('openclaw status --json', config);
  let logsResult = await runCommand('openclaw logs --limit 50 --plain --no-color', config);
  let qrResult = await runCommand('openclaw qr --json', config);
  let devicesResult = await runCommand('openclaw devices list', config);
  let nodesResult = await runCommand('openclaw nodes status', config);
  const journalResult = await runCommand('journalctl -u openclaw-gateway.service -n 50 --no-pager -o short-iso', config);
  const bindResult = await runCommand('openclaw config get gateway.bind', config);
  const modeResult = await runCommand('openclaw config get gateway.mode', config);

  if (!statusResult.stdout) {
    statusResult = await runCommand('openclaw status --json', config);
  }
  if (!logsResult.stdout) {
    logsResult = await runCommand('openclaw logs --limit 50 --plain --no-color', config);
  }
  if (!devicesResult.stdout) {
    devicesResult = await runCommand('openclaw devices list', config);
  }
  if (!nodesResult.stdout) {
    nodesResult = await runCommand('openclaw nodes status', config);
  }
  if (!qrResult.stdout && !qrResult.stderr) {
    qrResult = await runCommand('openclaw qr --json', config);
  }

  return {
    statusResult,
    qrResult,
    devicesResult,
    nodesResult,
    logsResult,
    journalResult,
    bindResult,
    modeResult
  };
}

function slimResult(result = {}) {
  return {
    command: result.command,
    code: result.code,
    error: result.error,
    stderr: trim(result.stderr || ''),
    stdout: trim(result.stdout || '')
  };
}

function trim(text = '') {
  return text.length > 4000 ? `${text.slice(0, 4000)}\n...[truncated]` : text;
}

function deriveCodexHarness(config) {
  const codex = config?.harness?.codex || {};
  const model = codex.model || null;
  const runtime = codex.runtime || null;
  const pluginEnabled = Boolean(codex.pluginEnabled);
  const enabled = Boolean(codex.enabled);
  const fallback = codex.fallback || null;
  const codexModelSelected = typeof model === 'string' && /^codex\//i.test(model);
  const forcedRuntime = runtime === 'codex';
  const active = enabled && pluginEnabled && (codexModelSelected || forcedRuntime);

  return {
    enabled,
    pluginEnabled,
    model,
    runtime,
    fallback,
    codexModelSelected,
    forcedRuntime,
    active,
    detail: active
      ? 'Codex harness active for embedded turns'
      : pluginEnabled
        ? 'Codex plugin enabled but harness is not selected by current model/runtime'
        : 'Codex plugin disabled'
  };
}

function deriveStrictMode(config) {
  const strictMode = config?.harness?.strictMode || {};
  const executionContract = strictMode.executionContract || null;
  const enabled = Boolean(strictMode.enabled);
  const active = enabled && executionContract === 'strict-agentic';

  return {
    enabled,
    executionContract,
    agenticMode: strictMode.agenticMode || null,
    active,
    detail: active
      ? 'Strict agentic execution contract is active'
      : executionContract
        ? `Execution contract set to ${executionContract}`
        : 'Strict mode not configured'
  };
}

module.exports = { collectSnapshot };
