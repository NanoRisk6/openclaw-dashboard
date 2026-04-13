const fs = require('fs/promises');
const path = require('path');

async function ensureDataDir(config) {
  const dir = path.resolve(config.paths.dataDir);
  await fs.mkdir(dir, { recursive: true });
  return dir;
}

async function saveSnapshot(config, snapshot) {
  const dir = await ensureDataDir(config);
  const file = path.join(dir, 'latest-status.json');
  const tempFile = `${file}.tmp`;
  await fs.writeFile(tempFile, JSON.stringify(snapshot, null, 2));
  await fs.rename(tempFile, file);
}

async function getLatestSnapshot(config) {
  try {
    const dir = await ensureDataDir(config);
    const file = path.join(dir, 'latest-status.json');
    const raw = await fs.readFile(file, 'utf8');
    return JSON.parse(raw);
  } catch (_error) {
    return null;
  }
}

async function getMemoryPalace(config) {
  try {
    const dir = await ensureDataDir(config);
    const file = path.join(dir, 'memory-palace.json');
    const raw = await fs.readFile(file, 'utf8');
    return JSON.parse(raw);
  } catch (_error) {
    return {
      generatedAt: null,
      importedChats: 0,
      rooms: [],
      activeMemory: [],
      recentDreams: []
    };
  }
}

async function saveMemoryPalace(config, payload) {
  const dir = await ensureDataDir(config);
  const file = path.join(dir, 'memory-palace.json');
  const tempFile = `${file}.tmp`;
  await fs.writeFile(tempFile, JSON.stringify(payload, null, 2));
  await fs.rename(tempFile, file);
}

module.exports = { saveSnapshot, getLatestSnapshot, getMemoryPalace, saveMemoryPalace };
