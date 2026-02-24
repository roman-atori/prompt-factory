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
   * Collect all form data from the wizard steps
   */
  collectFormData() {
    // Step 1: Models (text LLMs + image/video)
    const targetLLMs = [];
    document.querySelectorAll('.llm-card.selected').forEach(card => {
      targetLLMs.push(card.dataset.llm);
    });

    // Step 2: Task type
    const selectedTask = document.querySelector('.task-card.selected');
    const taskType = selectedTask ? selectedTask.dataset.task : '';
    const customTaskType = document.getElementById('custom-task-input').value.trim();

    // Step 3: Context
    const domain = document.getElementById('domain').value.trim();
    const audience = document.getElementById('audience').value;
    const outputLanguage = document.getElementById('output-language').value;
    const toneEl = document.querySelector('input[name="tone"]:checked');
    const tone = toneEl ? toneEl.value : 'professionnel';

    // Step 4: Task details (text)
    const taskDescription = document.getElementById('task-description').value.trim();
    const inputDescription = document.getElementById('input-description').value.trim();
    const outputFormatEl = document.querySelector('input[name="output-format"]:checked');
    const outputFormat = outputFormatEl ? outputFormatEl.value : 'texte';
    const constraints = document.getElementById('constraints').value.trim();

    // Step 4: Image data (if image fields visible)
    const imageData = this._collectImageData();
    const videoData = this._collectVideoData();

    // Step 5: Advanced
    const complexityEl = document.querySelector('input[name="complexity"]:checked');
    const complexity = complexityEl ? complexityEl.value : 'basic';
    const persona = document.getElementById('persona').value.trim();
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

    return {
      targetLLMs, taskType, customTaskType,
      domain, audience, outputLanguage, tone,
      taskDescription, inputDescription, outputFormat, constraints,
      imageData, videoData, complexity,
      persona, fewShotEnabled, fewShotExamples, chainOfThought, outputLength
    };
  },

  /**
   * Collect image generation specific data
   */
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

  /**
   * Collect video generation specific data
   */
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

  /**
   * Detect if Chain-of-Thought is recommended for this task type
   */
  shouldRecommendCoT(taskType) {
    const complexTasks = ['code', 'analyse', 'classification', 'agent', 'extraction'];
    return complexTasks.includes(taskType);
  },

  /**
   * Detect if this is an image/video generation task
   */
  isMediaTask(targetLLMs) {
    const mediaModels = ['flux', 'stable-diffusion', 'veo'];
    return targetLLMs.some(m => mediaModels.includes(m));
  },

  hasImageModel(targetLLMs) {
    return targetLLMs.some(m => m === 'flux' || m === 'stable-diffusion');
  },

  hasVideoModel(targetLLMs) {
    return targetLLMs.some(m => m === 'veo');
  },

  hasTextModel(targetLLMs) {
    const textModels = ['claude', 'chatgpt', 'gemini', 'perplexity'];
    return targetLLMs.some(m => textModels.includes(m));
  },

  // --- Private builders ---

  /**
   * P - Build persona/role
   * Enhanced with Progressive Disclosure (antigravity skill):
   * - basic: simple role
   * - intermediate: role + domain expertise
   * - advanced: role + expertise + behavioral rules
   * - expert: role + expertise + rules + error handling + confidence
   */
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
      'image-gen': 'artiste digital',
      'video-gen': 'directeur de la photographie',
      'autre': 'assistant specialise'
    };

    const role = roleMap[data.taskType] || 'assistant';
    const domainStr = data.domain ? ` specialise en ${data.domain}` : '';

    let persona = `Tu es un ${role}${domainStr}.`;

    // Progressive Disclosure levels (antigravity skill)
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

  /**
   * T - Build task description
   */
  _buildTask(data) {
    let task = data.taskDescription;
    if (data.taskType === 'autre' && data.customTaskType) {
      task = `[${data.customTaskType}] ${task}`;
    }
    return task;
  },

  /**
   * C - Build context
   */
  _buildContext(data) {
    const parts = [];
    if (data.domain) parts.push(`Domaine : ${data.domain}`);
    if (data.audience) parts.push(`Public : ${data.audience}`);
    if (data.tone) parts.push(`Ton : ${data.tone}`);
    if (data.constraints) parts.push(`Contraintes : ${data.constraints}`);
    if (data.inputDescription) parts.push(`Input : ${data.inputDescription}`);
    return parts.join('\n');
  },

  /**
   * F - Build format specification
   * Enhanced with template awareness (patterns skill)
   */
  _buildFormat(data) {
    const formatLabels = {
      'texte': 'Texte libre',
      'json': 'JSON structure',
      'markdown': 'Markdown formate',
      'code': 'Code source',
      'liste': 'Liste a puces',
      'tableau': 'Tableau'
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
