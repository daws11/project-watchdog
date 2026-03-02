CREATE TABLE "wa_ingestor_commands" (
	"id" serial PRIMARY KEY NOT NULL,
	"command" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"consumed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE INDEX "wa_ingestor_commands_pending_idx" ON "wa_ingestor_commands" USING btree ("consumed_at","created_at");

