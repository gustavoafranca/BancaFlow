import { promises as fs } from 'node:fs';
import path from 'node:path';

const LOG_DIR = '.log';
const LOG_FILE = 'skills.log';

async function pathExists(targetPath) {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function ensureLogDir(rootDir) {
  const logDir = path.join(rootDir, LOG_DIR);
  await fs.mkdir(logDir, { recursive: true });
  return logDir;
}

async function appendToLog(logPath, line) {
  await fs.appendFile(logPath, `${line}\n`, 'utf8');
}

async function ensureGitignoreEntry(rootDir, entry) {
  const gitignorePath = path.join(rootDir, '.gitignore');
  let content = '';

  if (await pathExists(gitignorePath)) {
    content = await fs.readFile(gitignorePath, 'utf8');
  }

  const lines = content.split('\n');
  if (!lines.some((line) => line.trim() === entry)) {
    const separator = content.length > 0 && !content.endsWith('\n') ? '\n' : '';
    await fs.writeFile(gitignorePath, `${content}${separator}${entry}\n`, 'utf8');
  }
}

/**
 * Creates a skill run logger that records execution facts to `.log/skills.log`.
 */
export async function createSkillRunLogger({
  rootDir,
  skillName,
  commandArgs,
  deferGitignoreEnsure,
  gitignoreCreateIfMissing,
}) {
  const logDir = await ensureLogDir(rootDir);
  const logPath = path.join(logDir, LOG_FILE);

  await appendToLog(logPath, `[AI] skill=${skillName} args=${JSON.stringify(commandArgs)}`);

  const logger = {
    async step(message) {
      await appendToLog(logPath, `[AI] ${message}`);
    },

    async success() {
      await appendToLog(logPath, `[AI] skill=${skillName} completed successfully`);
      if (!deferGitignoreEnsure) {
        await ensureGitignoreEntry(rootDir, `${LOG_DIR}/`);
      }
    },

    async failure(error) {
      const msg = (error && error.message) ? error.message : String(error);
      await appendToLog(logPath, `[FAIL] skill=${skillName} error=${msg}`);
      if (!deferGitignoreEnsure) {
        await ensureGitignoreEntry(rootDir, `${LOG_DIR}/`);
      }
    },

    async ensureGitignore() {
      await ensureGitignoreEntry(rootDir, `${LOG_DIR}/`);
    },

    async log(marker, message) {
      await appendToLog(logPath, `[${marker}] ${message}`);
    },
  };

  return logger;
}
