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
export class NumberHashingConfig {
  precision: number = 0.001;
  maxNum: number = 1000 * 1000 * 1000;
  minNum: number = -this.maxNum;
  throwOnRangeError: boolean = true;

  /**
   * Default configuration.
   *
   * @type {NumberHashingConfig}
   */
  static get default(): NumberHashingConfig {
    return new NumberHashingConfig();
  }
}

// .............................................................................
/**
 * When writing hashes into a given JSON object, we have various options.
 */
export class ApplyJsonHashConfig {
  inPlace: boolean;
  updateExistingHashes: boolean;
  throwIfOnWrongHashes: boolean;

  /**
   * Constructor
   * @param {boolean} [inPlace=false] - Whether to modify the JSON object in place.
   * @param {boolean} [updateExistingHashes=true] - Whether to update existing hashes.
   * @param {boolean} [throwOnHashMismatch=true] - Whether to throw an error if existing hashes are wrong.
   */
  constructor(
    inPlace?: boolean,
    updateExistingHashes?: boolean,
    throwOnHashMismatch?: boolean,
  ) {
    this.inPlace = inPlace ?? false;
    this.updateExistingHashes = updateExistingHashes ?? true;
    this.throwIfOnWrongHashes = throwOnHashMismatch ?? true;
  }

  /**
   * Default configuration.
   *
   * @type {ApplyJsonHashConfig}
   */
  static get default(): ApplyJsonHashConfig {
    return new ApplyJsonHashConfig();
  }
}

// .............................................................................
/**
 * Options for the JSON hash.
 */
export class HashConfig {
  hashLength: number;
  hashAlgorithm: string;
  numberConfig: NumberHashingConfig;

  // ...........................................................................
  /**
   * Constructor
   * @param {number} [hashLength=22] - Length of the hash.
   * @param {string} [hashAlgorithm='SHA-256'] - Algorithm to use for hashing.
   * @param {NumberHashingConfig} [numberConfig=HashNumberHashingConfig.default] - Configuration for hashing numbers.
   */
  constructor(
    hashLength?: number,
    hashAlgorithm?: string,
    numberConfig?: NumberHashingConfig,
  ) {
    this.hashLength = hashLength ?? 22;
    this.hashAlgorithm = hashAlgorithm ?? 'SHA-256';
    this.numberConfig = numberConfig ?? NumberHashingConfig.default;
  }

  /**
   * Default configuration.
   *
   * @type {HashConfig}
   */
  static get default(): HashConfig {
    return new HashConfig();
  }
}

// .............................................................................
/**
 * Adds hashes to JSON object.
 */
export class JsonHash {
  config: HashConfig;

  // ...........................................................................
  /**
   * Constructor
   * @param {HashConfig} [config=HashConfig.default] - Configuration for the hash.
   */
  constructor(config?: HashConfig) {
    this.config = config ?? HashConfig.default;
  }

  /**
   * Default instance.
   *
   * @type {JsonHash}
   */
  static get default(): JsonHash {
    return new JsonHash();
  }

  // ...........................................................................
  /**
   * Writes hashes into the JSON object.
   * @param {Record<string, any>} json - The JSON object to hash.
   * @param {ApplyJsonHashConfig} [applyConfig=HashApplyToConfig.default] - Options for the operation.
   * @returns {Record<string, any>} The JSON object with hashes added.
   */
  apply<T extends Record<string, any>>(
    json: T,
    applyConfig?: ApplyJsonHashConfig,
  ): T {
    applyConfig = applyConfig ?? ApplyJsonHashConfig.default;
    const copy = applyConfig.inPlace ? json : JsonHash._copyJson(json);
    this._addHashesToObject(copy, applyConfig);

    if (applyConfig.throwIfOnWrongHashes) {
      this.validate(copy);
    }
    return copy as T;
  }

  // ...........................................................................
  applyInPlace<T extends Record<string, any>>(
    json: T,
    updateExistingHashes: boolean = false,
    throwIfWrongHashes: boolean = true,
  ): T {
    const applyConfig = new ApplyJsonHashConfig(
      true,
      updateExistingHashes,
      throwIfWrongHashes,
    );

    return this.apply(json, applyConfig) as T;
  }

