const Anthropic = require('@anthropic-ai/sdk');

/**
 * System prompt for AI refinement - enriched with knowledge from ALL 5 prompt engineering skills:
 *
 * 1. prompt-ingenieur-roman: PTCF framework, 10 golden rules, XML for Claude
 * 2. prompt-engineering-patterns: Template architecture, few-shot strategies, optimization
 * 3. prompt-engineering-antigravity: Progressive Disclosure, Instruction Hierarchy, Error Recovery
 * 4. prompt-engineering-inference: Image/Video prompting (FLUX, SD, Veo), iterative refinement
 * 5. enhance-prompt: 4-step enhancement pipeline, UI/UX vocabulary, adjective palettes
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

## Regles de sortie
- Retourne UNIQUEMENT le prompt ameliore, sans commentaire ni explication
- Conserve la langue d'origine du prompt
- Ne change JAMAIS le sens ou l'intention - optimise la forme
- Si le prompt est deja excellent, ameliore des details subtils
- Pour les prompts image/video, enrichis le vocabulaire visuel et technique`;

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

  const { prompt, targetLLM, taskType, complexity, apiKey } = req.body;

  if (!prompt || !apiKey) {
    return res.status(400).json({ message: 'Les champs "prompt" et "apiKey" sont requis.' });
  }

  if (!apiKey.startsWith('sk-ant-')) {
    return res.status(400).json({ message: 'Cle API invalide. Elle doit commencer par "sk-ant-".' });
  }

  try {
    const client = new Anthropic({ apiKey });

    const userPrompt = `Modele cible : ${targetLLM || 'generique'}
Type de tache : ${taskType || 'non specifie'}
Niveau de complexite : ${complexity || 'basic'}

Prompt a optimiser :
---
${prompt}
---

Retourne UNIQUEMENT le prompt optimise, sans aucun commentaire.`;

    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      temperature: 0.3,
      system: REFINE_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userPrompt }]
    });

    const optimizedPrompt = response.content[0].text;

    return res.status(200).json({
      optimizedPrompt,
      model: 'claude-sonnet-4-6',
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens
    });

  } catch (error) {
    console.error('Refine error:', error.message);

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
