-- ============================================================================
-- Persiste l'exercice structuré par message, sur le même principe que
-- explanation_segments (migration 2026_09_assistant_message_diagrams) :
-- sans cette colonne, seul l'exercice EN COURS (tutor_state.exercise, un
-- slot unique) est retrouvable après un rechargement de la page — tous les
-- exercices précédents disparaissent de l'historique affiché.
-- Migration additive, sans suppression ni modification des données existantes.
-- ============================================================================

ALTER TABLE `assistant_message`
  ADD COLUMN `exercise_data` LONGTEXT NULL AFTER `explanation_segments`;
