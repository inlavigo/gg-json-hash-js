import { ggJsonHash } from 'gg-json-hash.js';

describe('ggJsonHash', () => {
  it('should log the correct message to the console', () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

    const input = 'testInput';
    ggJsonHash(input);

    expect(consoleSpy).toHaveBeenCalledWith('ggJsonHash!testInput');
    expect(true).toBe(false);
    consoleSpy.mockRestore();
  });
});
