-- Create "comments" table for nested (threaded) comments on posts.
-- A top-level comment has a NULL parent_id; replies point at the comment they
-- answer. Deleting a comment (or a post) cascades to its descendants.
CREATE TABLE "comments" (
  "id" uuid NOT NULL,
  "post_id" uuid NOT NULL,
  "user_id" uuid NOT NULL,
  "parent_id" uuid NULL,
  "content" text NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY ("id"),
  CONSTRAINT "comments_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "posts" ("id") ON DELETE CASCADE,
  CONSTRAINT "comments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE,
  CONSTRAINT "comments_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "comments" ("id") ON DELETE CASCADE
);

CREATE INDEX "comments_post_id_idx" ON "comments" ("post_id");
CREATE INDEX "comments_parent_id_idx" ON "comments" ("parent_id");
