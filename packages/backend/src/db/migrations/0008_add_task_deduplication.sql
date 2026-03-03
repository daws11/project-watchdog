-- Migration: Add task deduplication and evolution tracking columns
-- Created: 2026-03-04

-- Add similarity hash untuk fast deduplication lookup
ALTER TABLE "tasks" ADD COLUMN "similarity_hash" text;

-- Add index untuk similarity lookup menggunakan HASH index untuk exact match
CREATE INDEX "tasks_similarity_hash_idx" ON "tasks" USING hash ("similarity_hash");

-- Add parent_task_id untuk tracking task merges
ALTER TABLE "tasks" ADD COLUMN "parent_task_id" integer;
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_parent_task_id_fk"
  FOREIGN KEY ("parent_task_id") REFERENCES "tasks"("id") ON DELETE set null;

-- Add merged_task_ids untuk tracking merged tasks (JSON array of task IDs)
ALTER TABLE "tasks" ADD COLUMN "merged_task_ids" jsonb DEFAULT '[]';

-- Add task evolution tracking columns
ALTER TABLE "tasks" ADD COLUMN "previous_description" text;
ALTER TABLE "tasks" ADD COLUMN "previous_deadline" timestamp with time zone;
ALTER TABLE "tasks" ADD COLUMN "update_count" integer DEFAULT 0;

-- Index untuk project + status queries yang sering dilakukan
-- Partial index hanya untuk status 'open' untuk performa lebih baik
CREATE INDEX "tasks_project_status_idx" ON "tasks" ("project_id", "status")
  WHERE "status" = 'open';

-- Index untuk message_id lookup
CREATE INDEX "tasks_message_id_idx" ON "tasks" ("message_id");

-- Index untuk parent_task_id lookup (untuk mencari child tasks)
CREATE INDEX "tasks_parent_task_id_idx" ON "tasks" ("parent_task_id");
