const { createApp } = require('./server/app');
const { startCollectorLoop, runCollectionCycle } = require('./collector');
const { loadConfig } = require('./config');
const { ensureMemoryPalace } = require('./memory-palace');
const { createBundledCodexPlugin } = require('./plugins/codex');

async function main() {
  const config = loadConfig();
  config.plugins = {
    codex: createBundledCodexPlugin(config)
  };
  await ensureMemoryPalace(config);

  if (process.argv.includes('--collect-once')) {
    const snapshot = await runCollectionCycle(config);
    console.log(JSON.stringify(snapshot, null, 2));
    return;
  }

  const app = createApp(config);
  app.listen(config.server.port, () => {
    console.log(`[clawops] server listening on http://localhost:${config.server.port}`);
  });

  startCollectorLoop(config);
}

main().catch((error) => {
  console.error('[clawops] fatal error', error);
  process.exit(1);
});
