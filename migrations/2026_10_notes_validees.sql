-- Notes validées note par note : après « Valider les moyennes », seules les
-- notes présentes à ce moment sont verrouillées ; une case encore vide
-- (2e interrogation, devoir...) reste saisissable, puis on revalide.
-- Liste séparée par des virgules (inter1,inter2,Dev1...). NULL sur une
-- ligne déjà validée (moy non NULL) = anciennes données : toutes ses notes
-- présentes sont considérées validées.
ALTER TABLE note ADD COLUMN notes_validees VARCHAR(64) NULL DEFAULT NULL;
