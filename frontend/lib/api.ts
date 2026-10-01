// Typed API client for the grpc-gateway REST endpoints (see /proto/blog/v1/blog.proto).
//
// Each function first attempts the real backend. If the backend is reachable
// but returns an error (4xx/5xx), that error is surfaced to the caller. If the
// backend is unreachable (e.g. not started yet), we transparently fall back to
// the in-browser mock store so the UI remains fully usable in development.

import type { Post, Session, User } from "./types";
import * as mock from "./mock";

// Empty string means "same origin" — in production nginx proxies /v1/* to the
// backend, so relative requests hit the same domain. For local development,
// set NEXT_PUBLIC_API_URL=http://localhost:8080 in frontend/.env.local.
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });

  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const body = await res.json();
      if (typeof body?.message === "string") message = body.message;
      else if (typeof body?.error === "string") message = body.error;
    } catch {
      // ignore malformed error body
    }
    throw new ApiError(message, res.status);
  }

  return (await res.json()) as T;
}

function isApiError(err: unknown): err is ApiError {
  return err instanceof ApiError;
}

export async function listPosts(): Promise<Post[]> {
  try {
    const data = await request<{ posts?: Post[] }>("/v1/posts");
    return data.posts ?? [];
  } catch (err) {
    if (isApiError(err)) throw err;
    return mock.listPosts();
  }
}

export async function listUserPosts(username: string): Promise<Post[]> {
  try {
    const data = await request<{ posts?: Post[] }>(
      `/v1/users/${encodeURIComponent(username)}/posts`,
    );
    return data.posts ?? [];
  } catch (err) {
    if (isApiError(err)) throw err;
    return mock.listUserPosts(username);
  }
}

export async function createUser(username: string, password: string): Promise<Session> {
  try {
    const data = await request<{ user: User; token: string }>("/v1/users", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    });
    return { user: data.user, token: data.token };
  } catch (err) {
    if (isApiError(err)) throw err;
    return mock.createUser(username, password);
  }
}

export async function login(username: string, password: string): Promise<Session> {
  try {
    const data = await request<{ user: User; token: string }>("/v1/login", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    });
    return { user: data.user, token: data.token };
  } catch (err) {
    if (isApiError(err)) throw err;
    return mock.login(username, password);
  }
}

export async function createPost(title: string, content: string, session: Session): Promise<Post> {
  try {
    const data = await request<{ post: Post }>("/v1/posts", {
      method: "POST",
      headers: { Authorization: `Bearer ${session.token}` },
      body: JSON.stringify({ title, content }),
    });
    return data.post;
  } catch (err) {
    if (isApiError(err)) throw err;
    return mock.createPost(title, content, session);
  }
}
