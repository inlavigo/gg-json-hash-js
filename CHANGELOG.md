# Changelog

## [3.3.2]

- Switch SHA-256 algorithm
- Switch base64 algorithm

## [3.3.0]

- Add public method `JsonHash.copyJson` and some more.

## [3.2.1]

- Objects to be hashed can contain null

## [3.2.0]

- Treat empty `_hash` as no hashes. Fill them.

## [3.1.0]

- Use `calcHash()` also hashes for arrays, records or strings

## [3.0.2]

- Build with vite 6.0.10
- `validate` returns the original object to be used in instantiation

## [3.0.0]

- Add `applyInPlace` to quickly write hashes into objects
- `JsonHash.apply` returns the same type it is applied to.
  - Type does not get lost by applying hash.
- Add `jh` as a shortcut to `JsonHash.default`.
- BREAKING CHANGE:
  - `apply` return the same type they getting in.
    - If the type did not have a `_hash` field, static type checking will fail.

## [2.1.8]

- Generate proper type definitions.
- Update vitest config

## [2.1.7]

- Improve the algorithm to produce the same hashes as the dart implementation

## [2.1.3]

- Configure number ranges
- Configure number precision
- Throw if numbers do not ranges and precision

## [2.0.2]

- Update README.md

## [2.0.1]

- Initial implementation
