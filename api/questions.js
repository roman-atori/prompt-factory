const Anthropic = require('@anthropic-ai/sdk');
const OpenAI = require('openai');

const QUESTIONS_SYSTEM_PROMPT = `Tu es un expert en prompt engineering. On te fournit les donnees d'un formulaire de creation de prompt.

Ton role est de poser 3 a 5 questions PERTINENTES et CIBLEES pour ameliorer ce prompt.

Regles strictes :
- Chaque question doit aider a affiner le prompt final
- Ne pose PAS de questions dont la reponse est deja dans les donnees fournies
- Adapte les questions au type de tache et au modele cible
- Pose des questions sur les aspects manquants : exemples specifiques, cas limites, contraintes non dites, preferences de style, structure attendue
- Langue : francais

Format de sortie OBLIGATOIRE : un JSON array d'objets avec ces champs :
- "id" : identifiant unique (string, ex: "q1", "q2")
- "question" : la question en francais
- "placeholder" : texte d'aide pour le champ de reponse
- "type" : "text" (input court), "textarea" (reponse longue), ou "choice" (options)
- Si type="choice", ajouter un champ "options" : tableau de strings

Retourne UNIQUEMENT le JSON, sans commentaire ni explication.`;

async function callAnthropic(apiKey, userMessage) {
  const client = new Anthropic({ apiKey });
  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1024,
    temperature: 0.5,
    system: QUESTIONS_SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userMessage }]
  });
  return {
    text: response.content[0].text.trim(),
    inputTokens: response.usage.input_tokens,
    outputTokens: response.usage.output_tokens,
    provider: 'anthropic'
  };
}

async function callOpenAI(apiKey, userMessage) {
  const client = new OpenAI({ apiKey });
  const response = await client.chat.completions.create({
    model: 'gpt-5.2-mini',
    max_tokens: 1024,
    temperature: 0.5,
    messages: [
      { role: 'system', content: QUESTIONS_SYSTEM_PROMPT },
      { role: 'user', content: userMessage }
    ]
  });
  return {
    text: response.choices[0].message.content.trim(),
    inputTokens: response.usage.prompt_tokens,
    outputTokens: response.usage.completion_tokens,
    provider: 'openai'
  };
}

function parseQuestions(rawText) {
  let jsonText = rawText;
  if (jsonText.startsWith('```')) {
    jsonText = jsonText.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
  }
  try {
    return JSON.parse(jsonText);
  } catch {
    return [
      { id: 'q1', question: 'Pouvez-vous donner un exemple concret du resultat attendu ?', placeholder: 'Decrivez un exemple...', type: 'textarea' },
      { id: 'q2', question: 'Y a-t-il des erreurs courantes que le LLM devrait eviter ?', placeholder: 'Ex: Ne pas inventer de sources...', type: 'text' },
      { id: 'q3', question: 'Quelle est la longueur ideale de la reponse ?', placeholder: 'Ex: 200-300 mots', type: 'text' }
    ];
  }
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' });

  const { formData, apiKey, openaiKey } = req.body;

  if (!formData || (!apiKey && !openaiKey)) {
    return res.status(400).json({ message: 'Au moins une cle API est requise (Anthropic ou OpenAI).' });
  }

  const summary = {
    modeles: formData.targetLLMs,
    tache: formData.taskType,
    tacheCustom: formData.customTaskType || null,
    domaine: formData.domain || null,
    audience: formData.audience || null,
    ton: formData.tone || null,
    langue: formData.outputLanguage || null,
    description: formData.taskDescription || null,
    inputDescription: formData.inputDescription || null,
    formatSortie: formData.outputFormat || null,
    contraintes: formData.constraints || null,
    complexite: formData.complexity || null,
    persona: formData.persona || null,
    fewShot: formData.fewShotEnabled || false,
    chainOfThought: formData.chainOfThought || false
  };

  const userMessage = `Donnees du formulaire :\n${JSON.stringify(summary, null, 2)}\n\nGenere les questions d'optimisation en JSON.`;

  let anthropicError = null;

  // Try Anthropic first
  if (apiKey) {
    try {
      const result = await callAnthropic(apiKey, userMessage);
      const questions = parseQuestions(result.text);
      return res.status(200).json({
        questions,
        inputTokens: result.inputTokens,
        outputTokens: result.outputTokens,
        provider: result.provider
      });
    } catch (error) {
      console.error('Anthropic error:', error.status, error.message);
      anthropicError = error;
      // If we have OpenAI key, fall through to fallback
      if (!openaiKey) {
        return handleError(res, error, 'Anthropic');
      }
      console.log('Anthropic indisponible, basculement sur OpenAI...');
    }
  }

  // Fallback to OpenAI
  if (openaiKey) {
    try {
      const result = await callOpenAI(openaiKey, userMessage);
      const questions = parseQuestions(result.text);
      return res.status(200).json({
        questions,
        inputTokens: result.inputTokens,
        outputTokens: result.outputTokens,
        provider: result.provider,
        fallback: true
      });
    } catch (error) {
      console.error('OpenAI error:', error.message);
      return handleError(res, error, 'OpenAI');
    }
  }

  return res.status(500).json({ message: 'Aucune API disponible.' });
};

function handleError(res, error, provider) {
  if (error.status === 401 || error.code === 'invalid_api_key') {
    return res.status(401).json({ message: `Cle API ${provider} invalide ou expiree.` });
  }
  if (error.status === 429) {
    return res.status(429).json({ message: 'Trop de requetes. Reessayez dans quelques secondes.' });
  }
  if (error.status >= 500 || error.code === 'server_error') {
    const detail = error.error?.error?.message || error.message || 'Erreur interne';
    return res.status(502).json({ message: `Erreur serveur ${provider} : ${detail}` });
  }
  return res.status(500).json({ message: `Erreur ${provider} : ${error.message}` });
}
