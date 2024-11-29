// @license
// Copyright (c) 2019 - 2024 Dr. Gabriel Gatzsche. All Rights Reserved.
//
// Use of this source code is governed by terms that can be
// found in the LICENSE file in the root of this package.

// #############################################################################
import crypto from 'crypto';

/**
 * Deeply hashes a JSON object.
 * @param {object} json - The JSON object to hash.
 * @param {boolean} updateExistingHashes - Replace existing hashes.
 * @param {number} floatingPointPrecision - Precision for floating point numbers.
 * @param {number} hashLength - The length of the hash.
 * @param {boolean} inPlace - Whether to modify the object in place.
 * @param {boolean} recursive - Whether to hash recursively.
 * @returns {Record<string, any>} The hashed JSON object.
 */
function addHashes(
  json,
  updateExistingHashes = true,
  floatingPointPrecision = 10,
  hashLength = 22,
  inPlace = false,
  recursive = true,
) {
  return new JsonHash(
    hashLength,
    floatingPointPrecision,
    updateExistingHashes,
    recursive,
  ).applyTo(json, inPlace);
}

/**
 * Class for adding hashes to JSON objects.
 */
class JsonHash {
  /**
   * Constructor.
   * @param {number} hashLength - The length of the hash in bytes.
   * @param {number} floatingPointPrecision - Precision for floating point numbers.
   * @param {boolean} updateExistingHashes - Replace existing hashes.
   * @param {boolean} recursive - Recursively iterate into child objects.
   */
  constructor(
    hashLength = 22,
    floatingPointPrecision = 10,
    updateExistingHashes = true,
    recursive = true,
  ) {
    this.hashLength = hashLength;
    this.floatingPointPrecision = floatingPointPrecision;
    this.updateExistingHashes = updateExistingHashes;
    this.recursive = recursive;
  }

  /**
   * Adds hashes to the JSON object.
   * @param {object} json - The JSON object.
   * @param {boolean} inPlace - Modify the object in place.
   * @returns {object} The hashed JSON object.
   */
  applyTo(json, inPlace = false) {
    const copy = inPlace ? json : this._copyJson(json);
    this._addHashesToObject(copy, this.recursive);
    return copy;
  }

  /**
   * Adds hashes to a JSON string.
   * @param {string} jsonString - The JSON string.
   * @returns {string} The JSON string with hashes.
   */
  applyToString(jsonString) {
    const json = JSON.parse(jsonString);
    const hashedJson = this.applyTo(json, true);
    return JSON.stringify(hashedJson);
  }

  /**
   * Calculates a SHA-256 hash of a string with base64 URL encoding.
   * @param {string} string - The input string.
   * @param {number} hashLength - The length of the hash.
   * @returns {string} The hash.
   */
  calcHash(string, hashLength = 22) {
    const hash = crypto
      .createHash('sha256')
      .update(string, 'utf8')
      .digest('base64url');

    return hash.substring(0, hashLength);
  }

  /**
   * Recursively adds hashes to an object.
   * @private
   * @param {{ [key: string]: any }} obj - The object.
   * @param {boolean} recursive - Whether to hash recursively.
   */
  _addHashesToObject(obj, recursive) {
    if (
      !this.updateExistingHashes &&
      Object.prototype.hasOwnProperty.call(obj, '_hash')
    ) {
      return;
    }

    for (const [, value] of Object.entries(obj)) {
      if (
        typeof value === 'object' &&
        !Array.isArray(value) &&
        value !== null
      ) {
        if (value['_hash'] && !recursive) {
          continue;
        }
        this._addHashesToObject(value, recursive);
      } else if (Array.isArray(value)) {
        this._processList(value);
      }
    }

    /** @type {{[key: string]: any}} */
    const objToHash = {};

    for (const [key, value] of Object.entries(obj)) {
      if (key === '_hash') continue;

      if (typeof value === 'object' && value !== null) {
        objToHash[key] = value['_hash'];
      } else if (Array.isArray(value)) {
        objToHash[key] = this._flattenList(value);
      } else if (typeof value === 'number') {
        objToHash[key] = this._truncate(value, this.floatingPointPrecision);
      } else {
        objToHash[key] = value;
      }
    }

    const sortedJsonString = this._jsonString(objToHash);
    obj['_hash'] = this.calcHash(sortedJsonString);
  }

  /**
   * Processes a list recursively.
   * @private
   * @param {Array<any>} list - The list to process.
   */
  _processList(list) {
    for (const item of list) {
      if (typeof item === 'object' && !Array.isArray(item) && item !== null) {
        this._addHashesToObject(item, this.recursive);
      } else if (Array.isArray(item)) {
        this._processList(item);
      }
    }
  }

  /**
   * Flattens a list for hashing.
   * @private
   * @param {Array<any>} list - The list to flatten.
   * @returns {Array<any>} The flattened list.
   */
  _flattenList(list) {
    return list.map((item) => {
      if (typeof item === 'object' && !Array.isArray(item) && item !== null) {
        return item['_hash'];
      } else if (Array.isArray(item)) {
        return this._flattenList(item);
      } else {
        return item;
      }
    });
  }

  /**
   * Copies a JSON object.
   * @private
   * @param {object} json - The JSON object.
   * @returns {object} The copy.
   */
  _copyJson(json) {
    return JSON.parse(JSON.stringify(json));
  }

  /**
   * Truncates a number to the specified precision.
   * @private
   * @param {number} value - The number.
   * @param {number} precision - The precision.
   * @returns {number} The truncated number.
   */
  _truncate(value, precision) {
    if (Number.isInteger(value)) {
      return value;
    }

    const parts = value.toString().split('.');
    const integerPart = parts[0];
    const decimalPart = parts[1] || '';

    var truncatedDecimalPart =
      decimalPart.length > precision
        ? decimalPart.substring(0, precision)
        : decimalPart;

    // Remove trailing zeros
    if (truncatedDecimalPart.endsWith('0')) {
      truncatedDecimalPart = truncatedDecimalPart.replaceAll(/0+$/, '');
    }

    if (!truncatedDecimalPart) {
      return parseInt(integerPart);
    }

    const result = `${integerPart}.${truncatedDecimalPart}`;
    return parseFloat(result);
  }
  /**
   * Converts a JSON object to a string.
   * @private
   * @param {object} obj - The JSON object.
   * @returns {string} The JSON string.
   */
  _jsonString(obj) {
    return JSON.stringify(obj, Object.keys(obj).sort());
  }

  /**
   * For test purposes, we are exposing these private methods
   */
  get privateMethods() {
    return {
      _copyJson: this._copyJson,
      _truncate: this._truncate,
      _jsonString: this._jsonString,
    };
  }
}

export { JsonHash, addHashes };
