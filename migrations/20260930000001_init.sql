-- Create "users" table
CREATE TABLE "users" (
  "id" uuid NOT NULL,
  "username" text NOT NULL,
  "password_hash" text NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY ("id"),
  CONSTRAINT "users_username_key" UNIQUE ("username")
);

-- Create "posts" table
CREATE TABLE "posts" (
  "id" uuid NOT NULL,
  "user_id" uuid NOT NULL,
  "title" text NOT NULL,
  "content" text NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY ("id"),
  CONSTRAINT "posts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE
);

-- Lookup indexes
CREATE INDEX "posts_user_id_idx" ON "posts" ("user_id");
CREATE INDEX "posts_created_at_idx" ON "posts" ("created_at" DESC);
