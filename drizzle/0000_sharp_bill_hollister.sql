CREATE TABLE `interests` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`language` text,
	`country` text,
	`created_at` integer DEFAULT '"2026-04-10T11:02:33.953Z"'
);
--> statement-breakpoint
CREATE TABLE `keywords` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`interest_id` integer NOT NULL,
	`word` text NOT NULL,
	FOREIGN KEY (`interest_id`) REFERENCES `interests`(`id`) ON UPDATE no action ON DELETE cascade
);
