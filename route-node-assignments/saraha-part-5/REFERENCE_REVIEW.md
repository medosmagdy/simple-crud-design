# Reference review for Part 5

Observed code frames, not a full transcript or a supplied final project archive.

| Recording                                                             | Observed position          | Evidence used                                                                                                                                               |
| --------------------------------------------------------------------- | -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Repository Pattern Implementation (13kBhbAK1My0ZOXk36w_IY2GAYKUgAmxT) | 02:00, 10:00, 17:30, 27:40 | ESM, DB/Models, DB/Repositories, BaseRepository, UserRepository inheritance, controller/service split                                                       |
| Build Custom Error Class (1D9MFM28bJi8eWnxk4JW5LuFA56Enx9Fq)          | 03:00, 09:00               | HttpAppError, message/statusCode/data/code and error middleware                                                                                             |
| Validation Middleware (1q1R-mqCjghxmwearYvSKCrIvqal8aQw\_)            | 14:18                      | safeParse(req.body), req.validate, middleware returning next                                                                                                |
| Implement Refresh (11jD9f7XrzWebYOjplWVuSw_epvGoouKn)                 | 28:17, 30:20               | role-specific access/refresh secrets; token utility and service separation                                                                                  |
| Build Logout API (1Ue9gSYrLZYFgFQ8Qzyb3ewQ2DbWd42BJ)                  | 04:45, 07:00               | separate access/refresh decoded data, jti-based Redis blacklist keys and expiration TTL                                                                     |
| Confirm Email API (1VY7ffSGcv-yac2FC_RDxV9VRn1EfuDKw)                 | 05:53, 11:46               | Redis verification-code flow, hash comparison, final Config/Modules structure                                                                               |
| Upload ProfilePicture API (1QHoOkIb2-vPAR82o5qcxeloJUbimkCcC)         | 08:20, 11:26               | PATCH /api/users/profile-picture, profile file field, multerUpload desiredPath Profiles, user service uploadProfilePicture, profileImage and static uploads |

References all come from the user-supplied Eng. Amira Ezzat track in Drive. The revised source documents which observations support each major change. Not all route names, every status code or every final field constraint were visible in these sampled frames; those details should not be described as fully matched to the instructor.
