// @license
// Copyright (c) 2019 - 2024 Dr. Gabriel Gatzsche. All Rights Reserved.
//
// Use of this source code is governed by terms that can be
// found in the LICENSE file in the root of this package.

import { fromByteArray } from 'base64-js';
import { sha256 } from 'js-sha256';

// .............................................................................
/**
 * Number config for hashing.
 *
 * We need to make sure that the hashing of numbers is consistent
 * across different platforms. Especially rounding errors can lead to
 * different hashes although the numbers are considered equal. This
 * class provides a configuration for hashing numbers.
 */
export class NumberConfig {
  precision = 0.001;
  maxNum = 1000 * 1000 * 1000;
  minNum = -this.maxNum;
  throwOnRangeError = true;

  /**
   * Default configuration.
   *
   * @type {NumberConfig}
   */
  static get default() {
    return new NumberConfig();
  }
}

// .............................................................................
/**
 * When writing hashes into a given JSON object, we have various options.
 */
export class ApplyConfig {
  /**
   * Constructor
   * @param {boolean} [inPlace=false] - Whether to modify the JSON object in place.
   * @param {boolean} [updateExistingHashes=true] - Whether to update existing hashes.
   * @param {boolean} [throwOnHashMismatch=true] - Whether to throw an error if existing hashes are wrong.
   */
  constructor(inPlace, updateExistingHashes, throwOnHashMismatch) {
    this.inPlace = inPlace ?? false;
    this.updateExistingHashes = updateExistingHashes ?? true;
    this.throwOnHashChanges = throwOnHashMismatch ?? true;
  }

  inPlace;
  updateExistingHashes;
  throwOnHashChanges;

  /**
   * Default configuration.
   *
   * @type {ApplyConfig}
   */
  static get default() {
    return new ApplyConfig();
  }
}

// .............................................................................
/**
 * Options for the JSON hash.
 */
export class HashConfig {
  // ...........................................................................
  /**
   * Constructor
   * @param {number} [hashLength=22] - Length of the hash.
   * @param {string} [hashAlgorithm='SHA-256'] - Algorithm to use for hashing.
   * @param {NumberConfig} [numberConfig=HashNumberConfig.default] - Configuration for hashing numbers.
   */
  constructor(hashLength, hashAlgorithm, numberConfig) {
    this.hashLength = hashLength ?? 22;
    this.hashAlgorithm = hashAlgorithm ?? 'SHA-256';
    this.numberConfig = numberConfig ?? NumberConfig.default;
  }

  hashLength;
  hashAlgorithm;
  numberConfig;

  /**
   * Default configuration.
   *
   * @type {HashConfig}
   */
  static get default() {
    return new HashConfig();
  }
}

// .............................................................................
/**
 * Adds hashes to JSON object.
 */
export class JsonHash {
  // ...........................................................................
  /**
   * Constructor
   * @param {HashConfig} [config=HashConfig.default] - Configuration for the hash.
   */
  constructor(config) {
    this.config = config ?? HashConfig.default;
  }

  /** @type {HashConfig} */
  config;

  /**
   * Default instance.
   *
   * @type {JsonHash}
   */
  static get default() {
    return new JsonHash();
  }

  // ...........................................................................
  /**
   * Writes hashes into the JSON object.
   * @param {Record<string, any>} json - The JSON object to hash.
   * @param {ApplyConfig} [applyConfig=HashApplyToConfig.default] - Options for the operation.
   * @returns {Record<string, any>} The JSON object with hashes added.
   */
  apply(json, applyConfig) {
    applyConfig = applyConfig ?? ApplyConfig.default;
    const copy = applyConfig.inPlace ? json : JsonHash._copyJson(json);
    this._addHashesToObject(copy, applyConfig);
    return copy;
  }

  // ...........................................................................
  /**
   * Writes hashes into a JSON string.
   * @param {string} jsonString - The JSON string to hash.
   * @returns {string} The JSON string with hashes added.
   */
  applyToJsonString(jsonString) {
    const json = JSON.parse(jsonString);
    const applyConfig = ApplyConfig.default;
    applyConfig.inPlace = true;
    const hashedJson = this.apply(json, applyConfig);
    return JSON.stringify(hashedJson);
  }

  // ...........................................................................
  /**
   * Calculates a SHA-256 hash of a string with base64 url.
   * @param {string} string - The string to hash.
   * @returns {string} The calculated hash.
   */
  calcHash(string) {
    const hash = sha256.arrayBuffer(string);
    const bytes = new Uint8Array(hash);
    const base64 = fromByteArray(bytes).substring(0, this.config.hashLength);

    // convert to url save base64
    return base64.replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');
  }

  // ...........................................................................
  /**
   * Throws if hashes are not correct.
   * @param {Record<string, any>} json - The JSON object to validate.
   */
  validate(json) {
    // Check the hash of the high level element
    const jsonWithCorrectHashes = this.apply(json);
    this._validate(json, jsonWithCorrectHashes, '');
  }

