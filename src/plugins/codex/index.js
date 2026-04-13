function createBundledCodexPlugin(config) {
  const codexConfig = config?.harness?.codex || {};
  const strictModeConfig = config?.harness?.strictMode || {};

  return {
    id: 'bundled-codex',
    name: 'Bundled Codex Plugin',
    version: '0.1.0',
    enabled: Boolean(codexConfig.enabled),
    pluginEnabled: Boolean(codexConfig.pluginEnabled),
    runtime: codexConfig.runtime || 'pi',
    model: codexConfig.model || null,
    fallback: codexConfig.fallback || null,
    active: isCodexActive(codexConfig),
    capabilities: [
      'model-discovery',
      'native-thread-resume',
      'native-compaction',
      'app-server-execution'
    ],
    strictMode: {
      enabled: Boolean(strictModeConfig.enabled),
      executionContract: strictModeConfig.executionContract || null,
      active: Boolean(strictModeConfig.enabled) && strictModeConfig.executionContract === 'strict-agentic'
    },
    setup: buildSetup(codexConfig, strictModeConfig)
  };
}

function isCodexActive(codexConfig) {
  const model = codexConfig.model || '';
  return Boolean(codexConfig.enabled) && Boolean(codexConfig.pluginEnabled) && (
    /^codex\//i.test(model) || codexConfig.runtime === 'codex'
  );
}

function buildSetup(codexConfig, strictModeConfig) {
  return {
    steps: [
      {
        key: 'enable-plugin',
        title: 'Enable bundled codex plugin',
        done: Boolean(codexConfig.pluginEnabled),
        target: 'plugins.entries.codex.enabled = true'
      },
      {
        key: 'select-model',
        title: 'Select a codex model',
        done: /^codex\//i.test(codexConfig.model || ''),
        target: 'agents.defaults.model = "codex/gpt-5.4"'
      },
      {
        key: 'select-runtime',
        title: 'Select codex embedded harness runtime',
        done: codexConfig.runtime === 'codex',
        target: 'agents.defaults.embeddedHarness = { runtime: "codex", fallback: "none" }'
      },
      {
        key: 'enable-strict-mode',
        title: 'Enable strict agentic execution contract',
        done: strictModeConfig.executionContract === 'strict-agentic',
        target: 'agents.defaults.embeddedPi.executionContract = "strict-agentic"'
      }
    ]
  };
}

module.exports = { createBundledCodexPlugin };
