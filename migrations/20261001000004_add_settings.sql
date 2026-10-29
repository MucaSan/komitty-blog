-- Create "settings" table to store per-user visual preferences as a single
-- JSONB document. Defaults (dark theme, top toolbar) are returned by the API
-- without persisting a row until the user saves their settings.
CREATE TABLE "settings" (
  "user_id" uuid NOT NULL,
  "data" jsonb NOT NULL,
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY ("user_id"),
  CONSTRAINT "settings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE
);
