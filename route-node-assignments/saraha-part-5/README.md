# SarahaApp pt.5 — revised submission

Muhammad Magdy — C48 Node.js Sat&Tues 9PM (Online).

This is a separate revision for Part 5 only. Earlier assignment folders and earlier Saraha submissions are preserved. It replaces the earlier cumulative app as the proposed Part 5 submission, not as a claim that every earlier part has been reworked.

## What changed

- ES modules; Config, Common, DB/Models, DB/Repositories, Middleware and Modules/Auth, User, Message.
- Controllers own routing and HTTP responses; services own application logic; UserRepository extends BaseRepository.
- Dedicated validation middleware saves parsed input as req.validate. Authentication exposes req.authUser and decoded token data; refresh decoding is a separate middleware.
- BCrypt password/OTP hashing and Redis email-verification storage. Redis blacklists use bl*access*<jti> and bl*refresh*<jti> with expiry-based TTL. No custom MongoDB Session model.
- Profile fields include gender, phoneNumber, isEmailVerified and profileImage. Responses omit password hashes.
- PATCH /api/users/profile-picture accepts multipart field profile. Configurable Multer DiskStorage writes to uploads/Profiles. The service checks magic bytes using file-type and persists profileImage. express.static serves the upload root.

## Setup

Requires Node 22+, MongoDB and Redis. Run npm ci. Copy .env.example to .env and set database/SMTP configuration. Set four different JWT secrets of at least 32 random characters and a 32-byte PHONE_ENCRYPTION_KEY encoded as 64 hex characters. Never commit .env. Run npm start; default bind is localhost:3008.
SMTP_HOST and MAIL_FROM are required at normal startup. Registration sends a real verification email; there is no development shortcut that pretends delivery. Redis is required for verification and revocation. Optional GOOGLE_CLIENT_ID enables real Google ID-token verification. Tests inject a mailbox and Google verifier, and explicitly state that boundary.
Tokens have separate user/admin and access/refresh secrets. Signup cannot set admin roles. Logout requires an access token in Authorization plus refreshToken in the JSON body and rejects tokens from different users.

## Main requests

| Method    | URL                           | Input                                                                        |
| --------- | ----------------------------- | ---------------------------------------------------------------------------- |
| POST      | /api/auth/register            | firstName,lastName,email,password,confirmPassword, optional phone,gender,age |
| POST      | /api/auth/login               | email,password                                                               |
| PATCH     | /api/auth/confirm-email       | email,otp                                                                    |
| POST      | /api/auth/resend-confirmation | email                                                                        |
| POST      | /api/auth/refresh-token       | refreshToken                                                                 |
| POST      | /api/auth/logout              | Bearer access token plus JSON refreshToken                                   |
| POST      | /api/auth/google              | Google idToken                                                               |
| GET/PATCH | /api/users/profile            | Bearer token; PATCH allows profile fields only                               |
| DELETE    | /api/users/delete             | Bearer token                                                                 |
| PATCH     | /api/users/profile-picture    | Bearer token; form-data File profile                                         |
| GET       | /api/users/public/:id         | public profile                                                               |
| GET       | /api/users                    | admin Bearer token                                                           |
| POST      | /api/messages/:recipientId    | content                                                                      |
| GET       | /api/messages                 | Bearer token; page and limit                                                 |
| DELETE    | /api/messages/:id             | recipient Bearer token                                                       |

## Reference matching and limits

See REFERENCE_REVIEW.md for video IDs, observed timestamps and the specific changes they support. This is an independently written implementation of the observed approach; it is not an exported instructor project. The recordings show different project names, casing and intermediate structures, so exact parity with every recording is not asserted. Route names not visible in the sampled implementation footage remain implementation choices until the instructor confirms the final reference.
Intentional safety choices: password hashes are not returned, filenames are server-generated rather than trusted client paths, and phone encryption uses AES-256-GCM. The profile image bytes are preserved after signature validation rather than re-encoded through sharp, following the observed upload flow. Signature validation alone does not guarantee that an image fully decodes. Earlier custom password reset and MongoDB session features are not included in this Part 5 revision because they were not verified against this reference flow.
A successful local test run demonstrates behavior, not instructor acceptance.

## Postman and tests

Import postman_collection.json. Requests are named, documented and include response assertions. Register, read the emailed OTP, set otp in the collection and run confirmation/login. Login saves both tokens. Select a local image for the profile field before running the upload request. Logout must come last in the main flow.
Run npm test for validation. Set REDIS_TEST_URL to an isolated disposable Redis database and run npm test for full MongoDB/Redis integration. The integration test deletes all keys in that selected Redis DB; never point it at shared or production data.
Multer research: MULTER_RESEARCH.md. This is an exported collection, not a hosted Postman page.
