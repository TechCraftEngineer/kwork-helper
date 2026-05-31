CREATE TABLE "kwork_offers" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer NOT NULL,
	"project_title" text NOT NULL,
	"project_price" integer NOT NULL,
	"is_match" boolean NOT NULL,
	"match_reason" text,
	"suggested_price" integer,
	"proposal_text" text,
	"sent" boolean DEFAULT false NOT NULL,
	"sent_at" timestamp,
	"error" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "kwork_offers_project_id_unique" UNIQUE("project_id")
);
