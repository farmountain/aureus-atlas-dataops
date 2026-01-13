# Evidence Bundle Signature Scheme

Evidence bundles are stored as JSON objects with the following shape:

```json
{
  "payload": { "..." : "..." },
  "hash": "<sha256-of-payload>",
  "signature": "<sha256-of-hash-and-signing-key>"
}
```

## Hashing

1. The evidence payload is normalized by recursively sorting object keys.
2. The normalized payload is serialized with `JSON.stringify`.
3. The SHA-256 digest of the serialized payload becomes the `hash`.

## Signature

Evidence signatures use a placeholder signing key until a real key-management system is wired up.

1. Take the payload hash from the previous step.
2. Concatenate it with the signing key using the format `hash:signingKey`.
3. Compute a SHA-256 digest of that string.
4. Store the resulting digest as `signature`.

## Verification

To verify a bundle:

1. Recompute the payload hash using the normalization + SHA-256 steps above.
2. Recompute the signature using the same signing key.
3. Compare both the hash and signature against the stored values.

The UI surfaces verification results so operators can quickly see whether evidence bundles match their stored signatures before exporting.
