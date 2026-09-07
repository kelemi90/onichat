CREATE TABLE `streamer_requests` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`requestedTenant` varchar(48) NOT NULL,
	`requestedChannel` varchar(25) NOT NULL,
	`status` enum('pending','approved','rejected','revoked') NOT NULL DEFAULT 'pending',
	`note` text,
	`reviewedBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`reviewedAt` timestamp,
	CONSTRAINT `streamer_requests_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `streamer_tenants` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ownerUserId` int NOT NULL,
	`slug` varchar(48) NOT NULL,
	`displayName` varchar(120) NOT NULL,
	`channel` varchar(25) NOT NULL,
	`twitchUserId` varchar(64),
	`twitchLogin` varchar(64),
	`encryptedRefreshToken` text,
	`allowedOrigin` varchar(255) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `streamer_tenants_id` PRIMARY KEY(`id`),
	CONSTRAINT `streamer_tenants_slug_unique` UNIQUE(`slug`),
	CONSTRAINT `streamer_tenants_channel_unique` UNIQUE(`channel`)
);
