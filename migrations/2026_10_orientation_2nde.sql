-- Groupe d'attente « 2nde — orientation à faire » : à la clôture, les admis
-- de 3ème y passent ; l'administration choisit ensuite la série de chacun
-- selon son vœu (Élèves → Orientation en 2nde). Aucune note n'y est saisie.
ALTER TABLE classes ADD COLUMN orientation TINYINT(1) NOT NULL DEFAULT 0;
