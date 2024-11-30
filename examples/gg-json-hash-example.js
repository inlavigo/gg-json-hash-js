// @license
// Copyright (c) 2019 - 2024 Dr. Gabriel Gatzsche. All Rights Reserved.
//
// Use of this source code is governed by terms that can be
// found in the LICENSE file in the root of this package.

import { ApplyJsonHashConfig, JsonHash } from '../src/gg-json-hash.js';

const print = console.log;
const assert = console.assert;
let jh = new JsonHash();

// .............................................................................
print('Create a json structure');

/** @type any */
let json = {
  a: '0',
  b: '1',
  child: {
    d: 3,
    e: 4,
  },
};

// .............................................................................
print('Add hashes to the json structure.');
json = jh.apply(json);
print(JSON.stringify(json, null, 2));

// {
//   "a": "0",
//   "b": "1",
//   "child": {
//     "d": 3,
//     "e": 4,
//     "_hash": "nfTEHYDoqVPb3ieJSmBxft"
//   },
//   "_hash": "k-3v5I-Q6Q9vPdVJxsMYUk"
// }

// .............................................................................
print('Set a maximum floating point precision.');

jh.config.numberConfig.precision = 0.001;

try {
  jh.apply({
    a: 1.000001,
  });
} catch (/** @type any */ e) {
  print(e.message); // Number 1.000001 has a higher precision than 0.001
}

// .............................................................................
print('Use the "inPlace" option to modify the input object directly.');

json = { a: 1, b: 2 };
let ac = new ApplyJsonHashConfig();
ac.inPlace = true;

jh.apply(json, ac);
assert(json._hash, 'QyWM_3g_5wNtikMDP4MK38');

// .............................................................................
print(
  'Set "upateExistingHashes: false" to create missing hashes but ' +
    'without touching existing ones.',
);

json = { a: 1, b: 2, child: { c: 3 }, child2: { _hash: 'ABC123', d: 4 } };
ac = new ApplyJsonHashConfig();
ac.updateExistingHashes = false;
json = jh.apply(json, ac);
assert(json._hash === 'pos6bn6mON0sirhEaXq41-');
assert(json.child._hash === 'yrqcsGrHfad4G4u9fgcAxY');
assert(json.child2._hash === 'ABC123');

// .............................................................................
print('If existing hashes do not match new ones, an error is thrown.');
ac.throwIfOnWrongHashes = true;
try {
  jh.apply({ a: 1, _hash: 'invalid' });
} catch (/** @type any */ e) {
  print(e.message);
  // 'Hash "invalid" does not match the newly calculated one "AVq9f1zFei3ZS3WQ8ErYCE".
  // Please make sure that all systems are producing the same hashes.'
}

// .............................................................................
print('Set "throwIfOnWrongHashes" to false to replace invalid hashes.');
ac.throwIfOnWrongHashes = false;
ac.updateExistingHashes = true;
json = jh.apply({ a: 1, _hash: 'invalid' }, ac);
print(json._hash); // AVq9f1zFei3ZS3WQ8ErYCE

// .............................................................................
print('Use validate to check if the hashes are correct');

json = { a: 1, b: 2 };
json = jh.apply(json);
jh.validate(json); // true

try {
  json.a = 3;
  jh.validate({ a: 3, _hash: 'invalid' });
} catch (e) {
  print(e.message);
}
