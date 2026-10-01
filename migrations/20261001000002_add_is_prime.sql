-- Add the prime-user (owner) flag.
ALTER TABLE "users" ADD COLUMN "is_prime" boolean NOT NULL DEFAULT false;
