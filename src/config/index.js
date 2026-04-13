function loadConfig() {
  const port = Number(process.env.PORT || 4310);
  const intervalMs = Number(process.env.CLAWOPS_POLL_MS || 30000);
  const commandTimeoutMs = Number(process.env.CLAWOPS_COMMAND_TIMEOUT_MS || 12000);

  return {
    server: {
      port: Number.isFinite(port) && port > 0 ? port : 4310
    },
    collector: {
      intervalMs: Number.isFinite(intervalMs) && intervalMs >= 5000 ? intervalMs : 30000,
      commandTimeoutMs: Number.isFinite(commandTimeoutMs) && commandTimeoutMs >= 1000 ? commandTimeoutMs : 12000
    },
    paths: {
      dataDir: process.env.CLAWOPS_DATA_DIR || 'clawops/data'
    },
    harness: {
      codex: {
        enabled: parseBoolean(process.env.CLAWOPS_CODEX_ENABLED, true),
        pluginEnabled: parseBoolean(process.env.OPENCLAW_CODEX_PLUGIN_ENABLED, false),
        model: process.env.OPENCLAW_DEFAULT_MODEL || process.env.CLAWOPS_CODEX_MODEL || null,
        runtime: process.env.OPENCLAW_EMBEDDED_HARNESS_RUNTIME || null,
        fallback: process.env.OPENCLAW_EMBEDDED_HARNESS_FALLBACK || null
      },
      strictMode: {
        enabled: parseBoolean(process.env.CLAWOPS_STRICT_MODE_ENABLED, true),
        executionContract: process.env.OPENCLAW_EXECUTION_CONTRACT || process.env.CLAWOPS_EXECUTION_CONTRACT || null,
        agenticMode: process.env.OPENCLAW_AGENTIC_MODE || null
      }
    }
  };
}

function parseBoolean(value, defaultValue) {
  if (value === undefined || value === null || value === '') return defaultValue;
  if (typeof value === 'boolean') return value;

  const normalized = String(value).trim().toLowerCase();
  if (['1', 'true', 'yes', 'on'].includes(normalized)) return true;
  if (['0', 'false', 'no', 'off'].includes(normalized)) return false;
  return defaultValue;
}

module.exports = { loadConfig };
