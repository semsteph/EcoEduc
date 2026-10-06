-- Messagerie parents : messages automatiques de l'école (nouvelles notes,
-- changements d'emploi du temps). Une ligne par parent et par enfant ;
-- `cle` regroupe les événements d'une même journée (une note d'une matière,
-- les changements d'emploi du temps d'une classe) dans un seul message.
CREATE TABLE IF NOT EXISTS message_parent (
  id INT AUTO_INCREMENT PRIMARY KEY,
  parent_id INT NOT NULL,
  eleve_id INT NOT NULL,
  etablissement_id INT NOT NULL,
  type VARCHAR(20) NOT NULL,
  cle VARCHAR(120) NOT NULL,
  details JSON NOT NULL,
  lu TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_message_parent (parent_id, cle),
  KEY idx_message_parent_liste (parent_id, updated_at)
);

-- Permission d'absence précise : jour de fin (plusieurs jours) ou heures
-- (absence de quelques heures). `Duree` reste rempli en clair pour
-- l'affichage ; les anciennes demandes en texte libre restent lisibles.
ALTER TABLE permission
  ADD COLUMN date_fin DATE NULL AFTER `Date`,
  ADD COLUMN heure_debut TIME NULL AFTER date_fin,
  ADD COLUMN heure_fin TIME NULL AFTER heure_debut;
