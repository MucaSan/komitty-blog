// Typed API client for the grpc-gateway REST endpoints (see /proto/blog/v1/blog.proto).
//
// Each function first attempts the real backend. If the backend is reachable
// but returns an error (4xx/5xx), that error is surfaced to the caller. If the
// backend is unreachable (e.g. not started yet), we transparently fall back to
// the in-browser mock store so the UI remains fully usable in development.

import type { Comment, Post, PostPage, Session, Settings, User } from "./types";
import { DEFAULT_SETTINGS, isValidSettings } from "./settings";
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

// The gateway serializes the protobuf int32 fields with their proto JSON names,
// which are camelCase (`totalPages`, not `total_pages`).
type RawPostPage = {
  posts?: Post[];
  total?: number;
  page?: number;
  totalPages?: number;
};

function normalizePostPage(data: RawPostPage, fallbackPage: number): PostPage {
  const posts = data.posts ?? [];
  const total = data.total ?? posts.length;
  const page = data.page ?? fallbackPage;
  const totalPages = data.totalPages ?? (total > 0 ? Math.ceil(total / 10) : 0);
  return { posts, total, page, totalPages };
}

export async function listPosts(page = 1): Promise<PostPage> {
  try {
    const data = await request<RawPostPage>(`/v1/posts?page=${page}`);
    return normalizePostPage(data, page);
  } catch (err) {
    if (isApiError(err)) throw err;
    return mock.listPosts(page);
  }
}

export async function listUserPosts(username: string, page = 1): Promise<PostPage> {
  try {
    const data = await request<RawPostPage>(
      `/v1/users/${encodeURIComponent(username)}/posts?page=${page}`,
    );
    return normalizePostPage(data, page);
  } catch (err) {
    if (isApiError(err)) throw err;
    return mock.listUserPosts(username, page);
  }
}

export async function getPost(id: string): Promise<Post | null> {
  try {
    const data = await request<{ post?: Post }>(`/v1/posts/${encodeURIComponent(id)}`);
    return data.post ?? null;
  } catch (err) {
    if (isApiError(err)) throw err;
    return mock.getPost(id);
  }
}

export async function createUser(
  username: string,
  password: string,
  session: Session,
): Promise<Session> {
  try {
    const data = await request<{ user: User; token: string }>("/v1/users", {
      method: "POST",
      headers: { Authorization: `Bearer ${session.token}` },
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

export async function uploadImage(
  data: string,
  contentType: string,
  session: Session,
): Promise<{ id: string; url: string }> {
  return request<{ id: string; url: string }>("/v1/images", {
    method: "POST",
    headers: { Authorization: `Bearer ${session.token}` },
    body: JSON.stringify({ data, contentType }),
  });
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

export async function updatePost(
  id: string,
  title: string,
  content: string,
  session: Session,
): Promise<Post> {
  const data = await request<{ post: Post }>(`/v1/posts/${id}`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${session.token}` },
    body: JSON.stringify({ title, content }),
  });
  return data.post;
}

export async function deletePost(id: string, session: Session): Promise<void> {
  await request<unknown>(`/v1/posts/${id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${session.token}` },
  });
}

export async function getSettings(session: Session): Promise<Settings> {
  try {
    const data = await request<{ settings: Settings }>("/v1/settings", {
      headers: { Authorization: `Bearer ${session.token}` },
    });
    return isValidSettings(data.settings) ? data.settings : DEFAULT_SETTINGS;
  } catch (err) {
    if (isApiError(err)) throw err;
    return mock.getSettings(session);
  }
}

export async function updateSettings(
  settings: Settings,
  session: Session,
): Promise<Settings> {
  // Client-side validation mirrors the backend's validation; never send an
  // unsupported settings document.
  if (!isValidSettings(settings)) {
    throw new ApiError("invalid settings", 400);
  }

  try {
    const data = await request<{ settings: Settings }>("/v1/settings", {
      method: "POST",
      headers: { Authorization: `Bearer ${session.token}` },
      body: JSON.stringify({ settings }),
    });
    return data.settings;
  } catch (err) {
    if (isApiError(err)) throw err;
    return mock.updateSettings(settings, session);
  }
}

export async function listComments(postId: string): Promise<Comment[]> {
  try {
    const data = await request<{ comments?: Comment[] }>(
      `/v1/posts/${encodeURIComponent(postId)}/comments`,
    );
    return data.comments ?? [];
  } catch (err) {
    if (isApiError(err)) throw err;
    return mock.listComments(postId);
  }
}

export async function createComment(
  postId: string,
  parentId: string,
  content: string,
  session: Session,
): Promise<Comment> {
  try {
    const data = await request<{ comment: Comment }>(
      `/v1/posts/${encodeURIComponent(postId)}/comments`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${session.token}` },
        body: JSON.stringify({ parentId: parentId || undefined, content }),
      },
    );
    return data.comment;
  } catch (err) {
    if (isApiError(err)) throw err;
    return mock.createComment(postId, parentId, content, session);
  }
}

export async function updateComment(
  id: string,
  content: string,
  session: Session,
): Promise<Comment> {
  try {
    const data = await request<{ comment: Comment }>(
      `/v1/comments/${encodeURIComponent(id)}`,
      {
        method: "PATCH",
        headers: { Authorization: `Bearer ${session.token}` },
        body: JSON.stringify({ content }),
      },
    );
    return data.comment;
  } catch (err) {
    if (isApiError(err)) throw err;
    return mock.updateComment(id, content, session);
  }
}
