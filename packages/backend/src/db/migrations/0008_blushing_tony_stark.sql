CREATE TABLE "project_wiki_revisions" (
	"id" serial PRIMARY KEY NOT NULL,
	"section_id" integer NOT NULL,
	"previous_content" text,
	"new_content" text NOT NULL,
	"diff_summary" text,
	"source_message_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"confidence" real DEFAULT 1 NOT NULL,
	"actor" text NOT NULL,
	"review_state" text DEFAULT 'pending' NOT NULL,
	"applied_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project_wiki_sections" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer NOT NULL,
	"kind" text NOT NULL,
	"title" text NOT NULL,
	"content" text NOT NULL,
	"token_estimate" integer DEFAULT 0 NOT NULL,
	"source_message_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"confidence" real DEFAULT 1 NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"created_by" text DEFAULT 'llm' NOT NULL,
	"updated_by" text DEFAULT 'llm' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "project_wiki_revisions" ADD CONSTRAINT "project_wiki_revisions_section_id_project_wiki_sections_id_fk" FOREIGN KEY ("section_id") REFERENCES "public"."project_wiki_sections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_wiki_sections" ADD CONSTRAINT "project_wiki_sections_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "project_wiki_sections_pkt_idx" ON "project_wiki_sections" USING btree ("project_id","kind","title");