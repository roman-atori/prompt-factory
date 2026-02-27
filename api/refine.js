const Anthropic = require('@anthropic-ai/sdk');
const OpenAI = require('openai');

/**
 * System prompt for AI refinement - enriched with knowledge from ALL 5 prompt engineering skills
 */
const REFINE_SYSTEM_PROMPT = `Tu es un expert mondial en prompt engineering, maitrisant les techniques pour TOUS les types de modeles IA (LLMs, generateurs d'images, generateurs de videos).

## Pipeline d'optimisation en 4 etapes (enhance-prompt)
1. EVALUER : Identifier les elements manquants (contexte, exemples, format, contraintes)
2. ENRICHIR : Ajouter la specificite - remplacer les termes vagues par des actions concretes
3. STRUCTURER : Organiser hierarchiquement (donnees > instructions > format)
4. FORMATER : Adapter au modele cible

## 10 Regles d'or (prompt-ingenieur-roman)
1. Clarte > Exhaustivite : Court + clair bat long + vague
2. Montre, ne decris pas : Les exemples concrets sont plus efficaces
3. Explique le POURQUOI derriere chaque contrainte
4. Dis ce qu'il faut faire (positif > negatif)
5. Donnees en haut, question/instruction en bas
6. Remplace les termes vagues par des actions mesurables
7. Chaque instruction doit etre non-ambigue
8. Preserve la structure originale (XML, markdown, etc.)
9. Itere par petits changements a fort impact
10. Le test de clarte : si un collegue serait confus, le LLM le sera aussi

## Progressive Disclosure (antigravity)
- Basique : instructions simples et directes
- Intermediaire : ajout de contexte et precision
- Avance : hierarchie d'instructions + regles comportementales
- Expert : error recovery + niveaux de confiance + gestion d'ambiguite

## Optimisation par type de modele (inference)
- LLMs texte : [Role] + [Tache] + [Contraintes] + [Format]
- Images (FLUX/SD) : [Sujet detaille] + [Style] + [Composition] + [Eclairage] + [Qualite] + [Negative prompts]
- Videos (Veo) : [Type plan] + [Sujet + action] + [Decor] + [Style] + [Tempo]

## Template patterns (engineering-patterns)
- Few-shot : 3-5 exemples diversifies couvrant les cas limites
- Structured output : schema explicite avec champs obligatoires
- Chain-of-Thought : pour les taches complexes (math, code, analyse)

## Format de sortie OBLIGATOIRE
Retourne un JSON valide avec exactement 2 champs :
{
  "optimizedPrompt": "Le prompt ameliore complet ici",
  "notes": "3-5 bullet points expliquant les ameliorations cles apportees et pourquoi"
}

## Regles
- Conserve la langue d'origine du prompt
- Ne change JAMAIS le sens ou l'intention - optimise la forme
- Si le prompt est deja excellent, ameliore des details subtils
- Pour les prompts image/video, enrichis le vocabulaire visuel et technique
- Les notes doivent etre concises, en francais, format liste a puces markdown
- Retourne UNIQUEMENT le JSON, rien d'autre`;

const REFINE_AGENT_SYSTEM_PROMPT = `Tu es un expert en creation d'agents IA (GPT ChatGPT, Projet Claude, Gem Gemini).
Tu recois la configuration d'un agent et tu dois l'optimiser pour maximiser sa performance.

## Principes d'optimisation agent
1. **Instructions structurees** : Organise en sections claires (Role, Comportement, Regles, Format de reponse, Limites)
2. **Perimetre defini** : L'agent doit savoir exactement ce qu'il fait ET ce qu'il ne fait pas
3. **Ton et personnalite** : Definir comment l'agent communique
4. **Gestion des cas limites** : Comment reagir aux demandes hors perimetre
5. **Exemples implicites** : Integrer des patterns de reponse dans les instructions

## Format de sortie OBLIGATOIRE
Retourne un JSON valide avec exactement 2 champs :
{
  "optimizedPrompt": { /* memes champs que l'input mais optimises */ },
  "notes": "3-5 bullet points expliquant les ameliorations cles"
}

Le champ "optimizedPrompt" doit avoir la MEME STRUCTURE que l'input :
- Pour Claude : { "workingOn", "tryingToDo", "instructions" }
- Pour ChatGPT : { "name", "description", "instructions", "conversationStarters" }
- Pour Gemini : { "name", "description", "instructions" }

## Regles
- Conserve la langue d'origine
- Enrichis substantiellement les instructions (structure, regles, exemples de comportement)
- Ameliore le nom et la description pour etre plus accrocheur et precis
- Pour les amorces ChatGPT : genere des amorces pertinentes et variees
- Les notes doivent etre concises, en francais, format liste a puces markdown
- Retourne UNIQUEMENT le JSON, rien d'autre`;

