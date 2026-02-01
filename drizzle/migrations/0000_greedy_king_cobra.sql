CREATE TABLE `reminders` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`message` text NOT NULL,
	`chat_ids` text NOT NULL,
	`when` text NOT NULL,
	`api_url` text,
	`ring` integer DEFAULT 0 NOT NULL,
	`active` integer DEFAULT 1 NOT NULL,
	`count` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL
);