  // ######################
  // Private
  // ######################

  // ...........................................................................
  /**
   * Validates the hashes of the JSON object.
   * @param {Record<string, any>} jsonIs - The JSON object to check.
   * @param {Record<string, any>} jsonShould - The JSON object with correct hashes.
   * @param {string} path - The current path in the JSON object.
   */
  _validate(jsonIs, jsonShould, path) {
    // Check the hashes of the parent element
    const expectedHash = jsonShould['_hash'];
    const actualHash = jsonIs['_hash'];

    if (actualHash == null) {
      const pathHint = path ? ` at ${path}` : '';
      throw new Error(`Hash${pathHint} is missing.`);
    }

    if (expectedHash !== actualHash) {
      const pathHint = path ? ` at ${path}` : '';
      throw new Error(
        `Hash${pathHint} "${actualHash}" is wrong. Should be "${expectedHash}".`,
      );
    }

    // Check the hashes of the child elements
    for (const [key, value] of Object.entries(jsonIs)) {
      if (key === '_hash') continue;
      if (typeof value === 'object' && !Array.isArray(value)) {
        const childIs = value;
        const childShould = jsonShould[key];
        this._validate(childIs, childShould, `${path}/${key}`);
      } else if (Array.isArray(value)) {
        for (let i = 0; i < value.length; i++) {
          if (typeof value[i] === 'object' && !Array.isArray(value[i])) {
            const itemIs = value[i];
            const itemShould = jsonShould[key][i];
            this._validate(itemIs, itemShould, `${path}/${key}/${i}`);
          }
        }
      }
    }
  }

  // ...........................................................................
  /**
   * Recursively adds hashes to a nested object.
   * @param {Record<string, any>} obj - The object to add hashes to.
   * @param {ApplyConfig} applyConfig - Whether to process recursively.
   */
  _addHashesToObject(obj, applyConfig) {
    const updateExisting = applyConfig.updateExistingHashes;

    if (!updateExisting && Object.prototype.hasOwnProperty.call(obj, '_hash')) {
      return;
    }

    // Recursively process child elements
    for (const [, value] of Object.entries(obj)) {
      if (typeof value === 'object' && !Array.isArray(value)) {
        const existingHash = value['_hash'];
        if (!updateExisting && existingHash != null) {
          continue;
        }
        this._addHashesToObject(value, applyConfig);
      } else if (Array.isArray(value)) {
        this._processList(value, applyConfig);
      }
    }

    // Build a new object to represent the current object for hashing
    /** @type {Record<string, any>} */
    const objToHash = {};

    for (const [key, value] of Object.entries(obj)) {
      if (key === '_hash') continue;

      if (typeof value === 'object' && !Array.isArray(value)) {
        objToHash[key] = value['_hash'];
      } else if (Array.isArray(value)) {
        objToHash[key] = this._flattenList(value);
      } else if (JsonHash._isBasicType(value)) {
        objToHash[key] = this._convertBasicType(value);
      }
    }

    // Sort the object keys to ensure consistent key order
    const sortedKeys = Object.keys(objToHash).sort();

    /** @type {Record<string, any>} */
    const sortedMap = {};
    for (const key of sortedKeys) {
      sortedMap[key] = objToHash[key];
    }

    const sortedMapJson = JsonHash._jsonString(sortedMap);

    // Compute the SHA-256 hash of the JSON string
    const hash = this.calcHash(sortedMapJson);

    // Add the hash to the original object
    obj['_hash'] = hash;
  }

  // ...........................................................................
  /**
   * Converts a basic type to a suitable representation.
   * @param {any} value - The value to convert.
   * @returns {any} The converted value.
   */
  _convertBasicType(value) {
    if (typeof value === 'string') {
      return value;
    }
    if (typeof value === 'number') {
      this._checkNumber(value);
      return value;
    } else if (typeof value === 'boolean') {
      return value;
    } else {
      throw new Error(`Unsupported type: ${typeof value}`);
    }
  }

  // ...........................................................................
  /**
   * Builds a representation of a list for hashing.
   * @param {Array<any>} list - The list to flatten.
   * @returns {Array<any>} The flattened list.
   */
  _flattenList(list) {
    const flattenedList = [];

    for (const element of list) {
      if (typeof element === 'object' && !Array.isArray(element)) {
        flattenedList.push(element['_hash']);
      } else if (Array.isArray(element)) {
        flattenedList.push(this._flattenList(element));
      } else if (JsonHash._isBasicType(element)) {
        flattenedList.push(this._convertBasicType(element));
      }
    }

    return flattenedList;
  }

