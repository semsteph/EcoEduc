-- Migration : demandes de modification/suppression de notes déjà enregistrées
-- =====================================================================
-- Règle métier : un enseignant ne peut plus modifier ni supprimer directement
-- une note déjà sauvegardée dans le carnet. Toute tentative crée une demande
-- à destination de l'administration ; le changement n'est appliqué à la table
-- `note` qu'au moment où l'administration approuve la demande (voir
-- routes/note-modification-requests.routes.cjs).

CREATE TABLE IF NOT EXISTS `note_modification_requests` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `eleve_id` int(11) NOT NULL,
  `classe_id` int(11) NOT NULL,
  `matieres_id` int(11) NOT NULL,
  `semestre_id` int(11) NOT NULL,
  `annee_scolaire_id` int(11) NOT NULL,
  `etablissement_id` int(11) NOT NULL,
  `enseignant_id` int(11) NOT NULL,
  -- colonne de la table `note` concernée : inter1, inter2, inter3, inter4, TP1, TP2, Dev1, Dev2
  `note_type` varchar(20) NOT NULL,
  `type_demande` enum('modification','suppression') NOT NULL DEFAULT 'modification',
  `ancienne_valeur` decimal(5,2) DEFAULT NULL,
  -- NULL si type_demande = 'suppression'
  `nouvelle_valeur` decimal(5,2) DEFAULT NULL,
  `motif` varchar(500) DEFAULT NULL,
  `statut` enum('en_attente','approuvee','rejetee') NOT NULL DEFAULT 'en_attente',
  `commentaire_admin` varchar(500) DEFAULT NULL,
  -- vu par l'administration (badge d'alerte du tableau de bord)
  `is_read` tinyint(1) NOT NULL DEFAULT 0,
  -- vu par l'enseignant une fois la demande traitée (badge côté carnet de notes)
  `vu_par_enseignant` tinyint(1) NOT NULL DEFAULT 0,
  `traite_par_etablissement_id` int(11) DEFAULT NULL,
  `date_demande` timestamp NOT NULL DEFAULT current_timestamp(),
  `date_traitement` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_nmr_etab_statut` (`etablissement_id`, `statut`),
  KEY `idx_nmr_eleve` (`eleve_id`),
  KEY `idx_nmr_enseignant` (`enseignant_id`),
  CONSTRAINT `fk_nmr_eleve` FOREIGN KEY (`eleve_id`) REFERENCES `eleve` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_nmr_classe` FOREIGN KEY (`classe_id`) REFERENCES `classes` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_nmr_matiere` FOREIGN KEY (`matieres_id`) REFERENCES `matieres` (`id`),
  CONSTRAINT `fk_nmr_enseignant` FOREIGN KEY (`enseignant_id`) REFERENCES `enseignants` (`id`),
  CONSTRAINT `fk_nmr_etablissement` FOREIGN KEY (`etablissement_id`) REFERENCES `etablissement` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
