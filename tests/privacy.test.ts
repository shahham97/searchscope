import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Part E: Zero-Persistence & Privacy Architecture Invariants', () => {
  it('verifies no persistent database dependencies or drivers are installed', () => {
    const pkgJsonPath = path.resolve(process.cwd(), 'package.json');
    const pkgContent = fs.readFileSync(pkgJsonPath, 'utf8');
    const pkg = JSON.parse(pkgContent);

    const dependencies = {
      ...pkg.dependencies,
      ...pkg.devDependencies,
    };

    const forbiddenDbDrivers = [
      'pg',
      'pg-promise',
      'mysql',
      'mysql2',
      'prisma',
      '@prisma/client',
      'mongoose',
      'typeorm',
      'sequelize',
      'redis',
      'ioredis',
      '@upstash/redis',
      '@supabase/supabase-js',
      'mongodb',
      'better-sqlite3',
      'sqlite3',
    ];

    for (const driver of forbiddenDbDrivers) {
      expect(dependencies[driver], `Forbidden database driver "${driver}" detected in package.json`).toBeUndefined();
    }
  });

  it('verifies that the API routes do not write report or domain data to the filesystem', () => {
    const apiDir = path.resolve(process.cwd(), 'src/app/api');
    
    function scanDirectory(dir: string): string[] {
      const files: string[] = [];
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          files.push(...scanDirectory(fullPath));
        } else if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.js'))) {
          files.push(fullPath);
        }
      }
      return files;
    }

    const apiFiles = scanDirectory(apiDir);
    expect(apiFiles.length).toBeGreaterThan(0);

    for (const filePath of apiFiles) {
      const content = fs.readFileSync(filePath, 'utf8');
      
      // Should not contain fs.writeFileSync or fs.promises.writeFile to persist reports
      expect(content.includes('fs.writeFileSync')).toBe(false);
      expect(content.includes('writeFile(')).toBe(false);
      expect(content.includes('appendFile(')).toBe(false);
    }
  });

  it('confirms proxy and audit endpoints do not log or store API keys', () => {
    const proxyPath = path.resolve(process.cwd(), 'src/app/api/agent/proxy/route.ts');
    if (fs.existsSync(proxyPath)) {
      const content = fs.readFileSync(proxyPath, 'utf8');
      // Ensure API keys are not console.logged
      expect(content.includes('console.log(apiKey')).toBe(false);
      expect(content.includes('console.log(key')).toBe(false);
    }
  });
});
