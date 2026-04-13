function parseStatusJson(statusResult) {
  if (!statusResult || !statusResult.stdout) {
    return { ok: false, error: statusResult?.error || 'No status output' };
  }

  try {
    return { ok: true, data: JSON.parse(statusResult.stdout) };
  } catch (error) {
    return { ok: false, error: `Invalid status JSON: ${error.message}` };
  }
}

function deriveTelegram(statusJson, logsResult) {
  const channelSummary = statusJson?.channelSummary || [];
  const joined = channelSummary.join('\n');
  const logs = logsResult?.stdout || '';

  const configured = /Telegram:\s+configured/i.test(joined);
  const recentSendOk = /gateway\/channels\/telegram.*sendMessage ok/i.test(logs);
  const recentStart = /gateway\/channels\/telegram.*starting provider/i.test(logs);
  const networkWarnings = [...logs.matchAll(/telegram\/network.*sticky IPv4-only dispatcher/gi)].length;

  let state = 'unknown';
  if (configured && recentSendOk) state = 'healthy';
  else if (configured && recentStart) state = 'degraded';
  else if (configured) state = 'healthy';
  else state = 'broken';

  return {
    state,
    configured,
    recentSendOk,
    recentStart,
    networkWarnings,
    detail: configured
      ? recentSendOk
        ? 'Telegram configured and recent sends succeeded'
        : 'Telegram configured; sampled logs do not show a recent send, but channel is available'
      : 'Telegram not configured'
  };
}

function deriveGateway(statusJson, configResults, qrResult) {
  const gateway = statusJson?.gateway || {};
  const bind = (configResults?.bind?.stdout || '').trim() || 'unknown';
  const mode = (configResults?.mode?.stdout || '').trim() || gateway.mode || 'unknown';
  const qrError = (qrResult?.stderr || qrResult?.error || '').trim();
  const gatewayReachable = typeof gateway.reachable === 'boolean' ? gateway.reachable : mode !== 'unknown';
  const loopbackOnly = bind === 'loopback' || String(gateway.url || '').includes('127.0.0.1') || /loopback/i.test(qrError);

  let state = 'unknown';
  if (gatewayReachable && loopbackOnly) state = 'degraded';
  else if (gatewayReachable) state = 'healthy';
  else state = 'broken';

  return {
    state,
    reachable: Boolean(gatewayReachable),
    mode,
    bind,
    url: gateway.url || null,
    loopbackOnly,
    qrUsable: qrResult?.code === 0,
    detail: loopbackOnly
      ? 'Gateway is reachable locally but advertised route is loopback-only'
      : gatewayReachable
        ? 'Gateway reachable'
        : (gateway.error || qrError || 'Gateway unreachable')
  };
}

function deriveNodes(nodesResult) {
  const text = (nodesResult?.stdout || '').trim();
  const match = text.match(/Known:\s*(\d+)\s*·\s*Paired:\s*(\d+)\s*·\s*Connected:\s*(\d+)/i);

  if (!match) {
    return {
      state: 'unknown',
      known: null,
      paired: null,
      connected: null,
      summary: text || 'Unknown',
      detail: 'Unable to parse node connectivity'
    };
  }

  const known = Number(match[1]);
  const paired = Number(match[2]);
  const connected = Number(match[3]);

  let state = 'healthy';
  if (known === 0 && paired === 0 && connected === 0) state = 'info';
  else if (paired > 0 && connected === 0) state = 'warning';

  return {
    state,
    known,
    paired,
    connected,
    summary: text,
    detail: connected > 0 ? 'At least one node connected' : 'No connected nodes detected'
  };
}

function derivePairing(devicesResult) {
  const text = (devicesResult?.stdout || '').trim();
  const pairedMatch = text.match(/Paired\s*\((\d+)\)/i);
  const pairedDevices = pairedMatch ? Number(pairedMatch[1]) : 0;

  return {
    state: pairedDevices > 0 ? 'healthy' : 'info',
    pairedDevices,
    detail: pairedDevices > 0 ? `${pairedDevices} paired device(s)` : 'No paired devices',
    raw: text
  };
}

function deriveLogSummary(logsResult, journalResult) {
  const logsText = (logsResult?.stdout || '').trim();
  const journalText = (journalResult?.stdout || '').trim();
  const usableJournal = journalText && journalText !== '-- No entries --';
  const source = logsText ? 'openclaw' : usableJournal ? 'journalctl' : 'none';
  const text = logsText || (usableJournal ? journalText : '') || '';
  const lines = text ? text.split('\n').slice(-50) : [];

  return {
    source,
    lines,
    text: lines.join('\n'),
    hasErrors: lines.some((line) => /\berror\b/i.test(line)),
    hasWarnings: lines.some((line) => /\bwarn\b/i.test(line))
  };
}

module.exports = {
  parseStatusJson,
  deriveTelegram,
  deriveGateway,
  deriveNodes,
  derivePairing,
  deriveLogSummary
};
