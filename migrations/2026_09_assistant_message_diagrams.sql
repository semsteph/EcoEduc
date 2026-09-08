-- ============================================================================
-- Persiste les schémas d'explication par message, au lieu d'un seul slot
-- transitoire dans tutor_state (perdu dès qu'un nouveau message est envoyé).
-- Migration additive, sans suppression ni modification des données existantes.
-- ============================================================================

-- Tableau JSON ordonné de tronçons {text, diagram}, produit par
-- extractExplanationSegments() côté backend. NULL pour les messages qui
-- n'ont jamais eu de schéma (question de suivi, exercice, etc.).
ALTER TABLE `assistant_message`
  ADD COLUMN `explanation_segments` LONGTEXT NULL AFTER `content`;
