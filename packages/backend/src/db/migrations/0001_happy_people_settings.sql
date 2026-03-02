CREATE TABLE "people_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"person_id" text NOT NULL,
	"name" text,
	"aliases" text[] DEFAULT '{}' NOT NULL,
	"email" text,
	"phone" text,
	"role_name" text,
	"role_description" text,
	"priorities" text,
	"custom_prompt" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "people_settings_person_id_unique" UNIQUE("person_id")
);
