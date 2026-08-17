// =====================================================================
//  Helpers de paramètres de clôture d'année, partagés par cloture.routes.cjs,
//  eleves.routes.cjs (migration/réinscription) et inscription.routes.cjs.
// =====================================================================

function getDefaultClotureParams() {
  return {
    effectifMaxParClasse: 50,
    effectifMinNouvelleClasse: 10,
    activerCreationAutoClasse: true,
    activerRepartitionIntelligente: true,
    noteInterne: ''
  };
}

function parseBoolean(value, defaultValue = false) {
  if (value === null || value === undefined) return defaultValue;

  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value === 1;

  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();

    if (['1', 'true', 'yes', 'oui', 'on'].includes(normalized)) return true;
    if (['0', 'false', 'no', 'non', 'off', ''].includes(normalized)) return false;
  }

  return defaultValue;
}

async function fetchClotureParams(connection, etablissementId) {
  const defaults = getDefaultClotureParams();

  const [rows] = await connection.execute(
    `
    SELECT
      effectif_max_par_classe,
      effectif_min_nouvelle_classe,
      activer_creation_auto_classe,
      activer_repartition_intelligente,
      note_interne
    FROM cloture_parametres
    WHERE etablissement_id = ?
    LIMIT 1
    `,
    [etablissementId]
  );

  if (!rows.length) return defaults;

  const row = rows[0];

  return {
    effectifMaxParClasse:
      Number(row.effectif_max_par_classe) > 0
        ? Number(row.effectif_max_par_classe)
        : defaults.effectifMaxParClasse,

    effectifMinNouvelleClasse:
      Number(row.effectif_min_nouvelle_classe) > 0
        ? Number(row.effectif_min_nouvelle_classe)
        : defaults.effectifMinNouvelleClasse,

    activerCreationAutoClasse: parseBoolean(
      row.activer_creation_auto_classe,
      defaults.activerCreationAutoClasse
    ),

    activerRepartitionIntelligente: parseBoolean(
      row.activer_repartition_intelligente,
      defaults.activerRepartitionIntelligente
    ),

    noteInterne: row.note_interne || ''
  };
}

module.exports = { getDefaultClotureParams, parseBoolean, fetchClotureParams };
