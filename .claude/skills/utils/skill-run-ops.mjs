import { promises as fs } from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';

async function pathExists(targetPath) {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Creates a skill run operations object with logging support.
 */
export function createSkillRunOps({ rootDir, logger, dryRun }) {
  async function runCommand(cmd, args, cwd) {
    const cmdStr = `${cmd} ${args.join(' ')}`;
    await logger.log('CMD', `${cmdStr} (cwd=${cwd})`);

    if (dryRun) {
      console.log(`[DRY RUN] ${cmdStr}`);
      return;
    }

    return new Promise((resolve, reject) => {
      const child = spawn(cmd, args, {
        cwd,
        stdio: 'inherit',
        shell: process.platform === 'win32',
      });

      child.on('error', (err) => {
        reject(new Error(`Failed to start "${cmdStr}": ${err.message}`));
      });

      child.on('exit', (code) => {
        if (code !== 0) {
          reject(new Error(`Command exited with code ${code}: ${cmdStr}`));
        } else {
          resolve();
        }
      });
    });
  }

  async function writeTextFile(filePath, content, { ensureNewline = false, markRiskOnOverwrite = false, note = '' } = {}) {
    const exists = await pathExists(filePath);
    const marker = exists ? 'FILE_UPDATE' : 'FILE_CREATE';

    if (exists && markRiskOnOverwrite) {
      await logger.log('RISK', `overwriting ${path.relative(rootDir, filePath)}${note ? ` (${note})` : ''}`);
    }

    await fs.mkdir(path.dirname(filePath), { recursive: true });

    let finalContent = content;
    if (ensureNewline && !finalContent.endsWith('\n')) {
      finalContent += '\n';
    }

    await fs.writeFile(filePath, finalContent, 'utf8');
    await logger.log(marker, `${path.relative(rootDir, filePath)}${note ? ` (${note})` : ''}`);
  }

  async function writeJsonFile(filePath, data, { note = '', markRiskOnOverwrite = false } = {}) {
    const content = `${JSON.stringify(data, null, 2)}\n`;
    await writeTextFile(filePath, content, { ensureNewline: false, markRiskOnOverwrite, note });
  }

  async function ensureDir(dirPath, { note = '' } = {}) {
    const exists = await pathExists(dirPath);
    if (!exists) {
      await fs.mkdir(dirPath, { recursive: true });
      await logger.log('DIR_CREATE', `${path.relative(rootDir, dirPath)}${note ? ` (${note})` : ''}`);
    }
  }

  async function removePath(targetPath, { recursive = false, force = false, markRisk = false, note = '' } = {}) {
    const exists = await pathExists(targetPath);
    if (!exists) return;

    const rel = path.relative(rootDir, targetPath);

    if (markRisk) {
      await logger.log('RISK', `removing ${rel}${note ? ` (${note})` : ''}`);
    }

    await fs.rm(targetPath, { recursive, force });
    await logger.log('FILE_DELETE', `${rel}${note ? ` (${note})` : ''}`);
  }

  return {
    runCommand,
    writeTextFile,
    writeJsonFile,
    ensureDir,
    removePath,
  };
}
