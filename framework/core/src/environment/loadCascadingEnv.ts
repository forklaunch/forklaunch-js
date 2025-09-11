import { existsSync } from 'fs';
import { dirname, resolve } from 'path';

/**
 * Gets cascading environment file paths: root .env.local -> project .env
 * Root detection uses: .forklaunch/manifest.toml
 */
export function getCascadingEnvPaths(
  projectEnvPath: string | undefined,
  projectRoot: string = process.cwd()
): {
  rootEnvExists: boolean;
  projectEnvExists: boolean;
  rootEnvPath?: string;
  projectEnvFilePath?: string;
  loadOrder: string[];
} {
  const result = {
    rootEnvExists: false,
    projectEnvExists: false,
    rootEnvPath: undefined as string | undefined,
    projectEnvFilePath: undefined as string | undefined,
    loadOrder: [] as string[]
  };

  const applicationRoot = findApplicationRoot(projectRoot);

  const rootEnvPath = resolve(applicationRoot, '.env.local');
  if (existsSync(rootEnvPath)) {
    result.rootEnvExists = true;
    result.rootEnvPath = rootEnvPath;
    result.loadOrder.push(rootEnvPath);
  }

  if (projectEnvPath) {
    const fullProjectEnvPath = resolve(projectRoot, projectEnvPath);
    if (existsSync(fullProjectEnvPath)) {
      result.projectEnvExists = true;
      result.projectEnvFilePath = fullProjectEnvPath;
      result.loadOrder.push(fullProjectEnvPath);
    }
  }

  return result;
}

/**
 * Loads environment variables with cascading precedence: root .env.local -> project .env
 * If projectEnvPath is undefined, only loads root .env.local
 */
export function loadCascadingEnv(
  projectEnvPath: string | undefined,
  dotenvConfig: (options: { path: string; override?: boolean }) => {
    error?: Error;
  },
  projectRoot: string = process.cwd()
): {
  rootEnvLoaded: boolean;
  projectEnvLoaded: boolean;
  rootEnvPath?: string;
  projectEnvFilePath?: string;
} {
  const paths = getCascadingEnvPaths(projectEnvPath, projectRoot);
  const result = {
    rootEnvLoaded: false,
    projectEnvLoaded: false,
    rootEnvPath: paths.rootEnvPath,
    projectEnvFilePath: paths.projectEnvFilePath
  };

  if (paths.rootEnvExists && paths.rootEnvPath) {
    const rootResult = dotenvConfig({ path: paths.rootEnvPath });
    result.rootEnvLoaded = !rootResult?.error;
  }

  if (paths.projectEnvExists && paths.projectEnvFilePath) {
    const projectResult = dotenvConfig({
      path: paths.projectEnvFilePath,
      override: true
    });
    result.projectEnvLoaded = !projectResult?.error;
  }

  return result;
}

/**
 * Finds application root by looking for .forklaunch/manifest.toml
 */
function findApplicationRoot(startPath: string): string {
  let currentPath = resolve(startPath);

  const maxDepth = 10;
  let depth = 0;

  while (depth < maxDepth) {
    const forklaunchManifest = resolve(
      currentPath,
      '.forklaunch',
      'manifest.toml'
    );
    if (existsSync(forklaunchManifest)) {
      return currentPath;
    }

    const parentPath = dirname(currentPath);
    if (parentPath === currentPath) {
      break;
    }

    currentPath = parentPath;
    depth++;
  }

  return currentPath;
}
