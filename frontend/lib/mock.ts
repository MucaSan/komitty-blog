// In-browser mock backend, used automatically when the real backend is not
// reachable. It persists to localStorage so signup → login → create post all
// work end-to-end during local development without a database.

import type { Post, PostPage, Session, Settings, User } from "./types";
import { DEFAULT_SETTINGS } from "./settings";

interface StoredUser extends User {
  password: string;
}

const USERS_KEY = "komitty_mock_users";
const POSTS_KEY = "komitty_mock_posts";
const SETTINGS_KEY = "komitty_mock_settings";

const SEED_USERS: StoredUser[] = [
  { id: "u-ada", username: "ada", password: "password1", createdAt: "2026-09-01T10:00:00Z", isPrime: true },
  { id: "u-alan", username: "alan", password: "password1", createdAt: "2026-09-02T10:00:00Z", isPrime: false },
  { id: "u-emmy", username: "emmy", password: "password1", createdAt: "2026-09-03T10:00:00Z", isPrime: false },
];

const SEED_POSTS: Post[] = [
  {
    id: "p-1",
    userId: "u-ada",
    username: "ada",
    title: "A small note on elliptic curves",
    content:
      "Elliptic curves are one of my favorite objects in mathematics.\n\nThey carry a group structure, and that structure is exactly what modern cryptography leans on.",
    createdAt: "2026-09-20T09:00:00Z",
  },
  {
    id: "p-2",
    userId: "u-alan",
    username: "alan",
    title: "Thinking about the Entscheidungsproblem",
    content:
      "A short reflection on decidability and why some problems are simply beyond any mechanical procedure.",
    createdAt: "2026-09-18T14:30:00Z",
  },
  {
    id: "p-3",
    userId: "u-emmy",
    username: "emmy",
    title: "Noether's theorem, in plain words",
    content:
      "Every differentiable symmetry of a physical system corresponds to a conservation law. Here is the intuition behind it.",
    createdAt: "2026-09-15T11:00:00Z",
  },
];

function storage(): Storage | null {
  return typeof window !== "undefined" ? window.localStorage : null;
}

function readJSON<T>(key: string, seed: T): T {
  const s = storage();
  if (!s) return seed;
  const raw = s.getItem(key);
  if (!raw) {
    s.setItem(key, JSON.stringify(seed));
    return seed;
  }
  try {
    return JSON.parse(raw) as T;
  } catch {
    return seed;
  }
}

function writeJSON<T>(key: string, value: T): void {
  storage()?.setItem(key, JSON.stringify(value));
}

function getUsers(): StoredUser[] {
  return readJSON<StoredUser[]>(USERS_KEY, SEED_USERS);
}

function getPosts(): Post[] {
  return readJSON<Post[]>(POSTS_KEY, SEED_POSTS);
}

function newestFirst(posts: Post[]): Post[] {
  return posts.slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

function stripPassword(user: StoredUser): User {
  const { password: _password, ...rest } = user;
  return rest;
}

const MOCK_PAGE_SIZE = 10;

function paginatePosts(posts: Post[], page: number): PostPage {
  const total = posts.length;
  const totalPages = total > 0 ? Math.ceil(total / MOCK_PAGE_SIZE) : 0;
  const current = Math.max(1, page);
  const start = (current - 1) * MOCK_PAGE_SIZE;
  return {
    posts: posts.slice(start, start + MOCK_PAGE_SIZE),
    total,
    page: current,
    totalPages,
  };
}

export function listPosts(page = 1): PostPage {
  return paginatePosts(newestFirst(getPosts()), page);
}

export function listUserPosts(username: string, page = 1): PostPage {
  return paginatePosts(newestFirst(getPosts().filter((p) => p.username === username)), page);
}

export function getPost(id: string): Post | null {
  return getPosts().find((p) => p.id === id) ?? null;
}

export function createUser(username: string, password: string): Session {
  const users = getUsers();
  if (users.some((u) => u.username.toLowerCase() === username.toLowerCase())) {
    throw new Error("username is already taken");
  }
  const stored: StoredUser = {
    id: `u-${Date.now()}`,
    username,
    password,
    createdAt: new Date().toISOString(),
    isPrime: false,
  };
  users.push(stored);
  writeJSON(USERS_KEY, users);
  return { user: stripPassword(stored), token: `mock-token-${stored.id}` };
}

export function login(username: string, password: string): Session {
  const user = getUsers().find((u) => u.username === username && u.password === password);
  if (!user) throw new Error("invalid username or password");
  return { user: stripPassword(user), token: `mock-token-${user.id}` };
}

export function createPost(title: string, content: string, session: Session): Post {
  const post: Post = {
    id: `p-${Date.now()}`,
    userId: session.user.id,
    username: session.user.username,
    title,
    content,
    createdAt: new Date().toISOString(),
  };
  const posts = getPosts();
  posts.unshift(post);
  writeJSON(POSTS_KEY, posts);
  return post;
}

function getSettingsByUser(): Record<string, Settings> {
  return readJSON<Record<string, Settings>>(SETTINGS_KEY, {});
}

export function getSettings(session: Session): Settings {
  return getSettingsByUser()[session.user.id] ?? DEFAULT_SETTINGS;
}

export function updateSettings(settings: Settings, session: Session): Settings {
  const all = getSettingsByUser();
  all[session.user.id] = settings;
  writeJSON(SETTINGS_KEY, all);
  return settings;
}
