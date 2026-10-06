-- Matricule des élèves inscrits avant la génération automatique :
-- année de leur année scolaire + numéro unique.
UPDATE eleve e
LEFT JOIN annee_scolaire a ON a.id = e.Annee_scolaire_id
SET e.matricule = CONCAT(COALESCE(LEFT(a.nom_annee, 4), YEAR(CURDATE())), '-', LPAD(e.id, 5, '0'))
WHERE e.matricule IS NULL OR e.matricule = '';
