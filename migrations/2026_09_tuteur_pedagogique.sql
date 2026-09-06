-- ============================================================================
-- Tuteur pédagogique : état persistant, catalogue de manuels et preuves.
-- Migration additive, sans suppression ni modification des données existantes.
-- À exécuter une seule fois, après sauvegarde, avant le déploiement du code.
-- Elle ne contient aucun contenu de manuel.
-- ============================================================================

-- Etat de séance JSON sérialisé : phase interne, notion, exercice généré,
-- tentatives, manuel choisi et référence finale. Il n'est jamais exposé tel
-- quel dans l'interface élève.
ALTER TABLE `assistant_conversation`
  ADD COLUMN `tutor_state` LONGTEXT NULL AFTER `updated_at`;

-- Manuel identifié de façon canonique. Les niveaux, séries, matières et
-- notions sont volontairement portés par les références, pas par le manuel :
-- une même collection peut couvrir plusieurs contextes.
CREATE TABLE `assistant_books` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `title` varchar(255) NOT NULL,
  `normalized_title` varchar(255) NOT NULL,
  `publisher` varchar(255) DEFAULT NULL,
  `isbn` varchar(32) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_assistant_book_normalized_title` (`normalized_title`),
  UNIQUE KEY `uniq_assistant_book_isbn` (`isbn`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Variantes explicitement approuvées du titre. Une saisie élève ambiguë ne
-- correspond à aucun livre tant qu'elle n'est pas enregistrée ici.
CREATE TABLE `assistant_book_aliases` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `book_id` int(11) NOT NULL,
  `alias` varchar(255) NOT NULL,
  `normalized_alias` varchar(255) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_assistant_book_alias_normalized` (`normalized_alias`),
  KEY `idx_assistant_book_alias_book` (`book_id`),
  CONSTRAINT `fk_assistant_book_alias_book`
    FOREIGN KEY (`book_id`) REFERENCES `assistant_books` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Une recherche Web est tracée sans mémoriser de page de manuel ni de contenu
-- protégé. Les résultats détaillés sont représentés par les candidats et leurs
-- preuves ci-dessous.
CREATE TABLE `assistant_book_search_jobs` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `conversation_id` int(11) NOT NULL,
  `declared_book_name` varchar(255) NOT NULL,
  `normalized_declared_book_name` varchar(255) NOT NULL,
  `class_label` varchar(100) NOT NULL,
  `series_label` varchar(100) DEFAULT NULL,
  `subject_name` varchar(100) NOT NULL,
  `current_activity` varchar(255) NOT NULL,
  `topic` varchar(255) NOT NULL,
  `status` enum('queued','searching','needs_clarification','completed','failed') NOT NULL DEFAULT 'queued',
  `provider` varchar(100) DEFAULT NULL,
  `query_text` varchar(1000) DEFAULT NULL,
  `error_message` varchar(500) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `completed_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_assistant_search_job_conversation` (`conversation_id`, `created_at`),
  KEY `idx_assistant_search_job_context` (`normalized_declared_book_name`, `class_label`, `series_label`, `subject_name`),
  CONSTRAINT `fk_assistant_search_job_conversation`
    FOREIGN KEY (`conversation_id`) REFERENCES `assistant_conversation` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Candidat de référence. Aucun candidat ne peut être visible à l'élève tant
-- que son statut n'est pas strictement « verified ».
CREATE TABLE `assistant_book_references` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `search_job_id` int(11) DEFAULT NULL,
  `book_id` int(11) NOT NULL,
  `class_label` varchar(100) NOT NULL,
  `series_label` varchar(100) DEFAULT NULL,
  `subject_name` varchar(100) NOT NULL,
  `current_activity` varchar(255) DEFAULT NULL,
  `topic` varchar(255) NOT NULL,
  `normalized_topic` varchar(255) NOT NULL,
  `page` varchar(50) NOT NULL,
  `exercise_number` varchar(50) NOT NULL,
  `status` enum('candidate','needs_review','verified','rejected') NOT NULL DEFAULT 'candidate',
  `confidence_score` decimal(5,2) NOT NULL DEFAULT 0.00,
  `validation_reason` varchar(1000) DEFAULT NULL,
  `verified_by` varchar(255) DEFAULT NULL,
  `verified_at` datetime DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_assistant_reference_catalogue` (`book_id`, `class_label`, `series_label`, `subject_name`, `normalized_topic`, `status`),
  KEY `idx_assistant_reference_search_job` (`search_job_id`),
  CONSTRAINT `fk_assistant_reference_book`
    FOREIGN KEY (`book_id`) REFERENCES `assistant_books` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_assistant_reference_search_job`
    FOREIGN KEY (`search_job_id`) REFERENCES `assistant_book_search_jobs` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Preuve minimale et structurée, par source consultée. L'extrait est limité
-- à 500 caractères : il sert à justifier page/exercice, jamais à reproduire
-- un exercice ou une page de manuel.
CREATE TABLE `assistant_reference_evidence` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `reference_id` int(11) NOT NULL,
  `source_url` varchar(1000) NOT NULL,
  `source_title` varchar(500) NOT NULL,
  `source_type` enum('institutional','publisher','library_catalog','bibliographic_catalog','educational','other') NOT NULL,
  `source_host` varchar(255) NOT NULL,
  `independent_source_key` varchar(255) NOT NULL,
  `searched_at` datetime NOT NULL,
  `evidence_excerpt` varchar(500) NOT NULL,
  `reported_page` varchar(50) DEFAULT NULL,
  `reported_exercise_number` varchar(50) DEFAULT NULL,
  `metadata_match_score` decimal(5,2) NOT NULL DEFAULT 0.00,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_assistant_evidence_reference` (`reference_id`),
  KEY `idx_assistant_evidence_independence` (`reference_id`, `independent_source_key`),
  CONSTRAINT `fk_assistant_evidence_reference`
    FOREIGN KEY (`reference_id`) REFERENCES `assistant_book_references` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Politique de validation implémentée dans le backend (étapes 8-9) :
--  * score >= 85 + page/exercice explicites + correspondances exactes ; ET
--  * une preuve institutional/publisher/bibliographic_catalog explicite,
--    ou au moins deux independent_source_key cohérents ;
--  * aucune preuve contradictoire ;
--  * sinon : needs_review ou rejected, jamais verified.
