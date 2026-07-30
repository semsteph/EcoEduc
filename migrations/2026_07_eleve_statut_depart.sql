-- Migration : statut de l'élève (actif / parti) pour distinguer explicitement
-- les élèves qui ne sont plus réinscrits dans l'établissement, au lieu de
-- s'appuyer implicitement sur Annee_scolaire_id (qui ne suffit pas à les
-- retirer des listes de classe non filtrées par année).
-- =====================================================================

ALTER TABLE `eleve`
  ADD COLUMN `statut` ENUM('actif','parti') NOT NULL DEFAULT 'actif' AFTER `Annee_scolaire_id`,
  ADD COLUMN `date_depart` DATE DEFAULT NULL AFTER `statut`,
  ADD KEY `idx_eleve_statut` (`statut`);
