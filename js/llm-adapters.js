/**
 * LLM-Specific Prompt Adapters
 * Transforms a generic PTCF prompt into LLM-optimized versions.
 *
 * Sources from 5 prompt engineering skills:
 * - prompt-ingenieur-roman: PTCF, XML Claude, LLM-specific patterns
 * - prompt-engineering-patterns: Template architecture, few-shot strategies
 * - prompt-engineering-antigravity: Progressive Disclosure, Instruction Hierarchy
 * - prompt-engineering-inference: Image (FLUX/SD/Nano Banana), Video (Veo) prompting
 * - enhance-prompt: 4-step enhancement pipeline, UI/UX vocabulary
 */
const LLMAdapters = {

  // --- Text LLM configs ---
  config: {
    claude: {
      name: 'Claude',
      icon: 'img/logos/claude.png',
      description: 'Anthropic - XML structure, données en haut',
      category: 'text'
    },
    chatgpt: {
      name: 'ChatGPT',
      icon: 'img/logos/chatgpt.png',
      description: 'OpenAI - Developer role, strict mode',
      category: 'text'
    },
    gemini: {
      name: 'Gemini',
      icon: 'img/logos/gemini.png',
      description: 'Google - Anchor context, grounding',
      category: 'text'
    },
    perplexity: {
      name: 'Perplexity',
      icon: 'img/logos/perplexity.png',
      description: 'Search-first, zero-shot',
      category: 'text'
    },
    notebooklm: {
      name: 'NotebookLM',
      icon: 'img/logos/notebooklm.png',
      description: 'Google - Sources-first, synthese, podcast',
      category: 'text'
    },
    mistral: {
      name: 'Mistral',
      icon: 'img/logos/mistral.png',
      description: 'Mistral AI - Structured output, multilingual',
      category: 'text'
    },
    deepseek: {
      name: 'DeepSeek',
      icon: 'img/logos/deepseek.png',
      description: 'DeepSeek - Raisonnement profond, code, maths',
      category: 'text'
    },
    grok: {
      name: 'Grok',
      icon: 'img/logos/grok.png',
      description: 'xAI - Infos temps reel, style direct',
      category: 'text'
    }
  },

  // --- Image model configs ---
  imageConfig: {
    flux: {
      name: 'FLUX',
      icon: 'img/logos/flux.png',
      description: 'Image - Sujets détaillés, style, negative prompts',
      category: 'image'
    },
    'stable-diffusion': {
      name: 'Stable Diffusion',
      icon: 'img/logos/stable-diffusion.png',
      description: 'Image - Quality keywords, composition, lighting',
      category: 'image'
    },
    'nano-banana': {
      name: 'Nano Banana',
      icon: 'img/logos/nano-banana.png',
      description: 'Google - Text rendering, thinking, search grounding',
      category: 'image'
    },
    'dall-e': {
      name: 'DALL-E 3',
      icon: 'img/logos/dall-e.png',
      description: 'OpenAI - Langage naturel, pas de poids/negatif',
      category: 'image'
    },
    midjourney: {
      name: 'Midjourney',
      icon: 'img/logos/midjourney.png',
      description: 'Style artistique, parametres --ar --v --s',
      category: 'image'
    },
    ideogram: {
      name: 'Ideogram',
      icon: 'img/logos/ideogram.png',
      description: 'Meilleur rendu texte, typographie, logos',
      category: 'image'
    }
  },

  // --- Video model configs ---
  videoConfig: {
    veo: {
      name: 'Veo (Google)',
      icon: 'img/logos/veo.png',
      description: 'Video - Camera movement, cinematique, tempo',
      category: 'video'
    },
    runway: {
      name: 'Runway Gen-3',
      icon: 'img/logos/runway.png',
      description: 'Video - Motion brush, camera controls',
      category: 'video'
    },
    sora: {
      name: 'Sora',
      icon: 'img/logos/sora.png',
      description: 'OpenAI - Cinematique, descriptions naturelles',
      category: 'video'
    },
    kling: {
      name: 'Kling',
      icon: 'img/logos/kling.png',
      description: 'Kuaishou - Motion fluide, haute fidelite',
      category: 'video'
    }
  },

  // --- Vibe Coding configs ---
  vibeConfig: {
    'claude-code': {
      name: 'Claude Code',
      icon: 'img/logos/claude-code.png',
      description: 'Vibe Coding - Prompts pour agent IA en CLI',
      category: 'vibe'
    },
    cursor: {
      name: 'Cursor',
      icon: 'img/logos/cursor.png',
      description: 'AI-first editor - .cursorrules, @-mentions',
      category: 'vibe'
    },
    windsurf: {
      name: 'Windsurf',
      icon: 'img/logos/windsurf.png',
      description: 'Codeium - Cascade flows, .windsurfrules',
      category: 'vibe'
    },
    copilot: {
      name: 'GitHub Copilot',
      icon: 'img/logos/copilot.png',
      description: 'GitHub - Inline completions, chat, /commands',
      category: 'vibe'
    }
  },

  /**
   * Main entry - adapt a prompt for a target model
   */
  adapt(promptData, targetModel) {
    switch (targetModel) {
      case 'claude': return this.formatForClaude(promptData);
      case 'chatgpt': return this.formatForChatGPT(promptData);
      case 'gemini': return this.formatForGemini(promptData);
      case 'perplexity': return this.formatForPerplexity(promptData);
      case 'notebooklm': return this.formatForNotebookLM(promptData);
      case 'mistral': return this.formatForMistral(promptData);
      case 'deepseek': return this.formatForDeepSeek(promptData);
      case 'grok': return this.formatForGrok(promptData);
      case 'flux': return this.formatForFLUX(promptData);
      case 'stable-diffusion': return this.formatForStableDiffusion(promptData);
      case 'nano-banana': return this.formatForNanoBanana(promptData);
      case 'dall-e': return this.formatForDallE(promptData);
      case 'midjourney': return this.formatForMidjourney(promptData);
      case 'ideogram': return this.formatForIdeogram(promptData);
      case 'veo': return this.formatForVeo(promptData);
      case 'runway': return this.formatForRunway(promptData);
      case 'sora': return this.formatForSora(promptData);
      case 'kling': return this.formatForKling(promptData);
      case 'claude-code': return this.formatForClaudeCode(promptData);
      case 'cursor': return this.formatForCursor(promptData);
      case 'windsurf': return this.formatForWindsurf(promptData);
      case 'copilot': return this.formatForCopilot(promptData);
      default: return this.formatGeneric(promptData);
    }
  },

  // ===================================================================
  // TEXT LLMs
  // ===================================================================

  formatForClaude(data) {
    let systemPrompt = data.persona;

    if (data.raw.complexity === 'advanced' || data.raw.complexity === 'expert') {
      systemPrompt += '\n\nInstruction Hierarchy (priorite decroissante) :\n';
      systemPrompt += '1. Contraintes de securite et de format (toujours respecter)\n';
      systemPrompt += '2. Instructions de la tache principale\n';
      systemPrompt += '3. Preferences stylistiques et tonales\n';
      systemPrompt += '4. Optimisations secondaires';
    }

    let userPrompt = '';

    userPrompt += '<context>\n';
    if (data.raw.domain) userPrompt += `  <domain>${data.raw.domain}</domain>\n`;
    if (data.raw.audience) userPrompt += `  <audience>${this._audienceLabel(data.raw.audience)}</audience>\n`;
    if (data.raw.tone) userPrompt += `  <tone>${data.raw.tone}</tone>\n`;
    if (data.raw.outputLanguage) userPrompt += `  <langue>${data.raw.outputLanguage}</langue>\n`;
    userPrompt += '</context>\n\n';

    if (data.examples && data.examples.length > 0) {
      userPrompt += '<examples>\n';
      data.examples.forEach((ex) => {
        userPrompt += `  <example>\n`;
        userPrompt += `    <input>${ex.input}</input>\n`;
        userPrompt += `    <output>${ex.output}</output>\n`;
        userPrompt += `  </example>\n`;
      });
      userPrompt += '</examples>\n\n';
    }

    if (data.raw.inputDescription) {
      userPrompt += `<input_description>\n${data.raw.inputDescription}\n</input_description>\n\n`;
    }

    if (data.chainOfThought) {
      userPrompt += '<instructions>\nRaisonne etape par etape dans des balises <thinking> avant de fournir ta reponse finale.\n</instructions>\n\n';
    }

    // Inject smart answers if available
    if (data.raw.smartAnswers && data.raw.smartAnswers.length > 0) {
      userPrompt += '<optimization_context>\n';
      data.raw.smartAnswers.forEach(qa => {
        userPrompt += `  <detail>\n    <question>${qa.question}</question>\n    <answer>${qa.answer}</answer>\n  </detail>\n`;
      });
      userPrompt += '</optimization_context>\n\n';
    }

    userPrompt += `<task>\n${data.task}\n</task>\n\n`;

    if (data.raw.constraints) {
      userPrompt += `<constraints>\n${data.raw.constraints}\n</constraints>\n\n`;
    }

    if (data.raw.complexity === 'expert') {
      userPrompt += `<error_recovery>\nSi tu n'es pas certain d'une reponse, indique ton niveau de confiance et propose des alternatives.\nSi les instructions semblent contradictoires, signale l'ambiguite avant de repondre.\n</error_recovery>\n\n`;
    }

    userPrompt += `<output_format>\n${data.format}\n</output_format>`;

    const notes = [
      'Conseil : Placez le system prompt dans le champ "System" de l\'API Claude.',
      'Le prompt caching est recommande pour le system prompt (90% de reduction de cout).',
      'Les balises XML permettent a Claude de mieux structurer sa comprehension.',
    ];
    if (data.raw.complexity === 'expert') {
      notes.push('Niveau expert : Instruction Hierarchy + Error Recovery actives.');
    }

    return { systemPrompt, userPrompt, notes };
  },

  formatForChatGPT(data) {
    let systemPrompt = '';
    systemPrompt += data.persona + '\n\n';

    systemPrompt += 'Regles :\n';
    if (data.raw.tone) systemPrompt += `- Ton : ${data.raw.tone}\n`;
    if (data.raw.audience) systemPrompt += `- Public cible : ${this._audienceLabel(data.raw.audience)}\n`;
    if (data.raw.outputLanguage) systemPrompt += `- Langue de reponse : ${data.raw.outputLanguage}\n`;
    systemPrompt += `- Format de sortie : ${data.format}\n`;
    if (data.raw.constraints) {
      systemPrompt += `- ${data.raw.constraints.split('\n').join('\n- ')}\n`;
    }

    const complexTasks = ['code', 'analyse', 'agent', 'classification'];
    if (complexTasks.includes(data.raw.taskType)) {
      systemPrompt += '\nControle de verbosity :\n';
      systemPrompt += '- Ne fournir que les elements demandes.\n';
      systemPrompt += '- Ne pas s\'etendre au-dela du scope de la question.\n';
    }

    if (data.raw.complexity === 'expert') {
      systemPrompt += '\nGestion des erreurs :\n';
      systemPrompt += '- Si l\'input est ambigu, demande une clarification avant de repondre.\n';
      systemPrompt += '- Indique ton niveau de confiance (eleve/moyen/faible) pour chaque reponse.\n';
    }

    let userPrompt = '';

    if (data.raw.domain) {
      userPrompt += `Domaine : ${data.raw.domain}\n\n`;
    }

    if (data.examples && data.examples.length > 0) {
      userPrompt += 'Exemples :\n\n';
      data.examples.forEach((ex, i) => {
        userPrompt += `Exemple ${i + 1} :\n`;
        userPrompt += `Input : ${ex.input}\n`;
        userPrompt += `Output : ${ex.output}\n\n`;
      });
    }

    if (data.raw.inputDescription) {
      userPrompt += `Donnees d'entree : ${data.raw.inputDescription}\n\n`;
    }

    if (data.raw.smartAnswers && data.raw.smartAnswers.length > 0) {
      userPrompt += 'Contexte supplementaire :\n';
      data.raw.smartAnswers.forEach(qa => {
        userPrompt += `- ${qa.question} : ${qa.answer}\n`;
      });
      userPrompt += '\n';
    }

    if (data.chainOfThought) {
      userPrompt += 'Reflechis etape par etape avant de repondre.\n\n';
    }
    userPrompt += data.task;

    const notes = [
      'Conseil : Utilisez le role "developer" (pas "system") dans l\'API GPT.',
      'Pour du JSON, activez "strict: true" dans response_format.',
      'Evitez le personality padding ("prends une grande respiration") - bruit inutile.',
      'Pour les taches complexes, utilisez reasoning_effort: "high".'
    ];

    return { systemPrompt, userPrompt, notes };
  },

  formatForGemini(data) {
    let systemPrompt = data.persona;

    let userPrompt = '';

    if (data.raw.domain) userPrompt += `Domaine : ${data.raw.domain}\n`;
    if (data.raw.audience) userPrompt += `Public cible : ${this._audienceLabel(data.raw.audience)}\n`;
    if (data.raw.outputLanguage) userPrompt += `Langue : ${data.raw.outputLanguage}\n`;
    if (data.raw.tone) userPrompt += `Ton : ${data.raw.tone}\n`;
    userPrompt += '\n';

    if (data.examples && data.examples.length > 0) {
      userPrompt += 'Exemples de reference :\n\n';
      data.examples.forEach((ex, i) => {
        userPrompt += `Exemple ${i + 1} :\n`;
        userPrompt += `  Entree : ${ex.input}\n`;
        userPrompt += `  Sortie : ${ex.output}\n\n`;
      });
    }

    if (data.raw.inputDescription) {
      userPrompt += `Donnees d'entree fournies : ${data.raw.inputDescription}\n\n`;
    }

    if (data.raw.smartAnswers && data.raw.smartAnswers.length > 0) {
      userPrompt += 'Details supplementaires :\n';
      data.raw.smartAnswers.forEach(qa => {
        userPrompt += `- ${qa.question} : ${qa.answer}\n`;
      });
      userPrompt += '\n';
    }

    const factualTasks = ['analyse', 'extraction', 'classification', 'qa-rag'];
    if (factualTasks.includes(data.raw.taskType)) {
      userPrompt += 'IMPORTANT : Reponds UNIQUEMENT sur la base des informations fournies. Ne recours pas a tes connaissances pre-entrainees.\n\n';
    }

    if (data.chainOfThought) {
      userPrompt += 'Detaille ton raisonnement etape par etape avant de fournir ta reponse finale.\n\n';
    }

    userPrompt += `D'apres le contexte fourni ci-dessus, execute la tache suivante :\n\n`;
    userPrompt += data.task + '\n\n';

    if (data.raw.constraints) {
      userPrompt += `Contraintes : ${data.raw.constraints}\n\n`;
    }
    userPrompt += `Format de reponse attendu : ${data.format}`;

    const notes = [
      'Conseil : temperature 0 pour extraction/classification, 1.0 pour creativite.',
      'Activez thinking_level: HIGH pour le raisonnement complexe.',
      'Verbes d\'action positifs > instructions negatives avec Gemini.'
    ];

    return { systemPrompt, userPrompt, notes };
  },

  formatForPerplexity(data) {
    let systemPrompt = '';
    systemPrompt += data.persona + '\n\n';
    systemPrompt += 'Instructions de restitution :\n';
    systemPrompt += `- Langue : ${data.raw.outputLanguage || 'francais'}\n`;
    systemPrompt += `- Format : ${data.format}\n`;
    if (data.raw.tone) systemPrompt += `- Ton : ${data.raw.tone}\n`;
    if (data.raw.audience) systemPrompt += `- Public : ${this._audienceLabel(data.raw.audience)}\n`;
    if (data.raw.constraints) {
      systemPrompt += `- ${data.raw.constraints.split('\n').join('\n- ')}\n`;
    }

    let userPrompt = '';
    if (data.raw.domain) userPrompt += `[${data.raw.domain}] `;
    userPrompt += data.task;
    if (data.raw.inputDescription) {
      userPrompt += `\n\nContexte supplementaire : ${data.raw.inputDescription}`;
    }

    if (data.raw.smartAnswers && data.raw.smartAnswers.length > 0) {
      userPrompt += '\n\nDetails additionnels :\n';
      data.raw.smartAnswers.forEach(qa => {
        userPrompt += `- ${qa.answer}\n`;
      });
    }

    // Transform few-shot examples into contextual descriptions (not raw examples)
    if (data.examples && data.examples.length > 0) {
      userPrompt += '\n\nPour reference, voici le type de resultat attendu :\n';
      data.examples.forEach((ex, i) => {
        userPrompt += `- Pour "${ex.input}", le resultat ideal serait : "${ex.output}"\n`;
      });
    }

    const notes = [
      'Conseil : Les parametres API sont plus efficaces que les instructions texte.',
      'Parametres recommandes : search_domain_filter, search_context_size: "large".',
      'Ne demandez JAMAIS d\'inclure des URLs dans la reponse textuelle.',
      'Les exemples few-shot ont ete transformes en descriptions contextuelles pour Perplexity.'
    ];

    return { systemPrompt, userPrompt, notes };
  },

  formatForNotebookLM(data) {
    // NotebookLM n'a pas de system prompt configurable.
    // On genere une "Note de guidage" a coller dans l'interface.
    let systemPrompt = 'Note de guidage pour NotebookLM (a coller comme Note)';

    let userPrompt = '';
    userPrompt += `OBJECTIF : ${data.task}\n\n`;

    if (data.raw.domain) userPrompt += `DOMAINE : ${data.raw.domain}\n`;
    if (data.raw.audience) userPrompt += `PUBLIC CIBLE : ${this._audienceLabel(data.raw.audience)}\n`;
    if (data.raw.outputLanguage) userPrompt += `LANGUE : ${data.raw.outputLanguage}\n`;
    if (data.raw.tone) userPrompt += `TON : ${data.raw.tone}\n`;
    userPrompt += `FORMAT : ${data.format}\n\n`;

    userPrompt += 'CONSIGNES :\n';
    userPrompt += '- Base tes reponses UNIQUEMENT sur les sources uploadees\n';
    userPrompt += '- Cite les passages pertinents des sources\n';
    userPrompt += '- Synthetise les informations de maniere structuree\n';
    if (data.raw.constraints) {
      data.raw.constraints.split('\n').forEach(c => { userPrompt += `- ${c}\n`; });
    }

    if (data.raw.inputDescription) {
      userPrompt += `\nSOURCES A UPLOADER :\n${data.raw.inputDescription}\n`;
    }

    if (data.raw.smartAnswers && data.raw.smartAnswers.length > 0) {
      userPrompt += '\nPRECISIONS :\n';
      data.raw.smartAnswers.forEach(qa => { userPrompt += `- ${qa.answer}\n`; });
    }

    if (data.examples && data.examples.length > 0) {
      userPrompt += '\nEXEMPLES ATTENDUS :\n';
      data.examples.forEach((ex, i) => {
        userPrompt += `Exemple ${i + 1} : ${ex.input} -> ${ex.output}\n`;
      });
    }

    const notes = [
      'Collez ce texte comme "Note" dans NotebookLM (pas dans le chat).',
      'Uploadez d\'abord vos sources (PDF, sites web, textes) dans le notebook.',
      'NotebookLM repondra en se basant uniquement sur vos sources.',
      'Pour un Audio Overview (podcast), ajoutez des instructions de personnalisation dans les parametres audio.'
    ];

    return { systemPrompt, userPrompt, notes };
  },

  formatForMistral(data) {
    let systemPrompt = data.persona + '\n\n';
    systemPrompt += 'Instructions :\n';
    if (data.raw.tone) systemPrompt += `- Ton : ${data.raw.tone}\n`;
    if (data.raw.audience) systemPrompt += `- Public : ${this._audienceLabel(data.raw.audience)}\n`;
    if (data.raw.outputLanguage) systemPrompt += `- Langue : ${data.raw.outputLanguage}\n`;
    systemPrompt += `- Format : ${data.format}\n`;
    if (data.raw.constraints) {
      systemPrompt += data.raw.constraints.split('\n').map(c => `- ${c}`).join('\n') + '\n';
    }

    let userPrompt = '';
    if (data.raw.domain) userPrompt += `[${data.raw.domain}] `;

    if (data.examples && data.examples.length > 0) {
      userPrompt += 'Exemples :\n';
      data.examples.forEach((ex, i) => {
        userPrompt += `${i + 1}. Input : ${ex.input}\n   Output : ${ex.output}\n`;
      });
      userPrompt += '\n';
    }

    if (data.raw.inputDescription) {
      userPrompt += `Donnees d'entree : ${data.raw.inputDescription}\n\n`;
    }

    if (data.raw.smartAnswers && data.raw.smartAnswers.length > 0) {
      userPrompt += 'Contexte :\n';
      data.raw.smartAnswers.forEach(qa => { userPrompt += `- ${qa.question} : ${qa.answer}\n`; });
      userPrompt += '\n';
    }

    if (data.chainOfThought) userPrompt += 'Reflechis etape par etape.\n\n';
    userPrompt += data.task;

    const notes = [
      'Mistral supporte nativement le JSON mode via response_format.',
      'Conseil : temperature 0 pour extraction/classification, 0.7 pour creativite.',
      'Mistral excelle sur les taches multilingues et le structured output.',
      'Le function calling de Mistral est compatible OpenAI SDK.'
    ];

    return { systemPrompt, userPrompt, notes };
  },

  formatForDeepSeek(data) {
    let systemPrompt = data.persona;

    if (data.raw.complexity === 'advanced' || data.raw.complexity === 'expert') {
      systemPrompt += '\n\nPrincipes :\n';
      systemPrompt += '- Decompose les problemes complexes en sous-etapes\n';
      systemPrompt += '- Montre ton raisonnement avant la reponse finale\n';
      systemPrompt += '- Indique ton niveau de confiance\n';
    }

    let userPrompt = '';

    if (data.raw.domain) userPrompt += `Domaine : ${data.raw.domain}\n`;
    if (data.raw.audience) userPrompt += `Public : ${this._audienceLabel(data.raw.audience)}\n`;
    if (data.raw.outputLanguage) userPrompt += `Langue : ${data.raw.outputLanguage}\n`;
    if (data.raw.tone) userPrompt += `Ton : ${data.raw.tone}\n`;
    if (userPrompt) userPrompt += '\n';

    if (data.examples && data.examples.length > 0) {
      userPrompt += 'Exemples :\n';
      data.examples.forEach((ex, i) => {
        userPrompt += `Exemple ${i + 1} :\nEntree : ${ex.input}\nSortie : ${ex.output}\n\n`;
      });
    }

    if (data.raw.inputDescription) {
      userPrompt += `Donnees d'entree : ${data.raw.inputDescription}\n\n`;
    }

    if (data.raw.smartAnswers && data.raw.smartAnswers.length > 0) {
      userPrompt += 'Details supplementaires :\n';
      data.raw.smartAnswers.forEach(qa => { userPrompt += `- ${qa.question} : ${qa.answer}\n`; });
      userPrompt += '\n';
    }

    if (data.chainOfThought) {
      userPrompt += 'Reflechis en profondeur etape par etape dans des balises <think> avant ta reponse finale.\n\n';
    }

    userPrompt += data.task + '\n\n';
    if (data.raw.constraints) userPrompt += `Contraintes : ${data.raw.constraints}\n\n`;
    userPrompt += `Format attendu : ${data.format}`;

    const notes = [
      'DeepSeek R1 excelle en raisonnement mathematique et en code.',
      'Activez le mode "Deep Think" pour les taches de logique complexe.',
      'Les balises <think> permettent de voir le raisonnement interne du modele.',
      'Conseil : temperature 0 pour le code, 0.6 pour la redaction.'
    ];

    return { systemPrompt, userPrompt, notes };
  },

  formatForGrok(data) {
    let systemPrompt = data.persona + '\n\n';
    systemPrompt += 'Style de reponse :\n';
    if (data.raw.tone) systemPrompt += `- Ton : ${data.raw.tone}\n`;
    if (data.raw.audience) systemPrompt += `- Public : ${this._audienceLabel(data.raw.audience)}\n`;
    if (data.raw.outputLanguage) systemPrompt += `- Langue : ${data.raw.outputLanguage}\n`;
    systemPrompt += `- Format : ${data.format}\n`;
    if (data.raw.constraints) {
      systemPrompt += data.raw.constraints.split('\n').map(c => `- ${c}`).join('\n') + '\n';
    }

    let userPrompt = '';
    if (data.raw.domain) userPrompt += `Contexte : ${data.raw.domain}\n\n`;

    if (data.examples && data.examples.length > 0) {
      userPrompt += 'Exemples de reference :\n';
      data.examples.forEach((ex, i) => {
        userPrompt += `${i + 1}. "${ex.input}" -> "${ex.output}"\n`;
      });
      userPrompt += '\n';
    }

    if (data.raw.inputDescription) {
      userPrompt += `Input : ${data.raw.inputDescription}\n\n`;
    }

    if (data.raw.smartAnswers && data.raw.smartAnswers.length > 0) {
      data.raw.smartAnswers.forEach(qa => { userPrompt += `${qa.question} : ${qa.answer}\n`; });
      userPrompt += '\n';
    }

    if (data.chainOfThought) userPrompt += 'Raisonne etape par etape.\n\n';
    userPrompt += data.task;

    const notes = [
      'Grok a acces aux informations en temps reel via X/Twitter.',
      'Le style par defaut est direct et concis - parfait pour les reponses factuelles.',
      'Conseil : Grok excelle pour les sujets d\'actualite et les tendances.',
      'Supporte le mode "Fun" pour un ton plus decontracte.'
    ];

    return { systemPrompt, userPrompt, notes };
  },

  // ===================================================================
  // VIBE CODING
  // ===================================================================

  formatForClaudeCode(data) {
    let systemPrompt = data.persona;

    systemPrompt += '\n\nTu travailles dans Claude Code (CLI). Principes :';
    systemPrompt += '\n- Lis le code existant avant toute modification';
    systemPrompt += '\n- Fais des changements minimaux et cibles';
    systemPrompt += '\n- Teste apres implementation';
    systemPrompt += '\n- Explique tes decisions architecturales';

    if (data.raw.complexity === 'advanced' || data.raw.complexity === 'expert') {
      systemPrompt += '\n- Utilise les sub-agents pour les taches paralleles';
      systemPrompt += '\n- Privilege les edits atomiques (Edit > Write)';
      systemPrompt += '\n- Planifie avec /plan avant execution';
    }

    let userPrompt = '';

    if (data.raw.domain) userPrompt += `Projet : ${data.raw.domain}\n`;
    if (data.raw.audience) userPrompt += `Utilisateurs : ${this._audienceLabel(data.raw.audience)}\n`;
    if (data.raw.outputLanguage) userPrompt += `Langue : ${data.raw.outputLanguage}\n`;
    userPrompt += '\n';

    if (data.raw.inputDescription) {
      userPrompt += `## Contexte\n${data.raw.inputDescription}\n\n`;
    }

    if (data.examples && data.examples.length > 0) {
      userPrompt += '## Exemples\n\n';
      data.examples.forEach((ex, i) => {
        userPrompt += `**Exemple ${i + 1} :**\n`;
        userPrompt += `Input : ${ex.input}\n`;
        userPrompt += `Output : ${ex.output}\n\n`;
      });
    }

    if (data.raw.smartAnswers && data.raw.smartAnswers.length > 0) {
      userPrompt += '## Contexte supplementaire\n';
      data.raw.smartAnswers.forEach(qa => {
        userPrompt += `- ${qa.question} : ${qa.answer}\n`;
      });
      userPrompt += '\n';
    }

    if (data.chainOfThought) {
      userPrompt += 'Reflechis etape par etape. Planifie avant de coder.\n\n';
    }

    userPrompt += `## Tache\n${data.task}\n\n`;

    if (data.raw.constraints) {
      userPrompt += `## Contraintes\n${data.raw.constraints}\n\n`;
    }

    userPrompt += `## Format attendu\n${data.format}`;

    const notes = [
      'Copiez ce prompt dans Claude Code CLI ou dans un fichier CLAUDE.md.',
      'Claude Code lit le code source avant modification - fournissez les chemins de fichiers.',
      'Pour les taches complexes, utilisez /plan pour generer un plan avant execution.',
      'Les sub-agents (Task tool) parallelisent les recherches de code.'
    ];

    return { systemPrompt, userPrompt, notes };
  },

  formatForCursor(data) {
    let systemPrompt = data.persona;
    systemPrompt += '\n\nTu travailles dans Cursor (AI-first code editor). Principes :';
    systemPrompt += '\n- Utilise @file et @folder pour referencer le contexte';
    systemPrompt += '\n- Fais des modifications ciblees et minimales';
    systemPrompt += '\n- Explique les changements avant de les appliquer';
    if (data.raw.complexity === 'advanced' || data.raw.complexity === 'expert') {
      systemPrompt += '\n- Utilise Composer pour les modifications multi-fichiers';
      systemPrompt += '\n- Verifie les imports et les dependances apres modification';
    }

    let userPrompt = '';
    if (data.raw.domain) userPrompt += `Projet : ${data.raw.domain}\n`;
    if (data.raw.audience) userPrompt += `Utilisateurs : ${this._audienceLabel(data.raw.audience)}\n`;
    if (data.raw.outputLanguage) userPrompt += `Langue : ${data.raw.outputLanguage}\n\n`;

    if (data.raw.inputDescription) userPrompt += `## Contexte\n${data.raw.inputDescription}\n\n`;

    if (data.examples && data.examples.length > 0) {
      userPrompt += '## Exemples\n';
      data.examples.forEach((ex, i) => { userPrompt += `${i + 1}. ${ex.input} -> ${ex.output}\n`; });
      userPrompt += '\n';
    }

    if (data.raw.smartAnswers && data.raw.smartAnswers.length > 0) {
      userPrompt += '## Details\n';
      data.raw.smartAnswers.forEach(qa => { userPrompt += `- ${qa.question} : ${qa.answer}\n`; });
      userPrompt += '\n';
    }

    if (data.chainOfThought) userPrompt += 'Reflechis etape par etape. Planifie avant de coder.\n\n';
    userPrompt += `## Tache\n${data.task}\n\n`;
    if (data.raw.constraints) userPrompt += `## Contraintes\n${data.raw.constraints}\n\n`;
    userPrompt += `## Format\n${data.format}`;

    const notes = [
      'Utilisez ce prompt dans le chat Cursor (Cmd+L) ou Composer (Cmd+I).',
      'Referencez les fichiers avec @file pour donner du contexte.',
      'Ajoutez des .cursorrules a la racine du projet pour des instructions persistantes.',
      'Composer est ideal pour les modifications multi-fichiers coordonnees.'
    ];

    return { systemPrompt, userPrompt, notes };
  },

  formatForWindsurf(data) {
    let systemPrompt = data.persona;
    systemPrompt += '\n\nTu travailles dans Windsurf (Codeium). Principes :';
    systemPrompt += '\n- Utilise les Cascade flows pour les taches multi-etapes';
    systemPrompt += '\n- Respecte l\'architecture existante du projet';
    systemPrompt += '\n- Valide les changements etape par etape';

    let userPrompt = '';
    if (data.raw.domain) userPrompt += `Projet : ${data.raw.domain}\n`;
    if (data.raw.outputLanguage) userPrompt += `Langue : ${data.raw.outputLanguage}\n\n`;

    if (data.raw.inputDescription) userPrompt += `Contexte : ${data.raw.inputDescription}\n\n`;

    if (data.examples && data.examples.length > 0) {
      userPrompt += 'Exemples :\n';
      data.examples.forEach((ex, i) => { userPrompt += `${i + 1}. ${ex.input} -> ${ex.output}\n`; });
      userPrompt += '\n';
    }

    if (data.raw.smartAnswers && data.raw.smartAnswers.length > 0) {
      data.raw.smartAnswers.forEach(qa => { userPrompt += `${qa.question} : ${qa.answer}\n`; });
      userPrompt += '\n';
    }

    if (data.chainOfThought) userPrompt += 'Planifie les etapes avant d\'executer.\n\n';
    userPrompt += data.task;
    if (data.raw.constraints) userPrompt += `\n\nContraintes : ${data.raw.constraints}`;
    userPrompt += `\n\nFormat : ${data.format}`;

    const notes = [
      'Windsurf Cascade gere automatiquement le contexte multi-fichiers.',
      'Ajoutez un fichier .windsurfrules pour des instructions persistantes.',
      'Les flows Cascade sont ideaux pour les refactorings et migrations.',
      'Conseil : Soyez specifique sur les fichiers a modifier pour guider le flow.'
    ];

    return { systemPrompt, userPrompt, notes };
  },

  formatForCopilot(data) {
    let systemPrompt = data.persona;
    systemPrompt += '\n\nEnvironnement : GitHub Copilot (VS Code / IDE).';
    if (data.raw.outputLanguage) systemPrompt += `\nLangue : ${data.raw.outputLanguage}`;
    if (data.raw.tone) systemPrompt += `\nTon : ${data.raw.tone}`;
    systemPrompt += `\nFormat : ${data.format}`;
    if (data.raw.constraints) systemPrompt += `\nContraintes : ${data.raw.constraints}`;

    let userPrompt = '';
    if (data.raw.domain) userPrompt += `// Projet : ${data.raw.domain}\n`;
    if (data.raw.inputDescription) userPrompt += `// Contexte : ${data.raw.inputDescription}\n`;
    userPrompt += '\n';

    if (data.examples && data.examples.length > 0) {
      userPrompt += '// Exemples :\n';
      data.examples.forEach((ex, i) => {
        userPrompt += `// ${i + 1}. ${ex.input} -> ${ex.output}\n`;
      });
      userPrompt += '\n';
    }

    if (data.raw.smartAnswers && data.raw.smartAnswers.length > 0) {
      data.raw.smartAnswers.forEach(qa => { userPrompt += `// ${qa.question} : ${qa.answer}\n`; });
      userPrompt += '\n';
    }

    if (data.chainOfThought) userPrompt += '// Raisonne etape par etape\n\n';
    userPrompt += `// TODO: ${data.task}`;

    const notes = [
      'Pour le chat Copilot : collez le system prompt dans les instructions personnalisees.',
      'Pour les completions inline : utilisez les commentaires // comme contexte.',
      'Commandes utiles : /explain, /fix, /tests, /doc dans le chat.',
      'Copilot utilise le fichier ouvert + onglets voisins comme contexte automatique.'
    ];

    return { systemPrompt, userPrompt, notes };
  },

  // ===================================================================
  // IMAGE MODELS
  // ===================================================================

  formatForFLUX(data) {
    const img = data.raw.imageData || {};
    let prompt = '';

    prompt += img.subject || data.task;
    if (img.style) prompt += `, ${this._imageStyleLabel(img.style)}`;
    if (img.composition) prompt += `, ${this._compositionLabel(img.composition)}`;
    if (img.lighting) prompt += `, ${this._lightingLabel(img.lighting)}`;

    const quality = img.quality || 'standard';
    if (quality === 'high') prompt += ', 8K, ultra detailed, sharp focus, high resolution';
    if (quality === 'masterpiece') prompt += ', masterpiece, best quality, 8K, ultra detailed, sharp focus, professional';

    let negativePrompt = img.negative || 'blurry, distorted, low quality, watermark, text';

    const notes = [
      'Format FLUX : [Sujet detaille], [Style], [Composition], [Eclairage], [Qualite]',
      `Negative prompt : ${negativePrompt}`,
      'Conseil : Soyez tres specifique sur le sujet (race, pose, expression, vetements).',
      'Les mots-cles de qualite (8K, ultra detailed) ameliorent significativement le resultat.',
      'Iterative refinement : Commencez large, puis ajoutez style, puis technique.'
    ];

    return { systemPrompt: 'Prompt positif (ce que vous voulez voir)', userPrompt: prompt, notes };
  },

  formatForStableDiffusion(data) {
    const img = data.raw.imageData || {};
    let prompt = '';

    prompt += img.subject || data.task;
    if (img.style) prompt += `, ${this._imageStyleLabel(img.style)}`;
    if (img.composition) prompt += `, ${this._compositionLabel(img.composition)}`;
    if (img.lighting) prompt += `, ${this._lightingLabel(img.lighting)}`;

    const quality = img.quality || 'standard';
    if (quality === 'high') prompt += ', (high quality:1.2), (detailed:1.3), sharp focus, 8K';
    if (quality === 'masterpiece') prompt += ', (masterpiece:1.4), (best quality:1.4), (ultra detailed:1.3), sharp focus, 8K, professional photography';

    let negativePrompt = img.negative || 'blurry, distorted, extra limbs, extra fingers, deformed, bad anatomy, watermark, text, low quality, cartoon, anime';

    const notes = [
      'Format SD : [Sujet], [Style], [Composition], [Eclairage], [Qualite avec poids]',
      `Negative prompt (a copier dans le champ dedie) : ${negativePrompt}`,
      'Syntaxe poids : (mot:1.3) pour augmenter l\'importance, max recommande 1.5.',
      'Conseil : Stable Diffusion repond tres bien aux mots-cles photographiques (Kodak, Fujifilm, etc.).',
      'Evitez les prompts trop longs (>75 tokens) - priorisez les elements importants.'
    ];

    return { systemPrompt: 'Prompt positif (poids entre parentheses pour emphase)', userPrompt: prompt, notes };
  },

  /**
   * NANO BANANA: Google's image generation model (Gemini-based)
   * Strengths: text rendering, thinking process, search grounding, reference images
   */
  formatForNanoBanana(data) {
    const img = data.raw.imageData || {};
    let prompt = '';

    prompt += img.subject || data.task;
    if (img.style) prompt += `, ${this._imageStyleLabel(img.style)}`;
    if (img.composition) prompt += `, ${this._compositionLabel(img.composition)}`;
    if (img.lighting) prompt += `, ${this._lightingLabel(img.lighting)}`;

    const quality = img.quality || 'standard';
    if (quality === 'high') prompt += ', high quality, detailed, sharp, professional';
    if (quality === 'masterpiece') prompt += ', highest quality, extremely detailed, masterful composition, professional';

    // Nano Banana uses natural language well - add descriptive text
    if (img.negative) {
      prompt += `. Avoid: ${img.negative}`;
    }

    const notes = [
      'Nano Banana (Gemini Image) utilise le langage naturel - ecrivez des descriptions completes.',
      'Point fort : Texte parfaitement rendu dans les images (logos, phrases longues).',
      'Le mode "Thinking" raisonne avant de generer, corrigeant les erreurs logiques.',
      'Search Grounding : peut generer des diagrammes factuellement corrects.',
      'Supporte jusqu\'a 14 images de reference pour maintenir la coherence visuelle.',
      'Conseil : Decrivez le contexte et l\'intention, pas juste les elements visuels.'
    ];

    return { systemPrompt: 'Prompt image (langage naturel descriptif)', userPrompt: prompt, notes };
  },

  formatForDallE(data) {
    const img = data.raw.imageData || {};
    // DALL-E 3 uses natural language paragraphs - no weights, no negative prompts
    let prompt = '';
    prompt += img.subject || data.task;
    if (img.style) prompt += `. Style: ${this._imageStyleLabel(img.style)}`;
    if (img.composition) prompt += `. Composition: ${this._compositionLabel(img.composition)}`;
    if (img.lighting) prompt += `. Lighting: ${this._lightingLabel(img.lighting)}`;

    const quality = img.quality || 'standard';
    if (quality === 'high') prompt += '. Highly detailed, sharp focus, professional quality.';
    if (quality === 'masterpiece') prompt += '. Masterful composition, extraordinary detail, museum-quality artwork.';

    const notes = [
      'DALL-E 3 comprend le langage naturel - ecrivez des descriptions completes et detaillees.',
      'PAS de negative prompts ni de poids (1.3) - DALL-E ne les supporte pas.',
      'Parametres API : quality="hd" pour haute qualite, size="1792x1024" pour paysage.',
      'DALL-E reformule automatiquement votre prompt - verifiez le "revised_prompt" retourne.',
      'Conseil : Decrivez la scene comme un paragraphe de roman, pas une liste de mots-cles.'
    ];

    return { systemPrompt: 'Prompt DALL-E 3 (langage naturel descriptif)', userPrompt: prompt, notes };
  },

  formatForMidjourney(data) {
    const img = data.raw.imageData || {};
    let prompt = '';
    prompt += img.subject || data.task;
    if (img.style) prompt += `, ${this._imageStyleLabel(img.style)}`;
    if (img.composition) prompt += `, ${this._compositionLabel(img.composition)}`;
    if (img.lighting) prompt += `, ${this._lightingLabel(img.lighting)}`;

    const quality = img.quality || 'standard';
    if (quality === 'high') prompt += ', highly detailed, sharp';
    if (quality === 'masterpiece') prompt += ', masterpiece, award-winning, extraordinary detail';

    // Midjourney parameters
    let params = ' --v 6.1';
    if (quality === 'high' || quality === 'masterpiece') params += ' --s 750';

    const negativePrompt = img.negative ? ` --no ${img.negative}` : '';

    const notes = [
      'Format Midjourney : [Description] --parametres',
      `Prompt complet avec parametres : ${prompt}${params}${negativePrompt}`,
      'Parametres utiles : --ar 16:9 (ratio), --s 750 (stylize), --c 30 (chaos), --w 100 (weird).',
      'Les prompts courts et evocateurs marchent souvent mieux que les longs.',
      'Utilisez :: pour donner des poids : "chat::2 chapeau::1" = plus de chat que de chapeau.'
    ];

    return { systemPrompt: 'Prompt Midjourney (mots-cles + parametres)', userPrompt: prompt + params + negativePrompt, notes };
  },

  formatForIdeogram(data) {
    const img = data.raw.imageData || {};
    let prompt = '';
    prompt += img.subject || data.task;
    if (img.style) prompt += `, ${this._imageStyleLabel(img.style)}`;
    if (img.composition) prompt += `, ${this._compositionLabel(img.composition)}`;
    if (img.lighting) prompt += `, ${this._lightingLabel(img.lighting)}`;

    const quality = img.quality || 'standard';
    if (quality === 'high') prompt += ', high quality, detailed, professional';
    if (quality === 'masterpiece') prompt += ', masterpiece, exceptional quality, extraordinary detail';

    let negativePrompt = img.negative || '';

    const notes = [
      'Ideogram est le meilleur modele pour le texte dans les images (logos, titres, typographie).',
      'Ecrivez le texte exact entre guillemets dans votre prompt : "Texte a afficher".',
      negativePrompt ? `Negative prompt : ${negativePrompt}` : 'Ajoutez un negative prompt pour eviter les elements indesirables.',
      'Style presets disponibles : Design, Realistic, Anime, 3D, General.',
      'Magic Prompt (auto-enhancement) est active par defaut - desactivez-le pour un controle total.'
    ];

    return { systemPrompt: 'Prompt Ideogram (texte + style)', userPrompt: prompt, notes };
  },

  // ===================================================================
  // VIDEO MODELS
  // ===================================================================

  formatForVeo(data) {
    const vid = data.raw.videoData || {};
    let prompt = '';

    if (vid.shot) prompt += `${this._shotLabel(vid.shot)}, `;
    prompt += vid.subject || data.task;
    if (vid.style) prompt += `, ${vid.style} style`;
    if (vid.tempo) prompt += `, ${this._tempoLabel(vid.tempo)}`;
    prompt += ', cinematic quality, professional cinematography';

    const notes = [
      'Format Veo : [Type plan], [Sujet + action], [Decor], [Style], [Tempo]',
      'Conseil : Decrivez le mouvement de camera avec du vocabulaire cinematographique.',
      'Les descriptions d\'action doivent etre continues (pas de coupes implicites).',
      'Temporal : "slow motion" pour les details, "timelapse" pour montrer le passage du temps.',
      'Veo comprend le langage naturel - ecrivez comme un script de film.'
    ];

    return { systemPrompt: 'Prompt video (langage cinematographique)', userPrompt: prompt, notes };
  },

  formatForRunway(data) {
    const vid = data.raw.videoData || {};
    let prompt = '';
    if (vid.shot) prompt += `${this._shotLabel(vid.shot)}, `;
    prompt += vid.subject || data.task;
    if (vid.style) prompt += `, ${vid.style}`;
    if (vid.tempo) prompt += `, ${this._tempoLabel(vid.tempo)}`;
    prompt += ', cinematic quality';

    const notes = [
      'Format Runway Gen-3 : [Camera] + [Sujet en mouvement] + [Style] + [Tempo]',
      'Utilisez le Motion Brush pour controler le mouvement de zones specifiques.',
      'Les descriptions de mouvement continu fonctionnent mieux que les coupes.',
      'Duree : 4 a 10 secondes par generation. Planifiez vos scenes en consequence.',
      'Conseil : Decrivez une seule action fluide, pas une sequence complete.'
    ];

    return { systemPrompt: 'Prompt video Runway (mouvement + camera)', userPrompt: prompt, notes };
  },

  formatForSora(data) {
    const vid = data.raw.videoData || {};
    // Sora works best with detailed paragraph descriptions
    let prompt = '';
    if (vid.shot) prompt += `${this._shotLabel(vid.shot)} of `;
    prompt += vid.subject || data.task;
    prompt += '.';
    if (vid.style) prompt += ` The visual style is ${vid.style}.`;
    if (vid.tempo) prompt += ` The pacing is ${this._tempoLabel(vid.tempo)}.`;
    prompt += ' Cinematic quality, professional cinematography, consistent lighting throughout.';

    const notes = [
      'Sora comprend le langage naturel - ecrivez comme un script de film detaille.',
      'Decrivez le mouvement de camera avec precision (travelling, zoom, panoramique).',
      'Les descriptions d\'atmosphere et de lumiere ameliorent significativement le resultat.',
      'Sora peut gerer des scenes avec plusieurs personnages et interactions.',
      'Conseil : Incluez des details sur les textures, materiaux et ambiance.'
    ];

    return { systemPrompt: 'Prompt video Sora (description narrative)', userPrompt: prompt, notes };
  },

  formatForKling(data) {
    const vid = data.raw.videoData || {};
    let prompt = '';
    if (vid.shot) prompt += `${this._shotLabel(vid.shot)}, `;
    prompt += vid.subject || data.task;
    if (vid.style) prompt += `, ${vid.style} style`;
    if (vid.tempo) prompt += `, ${this._tempoLabel(vid.tempo)}`;
    prompt += ', high fidelity, smooth motion';

    const notes = [
      'Kling excelle pour les mouvements fluides et les expressions faciales.',
      'Mode "Master" pour la meilleure qualite (plus lent).',
      'Supporte les images de reference pour guider la generation.',
      'Les descriptions precises du mouvement corporel donnent de meilleurs resultats.',
      'Duree : jusqu\'a 10 secondes en mode haute qualite.'
    ];

    return { systemPrompt: 'Prompt video Kling (mouvement fluide)', userPrompt: prompt, notes };
  },

  // ===================================================================
  // GENERIC FALLBACK
  // ===================================================================

  formatGeneric(data) {
    return {
      systemPrompt: data.persona,
      userPrompt: data.task,
      notes: ['Format generique - aucune optimisation specifique appliquee.']
    };
  },

  // ===================================================================
  // RENDERING & HELPERS
  // ===================================================================

  /**
   * Render the full readable preview for a model adaptation
   * @param {string} mode - 'split' (default) or 'combined'
   */
  renderPreview(adapted, targetModel, mode) {
    mode = mode || 'split';
    const allConfigs = { ...this.config, ...this.imageConfig, ...this.videoConfig, ...this.vibeConfig };
    const cfg = allConfigs[targetModel] || { name: targetModel };
    const isMedia = cfg.category === 'image' || cfg.category === 'video';

    let md = '';
    md += `# Prompt optimise pour ${cfg.name}\n\n`;

    if (mode === 'combined' || isMedia) {
      md += `## Prompt\n\n`;
      if (isMedia) {
        md += '```\n' + adapted.userPrompt + '\n```\n\n';
      } else {
        md += '```\n' + adapted.systemPrompt + '\n\n---\n\n' + adapted.userPrompt + '\n```\n\n';
      }
    } else {
      md += `## System Prompt\n\n`;
      md += '```\n' + adapted.systemPrompt + '\n```\n\n';
      md += `## User Prompt\n\n`;
      md += '```\n' + adapted.userPrompt + '\n```\n\n';
    }

    if (adapted.notes && adapted.notes.length > 0) {
      md += `## Notes et recommandations\n\n`;
      adapted.notes.forEach(note => {
        md += `> ${note}\n>\n`;
      });
    }

    return md;
  },

  getRawPrompt(adapted) {
    let text = '';
    text += '=== SYSTEM PROMPT ===\n\n';
    text += adapted.systemPrompt + '\n\n';
    text += '=== USER PROMPT ===\n\n';
    text += adapted.userPrompt;
    return text;
  },

  // --- Label helpers ---

  _audienceLabel(value) {
    const labels = {
      general: 'Grand public',
      technical: 'Technique / Developpeurs',
      business: 'Business / Management',
      academic: 'Academique / Recherche',
      children: 'Enfants / Debutants',
      marketers: 'Marketeurs / Marketing',
      designers: 'Designers / UX',
      students: 'Etudiants',
      executives: 'Dirigeants / C-Level',
      hr: 'RH / Recruteurs',
      sales: 'Commerciaux / Ventes',
      legal: 'Juristes / Legal',
      medical: 'Professionnels de sante'
    };
    return labels[value] || value;
  },

  _imageStyleLabel(value) {
    const labels = {
      'photorealistic': 'photorealistic photography',
      'digital-art': 'digital art illustration',
      'oil-painting': 'oil painting, textured brushstrokes',
      'watercolor': 'watercolor painting, soft edges',
      'anime': 'anime style, cel-shaded',
      '3d-render': '3D render, octane render',
      'pencil-sketch': 'detailed pencil sketch, graphite',
      'vintage-photo': 'vintage photograph, Kodak Portra 400, analog film grain',
      'minimalist': 'minimalist, clean lines, simple',
      'surrealist': 'surrealist, dreamlike, Salvador Dali inspired'
    };
    return labels[value] || value;
  },

  _lightingLabel(value) {
    const labels = {
      'natural': 'natural lighting',
      'golden-hour': 'golden hour warm lighting',
      'studio': 'professional studio lighting',
      'dramatic': 'dramatic chiaroscuro lighting',
      'neon': 'neon lights, cyberpunk glow',
      'soft': 'soft diffused lighting',
      'backlit': 'backlit, rim lighting, silhouette'
    };
    return labels[value] || value;
  },

  _compositionLabel(value) {
    const labels = {
      'rule-of-thirds': 'rule of thirds composition',
      'centered': 'centered symmetric composition',
      'close-up': 'close-up shot',
      'wide-shot': 'wide establishing shot',
      'birds-eye': 'bird\'s eye view, top-down',
      'low-angle': 'low angle, looking up',
      'macro': 'macro photography, extreme close-up'
    };
    return labels[value] || value;
  },

  _shotLabel(value) {
    const labels = {
      'tracking': 'Slow tracking shot',
      'static': 'Static locked camera',
      'drone': 'Aerial drone shot',
      'close-up': 'Close-up shot',
      'establishing': 'Wide establishing shot',
      'pov': 'First-person POV'
    };
    return labels[value] || value;
  },

  _tempoLabel(value) {
    const labels = {
      'slow-motion': 'slow motion, 120fps',
      'real-time': 'real-time speed',
      'timelapse': 'timelapse, accelerated',
      'quick-cuts': 'quick cuts, fast editing',
      'continuous': 'single continuous take, no cuts'
    };
    return labels[value] || value;
  }
};
