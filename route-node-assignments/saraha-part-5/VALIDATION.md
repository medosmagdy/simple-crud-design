# Part 5 validation

Executed on Node 24.22.1 with a real disposable MongoDB server and Redis 7.0.15:

- Zod validation writes req.validate and rejects extra role fields, mismatched password confirmation and out-of-range age.
- BCrypt password and verification-code hashes are persisted; phoneNumber is encrypted; no password hashes are exposed in profile responses.
- Register/confirm/login, incorrect/reused OTP rejection, access/refresh secret separation, role rejection, profile update and anonymous-message ownership.
- PATCH /api/users/profile-picture using the exact multipart field profile; file stored by DiskStorage under Profiles, path saved to profileImage, bytes retrievable through express.static.
- Missing/wrong file field, spoofed MIME content, unsupported MIME, oversized upload and unauthenticated upload are rejected; rejected files do not remain in the upload folder.
- Refresh issues tokens; logout blacklists both jti values in real Redis with a positive TTL; mixed-user token pairs and revoked tokens are rejected.

SMTP and Google verification use test doubles; real delivery/provider login were not performed. No secrets or instructor credentials were copied from the recordings. No claim of exact instructor acceptance is made; see REFERENCE_REVIEW.md for observed evidence and unresolved details.

Use an isolated disposable Redis DB with REDIS_TEST_URL to run npm test. The test removes all keys from that selected DB during cleanup.
