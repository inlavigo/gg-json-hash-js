import { describe, it } from 'vitest';
import { ggJsonHash } from './gg-json-hash.js';

describe('ggJsonHash', () => {
  it('should log the correct message to the console', () => {
    ggJsonHash('test');
  });
});
