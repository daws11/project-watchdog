ALTER TABLE "api_keys" ADD COLUMN "encrypted_key" text;
--> statement-breakpoint
ALTER TABLE "api_keys" ADD COLUMN "iv" text;
--> statement-breakpoint
ALTER TABLE "api_keys" ADD COLUMN "auth_tag" text;
--> statement-breakpoint
ALTER TABLE "api_keys" ADD COLUMN "last_used_at" timestamp with time zone;
