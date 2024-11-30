// @license
// Copyright (c) 2019 - 2024 Dr. Gabriel Gatzsche. All Rights Reserved.
//
// Use of this source code is governed by terms that can be
// found in the LICENSE file in the root of this package.

import { beforeEach, expect, suite, test } from 'vitest';
import { JsonHash, addHashes } from './gg-json-hash';

const jh = new JsonHash({});

suite('JsonHash', () => {
  suite('with a simple json', () => {
    suite('containing only one key value pair', () => {
      test('with a string value', () => {
        const json = addHashes({ key: 'value' });
        expect(json.key).toEqual('value');
        const expectedHash = jh.calcHash('{"key":"value"}');
        expect(json._hash).toEqual(expectedHash);
        expect(json._hash).toEqual('5Dq88zdSRIOcAS-WM_lYYt');
      });

      test('with a int value', () => {
        const json = addHashes({ key: 1 });
        expect(json.key).toEqual(1);
        const expectedHash = jh.calcHash('{"key":1}');
        expect(json._hash).toEqual(expectedHash);
        expect(json._hash).toEqual('t4HVsGBJblqznOBwy6IeLt');
      });

      test('with a double value without commas', () => {
        const json = addHashes({ key: 1.0 });
        expect(json.key).toEqual(1);
        const expectedHash = jh.calcHash('{"key":1}');
        expect(json._hash).toEqual(expectedHash);
        expect(json._hash).toEqual('t4HVsGBJblqznOBwy6IeLt');
      });

      test('with a bool value', () => {
        const json = addHashes({ key: true });
        expect(json.key).toEqual(true);
        const expectedHash = jh.calcHash('{"key":true}');
        expect(json._hash).toEqual(expectedHash);
        expect(json._hash).toEqual('dNkCrIe79x2dPyf5fywwYO');
      });

      test('with a long double value', () => {
        // eslint-disable-next-line no-loss-of-precision
        const json = addHashes({ key: 1.0123456789012345 });
        const expectedHash = jh.calcHash('{"key":1.0123456789}');
        expect(json._hash).toEqual(expectedHash);
        expect(json._hash).toEqual('Cj6IqsbT9fSKfeVVkytoqA');
      });

      test('with a short double value', () => {
        const json = addHashes({ key: 1.012 });
        const expectedHash = jh.calcHash('{"key":1.012}');
        expect(json._hash).toEqual(expectedHash);
        expect(json._hash).toEqual('ppGtYoP5iHFqst5bPeAGMf');
      });
    });

    test('existing _hash should be overwritten', () => {
      const json = addHashes({
        key: 'value',
        _hash: 'oldHash',
      });
      expect(json.key).toEqual('value');
      const expectedHash = jh.calcHash('{"key":"value"}');
      expect(json._hash).toEqual(expectedHash);
      expect(json._hash).toEqual('5Dq88zdSRIOcAS-WM_lYYt');
    });

    suite('containing floating point numbers', () => {
      test('truncates the floating point numbers to "hashFloatingPrecision" 10 decimal places', () => {
        const hash0 = addHashes(
          // eslint-disable-next-line no-loss-of-precision
          { key: 1.01234567890123456789 },
          { floatingPointPrecision: 9 },
        )._hash;

        const hash1 = addHashes(
          // eslint-disable-next-line no-loss-of-precision
          { key: 1.01234567890123456389 },
          { floatingPointPrecision: 9 },
        )._hash;
        const expectedHash = jh.calcHash('{"key":1.012345678}');

        expect(hash0).toEqual(hash1);
        expect(hash0).toEqual(expectedHash);
        expect(hash0).toEqual('KTqI1AvWb3gI6dYA5HPPMx');
      });
    });

    suite('containing three key value pairs', () => {
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

      /** @type Record<String, any> */
      let j0;

      /** @type Record<String, any> */
      let j1;

      beforeEach(() => {
        j0 = addHashes(json0);
        j1 = addHashes(json1);
      });

      test('should create a string of key value pairs and hash it', () => {
        const expectedHash = jh.calcHash('{"a":"value","b":1,"c":true}');

        expect(j0._hash).toEqual(expectedHash);
        expect(j1._hash).toEqual(expectedHash);
      });

      test('should sort work independent of key order', () => {
        expect(j0).toEqual(j1);
        expect(j0._hash).toEqual(j1._hash);
        expect(true.toString()).toEqual('true');
      });
    });
  });

  suite('with a nested json', () => {
    test('of level 1', () => {
      const parent = addHashes({
        key: 'value',
        child: {
          key: 'value',
        },
      });

      const child = parent.child;
      const childHash = jh.calcHash('{"key":"value"}');
      expect(child._hash).toEqual(childHash);

      const parentHash = jh.calcHash(`{"child":"${childHash}","key":"value"}`);

      expect(parent._hash).toEqual(parentHash);
    });

    test('of level 2', () => {
      const parent = addHashes({
        key: 'value',
        child: {
          key: 'value',
          grandChild: {
            key: 'value',
          },
        },
      });

      const grandChild = parent.child.grandChild;
      const grandChildHash = jh.calcHash('{"key":"value"}');
      expect(grandChild._hash).toEqual(grandChildHash);

      const child = parent.child;
      const childHash = jh.calcHash(
        `{"grandChild":"${grandChildHash}","key":"value"}`,
      );
      expect(child._hash).toEqual(childHash);

      const parentHash = jh.calcHash(`{"child":"${childHash}","key":"value"}`);
      expect(parent._hash).toEqual(parentHash);
    });
  });

  test('with complete json example', () => {
    const json = JSON.parse(exampleJson);
    const hashedJson = addHashes(json);

    const hashedJsonString = JSON.stringify(hashedJson, null, 2);
    expect(hashedJsonString).toEqual(exampleJsonWithHashes);
  });

  suite('with an array', () => {
    suite('on top level', () => {
      suite('containing only simple types', () => {
        test('should convert all values to strings and hash it', () => {
          const json = addHashes({
            key: ['value', 1.0, true],
          });

          const expectedHash = jh.calcHash('{"key":["value",1,true]}');

          expect(json._hash).toEqual(expectedHash);
          expect(json._hash).toEqual('nbNb1YfpgqnPfyFTyCQ5YF');
        });
      });

      suite('containing nested objects', () => {
        suite('should hash the nested objects', () => {
          suite('and use the hash instead of the stringified value', () => {
            test('with a complicated array', () => {
              const json = addHashes({
                array: [
                  'key',
                  1.0,
                  true,
                  { key1: 'value1' },
                  { key0: 'value0' },
                ],
              });

              const h0 = jh.calcHash('{"key0":"value0"}');
              const h1 = jh.calcHash('{"key1":"value1"}');
              const expectedHash = jh.calcHash(
                `{"array":["key",1,true,"${h1}","${h0}"]}`,
              );

              expect(json._hash).toEqual(expectedHash);
              expect(json._hash).toEqual('13h_Z0wZCF4SQsTyMyq5dV');
            });

            test('with a simple array', () => {
              const json = addHashes({
                array: [{ key: 'value' }],
              });

              const itemHash = jh.calcHash('{"key":"value"}');
              const array = json.array;
              const item0 = array[0];
              expect(item0._hash).toEqual(itemHash);
              expect(itemHash).toEqual('5Dq88zdSRIOcAS-WM_lYYt');

              const expectedHash = jh.calcHash(`{"array":["${itemHash}"]}`);

              expect(json._hash).toEqual(expectedHash);
              expect(json._hash).toEqual('zYcZBAUGLgR0ygMxi0V5ZT');
            });
          });
        });
      });

      suite('containing nested arrays', () => {
        test('should hash the nested arrays', () => {
          const json = addHashes({
            array: [['key', 1.0, true], 'hello'],
          });

          const jsonHash = jh.calcHash('{"array":[["key",1,true],"hello"]}');

          expect(json._hash).toEqual(jsonHash);
          expect(json._hash).toEqual('1X_6COC1sP5ECuHvKtVoDT');
        });
      });
    });
  });

  suite('throws', () => {
    test('when data contains an unsupported type', () => {
      let message;

      try {
        addHashes({
          key: new Error(),
        });
      } catch (/** @type any */ e) {
        message = e.toString();
      }

      expect(message).toEqual('Error: Unsupported type: object');
    });
  });

  suite('private methods', () => {
    suite('_copyJson', () => {
      const copyJson = JsonHash.privateMethods._copyJson;

      test('empty json', () => {
        expect(copyJson({})).toEqual({});
      });

      test('simple value', () => {
        expect(copyJson({ a: 1 })).toEqual({ a: 1 });
      });

      test('nested value', () => {
        expect(
          copyJson({
            a: { b: 1 },
          }),
        ).toEqual({
          a: { b: 1 },
        });
      });

      test('list value', () => {
        expect(
          copyJson({
            a: [1, 2],
          }),
        ).toEqual({
          a: [1, 2],
        });
      });

      test('list with list', () => {
        expect(
          copyJson({
            a: [[1, 2]],
          }),
        ).toEqual({
          a: [[1, 2]],
        });
      });

      test('list with map', () => {
        expect(
          copyJson({
            a: [{ b: 1 }],
          }),
        ).toEqual({
          a: [{ b: 1 }],
        });
      });

      suite('throws', () => {
        suite('on unsupported type', () => {
          test('in map', () => {
            let message;
            try {
              copyJson({
                a: new Error(),
              });
            } catch (/** @type any */ e) {
              message = e.toString();
            }

            expect(message).toEqual('Error: Unsupported type: object');
          });

          test('in list', () => {
            let message;
            try {
              copyJson({
                a: [new Error()],
              });
            } catch (/** @type any */ e) {
              message = e.toString();
            }

            expect(message).toEqual('Error: Unsupported type: object');
          });
        });
      });
    });

    suite('_isBasicType', () => {
      const isBasicType = JsonHash.privateMethods._isBasicType;

      test('returns true if type is a basic type', () => {
        expect(isBasicType(1)).toEqual(true);
        expect(isBasicType(1.0)).toEqual(true);
        expect(isBasicType('1')).toEqual(true);
        expect(isBasicType(true)).toEqual(true);
        expect(isBasicType(false)).toEqual(true);
        expect(isBasicType(new Set())).toEqual(false);
      });
    });

    suite('_truncate(double, precision)', () => {
      const truncate = JsonHash.privateMethods._truncate;

      test('truncates commas but only if precision exceeds precision', () => {
        expect(truncate(1.0, 5)).toEqual(1);
        expect(truncate(1, 5)).toEqual(1);

        expect(truncate(1.23456789, 2)).toEqual(1.23);
        expect(truncate(1.23456789, 3)).toEqual(1.234);
        expect(truncate(1.23456789, 4)).toEqual(1.2345);
        expect(truncate(1.23456789, 5)).toEqual(1.23456);
        expect(truncate(1.23456789, 6)).toEqual(1.234567);
        expect(truncate(1.23456789, 7)).toEqual(1.2345678);
        expect(truncate(1.23456789, 8)).toEqual(1.23456789);
        expect(truncate(1.12, 1)).toEqual(1.1);
        expect(truncate(1.12, 2)).toEqual(1.12);
        expect(truncate(1.12, 3)).toEqual(1.12);
        expect(truncate(1.12, 4)).toEqual(1.12);
      });

      test('does not add additional commas', () => {
        expect(truncate(1.000001, 0)).toEqual(1);
        expect(truncate(1.0, 0)).toEqual(1);
        expect(truncate(1.0, 1)).toEqual(1.0);
        expect(truncate(1.0, 2)).toEqual(1.0);
        expect(truncate(1.0, 3)).toEqual(1.0);
      });
    });

    suite('_jsonString(map)', () => {
      const jsonString = JsonHash.privateMethods._jsonString;

      test('converts a map into a json string', () => {
        expect(jsonString({ a: 1 })).toEqual('{"a":1}');
        expect(jsonString({ a: 'b' })).toEqual('{"a":"b"}');
        expect(jsonString({ a: true })).toEqual('{"a":true}');
        expect(jsonString({ a: false })).toEqual('{"a":false}');
        expect(jsonString({ a: 1.0 })).toEqual('{"a":1}');
        expect(jsonString({ a: 1.0 })).toEqual('{"a":1}');
        expect(
          jsonString({
            a: [1, 2],
          }),
        ).toEqual('{"a":[1,2]}');
        expect(
          jsonString({
            a: { b: 1 },
          }),
        ).toEqual('{"a":{"b":1}}');
      });

      test('throws when unsupported type', () => {
        let message;
        try {
          jsonString({ a: new Error() });
        } catch (/** @type any */ e) {
          message = e.toString();
        }

        expect(message).toEqual('Error: Unsupported type: object');
      });
    });

    suite('_convertBasicType(string)', () => {
      const _convertBasicType = JsonHash.privateMethods._convertBasicType;
      test('with a string', () => {
        expect(_convertBasicType('hello', 5)).toEqual('hello');
      });

      test('with an int', () => {
        expect(_convertBasicType(10, 5)).toEqual(10);
      });

      test('with an double', () => {
        expect(_convertBasicType(10.000000001, 5)).toEqual(10);
      });

      test('with a double', () => {
        expect(_convertBasicType(true, 5)).toEqual(true);
      });

      test('with an non basic type', () => {
        let message = '';
        try {
          _convertBasicType(new Set(), 5);
        } catch (/** @type any */ e) {
          message = e.toString();
        }

        expect(message).toEqual('Error: Unsupported type: object');
      });
    });
  });

  suite('applyToString()', () => {
    test('should add the hash to the json string', () => {
      const json = '{"key": "value"}';
      const jsonString = new JsonHash({}).applyToString(json);
      expect(jsonString).toEqual(
        '{"key":"value","_hash":"5Dq88zdSRIOcAS-WM_lYYt"}',
      );
    });
  });

  suite('with updateExistingHashes', () => {
    /** @type Record<string, any> */
    let json;

    beforeEach(() => {
      json = {
        a: {
          _hash: 'hash_a',
          b: {
            _hash: 'hash_b',
            c: {
              _hash: 'hash_c',
              d: 'value',
            },
          },
        },
      };
    });

    const allHashesChanged = () => {
      return (
        json['a']['_hash'] !== 'hash_a' &&
        json['a']['b']['_hash'] !== 'hash_b' &&
        json['a']['b']['c']['_hash'] !== 'hash_c'
      );
    };

    const noHashesChanged = () => {
      return (
        json['a']['_hash'] === 'hash_a' &&
        json['a']['b']['_hash'] === 'hash_b' &&
        json['a']['b']['c']['_hash'] === 'hash_c'
      );
    };

    const changedHashes = () => {
      const result = [];
      if (json['a']['_hash'] !== 'hash_a') {
        result.push('a');
      }

      if (json['a']['b']['_hash'] !== 'hash_b') {
        result.push('b');
      }

      if (json['a']['b']['c']['_hash'] !== 'hash_c') {
        result.push('c');
      }

      return result;
    };

    suite('true', () => {
      test('should recalculate existing hashes', () => {
        addHashes(json, { updateExistingHashes: true, inPlace: true });
        expect(allHashesChanged()).toBe(true);
      });
    });

    suite('false', () => {
      suite('should not recalculate existing hashes', () => {
        test('with all objects having hashes', () => {
          addHashes(json, { updateExistingHashes: false, inPlace: true });
          expect(noHashesChanged()).toBe(true);
        });

        test('with parents have no hashes', () => {
          delete json['a']['_hash'];
          addHashes(json, { updateExistingHashes: false, inPlace: true });
          expect(changedHashes()).toEqual(['a']);

          delete json['a']['_hash'];
          delete json['a']['b']['_hash'];
          addHashes(json, { updateExistingHashes: false, inPlace: true });
          expect(changedHashes()).toEqual(['a', 'b']);
        });
      });
    });
  });

  suite('with inPlace', () => {
    suite('false', () => {
      test('does not touch the original object', () => {
        const json = {
          key: 'value',
        };

        const hashedJson = addHashes(json, { inPlace: false });
        expect(hashedJson).toEqual({
          key: 'value',
          _hash: '5Dq88zdSRIOcAS-WM_lYYt',
        });

        expect(json).toEqual({
          key: 'value',
        });
      });
    });

    suite('true', () => {
      test('writes hashes into original json', () => {
        const json = {
          key: 'value',
        };

        const hashedJson = addHashes(json, { inPlace: true });
        expect(hashedJson).toEqual({
          key: 'value',
          _hash: '5Dq88zdSRIOcAS-WM_lYYt',
        });

        expect(json).toEqual(hashedJson);
      });
    });
  });

  suite('with recursive', () => {
    let json = {
      a: {
        _hash: 'hash_a',
        b: {
          _hash: 'hash_b',
        },
      },
      b: {
        _hash: 'hash_a',
        b: {
          _hash: 'hash_b',
        },
      },
      _hash: 'hash_0',
    };

    suite('true', () => {
      test('should recalculate deeply all hashes', () => {
        const result = addHashes(json, { recursive: true });

        expect(result['_hash']).not.toBe('hash_0');
        expect(result['a']['_hash']).not.toBe('hash_a');
        expect(result['a']['b']['_hash']).not.toBe('hash_b');
      });
    });

    suite('false', () => {
      test('should only calc the first hash', () => {
        const result = addHashes(json, { recursive: false });

        expect(result['_hash']).not.toBe('hash_0');
        expect(result['a']['_hash']).toBe('hash_a');
        expect(result['a']['b']['_hash']).toBe('hash_b');
      });
    });

    suite('validate', () => {
      suite('with an empty json', () => {
        suite('throws', () => {
          test('when no hash is given', () => {
            let message;

            try {
              jh.validate({});
            } catch (/** @type any */ e) {
              message = e.toString();
            }

            expect(message).toBe('Error: Hash is missing.');
          });

          test('when hash is wrong', () => {
            let message;

            try {
              jh.validate({
                _hash: 'wrongHash',
              });
            } catch (/** @type any */ e) {
              message = e.toString();
            }

            expect(message).toBe(
              'Error: Hash "wrongHash" is wrong. Should be "RBNvo1WzZ4oRRq0W9-hknp".',
            );
          });
        });

        suite('does not throw', () => {
          test('when hash is correct', () => {
            expect(() =>
              jh.validate({
                _hash: 'RBNvo1WzZ4oRRq0W9-hknp',
              }),
            ).not.toThrow();
          });
        });
      });

      suite('with a single level json', () => {
        suite('throws', () => {
          test('when no hash is given', () => {
            let message;

            try {
              jh.validate({ key: 'value' });
            } catch (/** @type any */ e) {
              message = e.toString();
            }

            expect(message).toBe('Error: Hash is missing.');
          });

          test('when hash is wrong', () => {
            let message;

            try {
              jh.validate({
                key: 'value',
                _hash: 'wrongHash',
              });
            } catch (/** @type any */ e) {
              message = e.toString();
            }

            expect(message).toBe(
              'Error: Hash "wrongHash" is wrong. Should be "5Dq88zdSRIOcAS-WM_lYYt".',
            );
          });
        });

        suite('does not throw', () => {
          test('when hash is correct', () => {
            expect(() =>
              jh.validate({
                key: 'value',
                _hash: '5Dq88zdSRIOcAS-WM_lYYt',
              }),
            ).not.toThrow();
          });
        });
      });

      suite('with a deeply nested json', () => {
        /** @type {Record<string, any>} */
        let json2;

        beforeEach(() => {
          json2 = {
            _hash: 'oEE88mHZ241BRlAfyG8n9X',
            parent: {
              _hash: '3Wizz29YgTIc1LRaN9fNfK',
              child: {
                key: 'value',
                _hash: '5Dq88zdSRIOcAS-WM_lYYt',
              },
            },
          };
        });

        suite('throws', () => {
          suite('when no hash is given', () => {
            test('at the root', () => {
              let message;
              delete json2['_hash'];

              try {
                jh.validate(json2);
              } catch (/** @type any */ e) {
                message = e.toString();
              }

              expect(message).toBe('Error: Hash is missing.');
            });

            test('at the parent', () => {
              let message;
              delete json2['parent']['_hash'];

              try {
                jh.validate(json2);
              } catch (/** @type any */ e) {
                message = e.toString();
              }

              expect(message).toBe('Error: Hash at /parent is missing.');
            });

            test('at the child', () => {
              let message;
              delete json2['parent']['child']['_hash'];

              try {
                jh.validate(json2);
              } catch (/** @type any */ e) {
                message = e.toString();
              }

              expect(message).toBe('Error: Hash at /parent/child is missing.');
            });
          });

          suite('when hash is wrong', () => {
            test('at the root', () => {
              let message;
              json2['_hash'] = 'wrongHash';

              try {
                jh.validate(json2);
              } catch (/** @type any */ e) {
                message = e.toString();
              }

              expect(message).toBe(
                'Error: Hash "wrongHash" is wrong. Should be "oEE88mHZ241BRlAfyG8n9X".',
              );
            });

            test('at the parent', () => {
              let message;
              json2['parent']['_hash'] = 'wrongHash';

              try {
                jh.validate(json2);
              } catch (/** @type any */ e) {
                message = e.toString();
              }

              expect(message).toBe(
                'Error: Hash at /parent "wrongHash" is wrong. Should be "3Wizz29YgTIc1LRaN9fNfK".',
              );
            });

            test('at the child', () => {
              let message;
              json2['parent']['child']['_hash'] = 'wrongHash';

              try {
                jh.validate(json2);
              } catch (/** @type any */ e) {
                message = e.toString();
              }

              expect(message).toBe(
                'Error: Hash at /parent/child "wrongHash" is wrong. Should be "5Dq88zdSRIOcAS-WM_lYYt".',
              );
            });
          });

          suite('not', () => {
            test('when hash is correct', () => {
              expect(() => jh.validate(json2)).not.toThrow();
            });
          });
        });
      });

      suite('with a deeply nested json with child array', () => {
        /** @type {Record<string, any>} */
        let json2;

        beforeEach(() => {
          json2 = {
            _hash: 'IoJ_C8gm8uVu8ExpS7ZNPY',
            parent: [
              {
                _hash: 'kDsVfUjnkXU7_KXqp-PuyA',
                child: [{ key: 'value', _hash: '5Dq88zdSRIOcAS-WM_lYYt' }],
              },
            ],
          };
        });

        suite('throws', () => {
          suite('when no hash is given', () => {
            test('at the parent', () => {
              let message;
              delete json2['parent'][0]['_hash'];

              try {
                jh.validate(json2);
              } catch (/** @type any */ e) {
                message = e.toString();
              }

              expect(message).toBe('Error: Hash at /parent/0 is missing.');
            });

            test('at the child', () => {
              let message;
              delete json2['parent'][0]['child'][0]['_hash'];

              try {
                jh.validate(json2);
              } catch (/** @type any */ e) {
                message = e.toString();
              }

              expect(message).toBe(
                'Error: Hash at /parent/0/child/0 is missing.',
              );
            });
          });

          suite('when hash is wrong', () => {
            test('at the parent', () => {
              let message;
              json2['parent'][0]['_hash'] = 'wrongHash';

              try {
                jh.validate(json2);
              } catch (/** @type any */ e) {
                message = e.toString();
              }

              expect(message).toBe(
                'Error: Hash at /parent/0 "wrongHash" is wrong. Should be "kDsVfUjnkXU7_KXqp-PuyA".',
              );
            });

            test('at the child', () => {
              let message;
              json2['parent'][0]['child'][0]['_hash'] = 'wrongHash';

              try {
                jh.validate(json2);
              } catch (/** @type any */ e) {
                message = e.toString();
              }

              expect(message).toBe(
                'Error: Hash at /parent/0/child/0 "wrongHash" is wrong. Should be "5Dq88zdSRIOcAS-WM_lYYt".',
              );
            });
          });

          suite('not', () => {
            test('when hash is correct', () => {
              expect(() => jh.validate(json2)).not.toThrow();
            });
          });
        });
      });
    });
  });

  // suite('special cases', () => {});
});

