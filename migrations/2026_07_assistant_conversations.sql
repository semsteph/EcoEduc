-- Migration : assistant IA de matière — persistance des conversations parent/enfant
-- =====================================================================

-- 1) Une conversation = un (élève, entrée de cahier de texte "tests") donné.
--    Rattachée à un tests.id précis (pas juste matière_id) pour figer le contexte
--    pédagogique exact, même si d'autres entrées sont ajoutées plus tard pour la même matière.
CREATE TABLE IF NOT EXISTS `assistant_conversation` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `eleve_id` int(11) NOT NULL,
  `test_id` int(11) NOT NULL,
  `etablissement_id` int(11) NOT NULL,
  `annee_scolaire_id` int(11) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_conversation_eleve_test` (`eleve_id`, `test_id`),
  KEY `fk_conv_test` (`test_id`),
  KEY `fk_conv_etablissement` (`etablissement_id`),
  KEY `fk_conv_annee` (`annee_scolaire_id`),
  CONSTRAINT `fk_conv_eleve` FOREIGN KEY (`eleve_id`) REFERENCES `eleve` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_conv_test` FOREIGN KEY (`test_id`) REFERENCES `tests` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_conv_etablissement` FOREIGN KEY (`etablissement_id`) REFERENCES `etablissement` (`id`),
  CONSTRAINT `fk_conv_annee` FOREIGN KEY (`annee_scolaire_id`) REFERENCES `annee_scolaire` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- 2) Messages d'une conversation (tour utilisateur + tour assistant, ordre chronologique)
CREATE TABLE IF NOT EXISTS `assistant_message` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `conversation_id` int(11) NOT NULL,
  `role` ENUM('user','assistant') NOT NULL,
  `content` text NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_message_conversation` (`conversation_id`, `created_at`),
  CONSTRAINT `fk_message_conversation` FOREIGN KEY (`conversation_id`) REFERENCES `assistant_conversation` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
