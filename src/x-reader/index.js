function normalizeXUrl(input) {
  if (!input) return null;
  try {
    const url = new URL(input);
    if (!/(^|\.)x\.com$/i.test(url.hostname) && !/(^|\.)twitter\.com$/i.test(url.hostname)) return null;
    return url.toString();
  } catch (_error) {
    return null;
  }
}

function buildBrowserReaderPlan(url) {
  const normalizedUrl = normalizeXUrl(url);
  if (!normalizedUrl) {
    return {
      ok: false,
      error: 'Invalid X/Twitter URL'
    };
  }

  return {
    ok: true,
    mode: 'browser-first',
    normalizedUrl,
    steps: [
      'Open the X post in a real browser session',
      'Capture main post text, author, timestamp, and engagement context',
      'Collect surrounding replies and visible thread context',
      'Summarize the conversation into a discussion-ready view'
    ],
    fallback: 'xurl-api'
  };
}

module.exports = { normalizeXUrl, buildBrowserReaderPlan };
