const { execFile } = require('child_process');
const { promisify } = require('util');
const execFileAsync = promisify(execFile);
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
  try {
    await runBrowser(['start']);
    await runBrowser(['open', url]);
    await runBrowser(['wait', '--time', '3000']);
    const snapshot = await runBrowser(['snapshot', '--json']);
    return { ok: true, snapshot: JSON.parse(snapshot.stdout || '{}') };
  } catch (error) {
    return { ok: false, error: `Browser extraction failed: ${error.message}` };
  }
}

async function runBrowser(args) {
  return execFileAsync('openclaw', ['browser', ...args], {
    timeout: 45000,
    maxBuffer: 1024 * 1024 * 4,
    env: {
      ...process.env,
      NO_COLOR: '1',
      FORCE_COLOR: '0'
    }
  });
}

function extractFromSnapshot(url, snapshot) {
  const candidates = collectTextCandidates(snapshot);
  const postText = candidates.find((line) => line.length > 40) || candidates[0] || '';
  const handleMatch = candidates.join('\n').match(/@([A-Za-z0-9_]{1,15})/);
  const replies = candidates
    .filter((line) => line !== postText)
    .filter((line) => !/^Home$|^Explore$|^Notifications$|^Messages$/i.test(line))
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

  if (Array.isArray(snapshot.items)) {
    return snapshot.items
      .flatMap((item) => [item?.text, item?.name, item?.description])
      .map((line) => String(line || '').trim())
      .filter(Boolean);
  }

  if (Array.isArray(snapshot.lines)) {
    return snapshot.lines.map((line) => String(line).trim()).filter(Boolean);
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

module.exports = { readXThreadWithBrowser, extractFromSnapshot, collectTextCandidates };
