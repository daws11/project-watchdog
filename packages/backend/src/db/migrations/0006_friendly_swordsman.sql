CREATE TABLE "people_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"person_id" text NOT NULL,
	"name" text,
	"aliases" text[] DEFAULT '{}' NOT NULL,
	"email" text,
	"phone" text,
	"role_name" text,
	"role_description" text,
	"role_description_source" text DEFAULT 'ai',
	"priorities" text,
	"priorities_source" text DEFAULT 'ai',
	"custom_prompt" text,
	"custom_prompt_source" text DEFAULT 'ai',
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "people_settings_person_id_unique" UNIQUE("person_id")
);
--> statement-breakpoint
CREATE TABLE "smtp_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"host" text DEFAULT '' NOT NULL,
	"port" integer DEFAULT 587 NOT NULL,
	"username" text DEFAULT '' NOT NULL,
	"password" text DEFAULT '' NOT NULL,
	"from_address" text DEFAULT '' NOT NULL,
	"encryption" text DEFAULT 'starttls' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "wa_ingestor_commands" (
	"id" serial PRIMARY KEY NOT NULL,
	"command" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"consumed_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "api_keys" ADD COLUMN "encrypted_key" text;--> statement-breakpoint
ALTER TABLE "api_keys" ADD COLUMN "iv" text;--> statement-breakpoint
ALTER TABLE "api_keys" ADD COLUMN "auth_tag" text;--> statement-breakpoint
ALTER TABLE "api_keys" ADD COLUMN "last_used_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "connections" ADD COLUMN "description" text;--> statement-breakpoint
ALTER TABLE "connections" ADD COLUMN "description_source" text DEFAULT 'ai';--> statement-breakpoint
ALTER TABLE "connections" ADD COLUMN "priorities" text;--> statement-breakpoint
ALTER TABLE "connections" ADD COLUMN "priorities_source" text DEFAULT 'ai';--> statement-breakpoint
ALTER TABLE "connections" ADD COLUMN "custom_prompt" text;--> statement-breakpoint
ALTER TABLE "connections" ADD COLUMN "custom_prompt_source" text DEFAULT 'ai';--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "description" text;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "description_source" text DEFAULT 'ai';--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "priorities" text;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "priorities_source" text DEFAULT 'ai';--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "custom_prompt" text;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "custom_prompt_source" text DEFAULT 'ai';--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "similarity_hash" text;--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "parent_task_id" integer;--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "merged_task_ids" jsonb DEFAULT '[]'::jsonb;--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "previous_description" text;--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "previous_deadline" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "update_count" integer DEFAULT 0;