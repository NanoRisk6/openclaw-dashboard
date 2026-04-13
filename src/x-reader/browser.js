const { buildDiscussionSummary, normalizeXUrl } = require('./index');

async function readXThreadWithBrowser(url) {
  const normalizedUrl = normalizeXUrl(url);
  if (!normalizedUrl) {
    return { ok: false, error: 'Invalid X/Twitter URL' };
  }

  const pageData = await fetchViaOpenClawBrowser(normalizedUrl);
  if (!pageData.ok) {
    return pageData;
  }

  const extraction = extractFromSnapshot(normalizedUrl, pageData.snapshot);

  return {
    ok: true,
    ...buildDiscussionSummary(extraction),
    raw: extraction
  };
}

async function fetchViaOpenClawBrowser(url) {
  const base = process.env.OPENCLAW_BROWSER_BASE_URL || 'http://127.0.0.1:18789';
  const target = `${base}/api/browser/snapshot?url=${encodeURIComponent(url)}`;

  try {
    const response = await fetch(target, {
      headers: {
        Accept: 'application/json'
      }
    });

    if (!response.ok) {
      return { ok: false, error: `Browser snapshot failed with ${response.status}` };
    }

    const data = await response.json();
    return { ok: true, snapshot: data };
  } catch (error) {
    return { ok: false, error: `Browser snapshot request failed: ${error.message}` };
  }
}

function extractFromSnapshot(url, snapshot) {
  const candidates = collectTextCandidates(snapshot);
  const postText = candidates.find((line) => line.length > 40) || candidates[0] || '';
  const handleMatch = candidates.join('\n').match(/@([A-Za-z0-9_]{1,15})/);
  const replies = candidates
    .filter((line) => line !== postText)
    .slice(0, 5)
    .map((line, index) => ({
      id: `reply-${index + 1}`,
      text: line,
      author: { handle: inferReplyHandle(line, handleMatch?.[1] || null, index) }
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

function collectTextCandidates(snapshot) {
  if (!snapshot) return [];

  if (Array.isArray(snapshot.lines)) {
    return snapshot.lines.map((line) => String(line).trim()).filter(Boolean);
  }

  if (Array.isArray(snapshot.items)) {
    return snapshot.items
      .map((item) => item?.text || item?.name || '')
      .map((line) => String(line).trim())
      .filter(Boolean);
  }

  if (typeof snapshot.text === 'string') {
    return snapshot.text.split('\n').map((line) => line.trim()).filter(Boolean);
  }

  return [];
}

function inferReplyHandle(line, fallback, index) {
  const match = String(line).match(/@([A-Za-z0-9_]{1,15})/);
  if (match) return match[1];
  return index === 0 ? fallback : null;
}

module.exports = { readXThreadWithBrowser, extractFromSnapshot };
