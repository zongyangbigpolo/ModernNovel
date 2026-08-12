CREATE TABLE `project_style_memory` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`profile` text NOT NULL,
	`source_chapter_ids` text,
	`source_word_count` integer DEFAULT 0,
	`version` integer DEFAULT 1 NOT NULL,
	`provider` text,
	`model` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `project`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `project_style_memory_project_id_unique` ON `project_style_memory` (`project_id`);--> statement-breakpoint
CREATE TABLE `project_writer_skill` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`skill_id` text NOT NULL,
	`enabled` integer DEFAULT true NOT NULL,
	`order` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `project`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`skill_id`) REFERENCES `writer_skill`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `project_writer_skill_project_id_idx` ON `project_writer_skill` (`project_id`);--> statement-breakpoint
CREATE INDEX `project_writer_skill_skill_id_idx` ON `project_writer_skill` (`skill_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `project_writer_skill_project_skill_unique` ON `project_writer_skill` (`project_id`,`skill_id`);--> statement-breakpoint
CREATE TABLE `writer_skill` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`instructions` text NOT NULL,
	`checklist` text,
	`examples` text,
	`source_url` text,
	`source_license` text,
	`built_in` integer DEFAULT false NOT NULL,
	`created_by` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`created_by`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `writer_skill_created_by_idx` ON `writer_skill` (`created_by`);--> statement-breakpoint
CREATE INDEX `writer_skill_built_in_idx` ON `writer_skill` (`built_in`);