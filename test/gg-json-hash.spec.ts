// @license
// Copyright (c) 2019 - 2024 Dr. Gabriel Gatzsche. All Rights Reserved.
//
// Use of this source code is governed by terms that can be
// found in the LICENSE file in the root of this package.

import { beforeEach, expect, suite, test } from 'vitest';

import { ApplyJsonHashConfig, JsonHash } from '../src/gg-json-hash';

suite('JsonHash', () => {
  let jh = JsonHash.default;

  beforeEach(() => {
    jh = new JsonHash();
  });

  suite('apply(json)', () => {
    suite('adds correct hashes to', () => {
      suite('simple json', () => {
        suite('containing only one key value pair', () => {
          test('with a string value', () => {
            const json = jh.apply({ key: 'value' });
            expect(json.key).toEqual('value');
            const expectedHash = jh.calcHash('{"key":"value"}');
            expect(json._hash).toEqual(expectedHash);
            expect(json._hash).toEqual('5Dq88zdSRIOcAS-WM_lYYt');
          });

          test('with a int value', () => {
            const json = jh.apply({ key: 1 });
            expect(json.key).toEqual(1);
            const expectedHash = jh.calcHash('{"key":1}');
            expect(json._hash).toEqual(expectedHash);
            expect(json._hash).toEqual('t4HVsGBJblqznOBwy6IeLt');
          });

          test('with a double value without commas', () => {
            const json = jh.apply({ key: 1.0 });
            expect(json.key).toEqual(1);
            const expectedHash = jh.calcHash('{"key":1}');
            expect(json._hash).toEqual(expectedHash);
            expect(json._hash).toEqual('t4HVsGBJblqznOBwy6IeLt');
          });

          test('with a bool value', () => {
            const json = jh.apply({ key: true });
            expect(json.key).toEqual(true);
            const expectedHash = jh.calcHash('{"key":true}');
            expect(json._hash).toEqual(expectedHash);
            expect(json._hash).toEqual('dNkCrIe79x2dPyf5fywwYO');
          });
        });

        test('existing _hash should be overwritten', () => {
          const ac = ApplyJsonHashConfig.default;
          ac.throwIfOnWrongHashes = false;

          const json = jh.apply(
            {
              key: 'value',
              _hash: 'oldHash',
            },
            ac,
          );
          expect(json.key).toEqual('value');
          const expectedHash = jh.calcHash('{"key":"value"}');
          expect(json._hash).toEqual(expectedHash);
          expect(json._hash).toEqual('5Dq88zdSRIOcAS-WM_lYYt');
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

          let j0: Record<string, any>;

          let j1: Record<string, any>;

          beforeEach(() => {
            j0 = jh.apply(json0);
            j1 = jh.apply(json1);
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

      suite('nested json', () => {
        test('of level 1', () => {
          const parent = jh.apply({
            key: 'value',
            child: {
              key: 'value',
            },
          });

          const child = parent.child;
          const childHash = jh.calcHash('{"key":"value"}');
          expect(child._hash).toEqual(childHash);

          const parentHash = jh.calcHash(
            `{"child":"${childHash}","key":"value"}`,
          );

          expect(parent._hash).toEqual(parentHash);
        });

        test('of level 2', () => {
          const parent = jh.apply({
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

          const parentHash = jh.calcHash(
            `{"child":"${childHash}","key":"value"}`,
          );
          expect(parent._hash).toEqual(parentHash);
        });
      });

      test('complete json example', () => {
        const json = JSON.parse(exampleJson);
        const hashedJson = jh.apply(json);

        const hashedJsonString = JSON.stringify(hashedJson, null, 2);
        expect(hashedJsonString).toEqual(exampleJsonWithHashes);
      });

      suite('data containing arrays', () => {
        suite('on top level', () => {
          suite('containing only simple types', () => {
            test('should convert all values to strings and hash it', () => {
              const json = jh.apply({
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
                  const json = jh.apply({
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
                  const json = jh.apply({
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
              const json = jh.apply({
                array: [['key', 1.0, true], 'hello'],
              });

              const jsonHash = jh.calcHash(
                '{"array":[["key",1,true],"hello"]}',
              );

              expect(json._hash).toEqual(jsonHash);
              expect(json._hash).toEqual('1X_6COC1sP5ECuHvKtVoDT');
            });
          });
        });
      });
    });

    suite('writes the hashes directly into the given json', () => {
      suite('when ApplyJsonHashConfig.inPlace is true', () => {
        test('writes hashes into original json', () => {
          const json = {
            key: 'value',
          };

          const ac = new ApplyJsonHashConfig();
          ac.inPlace = true;
          const hashedJson = jh.apply(json, ac);
          expect(hashedJson).toEqual({
            key: 'value',
            _hash: '5Dq88zdSRIOcAS-WM_lYYt',
          });

          expect(json).toEqual(hashedJson);
        });
      });
    });

    suite('writes the hashes into a copy', () => {
      suite('when ApplyJsonHashConfig.inPlace is false', () => {
        test('does not touch the original object', () => {
          const json = {
            key: 'value',
          };
          const ac = new ApplyJsonHashConfig();
          ac.inPlace = false;

          // The returned copy has the hashes
          const hashedJson = jh.apply(json, ac);
          expect(hashedJson).toEqual({
            key: 'value',
            _hash: '5Dq88zdSRIOcAS-WM_lYYt',
          });

          // The original json is untouched
          expect(json).toEqual({
            key: 'value',
          });
        });
      });
    });

    suite('replaces/updates existing hashes', () => {
      suite(
        'when ApplyJsonHashConfig.updateExistingHashes is set to true',
        () => {
          const allHashesChanged = (json: Record<string, any>) => {
            return (
              json['a']['_hash'] !== 'hash_a' &&
              json['a']['b']['_hash'] !== 'hash_b' &&
              json['a']['b']['c']['_hash'] !== 'hash_c'
            );
          };

          const ac = new ApplyJsonHashConfig();
          ac.inPlace = true;
          ac.throwIfOnWrongHashes = false;

          test('should recalculate existing hashes', () => {
            const json = {
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

            ac.updateExistingHashes = true;
            jh.apply(json, ac);
            expect(allHashesChanged(json)).toBe(true);
          });
        },
      );
    });

    suite('does not touch existing hashes', () => {
      suite(
        'when ApplyJsonHashConfig.updateExistingHashes is set to false',
        () => {
          const noHashesChanged = () => {
            return (
              json.a._hash === 'hash_a' &&
              json.a.b._hash === 'hash_b' &&
              json.a.b.c._hash === 'hash_c'
            );
          };

          const ac = new ApplyJsonHashConfig();
          ac.inPlace = true;

          let json: Record<string, any> = {};

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

          test('with all objects having hashes', () => {
            ac.updateExistingHashes = false;
            jh.apply(json, ac);
            expect(noHashesChanged()).toBe(true);
          });

          test('with parents have no hashes', () => {
            delete json['a']['_hash'];
            ac.updateExistingHashes = false;
            jh.apply(json, ac);
            expect(changedHashes()).toEqual(['a']);

            delete json['a']['_hash'];
            delete json['a']['b']['_hash'];
            ac.updateExistingHashes = false;
            jh.apply(json, ac);
            expect(changedHashes()).toEqual(['a', 'b']);
          });
        },
      );
    });

    suite('checks numbers', () => {
      test('.e. throws when NaN is given', () => {
        let message;

        try {
          jh.apply({
            key: NaN,
          });
        } catch (e: any) {
          message = e.toString();
        }

        expect(message).toEqual('Error: NaN is not supported.');
      });

      test('i.e. throws when json contains an unsupported type', () => {
        let message;

        try {
          jh.apply({
            key: new Error(),
          });
        } catch (e: any) {
          message = e.toString();
        }

        expect(message).toEqual('Error: Unsupported type: object');
      });

      suite('i.e. ensures numbers have the right precision', () => {
        suite(
          'i.e. it does not throw when numbers have right maximum precision',
          () => {
            test('e.g. 1.001', () => {
              // Test a json that has a number within the precision -> now throw
              expect(() =>
                jh.apply({
                  key: 1.001,
                }),
              ).not.toThrow();
            });

            test('e.g. 1.123', () => {
              // Test a json that has a number within the precision -> now throw
              expect(() =>
                jh.apply({
                  key: 1.123,
                }),
              ).not.toThrow();
            });

            test('e.g. -1.123', () => {
              // Test a json that has a number within the precision -> now throw
              expect(() =>
                jh.apply({
                  key: -1.123,
                }),
              ).not.toThrow();
            });

            test('e.g. 1e-2', () => {
              // Test a json that has a number within the precision -> now throw
              expect(() =>
                jh.apply({
                  key: 1e-2,
                }),
              ).not.toThrow();
            });
          },
        );

        suite(
          'i.e. it does throw when numbers do not match maximum precision',
          () => {
            suite('e.g. numbers have more commas then precision allows', () => {
              test('e.g. 1.0001', () => {
                expect(jh.config.numberConfig.precision).toBe(0.001);

                // Test a json that has a number outside the precision -> throw
                let message = '';
                try {
                  jh.apply({
                    key: 1.0001,
                  });
                } catch (e: any) {
                  message = e.toString();
                }

                expect(message).toEqual(
                  'Error: Number 1.0001 has a higher precision than 0.001.',
                );
              });

              test('e.g. 1.1234', () => {
                expect(jh.config.numberConfig.precision).toBe(0.001);

                // Test a json that has a number outside the precision -> throw
                let message = '';
                try {
                  jh.apply({
                    key: 1.1234,
                  });
                } catch (e: any) {
                  message = e.toString();
                }

                expect(message).toEqual(
                  'Error: Number 1.1234 has a higher precision than 0.001.',
                );
              });

              test('e.g. -1.0001', () => {
                expect(jh.config.numberConfig.precision).toBe(0.001);

                // Test a json that has a number outside the precision -> throw
                let message = '';
                try {
                  jh.apply({
                    key: -1.0001,
                  });
                } catch (e: any) {
                  message = e.toString();
                }

                expect(message).toEqual(
                  'Error: Number -1.0001 has a higher precision than 0.001.',
                );
              });

              test('e.g. -1.1234', () => {
                expect(jh.config.numberConfig.precision).toBe(0.001);

                // Test a json that has a number outside the precision -> throw
                let message = '';
                try {
                  jh.apply({
                    key: -1.1234,
                  });
                } catch (e: any) {
                  message = e.toString();
                }

                expect(message).toEqual(
                  'Error: Number -1.1234 has a higher precision than 0.001.',
                );
              });

              test('e.g. 9839089403.1235', () => {
                expect(jh.config.numberConfig.precision).toBe(0.001);

                // Test a json that has a number outside the precision -> throw
                let message = '';
                try {
                  jh.apply({
                    key: 9839089403.1235,
                  });
                } catch (e: any) {
                  message = e.toString();
                }

                expect(message).toEqual(
                  'Error: Number 9839089403.1235 has a higher precision than 0.001.',
                );
              });

              test('e.g. 9839089403.1235', () => {
                expect(jh.config.numberConfig.precision).toBe(0.001);

                // Test a json that has a number outside the precision -> throw
                let message = '';
                try {
                  jh.apply({
                    key: 0.1e-4,
                  });
                } catch (e: any) {
                  message = e.toString();
                }

                expect(message).toEqual(
                  'Error: Number 0.00001 has a higher precision than 0.001.',
                );
              });
            });
          },
        );
      });

      suite('i.e. ensures numbers are in the given range', () => {
        suite('i.e. values exceed NumbersConfig.maxNum', () => {
          let max = 0;

          beforeEach(() => {
            max = jh.config.numberConfig.maxNum;
          });

          function check(val: number) {
            let message = '';
            val = parseFloat(val.toFixed(3));

            try {
              jh.apply({ key: val });
            } catch (e: any) {
              message = e.toString();
            }

            expect(message).toEqual(
              `Error: Number ${val} exceeds NumberHashingConfig.maxNum.`,
            );
          }

          test('.e.g. shortly above the maximum', () => {
            check(max + 0.001);
          });
        });

        suite('i.e. values exceed NumbersConfig.maxNum', () => {
          let min = 0;

          beforeEach(() => {
            min = jh.config.numberConfig.minNum;
          });

          /**
           * val: number
           * @returns {void}
           */
          function check(val: number) {
            let message = '';
            val = parseFloat(val.toFixed(3));

            try {
              jh.apply({ key: val });
            } catch (e: any) {
              message = e.toString();
            }

            expect(message).toEqual(
              `Error: Number ${val} is smaller than NumberHashingConfig.minNum.`,
            );
          }

          test('.e.g. shortly above the maximum', () => {
            check(min - 0.001);
          });
        });
      });
    });

    suite(
      'throws, when existing hashes do not match newly calculated ones',
      () => {
        suite(
          'when ApplyJsonHashConfig.throwIfOnWrongHashes is set to true',
          () => {
            test('with a simple json', () => {
              const json = {
                key: 'value',
                _hash: 'wrongHash',
              };

              const ac = new ApplyJsonHashConfig();
              ac.throwIfOnWrongHashes = true;

              let message = '';
              try {
                jh.apply(json, ac);
              } catch (e: any) {
                message = e.toString();
              }

              expect(message).toEqual(
                'Error: Hash "wrongHash" does not match the newly calculated one "5Dq88zdSRIOcAS-WM_lYYt". ' +
                  'Please make sure that all systems are producing the same hashes.',
              );
            });
          },
        );

        suite(
          'but not when ApplyJsonHashConfig.throwIfOnWrongHashes is set to false',
          () => {
            test('with a simple json', () => {
              const json = {
                key: 'value',
                _hash: 'wrongHash',
              };

              const ac = new ApplyJsonHashConfig();
              ac.throwIfOnWrongHashes = false;
              ac.inPlace = true;

              jh.apply(json, ac);
              expect(json._hash).toEqual('5Dq88zdSRIOcAS-WM_lYYt');
            });
          },
        );
      },
    );
  });

  suite('applyToJsonString(string)', () => {
    test('parses the string, adds the hashes, and returns the serialized string', () => {
      const json = '{"key": "value"}';
      const jsonString = jh.applyToJsonString(json);
      expect(jsonString).toEqual(
        '{"key":"value","_hash":"5Dq88zdSRIOcAS-WM_lYYt"}',
      );
    });
  });

  suite('private methods', () => {
    suite('_copyJson', () => {
      const copyJson = JsonHash._copyJson;

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
            } catch (e: any) {
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
            } catch (e: any) {
              message = e.toString();
            }

            expect(message).toEqual('Error: Unsupported type: object');
          });
        });
      });
    });

    suite('_isBasicType', () => {
      const isBasicType = JsonHash._isBasicType;

      test('returns true if type is a basic type', () => {
        expect(isBasicType(1)).toEqual(true);
        expect(isBasicType(1.0)).toEqual(true);
        expect(isBasicType('1')).toEqual(true);
        expect(isBasicType(true)).toEqual(true);
        expect(isBasicType(false)).toEqual(true);
        expect(isBasicType(new Set())).toEqual(false);
      });
    });

    suite('_jsonString(map)', () => {
      const jsonString = JsonHash._jsonString;

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
        } catch (e: any) {
          message = e.toString();
        }

        expect(message).toEqual('Error: Unsupported type: object');
      });
    });

    suite('_convertBasicType(string)', () => {
      test('with a string', () => {
        expect(jh._convertBasicType('hello')).toEqual('hello');
      });

      test('with an int', () => {
        expect(jh._convertBasicType(10)).toEqual(10);
      });

      test('with a double', () => {
        expect(jh._convertBasicType(true)).toEqual(true);
      });

      test('with an non basic type', () => {
        let message = '';
        try {
          jh._convertBasicType(new Set());
        } catch (e: any) {
          message = e.toString();
        }

        expect(message).toEqual('Error: Unsupported type: object');
      });
    });
  });

  suite('validate', () => {
    suite('with an empty json', () => {
      suite('throws', () => {
        test('when no hash is given', () => {
          let message;

          try {
            jh.validate({});
          } catch (e: any) {
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
          } catch (e: any) {
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
          } catch (e: any) {
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
          } catch (e: any) {
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
            } catch (e: any) {
              message = e.toString();
            }

            expect(message).toBe('Error: Hash is missing.');
          });

          test('at the parent', () => {
            let message;
            delete json2['parent']['_hash'];

            try {
              jh.validate(json2);
            } catch (e: any) {
              message = e.toString();
            }

            expect(message).toBe('Error: Hash at /parent is missing.');
          });

          test('at the child', () => {
            let message;
            delete json2['parent']['child']['_hash'];

            try {
              jh.validate(json2);
            } catch (e: any) {
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
            } catch (e: any) {
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
            } catch (e: any) {
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
            } catch (e: any) {
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
            } catch (e: any) {
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
