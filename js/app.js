/**
 * Main Application Controller
 * Manages wizard navigation (8 steps), form state, localStorage, events
 */
const App = {

  currentStep: 1,
  totalSteps: 8,
  generatedPrompts: {},
  originalPrompts: {},
  activeLLMTab: null,
  activeLLMTabOptimize: null,
  editMode: false,
  previewMode: 'split', // 'split' or 'combined'
  smartQuestionsGenerated: false,

  // ===== INITIALIZATION =====

  init() {
    this.loadPreferences();
    this.renderStepIndicators();
    this.renderLLMCards();
    this.renderImageModelCards();
    this.renderVideoModelCards();
    this.renderTaskCards();
    this.bindEvents();
    this.updateNavigation();
    this.checkApiKey();
    this._updateGuideHighlights();
  },

  // ===== STEP INDICATORS =====

  renderStepIndicators() {
    const container = document.getElementById('step-indicators');
    container.innerHTML = '';
    for (let i = 1; i <= this.totalSteps; i++) {
      const dot = document.createElement('div');
      dot.className = 'step-dot' + (i === 1 ? ' active' : '');
      dot.textContent = i;
      dot.dataset.step = i;
      // Allow clicking on completed steps to go back
      dot.addEventListener('click', () => {
        const targetStep = parseInt(dot.dataset.step);
        if (targetStep < this.currentStep) {
          this.currentStep = targetStep;
          this.showStep(targetStep);
          if (targetStep === 4) this.updateStep4Fields();
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
      else if (step < this.currentStep) dot.classList.add('completed');
    });
    const pct = (this.currentStep / this.totalSteps) * 100;
    document.getElementById('progress-fill').style.width = pct + '%';
  },

  // ===== NAVIGATION =====

  nextStep() {
    if (!this.validateCurrentStep()) return;
    if (this.currentStep < this.totalSteps) {
      this.currentStep++;
      this.showStep(this.currentStep);
      if (this.currentStep === 4) this.updateStep4Fields();
      if (this.currentStep === 6) this.triggerSmartQuestions();
      if (this.currentStep === 7) this.generatePreview();
      if (this.currentStep === 8) this.prepareOptimizationStep();
    }
  },

  prevStep() {
    if (this.currentStep > 1) {
      this.currentStep--;
      this.showStep(this.currentStep);
      if (this.currentStep === 4) this.updateStep4Fields();
    }
  },

  goToStep(stepNumber) {
    if (stepNumber >= 1 && stepNumber <= this.totalSteps) {
      this.currentStep = stepNumber;
      this.showStep(stepNumber);
      if (stepNumber === 4) this.updateStep4Fields();
      if (stepNumber === 7) this.generatePreview();
      if (stepNumber === 8) this.prepareOptimizationStep();
    }
  },

  showStep(stepNumber) {
    document.querySelectorAll('.wizard-step').forEach(s => s.classList.remove('active'));
    const target = document.getElementById('step-' + stepNumber);
    if (target) target.classList.add('active');
    this.updateStepIndicators();
    this.updateNavigation();
    this._updateGuideHighlights();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  },

  updateNavigation() {
    const btnPrev = document.getElementById('btn-prev');
    const btnNext = document.getElementById('btn-next');

    btnPrev.disabled = this.currentStep === 1;

    if (this.currentStep === this.totalSteps) {
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
    const hasImage = PromptBuilder.hasImageModel(selected);
    const hasVideo = PromptBuilder.hasVideoModel(selected);

    const textFields = document.getElementById('text-fields');
    const imageFields = document.getElementById('image-fields');
    const videoFields = document.getElementById('video-fields');

    if (textFields) textFields.classList.toggle('hidden', !hasText);
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

    switch (this.currentStep) {
      case 1: {
        const models = document.querySelectorAll('.llm-card.selected');
        if (models.length === 0) {
          this._showError('error-step1');
          return false;
        }
        return true;
      }
      case 2: {
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
      case 3:
        return true;
      case 4: {
        const selected = this._getSelectedModels();
        const hasText = PromptBuilder.hasTextModel(selected);
        const hasImage = PromptBuilder.hasImageModel(selected);
        const hasVideo = PromptBuilder.hasVideoModel(selected);

        if (hasText) {
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

  _createModelCard(key, cfg) {
    const card = document.createElement('div');
    card.className = 'llm-card';
    card.dataset.llm = key;
    card.innerHTML = `
      <div class="llm-icon-img"><img src="${cfg.icon}" alt="${cfg.name}" loading="lazy"></div>
      <div class="llm-info">
        <h3>${cfg.name}</h3>
        <p>${cfg.description}</p>
      </div>
    `;
    card.addEventListener('click', () => {
      card.classList.toggle('selected');
      this._hideAllErrors();
    });
    return card;
  },

  // ===== TASK CARDS (Step 2) =====

  renderTaskCards() {
    const grid = document.getElementById('task-grid');
    grid.innerHTML = '';

    const tasks = [
      { key: 'redaction', icon: '\u270D\uFE0F', label: 'Rédaction / Génération' },
      { key: 'analyse', icon: '\uD83D\uDD0D', label: 'Analyse / Résumé' },
      { key: 'code', icon: '\uD83D\uDCBB', label: 'Code / Développement' },
      { key: 'extraction', icon: '\uD83D\uDCE5', label: 'Extraction de données' },
      { key: 'classification', icon: '\uD83C\uDFF7\uFE0F', label: 'Classification / Tri' },
      { key: 'traduction', icon: '\uD83C\uDF10', label: 'Traduction / Transformation' },
      { key: 'qa-rag', icon: '\u2753', label: 'Question-Réponse / RAG' },
      { key: 'agent', icon: '\uD83E\uDD16', label: 'Agent / Automatisation' },
      { key: 'brainstorming', icon: '\uD83D\uDCA1', label: 'Brainstorming / Créativité' },
      { key: 'image-gen', icon: '\uD83C\uDFA8', label: 'Génération d\'images' },
      { key: 'video-gen', icon: '\uD83C\uDFAC', label: 'Génération de vidéos' },
      { key: 'autre', icon: '\u2699\uFE0F', label: 'Autre' }
    ];

    tasks.forEach(t => {
      const card = document.createElement('div');
      card.className = 'task-card';
      card.dataset.task = t.key;
      card.innerHTML = `<span class="task-icon">${t.icon}</span> ${t.label}`;
      card.addEventListener('click', () => {
        document.querySelectorAll('.task-card').forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        this._hideAllErrors();

        const customDiv = document.getElementById('custom-task');
        customDiv.classList.toggle('hidden', t.key !== 'autre');

        this.updateCoTRecommendation(t.key);
      });
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

  // ===== SMART QUESTIONS (Step 6) =====

  triggerSmartQuestions() {
    if (this.smartQuestionsGenerated) return;

    const apiKey = localStorage.getItem('pf_api_key');
    if (!apiKey) {
      document.getElementById('questions-loading').classList.add('hidden');
      document.getElementById('smart-questions-skip').classList.remove('hidden');
      return;
    }

    this.generateSmartQuestions();
  },

  async generateSmartQuestions() {
    const apiKey = localStorage.getItem('pf_api_key');
    if (!apiKey) return;

    const loading = document.getElementById('questions-loading');
    const errorDiv = document.getElementById('smart-questions-error');
    const skipDiv = document.getElementById('smart-questions-skip');
    const listDiv = document.getElementById('smart-questions-list');

    loading.classList.remove('hidden');
    errorDiv.classList.add('hidden');
    skipDiv.classList.add('hidden');
    listDiv.classList.add('hidden');

    const formData = PromptBuilder.collectFormData();

    try {
      const response = await fetch('/api/questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ formData, apiKey })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Erreur lors de la generation des questions');
      }

      const result = await response.json();
      this.renderSmartQuestions(result.questions);
      this.smartQuestionsGenerated = true;

      if (result.inputTokens || result.outputTokens) {
        UIHelpers.showToast(
          `Questions generees (${result.inputTokens} in / ${result.outputTokens} out tokens)`,
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
        fieldHtml = `<select class="smart-answer">
          <option value="">-- Choisir --</option>
          ${q.options.map(o => `<option value="${o}">${o}</option>`).join('')}
        </select>`;
      } else {
        fieldHtml = `<input type="text" class="smart-answer" placeholder="${q.placeholder || ''}">`;
      }

      div.innerHTML = `<label>${q.question}</label>${fieldHtml}`;
      listDiv.appendChild(div);
    });

    listDiv.classList.remove('hidden');
  },

  collectSmartAnswers() {
    const answers = [];
    document.querySelectorAll('.smart-question').forEach(q => {
      const id = q.dataset.questionId;
      const input = q.querySelector('.smart-answer');
      const value = input ? input.value.trim() : '';
      if (value) {
        const label = q.querySelector('label').textContent;
        answers.push({ question: label, answer: value });
      }
    });
    return answers;
  },

  // ===== PREVIEW & GENERATION (Step 7) =====

  generatePreview() {
    const formData = PromptBuilder.collectFormData();
    this.generatedPrompts = PromptBuilder.generateAll(formData);
    // Save a copy as originals for comparison in step 8
    this.originalPrompts = JSON.parse(JSON.stringify(this.generatedPrompts));
    this.renderLLMTabs();
    const firstModel = formData.targetLLMs[0];
    this.showPromptForLLM(firstModel);
  },

  renderLLMTabs() {
    const tabsContainer = document.getElementById('llm-tabs');
    tabsContainer.innerHTML = '';
    const allConfigs = { ...LLMAdapters.config, ...LLMAdapters.imageConfig, ...LLMAdapters.videoConfig };

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
    const markdown = LLMAdapters.renderPreview(adapted, llmKey, this.previewMode);

    document.getElementById('prompt-editor').value = markdown;
    document.getElementById('prompt-preview').innerHTML = UIHelpers.renderMarkdown(markdown);

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
      preview.innerHTML = UIHelpers.renderMarkdown(editor.value);
    }
  },

  // ===== FEEDBACK (Step 7) =====

  applyFeedback() {
    const feedback = document.getElementById('preview-feedback').value.trim();
    if (!feedback) {
      UIHelpers.showToast('Veuillez decrire les modifications souhaitees.', 'error');
      return;
    }

    // Append feedback as constraint and regenerate
    const constraintsEl = document.getElementById('constraints');
    if (constraintsEl.value.trim()) {
      constraintsEl.value += '\n' + feedback;
    } else {
      constraintsEl.value = feedback;
    }

    this.generatePreview();
    document.getElementById('preview-feedback').value = '';
    UIHelpers.showToast('Prompt regenere avec vos modifications.', 'success');
  },

  // ===== AI OPTIMIZATION (Step 8) =====

  prepareOptimizationStep() {
    // Ensure we have generated prompts
    if (Object.keys(this.originalPrompts).length === 0) {
      this.generatePreview();
    }

    // Render tabs for step 8
    const tabsContainer = document.getElementById('llm-tabs-optimize');
    tabsContainer.innerHTML = '';
    const allConfigs = { ...LLMAdapters.config, ...LLMAdapters.imageConfig, ...LLMAdapters.videoConfig };

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

  showOptimizationForLLM(llmKey) {
    this.activeLLMTabOptimize = llmKey;

    document.querySelectorAll('#llm-tabs-optimize .llm-tab').forEach(t => {
      t.classList.toggle('active', t.dataset.llm === llmKey);
    });

    // Show original prompt on the left
    const original = this.originalPrompts[llmKey];
    const originalMd = LLMAdapters.renderPreview(original, llmKey, 'split');
    document.getElementById('preview-original').innerHTML = UIHelpers.renderMarkdown(originalMd);

    const originalRaw = LLMAdapters.getRawPrompt(original);
    const originalTokens = UIHelpers.estimateTokens(originalRaw);
    document.getElementById('token-counter-original').textContent = `~${originalTokens} tokens`;

    // Check if we have an optimized version
    if (this.generatedPrompts[llmKey] && this.generatedPrompts[llmKey]._optimized) {
      const optimizedMd = this.generatedPrompts[llmKey]._optimizedMarkdown;
      document.getElementById('preview-optimized').innerHTML = UIHelpers.renderMarkdown(optimizedMd);
      const optimizedTokens = UIHelpers.estimateTokens(optimizedMd);
      document.getElementById('token-counter-optimized').textContent = `~${optimizedTokens} tokens`;
      document.getElementById('btn-copy-optimized').disabled = false;
      document.getElementById('btn-download-optimized').disabled = false;
    } else {
      document.getElementById('preview-optimized').innerHTML = '<div class="comparison-placeholder"><p>Cliquez sur « Lancer l\'optimisation » pour voir le resultat ici.</p></div>';
      document.getElementById('token-counter-optimized').textContent = '';
      document.getElementById('btn-copy-optimized').disabled = true;
      document.getElementById('btn-download-optimized').disabled = true;
    }
  },

  async optimizeWithAI() {
    const apiKey = localStorage.getItem('pf_api_key');
    if (!apiKey) {
      this.openSettings();
      UIHelpers.showToast('Configurez votre cle API d\'abord.', 'error');
      return;
    }

    const llmKey = this.activeLLMTabOptimize;
    if (!llmKey || !this.originalPrompts[llmKey]) return;

    const original = this.originalPrompts[llmKey];
    const originalRaw = LLMAdapters.getRawPrompt(original);
    const formData = PromptBuilder.collectFormData();

    this._setLoadingState(true);

    try {
      const response = await fetch('/api/refine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: originalRaw,
          targetLLM: llmKey,
          taskType: formData.taskType,
          complexity: formData.complexity,
          apiKey: apiKey
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

      // Update right panel
      document.getElementById('preview-optimized').innerHTML = UIHelpers.renderMarkdown(result.optimizedPrompt);
      const tokens = UIHelpers.estimateTokens(result.optimizedPrompt);
      document.getElementById('token-counter-optimized').textContent = `~${tokens} tokens`;
      document.getElementById('btn-copy-optimized').disabled = false;
      document.getElementById('btn-download-optimized').disabled = false;

      UIHelpers.showToast('Prompt optimise avec succes !', 'success');

      if (result.inputTokens || result.outputTokens) {
        UIHelpers.showToast(
          `Tokens : ${result.inputTokens} in / ${result.outputTokens} out`,
          'info', 5000
        );
      }
    } catch (error) {
      UIHelpers.showToast('Erreur : ' + error.message, 'error', 5000);
    } finally {
      this._setLoadingState(false);
    }
  },

  _setLoadingState(loading) {
    const btn = document.getElementById('btn-optimize');
    const status = document.getElementById('ai-status');

    if (loading) {
      btn.disabled = true;
      btn.textContent = 'Optimisation...';
      status.classList.remove('hidden');
    } else {
      btn.disabled = !localStorage.getItem('pf_api_key');
      btn.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
        Lancer l'optimisation IA
      `;
      status.classList.add('hidden');
    }
  },

  // ===== SETTINGS MODAL =====

  openSettings() {
    document.getElementById('settings-modal').classList.remove('hidden');
    const saved = localStorage.getItem('pf_api_key');
    if (saved) document.getElementById('api-key').value = saved;
  },

  closeSettings() {
    document.getElementById('settings-modal').classList.add('hidden');
  },

  saveApiKey() {
    const key = document.getElementById('api-key').value.trim();
    if (key) {
      localStorage.setItem('pf_api_key', key);
      this.checkApiKey();
      UIHelpers.showToast('Cle API sauvegardee.', 'success');
    } else {
      localStorage.removeItem('pf_api_key');
      this.checkApiKey();
      UIHelpers.showToast('Cle API supprimee.', 'info');
    }
  },

  checkApiKey() {
    const hasKey = !!localStorage.getItem('pf_api_key');
    const btn = document.getElementById('btn-optimize');
    if (btn) btn.disabled = !hasKey;
  },

  // ===== LOCAL STORAGE =====

  loadPreferences() {
    this.checkApiKey();
  },

  clearAllData() {
    localStorage.removeItem('pf_api_key');
    localStorage.removeItem('pf_preferences');
    localStorage.removeItem('pf_history');
    this.checkApiKey();
    UIHelpers.showToast('Toutes les donnees ont ete effacees.', 'info');
  },

  // ===== GUIDE HIGHLIGHTS (Permanent) =====

  _highlightIfEmpty(id) {
    const el = document.getElementById(id);
    if (!el) return;
    if (el.tagName === 'SELECT') {
      if (!el.value || el.value === '') el.classList.add('guide-highlight');
    } else {
      if (!el.value.trim()) el.classList.add('guide-highlight');
    }
  },

  _updateGuideHighlights() {
    // Clear all previous highlights
    document.querySelectorAll('.guide-highlight, .guide-highlight-grid').forEach(el => {
      el.classList.remove('guide-highlight', 'guide-highlight-grid');
    });

    switch (this.currentStep) {
      case 1: {
        const hasSelected = document.querySelectorAll('.llm-card.selected').length > 0;
        if (!hasSelected) {
          document.getElementById('llm-grid').classList.add('guide-highlight-grid');
        }
        break;
      }
      case 2: {
        const hasTask = document.querySelector('.task-card.selected');
        if (!hasTask) {
          document.getElementById('task-grid').classList.add('guide-highlight-grid');
        }
        this._highlightIfEmpty('persona');
        break;
      }
      case 3: {
        this._highlightIfEmpty('domain');
        this._highlightIfEmpty('audience');
        this._highlightIfEmpty('output-language');
        this._highlightIfEmpty('tone');
        break;
      }
      case 4: {
        const selected = this._getSelectedModels();
        const hasText = PromptBuilder.hasTextModel(selected);
        const hasImage = PromptBuilder.hasImageModel(selected);
        const hasVideo = PromptBuilder.hasVideoModel(selected);

        if (hasText) {
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
    });
  },

  // ===== EVENT BINDING =====

  bindEvents() {
    // Navigation
    document.getElementById('btn-next').addEventListener('click', () => this.nextStep());
    document.getElementById('btn-prev').addEventListener('click', () => this.prevStep());

    // Logo -> home (step 1)
    document.getElementById('logo-home').addEventListener('click', (e) => {
      e.preventDefault();
      this.currentStep = 1;
      this.showStep(1);
    });

    // Settings modal
    document.getElementById('btn-settings').addEventListener('click', () => this.openSettings());
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
    document.getElementById('btn-clear-history').addEventListener('click', () => this.clearAllData());

    // Close modal on overlay click
    document.getElementById('settings-modal').addEventListener('click', (e) => {
      if (e.target.classList.contains('modal-overlay')) this.closeSettings();
    });

    // "Autre" pattern bindings
    this._bindAutrePattern('domain', 'domain-autre');
    this._bindAutrePattern('audience', 'audience-autre');
    this._bindAutrePattern('output-language', 'language-autre');
    this._bindAutrePattern('tone', 'tone-autre');
    this._bindAutrePattern('output-format', 'output-format-autre');

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

    // Step 7: Actions
    document.getElementById('btn-copy').addEventListener('click', () => {
      const text = document.getElementById('prompt-editor').value;
      UIHelpers.copyToClipboard(text).then(() => {
        UIHelpers.showToast('Prompt copie !', 'success');
      });
    });

    document.getElementById('btn-download').addEventListener('click', () => {
      const text = document.getElementById('prompt-editor').value;
      const model = this.activeLLMTab || 'prompt';
      UIHelpers.downloadAsMarkdown(text, `prompt-${model}.md`);
      UIHelpers.showToast('Fichier telecharge.', 'success');
    });

    // Step 7: Feedback
    document.getElementById('btn-apply-feedback').addEventListener('click', () => this.applyFeedback());

    // Step 8: Optimize
    document.getElementById('btn-optimize').addEventListener('click', () => this.optimizeWithAI());

    // Step 8: Copy/Download original
    document.getElementById('btn-copy-original').addEventListener('click', () => {
      const llmKey = this.activeLLMTabOptimize;
      if (llmKey && this.originalPrompts[llmKey]) {
        const text = LLMAdapters.getRawPrompt(this.originalPrompts[llmKey]);
        UIHelpers.copyToClipboard(text).then(() => {
          UIHelpers.showToast('Prompt original copie !', 'success');
        });
      }
    });

    document.getElementById('btn-download-original').addEventListener('click', () => {
      const llmKey = this.activeLLMTabOptimize;
      if (llmKey && this.originalPrompts[llmKey]) {
        const text = LLMAdapters.getRawPrompt(this.originalPrompts[llmKey]);
        UIHelpers.downloadAsMarkdown(text, `prompt-original-${llmKey}.md`);
        UIHelpers.showToast('Fichier telecharge.', 'success');
      }
    });

    // Step 8: Copy/Download optimized
    document.getElementById('btn-copy-optimized').addEventListener('click', () => {
      const llmKey = this.activeLLMTabOptimize;
      if (llmKey && this.generatedPrompts[llmKey] && this.generatedPrompts[llmKey]._optimizedMarkdown) {
        UIHelpers.copyToClipboard(this.generatedPrompts[llmKey]._optimizedMarkdown).then(() => {
          UIHelpers.showToast('Prompt optimise copie !', 'success');
        });
      }
    });

    document.getElementById('btn-download-optimized').addEventListener('click', () => {
      const llmKey = this.activeLLMTabOptimize;
      if (llmKey && this.generatedPrompts[llmKey] && this.generatedPrompts[llmKey]._optimizedMarkdown) {
        UIHelpers.downloadAsMarkdown(this.generatedPrompts[llmKey]._optimizedMarkdown, `prompt-optimise-${llmKey}.md`);
        UIHelpers.showToast('Fichier telecharge.', 'success');
      }
    });

    // Bind guide highlight listeners
    this._bindGuideListeners();

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA' && e.target.tagName !== 'INPUT' && e.target.tagName !== 'SELECT') {
        e.preventDefault();
        this.nextStep();
      }
      if (e.key === 'Escape') this.closeSettings();
    });
  }
};

// Bootstrap
document.addEventListener('DOMContentLoaded', () => App.init());
