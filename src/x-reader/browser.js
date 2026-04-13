const { buildDiscussionSummary, normalizeXUrl } = require('./index');

async function readXThreadWithBrowser(browser, url) {
  const normalizedUrl = normalizeXUrl(url);
  if (!normalizedUrl) {
    return { ok: false, error: 'Invalid X/Twitter URL' };
  }

  if (!browser || typeof browser.open !== 'function' || typeof browser.snapshot !== 'function') {
    return {
      ok: false,
      error: 'Browser adapter unavailable'
    };
  }

  await browser.open(normalizedUrl);
  const snapshot = await browser.snapshot();
  const extraction = extractFromSnapshot(normalizedUrl, snapshot);

  return {
    ok: true,
    ...buildDiscussionSummary(extraction),
    raw: extraction
  };
}

function extractFromSnapshot(url, snapshot) {
  const lines = Array.isArray(snapshot?.lines) ? snapshot.lines : [];
  const text = lines.join('\n');
  const cleanLines = lines.map((line) => String(line).trim()).filter(Boolean);

  const postText = cleanLines.find((line) => line.length > 40) || cleanLines[0] || '';
  const handleMatch = text.match(/@([A-Za-z0-9_]{1,15})/);
  const replies = cleanLines
    .filter((line) => line !== postText)
    .slice(0, 5)
    .map((line, index) => ({
      id: `reply-${index + 1}`,
      text: line,
      author: { handle: index === 0 && handleMatch ? handleMatch[1] : null }
    }));

  return {
    url,
    post: {
      id: null,
      text: postText,
      author: {
        handle: handleMatch ? handleMatch[1] : null
      }
    },
    replies
  };
}

module.exports = { readXThreadWithBrowser, extractFromSnapshot };