  // ...........................................................................
  /**
   * Recursively processes a list, adding hashes to nested objects and lists.
   * @param {Array<any>} list - The list to process.
   * @param {ApplyConfig} applyConfig - Whether to process recursively.
   */
  _processList(list, applyConfig) {
    for (const element of list) {
      if (typeof element === 'object' && !Array.isArray(element)) {
        this._addHashesToObject(element, applyConfig);
      } else if (Array.isArray(element)) {
        this._processList(element, applyConfig);
      }
    }
  }

  // ...........................................................................
  /**
   * Copies the JSON object.
   * @param {Record<string, any>} json - The JSON object to copy.
   * @returns {Record<string, any>} The copied JSON object.
   */
  static _copyJson(json) {
    /** @type {Record<string, any>} */
    const copy = {};
    for (const [key, value] of Object.entries(json)) {
      if (Array.isArray(value)) {
        copy[key] = JsonHash._copyList(value);
      } else if (JsonHash._isBasicType(value)) {
        copy[key] = value;
      } else if (value.constructor === Object) {
        copy[key] = JsonHash._copyJson(value);
      } else {
        throw new Error(`Unsupported type: ${typeof value}`);
      }
    }
    return copy;
  }

  // ...........................................................................
  /**
   * Copies the list.
   * @param {Array<any>} list - The list to copy.
   * @returns {Array<any>} The copied list.
   */
  static _copyList(list) {
    const copy = [];
    for (const element of list) {
      if (Array.isArray(element)) {
        copy.push(JsonHash._copyList(element));
      } else if (JsonHash._isBasicType(element)) {
        copy.push(element);
      } else if (element.constructor === Object) {
        copy.push(JsonHash._copyJson(element));
      } else {
        throw new Error(`Unsupported type: ${typeof element}`);
      }
    }
    return copy;
  }

  // ...........................................................................
  /**
   * Checks if a value is a basic type.
   * @param {any} value - The value to check.
   * @returns {boolean} True if the value is a basic type, false otherwise.
   */
  static _isBasicType(value) {
    return (
      typeof value === 'string' ||
      typeof value === 'number' ||
      typeof value === 'boolean'
    );
  }

  // ...........................................................................
  /**
   * Turns a number into a string with a given precision.
   * @param {number} value - The number to check.
   */
  _checkNumber(value) {
    if (isNaN(value)) {
      throw new Error('NaN is not supported.');
    }

    if (Number.isInteger(value)) {
      return value;
    }

    if (this._exceedsPrecision(value)) {
      throw new Error(`Number ${value} has a higher precision than 0.001.`);
    }

    if (this._exceedsUpperRange(value)) {
      throw new Error(`Number ${value} exceeds NumberConfig.maxNum.`);
    }

    if (this._exceedsLowerRange(value)) {
      throw new Error(`Number ${value} is smaller NumberConfig.minNum.`);
    }
  }

  // ...........................................................................
  /**
   * Checks if a number exceeds the defined range.
   * @param {number} value - The number to check.
   * @returns {boolean} True if the number exceeds the given range, false otherwise.
   */
  _exceedsUpperRange(value) {
    return value > this.config.numberConfig.maxNum;
  }

  // ...........................................................................
  /**
   * Checks if a number exceeds the defined range.
   * @param {number} value - The number to check.
   * @returns {boolean} True if the number exceeds the given range, false otherwise.
   */
  _exceedsLowerRange(value) {
    return value < this.config.numberConfig.minNum;
  }

  // ...........................................................................
  /**
   * Checks if a number exceeds the precision.
   * @param {number} value - The number to check.
   * @returns {boolean} True if the number exceeds the precision, false otherwise.
   */
  _exceedsPrecision(value) {
    const precision = this.config.numberConfig.precision;
    const roundedValue = Math.round(value / precision) * precision;
    return Math.abs(value - roundedValue) > Number.EPSILON;
  }

  // ...........................................................................
  /**
   * Converts a map to a JSON string.
   * @param {Record<string, any>} map - The map to convert.
   * @returns {string} The JSON string representation of the map.
   */
  static _jsonString(map) {
    /**
     * Encodes a value to a JSON string.
     * @param {any} value - The map to convert.
     * @returns {string} The JSON string representation of the map.
     */
    const encodeValue = (value) => {
      if (typeof value === 'string') {
        return `"${value.replace(/"/g, '\\"')}"`; // Escape quotes
      } else if (typeof value === 'number' || typeof value === 'boolean') {
        return value.toString();
      } else if (Array.isArray(value)) {
        return `[${value.map(encodeValue).join(',')}]`;
      } else if (value.constructor === Object) {
        return JsonHash._jsonString(value);
      } else {
        throw new Error(`Unsupported type: ${typeof value}`);
      }
    };

    return `{${Object.entries(map)
      .map(([key, value]) => `"${key}":${encodeValue(value)}`)
      .join(',')}}`;
  }
}