const exampleJson = `{
  "layerA": {
    "data": [
      {
        "w": 600,
        "w1": 100
      },
      {
        "w": 700,
        "w1": 100
      }
    ]
  },

  "layerB": {
    "data": [
      {
        "d": 268,
        "d1": 100
      }
    ]
  },

  "layerC": {
    "data": [
      {
        "h": 800
      }
    ]
  },

  "layerD": {
    "data": [
      {
        "wMin": 0,
        "wMax": 900,
        "w1Min": 0,
        "w1Max": 900
      }
    ]
  },

  "layerE": {
    "data": [
      {
        "type": "XYZABC",
        "widths": "sLZpHAffgchgJnA++HqKtO",
        "depths": "k1IL2ctZHw4NpaA34w0d0I",
        "heights": "GBLHz0ayRkVUlms1wHDaJq",
        "ranges": "9rohAG49drWZs9tew4rDef"
      }
    ]
  },

  "layerF": {
    "data": [
      {
        "type": "XYZABC",
        "name": "Unterschrank 60cm"
      }
    ]
  },

  "layerG": {
    "data": [
      {
        "type": "XYZABC",
        "name": "Base Cabinet 23.5"
      }
    ]
  }
}`;

const exampleJsonWithHashes = `{
  "layerA": {
    "data": [
      {
        "w": 600,
        "w1": 100,
        "_hash": "ajRQhCx6QLPI8227B72r8I"
      },
      {
        "w": 700,
        "w1": 100,
        "_hash": "Jf177UAntzI4rIjKiU_MVt"
      }
    ],
    "_hash": "qCgcNNF3wJPfx0rkRDfoSY"
  },
  "layerB": {
    "data": [
      {
        "d": 268,
        "d1": 100,
        "_hash": "9mJ7aZJexhfz8IfwF6bsuW"
      }
    ],
    "_hash": "tb0ffNF2ePpqsRxmvMDRrt"
  },
  "layerC": {
    "data": [
      {
        "h": 800,
        "_hash": "KvMHhk1dYYQ2o5Srt6pTUN"
      }
    ],
    "_hash": "Z4km_FzQoxyck-YHQDZMtV"
  },
  "layerD": {
    "data": [
      {
        "wMin": 0,
        "wMax": 900,
        "w1Min": 0,
        "w1Max": 900,
        "_hash": "6uw0BSIllrk6DuKyvQh-Rg"
      }
    ],
    "_hash": "qFDAzWUsTnqICnpc_rJtax"
  },
  "layerE": {
    "data": [
      {
        "type": "XYZABC",
        "widths": "sLZpHAffgchgJnA++HqKtO",
        "depths": "k1IL2ctZHw4NpaA34w0d0I",
        "heights": "GBLHz0ayRkVUlms1wHDaJq",
        "ranges": "9rohAG49drWZs9tew4rDef",
        "_hash": "65LigWuYVGgifKnEZaOJET"
      }
    ],
    "_hash": "pDRglh2oWJcghTzzrzTLw6"
  },
  "layerF": {
    "data": [
      {
        "type": "XYZABC",
        "name": "Unterschrank 60cm",
        "_hash": "gjzETUIUf563ZJNHVEY9Wt"
      }
    ],
    "_hash": "r1u6gR8WLzPAZ3lEsAqREP"
  },
  "layerG": {
    "data": [
      {
        "type": "XYZABC",
        "name": "Base Cabinet 23.5",
        "_hash": "DEyuShUHDpWSJ7Rq_a3uz6"
      }
    ],
    "_hash": "3meyGs7XhOh8gWFNQFYZDI"
  },
  "_hash": "OmmdaqCAhcIKnDm7lT-_gI"
}`;
