-- MySQL dump 10.19  Distrib 10.3.38-MariaDB, for debian-linux-gnu (x86_64)

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `groups`
--

DROP TABLE IF EXISTS `groups`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `groups` (
  `id` int(11) NOT NULL COMMENT 'BIT MASK!',
  `name` varchar(50) NOT NULL
) ENGINE=MyISAM DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `groups_usr`
--

DROP TABLE IF EXISTS `groups_usr`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `groups_usr` (
  `uuid_user` varchar(80) NOT NULL,
  `groups` int(11) NOT NULL,
  PRIMARY KEY (`uuid_user`)
) ENGINE=MyISAM DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `external_users_usr`
--

DROP TABLE IF EXISTS `external_users_usr`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `external_users_usr` (
  `id_usr` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `name_usr` varchar(60) NOT NULL,
  `company_usr` varchar(80) NOT NULL,
  `email_usr` varchar(80) NOT NULL,
  `password_usr` char(80) NOT NULL,
  `public_pgp_key_usr` text NOT NULL,
  `email_code_usr` char(32) DEFAULT NULL,
  `status_usr` int(1) unsigned NOT NULL DEFAULT 0 COMMENT '0:new, 1:email_valid, 2:admin_valid, 3:disabled / can login if is admin_valid (2)',
  `rights_daily_usr` int(1) unsigned NOT NULL DEFAULT 1,
  `rights_monthly_usr` int(1) unsigned NOT NULL DEFAULT 1,
  `rights_clean_usr` int(1) unsigned NOT NULL DEFAULT 0,
  `register_date_usr` datetime DEFAULT NULL,
  `last_login_date_usr` datetime DEFAULT NULL,
  `limitation_date_usr` date DEFAULT NULL,
  `ip_usr` varchar(20) DEFAULT NULL,
  `pgp_key_name_usr` varchar(80) DEFAULT NULL,
  `rights_url_usr` int(1) NOT NULL DEFAULT 0,
  `second_public_gpg_key_text_usr` text DEFAULT NULL,
  `second_public_gpg_key_name_usr` varchar(120) DEFAULT NULL,
  `salt_usr` varchar(80) NOT NULL,
  `uuid_usr` varchar(80) NOT NULL,
  PRIMARY KEY (`id_usr`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `internal_users_uin`
--

DROP TABLE IF EXISTS `internal_users_uin`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `internal_users_uin` (
  `id_uin` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `fname_uin` varchar(50) NOT NULL,
  `lname_uin` varchar(50) NOT NULL,
  `email_uin` varchar(50) NOT NULL,
  `enabled_uin` int(1) unsigned NOT NULL DEFAULT 0,
  `password_uin` char(32) NOT NULL,
  `register_date_uin` datetime NOT NULL,
  `register_by_uin` varchar(80) DEFAULT NULL,
  `last_login_date_uin` datetime DEFAULT NULL,
  `notification_pgp_error_uin` int(1) unsigned NOT NULL DEFAULT 0,
  `notification_undetected_samples_uin` int(1) unsigned NOT NULL DEFAULT 0,
  `notification_new_account_request_uin` int(1) unsigned NOT NULL DEFAULT 0,
  `uuid_uin` varchar(80) NOT NULL,
  `salt_uin` varchar(80) NOT NULL,
  PRIMARY KEY (`id_uin`),
  UNIQUE KEY `email_uin` (`email_uin`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `permanent_statistics_user_psu`
--

DROP TABLE IF EXISTS `permanent_statistics_user_psu`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `permanent_statistics_user_psu` (
  `date_psu` date NOT NULL,
  `hour_psu` int(3) unsigned NOT NULL,
  `uuidusr_psu` varchar(80) NOT NULL,
  `files_number_psu` int(10) unsigned DEFAULT NULL,
  `files_size_psu` int(10) unsigned DEFAULT NULL,
  `files_in_list_count_psu` int(10) unsigned DEFAULT NULL,
  `files_unique_number_psu` int(10) unsigned DEFAULT NULL,
  `vendor` varchar(80) DEFAULT NULL,
  PRIMARY KEY (`date_psu`,`hour_psu`,`uuidusr_psu`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `samples_clean_scl`
--

DROP TABLE IF EXISTS `samples_clean_scl`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `samples_clean_scl` (
  `id_scl` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `md5_scl` char(32) NOT NULL,
  `sha256_scl` char(64) DEFAULT NULL,
  `added_when_scl` timestamp NOT NULL DEFAULT current_timestamp(),
  `file_size_scl` int(10) unsigned NOT NULL,
  `type_scl` varchar(50) NOT NULL,
  `enabled_scl` int(1) unsigned NOT NULL DEFAULT 1,
  PRIMARY KEY (`id_scl`),
  UNIQUE KEY `NewIndex1` (`md5_scl`,`type_scl`),
  UNIQUE KEY `NewIndex2` (`sha256_scl`,`type_scl`),
  KEY `date` (`added_when_scl`),
  KEY `type` (`type_scl`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `samples_detected_sde`
--

DROP TABLE IF EXISTS `samples_detected_sde`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `samples_detected_sde` (
  `id_sde` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `md5_sde` char(32) NOT NULL,
  `detection_sde` varchar(40) DEFAULT NULL,
  `sha256_sde` char(64) DEFAULT NULL,
  `file_size_sde` int(10) unsigned NOT NULL,
  `added_when_sde` timestamp NOT NULL DEFAULT current_timestamp(),
  `type_sde` varchar(50) NOT NULL,
  `enabled_sde` int(1) unsigned NOT NULL DEFAULT 1,
  PRIMARY KEY (`id_sde`),
  UNIQUE KEY `NewIndex1` (`md5_sde`,`type_sde`),
  UNIQUE KEY `NewIndex2` (`sha256_sde`,`type_sde`),
  KEY `date` (`added_when_sde`),
  KEY `type` (`type_sde`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tokens`
--

DROP TABLE IF EXISTS `tokens`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `tokens` (
  `uuid` varchar(80) NOT NULL,
  `token` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `urls_url`
--

DROP TABLE IF EXISTS `urls_url`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `urls_url` (
  `id_url` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `md5_url` char(32) NOT NULL,
  `sha256_url` char(64) DEFAULT NULL,
  `url_url` varchar(1200) NOT NULL,
  `added_when_url` date NOT NULL,
  `enabled_url` int(1) unsigned NOT NULL DEFAULT 1,
  PRIMARY KEY (`id_url`),
  UNIQUE KEY `md5` (`md5_url`),
  UNIQUE KEY `sha256` (`sha256_url`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `user_files_usf`
--

DROP TABLE IF EXISTS `user_files_usf`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `user_files_usf` (
  `id_usf` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `idusl_usf` int(11) unsigned DEFAULT NULL,
  `md5_usf` char(32) NOT NULL,
  `sha256_usf` char(64) DEFAULT NULL,
  `date_usf` timestamp NOT NULL DEFAULT current_timestamp(),
  `count_usf` int(2) unsigned NOT NULL,
  `uuidusr_usf` varchar(80) NOT NULL,
  `file_size_usf` int(10) unsigned NOT NULL,
  `is_detected` int(11) DEFAULT 0,
  `vendor` varchar(80) DEFAULT NULL,
  PRIMARY KEY (`id_usf`),
  KEY `ListId` (`idusl_usf`),
  KEY `idusr_usf` (`uuidusr_usf`),
  KEY `md5_usf` (`md5_usf`),
  KEY `sha256_usf` (`sha256_usf`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `user_lists_usl`
--

DROP TABLE IF EXISTS `user_lists_usl`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `user_lists_usl` (
  `id_usl` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `date_usl` timestamp NOT NULL DEFAULT current_timestamp(),
  `uuidusr_usl` varchar(80) NOT NULL,
  `text_usl` varchar(50) NOT NULL,
  `number_of_files_usl` int(10) unsigned NOT NULL,
  `start_interval_usl` date DEFAULT NULL,
  `end_interval_usl` date DEFAULT NULL,
  `list_type_usl` enum('Detected','Clean','Urls') NOT NULL DEFAULT 'Detected',
  PRIMARY KEY (`id_usl`),
  KEY `User` (`uuidusr_usl`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;
