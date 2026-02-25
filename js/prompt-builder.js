/**
 * Prompt Builder Engine
 * Assembles form data into structured prompt using PTCF framework:
 * P = Persona, T = Task, C = Context, F = Format
 *
 * Enhanced with Progressive Disclosure (4 levels) from antigravity skill
 * and image/video data collection from inference skill
 */
const PromptBuilder = {

  /**
   * Get value from a select or its "Autre" text input.
   * Also checks for multi-select component values.
   */
  _getFieldValue(selectId, autreInputId, fallback) {
    // Check if there's a multi-select component for this field
    const ms = document.getElementById('ms-' + selectId);
    if (ms && ms._selected && ms._selected.length > 0) {
      return ms._selected.map(s => s.label).join(', ');
    }

    const select = document.getElementById(selectId);
    let value = select ? select.value : '';
    if (value === 'autre') {
      const autreInput = document.getElementById(autreInputId);
      value = autreInput ? autreInput.value.trim() : '';
    }
    return value || fallback || '';
  },

  /**
   * Collect all form data from the wizard steps
   */
  collectFormData() {
    // Step 1: Models (text LLMs + image/video)
    const targetLLMs = [];
    document.querySelectorAll('.llm-card.selected').forEach(card => {
      targetLLMs.push(card.dataset.llm);
    });

    // Step 2: Task type + Persona
    const selectedTask = document.querySelector('.task-card.selected');
    const taskType = selectedTask ? selectedTask.dataset.task : '';
    const customTaskType = document.getElementById('custom-task-input').value.trim();
    const persona = document.getElementById('persona').value.trim();

    // Step 3: Context (multi-select fields)
    const domain = this._getFieldValue('domain', null, '');
    const audience = this._getFieldValue('audience', null, '');
    const outputLanguage = this._getFieldValue('output-language', null, 'francais');
    const tone = this._getFieldValue('tone', null, 'professionnel');

    // Step 4: Task details
    const taskDescription = document.getElementById('task-description').value.trim();
    const inputDescription = document.getElementById('input-description').value.trim();
    const outputFormat = this._getFieldValue('output-format', 'output-format-autre', 'texte');
    const constraints = document.getElementById('constraints').value.trim();

    // Step 4: Image/Video data (if fields visible)
    const imageData = this._collectImageData();
    const videoData = this._collectVideoData();

    // Step 5: Advanced
    const complexityEl = document.querySelector('input[name="complexity"]:checked');
    const complexity = complexityEl ? complexityEl.value : 'basic';
    const fewShotEnabled = document.getElementById('few-shot-toggle').checked;
    const chainOfThought = document.getElementById('cot-toggle').checked;
    const lengthEl = document.querySelector('input[name="output-length"]:checked');
    const outputLength = lengthEl ? lengthEl.value : 'moyen';

    // Collect few-shot examples
    const fewShotExamples = [];
    if (fewShotEnabled) {
      document.querySelectorAll('.example-pair').forEach(pair => {
        const input = pair.querySelector('.example-input').value.trim();
        const output = pair.querySelector('.example-output').value.trim();
        if (input && output) {
          fewShotExamples.push({ input, output });
        }
      });
    }

    // Step 6: Smart answers (collected by App)
    const smartAnswers = (typeof App !== 'undefined' && App.collectSmartAnswers)
      ? App.collectSmartAnswers()
      : [];

    return {
      targetLLMs, taskType, customTaskType,
      domain, audience, outputLanguage, tone,
      taskDescription, inputDescription, outputFormat, constraints,
      imageData, videoData, complexity,
      persona, fewShotEnabled, fewShotExamples, chainOfThought, outputLength,
      smartAnswers
    };
  },

  _collectImageData() {
    const subjectEl = document.getElementById('img-subject');
    if (!subjectEl || !subjectEl.value.trim()) return null;

    const qualityEl = document.querySelector('input[name="img-quality"]:checked');
    return {
      subject: subjectEl.value.trim(),
      style: document.getElementById('img-style').value,
      lighting: document.getElementById('img-lighting').value,
      composition: document.getElementById('img-composition').value,
      quality: qualityEl ? qualityEl.value : 'standard',
      negative: document.getElementById('img-negative').value.trim()
    };
  },

  _collectVideoData() {
    const subjectEl = document.getElementById('vid-subject');
    if (!subjectEl || !subjectEl.value.trim()) return null;

    return {
      subject: subjectEl.value.trim(),
      shot: document.getElementById('vid-shot').value,
      tempo: document.getElementById('vid-tempo').value,
      style: document.getElementById('vid-style').value.trim()
    };
  },

  /**
   * Assemble a generic prompt structure from form data (PTCF)
   */
  assemble(formData) {
    return {
      persona: this._buildPersona(formData),
      task: this._buildTask(formData),
      context: this._buildContext(formData),
      format: this._buildFormat(formData),
      examples: formData.fewShotExamples,
      chainOfThought: formData.chainOfThought,
      outputLength: formData.outputLength,
      raw: formData
    };
  },

  /**
   * Generate adapted prompts for all selected models
   */
  generateAll(formData) {
    const promptData = this.assemble(formData);
    const results = {};
    for (const model of formData.targetLLMs) {
      results[model] = LLMAdapters.adapt(promptData, model);
    }
    return results;
  },

  shouldRecommendCoT(taskType) {
    const complexTasks = ['code', 'analyse', 'classification', 'agent', 'extraction', 'claude-code', 'n8n', 'ia-llm'];
    return complexTasks.includes(taskType);
  },

  isMediaTask(targetLLMs) {
    const mediaModels = ['flux', 'stable-diffusion', 'nano-banana', 'veo'];
    return targetLLMs.some(m => mediaModels.includes(m));
  },

  hasImageModel(targetLLMs) {
    return targetLLMs.some(m => m === 'flux' || m === 'stable-diffusion' || m === 'nano-banana');
  },

  hasVideoModel(targetLLMs) {
    return targetLLMs.some(m => m === 'veo');
  },

  hasVibeModel(targetLLMs) {
    return targetLLMs.some(m => m === 'claude-code');
  },

  hasTextModel(targetLLMs) {
    const textModels = ['claude', 'chatgpt', 'gemini', 'perplexity'];
    return targetLLMs.some(m => textModels.includes(m));
  },

  // --- Private builders ---

  _buildPersona(data) {
    if (data.persona) return data.persona;

    const roleMap = {
      'redaction': 'redacteur professionnel',
      'analyse': 'analyste expert',
      'code': 'developpeur senior',
      'extraction': 'specialiste en extraction de donnees',
      'classification': 'classificateur expert',
      'traduction': 'traducteur professionnel',
      'qa-rag': 'assistant factuel et precis',
      'agent': 'agent IA autonome et methodique',
      'brainstorming': 'consultant creatif',
      'claude-code': 'expert Claude Code et prompt engineering pour agents IA',
      'n8n': 'expert n8n et automatisation de workflows IA',
      'ia-llm': 'expert en IA, LLMs et prompt engineering',
      'image-gen': 'artiste digital',
      'video-gen': 'directeur de la photographie',
      'autre': 'assistant specialise'
    };

    const role = roleMap[data.taskType] || 'assistant';
    const domainStr = data.domain ? ` specialise en ${data.domain}` : '';

    let persona = `Tu es un ${role}${domainStr}.`;

    if (data.complexity === 'intermediate' || data.complexity === 'advanced' || data.complexity === 'expert') {
      persona += `\nTu adaptes ton niveau de detail au contexte et priorises la precision.`;
    }
    if (data.complexity === 'advanced' || data.complexity === 'expert') {
      persona += `\nTu structures tes reponses de maniere hierarchique et appliques une rigueur methodologique.`;
    }
    if (data.complexity === 'expert') {
      persona += `\nTu indiques ton niveau de confiance, signales les ambiguites, et proposes des alternatives quand pertinent.`;
    }

    return persona;
  },

  _buildTask(data) {
    let task = data.taskDescription;
    if (data.taskType === 'autre' && data.customTaskType) {
      task = `[${data.customTaskType}] ${task}`;
    }
    return task;
  },

  _buildContext(data) {
    const parts = [];
    if (data.domain) parts.push(`Domaine : ${data.domain}`);
    if (data.audience) parts.push(`Public : ${data.audience}`);
    if (data.tone) parts.push(`Ton : ${data.tone}`);
    if (data.constraints) parts.push(`Contraintes : ${data.constraints}`);
    if (data.inputDescription) parts.push(`Input : ${data.inputDescription}`);
    return parts.join('\n');
  },

  _buildFormat(data) {
    const formatLabels = {
      'texte': 'Texte libre',
      'json': 'JSON structure',
      'markdown': 'Markdown formate',
      'code': 'Code source',
      'liste': 'Liste a puces',
      'tableau': 'Tableau',
      'html': 'HTML',
      'csv': 'CSV',
      'xml': 'XML',
      'yaml': 'YAML',
      'email': 'Email',
      'article': 'Article',
      'rapport': 'Rapport',
      'presentation': 'Presentation (slides)'
    };

    const lengthLabels = {
      'court': 'reponse concise (quelques phrases)',
      'moyen': 'reponse de longueur moderee',
      'long': 'reponse detaillee et approfondie',
      'illimite': 'pas de limite de longueur'
    };

    const format = formatLabels[data.outputFormat] || data.outputFormat;
    const length = lengthLabels[data.outputLength] || data.outputLength;
    const lang = data.outputLanguage || 'francais';

    return `${format} - ${length} - Langue : ${lang}`;
  }
};
