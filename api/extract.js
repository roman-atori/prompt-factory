const Anthropic = require('@anthropic-ai/sdk');
const OpenAI = require('openai');

const EXTRACT_SYSTEM_PROMPT = `Tu es un assistant d'analyse de texte. L'utilisateur decrit un besoin pour un prompt LLM.
Extrais les informations structurees du texte libre.

Retourne UNIQUEMENT un JSON valide avec ces champs (null si non mentionne) :
{
  "domain": "valeur parmi: marketing-digital, developpement-web, data-science, finance, droit, medecine, education, ecommerce, rh, redaction, design, immobilier, ou null",
  "audience": "valeur parmi: general, technical, business, academic, children, marketers, designers, students, executives, ou null",
  "tone": "valeur parmi: professionnel, decontracte, creatif, technique, pedagogique, formel, humoristique, empathique, autoritaire, narratif, ou null",
  "outputLanguage": "valeur parmi: francais, english, espanol, deutsch, italiano, portugues, arabic, chinese, japanese, korean, ou null",
  "taskDescription": "description detaillee de la tache a accomplir, ou null",
  "inputDescription": "description des donnees d'entree si mentionnees, ou null",
  "outputFormat": "valeur parmi: texte, json, markdown, code, tableau, liste, email, autre, ou null",
  "constraints": "contraintes mentionnees (longueur, style, etc.), ou null",
  "persona": "role ou persona mentionne (ex: 'un developpeur senior Python'), ou null",
  "complexity": "valeur parmi: basic, intermediate, advanced, expert, ou null"
}

Regles :
- Extrais UNIQUEMENT ce qui est explicitement mentionne ou clairement implique
- Ne donne PAS de valeurs par defaut - utilise null si non mentionne
- Pour domain, audience, tone, outputLanguage : utilise les valeurs exactes de la liste
- Si le texte mentionne une valeur hors liste, choisis la plus proche
- Retourne UNIQUEMENT le JSON, rien d'autre`;

const EXTRACT_AGENT_SYSTEM_PROMPT = `Tu es un assistant specialise dans la creation d'agents IA (GPT ChatGPT, Projet Claude, Gem Gemini).
L'utilisateur decrit librement l'agent qu'il veut creer. Tu dois extraire les champs structures selon la plateforme ciblee.

Selon la plateforme, retourne UNIQUEMENT un JSON valide avec ces champs :

Pour "claude" (Projet Claude) :
{
  "workingOn": "description du contexte de travail (Sur quoi travaillez-vous ?)",
  "tryingToDo": "objectif principal (Qu'essayez-vous de faire ?)",
  "instructions": "instructions detaillees et structurees pour le projet"
}

Pour "chatgpt" (GPT ChatGPT) :
{
  "name": "nom court et accrocheur pour le GPT",
  "description": "description concise (1-2 phrases) du GPT",
  "instructions": "instructions detaillees et structurees pour le GPT",
  "conversationStarters": ["amorce 1", "amorce 2", "amorce 3", "amorce 4"]
}

Pour "gemini" (Gem Gemini) :
{
  "name": "nom court et accrocheur pour le Gem",
  "description": "description concise (1-2 phrases) du Gem",
  "instructions": "instructions detaillees et structurees pour le Gem"
}

Regles :
- Genere des instructions RICHES et STRUCTUREES (utilise des sections, des listes, des regles claires)
- Les instructions doivent etre directement utilisables, pas un resume
- Pour les amorces de conversation (ChatGPT uniquement) : genere 4 phrases que l'utilisateur pourrait envoyer
- Si certaines infos ne sont pas explicites, deduis-les intelligemment du contexte
- Retourne UNIQUEMENT le JSON, rien d'autre`;

async function callAnthropic(apiKey, userMessage, systemPrompt) {
  const client = new Anthropic({ apiKey });
  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1024,
    temperature: 0,
    system: systemPrompt,
    messages: [{ role: 'user', content: userMessage }]
  });
  return {
    text: response.content[0].text.trim(),
    inputTokens: response.usage.input_tokens,
    outputTokens: response.usage.output_tokens,
    provider: 'anthropic'
  };
}

async function callOpenAI(apiKey, userMessage, systemPrompt) {
  const client = new OpenAI({ apiKey });
  const response = await client.chat.completions.create({
    model: 'gpt-4.1-mini',
    max_completion_tokens: 1024,
    temperature: 0,
    messages: [
      { role: 'system', content: systemPrompt },
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

function parseExtracted(rawText) {
  let text = rawText.trim();
  if (text.startsWith('```')) {
    text = text.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
  }
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

module.exports = async function handler(req, res) {
  const allowedOrigins = ['https://prompt-factory-chi.vercel.app', 'http://localhost:3000', 'http://localhost:5500', 'http://127.0.0.1:5500'];
  const origin = req.headers.origin;
  const corsOrigin = allowedOrigins.includes(origin) ? origin : allowedOrigins[0];
  res.setHeader('Access-Control-Allow-Origin', corsOrigin);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' });

  const { freeText, taskType, models, apiKey, openaiKey, mode, platform } = req.body;

  if (!freeText || (!apiKey && !openaiKey)) {
    return res.status(400).json({ message: 'Le texte libre et au moins une cle API sont requis.' });
  }

  // Choose system prompt and build user message based on mode
  let systemPrompt, userMessage;

  if (mode === 'agent' && platform) {
    systemPrompt = EXTRACT_AGENT_SYSTEM_PROMPT;
    const platformNames = { claude: 'Projet Claude', chatgpt: 'GPT ChatGPT', gemini: 'Gem Gemini' };
    userMessage = `Plateforme cible : ${platform} (${platformNames[platform] || platform})

Description libre de l'agent :
---
${freeText}
---

Extrais les champs structures pour la plateforme "${platform}" en JSON.`;
  } else {
    systemPrompt = EXTRACT_SYSTEM_PROMPT;
    userMessage = `Modeles cibles : ${(models || []).join(', ') || 'non precise'}
Type de tache choisi : ${taskType || 'non precise'}

Texte libre de l'utilisateur :
---
${freeText}
---

Extrais les informations structurees en JSON.`;
  }

  if (apiKey) {
    try {
      const result = await callAnthropic(apiKey, userMessage, systemPrompt);
      const extracted = parseExtracted(result.text);
      return res.status(200).json({
        extracted,
        inputTokens: result.inputTokens,
        outputTokens: result.outputTokens,
        provider: result.provider
      });
    } catch (error) {
      console.error('Anthropic error:', error.status, error.message);
      if (!openaiKey) return handleError(res, error, 'Anthropic');
    }
  }

  if (openaiKey) {
    try {
      const result = await callOpenAI(openaiKey, userMessage, systemPrompt);
      const extracted = parseExtracted(result.text);
      return res.status(200).json({
        extracted,
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
