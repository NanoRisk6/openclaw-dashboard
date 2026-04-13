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

function buildDiscussionSummary(extraction) {
  const post = extraction?.post || null;
  const replies = Array.isArray(extraction?.replies) ? extraction.replies : [];

  return {
    url: extraction?.url || null,
    mode: 'browser-first',
    post,
    replies,
    replyCount: replies.length,
    participants: unique([
      post?.author?.handle,
      ...replies.map((reply) => reply?.author?.handle)
    ]),
    talkingPoints: buildTalkingPoints(post, replies),
    discussionPrompt: buildDiscussionPrompt(post, replies)
  };
}

function buildTalkingPoints(post, replies) {
  const points = [];
  if (post?.text) points.push(`Main claim: ${truncate(post.text, 220)}`);
  if (replies[0]?.text) points.push(`Top visible reply: ${truncate(replies[0].text, 180)}`);
  if (replies.length > 1) points.push(`Visible reply count: ${replies.length}`);
  return points;
}

function buildDiscussionPrompt(post, replies) {
  const author = post?.author?.handle ? `@${post.author.handle}` : 'the author';
  return `We can talk about what ${author} is arguing, whether the replies are supportive or adversarial, and what the thread suggests overall.`;
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function truncate(text, max) {
  const value = String(text || '');
  return value.length > max ? `${value.slice(0, max - 1)}…` : value;
}

module.exports = { normalizeXUrl, buildBrowserReaderPlan, buildDiscussionSummary };
