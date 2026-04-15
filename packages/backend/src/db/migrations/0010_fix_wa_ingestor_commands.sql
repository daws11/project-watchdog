-- Migration: Sync wa_ingestor_commands schema with code.
-- The schema file (src/db/schema/wa_ingestor_commands.ts) was extended to
-- support the durable outbox pattern (payload, attempts, available_at,
-- last_error) but no migration was ever generated. This migration brings the
-- DB back in sync idempotently.

ALTER TABLE "wa_ingestor_commands" ADD COLUMN IF NOT EXISTS "payload" jsonb;
ALTER TABLE "wa_ingestor_commands" ADD COLUMN IF NOT EXISTS "attempts" integer NOT NULL DEFAULT 0;
ALTER TABLE "wa_ingestor_commands" ADD COLUMN IF NOT EXISTS "available_at" timestamp with time zone;
ALTER TABLE "wa_ingestor_commands" ADD COLUMN IF NOT EXISTS "last_error" text;
