/**
 * LLM-Specific Prompt Adapters
 * Transforms a generic PTCF prompt into LLM-optimized versions.
 *
 * Sources from 5 prompt engineering skills:
 * - prompt-ingenieur-roman: PTCF, XML Claude, LLM-specific patterns
 * - prompt-engineering-patterns: Template architecture, few-shot strategies
 * - prompt-engineering-antigravity: Progressive Disclosure, Instruction Hierarchy
 * - prompt-engineering-inference: Image (FLUX/SD), Video (Veo) prompting
 * - enhance-prompt: 4-step enhancement pipeline, UI/UX vocabulary
 */
const LLMAdapters = {

  // --- Text LLM configs ---
  config: {
    claude: {
      name: 'Claude',
      color: '#D97757',
      letter: 'C',
      description: 'Anthropic - XML structure, donnees en haut',
      category: 'text'
    },
    chatgpt: {
      name: 'ChatGPT',
      color: '#10A37F',
      letter: 'G',
      description: 'OpenAI - Developer role, strict mode',
      category: 'text'
    },
    gemini: {
      name: 'Gemini',
      color: '#4285F4',
      letter: 'G',
      description: 'Google - Anchor context, grounding',
      category: 'text'
    },
    perplexity: {
      name: 'Perplexity',
      color: '#20B2AA',
      letter: 'P',
      description: 'Search-first, zero-shot',
      category: 'text'
    }
  },

  // --- Image / Video model configs ---
  imageConfig: {
    flux: {
      name: 'FLUX',
      color: '#FF6B35',
      letter: 'F',
      description: 'Image - Sujets detailles, style, negative prompts',
      category: 'image'
    },
    'stable-diffusion': {
      name: 'Stable Diffusion',
      color: '#A855F7',
      letter: 'S',
      description: 'Image - Quality keywords, composition, lighting',
      category: 'image'
    },
    veo: {
      name: 'Veo (Google)',
      color: '#EA4335',
      letter: 'V',
      description: 'Video - Camera movement, cinematique, tempo',
      category: 'video'
    }
  },

  /**
   * Main entry - adapt a prompt for a target model
   */
  adapt(promptData, targetModel) {
    // Text LLMs
    switch (targetModel) {
      case 'claude': return this.formatForClaude(promptData);
      case 'chatgpt': return this.formatForChatGPT(promptData);
      case 'gemini': return this.formatForGemini(promptData);
      case 'perplexity': return this.formatForPerplexity(promptData);
      // Image models
      case 'flux': return this.formatForFLUX(promptData);
      case 'stable-diffusion': return this.formatForStableDiffusion(promptData);
      // Video models
      case 'veo': return this.formatForVeo(promptData);
      default: return this.formatGeneric(promptData);
    }
  },

  // ===================================================================
  // TEXT LLMs
  // ===================================================================

  /**
   * CLAUDE: XML tags, data on top, question at bottom
   * Sources: prompt-ingenieur-roman (techniques-fondamentales, specifiques-par-modele)
   */
  formatForClaude(data) {
    let systemPrompt = data.persona;

    // Progressive Disclosure: enrich based on complexity (antigravity skill)
    if (data.raw.complexity === 'advanced' || data.raw.complexity === 'expert') {
      systemPrompt += '\n\nInstruction Hierarchy (priorite decroissante) :\n';
      systemPrompt += '1. Contraintes de securite et de format (toujours respecter)\n';
      systemPrompt += '2. Instructions de la tache principale\n';
      systemPrompt += '3. Preferences stylistiques et tonales\n';
      systemPrompt += '4. Optimisations secondaires';
    }

    let userPrompt = '';

    // Context block (top)
    userPrompt += '<context>\n';
    if (data.raw.domain) userPrompt += `  <domain>${data.raw.domain}</domain>\n`;
    if (data.raw.audience) userPrompt += `  <audience>${this._audienceLabel(data.raw.audience)}</audience>\n`;
    if (data.raw.tone) userPrompt += `  <tone>${data.raw.tone}</tone>\n`;
    if (data.raw.outputLanguage) userPrompt += `  <langue>${data.raw.outputLanguage}</langue>\n`;
    userPrompt += '</context>\n\n';

    // Examples (if any)
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

    // Input description
    if (data.raw.inputDescription) {
      userPrompt += `<input_description>\n${data.raw.inputDescription}\n</input_description>\n\n`;
    }

    // Chain of thought
    if (data.chainOfThought) {
      userPrompt += '<instructions>\nRaisonne etape par etape dans des balises <thinking> avant de fournir ta reponse finale.\n</instructions>\n\n';
    }

    // Task (bottom - key Claude pattern)
    userPrompt += `<task>\n${data.task}\n</task>\n\n`;

    // Constraints
    if (data.raw.constraints) {
      userPrompt += `<constraints>\n${data.raw.constraints}\n</constraints>\n\n`;
    }

    // Error recovery (antigravity skill - expert level)
    if (data.raw.complexity === 'expert') {
      userPrompt += `<error_recovery>\nSi tu n'es pas certain d'une reponse, indique ton niveau de confiance et propose des alternatives.\nSi les instructions semblent contradictoires, signale l'ambiguite avant de repondre.\n</error_recovery>\n\n`;
    }

    // Output format
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

  /**
   * CHATGPT: Developer role, no personality padding, strict mode
   * Sources: prompt-ingenieur-roman (specifiques-par-modele), antigravity (progressive disclosure)
   */
  formatForChatGPT(data) {
    let systemPrompt = '';
    systemPrompt += data.persona + '\n\n';

    // Rules section
    systemPrompt += 'Regles :\n';
    if (data.raw.tone) systemPrompt += `- Ton : ${data.raw.tone}\n`;
    if (data.raw.audience) systemPrompt += `- Public cible : ${this._audienceLabel(data.raw.audience)}\n`;
    if (data.raw.outputLanguage) systemPrompt += `- Langue de reponse : ${data.raw.outputLanguage}\n`;
    systemPrompt += `- Format de sortie : ${data.format}\n`;
    if (data.raw.constraints) {
      systemPrompt += `- ${data.raw.constraints.split('\n').join('\n- ')}\n`;
    }

    // Verbosity control for complex tasks
    const complexTasks = ['code', 'analyse', 'agent', 'classification'];
    if (complexTasks.includes(data.raw.taskType)) {
      systemPrompt += '\nControle de verbosity :\n';
      systemPrompt += '- Ne fournir que les elements demandes.\n';
      systemPrompt += '- Ne pas s\'etendre au-dela du scope de la question.\n';
    }

    // Progressive Disclosure (antigravity skill)
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

  /**
   * GEMINI: Anchor context, grounding clauses, positive action verbs
   * Sources: prompt-ingenieur-roman (specifiques-par-modele)
   */
  formatForGemini(data) {
    let systemPrompt = data.persona;

    let userPrompt = '';

    // Data on TOP (Gemini anchor pattern)
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

    // Grounding clause for factual tasks
    const factualTasks = ['analyse', 'extraction', 'classification', 'qa-rag'];
    if (factualTasks.includes(data.raw.taskType)) {
      userPrompt += 'IMPORTANT : Reponds UNIQUEMENT sur la base des informations fournies. Ne recours pas a tes connaissances pre-entrainees.\n\n';
    }

    if (data.chainOfThought) {
      userPrompt += 'Detaille ton raisonnement etape par etape avant de fournir ta reponse finale.\n\n';
    }

    // Anchor question at the BOTTOM (Gemini pattern)
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

  /**
   * PERPLEXITY: Search-first, instructions = restitution only, no few-shot
   * Sources: prompt-ingenieur-roman (specifiques-par-modele)
   */
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

    const warnings = [];
    if (data.examples && data.examples.length > 0) {
      warnings.push('Les exemples few-shot ont ete retires : ils polluent les sous-recherches de Perplexity.');
    }

    const notes = [
      'Conseil : Les parametres API sont plus efficaces que les instructions texte.',
      'Parametres recommandes : search_domain_filter, search_context_size: "large".',
      'Ne demandez JAMAIS d\'inclure des URLs dans la reponse textuelle.',
      ...warnings
    ];

    return { systemPrompt, userPrompt, notes };
  },

  // ===================================================================
  // IMAGE MODELS (from prompt-engineering-inference skill)
  // Structure: [Subject] + [Style] + [Composition] + [Lighting] + [Technical]
  // ===================================================================

  /**
   * FLUX: Detailed subjects, style references, lighting keywords, negative prompts
   * Source: prompt-engineering-inference (Image Generation Prompting)
   */
  formatForFLUX(data) {
    const img = data.raw.imageData || {};
    let prompt = '';

    // Subject (most important)
    prompt += img.subject || data.task;

    // Style
    if (img.style) prompt += `, ${this._imageStyleLabel(img.style)}`;

    // Composition
    if (img.composition) prompt += `, ${this._compositionLabel(img.composition)}`;

    // Lighting
    if (img.lighting) prompt += `, ${this._lightingLabel(img.lighting)}`;

    // Quality keywords
    const quality = img.quality || 'standard';
    if (quality === 'high') prompt += ', 8K, ultra detailed, sharp focus, high resolution';
    if (quality === 'masterpiece') prompt += ', masterpiece, best quality, 8K, ultra detailed, sharp focus, professional';

    let negativePrompt = img.negative || 'blurry, distorted, low quality, watermark, text';

    const systemPrompt = `Prompt positif (ce que vous voulez voir)`;
    const userPrompt = prompt;

    const notes = [
      'Format FLUX : [Sujet detaille], [Style], [Composition], [Eclairage], [Qualite]',
      `Negative prompt : ${negativePrompt}`,
      'Conseil : Soyez tres specifique sur le sujet (race, pose, expression, vetements).',
      'Les mots-cles de qualite (8K, ultra detailed) ameliorent significativement le resultat.',
      'Iterative refinement : Commencez large, puis ajoutez style, puis technique.'
    ];

    return { systemPrompt, userPrompt, notes };
  },

  /**
   * STABLE DIFFUSION: Quality keywords, composition, lighting, negative prompts
   * Source: prompt-engineering-inference (Image Generation Prompting)
   */
  formatForStableDiffusion(data) {
    const img = data.raw.imageData || {};
    let prompt = '';

    // Subject
    prompt += img.subject || data.task;

    // Style
    if (img.style) prompt += `, ${this._imageStyleLabel(img.style)}`;

    // Composition
    if (img.composition) prompt += `, ${this._compositionLabel(img.composition)}`;

    // Lighting
    if (img.lighting) prompt += `, ${this._lightingLabel(img.lighting)}`;

    // Quality (Stable Diffusion specific weights)
    const quality = img.quality || 'standard';
    if (quality === 'high') prompt += ', (high quality:1.2), (detailed:1.3), sharp focus, 8K';
    if (quality === 'masterpiece') prompt += ', (masterpiece:1.4), (best quality:1.4), (ultra detailed:1.3), sharp focus, 8K, professional photography';

    let negativePrompt = img.negative || 'blurry, distorted, extra limbs, extra fingers, deformed, bad anatomy, watermark, text, low quality, cartoon, anime';

    const systemPrompt = 'Prompt positif (poids entre parentheses pour emphase)';
    const userPrompt = prompt;

    const notes = [
      'Format SD : [Sujet], [Style], [Composition], [Eclairage], [Qualite avec poids]',
      `Negative prompt (a copier dans le champ dedie) : ${negativePrompt}`,
      'Syntaxe poids : (mot:1.3) pour augmenter l\'importance, max recommande 1.5.',
      'Conseil : Stable Diffusion repond tres bien aux mots-cles photographiques (Kodak, Fujifilm, etc.).',
      'Evitez les prompts trop longs (>75 tokens) - priorisez les elements importants.'
    ];

    return { systemPrompt, userPrompt, notes };
  },

  // ===================================================================
  // VIDEO MODELS (from prompt-engineering-inference skill)
  // Structure: [Shot Type] + [Subject] + [Action] + [Setting] + [Style]
  // ===================================================================

  /**
   * VEO: Camera movement, cinematic language, action descriptions, temporal context
   * Source: prompt-engineering-inference (Video Prompting)
   */
  formatForVeo(data) {
    const vid = data.raw.videoData || {};
    let prompt = '';

    // Shot type
    if (vid.shot) prompt += `${this._shotLabel(vid.shot)}, `;

    // Subject + action
    prompt += vid.subject || data.task;

    // Style
    if (vid.style) prompt += `, ${vid.style} style`;

    // Temporal
    if (vid.tempo) prompt += `, ${this._tempoLabel(vid.tempo)}`;

    // Always add cinematic quality for Veo
    prompt += ', cinematic quality, professional cinematography';

    const systemPrompt = 'Prompt video (langage cinematographique)';
    const userPrompt = prompt;

    const notes = [
      'Format Veo : [Type plan], [Sujet + action], [Decor], [Style], [Tempo]',
      'Conseil : Decrivez le mouvement de camera avec du vocabulaire cinematographique.',
      'Les descriptions d\'action doivent etre continues (pas de coupes implicites).',
      'Temporal : "slow motion" pour les details, "timelapse" pour montrer le passage du temps.',
      'Veo comprend le langage naturel - ecrivez comme un script de film.'
    ];

    return { systemPrompt, userPrompt, notes };
  },

  // ===================================================================
  // RENDERING & HELPERS
  // ===================================================================

  /**
   * Render the full readable preview for a model adaptation
   */
  renderPreview(adapted, targetModel) {
    const allConfigs = { ...this.config, ...this.imageConfig };
    const cfg = allConfigs[targetModel] || { name: targetModel };
    const isMedia = cfg.category === 'image' || cfg.category === 'video';

    let md = '';
    md += `# Prompt optimise pour ${cfg.name}\n\n`;

    if (isMedia) {
      md += `## Prompt\n\n`;
      md += '```\n' + adapted.userPrompt + '\n```\n\n';
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

  /**
   * Get raw prompt text (for copy/download)
   */
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
      children: 'Enfants / Debutants'
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