  // ...........................................................................
  /**
   * Writes hashes into a JSON string.
   * @param {string} jsonString - The JSON string to hash.
   * @returns {string} The JSON string with hashes added.
   */
  applyToJsonString(jsonString: string): string {
    const json = JSON.parse(jsonString);
    const applyConfig = ApplyJsonHashConfig.default;
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
  calcHash(string: string): string {
    const hash = sha256.arrayBuffer(string);
    const bytes = new Uint8Array(hash);
    const base64 = fromByteArray(bytes).substring(0, this.config.hashLength);

    // convert to url safe base64
    return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  }

  // ...........................................................................
  /**
   * Throws if hashes are not correct.
   * @param {Record<string, any>} json - The JSON object to validate.
   */
  validate<T extends Record<string, any>>(json: T): T {
    // Check the hash of the high level element
    const ac = ApplyJsonHashConfig.default;
    ac.throwIfOnWrongHashes = false;
    const jsonWithCorrectHashes = this.apply(json, ac);
    this._validate(json, jsonWithCorrectHashes, '');
    return json;
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
  private _validate(
    jsonIs: Record<string, any>,
    jsonShould: Record<string, any>,
    path: string,
  ): void {
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
   * @param {ApplyJsonHashConfig} applyConfig - Whether to process recursively.
   */
  private _addHashesToObject(
    obj: Record<string, any>,
    applyConfig: ApplyJsonHashConfig,
  ): void {
    const updateExisting = applyConfig.updateExistingHashes;
    const throwIfOnWrongHashes = applyConfig.throwIfOnWrongHashes;

    const existingHash = obj['_hash'];
    if (!updateExisting && existingHash) {
      return;
    }

    // Recursively process child elements
    for (const [, value] of Object.entries(obj)) {
      if (typeof value === 'object' && !Array.isArray(value)) {
        const existingHash = value['_hash'];
        if (existingHash != null && !updateExisting) {
          continue;
        }

        this._addHashesToObject(value, applyConfig);
      } else if (Array.isArray(value)) {
        this._processList(value, applyConfig);
      }
    }

    // Build a new object to represent the current object for hashing
    const objToHash: Record<string, any> = {};

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

    const sortedMapJson = JsonHash._jsonString(objToHash);

    // Compute the SHA-256 hash of the JSON string
    const hash = this.calcHash(sortedMapJson);

    // Throw if old and new hash do not match
    if (throwIfOnWrongHashes) {
      const oldHash = obj['_hash'];
      if (oldHash && oldHash !== hash) {
        throw new Error(
          `Hash "${oldHash}" does not match the newly calculated one "${hash}". ` +
            'Please make sure that all systems are producing the same hashes.',
        );
      }
    }

    // Add the hash to the original object
    obj['_hash'] = hash;
  }

  public _convertBasicType(value: any): any {
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
  private _flattenList(list: Array<any>): Array<any> {
    const flattenedList: Array<any> = [];

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
   * @param {ApplyJsonHashConfig} applyConfig - Whether to process recursively.
   */
  private _processList(
    list: Array<any>,
    applyConfig: ApplyJsonHashConfig,
  ): void {
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
  static _copyJson(json: Record<string, any>): Record<string, any> {
    const copy: Record<string, any> = {};
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
  static _copyList(list: Array<any>): Array<any> {
    const copy: Array<any> = [];
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
  static _isBasicType(value: any): boolean {
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
  private _checkNumber(value: number): void {
    if (isNaN(value)) {
      throw new Error('NaN is not supported.');
    }

    if (Number.isInteger(value)) {
      return;
    }

    if (this._exceedsPrecision(value)) {
      throw new Error(`Number ${value} has a higher precision than 0.001.`);
    }

    if (this._exceedsUpperRange(value)) {
      throw new Error(`Number ${value} exceeds NumberHashingConfig.maxNum.`);
    }

    if (this._exceedsLowerRange(value)) {
      throw new Error(
        `Number ${value} is smaller than NumberHashingConfig.minNum.`,
      );
    }
  }

  // ...........................................................................
  /**
   * Checks if a number exceeds the defined range.
   * @param {number} value - The number to check.
   * @returns {boolean} True if the number exceeds the given range, false otherwise.
   */
  private _exceedsUpperRange(value: number): boolean {
    return value > this.config.numberConfig.maxNum;
  }

  // ...........................................................................
  /**
   * Checks if a number exceeds the defined range.
   * @param {number} value - The number to check.
   * @returns {boolean} True if the number exceeds the given range, false otherwise.
   */
  private _exceedsLowerRange(value: number): boolean {
    return value < this.config.numberConfig.minNum;
  }

  // ...........................................................................
  /**
   * Checks if a number exceeds the precision.
   * @param {number} value - The number to check.
   * @returns {boolean} True if the number exceeds the precision, false otherwise.
   */
  private _exceedsPrecision(value: number): boolean {
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
  static _jsonString(map: Record<string, any>): string {
    // Sort the object keys to ensure consistent key order
    const sortedKeys = Object.keys(map).sort();

    const encodeValue = (value: any): string => {
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

    var result: string[] = [];
    result.push('{');
    for (var i = 0; i < sortedKeys.length; i++) {
      const key = sortedKeys[i];
      const isLast = i == sortedKeys.length - 1;
      result.push(`"${key}":` + `${encodeValue(map[key])}`);
      if (!isLast) result.push(',');
    }
    result.push('}');

    return result.join('');
  }
}

/**
 * A shortcut to a default instance
 */
export const jh = JsonHash.default;
