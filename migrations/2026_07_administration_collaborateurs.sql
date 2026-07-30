-- Migration : gestion des collaborateurs (rôles + accès par module)
-- =====================================================================

ALTER TABLE `administrations`
  ADD COLUMN `modules_autorises` JSON NULL AFTER `poste`;
