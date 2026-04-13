function deriveWatcherSuggestions(snapshot) {
  const attention = snapshot?.attention || [];
  return attention
    .filter((item) => item.severity === 'critical' || item.severity === 'warning')
    .map((item) => ({
      severity: item.severity,
      area: item.area,
      reason: item.message,
      suggestedAction: item.action,
      autoAction: null
    }));
}

module.exports = { deriveWatcherSuggestions };
