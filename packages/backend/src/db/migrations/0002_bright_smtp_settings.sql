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
