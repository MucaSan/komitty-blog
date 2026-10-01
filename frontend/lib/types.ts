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

export interface Session {
  token: string;
  user: User;
}
