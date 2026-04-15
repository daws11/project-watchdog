CREATE TABLE "llm_providers" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"base_url" text,
	"encrypted_api_key" text NOT NULL,
	"iv" text NOT NULL,
	"auth_tag" text NOT NULL,
	"masked_key" text NOT NULL,
	"default_model" text NOT NULL,
	"advanced_model" text NOT NULL,
	"is_active" boolean DEFAULT false NOT NULL,
	"last_used_at" timestamp with time zone,
	"last_test_at" timestamp with time zone,
	"last_test_ok" boolean,
	"last_test_error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "llm_providers_active_unique_idx" ON "llm_providers" USING btree ("is_active") WHERE "llm_providers"."is_active" = true;