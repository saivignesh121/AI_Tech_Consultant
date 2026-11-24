ALTER TABLE "api_connections" RENAME COLUMN "business_id" TO "workspace_id";--> statement-breakpoint
ALTER TABLE "api_connections" DROP CONSTRAINT "api_connections_business_id_businesses_id_fk";
--> statement-breakpoint
DROP INDEX "uq_api_conn_business_provider";--> statement-breakpoint
ALTER TABLE "api_connections" ALTER COLUMN "status" SET DEFAULT 'unchecked';--> statement-breakpoint
ALTER TABLE "api_connections" ADD COLUMN "key_version" varchar(50) DEFAULT '1' NOT NULL;--> statement-breakpoint
ALTER TABLE "api_connections" ADD COLUMN "iv" varchar(24);--> statement-breakpoint
ALTER TABLE "api_connections" ADD COLUMN "auth_tag" varchar(32);--> statement-breakpoint
ALTER TABLE "api_connections" ADD COLUMN "ciphertext" text;--> statement-breakpoint
ALTER TABLE "api_connections" ADD COLUMN "last4" varchar(4);--> statement-breakpoint
ALTER TABLE "api_connections" ADD COLUMN "validated_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "api_connections" ADD COLUMN "created_by" uuid;--> statement-breakpoint
ALTER TABLE "api_connections" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "api_connections" ADD CONSTRAINT "api_connections_workspace_id_businesses_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "api_connections" ADD CONSTRAINT "api_connections_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "uq_api_conn_workspace_provider" ON "api_connections" USING btree ("workspace_id","provider");--> statement-breakpoint
UPDATE "api_connections" SET "status" = 'unchecked' WHERE "status" = 'untested';--> statement-breakpoint
UPDATE "api_connections" SET "status" = 'rejected' WHERE "status" = 'error';