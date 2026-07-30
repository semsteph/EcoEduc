-- Migration : paiement parent (déclaration + preuve) + échéances de scolarité
-- =====================================================================

-- 1) Table des échéances (calendrier de tranches défini par classe/année)
CREATE TABLE IF NOT EXISTS `echeance` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `classe_id` int(11) NOT NULL,
  `annee_scolaire_id` int(11) NOT NULL,
  `etablissement_id` int(11) NOT NULL,
  `libelle` varchar(100) NOT NULL,
  `montant` decimal(12,2) NOT NULL,
  `date_limite` date NOT NULL,
  `ordre` int(11) NOT NULL DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_echeance_classe_annee` (`classe_id`,`annee_scolaire_id`),
  KEY `fk_echeance_annee` (`annee_scolaire_id`),
  KEY `fk_echeance_etablissement` (`etablissement_id`),
  CONSTRAINT `fk_echeance_classe` FOREIGN KEY (`classe_id`) REFERENCES `classes` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_echeance_annee` FOREIGN KEY (`annee_scolaire_id`) REFERENCES `annee_scolaire` (`id`),
  CONSTRAINT `fk_echeance_etablissement` FOREIGN KEY (`etablissement_id`) REFERENCES `etablissement` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- 2) paiement : déclaration parent + preuve + statut de validation
ALTER TABLE `paiement`
  ADD COLUMN `statut` ENUM('valide','en_attente','rejete') NOT NULL DEFAULT 'valide' AFTER `montant`,
  ADD COLUMN `preuve_url` varchar(255) DEFAULT NULL AFTER `reference`,
  ADD COLUMN `parent_id` int(11) DEFAULT NULL AFTER `preuve_url`,
  ADD COLUMN `motif_rejet` varchar(255) DEFAULT NULL AFTER `parent_id`,
  ADD COLUMN `traite_par` int(11) DEFAULT NULL AFTER `motif_rejet`,
  ADD COLUMN `traite_at` timestamp NULL DEFAULT NULL AFTER `traite_par`,
  ADD KEY `idx_paiement_statut` (`statut`),
  ADD KEY `idx_paiement_parent` (`parent_id`);

ALTER TABLE `paiement`
  ADD CONSTRAINT `fk_paiement_parent` FOREIGN KEY (`parent_id`) REFERENCES `parents` (`id`) ON DELETE SET NULL;

-- 3) Triggers : ne compter que les paiements statut='valide' dans montant_paye
DROP TRIGGER IF EXISTS `trg_paiement_after_insert`;
DROP TRIGGER IF EXISTS `trg_paiement_after_update`;
DROP TRIGGER IF EXISTS `trg_paiement_after_delete`;

DELIMITER $$

CREATE TRIGGER `trg_paiement_after_insert` AFTER INSERT ON `paiement` FOR EACH ROW
BEGIN
  IF NEW.statut = 'valide' THEN
    UPDATE scolarite SET montant_paye = montant_paye + NEW.montant
    WHERE id = NEW.scolarite_id;
  END IF;
END$$

CREATE TRIGGER `trg_paiement_after_update` AFTER UPDATE ON `paiement` FOR EACH ROW
BEGIN
  IF OLD.statut = 'valide' AND NEW.statut = 'valide' THEN
    UPDATE scolarite SET montant_paye = montant_paye - OLD.montant + NEW.montant
    WHERE id = NEW.scolarite_id;
  ELSEIF OLD.statut = 'valide' AND NEW.statut != 'valide' THEN
    UPDATE scolarite SET montant_paye = montant_paye - OLD.montant
    WHERE id = OLD.scolarite_id;
  ELSEIF OLD.statut != 'valide' AND NEW.statut = 'valide' THEN
    UPDATE scolarite SET montant_paye = montant_paye + NEW.montant
    WHERE id = NEW.scolarite_id;
  END IF;
END$$

CREATE TRIGGER `trg_paiement_after_delete` AFTER DELETE ON `paiement` FOR EACH ROW
BEGIN
  IF OLD.statut = 'valide' THEN
    UPDATE scolarite SET montant_paye = montant_paye - OLD.montant
    WHERE id = OLD.scolarite_id;
  END IF;
END$$

DELIMITER ;
