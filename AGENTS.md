# AGENTS.md

## Cursor Cloud specific instructions

### Overview

This is **Gadfly Dating** — a Node.js/Express 5 REST API backend for a dating/companion platform. It uses MongoDB for persistence and JWT for authentication.

### Services

| Service | How to start |
|---------|-------------|
| MongoDB | `mongod --dbpath /data/db --bind_ip 127.0.0.1 --port 27017` (background) |
| Express API | `node server.js` (port 5000) |

### Development database

The `.env` file's `MONGO_URI` should point to a local MongoDB instance for development:

```
MONGO_URI=mongodb://127.0.0.1:27017/gadfly_dating
```

The Atlas credentials committed in the repo are expired. Always use a local MongoDB instance.

### Running the server

```bash
cd /workspace
node server.js
```

The server starts on `PORT` from `.env` (default 5000). It auto-connects to MongoDB on startup.

### Key API routes

- `POST /api/auth/generate-otp` — mock OTP (always returns `"1234"`)
- `POST /api/auth/mobile-login` — verify OTP (accepts any PIN)
- `POST /api/user` — register user (supports `multipart/form-data` for file uploads)
- `GET /api/user` — list users (filterable by `role`, `isVerified`)
- `GET /api/user/:id` — get user profile
- `PUT /api/user/verify/:id` — verify a partner

### Caveats

- No test framework is configured (`package.json` has no `test` script). Verify behavior with `curl` or similar tools.
- No linter is configured. There are no `devDependencies`.
- OTP/SMS is fully mocked — no external service needed.
- The `uploads/` directory is created automatically by multer middleware.
- MongoDB must be running before starting the server or it will call `process.exit(1)`.
