# Saraha App — Route C48 — Muhammad Magdy

An independent cumulative implementation based on the topics listed in Eng. Amira Ezzat's Week 9–13 session folders. The announcements supply no endpoint-by-endpoint specification or formal boundaries for parts 1–5. This implementation covers the listed subjects; exact parity with every video demonstration is not claimed. No instructor code has been copied.

## Setup

Node 22+, MongoDB 7+. Run npm ci. Copy .env.example to .env and replace all placeholders with local secrets. Generate each JWT/OTP secret independently with node:crypto randomBytes(32).toString('base64url'), and PHONE_ENCRYPTION_KEY with randomBytes(32).toString('hex'). Never commit .env.
Configure SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, MAIL_FROM for real confirmation emails. REQUIRE_EMAIL_CONFIRMATION defaults to true. Without SMTP, signup returns 503 rather than pretending to send mail. For local API-only practice, explicitly set REQUIRE_EMAIL_CONFIRMATION=false; forgot-password still needs SMTP. Start with npm start on http://localhost:3008.
Optional REDIS_URL enables a Redis revocation cache in addition to persistent MongoDB session records. Optional GOOGLE_CLIENT_ID enables verification of real Google ID tokens. Missing optional configuration returns 503 for the relevant feature.

## Coverage from the instructor folder listings

| Topics                                                                                           | Implementation                                                                    |
| ------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------- |
| Mongoose connection, schema types, validators, setters, indexes, virtuals, finders/update/delete | src/models.js, normalized email, fullName virtual, repository CRUD                |
| Symmetric encryption, Argon2 hashing                                                             | AES-256-GCM phone encryption and Argon2id password hashing                        |
| Environment, repository pattern, exceptions, error handling                                      | .env.example, src/repository.js, src/errors.js, centralized handler               |
| Zod schema, strict objects, custom validation                                                    | src/validation.js, matching password confirmation, profile whitelist              |
| JWT, Bearer authentication, authorization, token types, refresh                                  | src/tokens.js, typed access/refresh JWTs, role middleware, rotation               |
| Google registration/login                                                                        | POST /auth/google verifies Google ID token and stable provider sub                |
| Redis, UUID jti, logout, blacklist, Postman scripts                                              | Redis TTL revocation cache, persistent sessions, exported collection scripts      |
| Nodemailer, signup verification OTP, confirm-email                                               | confirmation/resend/reset flows, expiring hashed single-use codes                 |
| Multer, MIME/signature validation, profile upload, express.static                                | authenticated avatar upload, file-type + sharp decoding/re-encoding, UUID storage |

## API

| Method           | URL                       | Body / purpose                                                        |
| ---------------- | ------------------------- | --------------------------------------------------------------------- |
| POST             | /auth/signup              | firstName,lastName,email,password,confirmPassword, optional phone,age |
| POST             | /auth/confirm-email       | email,otp                                                             |
| POST             | /auth/resend-confirmation | email                                                                 |
| POST             | /auth/login               | email,password; saves access/refresh tokens                           |
| POST             | /auth/refresh             | refreshToken; rotates session and invalidates old tokens              |
| POST             | /auth/logout              | Bearer access token; revokes session                                  |
| POST             | /auth/google              | idToken from Google Identity Services                                 |
| POST             | /auth/forgot-password     | email                                                                 |
| POST             | /auth/reset-password      | email,otp,password                                                    |
| GET/PATCH/DELETE | /users/profile            | Bearer token; own account only                                        |
| PATCH            | /users/password           | currentPassword,password; revokes all sessions                        |
| GET              | /users/public/:id         | public name/avatar only                                               |
| GET              | /admin/users              | existing admin role required                                          |
| POST             | /messages/:recipientId    | content; anonymous message                                            |
| GET              | /messages?page=1&limit=10 | Bearer token; own inbox                                               |
| DELETE           | /messages/:id             | Bearer token; recipient only                                          |
| POST             | /users/profile/avatar     | Bearer token; multipart File named avatar (2MiB max)                  |
| GET              | /health                   | status                                                                |

Roles cannot be selected at signup or edited through profile updates. Promote a local test admin through your database administrator; the public API never grants roles. The Google endpoint expects JSON posted by a client that receives an ID token; it is not a GIS HTML redirect handler and does not accept cookie-based ambient login.
Access tokens expire after 15 minutes; refresh sessions after 7 days. Refresh consumes the old session atomically. Logout, password changes and reset invalidate sessions. MongoDB sessions remain authoritative even if the optional Redis cache is disabled. The auth routes and anonymous messages have request limits.
OTPs expire after 10 minutes, allow 5 failed attempts, and are never returned in API responses. Email sending is not mocked during normal startup. Tests inject a mailbox instead of sending real messages.
Avatar images are decoded and re-encoded to PNG, not just checked by extension. Old image files can remain after replacement/deletion; a production retention cleanup job is outside these local exercises. All APIs bind to localhost by default.

## Postman

Import postman_collection.json. Set email/password and recipientId as needed. With email confirmation enabled, read the received email and set otp before Confirm Email. Login/Refresh scripts capture tokens. Set googleIdToken only if testing a configured Google client. The collection export is the requested documentation artifact, not a hosted Postman URL.
See ../tests/saraha.integration.test.js and ../VALIDATION.md for executed checks and mocked external boundaries. Real SMTP delivery, a real Google authorization flow, and live Redis require the owner's credentials and are not claimed tested.
Multer research is in ../saraha-pending/multer-research.md and its separate runnable example.
