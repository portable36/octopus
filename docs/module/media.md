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
createUploadSession(contentHints, size, checksum?) → { uploadId, parts?, expiresAt }
completeUpload(uploadId, partEtags?) → mediaId | quarantine
getMedia(mediaId) → metadata + signed download URL when authorized
abortUpload(uploadId)
```

Provider SDKs (S3/MinIO/R2) stay in infrastructure adapters.

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
