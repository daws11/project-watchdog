-- Migration: Add context enrichment fields with source tracking
-- This enables AI to auto-fill context fields while respecting user overrides

-- Add context fields to projects
ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "priorities" text;
ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "custom_prompt" text;

-- Add context fields to connections (groups)
ALTER TABLE "connections" ADD COLUMN IF NOT EXISTS "description" text;
ALTER TABLE "connections" ADD COLUMN IF NOT EXISTS "priorities" text;
ALTER TABLE "connections" ADD COLUMN IF NOT EXISTS "custom_prompt" text;

-- Add source tracking to projects (who filled the data: 'user' or 'ai')
ALTER TABLE "projects" ADD COLUMN "description_source" text DEFAULT 'ai';
ALTER TABLE "projects" ADD COLUMN "priorities_source" text DEFAULT 'ai';
ALTER TABLE "projects" ADD COLUMN "custom_prompt_source" text DEFAULT 'ai';

-- Add source tracking to connections
ALTER TABLE "connections" ADD COLUMN "description_source" text DEFAULT 'ai';
ALTER TABLE "connections" ADD COLUMN "priorities_source" text DEFAULT 'ai';
ALTER TABLE "connections" ADD COLUMN "custom_prompt_source" text DEFAULT 'ai';

-- Add source tracking to people_settings
ALTER TABLE "people_settings" ADD COLUMN "role_description_source" text DEFAULT 'ai';
ALTER TABLE "people_settings" ADD COLUMN "priorities_source" text DEFAULT 'ai';
ALTER TABLE "people_settings" ADD COLUMN "custom_prompt_source" text DEFAULT 'ai';
