const { exec } = require('child_process');

function runCommand(command, config) {
  return new Promise((resolve) => {
    exec(command, {
      cwd: process.cwd(),
      timeout: config.collector.commandTimeoutMs,
      maxBuffer: 1024 * 1024,
      env: {
        ...process.env,
        FORCE_COLOR: '0',
        NO_COLOR: '1'
      }
    }, (error, stdout, stderr) => {
      const normalizedStdout = stdout || '';
      const normalizedStderr = stderr || '';
      const likelyCliNoiseFailure = Boolean(error) && !normalizedStdout && !normalizedStderr;

      resolve({
        command,
        code: error && typeof error.code === 'number' ? error.code : 0,
        stdout: normalizedStdout,
        stderr: normalizedStderr,
        error: likelyCliNoiseFailure ? null : error ? error.message : null
      });
    });
  });
}

module.exports = { runCommand };
