import { describe, expect, it } from 'vitest';

import * as extractStructure from '../../../understand-anything-plugin/skills/understand/extract-structure-result.mjs';

describe('extract-structure analysis outcomes', () => {
  it('records final structure and call-graph exceptions after full-analysis fallback', () => {
    expect(extractStructure.analyzeFileWithOutcomes).toBeTypeOf('function');
    const registry = {
      analyzeFileFull() {
        throw new Error('combined parser failed');
      },
      analyzeFile() {
        throw new Error('structure parser failed');
      },
      extractCallGraph() {
        throw new Error('call graph failed');
      },
    };

    expect(
      extractStructure.analyzeFileWithOutcomes(
        registry,
        { path: 'src/failing.ts', fileCategory: 'code' },
        'export const value = 1;\n',
      ),
    ).toEqual({
      analysis: null,
      callGraph: null,
      structureOutcome: 'failed',
      callGraphOutcome: 'failed',
    });
  });

  it('does not count missing parser return values as successful analysis', () => {
    const registry = {
      analyzeFileFull() {
        return undefined;
      },
      analyzeFile() {
        return undefined;
      },
      extractCallGraph() {
        return undefined;
      },
    };

    expect(
      extractStructure.analyzeFileWithOutcomes(
        registry,
        { path: 'src/missing.ts', fileCategory: 'code' },
        'export const value = 1;\n',
      ),
    ).toMatchObject({
      structureOutcome: 'failed',
      callGraphOutcome: 'failed',
    });
  });
});
