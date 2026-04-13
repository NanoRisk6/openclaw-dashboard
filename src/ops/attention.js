function buildAttention({ telegram, gateway, nodes, pairing, logs }) {
  const items = [];

  if (telegram.state === 'broken') {
    items.push({ severity: 'critical', area: 'telegram', code: 'telegram_broken', message: 'Telegram is not configured or unavailable.', action: 'Check Telegram token/config and provider startup.' });
  } else if (telegram.state === 'degraded') {
    items.push({ severity: 'warning', area: 'telegram', code: 'telegram_degraded', message: 'Telegram is configured but recent delivery health is unclear.', action: 'Check provider logs and verify a fresh send succeeds.' });
  }

  if (telegram.networkWarnings > 0) {
    items.push({ severity: 'info', area: 'telegram', code: 'telegram_network_fallback', message: `Telegram network fallback seen ${telegram.networkWarnings} time(s).`, action: 'Monitor only unless message delivery starts failing.' });
  }

  if (gateway.state === 'broken') {
    items.push({ severity: 'critical', area: 'gateway', code: 'gateway_unreachable', message: 'Gateway is unreachable.', action: 'Check gateway service and logs.' });
  } else if (gateway.loopbackOnly) {
    items.push({ severity: 'warning', area: 'gateway', code: 'gateway_loopback_only', message: 'Gateway is local-only. Remote pairing and external node flows will fail.', action: 'Use gateway.bind=lan, Tailscale, or a public URL depending on intended topology.' });
  }

  if (!gateway.qrUsable) {
    items.push({ severity: 'warning', area: 'gateway', code: 'qr_not_usable', message: 'QR/device route is not currently usable.', action: 'Fix advertised route first, then generate a fresh QR/setup code.' });
  }

  if (nodes.state === 'warning') {
    items.push({ severity: 'warning', area: 'nodes', code: 'nodes_paired_not_connected', message: 'Nodes are paired but none are connected.', action: 'Check node runtime and network path.' });
  } else if (nodes.state === 'info') {
    items.push({ severity: 'info', area: 'nodes', code: 'no_nodes_connected', message: 'No connected nodes detected.', action: 'No action unless you expect external nodes right now.' });
  }

  if (pairing.pairedDevices > 0) {
    items.push({ severity: 'info', area: 'pairing', code: 'paired_devices_present', message: `${pairing.pairedDevices} paired device(s) registered.`, action: 'Informational.' });
  }

  if (logs.hasErrors) {
    items.push({ severity: 'warning', area: 'logs', code: 'recent_errors_present', message: 'Recent logs include error lines.', action: 'Inspect the recent error panel for recurring failures.' });
  }

  return sortAttention(items);
}

function sortAttention(items) {
  const order = { critical: 0, warning: 1, info: 2 };
  return [...items].sort((a, b) => (order[a.severity] ?? 99) - (order[b.severity] ?? 99));
}

module.exports = { buildAttention };
