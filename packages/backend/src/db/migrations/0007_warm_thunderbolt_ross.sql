ALTER TABLE "wa_ingestor_commands" ADD COLUMN "payload" jsonb;--> statement-breakpoint
ALTER TABLE "wa_ingestor_commands" ADD COLUMN "attempts" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "wa_ingestor_commands" ADD COLUMN "available_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "wa_ingestor_commands" ADD COLUMN "last_error" text;