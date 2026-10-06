-- Matricule national EducMaster de l'élève (unique dans tout le pays, suit
-- l'élève d'une école à l'autre). Enregistré lors du premier transfert de
-- notes vers EducMaster, puis utilisé pour associer sans erreur.
ALTER TABLE eleve ADD COLUMN matricule_national VARCHAR(20) NULL AFTER matricule;
CREATE INDEX idx_eleve_matricule_national ON eleve (matricule_national);
