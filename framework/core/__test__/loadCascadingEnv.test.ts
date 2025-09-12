import { existsSync, mkdirSync, rmdirSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import {
  getCascadingEnvPaths,
  loadCascadingEnv
} from '../src/environment/loadCascadingEnv';

describe('loadCascadingEnv', () => {
  let tempDir: string;
  let projectDir: string;
  let rootDir: string;

  beforeEach(() => {
    tempDir = join(tmpdir(), `forklaunch-test-${Date.now()}`);
    rootDir = join(tempDir, 'root');
    projectDir = join(rootDir, 'src', 'project');

    mkdirSync(projectDir, { recursive: true });
  });

  afterEach(() => {
    if (existsSync(tempDir)) {
      rmdirSync(tempDir, { recursive: true });
    }
  });

  describe('getCascadingEnvPaths', () => {
    test('should return empty result when no env files exist', () => {
      const result = getCascadingEnvPaths(undefined, projectDir);

      expect(result.rootEnvExists).toBe(false);
      expect(result.projectEnvExists).toBe(false);
      expect(result.loadOrder).toEqual([]);
    });

    test('should find root .env.local when it exists', () => {
      mkdirSync(join(rootDir, '.forklaunch'), { recursive: true });
      writeFileSync(
        join(rootDir, '.forklaunch', 'manifest.toml'),
        'test = "value"'
      );
      writeFileSync(join(rootDir, '.env.local'), 'ROOT_VAR=root_value');

      const result = getCascadingEnvPaths(undefined, projectDir);

      expect(result.rootEnvExists).toBe(true);
      expect(result.rootEnvPath).toBe(join(rootDir, '.env.local'));
      expect(result.loadOrder).toEqual([join(rootDir, '.env.local')]);
    });

    test('should find both root and project env files', () => {
      mkdirSync(join(rootDir, '.forklaunch'), { recursive: true });
      writeFileSync(
        join(rootDir, '.forklaunch', 'manifest.toml'),
        'test = "value"'
      );
      writeFileSync(join(rootDir, '.env.local'), 'ROOT_VAR=root_value');
      writeFileSync(join(projectDir, '.env'), 'PROJECT_VAR=project_value');

      const result = getCascadingEnvPaths('.env', projectDir);

      expect(result.rootEnvExists).toBe(true);
      expect(result.projectEnvExists).toBe(true);
      expect(result.loadOrder).toEqual([
        join(rootDir, '.env.local'),
        join(projectDir, '.env')
      ]);
    });
  });

  describe('loadCascadingEnv', () => {
    test('should load root .env.local successfully', () => {
      mkdirSync(join(rootDir, '.forklaunch'), { recursive: true });
      writeFileSync(
        join(rootDir, '.forklaunch', 'manifest.toml'),
        'test = "value"'
      );
      writeFileSync(join(rootDir, '.env.local'), 'ROOT_VAR=root_value');

      const result = loadCascadingEnv(undefined, projectDir);

      expect(result.rootEnvLoaded).toBe(true);
      expect(result.projectEnvLoaded).toBe(false);
      expect(result.rootEnvPath).toBe(join(rootDir, '.env.local'));
      expect(process.env.ROOT_VAR).toBe('root_value');
    });

    test('should load both root and project env files', () => {
      mkdirSync(join(rootDir, '.forklaunch'), { recursive: true });
      writeFileSync(
        join(rootDir, '.forklaunch', 'manifest.toml'),
        'test = "value"'
      );
      writeFileSync(join(rootDir, '.env.local'), 'ROOT_VAR=root_value');
      writeFileSync(join(projectDir, '.env'), 'PROJECT_VAR=project_value');

      const result = loadCascadingEnv('.env', projectDir);

      expect(result.rootEnvLoaded).toBe(true);
      expect(result.projectEnvLoaded).toBe(true);
      expect(process.env.ROOT_VAR).toBe('root_value');
      expect(process.env.PROJECT_VAR).toBe('project_value');
    });

    test('should handle project env override correctly', () => {
      mkdirSync(join(rootDir, '.forklaunch'), { recursive: true });
      writeFileSync(
        join(rootDir, '.forklaunch', 'manifest.toml'),
        'test = "value"'
      );
      writeFileSync(join(rootDir, '.env.local'), 'SHARED_VAR=root_value');
      writeFileSync(join(projectDir, '.env'), 'SHARED_VAR=project_value');

      const result = loadCascadingEnv('.env', projectDir);

      expect(result.rootEnvLoaded).toBe(true);
      expect(result.projectEnvLoaded).toBe(true);
      expect(process.env.SHARED_VAR).toBe('project_value');
    });

    test('should handle missing env files gracefully', () => {
      mkdirSync(join(rootDir, '.forklaunch'), { recursive: true });
      writeFileSync(
        join(rootDir, '.forklaunch', 'manifest.toml'),
        'test = "value"'
      );

      const result = loadCascadingEnv('.env', projectDir);

      expect(result.rootEnvLoaded).toBe(false);
      expect(result.projectEnvLoaded).toBe(false);
    });
  });
});
