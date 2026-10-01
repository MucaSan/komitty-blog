-- Create "images" table to store uploaded post images.
CREATE TABLE "images" (
  "id" uuid NOT NULL,
  "user_id" uuid NOT NULL,
  "content_type" text NOT NULL,
  "size" bigint NOT NULL,
  "data" bytea NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY ("id"),
  CONSTRAINT "images_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE
);

CREATE INDEX "images_created_at_idx" ON "images" ("created_at" DESC);
