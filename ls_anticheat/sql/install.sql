-- Referenzkopie der Tabellen. Wird beim Resource-Start automatisch von
-- server/db.lua per "CREATE TABLE IF NOT EXISTS" angelegt, muss also nicht
-- manuell ausgeführt werden - liegt hier nur zur Doku/für manuelle Setups.

CREATE TABLE IF NOT EXISTS `ls_anticheat_bans` (
  `id`            INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `license`       VARCHAR(64)  NOT NULL,
  `discord`       VARCHAR(32)  NULL,
  `ip`            VARCHAR(45)  NULL,
  `last_name`     VARCHAR(64)  NULL,
  `reason`        VARCHAR(255) NOT NULL,
  `banned_by`     VARCHAR(64)  NOT NULL,
  `banned_at`     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `expires_at`    DATETIME     NULL,
  `active`        TINYINT(1)   NOT NULL DEFAULT 1,
  `unbanned_by`   VARCHAR(64)  NULL,
  `unbanned_at`   DATETIME     NULL,
  PRIMARY KEY (`id`),
  KEY `idx_license` (`license`),
  KEY `idx_discord` (`discord`),
  KEY `idx_ip` (`ip`)
);

CREATE TABLE IF NOT EXISTS `ls_anticheat_flags` (
  `id`            INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `license`       VARCHAR(64)  NOT NULL,
  `player_name`   VARCHAR(64)  NULL,
  `module`        VARCHAR(32)  NOT NULL,
  `severity`      ENUM('info','warn','high','critical') NOT NULL DEFAULT 'warn',
  `details`       JSON         NULL,
  `coords`        VARCHAR(64)  NULL,
  `action_taken`  VARCHAR(32)  NOT NULL DEFAULT 'none',
  `created_at`    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `reviewed`      TINYINT(1)   NOT NULL DEFAULT 0,
  `reviewed_by`   VARCHAR(64)  NULL,
  `reviewed_at`   DATETIME     NULL,
  PRIMARY KEY (`id`),
  KEY `idx_license` (`license`),
  KEY `idx_module` (`module`),
  KEY `idx_reviewed` (`reviewed`)
);

CREATE TABLE IF NOT EXISTS `ls_anticheat_whitelist` (
  `id`            INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `license`       VARCHAR(64)  NOT NULL,
  `module`        VARCHAR(32)  NULL,
  `reason`        VARCHAR(255) NOT NULL,
  `added_by`      VARCHAR(64)  NOT NULL,
  `added_at`      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `expires_at`    DATETIME     NULL,
  PRIMARY KEY (`id`),
  KEY `idx_license` (`license`)
);
