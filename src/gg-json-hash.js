// @license
// Copyright (c) 2019 - 2024 Dr. Gabriel Gatzsche. All Rights Reserved.
//
// Use of this source code is governed by terms that can be
// found in the LICENSE file in the root of this package.

import { fromByteArray } from 'base64-js';
import { sha256 } from 'js-sha256';

/**
 * Deeply hashes a JSON object.
 * @param {Record<string, any>} json - The JSON object to hash.
 * @param {object} options - Options for hashing.
 * @param {boolean} [options.updateExistingHashes=true] - Whether to update existing hashes.
 * @param {number} [options.floatingPointPrecision=10] - Precision for floating point numbers.
 * @param {number} [options.hashLength=22] - Length of the hash.
 * @param {boolean} [options.inPlace=false] - Whether to modify the original object.
 * @param {boolean} [options.recursive=true] - Whether to hash recursively.
 * @returns {Record<string, any>} The JSON object with hashes added.
 */
export function addHashes(json, options = {}) {
  const {
    updateExistingHashes = true,
    floatingPointPrecision = 10,
    hashLength = 22,
    inPlace = false,
    recursive = true,
  } = options;

  return new JsonHash({
    hashLength,
    floatingPointPrecision,
    updateExistingHashes,
    recursive,
  }).applyTo(json, { inPlace });
}

/**
 * Adds hashes to JSON object.
 */
export class JsonHash {
  /**
   * Constructor
   * @param {object} options - Options for the JsonHash.
   * @param {number} [options.hashLength=22] - Length of the hash.
   * @param {number} [options.floatingPointPrecision=10] - Precision for floating point numbers.
   * @param {boolean} [options.updateExistingHashes=true] - Whether to update existing hashes.
   * @param {boolean} [options.recursive=true] - Whether to hash recursively.
   */
  constructor(options = {}) {
    const {
      hashLength = 22,
      floatingPointPrecision = 10,
      updateExistingHashes = true,
      recursive = true,
    } = options;

    this.updateExistingHashes = updateExistingHashes;
    this.hashLength = hashLength;
    this.floatingPointPrecision = floatingPointPrecision;
    this.recursive = recursive;
  }

  /**
   * Writes hashes into the JSON object.
   * @param {Record<string, any>} json - The JSON object to hash.
   * @param {object} [options={}] - Options for the operation.
   * @param {boolean} [options.inPlace=false] - Whether to modify the original object.
   * @returns {Record<string, any>} The JSON object with hashes added.
   */
  applyTo(json, { inPlace = false } = {}) {
    const copy = inPlace ? json : JsonHash._copyJson(json);
    this._addHashesToObject(copy, this.recursive);
    return copy;
  }

  /**
   * Writes hashes into a JSON string.
   * @param {string} jsonString - The JSON string to hash.
   * @returns {string} The JSON string with hashes added.
   */
  applyToString(jsonString) {
    const json = JSON.parse(jsonString);
    const hashedJson = this.applyTo(json, { inPlace: true });
    return JSON.stringify(hashedJson);
  }

  /**
   * Calculates a SHA-256 hash of a string with base64 url.
   * @param {string} string - The string to hash.
   * @returns {string} The calculated hash.
   */
  calcHash(string) {
    const hash = sha256.arrayBuffer(string);
    const bytes = new Uint8Array(hash);
    const base64 = fromByteArray(bytes).substring(0, this.hashLength);

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
    const jsonWithCorrectHashes = addHashes(json);
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
   * @param {boolean} recursive - Whether to process recursively.
   */
  _addHashesToObject(obj, recursive) {
    if (
      !this.updateExistingHashes &&
      Object.prototype.hasOwnProperty.call(obj, '_hash')
    ) {
      return;
    }

    // Recursively process child elements
    for (const [, value] of Object.entries(obj)) {
      if (typeof value === 'object' && !Array.isArray(value)) {
        const existingHash = value['_hash'];
        if (existingHash != null && !recursive) {
          continue;
        }
        this._addHashesToObject(value, recursive);
      } else if (Array.isArray(value)) {
        this._processList(value);
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
        objToHash[key] = JsonHash._convertBasicType(
          value,
          this.floatingPointPrecision,
        );
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
   * @param {number} floatingPointPrecision
   */
  static _convertBasicType(value, floatingPointPrecision) {
    if (typeof value === 'string') {
      return value;
    }
    if (typeof value === 'number') {
      return JsonHash._truncate(value, floatingPointPrecision);
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
        flattenedList.push(
          JsonHash._convertBasicType(element, this.floatingPointPrecision),
        );
      }
    }

    return flattenedList;
  }

  // ...........................................................................
  /**
   * Recursively processes a list, adding hashes to nested objects and lists.
   * @param {Array<any>} list - The list to process.
   */
  _processList(list) {
    for (const element of list) {
      if (typeof element === 'object' && !Array.isArray(element)) {
        this._addHashesToObject(element, this.recursive);
      } else if (Array.isArray(element)) {
        this._processList(element);
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
   * @param {number} value - The number to truncate.
   * @param {number} precision - The precision to use.
   * @returns {number} The truncated number.
   */
  static _truncate(value, precision) {
    if (Number.isInteger(value)) {
      return value;
    }

    let result = value.toString();
    const parts = result.split('.');
    const integerPart = parts[0];
    let commaParts = parts[1];

    let truncatedCommaParts =
      commaParts.length > precision
        ? commaParts.substring(0, precision)
        : commaParts;

    // Remove trailing zeros
    if (truncatedCommaParts.endsWith('0')) {
      truncatedCommaParts = truncatedCommaParts.replace(/0+$/, '');
    }

    if (truncatedCommaParts.length === 0) {
      return parseInt(integerPart, 10);
    }

    result = `${integerPart}.${truncatedCommaParts}`;
    return parseFloat(result);
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

  // ...........................................................................
  /**
   * Exposes private methods for testing purposes.
   * @returns {Record<string, Function>} An object containing the private methods.
   */
  static get privateMethods() {
    return {
      _copyJson: JsonHash._copyJson,
      _copyList: JsonHash._copyList,
      _isBasicType: JsonHash._isBasicType,
      _truncate: JsonHash._truncate,
      _jsonString: JsonHash._jsonString,
      _convertBasicType: JsonHash._convertBasicType,
    };
  }
}
