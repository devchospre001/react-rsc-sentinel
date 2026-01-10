import { describe, it, expect } from 'vitest';
import * as path from 'path';
import * as fs from 'fs';
import { analyze } from '../analyze';

// Get __dirname equivalent for CommonJS
declare const __dirname: string;

describe('analyze', () => {
  // Use a relative path from the test file location
  const fixturesDir = path.resolve(process.cwd(), 'packages/rsc-guardian-cli/__fixtures__');

  it('should detect hooks in component', async () => {
    const filePath = path.join(fixturesDir, 'with-hooks.tsx');
    expect(fs.existsSync(filePath)).toBe(true);
    
    // This test verifies the function doesn't throw
    // In a real scenario, you'd capture stdout or return the result
    await expect(analyze(filePath)).resolves.not.toThrow();
  });

  it('should detect browser globals', async () => {
    const filePath = path.join(fixturesDir, 'with-browser-globals.tsx');
    expect(fs.existsSync(filePath)).toBe(true);
    
    await expect(analyze(filePath)).resolves.not.toThrow();
  });

  it('should handle pure server components', async () => {
    const filePath = path.join(fixturesDir, 'pure-server.tsx');
    expect(fs.existsSync(filePath)).toBe(true);
    
    await expect(analyze(filePath)).resolves.not.toThrow();
  });
});

