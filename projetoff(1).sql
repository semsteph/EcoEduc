-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Hôte : localhost
-- Généré le : dim. 12 juil. 2026 à 12:27
-- Version du serveur : 10.4.32-MariaDB
-- Version de PHP : 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Base de données : `projetoff`
--

-- --------------------------------------------------------

--
-- Structure de la table `absenceVueParents`
--

CREATE TABLE `absenceVueParents` (
  `id` int(11) NOT NULL,
  `parent_id` int(11) NOT NULL,
  `presence_id` int(11) NOT NULL,
  `viewed_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Déchargement des données de la table `absenceVueParents`
--

INSERT INTO `absenceVueParents` (`id`, `parent_id`, `presence_id`, `viewed_at`) VALUES
(1, 11, 10, '2026-01-23 13:11:16'),
(2, 11, 9, '2026-01-23 13:11:16'),
(3, 11, 8, '2026-01-23 13:11:16'),
(4, 11, 15, '2026-01-28 18:39:35'),
(5, 11, 16, '2026-01-28 19:15:31'),
(7, 11, 17, '2026-01-28 19:15:54'),
(8, 11, 18, '2026-01-28 19:18:04'),
(9, 11, 19, '2026-01-28 19:18:40'),
(11, 11, 20, '2026-01-28 19:20:59'),
(12, 11, 21, '2026-01-28 19:44:27'),
(13, 11, 22, '2026-01-30 12:56:37'),
(14, 11, 23, '2026-01-30 12:58:15'),
(15, 11, 24, '2026-01-30 12:58:45'),
(16, 11, 25, '2026-01-30 12:58:55'),
(17, 11, 26, '2026-01-30 12:59:13'),
(18, 11, 27, '2026-01-30 12:59:55'),
(20, 11, 31, '2026-02-18 11:31:48'),
(21, 11, 32, '2026-02-18 11:32:19'),
(23, 11, 33, '2026-02-21 15:44:33'),
(24, 11, 34, '2026-02-21 15:46:02'),
(26, 23, 38, '2026-03-27 18:08:27'),
(27, 23, 37, '2026-03-27 18:08:27'),
(28, 23, 36, '2026-03-27 18:08:27');

-- --------------------------------------------------------

--
-- Structure de la table `administrations`
--

CREATE TABLE `administrations` (
  `id` int(11) NOT NULL,
  `nom` varchar(50) NOT NULL,
  `prenom` varchar(50) NOT NULL,
  `poste` varchar(50) NOT NULL,
  `telephone` varchar(20) DEFAULT NULL,
  `email` varchar(100) NOT NULL,
  `mot_de_passe` varchar(255) NOT NULL,
  `departement_id` int(11) DEFAULT NULL,
  `commune_id` int(11) DEFAULT NULL,
  `etablissement_id` int(11) DEFAULT NULL,
  `Annee_scolaire_id` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Structure de la table `annee_scolaire`
--

CREATE TABLE `annee_scolaire` (
  `id` int(11) NOT NULL,
  `nom_annee` varchar(20) NOT NULL,
  `etablissement_id` int(11) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `statut` enum('ouverte','cloturee') NOT NULL DEFAULT 'ouverte'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Déchargement des données de la table `annee_scolaire`
--

INSERT INTO `annee_scolaire` (`id`, `nom_annee`, `etablissement_id`, `created_at`, `updated_at`, `statut`) VALUES
(1, '2025-2026', 71, '2026-01-06 13:40:26', '2026-03-17 13:19:03', 'cloturee'),
(3, '2024-2025', 72, '2026-03-24 15:52:52', '2026-03-25 16:03:34', 'cloturee'),
(4, '2025-2026', 72, '2026-03-25 16:38:03', '2026-03-25 16:38:03', 'ouverte'),
(5, '2025-2026', 73, '2026-03-25 17:56:42', '2026-03-29 14:31:28', 'cloturee'),
(6, '2026-2027', 73, '2026-03-29 14:42:00', '2026-03-29 14:42:00', 'ouverte');

-- --------------------------------------------------------

--
-- Structure de la table `bulletin`
--

CREATE TABLE `bulletin` (
  `bulletin_id` int(11) NOT NULL,
  `eleve_id` int(11) NOT NULL,
  `semestre_id` int(11) NOT NULL,
  `matiere_id` int(11) NOT NULL,
  `coef_id` int(11) NOT NULL,
  `moy` float NOT NULL,
  `moycoef` float NOT NULL,
  `moySem` float NOT NULL,
  `rang` varchar(10) NOT NULL,
  `mention` varchar(50) DEFAULT NULL,
  `conduite` decimal(5,2) DEFAULT NULL,
  `etablissement_id` int(11) DEFAULT NULL,
  `moyAn` float DEFAULT NULL,
  `decision` varchar(50) DEFAULT NULL,
  `Annee_scolaire_id` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Déchargement des données de la table `bulletin`
--

INSERT INTO `bulletin` (`bulletin_id`, `eleve_id`, `semestre_id`, `matiere_id`, `coef_id`, `moy`, `moycoef`, `moySem`, `rang`, `mention`, `conduite`, `etablissement_id`, `moyAn`, `decision`, `Annee_scolaire_id`) VALUES
(1, 7, 22, 1, 1, 13.67, 13.67, 15.11, '1er', 'Bien', 18.00, 68, NULL, NULL, NULL),
(2, 7, 22, 5, 1, 13.67, 13.67, 15.11, '1er', 'Bien', 18.00, 68, NULL, NULL, NULL),
(3, 7, 22, 1, 1, 13.67, 13.67, 15.11, '1er', 'Bien', 18.00, 68, NULL, NULL, NULL),
(4, 7, 22, 5, 1, 13.67, 13.67, 15.11, '1er', 'Bien', 18.00, 68, NULL, NULL, NULL),
(5, 1, 22, 1, 1, 13.78, 13.78, 10.7, '5e', 'Passable', 8.00, 68, NULL, NULL, NULL),
(6, 1, 22, 5, 1, 10.33, 10.33, 10.7, '5e', 'Passable', 8.00, 68, NULL, NULL, NULL),
(7, 5, 22, 1, 1, 13.11, 13.11, 14.41, '3e', 'Bien', 18.00, 68, NULL, NULL, NULL),
(8, 5, 22, 5, 1, 12.11, 12.11, 14.41, '3e', 'Bien', 18.00, 68, NULL, NULL, NULL),
(9, 7, 23, 5, 1, 12.67, 12.67, 14.34, '1er', 'Bien', 16.00, 68, 14.6, 'Admis', NULL),
(10, 6, 22, 1, 1, 14.33, 14.33, 14.89, '2e', 'Bien', 18.00, 68, NULL, NULL, NULL),
(11, 6, 23, 5, 1, 13, 13, 14.5, '1er', 'Bien', 16.00, 68, 14.63, 'Admis', NULL),
(12, 4, 22, 5, 1, 12.83, 12.83, 13.78, '4e', 'Assez Bien', 18.00, 68, NULL, NULL, NULL),
(13, 5, 23, 5, 1, 10.83, 10.83, 13.41, '4e', 'Assez Bien', 16.00, 68, 13.74, 'Admis', NULL),
(14, 16, 30, 17, 1, 10, 10, 11.5, '3', 'Passable', 16.00, 72, NULL, NULL, 3),
(15, 16, 30, 18, 1, 10, 10, 11.5, '3', 'Passable', 16.00, 72, NULL, NULL, 3),
(16, 16, 30, 19, 1, 10, 10, 11.5, '3', 'Passable', 16.00, 72, NULL, NULL, 3),
(17, 17, 30, 17, 1, 14, 14, 14.5, '2', 'Bien', 16.00, 72, NULL, NULL, 3),
(18, 17, 30, 18, 1, 14, 14, 14.5, '2', 'Bien', 16.00, 72, NULL, NULL, 3),
(19, 17, 30, 19, 1, 14, 14, 14.5, '2', 'Bien', 16.00, 72, NULL, NULL, 3),
(20, 18, 30, 17, 1, 15, 15, 15.25, '1', 'Bien', 16.00, 72, NULL, NULL, 3),
(21, 18, 30, 18, 1, 15, 15, 15.25, '1', 'Bien', 16.00, 72, NULL, NULL, 3),
(22, 18, 30, 19, 1, 15, 15, 15.25, '1', 'Bien', 16.00, 72, NULL, NULL, 3),
(23, 19, 30, 17, 1, 8, 8, 10, '4', 'Passable', 16.00, 72, NULL, NULL, 3),
(24, 19, 30, 18, 1, 8, 8, 10, '4', 'Passable', 16.00, 72, NULL, NULL, 3),
(25, 19, 30, 19, 1, 8, 8, 10, '4', 'Passable', 16.00, 72, NULL, NULL, 3),
(26, 16, 31, 17, 1, 10, 10, 11.5, '3', 'Passable', 16.00, 72, 11.5, 'Admis', 3),
(27, 16, 31, 18, 1, 10, 10, 11.5, '3', 'Passable', 16.00, 72, 11.5, 'Admis', 3),
(28, 16, 31, 19, 1, 10, 10, 11.5, '3', 'Passable', 16.00, 72, 11.5, 'Admis', 3),
(29, 17, 31, 17, 1, 14, 14, 14.5, '2', 'Bien', 16.00, 72, 14.5, 'Admis', 3),
(30, 17, 31, 18, 1, 14, 14, 14.5, '2', 'Bien', 16.00, 72, 14.5, 'Admis', 3),
(31, 17, 31, 19, 1, 14, 14, 14.5, '2', 'Bien', 16.00, 72, 14.5, 'Admis', 3),
(32, 18, 31, 17, 1, 15, 15, 15.25, '1', 'Bien', 16.00, 72, 15.25, 'Admis', 3),
(33, 18, 31, 18, 1, 15, 15, 15.25, '1', 'Bien', 16.00, 72, 15.25, 'Admis', 3),
(34, 18, 31, 19, 1, 15, 15, 15.25, '1', 'Bien', 16.00, 72, 15.25, 'Admis', 3),
(35, 19, 31, 17, 1, 8, 8, 10, '4', 'Passable', 16.00, 72, 10, 'Admis', 3),
(36, 19, 31, 18, 1, 8, 8, 10, '4', 'Passable', 16.00, 72, 10, 'Admis', 3),
(37, 19, 31, 19, 1, 8, 8, 10, '4', 'Passable', 16.00, 72, 10, 'Admis', 3),
(119, 20, 32, 22, 2, 12, 24, 11.71, '3', 'Passable', 10.00, 73, NULL, NULL, 5),
(121, 20, 32, 23, 2, 12, 24, 11.71, '3', 'Passable', 10.00, 73, NULL, NULL, 5),
(123, 20, 32, 24, 2, 12, 24, 11.71, '3', 'Passable', 10.00, 73, NULL, NULL, 5),
(125, 21, 32, 22, 2, 14, 28, 13.29, '2', 'Assez Bien', 9.00, 73, NULL, NULL, 5),
(126, 21, 32, 23, 2, 14, 28, 13.29, '2', 'Assez Bien', 9.00, 73, NULL, NULL, 5),
(127, 21, 32, 24, 2, 14, 28, 13.29, '2', 'Assez Bien', 9.00, 73, NULL, NULL, 5),
(128, 22, 32, 22, 2, 8, 16, 8.29, '4', 'Insuffisant', 10.00, 73, NULL, NULL, 5),
(129, 22, 32, 23, 2, 8, 16, 8.29, '4', 'Insuffisant', 10.00, 73, NULL, NULL, 5),
(130, 22, 32, 24, 2, 8, 16, 8.29, '4', 'Insuffisant', 10.00, 73, NULL, NULL, 5),
(131, 23, 32, 22, 2, 15, 30, 14.29, '1', 'Bien', 10.00, 73, NULL, NULL, 5),
(132, 23, 32, 23, 2, 15, 30, 14.29, '1', 'Bien', 10.00, 73, NULL, NULL, 5),
(133, 23, 32, 24, 2, 15, 30, 14.29, '1', 'Bien', 10.00, 73, NULL, NULL, 5),
(134, 20, 33, 22, 2, 12, 24, 11.71, '3', 'Passable', 10.00, 73, 11.71, 'Admis', 5),
(135, 20, 33, 23, 2, 12, 24, 11.71, '3', 'Passable', 10.00, 73, 11.71, 'Admis', 5),
(136, 20, 33, 24, 2, 12, 24, 11.71, '3', 'Passable', 10.00, 73, 11.71, 'Admis', 5),
(137, 21, 33, 22, 2, 14, 28, 13.43, '2', 'Assez Bien', 10.00, 73, 13.38, 'Admis', 5),
(138, 21, 33, 23, 2, 14, 28, 13.43, '2', 'Assez Bien', 10.00, 73, 13.38, 'Admis', 5),
(139, 21, 33, 24, 2, 14, 28, 13.43, '2', 'Assez Bien', 10.00, 73, 13.38, 'Admis', 5),
(140, 22, 33, 22, 2, 8, 16, 8.29, '4', 'Insuffisant', 10.00, 73, 8.29, 'Refusé', 5),
(141, 22, 33, 23, 2, 8, 16, 8.29, '4', 'Insuffisant', 10.00, 73, 8.29, 'Refusé', 5),
(142, 22, 33, 24, 2, 8, 16, 8.29, '4', 'Insuffisant', 10.00, 73, 8.29, 'Refusé', 5),
(143, 23, 33, 22, 2, 15, 30, 14.29, '1', 'Bien', 10.00, 73, 14.29, 'Admis', 5),
(144, 23, 33, 23, 2, 15, 30, 14.29, '1', 'Bien', 10.00, 73, 14.29, 'Admis', 5),
(145, 23, 33, 24, 2, 15, 30, 14.29, '1', 'Bien', 10.00, 73, 14.29, 'Admis', 5);

-- --------------------------------------------------------

--
-- Structure de la table `classes`
--

CREATE TABLE `classes` (
  `id` int(11) NOT NULL,
  `nom` varchar(50) NOT NULL,
  `Promotion_id` int(11) DEFAULT NULL,
  `etablissement_id` int(11) DEFAULT NULL,
  `Annee_scolaire_id` int(11) DEFAULT NULL,
  `cycle` varchar(50) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Déchargement des données de la table `classes`
--

INSERT INTO `classes` (`id`, `nom`, `Promotion_id`, `etablissement_id`, `Annee_scolaire_id`, `cycle`) VALUES
(1, '6eme1', 1, 68, NULL, NULL),
(2, '6eme 2', 1, 68, NULL, NULL),
(3, '5eme 1', 2, 68, NULL, NULL),
(4, '4eme 1', 3, 68, NULL, NULL),
(8, '6eme 1', 1, 69, NULL, NULL),
(9, '6ème 1', 1, 71, NULL, 'Cycle 1'),
(10, '6ème 2', 1, 71, NULL, 'Cycle 1'),
(11, '6ème 3', 1, 71, NULL, 'Cycle 1'),
(12, '6ème 4', 1, 71, NULL, 'Cycle 1'),
(13, '6ème 5', 1, 71, NULL, 'Cycle 1'),
(14, '5ème 1', 2, 71, NULL, 'Cycle 1'),
(15, '5ème 2', 2, 71, NULL, 'Cycle 1'),
(16, '5ème 3', 2, 71, NULL, 'Cycle 1'),
(17, '4ème 1', 3, 71, NULL, 'Cycle 1'),
(18, '4ème 2', 3, 71, NULL, 'Cycle 1'),
(19, '4ème 3', 3, 71, NULL, 'Cycle 1'),
(20, '4ème 4', 3, 71, NULL, 'Cycle 1'),
(21, '3ème 1', 4, 71, NULL, 'Cycle 1'),
(22, '3ème 2', 4, 71, NULL, 'Cycle 1'),
(23, '3ème 3', 4, 71, NULL, 'Cycle 1'),
(24, '2nd D 1', 9, 71, NULL, 'Cycle 2'),
(25, '2nd D 2', 9, 71, NULL, 'Cycle 2'),
(26, '1ere D 1', 16, 71, NULL, 'Cycle 2'),
(27, '1ere D 2', 16, 71, NULL, 'Cycle 2'),
(28, 'Tle D 1', 23, 71, NULL, 'Cycle 2'),
(29, 'Tle D 2', 23, 71, NULL, 'Cycle 2'),
(30, 'Tle D 3', 23, 71, NULL, 'Cycle 2'),
(31, '6ème 1', 1, 72, NULL, 'Cycle 1'),
(32, '6ème 2', 1, 72, NULL, 'Cycle 1'),
(33, '5ème 1', 2, 72, NULL, 'Cycle 1'),
(34, '5ème 2', 2, 72, NULL, 'Cycle 1'),
(35, '4ème 1', 3, 72, NULL, 'Cycle 1'),
(36, '6ème 1', 1, 73, NULL, 'Cycle 1'),
(37, '6ème 2', 1, 73, NULL, 'Cycle 1'),
(38, '6ème 3', 1, 73, NULL, 'Cycle 1'),
(39, '5ème 1', 2, 73, NULL, 'Cycle 1'),
(40, '5ème 2', 2, 73, NULL, 'Cycle 1'),
(41, '6ème 1', 1, 74, NULL, 'Cycle 1'),
(42, '6ème 2', 1, 74, NULL, 'Cycle 1'),
(43, '6ème 3', 1, 74, NULL, 'Cycle 1'),
(44, '5ème 1', 2, 74, NULL, 'Cycle 1'),
(45, '5ème 2', 2, 74, NULL, 'Cycle 1');

-- --------------------------------------------------------

--
-- Structure de la table `cloture_parametres`
--

CREATE TABLE `cloture_parametres` (
  `id` int(11) NOT NULL,
  `etablissement_id` int(11) NOT NULL,
  `effectif_max_par_classe` int(11) NOT NULL DEFAULT 50,
  `effectif_min_nouvelle_classe` int(11) NOT NULL DEFAULT 10,
  `activer_creation_auto_classe` tinyint(1) NOT NULL DEFAULT 1,
  `activer_repartition_intelligente` tinyint(1) NOT NULL DEFAULT 1,
  `note_interne` text DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

--
-- Déchargement des données de la table `cloture_parametres`
--

INSERT INTO `cloture_parametres` (`id`, `etablissement_id`, `effectif_max_par_classe`, `effectif_min_nouvelle_classe`, `activer_creation_auto_classe`, `activer_repartition_intelligente`, `note_interne`, `created_at`, `updated_at`) VALUES
(1, 73, 2, 2, 1, 1, '', '2026-03-28 12:29:04', '2026-03-29 17:00:40');

-- --------------------------------------------------------

--
-- Structure de la table `coefficient`
--

CREATE TABLE `coefficient` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `valeur` decimal(10,0) NOT NULL,
  `Annee_scolaire_id` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Déchargement des données de la table `coefficient`
--

INSERT INTO `coefficient` (`id`, `valeur`, `Annee_scolaire_id`) VALUES
(1, 1, NULL),
(2, 2, NULL),
(3, 3, NULL),
(4, 4, NULL),
(5, 5, NULL),
(6, 6, NULL),
(7, 7, NULL);

-- --------------------------------------------------------

--
-- Structure de la table `commune`
--

CREATE TABLE `commune` (
  `commune_id` int(11) NOT NULL,
  `nom` varchar(255) NOT NULL,
  `departement_id` int(11) DEFAULT NULL,
  `Annee_scolaire_id` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Déchargement des données de la table `commune`
--

INSERT INTO `commune` (`commune_id`, `nom`, `departement_id`, `Annee_scolaire_id`) VALUES
(1, 'Cotonou', 2, NULL),
(2, 'Abomey-Calavi', 1, NULL),
(3, 'Ouidah', 1, NULL),
(4, 'Seme-Kpodji', 1, NULL),
(5, 'Tori-Bossito', 1, NULL),
(6, 'Zè', 1, NULL),
(7, 'Porto-Novo', 3, NULL),
(8, 'Adjohoun', 3, NULL),
(9, 'Akpro-Missrê', 3, NULL),
(10, 'Aguegues', 3, NULL),
(11, 'Adjarra', 3, NULL),
(12, 'Bohicon', 4, NULL),
(13, 'Zogbodomey', 4, NULL),
(14, 'Ouinhi', 4, NULL),
(15, 'Djidja', 4, NULL),
(16, 'Save', 5, NULL),
(17, 'Dassa-Zoumè', 5, NULL),
(18, 'Glazoué', 5, NULL),
(19, 'Savalou', 5, NULL),
(20, 'Parakou', 6, NULL),
(21, 'N\'Dali', 6, NULL),
(22, 'Kalalé', 6, NULL),
(23, 'Karimama', 7, NULL),
(24, 'Kandi', 7, NULL),
(25, 'Banikoara', 7, NULL),
(26, 'Malanville', 7, NULL),
(27, 'Gogounou', 7, NULL),
(28, 'Djougou', 8, NULL),
(29, 'Ouaké', 8, NULL),
(30, 'Copargo', 8, NULL),
(31, 'Bassila', 8, NULL),
(32, 'Lokossa', 9, NULL),
(33, 'Athiémé', 9, NULL),
(34, 'Houéyogbé', 9, NULL),
(35, 'Grand-Popo', 9, NULL),
(36, 'Aplahoué', 10, NULL),
(37, 'Kloukanmè', 10, NULL),
(38, 'Toviklin', 10, NULL),
(39, 'Lalo', 10, NULL),
(40, 'Natitingou', 11, NULL),
(41, 'Kouandé', 11, NULL),
(42, 'Matéri', 11, NULL),
(43, 'Pobè', 12, NULL),
(44, 'Adja-Ouère', 12, NULL),
(45, 'Sakété', 12, NULL),
(46, 'Ifangni', 12, NULL),
(47, 'Aplahoué', 10, NULL),
(48, 'Kouandé', 11, NULL),
(49, 'Djougou', 8, NULL),
(50, 'Banikoara', 7, NULL),
(51, 'Gogounou', 7, NULL),
(52, 'Djidja', 4, NULL),
(53, 'Zogbodomey', 4, NULL),
(54, 'Cotonou', 2, NULL),
(55, 'Ouidah', 1, NULL),
(56, 'Tori-Bossito', 1, NULL),
(57, 'Abomey-Calavi', 1, NULL),
(58, 'Seme-Kpodji', 1, NULL),
(59, 'Ouinhi', 4, NULL),
(60, 'Save', 5, NULL),
(61, 'Dassa-Zoumè', 5, NULL),
(62, 'Glazoué', 5, NULL),
(63, 'Lalo', 10, NULL),
(64, 'Karimama', 7, NULL),
(65, 'Toviklin', 10, NULL),
(66, 'Kandi', 7, NULL);

-- --------------------------------------------------------

--
-- Structure de la table `conduite`
--

CREATE TABLE `conduite` (
  `conduite_id` int(11) NOT NULL,
  `note_conduite` int(11) NOT NULL,
  `classe_id` int(11) NOT NULL,
  `semestre_id` int(11) DEFAULT NULL,
  `etablissement_id` int(11) DEFAULT NULL,
  `Annee_scolaire_id` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Déchargement des données de la table `conduite`
--

INSERT INTO `conduite` (`conduite_id`, `note_conduite`, `classe_id`, `semestre_id`, `etablissement_id`, `Annee_scolaire_id`) VALUES
(1, 18, 1, 22, NULL, NULL),
(2, 16, 1, 23, NULL, NULL),
(3, 16, 31, 30, NULL, 3),
(4, 16, 31, 31, NULL, 3),
(5, 10, 36, 32, NULL, 5);

-- --------------------------------------------------------

--
-- Structure de la table `departement`
--

CREATE TABLE `departement` (
  `departement_id` int(11) NOT NULL,
  `nom` varchar(255) NOT NULL,
  `Annee_scolaire_id` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Déchargement des données de la table `departement`
--

INSERT INTO `departement` (`departement_id`, `nom`, `Annee_scolaire_id`) VALUES
(1, 'Atlantique', NULL),
(2, 'Littoral', NULL),
(3, 'Ouémé', NULL),
(4, 'Zou', NULL),
(5, 'Collines', NULL),
(6, 'Borgou', NULL),
(7, 'Alibori', NULL),
(8, 'Donga', NULL),
(9, 'Mono', NULL),
(10, 'Couffo', NULL),
(11, 'Atacora', NULL),
(12, 'Plateau', NULL);

-- --------------------------------------------------------

--
-- Structure de la table `eleve`
--

CREATE TABLE `eleve` (
  `id` int(11) NOT NULL,
  `matricule` varchar(20) DEFAULT NULL,
  `nom` varchar(50) NOT NULL,
  `prenom` varchar(50) NOT NULL,
  `date_naissance` date NOT NULL,
  `classe_id` int(11) DEFAULT NULL,
  `Parents_id` int(11) DEFAULT NULL,
  `sexe` char(1) NOT NULL,
  `etablissement_id` int(11) DEFAULT NULL,
  `photo_url` varchar(255) DEFAULT NULL,
  `Annee_scolaire_id` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Déchargement des données de la table `eleve`
--

INSERT INTO `eleve` (`id`, `matricule`, `nom`, `prenom`, `date_naissance`, `classe_id`, `Parents_id`, `sexe`, `etablissement_id`, `photo_url`, `Annee_scolaire_id`) VALUES
(1, NULL, 'Danon', 'Ben', '2015-10-21', 1, NULL, 'M', 68, NULL, NULL),
(2, NULL, 'Danon', 'Ines', '2014-10-21', 4, NULL, 'F', 68, NULL, NULL),
(3, NULL, 'Vedegnon', 'Jean', '2024-10-24', 8, NULL, 'M', 69, NULL, NULL),
(4, NULL, 'Manon', 'John', '2015-08-25', 1, NULL, 'M', 68, NULL, NULL),
(5, NULL, 'DAGNON', 'Félicité', '2015-10-25', 1, NULL, 'F', 68, NULL, NULL),
(6, NULL, 'Caston', 'Iris', '2015-10-25', 1, NULL, 'F', 68, NULL, NULL),
(7, NULL, 'Danon', 'Gilchrist', '2012-10-25', 1, NULL, 'M', 68, NULL, NULL),
(8, NULL, 'DAGNON', 'Jolidon', '2010-11-30', 4, NULL, 'M', 68, NULL, NULL),
(9, 'E-1767727067176-933', 'Semassou', 'Ben', '2011-05-12', 9, 11, 'M', 71, '/uploads/photos/9/eleve_9.png', 1),
(10, 'E-1767727067435-830', 'Minton', 'Cossi', '2011-10-12', 9, 12, 'M', 71, '/uploads/photos/9/eleve_10.jpeg', 1),
(11, 'E-1767727067711-88', 'Fanou', 'Ines', '2011-05-12', 9, 13, 'F', 71, '/uploads/photos/9/eleve_11.png', 1),
(12, 'E-1767727067837-648', 'Semassou', 'Yvone', '2011-05-12', 9, 11, 'M', 71, '/uploads/photos/9/eleve_12.jpeg', 1),
(13, 'E-1770881444119-900', 'Kinti', 'Linus', '2011-05-12', 10, 14, 'M', 71, NULL, 1),
(14, 'E-1770881444202-223', 'Sigbo', 'Kely', '2011-05-12', 10, 15, 'F', 71, NULL, 1),
(16, 'E-1774369143770-530', 'Codjo', 'Ben', '2011-05-12', 31, 18, 'M', 72, NULL, 3),
(17, 'E-1774369144066-863', 'Semassou', 'Clara', '2011-05-12', 31, 19, 'F', 72, NULL, 3),
(18, 'E-1774369144440-335', 'Maji', 'Ven', '2011-05-12', 31, 20, 'M', 72, NULL, 3),
(19, 'E-1774369144566-451', 'Quenum', 'Nano', '2011-05-12', 31, 21, 'M', 72, NULL, 3),
(20, 'E-1774461642066-356', 'Codjo', 'Ben', '2011-05-12', 39, 22, 'M', 73, '/uploads/photos/36/eleve_20.png', 6),
(21, 'E-1774461642318-713', 'Semassou', 'Clara', '2011-05-12', 39, 23, 'F', 73, '/uploads/photos/36/eleve_21.jpeg', 6),
(22, 'E-1774461643031-363', 'Maji', 'Ven', '2011-05-12', 37, 24, 'M', 73, '/uploads/photos/36/eleve_22.png', 6),
(23, 'E-1774461643417-249', 'Quenum', 'Nano', '2011-05-12', 39, 25, 'M', 73, '/uploads/photos/36/eleve_23.jpeg', 6);

-- --------------------------------------------------------

--
-- Structure de la table `enseignants`
--

CREATE TABLE `enseignants` (
  `id` int(11) NOT NULL,
  `nom` varchar(50) NOT NULL,
  `prenom` varchar(50) NOT NULL,
  `telephone` varchar(20) DEFAULT NULL,
  `email` varchar(100) NOT NULL,
  `mot_de_passe` varchar(255) NOT NULL,
  `nom_utilisateur` varchar(255) NOT NULL,
  `etablissement_id` int(11) DEFAULT NULL,
  `Annee_scolaire_id` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Déchargement des données de la table `enseignants`
--

INSERT INTO `enseignants` (`id`, `nom`, `prenom`, `telephone`, `email`, `mot_de_passe`, `nom_utilisateur`, `etablissement_id`, `Annee_scolaire_id`) VALUES
(1, 'Vigan ', 'Chrysostome', '22222222', 'vigan@gmail.com', 'l6mve3tb', 'vigan .chrysostome', 68, NULL),
(2, 'Tode', 'Armel', '23232323', 'tode@gmail.com', 'y09exo9u', 'tode.armel', 68, NULL),
(3, 'Hansi', 'Jean', '25252424', 'hansi', '8d4j834l', 'hansi.jean', 68, NULL),
(4, 'Akpo ', 'Amour', '12121223', 'akpo@gmail.com', 'yqiq8vo9', 'akpo .amour', 68, NULL),
(5, 'Semassou', 'Bil', '22252524', 'semassou@gmail.com', '0dttqu3o', 'semassou.bil', 68, NULL),
(11, 'Semassou', 'Colombe', '24565652', 'colombe@gmail.com', 'kquks2rr', 'semassou.colombe', 68, NULL),
(13, 'sc ofield', 'michel', '0159445046', 'octavio@gmail.com', 'NC9RWAMJ', 'scofield.m561', 68, NULL),
(15, 'TODE', 'Armel', '0111111', 'tode@gmail.com', 'OL79M67E', 'tode.a702', 71, NULL),
(16, 'Semassou', 'Colombe', '35566', 'colombe@gmail.com', '724O3ITL', 'semassou.c552', 71, NULL),
(18, 'Tossou', 'Nehemi', '455666', 'tossou@gmail.com', 'MBQ4UZOO', 'tossou.n610', 71, NULL),
(19, 'Ben', 'caris', '568999', 'caris@gmail.com', 'E3PKOYZH', 'ben.c138', 71, NULL),
(20, 'Agla', 'Gilbert', '7775998', 'gilbert', 'U4RZ4USO', 'agla.g975', 71, NULL),
(21, 'Semassou', 'Bil', '0126556545', 'bil@gmail.com', '58PMNBRV', 'semassou.b534', 71, NULL),
(23, 'Semassou', 'bil', '0158699765', 'bil@gmail.com', 'IYZHR001', 'semassou.b511', 72, NULL),
(24, 'Batonon', 'Emil', '0126987634', 'batonon@gmail.com', '46436IFH', 'batonon.e409', 72, NULL),
(25, 'tode', 'ewa', '0146987966', 'tode@gmail.com', '418G45PF', 'tode.e777', 72, NULL),
(26, 'tode', 'yewa', '015685867', 'tode@gmail.com', '1QXX65XF', 'tode.y149', 73, NULL),
(27, 'Fassinou', 'Igueras', '015567996', 'fassinou@gmail.com', '8DRV32SC', 'fassinou.i323', 73, NULL);

-- --------------------------------------------------------

--
-- Structure de la table `enseigner`
--

CREATE TABLE `enseigner` (
  `Enseignants_id` int(11) NOT NULL,
  `Classes_id` int(11) NOT NULL,
  `matiere_id` int(11) DEFAULT NULL,
  `coefficient_id` int(11) DEFAULT NULL,
  `etablissement_id` int(11) DEFAULT NULL,
  `Annee_scolaire_id` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Déchargement des données de la table `enseigner`
--

INSERT INTO `enseigner` (`Enseignants_id`, `Classes_id`, `matiere_id`, `coefficient_id`, `etablissement_id`, `Annee_scolaire_id`) VALUES
(23, 31, 17, 1, 72, 3),
(24, 31, 19, 1, 72, 3),
(25, 31, 18, 1, 72, 3),
(26, 36, 22, 2, 73, 5),
(27, 36, 23, 2, 73, 5),
(27, 37, 23, 3, 73, 5),
(26, 36, 24, 2, 73, 5);

-- --------------------------------------------------------

--
-- Structure de la table `etablissement`
--

CREATE TABLE `etablissement` (
  `id` int(11) NOT NULL,
  `nom` varchar(255) NOT NULL,
  `departement_id` int(11) DEFAULT NULL,
  `commune_id` int(11) DEFAULT NULL,
  `statut` varchar(10) NOT NULL,
  `telephone` varchar(20) NOT NULL,
  `mail` varchar(100) NOT NULL,
  `nom_utilisateur` varchar(50) NOT NULL,
  `mot_de_passe` varchar(100) NOT NULL,
  `Annee_scolaire_id` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Déchargement des données de la table `etablissement`
--

INSERT INTO `etablissement` (`id`, `nom`, `departement_id`, `commune_id`, `statut`, `telephone`, `mail`, `nom_utilisateur`, `mot_de_passe`, `Annee_scolaire_id`) VALUES
(68, 'succes', 1, 2, 'public', '67676767', 'sucessco@gmail.com', 'sucessco', 'sucessco67', NULL),
(69, 'Ste Etienne', 2, 1, 'prive', '22222222', 'etienne@gmail.com', 'etienne', 'etienne67', NULL),
(70, 'unisco', 1, 1, 'prive', '55555555', 'unisco@gmail.com', 'unisco', 'unisco67', NULL),
(71, 'St Patrick', 1, 2, 'prive', '56631233', 'patrick@gmail.com', 'patrick', 'patrick', NULL),
(72, 'Marck', 2, 1, 'public', '015666898', 'marck@gmail.com', 'marck', 'marck', NULL),
(73, 'Ceg1 Abomey', 1, 57, 'public', '01533566666', 'ceg1@gmail.com', 'ceg1', 'ceg1', NULL),
(74, 'Lyso', 1, 2, 'public', '01566856', 'lyso@gmail.com', 'Lyso', 'lyso', NULL);

-- --------------------------------------------------------

--
-- Structure de la table `matieres`
--

CREATE TABLE `matieres` (
  `id` int(11) NOT NULL,
  `nom` varchar(50) NOT NULL,
  `Coefficient_id` int(11) DEFAULT NULL,
  `classe_id` int(11) DEFAULT NULL,
  `etablissement_id` int(11) DEFAULT NULL,
  `Annee_scolaire_id` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Déchargement des données de la table `matieres`
--

INSERT INTO `matieres` (`id`, `nom`, `Coefficient_id`, `classe_id`, `etablissement_id`, `Annee_scolaire_id`) VALUES
(1, 'Mathématique', NULL, NULL, 68, NULL),
(2, 'Lecture', NULL, NULL, 68, NULL),
(3, 'Expression ecrite', NULL, NULL, 68, NULL),
(4, 'Français', NULL, NULL, 68, NULL),
(5, 'PCT', NULL, NULL, 68, NULL),
(6, 'Anglais', NULL, NULL, 68, NULL),
(7, 'Sport', NULL, NULL, 68, NULL),
(8, 'Histoire et  geographie', NULL, NULL, 68, NULL),
(9, 'Espagnole', NULL, NULL, 68, NULL),
(10, 'Mathématique', NULL, NULL, 71, NULL),
(11, 'PCT', NULL, NULL, 71, NULL),
(12, 'Histoire géographie', NULL, NULL, 71, NULL),
(13, 'Anglais', NULL, NULL, 71, NULL),
(14, 'Français', NULL, NULL, 71, NULL),
(17, 'Mathematique', NULL, NULL, 72, NULL),
(18, 'physique chimie', NULL, NULL, 72, NULL),
(19, 'Anglais', NULL, NULL, 72, NULL),
(20, 'SVT', NULL, NULL, 72, NULL),
(22, 'Anglais', NULL, NULL, 73, NULL),
(23, 'PCT', NULL, NULL, 73, NULL),
(24, 'Mathématique', NULL, NULL, 73, NULL);

-- --------------------------------------------------------

--
-- Structure de la table `note`
--

CREATE TABLE `note` (
  `id` int(11) NOT NULL,
  `inter1` decimal(5,2) DEFAULT NULL,
  `inter2` decimal(5,2) DEFAULT NULL,
  `inter3` decimal(5,2) DEFAULT NULL,
  `inter4` decimal(5,2) DEFAULT NULL,
  `moyInter` decimal(5,2) DEFAULT NULL,
  `Dev1` decimal(5,2) DEFAULT NULL,
  `Dev2` decimal(5,2) DEFAULT NULL,
  `moy` decimal(5,2) DEFAULT NULL,
  `Eleves_id` int(11) DEFAULT NULL,
  `Semestre_id` int(11) DEFAULT NULL,
  `matieres_id` int(11) DEFAULT NULL,
  `classe_id` int(11) DEFAULT NULL,
  `moycoef` decimal(5,2) DEFAULT NULL,
  `etablissement_id` int(11) DEFAULT NULL,
  `Annee_scolaire_id` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Déchargement des données de la table `note`
--

INSERT INTO `note` (`id`, `inter1`, `inter2`, `inter3`, `inter4`, `moyInter`, `Dev1`, `Dev2`, `moy`, `Eleves_id`, `Semestre_id`, `matieres_id`, `classe_id`, `moycoef`, `etablissement_id`, `Annee_scolaire_id`) VALUES
(51, 10.00, NULL, NULL, NULL, 11.00, NULL, NULL, 10.33, 1, 22, 5, 1, 10.33, 68, NULL),
(52, NULL, NULL, NULL, NULL, 11.67, NULL, NULL, 12.22, 4, 22, 5, 1, 12.22, 68, NULL),
(53, 15.00, NULL, NULL, NULL, 13.33, NULL, NULL, 12.11, 5, 22, 5, 1, 12.11, 68, NULL),
(54, 5.00, NULL, NULL, NULL, 11.00, NULL, NULL, 12.33, 6, 22, 5, 1, 12.33, 68, NULL),
(55, 8.00, NULL, NULL, NULL, 13.00, NULL, NULL, 13.67, 7, 22, 5, 1, 13.67, 68, NULL),
(56, NULL, 13.00, NULL, NULL, 11.00, NULL, NULL, 10.33, 1, 22, 5, 1, 10.33, 68, NULL),
(57, NULL, 12.00, NULL, NULL, 11.67, NULL, NULL, 12.22, 4, 22, 5, 1, 12.22, 68, NULL),
(58, NULL, 11.00, NULL, NULL, 13.33, NULL, NULL, 12.11, 5, 22, 5, 1, 12.11, 68, NULL),
(61, NULL, NULL, 10.00, NULL, 11.00, NULL, NULL, 10.33, 1, 22, 5, 1, 10.33, 68, NULL),
(62, NULL, NULL, 8.00, NULL, 11.67, NULL, NULL, 12.22, 4, 22, 5, 1, 12.22, 68, NULL),
(63, NULL, NULL, 14.00, NULL, 13.33, NULL, NULL, 12.11, 5, 22, 5, 1, 12.11, 68, NULL),
(64, NULL, NULL, 13.00, NULL, 11.00, NULL, NULL, 12.33, 6, 22, 5, 1, 12.33, 68, NULL),
(65, NULL, NULL, 14.00, NULL, 13.00, NULL, NULL, 13.67, 7, 22, 5, 1, 13.67, 68, NULL),
(66, NULL, NULL, NULL, NULL, 11.00, 10.00, NULL, 10.33, 1, 22, 5, 1, 10.33, 68, NULL),
(67, NULL, NULL, NULL, NULL, 11.67, 8.00, NULL, 12.22, 4, 22, 5, 1, 12.22, 68, NULL),
(68, NULL, NULL, NULL, NULL, 13.33, 14.00, NULL, 12.11, 5, 22, 5, 1, 12.11, 68, NULL),
(69, NULL, NULL, NULL, NULL, 11.00, 13.00, NULL, 12.33, 6, 22, 5, 1, 12.33, 68, NULL),
(70, NULL, NULL, NULL, NULL, 13.00, 14.00, NULL, 13.67, 7, 22, 5, 1, 13.67, 68, NULL),
(71, NULL, NULL, NULL, NULL, 11.00, NULL, 10.00, 10.33, 1, 22, 5, 1, 10.33, 68, NULL),
(72, NULL, NULL, NULL, NULL, 11.67, NULL, 17.00, 12.22, 4, 22, 5, 1, 12.22, 68, NULL),
(73, NULL, NULL, NULL, NULL, 13.33, NULL, 9.00, 12.11, 5, 22, 5, 1, 12.11, 68, NULL),
(74, NULL, NULL, NULL, NULL, 11.00, NULL, 13.00, 12.33, 6, 22, 5, 1, 12.33, 68, NULL),
(75, NULL, NULL, NULL, NULL, 13.00, NULL, 14.00, 13.67, 7, 22, 5, 1, 13.67, 68, NULL),
(76, 10.00, NULL, NULL, NULL, 7.00, NULL, NULL, 11.67, 1, 23, 5, 1, 11.67, 68, NULL),
(77, 17.00, NULL, NULL, NULL, 14.50, NULL, NULL, 12.83, 4, 23, 5, 1, 12.83, 68, NULL),
(78, 9.00, NULL, NULL, NULL, 12.50, NULL, NULL, 10.83, 5, 23, 5, 1, 10.83, 68, NULL),
(79, 13.00, NULL, NULL, NULL, 13.00, NULL, NULL, 13.00, 6, 23, 5, 1, 13.00, 68, NULL),
(80, 14.00, NULL, NULL, NULL, 14.00, NULL, NULL, 12.67, 7, 23, 5, 1, 12.67, 68, NULL),
(81, NULL, 4.00, NULL, NULL, 7.00, NULL, NULL, 11.67, 1, 23, 5, 1, 11.67, 68, NULL),
(82, NULL, 12.00, NULL, NULL, 14.50, NULL, NULL, 12.83, 4, 23, 5, 1, 12.83, 68, NULL),
(84, NULL, 13.00, NULL, NULL, 13.00, NULL, NULL, 13.00, 6, 23, 5, 1, 13.00, 68, NULL),
(85, NULL, 14.00, NULL, NULL, 14.00, NULL, NULL, 12.67, 7, 23, 5, 1, 12.67, 68, NULL),
(86, NULL, 4.00, NULL, NULL, 7.00, NULL, NULL, 11.67, 1, 23, 5, 1, 11.67, 68, NULL),
(87, NULL, 12.00, NULL, NULL, 14.50, NULL, NULL, 12.83, 4, 23, 5, 1, 12.83, 68, NULL),
(89, NULL, 13.00, NULL, NULL, 13.00, NULL, NULL, 13.00, 6, 23, 5, 1, 13.00, 68, NULL),
(90, NULL, 14.00, NULL, NULL, 14.00, NULL, NULL, 12.67, 7, 23, 5, 1, 12.67, 68, NULL),
(91, NULL, NULL, NULL, NULL, 7.00, 14.00, NULL, 11.67, 1, 23, 5, 1, 11.67, 68, NULL),
(92, NULL, NULL, NULL, NULL, 14.50, 12.00, NULL, 12.83, 4, 23, 5, 1, 12.83, 68, NULL),
(93, NULL, NULL, NULL, NULL, 12.50, 10.00, NULL, 10.83, 5, 23, 5, 1, 10.83, 68, NULL),
(94, NULL, NULL, NULL, NULL, 13.00, 13.00, NULL, 13.00, 6, 23, 5, 1, 13.00, 68, NULL),
(95, NULL, NULL, NULL, NULL, 14.00, 12.00, NULL, 12.67, 7, 23, 5, 1, 12.67, 68, NULL),
(96, NULL, NULL, NULL, NULL, 7.00, NULL, 14.00, 11.67, 1, 23, 5, 1, 11.67, 68, NULL),
(97, NULL, NULL, NULL, NULL, 14.50, NULL, 12.00, 12.83, 4, 23, 5, 1, 12.83, 68, NULL),
(98, NULL, NULL, NULL, NULL, 12.50, NULL, 10.00, 10.83, 5, 23, 5, 1, 10.83, 68, NULL),
(99, NULL, NULL, NULL, NULL, 13.00, NULL, 13.00, 13.00, 6, 23, 5, 1, 13.00, 68, NULL),
(100, NULL, NULL, NULL, NULL, 14.00, NULL, 12.00, 12.67, 7, 23, 5, 1, 12.67, 68, NULL),
(110, 15.00, NULL, NULL, NULL, 14.33, NULL, NULL, 13.78, 1, 22, 1, 1, 13.78, 68, NULL),
(111, 12.00, NULL, NULL, NULL, 11.33, NULL, NULL, 11.11, 4, 22, 1, 1, 11.11, 68, NULL),
(112, 12.00, NULL, NULL, NULL, 13.33, NULL, NULL, 13.11, 5, 22, 1, 1, 13.11, 68, NULL),
(113, 16.00, NULL, NULL, NULL, 15.00, NULL, NULL, 14.33, 6, 22, 1, 1, 14.33, 68, NULL),
(114, 8.00, NULL, NULL, NULL, 14.00, NULL, NULL, 13.67, 7, 22, 1, 1, 13.67, 68, NULL),
(115, NULL, 12.00, NULL, NULL, 14.33, NULL, NULL, 13.78, 1, 22, 1, 1, 13.78, 68, NULL),
(116, NULL, 11.00, NULL, NULL, 11.33, NULL, NULL, 11.11, 4, 22, 1, 1, 11.11, 68, NULL),
(117, NULL, 15.00, NULL, NULL, 13.33, NULL, NULL, 13.11, 5, 22, 1, 1, 13.11, 68, NULL),
(118, NULL, 16.00, NULL, NULL, 15.00, NULL, NULL, 14.33, 6, 22, 1, 1, 14.33, 68, NULL),
(119, NULL, 17.00, NULL, NULL, 14.00, NULL, NULL, 13.67, 7, 22, 1, 1, 13.67, 68, NULL),
(120, NULL, NULL, 16.00, NULL, 14.33, NULL, NULL, 13.78, 1, 22, 1, 1, 13.78, 68, NULL),
(121, NULL, NULL, 11.00, NULL, 11.33, NULL, NULL, 11.11, 4, 22, 1, 1, 11.11, 68, NULL),
(122, NULL, NULL, 13.00, NULL, 13.33, NULL, NULL, 13.11, 5, 22, 1, 1, 13.11, 68, NULL),
(123, NULL, NULL, 13.00, NULL, 15.00, NULL, NULL, 14.33, 6, 22, 1, 1, 14.33, 68, NULL),
(124, NULL, NULL, 17.00, NULL, 14.00, NULL, NULL, 13.67, 7, 22, 1, 1, 13.67, 68, NULL),
(125, NULL, NULL, NULL, NULL, 14.33, 16.00, NULL, 13.78, 1, 22, 1, 1, 13.78, 68, NULL),
(126, NULL, NULL, NULL, NULL, 11.33, 11.00, NULL, 11.11, 4, 22, 1, 1, 11.11, 68, NULL),
(127, NULL, NULL, NULL, NULL, 13.33, 13.00, NULL, 13.11, 5, 22, 1, 1, 13.11, 68, NULL),
(128, NULL, NULL, NULL, NULL, 15.00, 13.00, NULL, 14.33, 6, 22, 1, 1, 14.33, 68, NULL),
(129, NULL, NULL, NULL, NULL, 14.00, 17.00, NULL, 13.67, 7, 22, 1, 1, 13.67, 68, NULL),
(130, NULL, NULL, NULL, NULL, 14.33, NULL, 11.00, 13.78, 1, 22, 1, 1, 13.78, 68, NULL),
(131, NULL, NULL, NULL, NULL, 11.33, NULL, 11.00, 11.11, 4, 22, 1, 1, 11.11, 68, NULL),
(132, NULL, NULL, NULL, NULL, 13.33, NULL, 13.00, 13.11, 5, 22, 1, 1, 13.11, 68, NULL),
(133, NULL, NULL, NULL, NULL, 15.00, NULL, 15.00, 14.33, 6, 22, 1, 1, 14.33, 68, NULL),
(134, NULL, NULL, NULL, NULL, 14.00, NULL, 10.00, 13.67, 7, 22, 1, 1, 13.67, 68, NULL),
(135, 12.00, NULL, NULL, NULL, 14.50, NULL, NULL, 14.50, 1, 23, 1, 1, 14.50, 68, NULL),
(136, 15.00, NULL, NULL, NULL, 13.50, NULL, NULL, 13.50, 4, 23, 1, 1, 13.50, 68, NULL),
(137, 10.00, NULL, NULL, NULL, 11.50, NULL, NULL, 11.50, 5, 23, 1, 1, 11.50, 68, NULL),
(138, 14.00, NULL, NULL, NULL, 14.50, NULL, NULL, 14.50, 6, 23, 1, 1, 14.50, 68, NULL),
(139, 12.00, NULL, NULL, NULL, 14.00, NULL, NULL, 14.00, 7, 23, 1, 1, 14.00, 68, NULL),
(140, NULL, NULL, 17.00, NULL, 14.50, NULL, NULL, 14.50, 1, 23, 1, 1, 14.50, 68, NULL),
(141, NULL, NULL, 12.00, NULL, 13.50, NULL, NULL, 13.50, 4, 23, 1, 1, 13.50, 68, NULL),
(142, NULL, NULL, 13.00, NULL, 11.50, NULL, NULL, 11.50, 5, 23, 1, 1, 11.50, 68, NULL),
(143, NULL, NULL, 15.00, NULL, 14.50, NULL, NULL, 14.50, 6, 23, 1, 1, 14.50, 68, NULL),
(144, NULL, NULL, 16.00, NULL, 14.00, NULL, NULL, 14.00, 7, 23, 1, 1, 14.00, 68, NULL),
(145, 18.00, NULL, NULL, NULL, 16.67, NULL, NULL, 17.33, 11, 27, 10, 9, 17.33, 71, 1),
(146, 15.00, NULL, NULL, NULL, 12.67, NULL, NULL, 13.83, 10, 27, 10, 9, 13.83, 71, 1),
(147, 14.00, NULL, NULL, NULL, 12.67, NULL, NULL, 13.33, 9, 27, 10, 9, 13.33, 71, 1),
(148, 8.00, NULL, NULL, NULL, 12.00, NULL, NULL, 10.00, 12, 27, 10, 9, 10.00, 71, 1),
(149, NULL, 18.00, NULL, NULL, 16.67, NULL, NULL, 17.33, 11, 27, 10, 9, 17.33, 71, 1),
(150, NULL, 15.00, NULL, NULL, 12.67, NULL, NULL, 13.83, 10, 27, 10, 9, 13.83, 71, 1),
(151, NULL, 14.00, NULL, NULL, 12.67, NULL, NULL, 13.33, 9, 27, 10, 9, 13.33, 71, 1),
(152, NULL, NULL, NULL, NULL, 12.00, NULL, NULL, 10.00, 12, 27, 10, 9, 10.00, 71, 1),
(153, NULL, 8.00, NULL, NULL, 12.00, NULL, NULL, 10.00, 12, 27, 10, 9, 10.00, 71, 1),
(154, NULL, NULL, NULL, NULL, 16.67, 18.00, NULL, 17.33, 11, 27, 10, 9, 17.33, 71, 1),
(155, NULL, NULL, NULL, NULL, 12.67, 15.00, NULL, 13.83, 10, 27, 10, 9, 13.83, 71, 1),
(156, NULL, NULL, NULL, NULL, 12.67, 14.00, NULL, 13.33, 9, 27, 10, 9, 13.33, 71, 1),
(157, NULL, NULL, NULL, NULL, 12.00, NULL, NULL, 10.00, 12, 27, 10, 9, 10.00, 71, 1),
(158, NULL, NULL, NULL, NULL, 12.00, 8.00, NULL, 10.00, 12, 27, 10, 9, 10.00, 71, 1),
(159, NULL, NULL, 14.00, NULL, 16.67, NULL, NULL, 17.33, 11, 27, 10, 9, 17.33, 71, 1),
(160, NULL, NULL, 8.00, NULL, 12.67, NULL, NULL, 13.83, 10, 27, 10, 9, 13.83, 71, 1),
(161, NULL, NULL, 10.00, NULL, 12.67, NULL, NULL, 13.33, 9, 27, 10, 9, 13.33, 71, 1),
(162, NULL, NULL, 20.00, NULL, 12.00, NULL, NULL, 10.00, 12, 27, 10, 9, 10.00, 71, 1),
(163, 10.00, NULL, NULL, NULL, 10.00, NULL, NULL, 10.00, 16, 30, 18, 31, 10.00, 72, 3),
(164, 15.00, NULL, NULL, NULL, 15.00, NULL, NULL, 15.00, 18, 30, 18, 31, 15.00, 72, 3),
(165, 8.00, NULL, NULL, NULL, 8.00, NULL, NULL, 8.00, 19, 30, 18, 31, 8.00, 72, 3),
(166, 14.00, NULL, NULL, NULL, 14.00, NULL, NULL, 14.00, 17, 30, 18, 31, 14.00, 72, 3),
(167, NULL, 10.00, NULL, NULL, 10.00, NULL, NULL, 10.00, 16, 30, 18, 31, 10.00, 72, 3),
(168, NULL, 15.00, NULL, NULL, 15.00, NULL, NULL, 15.00, 18, 30, 18, 31, 15.00, 72, 3),
(169, NULL, 8.00, NULL, NULL, 8.00, NULL, NULL, 8.00, 19, 30, 18, 31, 8.00, 72, 3),
(170, NULL, 14.00, NULL, NULL, 14.00, NULL, NULL, 14.00, 17, 30, 18, 31, 14.00, 72, 3),
(171, NULL, NULL, NULL, NULL, 10.00, 10.00, NULL, 10.00, 16, 30, 18, 31, 10.00, 72, 3),
(172, NULL, NULL, NULL, NULL, 15.00, 15.00, NULL, 15.00, 18, 30, 18, 31, 15.00, 72, 3),
(173, NULL, NULL, NULL, NULL, 8.00, 8.00, NULL, 8.00, 19, 30, 18, 31, 8.00, 72, 3),
(174, NULL, NULL, NULL, NULL, 14.00, 14.00, NULL, 14.00, 17, 30, 18, 31, 14.00, 72, 3),
(175, NULL, NULL, NULL, NULL, 10.00, NULL, 10.00, 10.00, 16, 30, 18, 31, 10.00, 72, 3),
(176, NULL, NULL, NULL, NULL, 15.00, NULL, 15.00, 15.00, 18, 30, 18, 31, 15.00, 72, 3),
(177, NULL, NULL, NULL, NULL, 8.00, NULL, 8.00, 8.00, 19, 30, 18, 31, 8.00, 72, 3),
(178, NULL, NULL, NULL, NULL, 14.00, NULL, 14.00, 14.00, 17, 30, 18, 31, 14.00, 72, 3),
(179, 10.00, NULL, NULL, NULL, 10.00, NULL, NULL, 10.00, 16, 31, 18, 31, 10.00, 72, 3),
(180, 15.00, NULL, NULL, NULL, 15.00, NULL, NULL, 15.00, 18, 31, 18, 31, 15.00, 72, 3),
(181, 8.00, NULL, NULL, NULL, 8.00, NULL, NULL, 8.00, 19, 31, 18, 31, 8.00, 72, 3),
(182, 14.00, NULL, NULL, NULL, 14.00, NULL, NULL, 14.00, 17, 31, 18, 31, 14.00, 72, 3),
(183, NULL, 10.00, NULL, NULL, 10.00, NULL, NULL, 10.00, 16, 31, 18, 31, 10.00, 72, 3),
(184, NULL, 15.00, NULL, NULL, 15.00, NULL, NULL, 15.00, 18, 31, 18, 31, 15.00, 72, 3),
(185, NULL, 8.00, NULL, NULL, 8.00, NULL, NULL, 8.00, 19, 31, 18, 31, 8.00, 72, 3),
(186, NULL, 14.00, NULL, NULL, 14.00, NULL, NULL, 14.00, 17, 31, 18, 31, 14.00, 72, 3),
(187, NULL, NULL, NULL, NULL, 10.00, 10.00, NULL, 10.00, 16, 31, 18, 31, 10.00, 72, 3),
(188, NULL, NULL, NULL, NULL, 15.00, 15.00, NULL, 15.00, 18, 31, 18, 31, 15.00, 72, 3),
(189, NULL, NULL, NULL, NULL, 8.00, 8.00, NULL, 8.00, 19, 31, 18, 31, 8.00, 72, 3),
(190, NULL, NULL, NULL, NULL, 14.00, 14.00, NULL, 14.00, 17, 31, 18, 31, 14.00, 72, 3),
(191, NULL, NULL, NULL, NULL, 10.00, NULL, 10.00, 10.00, 16, 31, 18, 31, 10.00, 72, 3),
(192, NULL, NULL, NULL, NULL, 15.00, NULL, 15.00, 15.00, 18, 31, 18, 31, 15.00, 72, 3),
(193, NULL, NULL, NULL, NULL, 8.00, NULL, 8.00, 8.00, 19, 31, 18, 31, 8.00, 72, 3),
(194, NULL, NULL, NULL, NULL, 14.00, NULL, 14.00, 14.00, 17, 31, 18, 31, 14.00, 72, 3),
(195, 10.00, NULL, NULL, NULL, 10.00, NULL, NULL, 10.00, 16, 30, 17, 31, 10.00, 72, 3),
(196, 15.00, NULL, NULL, NULL, 15.00, NULL, NULL, 15.00, 18, 30, 17, 31, 15.00, 72, 3),
(197, 8.00, NULL, NULL, NULL, 8.00, NULL, NULL, 8.00, 19, 30, 17, 31, 8.00, 72, 3),
(198, 14.00, NULL, NULL, NULL, 14.00, NULL, NULL, 14.00, 17, 30, 17, 31, 14.00, 72, 3),
(199, NULL, 10.00, NULL, NULL, 10.00, NULL, NULL, 10.00, 16, 30, 17, 31, 10.00, 72, 3),
(200, NULL, 15.00, NULL, NULL, 15.00, NULL, NULL, 15.00, 18, 30, 17, 31, 15.00, 72, 3),
(201, NULL, 8.00, NULL, NULL, 8.00, NULL, NULL, 8.00, 19, 30, 17, 31, 8.00, 72, 3),
(202, NULL, 14.00, NULL, NULL, 14.00, NULL, NULL, 14.00, 17, 30, 17, 31, 14.00, 72, 3),
(203, NULL, NULL, NULL, NULL, 10.00, 10.00, NULL, 10.00, 16, 30, 17, 31, 10.00, 72, 3),
(204, NULL, NULL, NULL, NULL, 15.00, 15.00, NULL, 15.00, 18, 30, 17, 31, 15.00, 72, 3),
(205, NULL, NULL, NULL, NULL, 8.00, 8.00, NULL, 8.00, 19, 30, 17, 31, 8.00, 72, 3),
(206, NULL, NULL, NULL, NULL, 14.00, 14.00, NULL, 14.00, 17, 30, 17, 31, 14.00, 72, 3),
(207, NULL, NULL, NULL, NULL, 10.00, NULL, 10.00, 10.00, 16, 30, 17, 31, 10.00, 72, 3),
(208, NULL, NULL, NULL, NULL, 15.00, NULL, 15.00, 15.00, 18, 30, 17, 31, 15.00, 72, 3),
(209, NULL, NULL, NULL, NULL, 8.00, NULL, 8.00, 8.00, 19, 30, 17, 31, 8.00, 72, 3),
(210, NULL, NULL, NULL, NULL, 14.00, NULL, 14.00, 14.00, 17, 30, 17, 31, 14.00, 72, 3),
(211, 10.00, NULL, NULL, NULL, 10.00, NULL, NULL, 10.00, 16, 31, 17, 31, 10.00, 72, 3),
(212, 15.00, NULL, NULL, NULL, 15.00, NULL, NULL, 15.00, 18, 31, 17, 31, 15.00, 72, 3),
(213, 8.00, NULL, NULL, NULL, 8.00, NULL, NULL, 8.00, 19, 31, 17, 31, 8.00, 72, 3),
(214, 14.00, NULL, NULL, NULL, 14.00, NULL, NULL, 14.00, 17, 31, 17, 31, 14.00, 72, 3),
(215, NULL, 10.00, NULL, NULL, 10.00, NULL, NULL, 10.00, 16, 31, 17, 31, 10.00, 72, 3),
(216, NULL, 15.00, NULL, NULL, 15.00, NULL, NULL, 15.00, 18, 31, 17, 31, 15.00, 72, 3),
(217, NULL, 8.00, NULL, NULL, 8.00, NULL, NULL, 8.00, 19, 31, 17, 31, 8.00, 72, 3),
(218, NULL, 14.00, NULL, NULL, 14.00, NULL, NULL, 14.00, 17, 31, 17, 31, 14.00, 72, 3),
(219, NULL, NULL, NULL, NULL, 10.00, 10.00, NULL, 10.00, 16, 31, 17, 31, 10.00, 72, 3),
(220, NULL, NULL, NULL, NULL, 15.00, 15.00, NULL, 15.00, 18, 31, 17, 31, 15.00, 72, 3),
(221, NULL, NULL, NULL, NULL, 8.00, 8.00, NULL, 8.00, 19, 31, 17, 31, 8.00, 72, 3),
(222, NULL, NULL, NULL, NULL, 14.00, 14.00, NULL, 14.00, 17, 31, 17, 31, 14.00, 72, 3),
(223, NULL, NULL, NULL, NULL, 10.00, NULL, 10.00, 10.00, 16, 31, 17, 31, 10.00, 72, 3),
(224, NULL, NULL, NULL, NULL, 15.00, NULL, 15.00, 15.00, 18, 31, 17, 31, 15.00, 72, 3),
(225, NULL, NULL, NULL, NULL, 8.00, NULL, 8.00, 8.00, 19, 31, 17, 31, 8.00, 72, 3),
(226, NULL, NULL, NULL, NULL, 14.00, NULL, 14.00, 14.00, 17, 31, 17, 31, 14.00, 72, 3),
(227, 10.00, NULL, NULL, NULL, 10.00, NULL, NULL, 10.00, 16, 30, 19, 31, 10.00, 72, 3),
(228, 15.00, NULL, NULL, NULL, 15.00, NULL, NULL, 15.00, 18, 30, 19, 31, 15.00, 72, 3),
(229, 8.00, NULL, NULL, NULL, 8.00, NULL, NULL, 8.00, 19, 30, 19, 31, 8.00, 72, 3),
(230, 14.00, NULL, NULL, NULL, 14.00, NULL, NULL, 14.00, 17, 30, 19, 31, 14.00, 72, 3),
(231, NULL, 10.00, NULL, NULL, 10.00, NULL, NULL, 10.00, 16, 30, 19, 31, 10.00, 72, 3),
(232, NULL, 15.00, NULL, NULL, 15.00, NULL, NULL, 15.00, 18, 30, 19, 31, 15.00, 72, 3),
(233, NULL, 8.00, NULL, NULL, 8.00, NULL, NULL, 8.00, 19, 30, 19, 31, 8.00, 72, 3),
(234, NULL, 14.00, NULL, NULL, 14.00, NULL, NULL, 14.00, 17, 30, 19, 31, 14.00, 72, 3),
(235, NULL, NULL, NULL, NULL, 10.00, 10.00, NULL, 10.00, 16, 30, 19, 31, 10.00, 72, 3),
(236, NULL, NULL, NULL, NULL, 15.00, 15.00, NULL, 15.00, 18, 30, 19, 31, 15.00, 72, 3),
(237, NULL, NULL, NULL, NULL, 8.00, 8.00, NULL, 8.00, 19, 30, 19, 31, 8.00, 72, 3),
(238, NULL, NULL, NULL, NULL, 14.00, 14.00, NULL, 14.00, 17, 30, 19, 31, 14.00, 72, 3),
(239, NULL, NULL, NULL, NULL, 10.00, NULL, 10.00, 10.00, 16, 30, 19, 31, 10.00, 72, 3),
(240, NULL, NULL, NULL, NULL, 15.00, NULL, 15.00, 15.00, 18, 30, 19, 31, 15.00, 72, 3),
(241, NULL, NULL, NULL, NULL, 8.00, NULL, 8.00, 8.00, 19, 30, 19, 31, 8.00, 72, 3),
(242, NULL, NULL, NULL, NULL, 14.00, NULL, 14.00, 14.00, 17, 30, 19, 31, 14.00, 72, 3),
(243, 10.00, NULL, NULL, NULL, 10.00, NULL, NULL, 10.00, 16, 31, 19, 31, 10.00, 72, 3),
(244, 15.00, NULL, NULL, NULL, 15.00, NULL, NULL, 15.00, 18, 31, 19, 31, 15.00, 72, 3),
(245, 8.00, NULL, NULL, NULL, 8.00, NULL, NULL, 8.00, 19, 31, 19, 31, 8.00, 72, 3),
(246, 14.00, NULL, NULL, NULL, 14.00, NULL, NULL, 14.00, 17, 31, 19, 31, 14.00, 72, 3),
(247, NULL, 10.00, NULL, NULL, 10.00, NULL, NULL, 10.00, 16, 31, 19, 31, 10.00, 72, 3),
(248, NULL, 15.00, NULL, NULL, 15.00, NULL, NULL, 15.00, 18, 31, 19, 31, 15.00, 72, 3),
(249, NULL, 8.00, NULL, NULL, 8.00, NULL, NULL, 8.00, 19, 31, 19, 31, 8.00, 72, 3),
(250, NULL, 14.00, NULL, NULL, 14.00, NULL, NULL, 14.00, 17, 31, 19, 31, 14.00, 72, 3),
(251, NULL, NULL, NULL, NULL, 10.00, 10.00, NULL, 10.00, 16, 31, 19, 31, 10.00, 72, 3),
(252, NULL, NULL, NULL, NULL, 15.00, 15.00, NULL, 15.00, 18, 31, 19, 31, 15.00, 72, 3),
(253, NULL, NULL, NULL, NULL, 8.00, 8.00, NULL, 8.00, 19, 31, 19, 31, 8.00, 72, 3),
(254, NULL, NULL, NULL, NULL, 14.00, 14.00, NULL, 14.00, 17, 31, 19, 31, 14.00, 72, 3),
(255, NULL, NULL, NULL, NULL, 10.00, NULL, 10.00, 10.00, 16, 31, 19, 31, 10.00, 72, 3),
(256, NULL, NULL, NULL, NULL, 15.00, NULL, 15.00, 15.00, 18, 31, 19, 31, 15.00, 72, 3),
(257, NULL, NULL, NULL, NULL, 8.00, NULL, 8.00, 8.00, 19, 31, 19, 31, 8.00, 72, 3),
(258, NULL, NULL, NULL, NULL, 14.00, NULL, 14.00, 14.00, 17, 31, 19, 31, 14.00, 72, 3),
(259, 12.00, NULL, NULL, NULL, 12.00, NULL, NULL, 12.00, 20, 32, 22, 36, 24.00, 73, 5),
(260, 8.00, NULL, NULL, NULL, 8.00, NULL, NULL, 8.00, 22, 32, 22, 36, 16.00, 73, 5),
(261, 15.00, NULL, NULL, NULL, 15.00, NULL, NULL, 15.00, 23, 32, 22, 36, 30.00, 73, 5),
(262, 14.00, NULL, NULL, NULL, 14.00, NULL, NULL, 14.00, 21, 32, 22, 36, 28.00, 73, 5),
(263, NULL, 12.00, NULL, NULL, 12.00, NULL, NULL, 12.00, 20, 32, 22, 36, 24.00, 73, 5),
(264, NULL, 8.00, NULL, NULL, 8.00, NULL, NULL, 8.00, 22, 32, 22, 36, 16.00, 73, 5),
(265, NULL, 15.00, NULL, NULL, 15.00, NULL, NULL, 15.00, 23, 32, 22, 36, 30.00, 73, 5),
(266, NULL, 14.00, NULL, NULL, 14.00, NULL, NULL, 14.00, 21, 32, 22, 36, 28.00, 73, 5),
(267, NULL, NULL, NULL, NULL, 12.00, 12.00, NULL, 12.00, 20, 32, 22, 36, 24.00, 73, 5),
(268, NULL, NULL, NULL, NULL, 8.00, 8.00, NULL, 8.00, 22, 32, 22, 36, 16.00, 73, 5),
(269, NULL, NULL, NULL, NULL, 15.00, 15.00, NULL, 15.00, 23, 32, 22, 36, 30.00, 73, 5),
(270, NULL, NULL, NULL, NULL, 14.00, 14.00, NULL, 14.00, 21, 32, 22, 36, 28.00, 73, 5),
(271, NULL, NULL, NULL, NULL, 12.00, NULL, 12.00, 12.00, 20, 32, 22, 36, 24.00, 73, 5),
(272, NULL, NULL, NULL, NULL, 8.00, NULL, 8.00, 8.00, 22, 32, 22, 36, 16.00, 73, 5),
(273, NULL, NULL, NULL, NULL, 15.00, NULL, 15.00, 15.00, 23, 32, 22, 36, 30.00, 73, 5),
(274, NULL, NULL, NULL, NULL, 14.00, NULL, 14.00, 14.00, 21, 32, 22, 36, 28.00, 73, 5),
(275, 12.00, NULL, NULL, NULL, 12.00, NULL, NULL, 12.00, 20, 32, 24, 36, 24.00, 73, 5),
(276, 8.00, NULL, NULL, NULL, 8.00, NULL, NULL, 8.00, 22, 32, 24, 36, 16.00, 73, 5),
(277, 15.00, NULL, NULL, NULL, 15.00, NULL, NULL, 15.00, 23, 32, 24, 36, 30.00, 73, 5),
(278, 14.00, NULL, NULL, NULL, 14.00, NULL, NULL, 14.00, 21, 32, 24, 36, 28.00, 73, 5),
(279, NULL, 12.00, NULL, NULL, 12.00, NULL, NULL, 12.00, 20, 32, 24, 36, 24.00, 73, 5),
(280, NULL, 8.00, NULL, NULL, 8.00, NULL, NULL, 8.00, 22, 32, 24, 36, 16.00, 73, 5),
(281, NULL, 15.00, NULL, NULL, 15.00, NULL, NULL, 15.00, 23, 32, 24, 36, 30.00, 73, 5),
(282, NULL, 14.00, NULL, NULL, 14.00, NULL, NULL, 14.00, 21, 32, 24, 36, 28.00, 73, 5),
(283, NULL, NULL, NULL, NULL, 12.00, 12.00, NULL, 12.00, 20, 32, 24, 36, 24.00, 73, 5),
(284, NULL, NULL, NULL, NULL, 8.00, 8.00, NULL, 8.00, 22, 32, 24, 36, 16.00, 73, 5),
(285, NULL, NULL, NULL, NULL, 15.00, 15.00, NULL, 15.00, 23, 32, 24, 36, 30.00, 73, 5),
(286, NULL, NULL, NULL, NULL, 14.00, 14.00, NULL, 14.00, 21, 32, 24, 36, 28.00, 73, 5),
(287, NULL, NULL, NULL, NULL, 12.00, NULL, 12.00, 12.00, 20, 32, 24, 36, 24.00, 73, 5),
(288, NULL, NULL, NULL, NULL, 8.00, NULL, 8.00, 8.00, 22, 32, 24, 36, 16.00, 73, 5),
(289, NULL, NULL, NULL, NULL, 15.00, NULL, 15.00, 15.00, 23, 32, 24, 36, 30.00, 73, 5),
(290, NULL, NULL, NULL, NULL, 14.00, NULL, 14.00, 14.00, 21, 32, 24, 36, 28.00, 73, 5),
(291, 12.00, NULL, NULL, NULL, 12.00, NULL, NULL, 12.00, 20, 32, 23, 36, 24.00, 73, 5),
(292, 8.00, NULL, NULL, NULL, 8.00, NULL, NULL, 8.00, 22, 32, 23, 36, 16.00, 73, 5),
(293, 15.00, NULL, NULL, NULL, 15.00, NULL, NULL, 15.00, 23, 32, 23, 36, 30.00, 73, 5),
(294, 14.00, NULL, NULL, NULL, 14.00, NULL, NULL, 14.00, 21, 32, 23, 36, 28.00, 73, 5),
(295, NULL, 12.00, NULL, NULL, 12.00, NULL, NULL, 12.00, 20, 32, 23, 36, 24.00, 73, 5),
(296, NULL, 8.00, NULL, NULL, 8.00, NULL, NULL, 8.00, 22, 32, 23, 36, 16.00, 73, 5),
(297, NULL, 15.00, NULL, NULL, 15.00, NULL, NULL, 15.00, 23, 32, 23, 36, 30.00, 73, 5),
(298, NULL, 14.00, NULL, NULL, 14.00, NULL, NULL, 14.00, 21, 32, 23, 36, 28.00, 73, 5),
(299, NULL, NULL, NULL, NULL, 12.00, 12.00, NULL, 12.00, 20, 32, 23, 36, 24.00, 73, 5),
(300, NULL, NULL, NULL, NULL, 8.00, 8.00, NULL, 8.00, 22, 32, 23, 36, 16.00, 73, 5),
(301, NULL, NULL, NULL, NULL, 15.00, 15.00, NULL, 15.00, 23, 32, 23, 36, 30.00, 73, 5),
(302, NULL, NULL, NULL, NULL, 14.00, 14.00, NULL, 14.00, 21, 32, 23, 36, 28.00, 73, 5),
(303, NULL, NULL, NULL, NULL, 12.00, NULL, 12.00, 12.00, 20, 32, 23, 36, 24.00, 73, 5),
(304, NULL, NULL, NULL, NULL, 8.00, NULL, 8.00, 8.00, 22, 32, 23, 36, 16.00, 73, 5),
(305, NULL, NULL, NULL, NULL, 15.00, NULL, 15.00, 15.00, 23, 32, 23, 36, 30.00, 73, 5),
(306, NULL, NULL, NULL, NULL, 14.00, NULL, 14.00, 14.00, 21, 32, 23, 36, 28.00, 73, 5),
(307, 12.00, NULL, NULL, NULL, 12.00, NULL, NULL, 12.00, 20, 33, 22, 36, 24.00, 73, 5),
(308, 8.00, NULL, NULL, NULL, 8.00, NULL, NULL, 8.00, 22, 33, 22, 36, 16.00, 73, 5),
(309, 15.00, NULL, NULL, NULL, 15.00, NULL, NULL, 15.00, 23, 33, 22, 36, 30.00, 73, 5),
(310, 14.00, NULL, NULL, NULL, 14.00, NULL, NULL, 14.00, 21, 33, 22, 36, 28.00, 73, 5),
(311, NULL, 12.00, NULL, NULL, 12.00, NULL, NULL, 12.00, 20, 33, 22, 36, 24.00, 73, 5),
(312, NULL, 8.00, NULL, NULL, 8.00, NULL, NULL, 8.00, 22, 33, 22, 36, 16.00, 73, 5),
(313, NULL, 15.00, NULL, NULL, 15.00, NULL, NULL, 15.00, 23, 33, 22, 36, 30.00, 73, 5),
(314, NULL, 14.00, NULL, NULL, 14.00, NULL, NULL, 14.00, 21, 33, 22, 36, 28.00, 73, 5),
(315, NULL, NULL, NULL, NULL, 12.00, 12.00, NULL, 12.00, 20, 33, 22, 36, 24.00, 73, 5),
(316, NULL, NULL, NULL, NULL, 8.00, 8.00, NULL, 8.00, 22, 33, 22, 36, 16.00, 73, 5),
(317, NULL, NULL, NULL, NULL, 15.00, 15.00, NULL, 15.00, 23, 33, 22, 36, 30.00, 73, 5),
(318, NULL, NULL, NULL, NULL, 14.00, 14.00, NULL, 14.00, 21, 33, 22, 36, 28.00, 73, 5),
(319, NULL, NULL, NULL, NULL, 12.00, NULL, 12.00, 12.00, 20, 33, 22, 36, 24.00, 73, 5),
(320, NULL, NULL, NULL, NULL, 8.00, NULL, 8.00, 8.00, 22, 33, 22, 36, 16.00, 73, 5),
(321, NULL, NULL, NULL, NULL, 15.00, NULL, 15.00, 15.00, 23, 33, 22, 36, 30.00, 73, 5),
(322, NULL, NULL, NULL, NULL, 14.00, NULL, 14.00, 14.00, 21, 33, 22, 36, 28.00, 73, 5),
(323, 12.00, NULL, NULL, NULL, 12.00, NULL, NULL, 12.00, 20, 33, 24, 36, 24.00, 73, 5),
(324, 8.00, NULL, NULL, NULL, 8.00, NULL, NULL, 8.00, 22, 33, 24, 36, 16.00, 73, 5),
(325, 15.00, NULL, NULL, NULL, 15.00, NULL, NULL, 15.00, 23, 33, 24, 36, 30.00, 73, 5),
(326, 14.00, NULL, NULL, NULL, 14.00, NULL, NULL, 14.00, 21, 33, 24, 36, 28.00, 73, 5),
(327, NULL, 12.00, NULL, NULL, 12.00, NULL, NULL, 12.00, 20, 33, 24, 36, 24.00, 73, 5),
(328, NULL, 8.00, NULL, NULL, 8.00, NULL, NULL, 8.00, 22, 33, 24, 36, 16.00, 73, 5),
(329, NULL, 15.00, NULL, NULL, 15.00, NULL, NULL, 15.00, 23, 33, 24, 36, 30.00, 73, 5),
(330, NULL, 14.00, NULL, NULL, 14.00, NULL, NULL, 14.00, 21, 33, 24, 36, 28.00, 73, 5),
(331, NULL, NULL, NULL, NULL, 12.00, 12.00, NULL, 12.00, 20, 33, 24, 36, 24.00, 73, 5),
(332, NULL, NULL, NULL, NULL, 8.00, 8.00, NULL, 8.00, 22, 33, 24, 36, 16.00, 73, 5),
(333, NULL, NULL, NULL, NULL, 15.00, 15.00, NULL, 15.00, 23, 33, 24, 36, 30.00, 73, 5),
(334, NULL, NULL, NULL, NULL, 14.00, 14.00, NULL, 14.00, 21, 33, 24, 36, 28.00, 73, 5),
(335, NULL, NULL, NULL, NULL, 12.00, NULL, 12.00, 12.00, 20, 33, 24, 36, 24.00, 73, 5),
(336, NULL, NULL, NULL, NULL, 8.00, NULL, 8.00, 8.00, 22, 33, 24, 36, 16.00, 73, 5),
(337, NULL, NULL, NULL, NULL, 15.00, NULL, 15.00, 15.00, 23, 33, 24, 36, 30.00, 73, 5),
(338, NULL, NULL, NULL, NULL, 14.00, NULL, 14.00, 14.00, 21, 33, 24, 36, 28.00, 73, 5),
(339, 12.00, NULL, NULL, NULL, 12.00, NULL, NULL, 12.00, 20, 33, 23, 36, 24.00, 73, 5),
(340, 8.00, NULL, NULL, NULL, 8.00, NULL, NULL, 8.00, 22, 33, 23, 36, 16.00, 73, 5),
(341, 15.00, NULL, NULL, NULL, 15.00, NULL, NULL, 15.00, 23, 33, 23, 36, 30.00, 73, 5),
(342, 14.00, NULL, NULL, NULL, 14.00, NULL, NULL, 14.00, 21, 33, 23, 36, 28.00, 73, 5),
(343, NULL, 12.00, NULL, NULL, 12.00, NULL, NULL, 12.00, 20, 33, 23, 36, 24.00, 73, 5),
(344, NULL, 8.00, NULL, NULL, 8.00, NULL, NULL, 8.00, 22, 33, 23, 36, 16.00, 73, 5),
(345, NULL, 15.00, NULL, NULL, 15.00, NULL, NULL, 15.00, 23, 33, 23, 36, 30.00, 73, 5),
(346, NULL, 14.00, NULL, NULL, 14.00, NULL, NULL, 14.00, 21, 33, 23, 36, 28.00, 73, 5),
(347, NULL, NULL, NULL, NULL, 12.00, 12.00, NULL, 12.00, 20, 33, 23, 36, 24.00, 73, 5),
(348, NULL, NULL, NULL, NULL, 8.00, 8.00, NULL, 8.00, 22, 33, 23, 36, 16.00, 73, 5),
(349, NULL, NULL, NULL, NULL, 15.00, 15.00, NULL, 15.00, 23, 33, 23, 36, 30.00, 73, 5),
(350, NULL, NULL, NULL, NULL, 14.00, 14.00, NULL, 14.00, 21, 33, 23, 36, 28.00, 73, 5),
(351, NULL, NULL, NULL, NULL, 12.00, NULL, 12.00, 12.00, 20, 33, 23, 36, 24.00, 73, 5),
(352, NULL, NULL, NULL, NULL, 8.00, NULL, 8.00, 8.00, 22, 33, 23, 36, 16.00, 73, 5),
(353, NULL, NULL, NULL, NULL, 15.00, NULL, 15.00, 15.00, 23, 33, 23, 36, 30.00, 73, 5),
(354, NULL, NULL, NULL, NULL, 14.00, NULL, 14.00, 14.00, 21, 33, 23, 36, 28.00, 73, 5);

-- --------------------------------------------------------

--
-- Structure de la table `notificationProf`
--

CREATE TABLE `notificationProf` (
  `id` int(11) NOT NULL,
  `enseignant_id` int(11) NOT NULL,
  `permission_id` int(11) NOT NULL,
  `etablissement_id` int(11) NOT NULL,
  `is_read` tinyint(1) NOT NULL DEFAULT 0,
  `read_at` datetime DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Structure de la table `notifications`
--

CREATE TABLE `notifications` (
  `id` int(11) NOT NULL,
  `eleve_id` int(11) NOT NULL,
  `etablissement_id` int(11) NOT NULL,
  `Annee_scolaire_id` int(11) NOT NULL,
  `date_notification` datetime NOT NULL DEFAULT current_timestamp(),
  `is_read` tinyint(1) NOT NULL DEFAULT 0,
  `periode_debut_absence` date NOT NULL,
  `periode_fin_absence` date NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Déchargement des données de la table `notifications`
--

INSERT INTO `notifications` (`id`, `eleve_id`, `etablissement_id`, `Annee_scolaire_id`, `date_notification`, `is_read`, `periode_debut_absence`, `periode_fin_absence`, `created_at`, `updated_at`) VALUES
(1, 9, 71, 1, '2026-01-21 18:50:44', 1, '2026-01-16', '2026-01-18', '2026-01-21 17:50:44', '2026-01-21 17:51:05'),
(2, 10, 71, 1, '2026-01-21 19:01:07', 1, '2026-01-20', '2026-01-22', '2026-01-21 18:01:07', '2026-01-21 19:37:32'),
(3, 12, 71, 1, '2026-02-04 16:47:25', 1, '2026-01-27', '2026-01-29', '2026-02-04 15:47:25', '2026-02-12 06:56:33'),
(4, 13, 71, 1, '2026-02-12 09:03:50', 1, '2026-02-11', '2026-02-13', '2026-02-12 08:03:50', '2026-02-12 08:04:01'),
(5, 21, 73, 5, '2026-03-25 19:18:09', 1, '2026-03-24', '2026-03-26', '2026-03-25 18:18:09', '2026-03-25 18:18:17');

-- --------------------------------------------------------

--
-- Structure de la table `paiement`
--

CREATE TABLE `paiement` (
  `id` int(11) NOT NULL,
  `scolarite_id` int(11) NOT NULL,
  `montant` decimal(12,2) NOT NULL,
  `mode_paiement` varchar(50) NOT NULL DEFAULT 'Espèces',
  `date_paiement` date NOT NULL,
  `reference` varchar(100) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ;

--
-- Déchargement des données de la table `paiement`
--

INSERT INTO `paiement` (`id`, `scolarite_id`, `montant`, `mode_paiement`, `date_paiement`, `reference`, `created_at`) VALUES
(1, 1, 100000.00, 'Espèces', '2026-06-16', NULL, '2026-06-16 06:03:43');

--
-- Déclencheurs `paiement`
--
DELIMITER $$
CREATE TRIGGER `trg_paiement_after_delete` AFTER DELETE ON `paiement` FOR EACH ROW BEGIN
    UPDATE scolarite SET montant_paye = montant_paye - OLD.montant
    WHERE id = OLD.scolarite_id;
END
$$
DELIMITER ;
DELIMITER $$
CREATE TRIGGER `trg_paiement_after_insert` AFTER INSERT ON `paiement` FOR EACH ROW BEGIN
    UPDATE scolarite SET montant_paye = montant_paye + NEW.montant
    WHERE id = NEW.scolarite_id;
END
$$
DELIMITER ;
DELIMITER $$
CREATE TRIGGER `trg_paiement_after_update` AFTER UPDATE ON `paiement` FOR EACH ROW BEGIN
    UPDATE scolarite SET montant_paye = montant_paye - OLD.montant + NEW.montant
    WHERE id = NEW.scolarite_id;
END
$$
DELIMITER ;

-- --------------------------------------------------------

--
-- Structure de la table `parents`
--

CREATE TABLE `parents` (
  `id` int(11) NOT NULL,
  `nom` varchar(50) NOT NULL,
  `prenom` varchar(50) NOT NULL,
  `contact` varchar(20) DEFAULT NULL,
  `email` varchar(100) NOT NULL,
  `mot_de_passe` varchar(255) DEFAULT NULL,
  `nom_utilisateur` varchar(255) DEFAULT NULL,
  `etablissement_id` int(11) DEFAULT NULL,
  `Annee_scolaire_id` int(11) NOT NULL,
  `activation_code_hash` varchar(255) DEFAULT NULL,
  `activation_code_expires` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Déchargement des données de la table `parents`
--

INSERT INTO `parents` (`id`, `nom`, `prenom`, `contact`, `email`, `mot_de_passe`, `nom_utilisateur`, `etablissement_id`, `Annee_scolaire_id`, `activation_code_hash`, `activation_code_expires`) VALUES
(11, 'Semasou', 'Desirer', '167054384', 'stephanesemassou1@gmail.com', '$2b$10$5AYiGXYrGyRqJOeGrHcQtupzjxqgz9ao.BUcsRYIePLQ6cDsL4rsW', 'desirer.semasou', 71, 1, NULL, NULL),
(12, 'Minton', 'Batelemi', '2032556666', 'minton@gmail,com', NULL, 'batelemi.minton', 71, 1, NULL, NULL),
(13, 'Fanou', 'Christiant', '1225444445', 'fanou@gmail,com', NULL, 'christiant.fanou', 71, 1, NULL, NULL),
(14, 'Kinti', 'Jean', '156548856', 'jean@gmail,com', NULL, NULL, 71, 1, NULL, NULL),
(15, 'Sigbo', 'Pascal', '125566654', 'sigbo@gmail,com', NULL, NULL, 71, 1, NULL, NULL),
(16, 'Minvi', 'Rogias', '01568486', 'minvi@gmail.com', '$2b$10$1PoTfoaI75l492O1FEwYUulXhZO0anHhdKoAcC8RrxiB7wTUNK/o6', 'minvi', 71, 1, NULL, NULL),
(17, 'kaba', 'Fortch', '015699665', 'kaba@gmail.com', '$2b$10$2pN3EAecd8TbjhKAbTJb6uPsWRAQw5QNuhqPMxpnR4qdKdZDtYcQy', 'kaba', 71, 1, NULL, NULL),
(18, 'Codjo', 'Isidore', '156655554', 'codjo@gmail.com', NULL, NULL, 72, 3, NULL, NULL),
(19, 'Semassou ', 'Desirer', '2156554455', 'semassou@gmail.com', NULL, NULL, 72, 3, NULL, NULL),
(20, 'Maji', 'Penfil', '125445445', 'maji@gmail.com', NULL, NULL, 72, 3, NULL, NULL),
(21, 'Quenum', 'toto', '123255555', 'quenum@gmail.com', NULL, NULL, 72, 3, NULL, NULL),
(22, 'Codjo', 'Isidore', '156655554', 'codjo@gmail.com', NULL, NULL, 73, 5, NULL, NULL),
(23, 'Semassou ', 'Desirer', '2156554455', 'stephanesemassou1@gmail.com', '$2b$10$lUaImzGIc7bC8lAu5G3l4eFnB3q0r1.o0xvSSoLnqX2G7p3igJeOu', NULL, 73, 5, NULL, NULL),
(24, 'Maji', 'Penfil', '125445445', 'maji@gmail.com', NULL, NULL, 73, 5, NULL, NULL),
(25, 'Quenum', 'toto', '123255555', 'quenum@gmail.com', NULL, NULL, 73, 5, NULL, NULL);

-- --------------------------------------------------------

--
-- Structure de la table `permission`
--

CREATE TABLE `permission` (
  `id` int(11) NOT NULL,
  `Date` date NOT NULL,
  `Motif` varchar(255) NOT NULL,
  `Contact` varchar(100) NOT NULL,
  `Statut` varchar(50) DEFAULT NULL,
  `eleve_id` int(11) DEFAULT NULL,
  `Duree` varchar(255) DEFAULT NULL,
  `etablissement_id` int(11) DEFAULT NULL,
  `Annee_scolaire_id` int(11) DEFAULT NULL,
  `is_read` tinyint(1) NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Déchargement des données de la table `permission`
--

INSERT INTO `permission` (`id`, `Date`, `Motif`, `Contact`, `Statut`, `eleve_id`, `Duree`, `etablissement_id`, `Annee_scolaire_id`, `is_read`) VALUES
(1, '2024-10-23', 'visite medicale', '63524152', 'autoriser', 1, '2h', 68, NULL, 0),
(2, '2024-11-05', 'Malade', '66666666', 'sous reserve de justification', 1, '1 journee', 68, NULL, 0),
(3, '2026-02-18', 'vvvbb', '45564411', 'non autoriser', 9, 'vggh', 71, 1, 1);

-- --------------------------------------------------------

--
-- Structure de la table `presence`
--

CREATE TABLE `presence` (
  `id` int(11) NOT NULL,
  `date` date NOT NULL,
  `heures` time DEFAULT NULL,
  `statut` varchar(50) DEFAULT NULL,
  `motif` text DEFAULT NULL,
  `eleve_id` int(11) NOT NULL,
  `matieres_id` int(11) NOT NULL,
  `classe_id` int(11) DEFAULT NULL,
  `semestre_id` int(11) DEFAULT NULL,
  `etablissement_id` int(11) DEFAULT NULL,
  `Annee_scolaire_id` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Déchargement des données de la table `presence`
--

INSERT INTO `presence` (`id`, `date`, `heures`, `statut`, `motif`, `eleve_id`, `matieres_id`, `classe_id`, `semestre_id`, `etablissement_id`, `Annee_scolaire_id`) VALUES
(8, '2026-01-17', NULL, 'Absent', NULL, 9, 10, 9, 28, 71, 1),
(9, '2026-01-18', NULL, 'Absent', NULL, 9, 10, 9, 28, 71, 1),
(10, '2026-01-19', NULL, 'Absent', NULL, 9, 10, 9, 28, 71, 1),
(11, '2026-01-19', NULL, 'Absent', NULL, 10, 10, 9, 28, 71, 1),
(12, '2026-01-21', NULL, 'Absent', NULL, 10, 10, 9, 27, 71, 1),
(13, '2026-01-22', NULL, 'Absent', NULL, 10, 10, 9, 27, 71, 1),
(14, '2026-01-23', NULL, 'Absent', NULL, 10, 10, 9, 27, 71, 1),
(15, '2026-01-28', NULL, 'Absent', NULL, 9, 10, 9, 27, 71, 1),
(16, '2026-01-27', NULL, 'Absent', NULL, 9, 10, 9, 27, 71, 1),
(17, '2026-01-28', NULL, 'Absent', NULL, 9, 10, 9, 27, 71, 1),
(18, '2026-01-28', NULL, 'Absent', NULL, 12, 10, 9, 27, 71, 1),
(19, '2026-01-28', NULL, 'Absent', NULL, 9, 10, 9, 27, 71, 1),
(20, '2026-01-29', NULL, 'Absent', NULL, 12, 10, 9, 27, 71, 1),
(21, '2026-01-25', NULL, 'Absent', NULL, 9, 10, 9, 27, 71, 1),
(22, '2026-01-30', NULL, 'Absent', NULL, 9, 10, 9, 27, 71, 1),
(23, '2026-01-30', NULL, 'Absent', NULL, 9, 10, 9, 27, 71, 1),
(24, '2026-01-30', NULL, 'Absent', NULL, 12, 10, 9, 27, 71, 1),
(25, '2026-01-30', NULL, 'Absent', NULL, 9, 10, 9, 27, 71, 1),
(26, '2026-01-30', NULL, 'Absent', NULL, 12, 10, 9, 27, 71, 1),
(27, '2026-01-30', NULL, 'Absent', NULL, 9, 10, 9, 27, 71, 1),
(28, '2026-02-12', NULL, 'Absent', NULL, 13, 11, 10, 27, 71, 1),
(29, '2026-02-13', NULL, 'Absent', NULL, 13, 11, 10, 27, 71, 1),
(30, '2026-02-14', NULL, 'Absent', NULL, 13, 11, 10, 27, 71, 1),
(31, '2026-02-18', NULL, 'Absent', NULL, 9, 10, 9, 27, 71, 1),
(32, '2026-02-18', NULL, 'Absent', 'jjjjj', 9, 10, 9, 27, 71, 1),
(33, '2026-02-20', NULL, 'Absent', NULL, 9, 10, 9, 27, 71, 1),
(34, '2026-02-21', NULL, 'Absent', 'fghjkl', 9, 10, 9, 27, 71, 1),
(35, '2026-03-25', NULL, 'Absent', NULL, 20, 22, 36, 32, 73, 5),
(36, '2026-03-25', NULL, 'Absent', NULL, 21, 22, 36, 32, 73, 5),
(37, '2026-03-26', NULL, 'Absent', NULL, 21, 22, 36, 32, 73, 5),
(38, '2026-03-27', NULL, 'Absent', 'hhh', 21, 22, 36, 32, 73, 5);

-- --------------------------------------------------------

--
-- Structure de la table `programmes`
--

CREATE TABLE `programmes` (
  `id` int(11) NOT NULL,
  `classe_id` int(11) DEFAULT NULL,
  `matière_id` int(11) DEFAULT NULL,
  `jour` enum('Lundi','Mardi','Mercredi','Jeudi','Vendredi') NOT NULL,
  `horaire` varchar(11) DEFAULT NULL,
  `etablissement_id` int(11) DEFAULT NULL,
  `Annee_scolaire_id` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Déchargement des données de la table `programmes`
--

INSERT INTO `programmes` (`id`, `classe_id`, `matière_id`, `jour`, `horaire`, `etablissement_id`, `Annee_scolaire_id`) VALUES
(2, 1, 3, 'Mardi', '8h00-10h00', 68, 0),
(3, 1, 1, 'Mardi', '15h00-17h00', 68, 0),
(4, 1, 3, 'Mercredi', '15h00-17h00', 68, 0),
(5, 1, 5, 'Jeudi', '8h00-10h00', 68, 0),
(7, 1, 5, 'Lundi', '8h00-10h00', 68, 0),
(8, 1, 1, 'Lundi', '8h00-10h00', 68, 0),
(9, 9, 10, 'Lundi', '8h-10h', 71, 1),
(10, 9, 10, 'Mercredi', '10h-11h', 71, 1),
(11, 9, 12, 'Mardi', '15h-17h', 71, 1),
(12, 9, 10, 'Jeudi', '8h-10h', 71, 1),
(14, 36, 22, 'Lundi', '8h-10h', 73, 5);

-- --------------------------------------------------------

--
-- Structure de la table `promotion`
--

CREATE TABLE `promotion` (
  `id` int(11) NOT NULL,
  `nom` varchar(100) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Déchargement des données de la table `promotion`
--

INSERT INTO `promotion` (`id`, `nom`) VALUES
(1, '6ème'),
(2, '5ème'),
(3, '4ème'),
(4, '3ème'),
(5, '2nd A1'),
(6, '2nd A2'),
(7, '2nd B'),
(8, '2nd AB'),
(9, '2nd D'),
(10, '2nd C'),
(11, '2nd G2'),
(12, '1ere A1'),
(13, '1ere A2'),
(14, '1ere B'),
(15, '1ere AB'),
(16, '1ere D'),
(17, '1ere C'),
(18, '1ere G2'),
(19, 'Tle A1'),
(20, 'Tle A2'),
(21, 'Tle B'),
(22, 'Tle AB'),
(23, 'Tle D'),
(24, 'Tle C'),
(25, 'Tle G2');

-- --------------------------------------------------------

--
-- Structure de la table `punitions`
--

CREATE TABLE `punitions` (
  `id` int(11) NOT NULL,
  `auteur` varchar(255) NOT NULL,
  `punition` varchar(50) NOT NULL,
  `date` date NOT NULL,
  `heure` time DEFAULT NULL,
  `motif` text DEFAULT NULL,
  `eleve_id` int(11) DEFAULT NULL,
  `semestre_id` int(11) DEFAULT NULL,
  `total_hours` int(11) DEFAULT 0,
  `etablissement_id` int(11) DEFAULT NULL,
  `Annee_scolaire_id` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Déchargement des données de la table `punitions`
--

INSERT INTO `punitions` (`id`, `auteur`, `punition`, `date`, `heure`, `motif`, `eleve_id`, `semestre_id`, `total_hours`, `etablissement_id`, `Annee_scolaire_id`) VALUES
(1, 'professeurs de math', '2h', '2024-10-21', '10:12:00', 'manquement', 1, 22, 2, NULL, 0),
(2, 'professeur de pct', '4h', '2024-10-21', '15:15:00', 'manquement', 1, 22, 4, 68, 0),
(6, 'Directeur', '2h', '2024-10-23', '08:00:00', 'vague', 1, 22, 6, NULL, 0),
(7, 'Surveillant', '2h', '2024-10-22', '08:00:00', 'trouble', 1, 22, 8, NULL, 0),
(8, 'surveillant', '2h', '2024-10-23', '15:00:00', 'trouble', 1, 22, 10, 68, 0),
(9, 'JJJJ', '2', '2026-01-21', NULL, 'JJBN', 9, 27, 2, 71, 1),
(10, 'bil', '2', '2026-02-12', NULL, 'jjjnn', 13, 27, 2, 71, 1),
(11, 'hjkkl', '2', '2026-02-21', NULL, 'ghkk', 9, 27, 4, 71, 1),
(12, 'prof d\'anglais', '2', '2026-03-24', NULL, 'cfggh', 21, 32, 2, 73, 5);

-- --------------------------------------------------------

--
-- Structure de la table `scolarite`
--

CREATE TABLE `scolarite` (
  `id` int(11) NOT NULL,
  `eleve_id` int(11) NOT NULL,
  `classe_id` int(11) NOT NULL,
  `annee_scolaire_id` int(11) NOT NULL,
  `etablissement_id` int(11) NOT NULL,
  `montant_total` decimal(12,2) NOT NULL DEFAULT 0.00,
  `montant_paye` decimal(12,2) NOT NULL DEFAULT 0.00,
  `reste` decimal(12,2) GENERATED ALWAYS AS (`montant_total` - `montant_paye`) STORED,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Déchargement des données de la table `scolarite`
--

INSERT INTO `scolarite` (`id`, `eleve_id`, `classe_id`, `annee_scolaire_id`, `etablissement_id`, `montant_total`, `montant_paye`, `created_at`, `updated_at`) VALUES
(1, 20, 39, 6, 73, 100000.00, 100000.00, '2026-06-14 11:11:17', '2026-06-16 06:06:13'),
(2, 21, 39, 6, 73, 100000.00, 0.00, '2026-06-14 11:11:17', '2026-06-16 06:06:13'),
(3, 23, 39, 6, 73, 100000.00, 0.00, '2026-06-14 11:11:17', '2026-06-16 06:06:13'),
(5, 22, 37, 6, 73, 100000.00, 0.00, '2026-06-14 11:37:35', '2026-06-14 11:37:35');

-- --------------------------------------------------------

--
-- Structure de la table `semestre`
--

CREATE TABLE `semestre` (
  `id` int(11) NOT NULL,
  `nom` varchar(255) NOT NULL,
  `etablissement_id` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Déchargement des données de la table `semestre`
--

INSERT INTO `semestre` (`id`, `nom`, `etablissement_id`) VALUES
(19, 'Trimestre 1', NULL),
(20, 'Trimestre 2', NULL),
(21, 'Trimestre 3', NULL),
(22, 'semestre 1', 68),
(23, 'semestre 2', 68),
(24, 'trimestre 1', 69),
(25, 'Trimestre 2', 69),
(26, 'Trimestre 3', 69),
(27, 'Trimestre 1', 71),
(28, 'Trimestre 2', 71),
(29, 'Trimestre 3', 71),
(30, 'Semestre 1', 72),
(31, 'Semestre 2', 72),
(32, 'Semestre 1', 73),
(33, 'Semestre 2', 73),
(34, 'Semestre 1', 74),
(35, 'Semestre 2', 74);

-- --------------------------------------------------------

--
-- Structure de la table `tests`
--

CREATE TABLE `tests` (
  `id` int(11) NOT NULL,
  `enseignant_id` int(11) DEFAULT NULL,
  `matière_id` int(11) DEFAULT NULL,
  `activite` varchar(255) DEFAULT NULL,
  `date` date NOT NULL,
  `classe_id` int(11) NOT NULL,
  `semestre_id` int(11) DEFAULT NULL,
  `horaire` varchar(20) DEFAULT NULL,
  `etablissement_id` int(11) DEFAULT NULL,
  `Annee_scolaire_id` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Déchargement des données de la table `tests`
--

INSERT INTO `tests` (`id`, `enseignant_id`, `matière_id`, `activite`, `date`, `classe_id`, `semestre_id`, `horaire`, `etablissement_id`, `Annee_scolaire_id`) VALUES
(1, 1, 1, 'SA2', '2024-10-21', 1, 22, '8h00-10h00', 68, NULL),
(2, 1, 1, 'SA2', '2024-11-03', 1, 22, '8h00-10h00', 68, NULL),
(3, 1, 1, 'Activie 2-2', '2024-11-03', 1, 22, '11h-13h', 68, NULL),
(4, 1, 1, 'SA3', '2024-11-03', 1, 22, '10h-12h', 68, NULL),
(5, 1, 1, 'Activite : calcule numerique', '2024-12-25', 1, 22, '8h00-10h00', 68, NULL),
(6, 15, 10, 'fghhjjj', '2026-01-21', 9, 27, '8h00-10h11', 71, 1);

-- --------------------------------------------------------

--
-- Structure de la table `toutesNotes`
--

CREATE TABLE `toutesNotes` (
  `id` int(11) NOT NULL,
  `inter1` float DEFAULT NULL,
  `inter2` float DEFAULT NULL,
  `inter3` float DEFAULT NULL,
  `inter4` float DEFAULT NULL,
  `Eleves_id` int(11) NOT NULL,
  `Semestre_id` int(11) NOT NULL,
  `matieres_id` int(11) NOT NULL,
  `classe_id` int(11) NOT NULL,
  `etablissement_id` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Déchargement des données de la table `toutesNotes`
--

INSERT INTO `toutesNotes` (`id`, `inter1`, `inter2`, `inter3`, `inter4`, `Eleves_id`, `Semestre_id`, `matieres_id`, `classe_id`, `etablissement_id`) VALUES
(1, 13, NULL, NULL, NULL, 2, 22, 1, 1, 68),
(2, 14, NULL, NULL, NULL, 8, 22, 1, 1, 68),
(3, NULL, NULL, NULL, 13, 2, 22, 1, 1, 68),
(4, NULL, NULL, NULL, 14, 8, 22, 1, 1, 68),
(5, 13, NULL, NULL, NULL, 2, 22, 1, 1, 68),
(6, 14, NULL, NULL, NULL, 8, 22, 1, 1, 68);

-- --------------------------------------------------------

--
-- Structure de la table `Événements`
--

CREATE TABLE `Événements` (
  `id` int(11) NOT NULL,
  `titre` varchar(100) NOT NULL,
  `description` text DEFAULT NULL,
  `date` date NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Index pour les tables déchargées
--

--
-- Index pour la table `absenceVueParents`
--
ALTER TABLE `absenceVueParents`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uniq_parent_presence` (`parent_id`,`presence_id`),
  ADD KEY `idx_parent` (`parent_id`),
  ADD KEY `idx_presence` (`presence_id`);

--
-- Index pour la table `administrations`
--
ALTER TABLE `administrations`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `email` (`email`),
  ADD KEY `departement_id` (`departement_id`),
  ADD KEY `commune_id` (`commune_id`);

--
-- Index pour la table `annee_scolaire`
--
ALTER TABLE `annee_scolaire`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_annee_etablissement` (`nom_annee`,`etablissement_id`);

--
-- Index pour la table `bulletin`
--
ALTER TABLE `bulletin`
  ADD PRIMARY KEY (`bulletin_id`),
  ADD UNIQUE KEY `bulletin_id_2` (`bulletin_id`),
  ADD KEY `bulletin_id` (`eleve_id`,`semestre_id`,`matiere_id`,`coef_id`);

--
-- Index pour la table `classes`
--
ALTER TABLE `classes`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_promotion` (`Promotion_id`);

--
-- Index pour la table `cloture_parametres`
--
ALTER TABLE `cloture_parametres`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `etablissement_id` (`etablissement_id`);

--
-- Index pour la table `coefficient`
--
ALTER TABLE `coefficient`
  ADD PRIMARY KEY (`id`);

--
-- Index pour la table `commune`
--
ALTER TABLE `commune`
  ADD PRIMARY KEY (`commune_id`);

--
-- Index pour la table `conduite`
--
ALTER TABLE `conduite`
  ADD PRIMARY KEY (`conduite_id`),
  ADD KEY `classe_id` (`classe_id`,`semestre_id`);

--
-- Index pour la table `departement`
--
ALTER TABLE `departement`
  ADD PRIMARY KEY (`departement_id`);

--
-- Index pour la table `eleve`
--
ALTER TABLE `eleve`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `matricule` (`matricule`),
  ADD KEY `classe_id` (`classe_id`),
  ADD KEY `fk_Parents` (`Parents_id`);

--
-- Index pour la table `enseignants`
--
ALTER TABLE `enseignants`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uniq_email_etab` (`email`,`etablissement_id`),
  ADD UNIQUE KEY `uniq_username_etab` (`nom_utilisateur`,`etablissement_id`);

--
-- Index pour la table `enseigner`
--
ALTER TABLE `enseigner`
  ADD UNIQUE KEY `uq_classe_matiere_annee_etab` (`Classes_id`,`matiere_id`,`Annee_scolaire_id`,`etablissement_id`),
  ADD KEY `Classes_id` (`Classes_id`),
  ADD KEY `fk_Matière` (`matiere_id`),
  ADD KEY `coefficient_id` (`coefficient_id`),
  ADD KEY `idx_enseigner_enseignant` (`Enseignants_id`),
  ADD KEY `idx_enseigner_classe` (`Classes_id`),
  ADD KEY `idx_enseigner_matiere` (`matiere_id`),
  ADD KEY `idx_enseigner_coef` (`coefficient_id`),
  ADD KEY `idx_enseigner_etab` (`etablissement_id`),
  ADD KEY `idx_enseigner_annee` (`Annee_scolaire_id`),
  ADD KEY `matiere_id` (`matiere_id`);

--
-- Index pour la table `etablissement`
--
ALTER TABLE `etablissement`
  ADD PRIMARY KEY (`id`),
  ADD KEY `departement_id` (`departement_id`),
  ADD KEY `commune_id` (`commune_id`);

--
-- Index pour la table `matieres`
--
ALTER TABLE `matieres`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_classe_id` (`classe_id`);

--
-- Index pour la table `note`
--
ALTER TABLE `note`
  ADD PRIMARY KEY (`id`),
  ADD KEY `Eleves_id` (`Eleves_id`),
  ADD KEY `Semestre_id` (`Semestre_id`),
  ADD KEY `fk_matieres` (`matieres_id`),
  ADD KEY `fk_classes` (`classe_id`);

--
-- Index pour la table `notificationProf`
--
ALTER TABLE `notificationProf`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uniq_notif` (`enseignant_id`,`permission_id`,`etablissement_id`),
  ADD KEY `idx_enseignant` (`enseignant_id`),
  ADD KEY `idx_permission` (`permission_id`),
  ADD KEY `idx_etablissement` (`etablissement_id`);

--
-- Index pour la table `notifications`
--
ALTER TABLE `notifications`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_notification` (`eleve_id`,`etablissement_id`,`Annee_scolaire_id`,`periode_debut_absence`,`periode_fin_absence`);

--
-- Index pour la table `paiement`
--
ALTER TABLE `paiement`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_paiement_scolarite` (`scolarite_id`);

--
-- Index pour la table `parents`
--
ALTER TABLE `parents`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_parents_annee_scolaire` (`Annee_scolaire_id`);

--
-- Index pour la table `permission`
--
ALTER TABLE `permission`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_eleve` (`eleve_id`),
  ADD KEY `fk_permission_annee_scolaire` (`Annee_scolaire_id`);

--
-- Index pour la table `presence`
--
ALTER TABLE `presence`
  ADD PRIMARY KEY (`id`),
  ADD KEY `eleve_id` (`eleve_id`),
  ADD KEY `matieres_id` (`matieres_id`),
  ADD KEY `fk_semestre_id` (`semestre_id`),
  ADD KEY `idx_presence_annee` (`Annee_scolaire_id`);

--
-- Index pour la table `programmes`
--
ALTER TABLE `programmes`
  ADD PRIMARY KEY (`id`),
  ADD KEY `classe_id` (`classe_id`),
  ADD KEY `matière_id` (`matière_id`);

--
-- Index pour la table `promotion`
--
ALTER TABLE `promotion`
  ADD PRIMARY KEY (`id`);

--
-- Index pour la table `punitions`
--
ALTER TABLE `punitions`
  ADD PRIMARY KEY (`id`),
  ADD KEY `eleve_id` (`eleve_id`),
  ADD KEY `fk_semestre` (`semestre_id`),
  ADD KEY `idx_punitions_eleve_annee_sem_etab` (`eleve_id`,`Annee_scolaire_id`,`semestre_id`,`etablissement_id`);

--
-- Index pour la table `scolarite`
--
ALTER TABLE `scolarite`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_scolarite_eleve_annee` (`eleve_id`,`annee_scolaire_id`),
  ADD KEY `fk_scol_annee` (`annee_scolaire_id`),
  ADD KEY `fk_scol_etablissement` (`etablissement_id`),
  ADD KEY `idx_scol_classe_annee` (`classe_id`,`annee_scolaire_id`);

--
-- Index pour la table `semestre`
--
ALTER TABLE `semestre`
  ADD PRIMARY KEY (`id`);

--
-- Index pour la table `tests`
--
ALTER TABLE `tests`
  ADD PRIMARY KEY (`id`),
  ADD KEY `enseignant_id` (`enseignant_id`),
  ADD KEY `matière_id` (`matière_id`),
  ADD KEY `classe_id` (`classe_id`),
  ADD KEY `semestre_id` (`semestre_id`);

--
-- Index pour la table `toutesNotes`
--
ALTER TABLE `toutesNotes`
  ADD PRIMARY KEY (`id`);

--
-- Index pour la table `Événements`
--
ALTER TABLE `Événements`
  ADD PRIMARY KEY (`id`);

--
-- AUTO_INCREMENT pour les tables déchargées
--

--
-- AUTO_INCREMENT pour la table `absenceVueParents`
--
ALTER TABLE `absenceVueParents`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=29;

--
-- AUTO_INCREMENT pour la table `administrations`
--
ALTER TABLE `administrations`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT pour la table `annee_scolaire`
--
ALTER TABLE `annee_scolaire`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT pour la table `bulletin`
--
ALTER TABLE `bulletin`
  MODIFY `bulletin_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=146;

--
-- AUTO_INCREMENT pour la table `classes`
--
ALTER TABLE `classes`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=46;

--
-- AUTO_INCREMENT pour la table `cloture_parametres`
--
ALTER TABLE `cloture_parametres`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT pour la table `coefficient`
--
ALTER TABLE `coefficient`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;

--
-- AUTO_INCREMENT pour la table `commune`
--
ALTER TABLE `commune`
  MODIFY `commune_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=67;

--
-- AUTO_INCREMENT pour la table `conduite`
--
ALTER TABLE `conduite`
  MODIFY `conduite_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT pour la table `departement`
--
ALTER TABLE `departement`
  MODIFY `departement_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=13;

--
-- AUTO_INCREMENT pour la table `eleve`
--
ALTER TABLE `eleve`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=24;

--
-- AUTO_INCREMENT pour la table `enseignants`
--
ALTER TABLE `enseignants`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=28;

--
-- AUTO_INCREMENT pour la table `etablissement`
--
ALTER TABLE `etablissement`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=75;

--
-- AUTO_INCREMENT pour la table `matieres`
--
ALTER TABLE `matieres`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=25;

--
-- AUTO_INCREMENT pour la table `note`
--
ALTER TABLE `note`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=355;

--
-- AUTO_INCREMENT pour la table `notificationProf`
--
ALTER TABLE `notificationProf`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT pour la table `notifications`
--
ALTER TABLE `notifications`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT pour la table `paiement`
--
ALTER TABLE `paiement`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT pour la table `parents`
--
ALTER TABLE `parents`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=26;

--
-- AUTO_INCREMENT pour la table `permission`
--
ALTER TABLE `permission`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT pour la table `presence`
--
ALTER TABLE `presence`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=39;

--
-- AUTO_INCREMENT pour la table `programmes`
--
ALTER TABLE `programmes`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=15;

--
-- AUTO_INCREMENT pour la table `promotion`
--
ALTER TABLE `promotion`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=26;

--
-- AUTO_INCREMENT pour la table `punitions`
--
ALTER TABLE `punitions`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=13;

--
-- AUTO_INCREMENT pour la table `scolarite`
--
ALTER TABLE `scolarite`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=10;

--
-- AUTO_INCREMENT pour la table `semestre`
--
ALTER TABLE `semestre`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=36;

--
-- AUTO_INCREMENT pour la table `tests`
--
ALTER TABLE `tests`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT pour la table `toutesNotes`
--
ALTER TABLE `toutesNotes`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT pour la table `Événements`
--
ALTER TABLE `Événements`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- Contraintes pour les tables déchargées
--

--
-- Contraintes pour la table `administrations`
--
ALTER TABLE `administrations`
  ADD CONSTRAINT `administrations_ibfk_1` FOREIGN KEY (`departement_id`) REFERENCES `departement` (`departement_id`),
  ADD CONSTRAINT `administrations_ibfk_2` FOREIGN KEY (`commune_id`) REFERENCES `commune` (`commune_id`);

--
-- Contraintes pour la table `classes`
--
ALTER TABLE `classes`
  ADD CONSTRAINT `fk_promotion` FOREIGN KEY (`Promotion_id`) REFERENCES `promotion` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Contraintes pour la table `eleve`
--
ALTER TABLE `eleve`
  ADD CONSTRAINT `eleve_ibfk_1` FOREIGN KEY (`classe_id`) REFERENCES `classes` (`id`),
  ADD CONSTRAINT `fk_Parents` FOREIGN KEY (`Parents_id`) REFERENCES `parents` (`id`) ON DELETE SET NULL;

--
-- Contraintes pour la table `enseigner`
--
ALTER TABLE `enseigner`
  ADD CONSTRAINT `enseigner_ibfk_1` FOREIGN KEY (`Enseignants_id`) REFERENCES `enseignants` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `enseigner_ibfk_2` FOREIGN KEY (`Classes_id`) REFERENCES `classes` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_Matière` FOREIGN KEY (`matiere_id`) REFERENCES `matieres` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Contraintes pour la table `etablissement`
--
ALTER TABLE `etablissement`
  ADD CONSTRAINT `etablissement_ibfk_1` FOREIGN KEY (`departement_id`) REFERENCES `departement` (`departement_id`),
  ADD CONSTRAINT `etablissement_ibfk_2` FOREIGN KEY (`commune_id`) REFERENCES `commune` (`commune_id`);

--
-- Contraintes pour la table `matieres`
--
ALTER TABLE `matieres`
  ADD CONSTRAINT `fk_classe_id` FOREIGN KEY (`classe_id`) REFERENCES `classes` (`id`) ON DELETE SET NULL;

--
-- Contraintes pour la table `note`
--
ALTER TABLE `note`
  ADD CONSTRAINT `fk_classes` FOREIGN KEY (`classe_id`) REFERENCES `classes` (`id`),
  ADD CONSTRAINT `fk_matieres` FOREIGN KEY (`matieres_id`) REFERENCES `matieres` (`id`),
  ADD CONSTRAINT `note_ibfk_1` FOREIGN KEY (`Eleves_id`) REFERENCES `eleve` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `note_ibfk_2` FOREIGN KEY (`Semestre_id`) REFERENCES `semestre` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Contraintes pour la table `paiement`
--
ALTER TABLE `paiement`
  ADD CONSTRAINT `fk_paiement_scolarite` FOREIGN KEY (`scolarite_id`) REFERENCES `scolarite` (`id`) ON DELETE CASCADE;

--
-- Contraintes pour la table `parents`
--
ALTER TABLE `parents`
  ADD CONSTRAINT `fk_parents_annee_scolaire` FOREIGN KEY (`Annee_scolaire_id`) REFERENCES `annee_scolaire` (`id`) ON UPDATE CASCADE;

--
-- Contraintes pour la table `permission`
--
ALTER TABLE `permission`
  ADD CONSTRAINT `fk_eleve` FOREIGN KEY (`eleve_id`) REFERENCES `eleve` (`id`),
  ADD CONSTRAINT `fk_permission_annee_scolaire` FOREIGN KEY (`Annee_scolaire_id`) REFERENCES `annee_scolaire` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Contraintes pour la table `presence`
--
ALTER TABLE `presence`
  ADD CONSTRAINT `fk_semestre_id` FOREIGN KEY (`semestre_id`) REFERENCES `semestre` (`id`),
  ADD CONSTRAINT `presence_ibfk_1` FOREIGN KEY (`eleve_id`) REFERENCES `eleve` (`id`),
  ADD CONSTRAINT `presence_ibfk_2` FOREIGN KEY (`matieres_id`) REFERENCES `matieres` (`id`);

--
-- Contraintes pour la table `programmes`
--
ALTER TABLE `programmes`
  ADD CONSTRAINT `programmes_ibfk_1` FOREIGN KEY (`classe_id`) REFERENCES `classes` (`id`),
  ADD CONSTRAINT `programmes_ibfk_2` FOREIGN KEY (`matière_id`) REFERENCES `matieres` (`id`);

--
-- Contraintes pour la table `punitions`
--
ALTER TABLE `punitions`
  ADD CONSTRAINT `fk_semestre` FOREIGN KEY (`semestre_id`) REFERENCES `semestre` (`id`),
  ADD CONSTRAINT `punitions_ibfk_1` FOREIGN KEY (`eleve_id`) REFERENCES `eleve` (`id`);

--
-- Contraintes pour la table `scolarite`
--
ALTER TABLE `scolarite`
  ADD CONSTRAINT `fk_scol_annee` FOREIGN KEY (`annee_scolaire_id`) REFERENCES `annee_scolaire` (`id`),
  ADD CONSTRAINT `fk_scol_classe` FOREIGN KEY (`classe_id`) REFERENCES `classes` (`id`),
  ADD CONSTRAINT `fk_scol_eleve` FOREIGN KEY (`eleve_id`) REFERENCES `eleve` (`id`),
  ADD CONSTRAINT `fk_scol_etablissement` FOREIGN KEY (`etablissement_id`) REFERENCES `etablissement` (`id`);

--
-- Contraintes pour la table `tests`
--
ALTER TABLE `tests`
  ADD CONSTRAINT `tests_ibfk_1` FOREIGN KEY (`enseignant_id`) REFERENCES `enseignants` (`id`),
  ADD CONSTRAINT `tests_ibfk_2` FOREIGN KEY (`matière_id`) REFERENCES `matieres` (`id`);
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
