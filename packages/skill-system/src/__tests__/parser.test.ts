import { describe, it, expect } from 'vitest';
import { parseSkillFile, scanSkillsDir } from '../parser.js';
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

describe('Skill Parser', () => {
  it('should parse basic skill metadata correctly from file', () => {
    const rawContent = `---
name: "Product Design"
description: "Creates POD product designs"
triggers: ["pod", "design"]
ecc:
  mode: "prototype"
  scenario: "ecommerce"
---

## Instructions
Write a POD design script.
`.trim();
    
    // Create a temporary file
    const tempDir = join(__dirname, '__temp__');
    mkdirSync(tempDir, { recursive: true });
    const filePath = join(tempDir, 'SKILL.md');
    writeFileSync(filePath, rawContent);

    const result = parseSkillFile(filePath);
    expect(result.name).toBe('Product Design');
    expect(result.triggers).toContain('pod');
    expect(result.mode).toBe('prototype');
    expect(result.body).toContain('Write a POD design script.');
  });
});
