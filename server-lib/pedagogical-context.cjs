const { deriveLevelAndSeries, normaliseText } = require('./pedagogical-tutor.cjs');

const STOP_WORDS = new Set([
  'a', 'au', 'aux', 'avec', 'ce', 'ces', 'dans', 'de', 'des', 'du', 'en', 'et',
  'il', 'la', 'le', 'les', 'on', 'ou', 'par', 'pour', 'sur', 'un', 'une', 'the',
]);

function terms(value) {
  return normaliseText(value)
    .split(' ')
    .filter((word) => word.length > 2 && !STOP_WORDS.has(word));
}

// Une notion n'est retenue que si elle est écrite explicitement dans l'activité
// du cahier de texte. Cette fonction ne déduit jamais une notion nouvelle.
function extractExplicitTopic(activity) {
  const source = String(activity || '').replace(/\s+/g, ' ').trim();
  if (!source) return null;

  const withoutLabel = source.replace(/^activité\s*:?\s*/i, '').trim();
  const normalized = normaliseText(withoutLabel);
  const isGeneric = !normalized
    || /^[0-9 -]+$/.test(withoutLabel)
    || /^(sa|seance|sequence|activite|cours|revision|evaluation|devoir|test)\s*[0-9-]*$/.test(normalized)
    || /^activite\s*[0-9-]+$/.test(normalized);
  return isGeneric ? null : withoutLabel.slice(0, 255);
}

function toIsoDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toISOString().slice(0, 10);
}

function selectRelevantProgression(programmeRows, currentActivity, currentTopic, limit = 4) {
  const referenceTerms = new Set(terms(currentTopic || currentActivity));
  const candidates = (programmeRows || [])
    .map((row) => {
      const activity = String(row.activite || '').replace(/\s+/g, ' ').trim();
      const overlap = terms(activity).filter((term) => referenceTerms.has(term)).length;
      return { date: toIsoDate(row.date), activity, overlap };
    })
    .filter((row) => row.activity);

  const relevant = candidates
    .filter((row) => row.overlap > 0)
    .sort((a, b) => b.overlap - a.overlap || b.date.localeCompare(a.date))
    .slice(0, limit);

  // En l'absence de lien lexical explicite, les dernières activités restent un
  // contexte utile mais sont limitées à trois pour ne pas noyer l'activité du jour.
  const selected = relevant.length
    ? relevant
    : candidates.sort((a, b) => b.date.localeCompare(a.date)).slice(0, Math.min(3, limit));

  return selected.map(({ date, activity }) => ({ date, activity }));
}

function buildPedagogicalContext({ eleve, test, programmeRows }) {
  const { level, series } = deriveLevelAndSeries(test.promotionName || test.className);
  const currentActivity = String(test.activity || '').replace(/\s+/g, ' ').trim() || null;
  const currentTopic = extractExplicitTopic(currentActivity);

  return {
    identity: {
      level,
      className: test.className || null,
      promotionName: test.promotionName || null,
      series,
      subjectName: test.subjectName || null,
      schoolYear: test.schoolYear || null,
      establishmentName: test.establishmentName || null,
    },
    currentActivity: {
      date: toIsoDate(test.date),
      activity: currentActivity,
      subjectName: test.subjectName || null,
      topic: currentTopic,
    },
    priorProgression: selectRelevantProgression(programmeRows, currentActivity, currentTopic),
  };
}

function formatPedagogicalContext(context) {
  const identity = context.identity;
  const current = context.currentActivity;
  const progression = context.priorProgression.length
    ? context.priorProgression.map((entry) => `- ${entry.date || 'Date non précisée'} : ${entry.activity}`).join('\n')
    : '- Aucune activité antérieure pertinente renseignée.';
  const topic = current.topic
    ? `Notion explicitement indiquée : "${current.topic}".`
    : "Notion explicitement indiquée : non déterminée. N'invente pas de notion ; appuie-toi uniquement sur l'activité actuelle.";

  return `CONTEXTE SCOLAIRE FIABLE — données lues en base, ne les modifie pas et ne les contredis pas.
Identité scolaire :
- Niveau : ${identity.level || 'non renseigné'}
- Classe : ${identity.className || 'non renseignée'}
- Promotion : ${identity.promotionName || 'non renseignée'}
- Série/filière : ${identity.series || 'non applicable ou non renseignée'}
- Matière : ${identity.subjectName || 'non renseignée'}
- Année scolaire : ${identity.schoolYear || 'non renseignée'}
- Établissement : ${identity.establishmentName || 'non renseigné'}

Activité actuelle (prioritaire) :
- Date : ${current.date || 'non précisée'}
- Matière : ${current.subjectName || 'non renseignée'}
- Activité : ${current.activity || 'non renseignée'}
- ${topic}

Progression antérieure utile (contexte, non prioritaire) :
${progression}`;
}

module.exports = {
  extractExplicitTopic,
  selectRelevantProgression,
  buildPedagogicalContext,
  formatPedagogicalContext,
};
