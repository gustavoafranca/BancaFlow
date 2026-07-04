import { promises as fs } from 'node:fs';
import path from 'node:path';

const DEFAULT_SKILL_CONFIG = {
  namespace: '@app',
  frontendAppPath: 'apps/web',
  backendAppPath: 'apps/api',
  frontendPort: 3000,
  backendPort: 4000,
  frontendApiUrlEnvVar: 'NEXT_PUBLIC_API_URL',
  backendPortEnvVar: 'PORT',
};

async function pathExists(targetPath) {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Loads skills.config.json from the standard search paths.
 * Returns an object with `defaults` merged over the built-in defaults.
 */
export async function loadSkillConfig(rootDir) {
  const searchPaths = [
    path.join(rootDir, '.claude', 'skills', 'skills.config.json'),
    path.join(rootDir, '.claude', 'skills.config.json'),
    path.join(rootDir, 'skills.config.json'),
  ];

  for (const configPath of searchPaths) {
    if (await pathExists(configPath)) {
      try {
        const raw = await fs.readFile(configPath, 'utf8');
        const config = JSON.parse(raw);
        return {
          defaults: { ...DEFAULT_SKILL_CONFIG, ...config },
          configPath,
        };
      } catch (err) {
        console.warn(`Warning: failed to parse skills.config.json at ${configPath}: ${err.message}`);
      }
    }
  }

  return { defaults: { ...DEFAULT_SKILL_CONFIG }, configPath: null };
}

/**
 * Resolves the namespace/scope to use.
 * Priority: CLI arg > fallback from config > root package.json > built-in default.
 */
export async function resolveNamespace({ rootDir, cliScope, fallbackScope }) {
  if (cliScope && typeof cliScope === 'string' && cliScope.trim()) {
    return { scope: cliScope.trim() };
  }

  if (fallbackScope && typeof fallbackScope === 'string' && fallbackScope.trim()) {
    return { scope: fallbackScope.trim() };
  }

  const packageJsonPath = path.join(rootDir, 'package.json');
  if (await pathExists(packageJsonPath)) {
    try {
      const raw = await fs.readFile(packageJsonPath, 'utf8');
      const pkg = JSON.parse(raw);
      if (typeof pkg.name === 'string' && pkg.name.includes('/')) {
        const [scope] = pkg.name.split('/');
        if (scope && scope.startsWith('@')) {
          return { scope };
        }
      }
    } catch {
      // ignore parse errors
    }
  }

  return { scope: '@app' };
}
