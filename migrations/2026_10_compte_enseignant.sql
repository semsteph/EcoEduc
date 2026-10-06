-- Compte unique par enseignant : une seule connexion (identifiant ou
-- e-mail ou téléphone + mot de passe) pour tous les établissements où il
-- enseigne. Les fiches `enseignants` restent une par établissement (notes,
-- affectations, devoirs... inchangés) et pointent vers le compte.
CREATE TABLE IF NOT EXISTS compte_enseignant (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nom_utilisateur VARCHAR(255) NOT NULL,
  email VARCHAR(100) NULL,
  telephone VARCHAR(20) NULL,
  mot_de_passe VARCHAR(255) NOT NULL,
  -- Mot de passe donné par l'école : à remplacer à la première connexion.
  mdp_provisoire TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_compte_ens_user (nom_utilisateur),
  KEY idx_compte_ens_email (email),
  KEY idx_compte_ens_tel (telephone)
);

-- Rattachement des fiches ; `actif` = 0 : retiré de l'établissement (son
-- historique est conservé, il n'y a plus accès).
ALTER TABLE enseignants
  ADD COLUMN compte_id INT NULL AFTER id,
  ADD COLUMN actif TINYINT(1) NOT NULL DEFAULT 1 AFTER etablissement_id,
  ADD KEY idx_enseignants_compte (compte_id);

-- Puis : node scripts/comptes-enseignants.cjs (crée un compte pour chaque
-- fiche existante, sans fusion automatique).
