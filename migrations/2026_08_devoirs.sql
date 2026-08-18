-- Migration : devoirs / exercices à faire à la maison
-- =====================================================================

-- 1) Un devoir = donné par un enseignant, pour une classe et une matière données.
CREATE TABLE IF NOT EXISTS `devoirs` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `enseignant_id` int(11) NOT NULL,
  `matiere_id` int(11) NOT NULL,
  `classe_id` int(11) NOT NULL,
  `etablissement_id` int(11) NOT NULL,
  `annee_scolaire_id` int(11) NOT NULL,
  `titre` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `date_limite` date DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_devoir_classe` (`classe_id`, `matiere_id`, `annee_scolaire_id`),
  KEY `fk_devoir_enseignant` (`enseignant_id`),
  KEY `fk_devoir_matiere` (`matiere_id`),
  KEY `fk_devoir_etablissement` (`etablissement_id`),
  KEY `fk_devoir_annee` (`annee_scolaire_id`),
  CONSTRAINT `fk_devoir_enseignant` FOREIGN KEY (`enseignant_id`) REFERENCES `enseignants` (`id`),
  CONSTRAINT `fk_devoir_matiere` FOREIGN KEY (`matiere_id`) REFERENCES `matieres` (`id`),
  CONSTRAINT `fk_devoir_classe` FOREIGN KEY (`classe_id`) REFERENCES `classes` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_devoir_etablissement` FOREIGN KEY (`etablissement_id`) REFERENCES `etablissement` (`id`),
  CONSTRAINT `fk_devoir_annee` FOREIGN KEY (`annee_scolaire_id`) REFERENCES `annee_scolaire` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- 2) Signalement "non fait" par élève : l'enseignant coche, pour un devoir donné,
--    les élèves qui ne l'ont pas fait. Une ligne = un élève signalé pour ce devoir.
CREATE TABLE IF NOT EXISTS `devoir_non_fait` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `devoir_id` int(11) NOT NULL,
  `eleve_id` int(11) NOT NULL,
  `signale_le` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_devoir_eleve` (`devoir_id`, `eleve_id`),
  KEY `fk_nonfait_eleve` (`eleve_id`),
  CONSTRAINT `fk_nonfait_devoir` FOREIGN KEY (`devoir_id`) REFERENCES `devoirs` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_nonfait_eleve` FOREIGN KEY (`eleve_id`) REFERENCES `eleve` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- 3) "Vu" côté parent — même principe que `absenceVueParents` pour les absences :
--    sert uniquement à calculer is_read dans le flux de notifications parent.
CREATE TABLE IF NOT EXISTS `devoir_vue_parent` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `parent_id` int(11) NOT NULL,
  `devoir_id` int(11) NOT NULL,
  `viewed_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_parent_devoir` (`parent_id`, `devoir_id`),
  KEY `fk_vue_devoir` (`devoir_id`),
  CONSTRAINT `fk_vue_devoir` FOREIGN KEY (`devoir_id`) REFERENCES `devoirs` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_vue_parent` FOREIGN KEY (`parent_id`) REFERENCES `parents` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
