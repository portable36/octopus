# Media Module

## Responsibility

The Media bounded context owns uploaded assets, metadata, variants, storage references, access rules, and lifecycle state (including quarantine until validation completes).

Media owns:

- Media asset aggregate and ownership (platform / vendor / store)
- Object storage keys and provider-independent references
- Upload session / multipart / resumable session records
- Async processing status (scan, variants, rejection reason)
- Signed upload and download URL issuance via infrastructure ports

Media does not own:

- Product or catalog business data (Catalog references media IDs)
- CMS page content (CMS references media IDs)
- Payment or order binaries

## Backend upload invariants

1. **Never upload through the backend** — clients use presigned direct-to-storage uploads.
2. **Validate file type by content** (magic bytes / headers), not extension alone.
3. **Multipart uploads** for large objects; server-generated object keys.
4. **Resumable uploads** — resume interrupted multipart sessions; expire abandoned ones.
5. **Process async** — scan, variants, and indexing on queues after the object lands.
6. **Rate limit and size limits** — per actor/tenant and per object.

Authoritative rule: `.cursor/rules/38-media-uploads.mdc`.

## Public contracts (expected)

```text
createUploadSession(contentHints, size≤10MB) → { storageKey, uploadUrl, expiresAt, requiredHeaders }
createMultipartSession(size≤100MB) → { storageKey, uploadId, partSizeHintBytes, … }
createMultipartPartUrl(storageKey, uploadId, partNumber) → { uploadUrl, … }
listMultipartParts(storageKey, uploadId) → { parts: [{ partNumber, etag, size }] }  // resume
completeMultipartSession(storageKey, uploadId, parts) → { completed: true }
abortMultipartSession(storageKey, uploadId) → { aborted: true }
registerMetadata(storageKey, contentPrefixBase64, …) → mediaId (+ status quarantined|ready)
  (requires object present in storage; magic-byte + size match; enqueues quarantine when queue active)
getPublicMedia(mediaId) → { url, expiresAt? }  // only when status=ready
getMedia(mediaId) → metadata + downloadUrl when authorized and ready
```

### Processing lifecycle

1. Client completes PUT/multipart, then `registerMetadata` (sync magic + HeadObject).
2. When `OUTBOX_DISPATCH_ENABLED=true`, asset is `quarantined` and `MediaQuarantineValidate` is enqueued on `octopus.media-processing`.
3. Worker Range-GETs object prefix, re-sniffs magic bytes, sets `ready` or `rejected`.
4. On `ready`, enqueues `MediaGenerateVariants` stub (no derivatives yet).
5. Public/authorized download URLs are issued only for `ready` assets.

Provider SDKs (S3/MinIO/R2) stay in infrastructure adapters.

## Shipped vs later

| Shipped                                                                   | Later                                                             |
| ------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| Presigned single-object PUT (≤10MB)                                       | Virus/malware scanner beyond magic-byte quarantine                |
| Multipart + resumable parts (≤100MB; ListParts resume)                    | Image variants / derivatives (job stubbed)                        |
| Magic-byte + HeadObject checks                                            | Dedicated multipart session DB rows (S3 uploadId is enough today) |
| Signed GET or `MEDIA_PUBLIC_BASE_URL` CDN                                 |                                                                   |
| Async quarantine (`octopus.media-processing` / `MediaQuarantineValidate`) |                                                                   |
| Download gated until `status=ready`                                       |                                                                   |

## Testing requirements

- Reject content that does not match declared type (magic-byte mismatch)
- Oversize and rate-limit rejection
- Resume after partial multipart failure
- Quarantine until async scan/validation passes
- Cross-tenant media ID access denied

## Related

- [PHASES.md](../PHASES.md) — Catalog / Media checklist
- [admin-dashboard.md](../admin-dashboard.md) — Media management UX
- `.cursor/rules/38-media-uploads.mdc`
- `.cursor/rules/32-catalog-variants.mdc`
- [SECURITY.md](../../SECURITY.md)
