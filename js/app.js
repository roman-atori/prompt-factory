/**
 * Main Application Controller
 * Manages wizard navigation, form state, localStorage, events
 * Supports two modes: 'prompt' (7 steps) and 'agent' (6 steps)
 */
const App = {

  currentStep: 1,
  maxStepReached: 1,
  mode: 'prompt', // 'prompt' | 'agent'
  agentPlatform: null, // 'claude' | 'chatgpt' | 'gemini'
  stepSequences: {
    prompt: ['step-prompt-1', 'step-prompt-2', 'step-prompt-3', 'step-prompt-4', 'step-shared-questions', 'step-shared-preview', 'step-shared-optimize'],
    agent: ['step-agent-1', 'step-agent-2', 'step-agent-3', 'step-shared-questions', 'step-shared-preview', 'step-shared-optimize']
  },
  generatedPrompts: {},
  originalPrompts: {},
  activeLLMTab: null,
  activeLLMTabOptimize: null,
  editMode: false,
  previewMode: 'split', // 'split' or 'combined'
  displayFormat: 'plaintext', // 'plaintext', 'rendered', 'markdown'
  step8Modes: { original: 'split', optimized: 'split' },
  step8Formats: { original: 'plaintext', optimized: 'plaintext' },
  smartQuestionsGenerated: false,
  tutorialActive: false,
  tutorialStepIndex: 0,

  // Dynamic step helpers
  _getStepSequence() { return this.stepSequences[this.mode]; },
  _getTotalSteps() { return this._getStepSequence().length; },
  _getCurrentStepId() { return this._getStepSequence()[this.currentStep - 1]; },

  // ===== INITIALIZATION =====

  _autoSaveTimer: null,

  init() {
    this._initDarkMode();
    this.loadPreferences();
    this.renderStepIndicators();
    this.renderLLMCards();
    this.renderImageModelCards();
    this.renderVideoModelCards();
    this.renderVibeModelCards();
    this.renderTaskCards();
    this.renderAgentPlatformCards();
    this._initMultiSelects();
    this.bindEvents();
    this.updateNavigation();
    this.checkApiKey();
    this._updateGuideHighlights();
    this._restoreAutoSave();
    this._bindAutoSave();
  },

  // ===== STEP INDICATORS =====

  renderStepIndicators() {
    const container = document.getElementById('step-indicators');
    container.innerHTML = '';
    const total = this._getTotalSteps();
    for (let i = 1; i <= total; i++) {
      const dot = document.createElement('div');
      dot.className = 'step-dot' + (i === 1 ? ' active' : '');
      dot.textContent = i;
      dot.dataset.step = i;
      dot.addEventListener('click', () => {
        const targetStep = parseInt(dot.dataset.step);
        if (targetStep !== this.currentStep && targetStep <= this.maxStepReached) {
          this.goToStep(targetStep);
        }
      });
      container.appendChild(dot);
    }
  },

  updateStepIndicators() {
    document.querySelectorAll('.step-dot').forEach(dot => {
      const step = parseInt(dot.dataset.step);
      dot.classList.remove('active', 'completed');
      if (step === this.currentStep) dot.classList.add('active');
      else if (step <= this.maxStepReached) dot.classList.add('completed');
    });
    const pct = (this.currentStep / this._getTotalSteps()) * 100;
    document.getElementById('progress-fill').style.width = pct + '%';
  },

  // ===== NAVIGATION =====

  async nextStep() {
    if (!this.validateCurrentStep()) return;
    if (this.currentStep < this._getTotalSteps()) {
      const currentId = this._getCurrentStepId();

      // Pre-navigation hooks
      if (currentId === 'step-prompt-1') {
        const freeText = document.getElementById('free-description').value.trim();
        if (freeText && this._hasApiKey) {
          await this.extractFromFreeText(freeText);
        }
      }
      if (currentId === 'step-agent-2') {
        await this.extractAgentFields();
      }

      this.currentStep++;
      this.maxStepReached = Math.max(this.maxStepReached, this.currentStep);
      this.showStep(this.currentStep);

      // Post-navigation hooks
      const newId = this._getCurrentStepId();
      if (newId === 'step-prompt-3') this.updateStep4Fields();
      if (newId === 'step-shared-questions') this.triggerSmartQuestions();
      if (newId === 'step-shared-preview') this.generatePreview();
      if (newId === 'step-shared-optimize') this.prepareOptimizationStep();
      if (newId === 'step-agent-3') this.showAgentFieldsForPlatform();
    }
  },

  prevStep() {
    if (this.currentStep > 1) {
      this.currentStep--;
      this.showStep(this.currentStep);
      const newId = this._getCurrentStepId();
      if (newId === 'step-prompt-3') this.updateStep4Fields();
    }
  },

  goToStep(stepNumber) {
    if (stepNumber >= 1 && stepNumber <= this.maxStepReached) {
      this.currentStep = stepNumber;
      this.showStep(stepNumber);
      const stepId = this._getCurrentStepId();
      if (stepId === 'step-prompt-3') this.updateStep4Fields();
      if (stepId === 'step-shared-questions' && !this.smartQuestionsGenerated) this.triggerSmartQuestions();
      if (stepId === 'step-shared-preview') this.generatePreview();
      if (stepId === 'step-shared-optimize') this.prepareOptimizationStep();
      if (stepId === 'step-agent-3') this.showAgentFieldsForPlatform();
    }
  },

  showStep(stepNumber) {
    document.querySelectorAll('.wizard-step').forEach(s => s.classList.remove('active'));
    const stepId = this._getStepSequence()[stepNumber - 1];
    const target = document.getElementById(stepId);
    if (target) target.classList.add('active');
    const container = document.getElementById('wizard-container');
    const wideSteps = ['step-prompt-1', 'step-agent-1', 'step-shared-preview', 'step-shared-optimize'];
    if (container) container.classList.toggle('wide-mode', wideSteps.includes(stepId));
    this.updateStepIndicators();
    this.updateNavigation();
    this._updateGuideHighlights();
    if (this.tutorialActive) this._closeTutorial();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  },

  updateNavigation() {
    const btnPrev = document.getElementById('btn-prev');
    const btnNext = document.getElementById('btn-next');

    btnPrev.disabled = this.currentStep === 1;

    if (this.currentStep === this._getTotalSteps()) {
      btnNext.classList.add('hidden');
      btnPrev.classList.remove('hidden');
    } else {
      btnNext.textContent = 'Suivant';
      btnNext.classList.remove('hidden');
      btnPrev.classList.remove('hidden');
    }
  },

  // ===== CONDITIONAL FIELDS (Step 4) =====

  updateStep4Fields() {
    const selected = this._getSelectedModels();
    const hasText = PromptBuilder.hasTextModel(selected);
    const hasVibe = PromptBuilder.hasVibeModel(selected);
    const hasImage = PromptBuilder.hasImageModel(selected);
    const hasVideo = PromptBuilder.hasVideoModel(selected);

    const textFields = document.getElementById('text-fields');
    const imageFields = document.getElementById('image-fields');
    const videoFields = document.getElementById('video-fields');

    if (textFields) textFields.classList.toggle('hidden', !(hasText || hasVibe));
    if (imageFields) imageFields.classList.toggle('hidden', !hasImage);
    if (videoFields) videoFields.classList.toggle('hidden', !hasVideo);
  },

  _getSelectedModels() {
    const models = [];
    document.querySelectorAll('.llm-card.selected').forEach(card => {
      models.push(card.dataset.llm);
    });
    return models;
  },

  // ===== VALIDATION =====

  validateCurrentStep() {
    this._hideAllErrors();
    const stepId = this._getCurrentStepId();

    switch (stepId) {
      case 'step-prompt-1': {
        const models = document.querySelectorAll('.llm-card.selected');
        if (models.length === 0) {
          this._showError('error-step1');
          return false;
        }
        const task = document.querySelector('.task-card.selected');
        if (!task) {
          this._showError('error-step2');
          return false;
        }
        if (task.dataset.task === 'autre') {
          const custom = document.getElementById('custom-task-input').value.trim();
          if (!custom) { this._showError('error-step2'); return false; }
        }
        return true;
      }
      case 'step-agent-1': {
        if (!document.querySelector('.agent-platform-card.selected')) {
          this._showError('error-agent-1');
          return false;
        }
        return true;
      }
      case 'step-agent-2': {
        if (!document.getElementById('agent-description').value.trim()) {
          this._showError('error-agent-2');
          return false;
        }
        return true;
      }
      case 'step-agent-3': {
        const p = this.agentPlatform;
        const instrId = p === 'claude' ? 'agent-claude-instructions' : p === 'chatgpt' ? 'agent-chatgpt-instructions' : 'agent-gemini-instructions';
        if (!document.getElementById(instrId).value.trim()) {
          this._showError('error-agent-3');
          return false;
        }
        return true;
      }
      case 'step-prompt-2':
        return true;
      case 'step-prompt-3': {
        const selected = this._getSelectedModels();
        const hasText = PromptBuilder.hasTextModel(selected);
        const hasVibe = PromptBuilder.hasVibeModel(selected);
        const hasImage = PromptBuilder.hasImageModel(selected);
        const hasVideo = PromptBuilder.hasVideoModel(selected);

        if (hasText || hasVibe) {
          const desc = document.getElementById('task-description').value.trim();
          if (!desc) { this._showError('error-step4'); return false; }
        }
        if (hasImage) {
          const subj = document.getElementById('img-subject').value.trim();
          if (!subj) { this._showError('error-step4'); return false; }
        }
        if (hasVideo) {
          const subj = document.getElementById('vid-subject').value.trim();
          if (!subj) { this._showError('error-step4'); return false; }
        }
        return true;
      }
      default:
        return true;
    }
  },

  _showError(errorId) {
    const el = document.getElementById(errorId);
    if (el) el.classList.remove('hidden');
  },

  _hideAllErrors() {
    document.querySelectorAll('.validation-error').forEach(e => e.classList.add('hidden'));
  },

  // ===== "AUTRE" PATTERN =====

  _bindAutrePattern(selectId, inputId) {
    const select = document.getElementById(selectId);
    const input = document.getElementById(inputId);
    if (!select || !input) return;

    select.addEventListener('change', () => {
      const isAutre = select.value === 'autre';
      input.classList.toggle('hidden', !isAutre);
      if (isAutre) input.focus();
    });
  },

  // ===== LLM CARDS (Step 1) =====

  renderLLMCards() {
    const grid = document.getElementById('llm-grid');
    grid.innerHTML = '';
    Object.entries(LLMAdapters.config).forEach(([key, cfg]) => {
      const card = this._createModelCard(key, cfg);
      grid.appendChild(card);
    });
  },

  renderImageModelCards() {
    const grid = document.getElementById('image-grid');
    if (!grid) return;
    grid.innerHTML = '';
    Object.entries(LLMAdapters.imageConfig).forEach(([key, cfg]) => {
      const card = this._createModelCard(key, cfg);
      grid.appendChild(card);
    });
  },

  renderVideoModelCards() {
    const grid = document.getElementById('video-grid');
    if (!grid) return;
    grid.innerHTML = '';
    Object.entries(LLMAdapters.videoConfig).forEach(([key, cfg]) => {
      const card = this._createModelCard(key, cfg);
      grid.appendChild(card);
    });
  },

  renderVibeModelCards() {
    const grid = document.getElementById('vibe-grid');
    if (!grid) return;
    grid.innerHTML = '';
    Object.entries(LLMAdapters.vibeConfig).forEach(([key, cfg]) => {
      const card = this._createModelCard(key, cfg);
      grid.appendChild(card);
    });
  },

  _createModelCard(key, cfg) {
    const card = document.createElement('div');
    card.className = 'llm-card';
    card.dataset.llm = key;
    const initial = cfg.name.charAt(0).toUpperCase();
    card.innerHTML = `
      <div class="llm-icon-img"><img src="${cfg.icon}" alt="${cfg.name}" loading="lazy" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'"><span class="llm-icon-fallback" style="display:none">${initial}</span></div>
      <div class="llm-info">
        <h3>${cfg.name}</h3>
        <p>${cfg.description}</p>
      </div>
    `;
    card.setAttribute('tabindex', '0');
    card.setAttribute('role', 'option');
    const toggleCard = () => { card.classList.toggle('selected'); this._hideAllErrors(); };
    card.addEventListener('click', toggleCard);
    card.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleCard(); } });
    return card;
  },

  // ===== TASK CARDS (Step 2) =====

  renderTaskCards() {
    const grid = document.getElementById('task-grid');
    grid.innerHTML = '';

    const tasks = [
      { key: 'redaction', icon: '✍️', label: 'Rédaction / Génération' },
      { key: 'analyse', icon: '🔍', label: 'Analyse / Résumé' },
      { key: 'code', icon: '💻', label: 'Code / Développement' },
      { key: 'extraction', icon: '📥', label: 'Extraction de données' },
      { key: 'classification', icon: '🏷️', label: 'Classification / Tri' },
      { key: 'traduction', icon: '🌐', label: 'Traduction / Transformation' },
      { key: 'qa-rag', icon: '❓', label: 'Question-Réponse / RAG' },
      { key: 'agent', icon: '🤖', label: 'Agent / Automatisation' },
      { key: 'brainstorming', icon: '💡', label: 'Brainstorming / Créativité' },
      { key: 'ia-llm', icon: '🧠', label: 'IA & LLM' },
      { key: 'claude-code', icon: 'img/logos/claude-code.png', label: 'Claude Code', isLogo: true },
      { key: 'n8n', icon: 'img/logos/n8n.png', label: 'n8n / Workflow IA', isLogo: true },
      { key: 'image-gen', icon: '🎨', label: 'Génération d\'images' },
      { key: 'video-gen', icon: '🎬', label: 'Génération de vidéos' },
      { key: 'autre', icon: '⚙️', label: 'Autre' }
    ];

    tasks.forEach(t => {
      const card = document.createElement('div');
      card.className = 'task-card';
      card.dataset.task = t.key;
      const iconHtml = t.isLogo
        ? `<img class="task-icon-img" src="${t.icon}" alt="${t.label}" loading="lazy">`
        : `<span class="task-icon">${t.icon}</span>`;
      card.innerHTML = `${iconHtml} ${t.label}`;
      card.setAttribute('tabindex', '0');
      card.setAttribute('role', 'option');
      const selectTask = () => {
        document.querySelectorAll('.task-card').forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        this._hideAllErrors();

        const customDiv = document.getElementById('custom-task');
        customDiv.classList.toggle('hidden', t.key !== 'autre');

        this.updateCoTRecommendation(t.key);
      };
      card.addEventListener('click', selectTask);
      card.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); selectTask(); } });
      grid.appendChild(card);
    });
  },

  // ===== ADVANCED OPTIONS (Step 5) =====

  updateCoTRecommendation(taskType) {
    const badge = document.getElementById('cot-recommendation');
    const toggle = document.getElementById('cot-toggle');

    if (PromptBuilder.shouldRecommendCoT(taskType)) {
      badge.classList.remove('hidden');
      if (!toggle.dataset.manuallyChanged) {
        toggle.checked = true;
      }
    } else {
      badge.classList.add('hidden');
    }
  },

  addFewShotExample() {
    const container = document.getElementById('few-shot-examples');
    const pair = document.createElement('div');
    pair.className = 'example-pair';
    pair.innerHTML = `
      <button class="btn-remove" title="Supprimer">&times;</button>
      <div class="form-group">
        <label>Entrée (ce que l'utilisateur envoie au LLM)</label>
        <textarea class="example-input" rows="2" placeholder="Ex: 'Résume ce texte en 3 points'"></textarea>
      </div>
      <div class="form-group">
        <label>Sortie attendue (la réponse idéale du LLM)</label>
        <textarea class="example-output" rows="2" placeholder="Ex: '1. Point principal... 2. Détail... 3. Conclusion...'"></textarea>
      </div>
    `;
    pair.querySelector('.btn-remove').addEventListener('click', () => {
      pair.remove();
      this._updateFewShotCount();
    });
    container.appendChild(pair);
    this._updateFewShotCount();
  },

  _updateFewShotCount() {
    const count = document.querySelectorAll('.example-pair').length;
    const badge = document.getElementById('few-shot-count');
    badge.textContent = count;
    badge.classList.toggle('hidden', count === 0);
  },

  // ===== MODE TOGGLE & AGENT UI =====

  setMode(newMode) {
    if (newMode === this.mode) return;
    this.mode = newMode;
    this.currentStep = 1;
    this.maxStepReached = 1;
    this.smartQuestionsGenerated = false;
    this.generatedPrompts = {};
    this.originalPrompts = {};
    this.agentPlatform = null;

    // Update all mode toggle buttons across both first steps
    document.querySelectorAll('.mode-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.mode === newMode);
    });

    // Re-render step indicators for new mode
    this.renderStepIndicators();
    this.showStep(1);
  },

  renderAgentPlatformCards() {
    const grid = document.getElementById('agent-platform-grid');
    if (!grid) return;

    const platforms = [
      { key: 'claude', name: 'Projet', type: 'Claude', logo: 'img/logos/claude.png', desc: 'Sur quoi travaillez-vous, instructions' },
      { key: 'chatgpt', name: 'GPT', type: 'ChatGPT', logo: 'img/logos/chatgpt.png', desc: 'Nom, description, instructions, amorces' },
      { key: 'gemini', name: 'Gem', type: 'Gemini', logo: 'img/logos/gemini.png', desc: 'Nom, description, instructions' }
    ];

    grid.innerHTML = platforms.map(p => `
      <div class="agent-platform-card" data-platform="${p.key}">
        <img class="platform-logo" src="${p.logo}" alt="${p.type}">
        <span class="platform-name">${p.name}</span>
        <span class="platform-type">${p.type}</span>
        <span class="platform-desc">${p.desc}</span>
      </div>
    `).join('');

    // Single select: click selects one, deselects others
    grid.querySelectorAll('.agent-platform-card').forEach(card => {
      card.addEventListener('click', () => {
        grid.querySelectorAll('.agent-platform-card').forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        this.agentPlatform = card.dataset.platform;
      });
    });
  },

  showAgentFieldsForPlatform() {
    const blocks = ['agent-fields-claude', 'agent-fields-chatgpt', 'agent-fields-gemini'];
    blocks.forEach(id => document.getElementById(id)?.classList.add('hidden'));

    const platformMap = { claude: 'agent-fields-claude', chatgpt: 'agent-fields-chatgpt', gemini: 'agent-fields-gemini' };
    const target = platformMap[this.agentPlatform];
    if (target) document.getElementById(target)?.classList.remove('hidden');

    // Update title
    const titles = { claude: 'Configuration de votre Projet Claude', chatgpt: 'Configuration de votre GPT', gemini: 'Configuration de votre Gem Gemini' };
    const titleEl = document.getElementById('agent-fields-title');
    if (titleEl && titles[this.agentPlatform]) titleEl.textContent = titles[this.agentPlatform];

    // Render default starters for ChatGPT if empty
    if (this.agentPlatform === 'chatgpt') {
      const container = document.getElementById('agent-chatgpt-starters');
      if (container && container.children.length === 0) {
        this._renderConversationStarters(['', '', '', '']);
      }
    }
  },

  _renderConversationStarters(starters) {
    const container = document.getElementById('agent-chatgpt-starters');
    if (!container) return;
    container.innerHTML = '';
    starters.forEach((text, i) => {
      const row = document.createElement('div');
      row.className = 'starter-input-row';
      row.innerHTML = `
        <input type="text" class="starter-input" placeholder="Amorce ${i + 1}..." value="${this._escapeHTML(text)}">
        <button class="btn-remove-starter" title="Supprimer">&times;</button>
      `;
      row.querySelector('.btn-remove-starter').addEventListener('click', () => {
        row.remove();
      });
      container.appendChild(row);
    });
  },

  _collectConversationStarters() {
    const inputs = document.querySelectorAll('#agent-chatgpt-starters .starter-input');
    return Array.from(inputs).map(inp => inp.value.trim()).filter(v => v);
  },

  _addConversationStarter() {
    const container = document.getElementById('agent-chatgpt-starters');
    if (!container) return;
    const count = container.children.length;
    const row = document.createElement('div');
    row.className = 'starter-input-row';
    row.innerHTML = `
      <input type="text" class="starter-input" placeholder="Amorce ${count + 1}...">
      <button class="btn-remove-starter" title="Supprimer">&times;</button>
    `;
    row.querySelector('.btn-remove-starter').addEventListener('click', () => {
      row.remove();
    });
    container.appendChild(row);
    row.querySelector('.starter-input').focus();
  },

  _escapeHTML(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  },

  // ===== AGENT EXTRACTION (Step agent-2 → pre-fill agent-3) =====

  async extractAgentFields() {
    const apiKey = localStorage.getItem('pf_api_key');
    const openaiKey = localStorage.getItem('pf_openai_key');
    if (!apiKey && !openaiKey) return;

    const description = document.getElementById('agent-description').value.trim();
    if (!description) return;

    const status = document.getElementById('agent-extract-status');
    const statusText = document.getElementById('agent-extract-status-text');
    status.classList.remove('hidden', 'success', 'error');
    statusText.textContent = 'Analyse en cours...';

    try {
      const response = await fetch('/api/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          freeText: description,
          mode: 'agent',
          platform: this.agentPlatform,
          apiKey,
          openaiKey
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Erreur d\'analyse');
      }

      const result = await response.json();
      if (result.extracted) {
        this._prefillAgentFields(result.extracted);
        status.classList.add('success');
        statusText.textContent = 'Champs pre-remplis avec succes';
        const provider = result.fallback ? `${result.provider} (secours)` : result.provider;
        UIHelpers.showToast(
          `Analyse via ${provider} (${result.inputTokens} in / ${result.outputTokens} out)`,
          'info', 3000
        );
      } else {
        status.classList.add('error');
        statusText.textContent = 'Analyse impossible - remplissez manuellement';
      }
    } catch (error) {
      status.classList.add('error');
      statusText.textContent = 'Erreur - remplissez manuellement';
      console.error('Agent extract error:', error.message);
    }
  },

  _prefillAgentFields(data) {
    if (!data) return;
    const p = this.agentPlatform;

    if (p === 'claude') {
      if (data.workingOn) document.getElementById('agent-claude-working-on').value = data.workingOn;
      if (data.tryingToDo) document.getElementById('agent-claude-trying-to').value = data.tryingToDo;
      if (data.instructions) document.getElementById('agent-claude-instructions').value = data.instructions;
    } else if (p === 'chatgpt') {
      if (data.name) document.getElementById('agent-chatgpt-name').value = data.name;
      if (data.description) document.getElementById('agent-chatgpt-description').value = data.description;
      if (data.instructions) document.getElementById('agent-chatgpt-instructions').value = data.instructions;
      if (data.conversationStarters && data.conversationStarters.length > 0) {
        this._renderConversationStarters(data.conversationStarters);
      }
    } else if (p === 'gemini') {
      if (data.name) document.getElementById('agent-gemini-name').value = data.name;
      if (data.description) document.getElementById('agent-gemini-description').value = data.description;
      if (data.instructions) document.getElementById('agent-gemini-instructions').value = data.instructions;
    }
  },

  // ===== FREE TEXT EXTRACTION (Step 2 → pre-fill Steps 3-5) =====

  async extractFromFreeText(freeText) {
    const apiKey = localStorage.getItem('pf_api_key');
    const openaiKey = localStorage.getItem('pf_openai_key');
    if (!apiKey && !openaiKey) return;

    const status = document.getElementById('extract-status');
    const statusText = document.getElementById('extract-status-text');
    status.classList.remove('hidden', 'success', 'error');
    statusText.textContent = 'Analyse en cours...';

    const taskCard = document.querySelector('.task-card.selected');
    const taskType = taskCard ? taskCard.dataset.task : '';
    const models = Array.from(document.querySelectorAll('.llm-card.selected')).map(c => c.dataset.llm);

    try {
      const response = await fetch('/api/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ freeText, taskType, models, apiKey, openaiKey })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Erreur d\'analyse');
      }

      const result = await response.json();
      if (result.extracted) {
        this._prefillFromExtracted(result.extracted);
        status.classList.add('success');
        statusText.textContent = 'Champs pre-remplis avec succes';
        const provider = result.fallback ? `${result.provider} (secours)` : result.provider;
        UIHelpers.showToast(
          `Analyse via ${provider} (${result.inputTokens} in / ${result.outputTokens} out)`,
          'info', 3000
        );
      } else {
        status.classList.add('error');
        statusText.textContent = 'Analyse impossible - continuez manuellement';
      }
    } catch (error) {
      status.classList.add('error');
      statusText.textContent = 'Erreur - continuez manuellement';
      console.error('Extract error:', error.message);
    }

    // Store free text for smart questions anti-duplication
    this._freeTextData = freeText;
  },

  _prefillFromExtracted(data) {
    if (!data) return;
    let filled = 0;

    // Step 2 - Persona
    if (data.persona && !document.getElementById('persona').value.trim()) {
      document.getElementById('persona').value = data.persona;
      filled++;
    }

    // Step 3 - Multi-selects
    if (data.domain) filled += this._prefillMultiSelect('ms-domain', data.domain);
    if (data.audience) filled += this._prefillMultiSelect('ms-audience', data.audience);
    if (data.tone) filled += this._prefillMultiSelect('ms-tone', data.tone);
    if (data.outputLanguage) filled += this._prefillMultiSelect('ms-output-language', data.outputLanguage);

    // Step 4 - Text fields
    if (data.taskDescription && !document.getElementById('task-description').value.trim()) {
      document.getElementById('task-description').value = data.taskDescription;
      filled++;
    }
    if (data.inputDescription && !document.getElementById('input-description').value.trim()) {
      document.getElementById('input-description').value = data.inputDescription;
      filled++;
    }
    if (data.outputFormat) {
      const select = document.getElementById('output-format');
      if (select) {
        const option = select.querySelector(`option[value="${data.outputFormat}"]`);
        if (option) { select.value = data.outputFormat; filled++; }
      }
    }
    if (data.constraints && !document.getElementById('constraints').value.trim()) {
      document.getElementById('constraints').value = data.constraints;
      filled++;
    }

    // Step 5 - Complexity
    if (data.complexity) {
      const radio = document.querySelector(`input[name="complexity"][value="${data.complexity}"]`);
      if (radio) { radio.checked = true; filled++; }
    }

    if (filled > 0) {
      UIHelpers.showToast(`${filled} champ(s) pre-rempli(s)`, 'success', 2000);
    }
  },

  _prefillMultiSelect(msId, value) {
    const ms = document.getElementById(msId);
    if (!ms || !ms._options || !ms._selected) return 0;

    // Don't overwrite if already has selections
    if (ms._selected.length > 0) return 0;

    // Try to find matching option by value or label (case-insensitive)
    const valueLower = value.toLowerCase();
    const match = ms._options.find(opt =>
      opt.value.toLowerCase() === valueLower ||
      opt.label.toLowerCase() === valueLower ||
      opt.label.toLowerCase().includes(valueLower) ||
      valueLower.includes(opt.value.toLowerCase())
    );

    if (match) {
      this._toggleMultiOption(ms, match.value, match.label);
      return 1;
    }

    // No match: add as custom value
    const customValue = 'custom-' + valueLower.replace(/\s+/g, '-');
    this._toggleMultiOption(ms, customValue, value);
    return 1;
  },

  // ===== SMART QUESTIONS (Step 6) =====

  triggerSmartQuestions() {
    if (this.smartQuestionsGenerated) return;

    const apiKey = localStorage.getItem('pf_api_key');
    const openaiKey = localStorage.getItem('pf_openai_key');
    if (!apiKey && !openaiKey) {
      document.getElementById('questions-loading').classList.add('hidden');
      document.getElementById('smart-questions-skip').classList.remove('hidden');
      return;
    }

    this.generateSmartQuestions();
  },

  async generateSmartQuestions() {
    const apiKey = localStorage.getItem('pf_api_key');
    const openaiKey = localStorage.getItem('pf_openai_key');
    if (!apiKey && !openaiKey) return;

    const loading = document.getElementById('questions-loading');
    const errorDiv = document.getElementById('smart-questions-error');
    const skipDiv = document.getElementById('smart-questions-skip');
    const listDiv = document.getElementById('smart-questions-list');

    loading.classList.remove('hidden');
    errorDiv.classList.add('hidden');
    skipDiv.classList.add('hidden');
    listDiv.classList.add('hidden');

    let formData;
    if (this.mode === 'agent') {
      const agentData = this.collectAgentData();
      formData = {
        mode: 'agent',
        agentData,
        agentDescription: document.getElementById('agent-description')?.value?.trim() || ''
      };
    } else {
      formData = PromptBuilder.collectFormData();
    }

    try {
      const response = await fetch('/api/questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ formData, apiKey, openaiKey })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Erreur lors de la generation des questions');
      }

      const result = await response.json();
      this.renderSmartQuestions(result.questions);
      this.smartQuestionsGenerated = true;

      const providerLabel = result.fallback ? `${result.provider} (secours)` : result.provider;
      if (result.inputTokens || result.outputTokens) {
        UIHelpers.showToast(
          `Questions generees via ${providerLabel} (${result.inputTokens} in / ${result.outputTokens} out)`,
          'info', 4000
        );
      }
    } catch (error) {
      loading.classList.add('hidden');
      errorDiv.classList.remove('hidden');
      UIHelpers.showToast('Erreur : ' + error.message, 'error', 5000);
    }
  },

  renderSmartQuestions(questions) {
    const loading = document.getElementById('questions-loading');
    const listDiv = document.getElementById('smart-questions-list');

    loading.classList.add('hidden');
    listDiv.innerHTML = '';

    if (!questions || questions.length === 0) {
      listDiv.innerHTML = '<p class="helper-text">Aucune question supplementaire necessaire.</p>';
      listDiv.classList.remove('hidden');
      return;
    }

    questions.forEach((q) => {
      const div = document.createElement('div');
      div.className = 'smart-question';
      div.dataset.questionId = q.id || ('q-' + Math.random().toString(36).slice(2, 8));

      let fieldHtml = '';
      if (q.type === 'textarea') {
        fieldHtml = `<textarea class="smart-answer" rows="3" placeholder="${q.placeholder || ''}"></textarea>`;
      } else if (q.type === 'choice' && q.options) {
        fieldHtml = `<select class="smart-answer smart-answer-select">
          <option value="">Choisir</option>
          ${q.options.map(o => `<option value="${o}">${o}</option>`).join('')}
          <option value="__autre__">Autre (saisie libre)...</option>
        </select>
        <input type="text" class="smart-answer-autre autre-input hidden" placeholder="Votre réponse personnalisée...">`;
      } else {
        fieldHtml = `<input type="text" class="smart-answer" placeholder="${q.placeholder || ''}">`;
      }

      div.innerHTML = `<label>${q.question}</label>${fieldHtml}`;
      listDiv.appendChild(div);

      // Bind "Autre" toggle for choice questions
      const select = div.querySelector('.smart-answer-select');
      const autreInput = div.querySelector('.smart-answer-autre');
      if (select && autreInput) {
        select.addEventListener('change', () => {
          const isAutre = select.value === '__autre__';
          autreInput.classList.toggle('hidden', !isAutre);
          if (isAutre) autreInput.focus();
        });
      }
    });

    listDiv.classList.remove('hidden');
  },

  collectSmartAnswers() {
    const answers = [];
    document.querySelectorAll('.smart-question').forEach(q => {
      const id = q.dataset.questionId;
      const input = q.querySelector('.smart-answer');
      let value = input ? input.value.trim() : '';

      // If select has "autre" chosen, use the free-text input value
      if (value === '__autre__') {
        const autreInput = q.querySelector('.smart-answer-autre');
        value = autreInput ? autreInput.value.trim() : '';
      }

      if (value) {
        const label = q.querySelector('label').textContent;
        answers.push({ question: label, answer: value });
      }
    });
    return answers;
  },

  // ===== AGENT DATA COLLECTION & PREVIEW =====

  collectAgentData() {
    const p = this.agentPlatform;
    const base = { platform: p };

    if (p === 'claude') {
      return {
        ...base,
        workingOn: document.getElementById('agent-claude-working-on').value.trim(),
        tryingToDo: document.getElementById('agent-claude-trying-to').value.trim(),
        instructions: document.getElementById('agent-claude-instructions').value.trim()
      };
    } else if (p === 'chatgpt') {
      return {
        ...base,
        name: document.getElementById('agent-chatgpt-name').value.trim(),
        description: document.getElementById('agent-chatgpt-description').value.trim(),
        instructions: document.getElementById('agent-chatgpt-instructions').value.trim(),
        conversationStarters: this._collectConversationStarters()
      };
    } else if (p === 'gemini') {
      return {
        ...base,
        name: document.getElementById('agent-gemini-name').value.trim(),
        description: document.getElementById('agent-gemini-description').value.trim(),
        instructions: document.getElementById('agent-gemini-instructions').value.trim()
      };
    }
    return base;
  },

  _agentDataToText(data) {
    if (!data) return '';
    const lines = [];
    const platformNames = { claude: 'Projet Claude', chatgpt: 'GPT ChatGPT', gemini: 'Gem Gemini' };
    lines.push(`Plateforme : ${platformNames[data.platform] || data.platform}`);
    lines.push('');

    if (data.platform === 'claude') {
      if (data.workingOn) lines.push(`Sur quoi travaillez-vous ?\n${data.workingOn}\n`);
      if (data.tryingToDo) lines.push(`Qu'essayez-vous de faire ?\n${data.tryingToDo}\n`);
      if (data.instructions) lines.push(`Instructions :\n${data.instructions}`);
    } else if (data.platform === 'chatgpt') {
      if (data.name) lines.push(`Nom : ${data.name}\n`);
      if (data.description) lines.push(`Description : ${data.description}\n`);
      if (data.instructions) lines.push(`Instructions :\n${data.instructions}\n`);
      if (data.conversationStarters && data.conversationStarters.length > 0) {
        lines.push(`Amorces de conversation :`);
        data.conversationStarters.forEach((s, i) => lines.push(`  ${i + 1}. ${s}`));
      }
    } else if (data.platform === 'gemini') {
      if (data.name) lines.push(`Nom : ${data.name}\n`);
      if (data.description) lines.push(`Description : ${data.description}\n`);
      if (data.instructions) lines.push(`Instructions :\n${data.instructions}`);
    }

    return lines.join('\n');
  },

  _renderAgentField(label, value) {
    if (!value) return '';
    return `<div class="agent-preview-card">
      <h4>${label}</h4>
      <div class="field-content">${this._escapeHTML(value).replace(/\n/g, '<br>')}</div>
    </div>`;
  },

  renderAgentPreview(data) {
    const preview = document.getElementById('prompt-preview');
    const editor = document.getElementById('prompt-editor');

    // Hide prompt-specific toolbar (tabs, split/combined, format, edit)
    document.getElementById('llm-tabs')?.classList.add('hidden');
    const toolbar = document.getElementById('preview-toolbar-tabs');
    if (toolbar) toolbar.classList.add('hidden');

    let html = '';
    const platformNames = { claude: 'Projet Claude', chatgpt: 'GPT ChatGPT', gemini: 'Gem Gemini' };

    html += `<div class="agent-preview-header" style="margin-bottom:var(--space-md);">
      <h3 style="margin:0;">${platformNames[data.platform] || data.platform}</h3>
    </div>`;

    if (data.platform === 'claude') {
      html += this._renderAgentField('Sur quoi travaillez-vous ?', data.workingOn);
      html += this._renderAgentField("Qu'essayez-vous de faire ?", data.tryingToDo);
      html += this._renderAgentField('Instructions', data.instructions);
    } else if (data.platform === 'chatgpt') {
      html += this._renderAgentField('Nom', data.name);
      html += this._renderAgentField('Description', data.description);
      html += this._renderAgentField('Instructions', data.instructions);
      if (data.conversationStarters && data.conversationStarters.length > 0) {
        html += `<div class="agent-preview-card">
          <h4>Amorces de conversation</h4>
          <ul class="agent-starters-list">
            ${data.conversationStarters.map(s => `<li class="agent-starter-item">${this._escapeHTML(s)}</li>`).join('')}
          </ul>
        </div>`;
      }
    } else if (data.platform === 'gemini') {
      html += this._renderAgentField('Nom', data.name);
      html += this._renderAgentField('Description', data.description);
      html += this._renderAgentField('Instructions', data.instructions);
    }

    preview.innerHTML = html;
    preview.classList.remove('hidden');
    editor.classList.add('hidden');

    // Store text version for copy/download
    const textVersion = this._agentDataToText(data);
    editor.value = textVersion;

    // Token count
    const tokens = UIHelpers.estimateTokens(textVersion);
    document.getElementById('token-counter').textContent = `~${tokens} tokens`;

    // Store agent data for optimization step
    this._currentAgentData = data;
  },

  // ===== PREVIEW & GENERATION (Step 7) =====

  generatePreview() {
    if (this.mode === 'agent') {
      const agentData = this.collectAgentData();
      this.renderAgentPreview(agentData);
      return;
    }
    const formData = PromptBuilder.collectFormData();
    this.generatedPrompts = PromptBuilder.generateAll(formData);
    // Save a copy as originals for comparison in step 8
    this.originalPrompts = JSON.parse(JSON.stringify(this.generatedPrompts));
    // Show prompt-specific toolbar
    document.getElementById('llm-tabs')?.classList.remove('hidden');
    const toolbar = document.getElementById('preview-toolbar-tabs');
    if (toolbar) toolbar.classList.remove('hidden');
    this.renderLLMTabs();
    const firstModel = formData.targetLLMs[0];
    this.showPromptForLLM(firstModel);
  },

  renderLLMTabs() {
    const tabsContainer = document.getElementById('llm-tabs');
    tabsContainer.innerHTML = '';
    const allConfigs = { ...LLMAdapters.config, ...LLMAdapters.imageConfig, ...LLMAdapters.videoConfig, ...LLMAdapters.vibeConfig };

    Object.keys(this.generatedPrompts).forEach(key => {
      const cfg = allConfigs[key];
      const tab = document.createElement('button');
      tab.className = 'llm-tab';
      tab.dataset.llm = key;
      tab.textContent = cfg ? cfg.name : key;
      tab.addEventListener('click', () => this.showPromptForLLM(key));
      tabsContainer.appendChild(tab);
    });
  },

  showPromptForLLM(llmKey) {
    this.activeLLMTab = llmKey;

    document.querySelectorAll('#llm-tabs .llm-tab').forEach(t => {
      t.classList.toggle('active', t.dataset.llm === llmKey);
    });

    const adapted = this.generatedPrompts[llmKey];
    const preview = document.getElementById('prompt-preview');

    if (this.previewMode === 'split' && adapted.systemPrompt && adapted.userPrompt) {
      // Split view: two separate panels
      const combinedMarkdown = LLMAdapters.renderPreview(adapted, llmKey, 'combined');
      document.getElementById('prompt-editor').value = combinedMarkdown;
      this._renderSplitView(preview, adapted.systemPrompt, adapted.userPrompt, this.displayFormat);
    } else {
      // Combined view: single block
      const markdown = LLMAdapters.renderPreview(adapted, llmKey, 'combined');
      document.getElementById('prompt-editor').value = markdown;
      this._renderWithFormat(preview, markdown, this.displayFormat);
    }

    const rawText = LLMAdapters.getRawPrompt(adapted);
    const tokens = UIHelpers.estimateTokens(rawText);
    document.getElementById('token-counter').textContent = `~${tokens} tokens`;

    this.setEditMode(false);
  },

  setPreviewMode(mode) {
    this.previewMode = mode;

    document.getElementById('btn-mode-split').classList.toggle('active', mode === 'split');
    document.getElementById('btn-mode-combined').classList.toggle('active', mode === 'combined');

    if (this.activeLLMTab && this.generatedPrompts[this.activeLLMTab]) {
      this.showPromptForLLM(this.activeLLMTab);
    }
  },

  setEditMode(isEdit) {
    this.editMode = isEdit;
    const editor = document.getElementById('prompt-editor');
    const preview = document.getElementById('prompt-preview');
    const btnEdit = document.getElementById('btn-edit-mode');

    if (isEdit) {
      editor.classList.remove('hidden');
      preview.classList.add('hidden');
      btnEdit.classList.add('active');
    } else {
      editor.classList.add('hidden');
      preview.classList.remove('hidden');
      btnEdit.classList.remove('active');
      // Re-render respecting current mode (split vs combined)
      const llmKey = this.activeLLMTab;
      const adapted = llmKey ? this.generatedPrompts[llmKey] : null;
      if (this.previewMode === 'split' && adapted && adapted.systemPrompt && adapted.userPrompt) {
        this._renderSplitView(preview, adapted.systemPrompt, adapted.userPrompt, this.displayFormat);
      } else {
        this._renderWithFormat(preview, editor.value, this.displayFormat);
      }
    }
  },

  setDisplayFormat(format) {
    this.displayFormat = format;

    // Update button label
    const labels = { plaintext: 'Texte', rendered: 'HTML', markdown: 'Source' };
    const btn = document.getElementById('btn-format');
    if (btn) btn.textContent = (labels[format] || 'Texte') + ' \u25BE';

    // Update active state in menu
    document.querySelectorAll('#format-menu .format-option').forEach(opt => {
      opt.classList.toggle('active', opt.dataset.format === format);
    });

    // Re-render if not in edit mode
    if (!this.editMode && this.activeLLMTab) {
      // Re-trigger full render to handle split vs combined
      this.showPromptForLLM(this.activeLLMTab);
    }
  },

  _renderSplitView(container, systemPrompt, userPrompt, format) {
    const copyIcon = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>';
    container.style.whiteSpace = '';

    // Build DOM elements directly to avoid querySelector issues
    const wrapper = document.createElement('div');
    wrapper.className = 'split-view';

    const systemPane = document.createElement('div');
    systemPane.className = 'split-pane';
    systemPane.innerHTML = `<div class="split-pane-header"><span class="pane-icon system-icon">S</span>System Prompt<button class="btn-copy-pane" data-target="system">${copyIcon} Copier</button></div>`;
    const systemBody = document.createElement('div');
    systemBody.className = 'split-pane-body';
    systemPane.appendChild(systemBody);

    const userPane = document.createElement('div');
    userPane.className = 'split-pane';
    userPane.innerHTML = `<div class="split-pane-header"><span class="pane-icon user-icon">U</span>User Prompt<button class="btn-copy-pane" data-target="user">${copyIcon} Copier</button></div>`;
    const userBody = document.createElement('div');
    userBody.className = 'split-pane-body';
    userPane.appendChild(userBody);

    wrapper.appendChild(systemPane);
    wrapper.appendChild(userPane);

    container.innerHTML = '';
    container.appendChild(wrapper);

    // Render content directly into the elements we just created
    this._renderPaneContent(systemBody, systemPrompt, format);
    this._renderPaneContent(userBody, userPrompt, format);

    // Bind copy buttons
    container.querySelectorAll('.btn-copy-pane').forEach(btn => {
      btn.addEventListener('click', () => {
        const text = btn.dataset.target === 'system' ? systemPrompt : userPrompt;
        UIHelpers.copyToClipboard(text).then(() => UIHelpers.showToast('Copie !', 'success'));
      });
    });
  },

  _renderPaneContent(pane, text, format) {
    switch (format) {
      case 'markdown':
        pane.innerHTML = `<pre class="format-source"><code>${UIHelpers.escapeHtml(this._xmlToMarkdown(text))}</code></pre>`;
        pane.style.whiteSpace = '';
        break;
      case 'rendered':
        pane.style.whiteSpace = '';
        pane.innerHTML = UIHelpers.renderMarkdown(this._xmlToMarkdown(text));
        break;
      case 'plaintext':
      default:
        pane.style.whiteSpace = 'pre-wrap';
        pane.textContent = this._xmlToReadableText(text);
        break;
    }
  },

  /**
   * Parse a markdown/text block to extract system and user prompt parts.
   * Works with common separators from renderPreview and API responses.
   */
  _parseSplitFromMarkdown(markdown) {
    // Try common separator patterns
    const patterns = [
      /## System Prompt\s*\n```\n([\s\S]*?)\n```\s*\n+## User Prompt\s*\n```\n([\s\S]*?)\n```/,
      /=== SYSTEM PROMPT ===\s*\n([\s\S]*?)\n=== USER PROMPT ===\s*\n([\s\S]*?)$/,
      /\[SYSTEM\]\s*\n([\s\S]*?)\n\[USER\]\s*\n([\s\S]*?)$/i,
      /SYSTEM PROMPT[:\s]*\n([\s\S]*?)\n(?:USER PROMPT|---)[:\s]*\n([\s\S]*?)$/i,
    ];
    for (const pattern of patterns) {
      const match = markdown.match(pattern);
      if (match) {
        return { systemPrompt: match[1].trim(), userPrompt: match[2].trim() };
      }
    }
    // Fallback: try splitting on "---" separator
    const dashSplit = markdown.split(/\n---\n/);
    if (dashSplit.length >= 2) {
      return { systemPrompt: dashSplit[0].trim(), userPrompt: dashSplit.slice(1).join('\n---\n').trim() };
    }
    return null;
  },

  _renderWithFormat(container, markdown, format) {
    switch (format) {
      case 'markdown': {
        // Clean XML inside the markdown (convert code block content to readable markdown)
        const cleaned = this._cleanMarkdownContent(markdown);
        container.innerHTML = `<pre class="format-source"><code>${UIHelpers.escapeHtml(cleaned)}</code></pre>`;
        container.style.whiteSpace = '';
        break;
      }
      case 'rendered': {
        const cleaned = this._cleanMarkdownContent(markdown);
        container.style.whiteSpace = '';
        container.innerHTML = UIHelpers.renderMarkdown(cleaned);
        break;
      }
      case 'plaintext':
      default:
        container.style.whiteSpace = 'pre-wrap';
        container.textContent = this._stripMarkdown(markdown);
        break;
    }
  },

  /**
   * Clean the markdown from renderPreview(): replace code-block-wrapped XML
   * content with proper markdown structure.
   */
  _cleanMarkdownContent(markdown) {
    // Replace code blocks containing XML with cleaned markdown
    return markdown
      .replace(/```\n([\s\S]*?)\n```/g, (_, content) => {
        return this._xmlToMarkdown(content);
      })
      // Notes: blockquotes → bullet points
      .replace(/^>\s*(.*)/gm, '- $1')
      .replace(/^- $/gm, '')
      .replace(/\n{3,}/g, '\n\n');
  },

  /**
   * Convert XML-tagged prompt text to clean readable French text (no markup at all).
   * Works for Claude/DeepSeek (XML tags) and is a no-op for ChatGPT/Gemini (plain text).
   */
  _xmlToReadableText(text) {
    if (!text) return '';
    const sectionLabels = {
      'context': 'Contexte',
      'task': 'Tache',
      'instructions': 'Instructions',
      'examples': 'Exemples',
      'constraints': 'Contraintes',
      'error_recovery': 'Gestion d\'erreur',
      'output_format': 'Format de sortie',
      'input_description': 'Donnees d\'entree',
      'optimization_context': 'Contexte d\'optimisation',
    };
    const fieldLabels = {
      'domain': 'Domaine',
      'audience': 'Public cible',
      'tone': 'Ton',
      'langue': 'Langue',
      'question': 'Question',
      'answer': 'Reponse',
      'input': 'Entree',
      'output': 'Sortie',
    };
    let result = text;
    // Section opening tags → French label on its own line
    for (const [tag, label] of Object.entries(sectionLabels)) {
      result = result.replace(new RegExp(`<${tag}>`, 'gi'), `\n${label}\n`);
    }
    // Field tags with inline content: <tag>content</tag> → "Label : content"
    for (const [tag, label] of Object.entries(fieldLabels)) {
      result = result.replace(new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`, 'gi'), `${label} : $1`);
    }
    // Wrapper tags (no label needed): <example>, <detail>
    result = result.replace(/<\/?(?:example|detail)>/gi, '');
    // Thinking tags
    result = result.replace(/<\/?(?:thinking|think)>/gi, '');
    // Remove all remaining closing tags
    result = result.replace(/<\/[a-zA-Z_-]+>/g, '');
    // Remove any remaining opening tags
    result = result.replace(/<[a-zA-Z_-]+>/g, '');
    // Clean up horizontal rules
    result = result.replace(/^---+$/gm, '');
    // Collapse excessive blank lines
    result = result.replace(/\n{3,}/g, '\n\n');
    // Clean leading/trailing whitespace per line but preserve indentation
    result = result.split('\n').map(l => l.trimEnd()).join('\n');
    return result.trim();
  },

  /**
   * Convert XML-tagged prompt text to well-structured Markdown.
   * No-op for prompts without XML (ChatGPT, Gemini).
   */
  _xmlToMarkdown(text) {
    if (!text) return '';
    const sectionHeaders = {
      'context': '### Contexte',
      'task': '### Tache',
      'instructions': '### Instructions',
      'examples': '### Exemples',
      'constraints': '### Contraintes',
      'error_recovery': '### Gestion d\'erreur',
      'output_format': '### Format de sortie',
      'input_description': '### Donnees d\'entree',
      'optimization_context': '### Contexte d\'optimisation',
    };
    const fieldBold = {
      'domain': 'Domaine',
      'audience': 'Public cible',
      'tone': 'Ton',
      'langue': 'Langue',
      'question': 'Question',
      'answer': 'Reponse',
      'input': 'Entree',
      'output': 'Sortie',
    };
    let result = text;
    // Section opening tags → markdown headers
    for (const [tag, header] of Object.entries(sectionHeaders)) {
      result = result.replace(new RegExp(`<${tag}>`, 'gi'), `\n${header}\n`);
    }
    // Field tags → bold labels
    for (const [tag, label] of Object.entries(fieldBold)) {
      result = result.replace(new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`, 'gi'), `- **${label}** : $1`);
    }
    // Wrapper tags
    result = result.replace(/<\/?(?:example|detail)>/gi, '');
    result = result.replace(/<\/?(?:thinking|think)>/gi, '');
    // Remove remaining closing/opening tags
    result = result.replace(/<\/[a-zA-Z_-]+>/g, '');
    result = result.replace(/<[a-zA-Z_-]+>/g, '');
    // Clean horizontal rules
    result = result.replace(/^---+$/gm, '---');
    // Collapse excessive blank lines
    result = result.replace(/\n{3,}/g, '\n\n');
    return result.trim();
  },

  /**
   * Strip markdown wrapper (from renderPreview) and clean XML for plain text display.
   */
  _stripMarkdown(text) {
    return this._xmlToReadableText(
      text
        // Headings → label
        .replace(/^#{1,2}\s+(.*)/gm, (_, t) => t.toUpperCase())
        .replace(/^#{3,6}\s+(.*)/gm, '$1')
        // Bold/italic → plain
        .replace(/\*\*(.*?)\*\*/g, '$1')
        .replace(/\*(.*?)\*/g, '$1')
        // Code blocks → content only
        .replace(/`{3}[\s\S]*?`{3}/g, (m) => m.replace(/`{3}.*?\n?/g, '').trim())
        .replace(/`(.*?)`/g, '$1')
        // Blockquotes → plain
        .replace(/^>\s+/gm, '')
        // Lists → clean
        .replace(/^[-*+]\s+/gm, '- ')
        // Links → text only
        .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    );
  },

  // ===== FEEDBACK (Step 7) =====

  async applyFeedback() {
    const feedback = document.getElementById('preview-feedback').value.trim();
    if (!feedback) {
      UIHelpers.showToast('Veuillez decrire les modifications souhaitees.', 'error');
      return;
    }

    const apiKey = localStorage.getItem('pf_api_key');
    const openaiKey = localStorage.getItem('pf_openai_key');

    // If no API key, fallback to local regeneration
    if (!apiKey && !openaiKey) {
      const constraintsEl = document.getElementById('constraints');
      if (constraintsEl.value.trim()) {
        constraintsEl.value += '\n' + feedback;
      } else {
        constraintsEl.value = feedback;
      }
      this.generatePreview();
      document.getElementById('preview-feedback').value = '';
      UIHelpers.showToast('Prompt regenere localement (ajoutez une cle API pour la regeneration IA).', 'info');
      return;
    }

    const llmKey = this.activeLLMTab;
    if (!llmKey || !this.generatedPrompts[llmKey]) return;

    const currentPrompt = document.getElementById('prompt-editor').value;
    const formData = PromptBuilder.collectFormData();

    // Disable button during loading
    const btn = document.getElementById('btn-apply-feedback');
    const originalHtml = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-sm"></span> Regeneration...';

    try {
      const response = await fetch('/api/refine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: currentPrompt + '\n\n---\nFEEDBACK UTILISATEUR : ' + feedback,
          targetLLM: llmKey,
          taskType: formData.taskType,
          complexity: formData.complexity,
          apiKey,
          openaiKey
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Erreur de regeneration');
      }

      const result = await response.json();

      // Update the preview with the AI-refined version
      document.getElementById('prompt-editor').value = result.optimizedPrompt;
      this._renderWithFormat(document.getElementById('prompt-preview'), result.optimizedPrompt, this.displayFormat);

      const tokens = UIHelpers.estimateTokens(result.optimizedPrompt);
      document.getElementById('token-counter').textContent = `~${tokens} tokens`;

      document.getElementById('preview-feedback').value = '';
      const providerLabel = result.fallback ? `${result.provider} (secours)` : result.provider;
      UIHelpers.showToast(`Prompt regenere via ${providerLabel} !`, 'success');
    } catch (error) {
      UIHelpers.showToast('Erreur : ' + error.message, 'error', 5000);
    } finally {
      btn.disabled = false;
      btn.innerHTML = originalHtml;
    }
  },

  // ===== AI OPTIMIZATION (Step 8) =====

  prepareOptimizationStep() {
    if (this.mode === 'agent') {
      this._prepareAgentOptimization();
      return;
    }

    // Ensure we have generated prompts
    if (Object.keys(this.originalPrompts).length === 0) {
      this.generatePreview();
    }

    // Render tabs for step 8
    const tabsContainer = document.getElementById('llm-tabs-optimize');
    tabsContainer.innerHTML = '';
    const allConfigs = { ...LLMAdapters.config, ...LLMAdapters.imageConfig, ...LLMAdapters.videoConfig, ...LLMAdapters.vibeConfig };

    Object.keys(this.originalPrompts).forEach(key => {
      const cfg = allConfigs[key];
      const tab = document.createElement('button');
      tab.className = 'llm-tab';
      tab.dataset.llm = key;
      tab.textContent = cfg ? cfg.name : key;
      tab.addEventListener('click', () => this.showOptimizationForLLM(key));
      tabsContainer.appendChild(tab);
    });

    // Show first model
    const firstModel = Object.keys(this.originalPrompts)[0];
    this.showOptimizationForLLM(firstModel);
    this.checkApiKey();
  },

  _prepareAgentOptimization() {
    // Collect current agent data
    const agentData = this._currentAgentData || this.collectAgentData();
    this._originalAgentData = JSON.parse(JSON.stringify(agentData));
    this._optimizedAgentData = null;

    // Hide LLM tabs, show platform name instead
    const tabsContainer = document.getElementById('llm-tabs-optimize');
    const platformNames = { claude: 'Projet Claude', chatgpt: 'GPT ChatGPT', gemini: 'Gem Gemini' };
    tabsContainer.innerHTML = `<button class="llm-tab active">${platformNames[agentData.platform] || agentData.platform}</button>`;

    // Show original on the left
    const previewOriginal = document.getElementById('preview-original');
    const editorOriginal = document.getElementById('editor-original');
    previewOriginal.innerHTML = this._renderAgentPreviewCards(agentData);
    previewOriginal.classList.remove('hidden');
    editorOriginal.classList.add('hidden');
    const originalText = this._agentDataToText(agentData);
    const origTokens = UIHelpers.estimateTokens(originalText);
    document.getElementById('token-counter-original').textContent = `~${origTokens} tokens`;

    // Placeholder on the right
    document.getElementById('preview-optimized').innerHTML = '<div class="comparison-placeholder"><p>Cliquez sur &laquo; Optimiser &raquo; pour voir le resultat ici.</p></div>';
    document.getElementById('editor-optimized').classList.add('hidden');
    document.getElementById('preview-optimized').classList.remove('hidden');
    document.getElementById('token-counter-optimized').textContent = '';
    this._hideOptimizeRightPanelSections();

    this.checkApiKey();
  },

  _renderAgentPreviewCards(data) {
    let html = '';
    if (data.platform === 'claude') {
      html += this._renderAgentField('Sur quoi travaillez-vous ?', data.workingOn);
      html += this._renderAgentField("Qu'essayez-vous de faire ?", data.tryingToDo);
      html += this._renderAgentField('Instructions', data.instructions);
    } else if (data.platform === 'chatgpt') {
      html += this._renderAgentField('Nom', data.name);
      html += this._renderAgentField('Description', data.description);
      html += this._renderAgentField('Instructions', data.instructions);
      if (data.conversationStarters && data.conversationStarters.length > 0) {
        html += `<div class="agent-preview-card"><h4>Amorces de conversation</h4>
          <ul class="agent-starters-list">${data.conversationStarters.map(s => `<li class="agent-starter-item">${this._escapeHTML(s)}</li>`).join('')}</ul></div>`;
      }
    } else if (data.platform === 'gemini') {
      html += this._renderAgentField('Nom', data.name);
      html += this._renderAgentField('Description', data.description);
      html += this._renderAgentField('Instructions', data.instructions);
    }
    return html;
  },

  showOptimizationForLLM(llmKey) {
    this.activeLLMTabOptimize = llmKey;

    document.querySelectorAll('#llm-tabs-optimize .llm-tab').forEach(t => {
      t.classList.toggle('active', t.dataset.llm === llmKey);
    });

    // Show original prompt on the left
    this._renderComparisonPanel('original', llmKey);

    // Check if we have an optimized version
    const hasOptimized = this.generatedPrompts[llmKey] && this.generatedPrompts[llmKey]._optimized;
    if (hasOptimized) {
      this._renderComparisonPanel('optimized', llmKey);
      this._showOptimizeRightPanelSections(llmKey);
    } else {
      document.getElementById('preview-optimized').innerHTML = '<div class="comparison-placeholder"><p>Cliquez sur &laquo; Optimiser le prompt &raquo; pour voir le resultat ici.</p></div>';
      document.getElementById('editor-optimized').classList.add('hidden');
      document.getElementById('preview-optimized').classList.remove('hidden');
      document.getElementById('token-counter-optimized').textContent = '';
      this._hideOptimizeRightPanelSections();
    }
    this._updateOptimizeButton();
  },

  _showOptimizeRightPanelSections(llmKey) {
    // Show notes if available
    const notesEl = document.getElementById('optimize-notes');
    const notesContent = document.getElementById('optimize-notes-content');
    const notes = this.generatedPrompts[llmKey] && this.generatedPrompts[llmKey]._optimizeNotes;
    if (notes) {
      notesContent.innerHTML = UIHelpers.renderMarkdown(notes);
      notesEl.classList.remove('hidden');
    } else {
      notesEl.classList.add('hidden');
    }
    // Show feedback + actions
    document.getElementById('optimize-feedback-zone').classList.remove('hidden');
    document.getElementById('optimize-actions').classList.remove('hidden');
  },

  _hideOptimizeRightPanelSections() {
    document.getElementById('optimize-notes').classList.add('hidden');
    document.getElementById('optimize-feedback-zone').classList.add('hidden');
    document.getElementById('optimize-actions').classList.add('hidden');
  },

  _renderComparisonPanel(panel, llmKey) {
    const mode = this.step8Modes[panel];
    const format = this.step8Formats[panel];
    const preview = document.getElementById(`preview-${panel}`);
    const editor = document.getElementById(`editor-${panel}`);

    let content;
    if (panel === 'original') {
      content = this.originalPrompts[llmKey];
    } else {
      content = this.generatedPrompts[llmKey];
    }

    if (!content) {
      if (panel === 'optimized') {
        preview.innerHTML = '<div class="comparison-placeholder"><p>Cliquez sur &laquo; Optimiser ce modele &raquo; pour voir le resultat ici.</p></div>';
        preview.classList.remove('hidden');
        editor.classList.add('hidden');
      }
      return;
    }

    if (panel === 'optimized' && content._optimizedMarkdown) {
      const md = content._optimizedMarkdown;
      if (mode === 'edit') {
        editor.value = md;
        editor.classList.remove('hidden');
        preview.classList.add('hidden');
      } else if (mode === 'split') {
        // Try to parse system/user from the optimized markdown
        const parsed = this._parseSplitFromMarkdown(md);
        if (parsed) {
          this._renderSplitView(preview, parsed.systemPrompt, parsed.userPrompt, format);
        } else {
          // Cannot parse split - fallback to combined
          this._renderWithFormat(preview, md, format);
        }
        preview.classList.remove('hidden');
        editor.classList.add('hidden');
      } else {
        this._renderWithFormat(preview, md, format);
        preview.classList.remove('hidden');
        editor.classList.add('hidden');
      }
      const tokens = UIHelpers.estimateTokens(md);
      document.getElementById('token-counter-optimized').textContent = `~${tokens} tokens`;
    } else if (panel === 'original') {
      if (mode === 'edit') {
        const md = LLMAdapters.renderPreview(content, llmKey, 'combined');
        editor.value = md;
        editor.classList.remove('hidden');
        preview.classList.add('hidden');
      } else if (mode === 'split' && content.systemPrompt && content.userPrompt) {
        this._renderSplitView(preview, content.systemPrompt, content.userPrompt, format);
        preview.classList.remove('hidden');
        editor.classList.add('hidden');
      } else {
        const md = LLMAdapters.renderPreview(content, llmKey, 'combined');
        this._renderWithFormat(preview, md, format);
        preview.classList.remove('hidden');
        editor.classList.add('hidden');
      }
      const rawText = LLMAdapters.getRawPrompt(content);
      const tokens = UIHelpers.estimateTokens(rawText);
      document.getElementById('token-counter-original').textContent = `~${tokens} tokens`;
    }

    // Update toolbar active states
    document.querySelectorAll(`.comparison-toolbar .toolbar-tab[data-panel="${panel}"]`).forEach(btn => {
      btn.classList.toggle('active', btn.dataset.mode === mode);
    });
  },

  _setComparisonFormat(panel, format) {
    // Save editor content before switching format
    if (this.step8Modes[panel] === 'edit') {
      this._saveEditorContent(panel);
    }
    this.step8Formats[panel] = format;

    // Update button label
    const labels = { plaintext: 'Texte', rendered: 'HTML', markdown: 'Source' };
    const btn = document.querySelector(`.format-btn[data-panel="${panel}"]`);
    if (btn) btn.textContent = (labels[format] || 'Texte') + ' \u25BE';

    // Update active state in format menu
    document.querySelectorAll(`.format-menu[data-panel="${panel}"] .format-option`).forEach(opt => {
      opt.classList.toggle('active', opt.dataset.format === format);
    });

    // Re-render panel
    const llmKey = this.activeLLMTabOptimize;
    if (llmKey) {
      this._renderComparisonPanel(panel, llmKey);
    }
  },

  _setComparisonMode(panel, mode) {
    // Save editor content before leaving edit mode
    const prevMode = this.step8Modes[panel];
    if (prevMode === 'edit') {
      this._saveEditorContent(panel);
    }
    this.step8Modes[panel] = mode;
    const llmKey = this.activeLLMTabOptimize;
    if (llmKey) {
      this._renderComparisonPanel(panel, llmKey);
    }
  },

  _saveEditorContent(panel) {
    const editor = document.getElementById(`editor-${panel}`);
    if (!editor || editor.classList.contains('hidden')) return;
    const llmKey = this.activeLLMTabOptimize;
    if (!llmKey) return;

    if (panel === 'optimized' && this.generatedPrompts[llmKey]) {
      this.generatedPrompts[llmKey]._optimizedMarkdown = editor.value;
    }
  },

  async optimizeWithAI() {
    const apiKey = localStorage.getItem('pf_api_key');
    const openaiKey = localStorage.getItem('pf_openai_key');
    if (!apiKey && !openaiKey) {
      this.openSettings();
      UIHelpers.showToast('Configurez au moins une cle API.', 'error');
      return;
    }

    // Agent mode optimization
    if (this.mode === 'agent') {
      await this._optimizeAgent(apiKey, openaiKey);
      return;
    }

    const llmKey = this.activeLLMTabOptimize;
    if (!llmKey || !this.originalPrompts[llmKey]) return;

    const original = this.originalPrompts[llmKey];
    const originalRaw = LLMAdapters.getRawPrompt(original);
    const formData = PromptBuilder.collectFormData();

    this._setLoadingState(true, 'Optimisation en cours...');
    this._startProgressSimulation();

    try {
      const response = await fetch('/api/refine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: originalRaw,
          targetLLM: llmKey,
          taskType: formData.taskType,
          complexity: formData.complexity,
          apiKey,
          openaiKey
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Erreur d\'optimisation');
      }

      const result = await response.json();

      // Store optimized version
      if (!this.generatedPrompts[llmKey]) {
        this.generatedPrompts[llmKey] = { ...original };
      }
      this.generatedPrompts[llmKey]._optimized = true;
      this.generatedPrompts[llmKey]._optimizedMarkdown = result.optimizedPrompt;
      this.generatedPrompts[llmKey]._optimizeNotes = result.notes || '';

      // Update right panel using the mode system
      this._renderComparisonPanel('optimized', llmKey);
      this._showOptimizeRightPanelSections(llmKey);

      // Clear previous feedback
      document.getElementById('optimize-feedback').value = '';

      const providerLabel = result.fallback ? `${result.provider} (secours)` : result.provider;
      UIHelpers.showToast(`Optimise via ${providerLabel} !`, 'success');

      if (result.inputTokens || result.outputTokens) {
        UIHelpers.showToast(
          `${result.model} : ${result.inputTokens} in / ${result.outputTokens} out`,
          'info', 5000
        );
      }
    } catch (error) {
      UIHelpers.showToast('Erreur : ' + error.message, 'error', 5000);
    } finally {
      this._setLoadingState(false);
    }
  },

  async _optimizeAgent(apiKey, openaiKey) {
    const agentData = this._originalAgentData || this.collectAgentData();
    const agentText = this._agentDataToText(agentData);

    this._setLoadingState(true, 'Optimisation de l\'agent en cours...');
    this._startProgressSimulation();

    try {
      const response = await fetch('/api/refine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: agentText,
          mode: 'agent',
          platform: agentData.platform,
          agentData,
          apiKey,
          openaiKey
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Erreur d\'optimisation');
      }

      const result = await response.json();

      // Parse optimized agent data
      let optimizedData;
      try {
        optimizedData = typeof result.optimizedPrompt === 'string' ? JSON.parse(result.optimizedPrompt) : result.optimizedPrompt;
        optimizedData.platform = agentData.platform;
      } catch {
        // Fallback: show as text
        optimizedData = null;
      }

      if (optimizedData) {
        this._optimizedAgentData = optimizedData;
        const previewOptimized = document.getElementById('preview-optimized');
        previewOptimized.innerHTML = this._renderAgentPreviewCards(optimizedData);
        previewOptimized.classList.remove('hidden');
        document.getElementById('editor-optimized').classList.add('hidden');

        // Store text version for copy
        const optimizedText = this._agentDataToText(optimizedData);
        document.getElementById('editor-optimized').value = optimizedText;
        const tokens = UIHelpers.estimateTokens(optimizedText);
        document.getElementById('token-counter-optimized').textContent = `~${tokens} tokens`;
      } else {
        // Plain text fallback
        const previewOptimized = document.getElementById('preview-optimized');
        this._renderWithFormat(previewOptimized, result.optimizedPrompt, 'plaintext');
        previewOptimized.classList.remove('hidden');
        document.getElementById('editor-optimized').value = result.optimizedPrompt;
      }

      // Show notes
      const notesEl = document.getElementById('optimize-notes');
      const notesContent = document.getElementById('optimize-notes-content');
      if (result.notes) {
        notesContent.innerHTML = UIHelpers.renderMarkdown(result.notes);
        notesEl.classList.remove('hidden');
      }
      document.getElementById('optimize-feedback-zone').classList.remove('hidden');
      document.getElementById('optimize-actions').classList.remove('hidden');
      document.getElementById('optimize-feedback').value = '';

      const providerLabel = result.fallback ? `${result.provider} (secours)` : result.provider;
      UIHelpers.showToast(`Optimise via ${providerLabel} !`, 'success');

      if (result.inputTokens || result.outputTokens) {
        UIHelpers.showToast(
          `${result.model} : ${result.inputTokens} in / ${result.outputTokens} out`,
          'info', 5000
        );
      }
    } catch (error) {
      UIHelpers.showToast('Erreur : ' + error.message, 'error', 5000);
    } finally {
      this._setLoadingState(false);
    }
  },

  async optimizeAllModels() {
    const apiKey = localStorage.getItem('pf_api_key');
    const openaiKey = localStorage.getItem('pf_openai_key');
    if (!apiKey && !openaiKey) {
      this.openSettings();
      UIHelpers.showToast('Configurez au moins une cle API.', 'error');
      return;
    }

    const models = Object.keys(this.originalPrompts);
    if (models.length === 0) return;

    this._setLoadingState(true, `Optimisation de ${models.length} modele(s)...`);
    const progressBar = document.getElementById('progress-bar-fill');
    const statusText = document.getElementById('ai-status-text');
    if (progressBar) { progressBar.classList.remove('indeterminate'); progressBar.style.width = '0%'; }
    let successCount = 0;
    let errorCount = 0;
    let processed = 0;

    for (const llmKey of models) {
      const original = this.originalPrompts[llmKey];
      if (!original) { processed++; continue; }

      // Skip already optimized
      if (this.generatedPrompts[llmKey] && this.generatedPrompts[llmKey]._optimized) {
        successCount++;
        processed++;
        if (progressBar) progressBar.style.width = Math.round((processed / models.length) * 100) + '%';
        if (statusText) statusText.textContent = `Optimisation ${processed}/${models.length}...`;
        continue;
      }

      const originalRaw = LLMAdapters.getRawPrompt(original);
      const formData = PromptBuilder.collectFormData();
      if (statusText) statusText.textContent = `Optimisation ${processed + 1}/${models.length}...`;

      try {
        const response = await fetch('/api/refine', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt: originalRaw,
            targetLLM: llmKey,
            taskType: formData.taskType,
            complexity: formData.complexity,
            apiKey,
            openaiKey
          })
        });

        if (!response.ok) throw new Error('Erreur API');

        const result = await response.json();
        if (!this.generatedPrompts[llmKey]) {
          this.generatedPrompts[llmKey] = { ...original };
        }
        this.generatedPrompts[llmKey]._optimized = true;
        this.generatedPrompts[llmKey]._optimizedMarkdown = result.optimizedPrompt;
        this.generatedPrompts[llmKey]._optimizeNotes = result.notes || '';
        successCount++;
      } catch (error) {
        errorCount++;
      }
      processed++;
      if (progressBar) progressBar.style.width = Math.round((processed / models.length) * 100) + '%';
    }

    this._setLoadingState(false);

    // Refresh current view
    const currentLLM = this.activeLLMTabOptimize;
    if (currentLLM) this.showOptimizationForLLM(currentLLM);

    if (errorCount === 0) {
      UIHelpers.showToast(`${successCount} modele(s) optimise(s) avec succes !`, 'success');
    } else {
      UIHelpers.showToast(`${successCount} reussi(s), ${errorCount} erreur(s).`, 'warning');
    }
  },

  _setLoadingState(loading, progressText) {
    const btn = document.getElementById('btn-optimize');
    const btnDd = document.getElementById('btn-optimize-dropdown');
    const btnRegen = document.getElementById('btn-regenerate');
    const status = document.getElementById('ai-status');
    const label = document.getElementById('btn-optimize-label');
    const progressBar = document.getElementById('progress-bar-fill');
    const statusText = document.getElementById('ai-status-text');

    if (loading) {
      btn.disabled = true;
      if (btnDd) btnDd.disabled = true;
      if (label) label.textContent = 'Optimisation...';
      if (btnRegen) btnRegen.disabled = true;
      status.classList.remove('hidden');
      if (progressBar) {
        progressBar.style.width = '0%';
        progressBar.classList.add('indeterminate');
      }
      if (statusText && progressText) statusText.textContent = progressText;
      else if (statusText) statusText.textContent = 'Optimisation en cours...';
      this._progressInterval = null;
    } else {
      // Finish animation: jump to 100% then hide
      if (progressBar) {
        progressBar.classList.remove('indeterminate');
        progressBar.style.width = '100%';
      }
      if (this._progressInterval) {
        clearInterval(this._progressInterval);
        this._progressInterval = null;
      }
      setTimeout(() => {
        btn.disabled = false;
        if (btnDd) btnDd.disabled = false;
        if (btnRegen) btnRegen.disabled = false;
        status.classList.add('hidden');
        if (progressBar) {
          progressBar.style.width = '0%';
          progressBar.classList.remove('indeterminate');
        }
        this._updateOptimizeButton();
      }, 400);
    }
  },

  _startProgressSimulation() {
    const progressBar = document.getElementById('progress-bar-fill');
    if (!progressBar) return;
    progressBar.classList.remove('indeterminate');
    let progress = 5;
    progressBar.style.width = progress + '%';
    this._progressInterval = setInterval(() => {
      // Slow down as we approach 90%
      const remaining = 90 - progress;
      const increment = Math.max(0.5, remaining * 0.08);
      progress = Math.min(90, progress + increment);
      progressBar.style.width = progress + '%';
    }, 300);
  },

  async _regenerateWithFeedback() {
    const feedback = document.getElementById('optimize-feedback').value.trim();
    if (!feedback) {
      UIHelpers.showToast('Decrivez les modifications souhaitees avant de regenerer.', 'info');
      return;
    }

    const apiKey = localStorage.getItem('pf_api_key');
    const openaiKey = localStorage.getItem('pf_openai_key');
    if (!apiKey && !openaiKey) {
      this.openSettings();
      UIHelpers.showToast('Configurez au moins une cle API.', 'error');
      return;
    }

    const llmKey = this.activeLLMTabOptimize;
    if (!llmKey || !this.originalPrompts[llmKey]) return;

    // Use the current optimized version as base, with feedback
    const currentOptimized = this.generatedPrompts[llmKey] && this.generatedPrompts[llmKey]._optimizedMarkdown;
    const promptToRefine = currentOptimized || LLMAdapters.getRawPrompt(this.originalPrompts[llmKey]);
    const formData = PromptBuilder.collectFormData();

    this._setLoadingState(true, 'Regeneration en cours...');
    this._startProgressSimulation();

    try {
      const response = await fetch('/api/refine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: promptToRefine + '\n\n---\nFEEDBACK UTILISATEUR : ' + feedback,
          targetLLM: llmKey,
          taskType: formData.taskType,
          complexity: formData.complexity,
          apiKey,
          openaiKey
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Erreur de regeneration');
      }

      const result = await response.json();

      this.generatedPrompts[llmKey]._optimizedMarkdown = result.optimizedPrompt;
      this.generatedPrompts[llmKey]._optimizeNotes = result.notes || '';

      this._renderComparisonPanel('optimized', llmKey);
      this._showOptimizeRightPanelSections(llmKey);
      document.getElementById('optimize-feedback').value = '';

      const providerLabel = result.fallback ? `${result.provider} (secours)` : result.provider;
      UIHelpers.showToast(`Regenere via ${providerLabel} !`, 'success');
    } catch (error) {
      UIHelpers.showToast('Erreur : ' + error.message, 'error', 5000);
    } finally {
      this._setLoadingState(false);
    }
  },

  // ===== SETTINGS MODAL =====

  openSettings() {
    document.getElementById('settings-modal').classList.remove('hidden');
    const saved = localStorage.getItem('pf_api_key');
    if (saved) document.getElementById('api-key').value = saved;
    const savedOpenAI = localStorage.getItem('pf_openai_key');
    if (savedOpenAI) document.getElementById('openai-key').value = savedOpenAI;
  },

  closeSettings() {
    document.getElementById('settings-modal').classList.add('hidden');
  },

  saveApiKey() {
    const anthropicKey = document.getElementById('api-key').value.trim();
    const openaiKey = document.getElementById('openai-key').value.trim();

    if (anthropicKey) {
      localStorage.setItem('pf_api_key', anthropicKey);
    } else {
      localStorage.removeItem('pf_api_key');
    }

    if (openaiKey) {
      localStorage.setItem('pf_openai_key', openaiKey);
    } else {
      localStorage.removeItem('pf_openai_key');
    }

    this.checkApiKey();

    if (anthropicKey || openaiKey) {
      const parts = [];
      if (anthropicKey) parts.push('Anthropic');
      if (openaiKey) parts.push('OpenAI');
      UIHelpers.showToast('Cles sauvegardees : ' + parts.join(' + '), 'success');
    } else {
      UIHelpers.showToast('Toutes les cles API supprimees.', 'info');
    }
  },

  checkApiKey() {
    const hasAnthropic = !!localStorage.getItem('pf_api_key');
    const hasOpenAI = !!localStorage.getItem('pf_openai_key');
    this._hasApiKey = hasAnthropic || hasOpenAI;
    // Never disable the button — let click handler redirect to settings
    const btn = document.getElementById('btn-optimize');
    if (btn) btn.disabled = false;
    const btnDd = document.getElementById('btn-optimize-dropdown');
    if (btnDd) btnDd.disabled = false;
    // Show/hide API key warning banner
    const banner = document.getElementById('api-key-banner');
    if (banner) banner.classList.toggle('hidden', this._hasApiKey);
    this._updateOptimizeButton();
  },

  /**
   * Update the optimize button label and dropdown visibility
   * based on number of selected models
   */
  _updateOptimizeButton() {
    const modelCount = Object.keys(this.originalPrompts).length;
    const label = document.getElementById('btn-optimize-label');
    const dropdown = document.getElementById('btn-optimize-dropdown');
    const btnOptimize = document.getElementById('btn-optimize');
    const wrapper = btnOptimize ? btnOptimize.closest('.optimize-btn-wrapper') : null;

    if (!label || !dropdown) return;

    if (modelCount <= 1) {
      // Single model: simple button, no dropdown
      label.textContent = 'Optimiser le prompt';
      dropdown.classList.add('hidden');
      if (btnOptimize) btnOptimize.style.borderRadius = 'var(--radius-sm)';
      if (wrapper) wrapper.classList.remove('has-dropdown');
    } else {
      // Multiple models: show dropdown arrow
      const activeName = this._getActiveOptimizeModelName();
      label.textContent = `Optimiser "${activeName}"`;
      dropdown.classList.remove('hidden');
      if (btnOptimize) btnOptimize.style.borderRadius = 'var(--radius-sm) 0 0 var(--radius-sm)';
      if (wrapper) wrapper.classList.add('has-dropdown');

      // Update menu labels
      const singleLabel = document.getElementById('opt-single-label');
      const allLabel = document.getElementById('opt-all-label');
      if (singleLabel) singleLabel.textContent = `Optimiser "${activeName}"`;
      if (allLabel) allLabel.textContent = `Optimiser les ${modelCount} modeles`;
    }
  },

  _getActiveOptimizeModelName() {
    const llmKey = this.activeLLMTabOptimize;
    if (!llmKey) return 'modele';
    const allConfigs = { ...LLMAdapters.config, ...LLMAdapters.imageConfig, ...LLMAdapters.videoConfig, ...LLMAdapters.vibeConfig };
    const cfg = allConfigs[llmKey];
    return cfg ? cfg.name : llmKey;
  },

  // ===== DARK MODE =====

  _initDarkMode() {
    const saved = localStorage.getItem('pf_dark_mode');
    if (saved === 'true' || (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      document.documentElement.classList.add('dark');
    }
    this._updateDarkModeIcon();
  },

  toggleDarkMode() {
    const isDark = document.documentElement.classList.toggle('dark');
    localStorage.setItem('pf_dark_mode', isDark);
    this._updateDarkModeIcon();
  },

  _updateDarkModeIcon() {
    const isDark = document.documentElement.classList.contains('dark');
    const icon = document.getElementById('icon-dark-mode');
    const btn = document.getElementById('btn-dark-mode');
    if (!icon) return;
    if (isDark) {
      // Show sun icon in dark mode (click to go light)
      icon.innerHTML = '<circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>';
      btn.setAttribute('aria-label', 'Mode clair');
      btn.setAttribute('title', 'Mode clair');
    } else {
      // Show moon icon in light mode (click to go dark)
      icon.innerHTML = '<path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/>';
      btn.setAttribute('aria-label', 'Mode sombre');
      btn.setAttribute('title', 'Mode sombre');
    }
  },

  // ===== AUTO-SAVE =====

  _bindAutoSave() {
    const save = () => {
      clearTimeout(this._autoSaveTimer);
      this._autoSaveTimer = setTimeout(() => this._autoSaveForm(), 2000);
    };
    document.addEventListener('input', save);
    document.addEventListener('change', save);
    document.addEventListener('click', (e) => {
      if (e.target.closest('.llm-card, .task-card, .agent-platform-card, .mode-btn')) save();
    });
  },

  _autoSaveForm() {
    try {
      const data = {
        selectedModels: Array.from(document.querySelectorAll('.llm-card.selected')).map(c => c.dataset.llm),
        selectedTask: document.querySelector('.task-card.selected')?.dataset.task || '',
        customTask: document.getElementById('custom-task-input').value,
        persona: document.getElementById('persona').value,
        freeDescription: document.getElementById('free-description').value,
        taskDescription: document.getElementById('task-description').value,
        inputDescription: document.getElementById('input-description').value,
        outputFormat: document.getElementById('output-format').value,
        constraints: document.getElementById('constraints').value,
        imgSubject: document.getElementById('img-subject').value,
        vidSubject: document.getElementById('vid-subject').value,
        complexity: document.querySelector('input[name="complexity"]:checked')?.value || 'basic',
        outputLength: document.querySelector('input[name="output-length"]:checked')?.value || 'moyen',
        fewShot: document.getElementById('few-shot-toggle').checked,
        cot: document.getElementById('cot-toggle').checked,
        multiSelects: {},
        currentStep: this.currentStep,
        maxStepReached: this.maxStepReached,
        // Agent state
        mode: this.mode,
        agentPlatform: this.agentPlatform,
        agentDescription: document.getElementById('agent-description')?.value || '',
        agentClaudeWorkingOn: document.getElementById('agent-claude-working-on')?.value || '',
        agentClaudeTryingTo: document.getElementById('agent-claude-trying-to')?.value || '',
        agentClaudeInstructions: document.getElementById('agent-claude-instructions')?.value || '',
        agentChatgptName: document.getElementById('agent-chatgpt-name')?.value || '',
        agentChatgptDescription: document.getElementById('agent-chatgpt-description')?.value || '',
        agentChatgptInstructions: document.getElementById('agent-chatgpt-instructions')?.value || '',
        agentChatgptStarters: this._collectConversationStarters(),
        agentGeminiName: document.getElementById('agent-gemini-name')?.value || '',
        agentGeminiDescription: document.getElementById('agent-gemini-description')?.value || '',
        agentGeminiInstructions: document.getElementById('agent-gemini-instructions')?.value || ''
      };
      // Save multi-select values
      document.querySelectorAll('.multi-select').forEach(ms => {
        if (ms._selected) data.multiSelects[ms.id] = ms._selected;
      });
      localStorage.setItem('pf_autosave', JSON.stringify(data));
    } catch (e) { /* silent fail */ }
  },

  _restoreAutoSave() {
    try {
      const raw = localStorage.getItem('pf_autosave');
      if (!raw) return;
      const data = JSON.parse(raw);

      // Restore selected models
      if (data.selectedModels && data.selectedModels.length > 0) {
        data.selectedModels.forEach(key => {
          const card = document.querySelector(`.llm-card[data-llm="${key}"]`);
          if (card) card.classList.add('selected');
        });
      }

      // Restore selected task
      if (data.selectedTask) {
        const taskCard = document.querySelector(`.task-card[data-task="${data.selectedTask}"]`);
        if (taskCard) {
          document.querySelectorAll('.task-card').forEach(c => c.classList.remove('selected'));
          taskCard.classList.add('selected');
          if (data.selectedTask === 'autre') document.getElementById('custom-task')?.classList.remove('hidden');
        }
      }

      // Restore text fields
      if (data.customTask) document.getElementById('custom-task-input').value = data.customTask;
      if (data.persona) document.getElementById('persona').value = data.persona;
      if (data.freeDescription) document.getElementById('free-description').value = data.freeDescription;
      if (data.taskDescription) document.getElementById('task-description').value = data.taskDescription;
      if (data.inputDescription) document.getElementById('input-description').value = data.inputDescription;
      if (data.outputFormat) document.getElementById('output-format').value = data.outputFormat;
      if (data.constraints) document.getElementById('constraints').value = data.constraints;
      if (data.imgSubject) document.getElementById('img-subject').value = data.imgSubject;
      if (data.vidSubject) document.getElementById('vid-subject').value = data.vidSubject;

      // Restore radios
      if (data.complexity) {
        const r = document.querySelector(`input[name="complexity"][value="${data.complexity}"]`);
        if (r) r.checked = true;
      }
      if (data.outputLength) {
        const r = document.querySelector(`input[name="output-length"][value="${data.outputLength}"]`);
        if (r) r.checked = true;
      }

      // Restore toggles
      if (data.fewShot) document.getElementById('few-shot-toggle').checked = true;
      if (data.cot) document.getElementById('cot-toggle').checked = true;

      // Restore multi-selects
      if (data.multiSelects) {
        Object.entries(data.multiSelects).forEach(([msId, selected]) => {
          const ms = document.getElementById(msId);
          if (ms && ms._selected !== undefined) {
            ms._selected = selected;
            this._renderMultiSelect(ms);
          }
        });
      }

      // Restore agent state
      if (data.mode && data.mode !== 'prompt') {
        this.mode = data.mode;
        document.querySelectorAll('.mode-btn').forEach(btn => {
          btn.classList.toggle('active', btn.dataset.mode === data.mode);
        });
        this.renderStepIndicators();
      }
      if (data.agentPlatform) {
        this.agentPlatform = data.agentPlatform;
        const card = document.querySelector(`.agent-platform-card[data-platform="${data.agentPlatform}"]`);
        if (card) {
          document.querySelectorAll('.agent-platform-card').forEach(c => c.classList.remove('selected'));
          card.classList.add('selected');
        }
      }
      if (data.agentDescription) document.getElementById('agent-description').value = data.agentDescription;
      if (data.agentClaudeWorkingOn) document.getElementById('agent-claude-working-on').value = data.agentClaudeWorkingOn;
      if (data.agentClaudeTryingTo) document.getElementById('agent-claude-trying-to').value = data.agentClaudeTryingTo;
      if (data.agentClaudeInstructions) document.getElementById('agent-claude-instructions').value = data.agentClaudeInstructions;
      if (data.agentChatgptName) document.getElementById('agent-chatgpt-name').value = data.agentChatgptName;
      if (data.agentChatgptDescription) document.getElementById('agent-chatgpt-description').value = data.agentChatgptDescription;
      if (data.agentChatgptInstructions) document.getElementById('agent-chatgpt-instructions').value = data.agentChatgptInstructions;
      if (data.agentChatgptStarters && data.agentChatgptStarters.length > 0) {
        this._renderConversationStarters(data.agentChatgptStarters);
      }
      if (data.agentGeminiName) document.getElementById('agent-gemini-name').value = data.agentGeminiName;
      if (data.agentGeminiDescription) document.getElementById('agent-gemini-description').value = data.agentGeminiDescription;
      if (data.agentGeminiInstructions) document.getElementById('agent-gemini-instructions').value = data.agentGeminiInstructions;

      // Restore navigation state
      if (data.maxStepReached > 1) {
        this.maxStepReached = data.maxStepReached;
        this.updateStepIndicators();
      }
    } catch (e) { /* silent fail */ }
  },

  // ===== LOCAL STORAGE =====

  loadPreferences() {
    this.checkApiKey();
  },

  clearAllData() {
    localStorage.removeItem('pf_api_key');
    localStorage.removeItem('pf_openai_key');
    localStorage.removeItem('pf_preferences');
    localStorage.removeItem('pf_history');
    localStorage.removeItem('pf_tutorial_seen');
    localStorage.removeItem('pf_autosave');
    localStorage.removeItem('pf_dark_mode');
    this.checkApiKey();
    UIHelpers.showToast('Toutes les donnees ont ete effacees.', 'info');
  },

  resetAll() {
    // Reset state
    this.currentStep = 1;
    this.maxStepReached = 1;
    this.mode = 'prompt';
    this.agentPlatform = null;
    this.generatedPrompts = {};
    this.originalPrompts = {};
    this.activeLLMTab = null;
    this.activeLLMTabOptimize = null;
    this.editMode = false;
    this.previewMode = 'split';
    this.displayFormat = 'plaintext';
    this.step8Modes = { original: 'split', optimized: 'split' };
    this.step8Formats = { original: 'plaintext', optimized: 'plaintext' };
    this.smartQuestionsGenerated = false;

    // Reset mode toggle
    document.querySelectorAll('.mode-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.mode === 'prompt');
    });

    // Deselect all cards (including agent platform cards)
    document.querySelectorAll('.llm-card.selected, .task-card.selected, .agent-platform-card.selected').forEach(c => c.classList.remove('selected'));

    // Reset agent fields
    document.querySelectorAll('.agent-fields').forEach(f => f.classList.add('hidden'));
    const startersContainer = document.getElementById('agent-chatgpt-starters');
    if (startersContainer) startersContainer.innerHTML = '';

    // Reset all form fields
    document.querySelectorAll('input[type="text"], textarea').forEach(el => { el.value = ''; });
    document.querySelectorAll('select').forEach(el => { el.selectedIndex = 0; });
    document.querySelectorAll('.autre-input').forEach(el => el.classList.add('hidden'));
    this._resetMultiSelects();

    // Reset radios to defaults
    const defaultRadios = { 'complexity': 'basic', 'output-length': 'moyen', 'img-quality': 'standard' };
    Object.entries(defaultRadios).forEach(([name, val]) => {
      const radio = document.querySelector(`input[name="${name}"][value="${val}"]`);
      if (radio) radio.checked = true;
    });

    // Reset toggles
    const fewShot = document.getElementById('few-shot-toggle');
    if (fewShot) { fewShot.checked = false; }
    document.getElementById('few-shot-content')?.classList.add('hidden');
    document.getElementById('few-shot-examples').innerHTML = '';
    const cot = document.getElementById('cot-toggle');
    if (cot) { cot.checked = false; delete cot.dataset.manuallyChanged; }

    // Reset smart questions
    document.getElementById('smart-questions-list').innerHTML = '';
    document.getElementById('smart-questions-list')?.classList.add('hidden');

    // Hide custom task
    document.getElementById('custom-task')?.classList.add('hidden');

    // Hide conditional fields
    document.getElementById('text-fields')?.classList.remove('hidden');
    document.getElementById('image-fields')?.classList.add('hidden');
    document.getElementById('video-fields')?.classList.add('hidden');

    // Re-render indicators for prompt mode and show step 1
    this.renderStepIndicators();
    this.showStep(1);
    UIHelpers.showToast('Formulaire reinitialise.', 'info');
  },

  // ===== FILE UPLOAD (Step 4) =====

  _handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    // Max 500KB for text files
    if (file.size > 500 * 1024) {
      UIHelpers.showToast('Fichier trop volumineux (max 500 Ko).', 'error');
      event.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target.result;
      const textarea = document.getElementById('input-description');

      // Append file content with separator
      if (textarea.value.trim()) {
        textarea.value += '\n\n--- Contenu du fichier : ' + file.name + ' ---\n' + content;
      } else {
        textarea.value = '--- Contenu du fichier : ' + file.name + ' ---\n' + content;
      }

      // Show filename badge
      document.getElementById('upload-filename').textContent = file.name;
      document.getElementById('upload-info').classList.remove('hidden');

      // Remove highlight if present
      textarea.classList.remove('guide-highlight');

      UIHelpers.showToast('Fichier "' + file.name + '" ajoute.', 'success');
    };

    reader.onerror = () => {
      UIHelpers.showToast('Impossible de lire le fichier.', 'error');
    };

    reader.readAsText(file);
  },

  _removeUploadedFile() {
    const fileInput = document.getElementById('file-upload');
    fileInput.value = '';
    document.getElementById('upload-info').classList.add('hidden');
    document.getElementById('upload-filename').textContent = '';
  },

  // ===== DOWNLOAD FORMAT =====

  _downloadInFormat(content, baseName, format) {
    switch (format) {
      case 'txt':
        UIHelpers.downloadAsText(content, `${baseName}.txt`);
        break;
      case 'html':
        UIHelpers.downloadAsHTML(content, `${baseName}.html`, baseName);
        break;
      case 'md':
      default:
        UIHelpers.downloadAsMarkdown(content, `${baseName}.md`);
        break;
    }
    UIHelpers.showToast('Fichier telecharge.', 'success');
  },

  // ===== MULTI-SELECT TAGS (Step 3) =====

  _initMultiSelects() {
    document.querySelectorAll('.multi-select').forEach(ms => {
      const field = ms.dataset.field;
      const select = document.getElementById(field);
      if (!select) return;

      const placeholder = ms.dataset.placeholder || '-- Choisir --';
      const autrePlaceholder = ms.dataset.autrePlaceholder || 'Ajouter...';

      // Build options from the hidden select
      const options = [];
      select.querySelectorAll('option').forEach(opt => {
        if (opt.value) options.push({ value: opt.value, label: opt.textContent });
      });

      // State
      ms._selected = [];
      ms._options = options;

      // Build display area
      const display = document.createElement('div');
      display.className = 'multi-select-display';
      display.innerHTML = `<span class="multi-select-placeholder">${placeholder}</span>`;

      // Build dropdown
      const dropdown = document.createElement('div');
      dropdown.className = 'multi-select-dropdown';

      options.forEach(opt => {
        const item = document.createElement('div');
        item.className = 'ms-option';
        item.dataset.value = opt.value;
        item.innerHTML = `<span class="ms-option-check"></span>${opt.label}`;
        item.addEventListener('click', (e) => {
          e.stopPropagation();
          this._toggleMultiOption(ms, opt.value, opt.label);
        });
        dropdown.appendChild(item);
      });

      // Autre input at bottom
      const autreInput = document.createElement('input');
      autreInput.type = 'text';
      autreInput.className = 'ms-autre-input';
      autreInput.placeholder = autrePlaceholder;
      autreInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          const val = autreInput.value.trim();
          if (val && !ms._selected.find(s => s.label === val)) {
            this._toggleMultiOption(ms, 'custom-' + val.toLowerCase().replace(/\s+/g, '-'), val);
            autreInput.value = '';
          }
        }
      });
      autreInput.addEventListener('click', (e) => e.stopPropagation());
      dropdown.appendChild(autreInput);

      ms.appendChild(display);
      ms.appendChild(dropdown);

      // Toggle dropdown on display click
      display.addEventListener('click', (e) => {
        e.stopPropagation();
        const wasOpen = ms.classList.contains('open');
        // Close all others
        document.querySelectorAll('.multi-select.open').forEach(m => m.classList.remove('open'));
        if (!wasOpen) ms.classList.add('open');
      });
    });

    // Close dropdowns on outside click
    document.addEventListener('click', () => {
      document.querySelectorAll('.multi-select.open').forEach(m => m.classList.remove('open'));
    });
  },

  _toggleMultiOption(ms, value, label) {
    const idx = ms._selected.findIndex(s => s.value === value);
    if (idx >= 0) {
      ms._selected.splice(idx, 1);
    } else {
      ms._selected.push({ value, label });
    }
    this._renderMultiSelect(ms);

    // Update highlight
    if (ms._selected.length > 0) {
      ms.querySelector('.multi-select-display').classList.remove('guide-highlight');
    }
  },

  _renderMultiSelect(ms) {
    const display = ms.querySelector('.multi-select-display');
    const placeholder = ms.dataset.placeholder || '-- Choisir --';

    if (ms._selected.length === 0) {
      display.innerHTML = `<span class="multi-select-placeholder">${placeholder}</span>`;
    } else {
      display.innerHTML = ms._selected.map(s =>
        `<span class="ms-tag">${s.label}<span class="ms-tag-remove" data-value="${s.value}">&times;</span></span>`
      ).join('');

      // Bind remove
      display.querySelectorAll('.ms-tag-remove').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          this._toggleMultiOption(ms, btn.dataset.value, '');
        });
      });
    }

    // Update dropdown checkmarks
    ms.querySelectorAll('.ms-option').forEach(opt => {
      const isSelected = ms._selected.some(s => s.value === opt.dataset.value);
      opt.classList.toggle('selected', isSelected);
      opt.querySelector('.ms-option-check').textContent = isSelected ? '✓' : '';
    });

    // Sync hidden select value (joined for backward compat)
    const field = ms.dataset.field;
    const select = document.getElementById(field);
    if (select) {
      select.value = ms._selected.map(s => s.value).join(', ');
    }
  },

  _getMultiSelectValues(msId) {
    const ms = document.getElementById(msId);
    if (!ms || !ms._selected) return [];
    return ms._selected.map(s => s.label);
  },

  _resetMultiSelects() {
    document.querySelectorAll('.multi-select').forEach(ms => {
      if (ms._selected) ms._selected = [];
      this._renderMultiSelect(ms);
    });
  },

  // ===== GUIDE HIGHLIGHTS (Permanent) =====

  _highlightIfEmpty(id) {
    // Check for multi-select first
    const ms = document.getElementById('ms-' + id);
    if (ms && ms._selected !== undefined) {
      if (ms._selected.length === 0) {
        ms.querySelector('.multi-select-display')?.classList.add('guide-highlight');
      }
      return;
    }

    const el = document.getElementById(id);
    if (!el) return;
    if (el.tagName === 'SELECT') {
      if (!el.value || el.value === '') el.classList.add('guide-highlight');
    } else {
      if (!el.value.trim()) el.classList.add('guide-highlight');
    }
  },

  _updateGuideHighlights() {
    document.querySelectorAll('.guide-highlight, .guide-highlight-grid').forEach(el => {
      el.classList.remove('guide-highlight', 'guide-highlight-grid');
    });

    const stepId = this._getCurrentStepId();

    switch (stepId) {
      case 'step-prompt-1': {
        const hasSelected = document.querySelectorAll('.llm-card.selected').length > 0;
        if (!hasSelected) {
          document.getElementById('llm-grid').classList.add('guide-highlight-grid');
        }
        const hasTask = document.querySelector('.task-card.selected');
        if (!hasTask) {
          document.getElementById('task-grid').classList.add('guide-highlight-grid');
        }
        this._highlightIfEmpty('persona');
        break;
      }
      case 'step-prompt-2': {
        this._highlightIfEmpty('domain');
        this._highlightIfEmpty('audience');
        this._highlightIfEmpty('output-language');
        this._highlightIfEmpty('tone');
        break;
      }
      case 'step-prompt-3': {
        const selected = this._getSelectedModels();
        const hasText = PromptBuilder.hasTextModel(selected);
        const hasVibe = PromptBuilder.hasVibeModel(selected);
        const hasImage = PromptBuilder.hasImageModel(selected);
        const hasVideo = PromptBuilder.hasVideoModel(selected);

        if (hasText || hasVibe) {
          this._highlightIfEmpty('task-description');
          this._highlightIfEmpty('input-description');
          this._highlightIfEmpty('output-format');
          this._highlightIfEmpty('constraints');
        }
        if (hasImage) {
          this._highlightIfEmpty('img-subject');
          this._highlightIfEmpty('img-style');
          this._highlightIfEmpty('img-lighting');
          this._highlightIfEmpty('img-composition');
        }
        if (hasVideo) {
          this._highlightIfEmpty('vid-subject');
          this._highlightIfEmpty('vid-shot');
          this._highlightIfEmpty('vid-tempo');
          this._highlightIfEmpty('vid-style');
        }
        break;
      }
      case 'step-prompt-4':
        break;
      case 'step-shared-questions': {
        document.querySelectorAll('.smart-question').forEach(q => {
          const input = q.querySelector('.smart-answer');
          if (input && !input.value.trim()) {
            input.classList.add('guide-highlight');
          }
        });
        break;
      }
    }
  },

  _bindGuideListeners() {
    // Remove grid highlight when a card is selected (step 1 & 2)
    document.addEventListener('click', (e) => {
      const card = e.target.closest('.llm-card, .task-card');
      if (card) {
        const grid = card.closest('.llm-grid, .task-grid');
        if (grid) grid.classList.remove('guide-highlight-grid');
      }
    });

    // Remove field highlight on input/change for all text fields
    document.addEventListener('input', (e) => {
      if (e.target.classList.contains('guide-highlight')) {
        if (e.target.value.trim()) e.target.classList.remove('guide-highlight');
      }
    });

    // Remove field highlight on select change
    document.addEventListener('change', (e) => {
      if (e.target.classList.contains('guide-highlight') && e.target.tagName === 'SELECT') {
        if (e.target.value) e.target.classList.remove('guide-highlight');
      }
      // Remove glow from radio pill groups
      if (e.target.type === 'radio') {
        const group = e.target.closest('.radio-pills');
        if (group) group.classList.remove('guide-highlight');
      }
    });
  },

  // ===== INTERACTIVE TUTORIAL =====

  _getTutorialStepsForCurrentStep() {
    switch (this.currentStep) {
      case 1:
        return [
          { selector: '#llm-grid', text: 'Choisissez un ou plusieurs modeles de texte (Claude, ChatGPT, Gemini...). Vous pouvez en selectionner plusieurs.' },
          { selector: '#image-grid', text: 'Optionnel : selectionnez un modele de generation d\'images (FLUX, Midjourney...).' },
          { selector: '#video-grid', text: 'Optionnel : selectionnez un modele de generation video (Veo, Runway...).' },
          { selector: '#vibe-grid', text: 'Optionnel : selectionnez un outil de vibe coding (Claude Code, Cursor...).' }
        ];
      case 2:
        return [
          { selector: '#task-grid', text: 'Selectionnez le type de tache que votre prompt doit accomplir. Cela adapte la structure du prompt genere.' },
          { selector: '#persona', text: 'Optionnel : decrivez le role ou la persona que le LLM doit adopter (ex: "Expert SEO avec 10 ans d\'experience").' }
        ];
      case 3:
        return [
          { selector: '#ms-domain', text: 'Choisissez le domaine d\'application. Vous pouvez en selectionner plusieurs ou ajouter un domaine personnalise.' },
          { selector: '#ms-audience', text: 'A qui s\'adresse la reponse du LLM ? Selectionnez un ou plusieurs publics cibles.' },
          { selector: '#ms-output-language', text: 'Dans quelle(s) langue(s) le LLM doit-il repondre ?' },
          { selector: '#ms-tone', text: 'Quel ton adopter ? Professionnel, decontracte, technique... Vous pouvez combiner.' }
        ];
      case 4:
        return [
          { selector: '#task-description', text: 'Decrivez precisement ce que le LLM doit faire. Plus c\'est precis, meilleur sera le prompt genere.' },
          { selector: '#input-description', text: 'Decrivez les donnees que vous fournirez au LLM en entree. Vous pouvez aussi joindre un fichier.' },
          { selector: '#output-format', text: 'Choisissez le format de sortie souhaite : JSON, Markdown, code, tableau...' }
        ];
      case 5:
        return [
          { selector: '#complexity-group', text: 'Choisissez le niveau de sophistication du prompt. "Expert" ajoute la gestion d\'erreurs et les niveaux de confiance.' },
          { selector: '#few-shot-header', text: 'Activez pour fournir des exemples concrets au LLM (few-shot learning). Ameliore la precision.' },
          { selector: '#cot-toggle', text: 'Activez le raisonnement etape par etape (Chain-of-Thought). Recommande pour les taches complexes.' }
        ];
      default:
        return [];
    }
  },

  startTutorial() {
    const steps = this._getTutorialStepsForCurrentStep();
    if (steps.length === 0) {
      UIHelpers.showToast('Pas de guide disponible pour cette etape.', 'info');
      return;
    }

    this.tutorialActive = true;
    this.tutorialStepIndex = 0;
    document.getElementById('tutorial-overlay').classList.remove('hidden');
    this._showTutorialStep(0);
  },

  _showTutorialStep(index) {
    const steps = this._getTutorialStepsForCurrentStep();
    if (index < 0 || index >= steps.length) {
      this._closeTutorial();
      return;
    }

    this.tutorialStepIndex = index;
    const step = steps[index];
    const target = document.querySelector(step.selector);

    if (!target) {
      // Skip if element not found
      if (index < steps.length - 1) {
        this._showTutorialStep(index + 1);
      } else {
        this._closeTutorial();
      }
      return;
    }

    // Scroll target into view
    target.scrollIntoView({ behavior: 'smooth', block: 'center' });

    // Wait for scroll to finish
    setTimeout(() => {
      const rect = target.getBoundingClientRect();
      const pad = 8;

      // Position spotlight
      const spotlight = document.getElementById('tutorial-spotlight');
      spotlight.style.top = (rect.top - pad) + 'px';
      spotlight.style.left = (rect.left - pad) + 'px';
      spotlight.style.width = (rect.width + pad * 2) + 'px';
      spotlight.style.height = (rect.height + pad * 2) + 'px';

      // Position tooltip
      const tooltip = document.getElementById('tutorial-tooltip');
      const text = document.getElementById('tutorial-text');
      const counter = document.getElementById('tutorial-counter');
      const btnPrev = document.getElementById('tutorial-btn-prev');
      const btnNext = document.getElementById('tutorial-btn-next');

      text.textContent = step.text;
      counter.textContent = `${index + 1} / ${steps.length}`;

      // Show/hide prev button
      btnPrev.classList.toggle('hidden', index === 0);

      // Change next button text on last step
      btnNext.textContent = (index === steps.length - 1) ? 'Terminer' : 'Suivant';

      // Determine tooltip position (below or above target)
      const spaceBelow = window.innerHeight - rect.bottom;
      const tooltipHeight = 140; // approximate

      tooltip.classList.remove('arrow-top', 'arrow-bottom');

      if (spaceBelow > tooltipHeight + 20) {
        // Place below
        tooltip.style.top = (rect.bottom + pad + 12) + 'px';
        tooltip.style.bottom = '';
        tooltip.classList.add('arrow-top');
      } else {
        // Place above
        tooltip.style.top = '';
        tooltip.style.bottom = (window.innerHeight - rect.top + pad + 12) + 'px';
        tooltip.classList.add('arrow-bottom');
      }

      // Horizontal: align with target left, but keep in viewport
      let leftPos = rect.left;
      const tooltipWidth = 360;
      if (leftPos + tooltipWidth > window.innerWidth - 16) {
        leftPos = window.innerWidth - tooltipWidth - 16;
      }
      if (leftPos < 16) leftPos = 16;
      tooltip.style.left = leftPos + 'px';
      tooltip.style.right = '';

    }, 350);
  },

  _closeTutorial() {
    this.tutorialActive = false;
    this.tutorialStepIndex = 0;
    document.getElementById('tutorial-overlay').classList.add('hidden');
    localStorage.setItem('pf_tutorial_seen', 'true');
  },

  // ===== EVENT BINDING =====

  bindEvents() {
    // Navigation
    document.getElementById('btn-next').addEventListener('click', () => this.nextStep());
    document.getElementById('btn-prev').addEventListener('click', () => this.prevStep());

    // Tutorial
    document.getElementById('btn-guide').addEventListener('click', () => this.startTutorial());
    document.getElementById('tutorial-backdrop').addEventListener('click', () => this._closeTutorial());
    document.getElementById('tutorial-btn-skip').addEventListener('click', () => this._closeTutorial());
    document.getElementById('tutorial-btn-prev').addEventListener('click', () => this._showTutorialStep(this.tutorialStepIndex - 1));
    document.getElementById('tutorial-btn-next').addEventListener('click', () => {
      const steps = this._getTutorialStepsForCurrentStep();
      if (this.tutorialStepIndex >= steps.length - 1) {
        this._closeTutorial();
      } else {
        this._showTutorialStep(this.tutorialStepIndex + 1);
      }
    });

    // Logo -> full reset (like page refresh)
    document.getElementById('logo-home').addEventListener('click', (e) => {
      e.preventDefault();
      this.resetAll();
    });

    // Settings modal
    document.getElementById('btn-settings').addEventListener('click', () => this.openSettings());
    const bannerBtn = document.getElementById('btn-banner-settings');
    if (bannerBtn) bannerBtn.addEventListener('click', () => this.openSettings());
    const skipBtn = document.getElementById('btn-skip-settings');
    if (skipBtn) skipBtn.addEventListener('click', (e) => { e.preventDefault(); this.openSettings(); });
    document.getElementById('btn-close-settings').addEventListener('click', () => this.closeSettings());
    document.getElementById('btn-save-key').addEventListener('click', () => this.saveApiKey());
    document.getElementById('toggle-key-visibility').addEventListener('click', () => {
      const input = document.getElementById('api-key');
      const btn = document.getElementById('toggle-key-visibility');
      if (input.type === 'password') {
        input.type = 'text';
        btn.textContent = 'Masquer';
      } else {
        input.type = 'password';
        btn.textContent = 'Afficher';
      }
    });
    document.getElementById('toggle-openai-visibility').addEventListener('click', () => {
      const input = document.getElementById('openai-key');
      const btn = document.getElementById('toggle-openai-visibility');
      if (input.type === 'password') {
        input.type = 'text';
        btn.textContent = 'Masquer';
      } else {
        input.type = 'password';
        btn.textContent = 'Afficher';
      }
    });
    document.getElementById('btn-clear-history').addEventListener('click', () => this.clearAllData());

    // Close modal on overlay click
    document.getElementById('settings-modal').addEventListener('click', (e) => {
      if (e.target.classList.contains('modal-overlay')) this.closeSettings();
    });

    // "Autre" pattern bindings (only for non-multi-select fields)
    this._bindAutrePattern('output-format', 'output-format-autre');

    // Step 4: File upload
    const fileInput = document.getElementById('file-upload');
    if (fileInput) {
      fileInput.addEventListener('change', (e) => this._handleFileUpload(e));
    }
    const removeFileBtn = document.getElementById('btn-upload-remove');
    if (removeFileBtn) {
      removeFileBtn.addEventListener('click', () => this._removeUploadedFile());
    }

    // Few-shot toggle
    document.getElementById('few-shot-toggle').addEventListener('change', (e) => {
      const content = document.getElementById('few-shot-content');
      if (e.target.checked) {
        content.classList.remove('hidden');
        if (document.querySelectorAll('.example-pair').length === 0) {
          this.addFewShotExample();
        }
      } else {
        content.classList.add('hidden');
      }
    });
    document.getElementById('add-example').addEventListener('click', () => this.addFewShotExample());

    // CoT manual change tracking
    document.getElementById('cot-toggle').addEventListener('change', (e) => {
      e.target.dataset.manuallyChanged = 'true';
    });

    // Step 6: Retry smart questions
    const retryBtn = document.getElementById('retry-questions');
    if (retryBtn) {
      retryBtn.addEventListener('click', () => {
        this.smartQuestionsGenerated = false;
        this.generateSmartQuestions();
      });
    }

    // Step 7: Preview mode tabs
    document.getElementById('btn-mode-split').addEventListener('click', () => this.setPreviewMode('split'));
    document.getElementById('btn-mode-combined').addEventListener('click', () => this.setPreviewMode('combined'));
    document.getElementById('btn-edit-mode').addEventListener('click', () => this.setEditMode(!this.editMode));

    // Step 7: Format display dropdown
    document.getElementById('btn-format').addEventListener('click', (e) => {
      e.stopPropagation();
      document.getElementById('format-menu').classList.toggle('hidden');
    });
    document.getElementById('format-menu').addEventListener('click', (e) => {
      const opt = e.target.closest('.format-option');
      if (!opt) return;
      e.stopPropagation();
      this.setDisplayFormat(opt.dataset.format);
      document.getElementById('format-menu').classList.add('hidden');
    });

    // Step 7: Actions
    document.getElementById('btn-copy').addEventListener('click', () => {
      const text = document.getElementById('prompt-editor').value;
      UIHelpers.copyToClipboard(text).then(() => {
        UIHelpers.showToast('Prompt copie !', 'success');
      });
    });

    document.getElementById('btn-download').addEventListener('click', (e) => {
      e.stopPropagation();
      document.getElementById('download-menu').classList.toggle('hidden');
    });

    document.getElementById('download-menu').addEventListener('click', (e) => {
      const opt = e.target.closest('.download-option');
      if (!opt) return;
      const format = opt.dataset.format;
      const text = document.getElementById('prompt-editor').value;
      const model = this.activeLLMTab || 'prompt';
      this._downloadInFormat(text, `prompt-${model}`, format);
      document.getElementById('download-menu').classList.add('hidden');
    });

    // Step 7: Feedback
    document.getElementById('btn-apply-feedback').addEventListener('click', () => this.applyFeedback());

    // Step 8: Comparison panel mode tabs
    document.querySelectorAll('.comparison-toolbar .toolbar-tab[data-mode]').forEach(btn => {
      btn.addEventListener('click', () => {
        const panel = btn.dataset.panel;
        const mode = btn.dataset.mode;
        if (panel && mode) this._setComparisonMode(panel, mode);
      });
    });

    // Step 8: Format display dropdowns for both panels
    document.querySelectorAll('.format-btn[data-panel]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const panel = btn.dataset.panel;
        const menu = document.querySelector(`.format-menu[data-panel="${panel}"]`);
        // Close all format menus first
        document.querySelectorAll('.format-menu').forEach(m => m.classList.add('hidden'));
        if (menu) menu.classList.toggle('hidden');
      });
    });
    document.querySelectorAll('.format-menu[data-panel] .format-option').forEach(opt => {
      opt.addEventListener('click', (e) => {
        e.stopPropagation();
        const panel = opt.dataset.panel;
        const format = opt.dataset.format;
        if (panel && format) this._setComparisonFormat(panel, format);
        const menu = opt.closest('.format-menu');
        if (menu) menu.classList.add('hidden');
      });
    });

    // Dark mode
    document.getElementById('btn-dark-mode').addEventListener('click', () => this.toggleDarkMode());

    // Step 8: Optimize (contextual button)
    document.getElementById('btn-optimize').addEventListener('click', () => {
      const modelCount = Object.keys(this.originalPrompts).length;
      if (modelCount <= 1) {
        this.optimizeWithAI();
      } else {
        this.optimizeWithAI();
      }
    });
    // Dropdown toggle
    const ddBtn = document.getElementById('btn-optimize-dropdown');
    if (ddBtn) {
      ddBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        document.getElementById('optimize-menu').classList.toggle('hidden');
      });
    }
    // Menu options
    document.getElementById('opt-single').addEventListener('click', () => {
      document.getElementById('optimize-menu').classList.add('hidden');
      this.optimizeWithAI();
    });
    document.getElementById('opt-all').addEventListener('click', () => {
      document.getElementById('optimize-menu').classList.add('hidden');
      this.optimizeAllModels();
    });
    // Close menu on outside click
    document.addEventListener('click', () => {
      const menu = document.getElementById('optimize-menu');
      if (menu) menu.classList.add('hidden');
    });

    // Step 8: Regenerate with feedback
    document.getElementById('btn-regenerate').addEventListener('click', () => this._regenerateWithFeedback());

    // Step 8: Copy/Download optimized
    document.getElementById('btn-copy-optimized').addEventListener('click', () => {
      const llmKey = this.activeLLMTabOptimize;
      if (llmKey && this.generatedPrompts[llmKey] && this.generatedPrompts[llmKey]._optimizedMarkdown) {
        const editorEl = document.getElementById('editor-optimized');
        const text = (this.step8Modes.optimized === 'edit' && !editorEl.classList.contains('hidden'))
          ? editorEl.value
          : this.generatedPrompts[llmKey]._optimizedMarkdown;
        UIHelpers.copyToClipboard(text).then(() => {
          UIHelpers.showToast('Prompt optimise copie !', 'success');
        });
      }
    });

    document.getElementById('btn-download-optimized').addEventListener('click', (e) => {
      e.stopPropagation();
      document.getElementById('download-menu-optimized').classList.toggle('hidden');
    });

    document.getElementById('download-menu-optimized').addEventListener('click', (e) => {
      const opt = e.target.closest('.download-option');
      if (!opt) return;
      const format = opt.dataset.format;
      const llmKey = this.activeLLMTabOptimize;
      if (llmKey && this.generatedPrompts[llmKey] && this.generatedPrompts[llmKey]._optimizedMarkdown) {
        this._downloadInFormat(this.generatedPrompts[llmKey]._optimizedMarkdown, `prompt-optimise-${llmKey}`, format);
      }
      document.getElementById('download-menu-optimized').classList.add('hidden');
    });

    // Bind guide highlight listeners
    this._bindGuideListeners();

    // Close dropdown menus on outside click
    document.addEventListener('click', () => {
      document.querySelectorAll('.download-menu').forEach(m => m.classList.add('hidden'));
      document.querySelectorAll('.format-menu').forEach(m => m.classList.add('hidden'));
    });

    // Mode toggle buttons (present in both step-prompt-1 and step-agent-1)
    document.querySelectorAll('.mode-btn').forEach(btn => {
      btn.addEventListener('click', () => this.setMode(btn.dataset.mode));
    });

    // Agent: Add conversation starter
    const addStarterBtn = document.getElementById('add-starter');
    if (addStarterBtn) {
      addStarterBtn.addEventListener('click', () => this._addConversationStarter());
    }

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA' && e.target.tagName !== 'INPUT' && e.target.tagName !== 'SELECT') {
        e.preventDefault();
        this.nextStep();
      }
      if (e.key === 'Escape') {
        if (this.tutorialActive) this._closeTutorial();
        else this.closeSettings();
      }
    });
  }
};

// Bootstrap
document.addEventListener('DOMContentLoaded', () => App.init());
