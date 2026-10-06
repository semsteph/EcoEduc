-- Alertes des parents : une seule liste (absences, permissions, punitions,
-- bulletins, devoirs...), lue/non lue par parent. Chaque nouvelle alerte
-- part en notification sur le téléphone (Web Push) et, pour les urgentes
-- et si l'école l'a activé, par SMS.
CREATE TABLE IF NOT EXISTS alerte_parent (
  id INT AUTO_INCREMENT PRIMARY KEY,
  parent_id INT NOT NULL,
  eleve_id INT NULL,
  etablissement_id INT NOT NULL,
  type VARCHAR(20) NOT NULL,
  cle VARCHAR(120) NOT NULL,
  titre VARCHAR(160) NOT NULL,
  texte VARCHAR(500) NOT NULL,
  lien VARCHAR(200) NULL,
  details JSON NULL,
  urgent TINYINT(1) NOT NULL DEFAULT 0,
  lu TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_alerte_parent (parent_id, cle),
  KEY idx_alerte_parent_liste (parent_id, created_at)
);

-- Téléphones (navigateurs) abonnés aux notifications push.
CREATE TABLE IF NOT EXISTS push_abonnement (
  id INT AUTO_INCREMENT PRIMARY KEY,
  utilisateur_type VARCHAR(20) NOT NULL,
  utilisateur_id INT NOT NULL,
  endpoint VARCHAR(600) NOT NULL,
  p256dh VARCHAR(200) NOT NULL,
  auth VARCHAR(100) NOT NULL,
  appareil VARCHAR(200) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_push_endpoint (endpoint(255)),
  KEY idx_push_utilisateur (utilisateur_type, utilisateur_id)
);

-- Journal des SMS (envoyés, simulés tant qu'aucun fournisseur n'est
-- configuré, ou en échec).
CREATE TABLE IF NOT EXISTS sms_envoi (
  id INT AUTO_INCREMENT PRIMARY KEY,
  etablissement_id INT NOT NULL,
  parent_id INT NULL,
  telephone VARCHAR(30) NOT NULL,
  texte VARCHAR(480) NOT NULL,
  type VARCHAR(20) NULL,
  statut VARCHAR(20) NOT NULL,
  fournisseur VARCHAR(30) NULL,
  reponse VARCHAR(500) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_sms_etab (etablissement_id, created_at)
);

-- Réglages des alertes SMS de chaque école.
CREATE TABLE IF NOT EXISTS alertes_parametres (
  etablissement_id INT PRIMARY KEY,
  sms_actif TINYINT(1) NOT NULL DEFAULT 0,
  sms_absences TINYINT(1) NOT NULL DEFAULT 1,
  sms_permissions TINYINT(1) NOT NULL DEFAULT 1,
  sms_bulletins TINYINT(1) NOT NULL DEFAULT 1,
  quota_mensuel INT NOT NULL DEFAULT 1000,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Préférences du parent (il peut couper les SMS : « STOP »).
ALTER TABLE parents ADD COLUMN alertes_sms TINYINT(1) NOT NULL DEFAULT 1;

-- Clés de l'application (clés VAPID des notifications push, générées une fois).
CREATE TABLE IF NOT EXISTS app_config (
  cle VARCHAR(60) PRIMARY KEY,
  valeur TEXT NOT NULL
);
