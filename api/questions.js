const Anthropic = require('@anthropic-ai/sdk');

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

module.exports = async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { formData, apiKey } = req.body;

  if (!formData || !apiKey) {
    return res.status(400).json({ message: 'Les champs "formData" et "apiKey" sont requis.' });
  }

  if (!apiKey.startsWith('sk-ant-')) {
    return res.status(400).json({ message: 'Cle API invalide. Elle doit commencer par "sk-ant-".' });
  }

  try {
    const client = new Anthropic({ apiKey });

    // Build a concise summary of form data for the AI
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

    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      temperature: 0.5,
      system: QUESTIONS_SYSTEM_PROMPT,
      messages: [{
        role: 'user',
        content: `Donnees du formulaire :\n${JSON.stringify(summary, null, 2)}\n\nGenere les questions d'optimisation en JSON.`
      }]
    });

    const rawText = response.content[0].text.trim();

    // Parse JSON - handle potential markdown code blocks
    let jsonText = rawText;
    if (jsonText.startsWith('```')) {
      jsonText = jsonText.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
    }

    let questions;
    try {
      questions = JSON.parse(jsonText);
    } catch {
      // If JSON parsing fails, return a fallback
      questions = [
        { id: 'q1', question: 'Pouvez-vous donner un exemple concret du resultat attendu ?', placeholder: 'Decrivez un exemple...', type: 'textarea' },
        { id: 'q2', question: 'Y a-t-il des erreurs courantes que le LLM devrait eviter ?', placeholder: 'Ex: Ne pas inventer de sources...', type: 'text' },
        { id: 'q3', question: 'Quelle est la longueur ideale de la reponse ?', placeholder: 'Ex: 200-300 mots', type: 'text' }
      ];
    }

    return res.status(200).json({
      questions,
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens
    });

  } catch (error) {
    console.error('Questions error:', error.message);

    if (error.status === 401) {
      return res.status(401).json({ message: 'Cle API invalide ou expiree.' });
    }
    if (error.status === 429) {
      return res.status(429).json({ message: 'Trop de requetes. Reessayez dans quelques secondes.' });
    }
    if (error.status >= 500) {
      return res.status(502).json({ message: 'Erreur serveur Anthropic. Reessayez.' });
    }

    return res.status(500).json({ message: 'Erreur interne : ' + error.message });
  }
};
