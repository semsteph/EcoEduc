-- Un appel effectué (classe, matière, jour) : sert de dénominateur au taux de
-- présence. Seules les absences sont stockées dans `presence` ; sans cette
-- table, un élève absent une fois avait 0 % de présence.
CREATE TABLE IF NOT EXISTS appel (
  id INT AUTO_INCREMENT PRIMARY KEY,
  classe_id INT NOT NULL,
  matiere_id INT NOT NULL,
  date DATE NOT NULL,
  etablissement_id INT NOT NULL,
  Annee_scolaire_id INT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_appel (classe_id, matiere_id, date, Annee_scolaire_id),
  KEY idx_appel_classe_annee (classe_id, Annee_scolaire_id)
);
