const { collectSnapshot } = require('./snapshot');
const { saveSnapshot } = require('../state/store');

let collectionInFlight = false;

async function runCollectionCycle(config) {
  const snapshot = await collectSnapshot(config);
  await saveSnapshot(config, snapshot);
  return snapshot;
}

async function safeRunCollectionCycle(config) {
  if (collectionInFlight) {
    return null;
  }

  collectionInFlight = true;
  try {
    return await runCollectionCycle(config);
  } finally {
    collectionInFlight = false;
  }
}

function startCollectorLoop(config) {
  safeRunCollectionCycle(config).catch((error) => {
    console.error('[clawops] initial collection failed', error);
  });

  setInterval(() => {
    safeRunCollectionCycle(config).catch((error) => {
      console.error('[clawops] collection failed', error);
    });
  }, config.collector.intervalMs);
}

module.exports = { startCollectorLoop, runCollectionCycle, safeRunCollectionCycle };
