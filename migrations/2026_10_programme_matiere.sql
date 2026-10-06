-- Programme d'une matière pour un niveau (promotion : 6ème, 1ere D...),
-- déposé une fois et conservé d'une année à l'autre (non lié à l'année).
--  - enseignant_id NULL : programme du niveau, valable pour toutes les
--    classes de ce niveau (déposé par l'administration, ou par le premier
--    enseignant qui l'a déposé) ;
--  - enseignant_id renseigné : version adaptée par cet enseignant, utilisée
--    pour ses propres classes de ce niveau.
CREATE TABLE IF NOT EXISTS programme_matiere (
  id INT AUTO_INCREMENT PRIMARY KEY,
  etablissement_id INT NOT NULL,
  matiere_id INT NOT NULL,
  promotion_id INT NOT NULL,
  enseignant_id INT NULL,
  auteur VARCHAR(20) NOT NULL DEFAULT 'administration',
  auteur_enseignant_id INT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_programme_matiere (etablissement_id, matiere_id, promotion_id)
) DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Éléments du programme, en arbre : SA, séquence, activité, leçon...
-- (le nom de chaque niveau dépend de la matière). « retire » : élément
-- supprimé du programme mais déjà cité dans un cahier de texte.
CREATE TABLE IF NOT EXISTS programme_element (
  id INT AUTO_INCREMENT PRIMARY KEY,
  programme_id INT NOT NULL,
  parent_id INT NULL,
  ordre INT NOT NULL DEFAULT 0,
  libelle VARCHAR(40) NOT NULL DEFAULT 'Activité',
  numero VARCHAR(20) NULL,
  titre VARCHAR(255) NOT NULL,
  details TEXT NULL,
  retire TINYINT(1) NOT NULL DEFAULT 0,
  KEY idx_programme_element (programme_id, parent_id, ordre)
) DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Bases où les deux tables ont déjà été créées sans jeu de caractères complet.
ALTER TABLE programme_matiere CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;
ALTER TABLE programme_element CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;

-- Séance du cahier de texte rattachée à une partie du programme, avec ce qui
-- a été fait ce jour-là et si la partie est terminée.
ALTER TABLE tests
  ADD COLUMN IF NOT EXISTS programme_element_id INT NULL,
  ADD COLUMN IF NOT EXISTS contenu TEXT NULL,
  ADD COLUMN IF NOT EXISTS element_termine TINYINT(1) NOT NULL DEFAULT 0,
  ADD KEY IF NOT EXISTS idx_tests_element (programme_element_id);

-- Assistant : une discussion par partie du programme (activité, séquence...)
-- et par élève. test_id garde la première séance de la partie.
ALTER TABLE assistant_conversation
  ADD COLUMN IF NOT EXISTS programme_element_id INT NULL,
  ADD KEY IF NOT EXISTS idx_conv_element (eleve_id, programme_element_id);
