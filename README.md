# Komitty Blog

A web-first blog for posting achievements in **mathematics, physics, history** and
more, with a UI faithful to the [Komitty](https://github.com/MucaSan/komitty-android-app)
app.

## Stack

```
Browser ──▶ grpc-gateway (REST/JSON @ /v1/*) ──▶ Go gRPC server ──▶ PostgreSQL
                     │                                    ▲
                     └── generated Go (buf) + hand-typed TS ┘
```

| Layer | Technology |
| --- | --- |
| Frontend | Next.js 15 (App Router) + TypeScript |
| Backend | Go + gRPC + [grpc-gateway](https://github.com/grpc-ecosystem/grpc-gateway) |
| API contract | Protocol Buffers (single source of truth in `proto/`) |
| Code generation | [buf](https://buf.build) |
| Database | PostgreSQL 16 |
| Migrations | [Atlas](https://atlasgo.io) |

## Directory layout

```
komitty-blog/
├── proto/blog/v1/blog.proto     # API definition (source of truth)
├── buf.yaml / buf.gen.yaml      # buf module + codegen config
├── backend/                     # Go service
│   ├── cmd/server/main.go       # gRPC + gateway entrypoint
│   ├── internal/{config,db,auth,service}
│   └── gen/blog/v1/             # generated gRPC/gateway code
├── frontend/                    # Next.js app
│   ├── app/                     # pages: /, /login, /signup, /new, /u/[username]
│   ├── components/              # Logo, Navbar, PostCard, PasswordField
│   └── lib/                     # types, api client, mock store, session
├── migrations/                  # Atlas versioned SQL migrations + atlas.sum
├── schema.hcl                   # Atlas declarative schema
├── atlas.hcl                    # Atlas project config
└── docker-compose.yml           # PostgreSQL (+ one-shot migrate)
```

## Features

| Feature | Endpoint | RPC |
| --- | --- | --- |
| Create account (username, password, repeat password) | `POST /v1/users` | `CreateUser` |
| Log in | `POST /v1/login` | `Login` |
| Create a post | `POST /v1/posts` | `CreatePost` |
| Browse all posts | `GET /v1/posts` | `ListPosts` |
| Browse a user's posts | `GET /v1/users/{username}/posts` | `ListUserPosts` |

Repeat-password is validated on the client; the backend stores a bcrypt hash of
the password and issues a short-lived JWT used to authorize `CreatePost`.

## Prerequisites

- Go 1.27+, Node.js 22+ (LTS), buf, and Atlas (see `Makefile`; on this machine
  they were installed as portable binaries under `~/tools/{go,node,bin}`).
- Docker (for PostgreSQL) — or any reachable Postgres 16 instance.

## Quick start

### 1. Frontend (works immediately)

```bash
cd frontend
npm install
npm run dev            # → http://localhost:3000
```

The frontend tries the backend first. If the backend is not reachable it
transparently falls back to an **in-browser mock store** (localStorage), so
signup → login → create post → browse all work end-to-end without a database.

### 2. Database + migrations

```bash
docker compose up -d db
export DATABASE_URL="postgres://komitty:komitty@localhost:5432/komitty?sslmode=disable"
atlas migrate apply --env local
```

### 3. Backend

```bash
cp .env.example .env   # then adjust values
cd backend
go run ./cmd/server    # gRPC :50051 + HTTP gateway :8080
```

The frontend points at `http://localhost:8080` by default
(`NEXT_PUBLIC_API_URL` in the frontend).

## Regenerating code from `.proto`

```bash
buf dep update   # only needed when deps change
buf generate     # regenerates backend/gen
```

## Useful `make` targets

```bash
make generate          # buf generate
make backend-build     # go build ./...
make backend-run       # go run ./cmd/server
make db-up             # docker compose up -d db
make migrate           # atlas migrate apply --env local
make frontend-install  # npm install
make frontend-dev      # npm run dev
make frontend-build    # npm run build
```

## Notes

- The Go module path is `github.com/MucaSan/komitty-blog/backend`. Adjust if the
  repository ends up under a different owner/remote.
- Passwords are hashed with bcrypt; JWTs use HS256 with `JWT_SECRET`.
