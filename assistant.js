import axios from 'axios';

export default defineEventHandler(async (event) => {
  const body = await readBody(event); // Récupère le corps de la requête
  const { studentFirstName, studentLastName, subjectName, className, activity, activityDate, userMessage } = body;

  const apiKey = useRuntimeConfig().openaiApiKey; // Clé API OpenAI définie dans `runtimeConfig`

  if (!studentFirstName || !studentLastName || !subjectName || !className || !activity || !activityDate || !userMessage) {
    return {
      statusCode: 400,
      body: { error: 'Tous les champs sont requis.' },
    };
  }

  const prompt = `
    Élève: ${studentFirstName} ${studentLastName}
    Matière: ${subjectName}
    Classe: ${className}
    Activité réalisée: ${activity}
    Date de l'activité: ${activityDate}
    Question: ${userMessage}

    Bonjour GPT, veuillez aider cet élève à mieux comprendre l'activité ou répondre à sa question.
  `;

  try {
    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 200,
      },
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      }
    );

    return { reply: response.data.choices[0].message.content };
  } catch (error) {
    console.error('Erreur avec OpenAI:', error.response?.data || error.message);
    return {
      statusCode: 500,
      body: { error: 'Erreur avec le service OpenAI.' },
    };
  }
});
