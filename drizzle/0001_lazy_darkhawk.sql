ALTER TABLE `interests` ALTER COLUMN "created_at" TO "created_at" integer DEFAULT CURRENT_TIMESTAMP;--> statement-breakpoint
ALTER TABLE `interests` ADD `refresh_interval` integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE `interests` ADD `notifications_enabled` integer DEFAULT false;--> statement-breakpoint
ALTER TABLE `interests` ADD `last_scan_at` integer;