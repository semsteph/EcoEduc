-- Journal des clôtures : ce qu'il faut pour annuler une clôture faite par
-- erreur (classes et années des élèves avant, noms des classes, classes et
-- année créées). L'annulation n'est permise que tant que rien n'a été fait
-- dans la nouvelle année (notes, présences, inscriptions...).
CREATE TABLE IF NOT EXISTS cloture_journal (
  id INT AUTO_INCREMENT PRIMARY KEY,
  etablissement_id INT NOT NULL,
  annee_id INT NOT NULL,
  nouvelle_annee_id INT NULL,
  nouvelle_annee_creee TINYINT(1) NOT NULL DEFAULT 0,
  etat_avant LONGTEXT NOT NULL,
  resume TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  annulee_at DATETIME NULL,
  KEY idx_cloture_journal_etab (etablissement_id, created_at)
);
