function evaluateWatchActions(snapshot) {
  const actions = [];

  if (!snapshot) return actions;

  if (snapshot.channels?.telegram?.state !== 'ok') {
    actions.push({ type: 'alert', reason: 'telegram unhealthy', safeAutoAction: null });
  }

  if (snapshot.gateway?.state === 'loopback-only') {
    actions.push({ type: 'note', reason: 'gateway loopback-only', safeAutoAction: null });
  }

  return actions;
}

module.exports = { evaluateWatchActions };
