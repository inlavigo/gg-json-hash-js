// @license
// Copyright (c) 2019 - 2024 Dr. Gabriel Gatzsche. All Rights Reserved.
//
// Use of this source code is governed by terms that can be
// found in the LICENSE file in the root of this package.

import { beforeAll, describe, expect, test } from 'vitest';
import { addHashes, JsonHash } from './gg-json-hash'; // Implement these utilities

const jh = new JsonHash();

describe('JsonHash', () => {
  describe('with a simple json', () => {
    describe('containing only one key value pair', () => {
      test('with a string value', () => {
        const json = addHashes({ key: 'value' });
        expect(json.key).toBe('value');
        const expectedHash = jh.calcHash('{"key":"value"}');
        expect(json._hash).toBe(expectedHash);
        expect(json._hash).toBe('5Dq88zdSRIOcAS-WM_lYYt');
      });

      test('with an int value', () => {
        const json = addHashes({ key: 1 });
        expect(json.key).toBe(1);
        const expectedHash = jh.calcHash('{"key":1}');
        expect(json._hash).toBe(expectedHash);
        expect(json._hash).toBe('t4HVsGBJblqznOBwy6IeLt');
      });

      test('with double value without commas', () => {
        const json = addHashes({ key: 1.0 });
        expect(json.key).toBe(1);
        const expectedHash = jh.calcHash('{"key":1}');
        expect(json._hash).toBe(expectedHash);
        expect(json._hash).toBe('t4HVsGBJblqznOBwy6IeLt');
      });

      test('with a bool value', () => {
        const json = addHashes({ key: true });
        expect(json.key).toBe(true);
        const expectedHash = jh.calcHash('{"key":true}');
        expect(json._hash).toBe(expectedHash);
        expect(json._hash).toBe('dNkCrIe79x2dPyf5fywwYO');
      });

      test('with a long double value', () => {
        const json = addHashes({ key: 1.01234567890123 });
        const expectedHash = jh.calcHash('{"key":1.0123456789}');
        expect(json._hash).toBe(expectedHash);
        expect(json._hash).toBe('Cj6IqsbT9fSKfeVVkytoqA');
      });

      test('with a short double value', () => {
        const json = addHashes({ key: 1.012 });
        const expectedHash = jh.calcHash('{"key":1.012}');
        expect(json._hash).toBe(expectedHash);
        expect(json._hash).toBe('ppGtYoP5iHFqst5bPeAGMf');
      });
    });

    test('existing _hash should be overwritten', () => {
      const json = addHashes({
        key: 'value',
        _hash: 'oldHash',
      });
      expect(json.key).toBe('value');
      const expectedHash = jh.calcHash('{"key":"value"}');
      expect(json._hash).toBe(expectedHash);
      expect(json._hash).toBe('5Dq88zdSRIOcAS-WM_lYYt');
    });

    describe('containing floating point numbers', () => {
      test('truncates the floating point numbers to "hashFloatingPrecision" 10 decimal places', () => {
        const hash0 = addHashes({ key: 1.012345678901 }, true, 9)._hash;

        const hash1 = addHashes({ key: 1.012345678901234 }, true, 9)._hash;

        const expectedHash = jh.calcHash('{"key":1.012345678}');
        expect(hash0).toBe(hash1);
        expect(hash0).toBe(expectedHash);
        expect(hash0).toBe('KTqI1AvWb3gI6dYA5HPPMx');
      });
    });

    describe('containing three key value pairs', () => {
      const json0 = {
        a: 'value',
        b: 1.0,
        c: true,
      };

      const json1 = {
        b: 1.0,
        a: 'value',
        c: true,
      };

      /** @type {Record<string, any>} */
      let j0;

      /** @type {Record<string, any>} */
      let j1;

      beforeAll(() => {
        j0 = addHashes(json0);
        j1 = addHashes(json1);
      });

      test('should create a string of key value pairs and hash it', () => {
        const expectedHash = jh.calcHash('{"a":"value","b":1,"c":true}');

        expect(j0._hash).toBe(expectedHash);
        expect(j1._hash).toBe(expectedHash);
      });

      test('should work independent of key order', () => {
        expect(j0).toEqual(j1);
        expect(j0._hash).toBe(j1._hash);
        expect(true.toString()).toBe('true');
      });
    });
  });

  describe('_truncate(double, precision)', () => {
    // Get the truncate method from privateMethods
    const truncate = jh.privateMethods['_truncate'];

    test('truncates decimals but only if precision exceeds precision', () => {
      expect(truncate(1.0, 5)).toBe(1);
      expect(truncate(1, 5)).toBe(1);

      expect(truncate(1.23456789, 2)).toBe(1.23);
      expect(truncate(1.23456789, 3)).toBe(1.234);
      expect(truncate(1.23456789, 4)).toBe(1.2345);
      expect(truncate(1.23456789, 5)).toBe(1.23456);
      expect(truncate(1.23456789, 6)).toBe(1.234567);
      expect(truncate(1.23456789, 7)).toBe(1.2345678);
      expect(truncate(1.23456789, 8)).toBe(1.23456789);
      expect(truncate(1.12, 1)).toBe(1.1);
      expect(truncate(1.12, 2)).toBe(1.12);
      expect(truncate(1.12, 3)).toBe(1.12);
      expect(truncate(1.12, 4)).toBe(1.12);
    });

    test('does not add additional decimals', () => {
      expect(truncate(1.0, 0)).toBe(1);
      expect(truncate(1.0, 1)).toBe(1.0);
      expect(truncate(1.0, 2)).toBe(1.0);
      expect(truncate(1.0, 3)).toBe(1.0);
    });
  });
});
