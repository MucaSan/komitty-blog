// Types mirror the proto definitions in /proto/blog/v1/blog.proto.
// (A generated protobuf-es version also exists at /frontend/gen/blog/v1/blog_pb.ts.)

export interface User {
  id: string;
  username: string;
  createdAt: string;
  isPrime: boolean;
}

export interface Post {
  id: string;
  userId: string;
  username: string;
  title: string;
  content: string;
  createdAt: string;
}

export interface PostPage {
  posts: Post[];
  total: number;
  page: number;
  totalPages: number;
}

export interface Comment {
  id: string;
  postId: string;
  userId: string;
  username: string;
  parentId: string;
  content: string;
  createdAt: string;
}

export interface Session {
  token: string;
  user: User;
}

export type Theme = "dark" | "white";
export type ToolbarPosition = "top" | "down" | "drag";

export interface Settings {
  theme: Theme;
  toolbar: ToolbarPosition;
}
