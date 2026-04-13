function deriveOpsQueue(snapshot) {
  if (!snapshot) return [];

  return (snapshot.attention || []).map((item) => ({
    status: item.severity === 'critical' ? 'needs-action' : item.severity === 'warning' ? 'investigate' : 'watch',
    severity: item.severity,
    area: item.area,
    code: item.code,
    summary: item.message,
    nextAction: item.action
  }));
}

module.exports = { deriveOpsQueue };
