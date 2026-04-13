const { getMemoryPalace, saveMemoryPalace } = require('../state/store');

async function ensureMemoryPalace(config) {
  const current = await getMemoryPalace(config);
  if (current && Array.isArray(current.rooms)) {
    return current;
  }

  const seeded = createDefaultMemoryPalace();
  await saveMemoryPalace(config, seeded);
  return seeded;
}

function createDefaultMemoryPalace() {
  const now = new Date().toISOString();

  return {
    generatedAt: now,
    importedChats: 0,
    rooms: [
      {
        id: 'ops-room',
        title: 'Ops Room',
        description: 'Runtime health, harness state, and deployment notes.',
        memories: [
          {
            id: 'codex-harness',
            title: 'Codex Harnessing',
            summary: 'Codex can own threads, resume, compaction, and app-server execution when selected.',
            tags: ['codex', 'harness', 'runtime'],
            pinned: true,
            updatedAt: now
          }
        ]
      },
      {
        id: 'dream-room',
        title: 'Dream Room',
        description: 'Imported chats and distilled patterns for later retrieval.',
        memories: []
      }
    ],
    activeMemory: [
      {
        id: 'active-codex',
        title: 'Codex harness available',
        summary: 'Use codex/gpt-5.4 with runtime codex to activate native harnessing.',
        score: 0.98,
        source: 'seed'
      }
    ],
    recentDreams: []
  };
}

module.exports = { ensureMemoryPalace, createDefaultMemoryPalace };
