CREATE TABLE `department_heads` (
	`id` integer PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`department` text NOT NULL,
	`job_title` text NOT NULL,
	`is_active` integer DEFAULT 1 NOT NULL,
	`created_at` integer DEFAULT (strftime('%s', 'now'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `department_heads_email_unique` ON `department_heads` (`email`);--> statement-breakpoint
CREATE INDEX `department_heads_email_idx` ON `department_heads` (`email`);--> statement-breakpoint
CREATE INDEX `department_heads_department_idx` ON `department_heads` (`department`);--> statement-breakpoint
CREATE INDEX `department_heads_is_active_idx` ON `department_heads` (`is_active`);--> statement-breakpoint
CREATE TABLE `documents` (
	`id` integer PRIMARY KEY NOT NULL,
	`document_type` text NOT NULL,
	`file_path` text NOT NULL,
	`uploaded_date` integer DEFAULT (strftime('%s', 'now')),
	`student_record_id` integer,
	FOREIGN KEY (`student_record_id`) REFERENCES `student_records`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `documents_student_record_idx` ON `documents` (`student_record_id`);--> statement-breakpoint
CREATE TABLE `reviewer_reports` (
	`id` integer PRIMARY KEY NOT NULL,
	`student_record_id` integer,
	`grade` real DEFAULT 0 NOT NULL,
	`reviewer_personal_info` text NOT NULL,
	`review_fields` text NOT NULL,
	`is_signed` integer DEFAULT 0 NOT NULL,
	`created_date` integer DEFAULT (strftime('%s', 'now')),
	FOREIGN KEY (`student_record_id`) REFERENCES `student_records`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `reviewer_reports_student_record_idx` ON `reviewer_reports` (`student_record_id`);--> statement-breakpoint
CREATE TABLE `student_records` (
	`id` integer PRIMARY KEY NOT NULL,
	`student_group` text NOT NULL,
	`final_project_title` text DEFAULT '' NOT NULL,
	`student_email` text NOT NULL,
	`student_name` text NOT NULL,
	`student_lastname` text NOT NULL,
	`student_number` text NOT NULL,
	`supervisor_email` text NOT NULL,
	`study_program` text NOT NULL,
	`department` text DEFAULT '' NOT NULL,
	`program_code` text NOT NULL,
	`current_year` integer NOT NULL,
	`reviewer_email` text DEFAULT '' NOT NULL,
	`reviewer_name` text DEFAULT '' NOT NULL,
	`is_favorite` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE INDEX `student_email_idx` ON `student_records` (`student_email`);--> statement-breakpoint
CREATE INDEX `supervisor_email_idx` ON `student_records` (`supervisor_email`);--> statement-breakpoint
CREATE INDEX `reviewer_email_idx` ON `student_records` (`reviewer_email`);--> statement-breakpoint
CREATE INDEX `study_program_idx` ON `student_records` (`study_program`);--> statement-breakpoint
CREATE INDEX `department_idx` ON `student_records` (`department`);--> statement-breakpoint
CREATE TABLE `supervisor_reports` (
	`id` integer PRIMARY KEY NOT NULL,
	`student_record_id` integer,
	`supervisor_comments` text DEFAULT '' NOT NULL,
	`other_match` real DEFAULT 0 NOT NULL,
	`one_match` real DEFAULT 0 NOT NULL,
	`own_match` real DEFAULT 0 NOT NULL,
	`join_match` real DEFAULT 0 NOT NULL,
	`created_date` integer DEFAULT (strftime('%s', 'now')),
	FOREIGN KEY (`student_record_id`) REFERENCES `student_records`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `supervisor_reports_student_record_idx` ON `supervisor_reports` (`student_record_id`);--> statement-breakpoint
CREATE TABLE `videos` (
	`id` integer PRIMARY KEY NOT NULL,
	`student_record_id` integer NOT NULL,
	`key` text NOT NULL,
	`filename` text NOT NULL,
	`content_type` text NOT NULL,
	`size` integer,
	`url` text,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	FOREIGN KEY (`student_record_id`) REFERENCES `student_records`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `videos_student_record_idx` ON `videos` (`student_record_id`);