async function callAnthropic(apiKey, systemPrompt, userMessage) {
  const client = new Anthropic({ apiKey });
  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 4096,
    temperature: 0.3,
    system: systemPrompt,
    messages: [{ role: 'user', content: userMessage }]
  });
  return {
    text: response.content[0].text,
    inputTokens: response.usage.input_tokens,
    outputTokens: response.usage.output_tokens,
    model: 'claude-sonnet-4-6',
    provider: 'anthropic'
  };
}

async function callOpenAI(apiKey, systemPrompt, userMessage) {
  const client = new OpenAI({ apiKey });
  const response = await client.chat.completions.create({
    model: 'gpt-5.2',
    max_completion_tokens: 4096,
    temperature: 0.3,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage }
    ]
  });
  return {
    text: response.choices[0].message.content,
    inputTokens: response.usage.prompt_tokens,
    outputTokens: response.usage.completion_tokens,
    model: 'gpt-5.2',
    provider: 'openai'
  };
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

  const { prompt, targetLLM, taskType, complexity, apiKey, openaiKey, mode, platform, agentData } = req.body;

  if (!prompt || (!apiKey && !openaiKey)) {
    return res.status(400).json({ message: 'Le prompt et au moins une cle API sont requis.' });
  }

  // Choose system prompt and build user message based on mode
  let systemPrompt, userPrompt;

  if (mode === 'agent' && platform) {
    systemPrompt = REFINE_AGENT_SYSTEM_PROMPT;
    const platformNames = { claude: 'Projet Claude', chatgpt: 'GPT ChatGPT', gemini: 'Gem Gemini' };
    userPrompt = `Plateforme : ${platform} (${platformNames[platform] || platform})

Configuration actuelle de l'agent :
---
${JSON.stringify(agentData, null, 2)}
---

Optimise cette configuration et retourne le JSON avec optimizedPrompt (meme structure) et notes.`;
  } else {
    systemPrompt = REFINE_SYSTEM_PROMPT;
    userPrompt = `Modele cible : ${targetLLM || 'generique'}
Type de tache : ${taskType || 'non specifie'}
Niveau de complexite : ${complexity || 'basic'}

Prompt a optimiser :
---
${prompt}
---

Retourne le JSON avec optimizedPrompt et notes.`;
  }

  function parseResult(rawText) {
    let text = rawText.trim();
    if (text.startsWith('```')) {
      text = text.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
    }
    try {
      const parsed = JSON.parse(text);
      return { optimizedPrompt: parsed.optimizedPrompt || text, notes: parsed.notes || '' };
    } catch {
      return { optimizedPrompt: text, notes: '' };
    }
  }

  // Try Anthropic first
  if (apiKey) {
    try {
      const result = await callAnthropic(apiKey, systemPrompt, userPrompt);
      const parsed = parseResult(result.text);
      return res.status(200).json({
        optimizedPrompt: parsed.optimizedPrompt,
        notes: parsed.notes,
        model: result.model,
        inputTokens: result.inputTokens,
        outputTokens: result.outputTokens,
        provider: result.provider
      });
    } catch (error) {
      console.error('Anthropic error:', error.status, error.message);
      if (!openaiKey) {
        return handleError(res, error, 'Anthropic');
      }
      console.log('Anthropic indisponible, basculement sur OpenAI...');
    }
  }

  // Fallback to OpenAI
  if (openaiKey) {
    try {
      const result = await callOpenAI(openaiKey, systemPrompt, userPrompt);
      const parsed = parseResult(result.text);
      return res.status(200).json({
        optimizedPrompt: parsed.optimizedPrompt,
        notes: parsed.notes,
        model: result.model,
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
