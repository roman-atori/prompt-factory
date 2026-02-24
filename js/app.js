/**
 * Main Application Controller
 * Manages wizard navigation, form state, localStorage, events
 */
const App = {

  currentStep: 1,
  totalSteps: 6,
  generatedPrompts: {},
  activeLLMTab: null,
  editMode: false,

  // ===== INITIALIZATION =====

  init() {
    this.loadPreferences();
    this.renderStepIndicators();
    this.renderLLMCards();
    this.renderImageModelCards();
    this.renderTaskCards();
    this.bindEvents();
    this.updateNavigation();
    this.checkApiKey();
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
      // Update conditional fields when entering step 4
      if (this.currentStep === 4) this.updateStep4Fields();
      if (this.currentStep === 6) this.generatePreview();
    }
  },

  prevStep() {
    if (this.currentStep > 1) {
      this.currentStep--;
      this.showStep(this.currentStep);
      if (this.currentStep === 4) this.updateStep4Fields();
    }
  },

  showStep(stepNumber) {
    document.querySelectorAll('.wizard-step').forEach(s => s.classList.remove('active'));
    const target = document.getElementById('step-' + stepNumber);
    if (target) target.classList.add('active');
    this.updateStepIndicators();
    this.updateNavigation();
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

  /**
   * Show/hide text, image, video fields based on selected models
   */
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

        // Validate text task description if text models selected
        if (hasText) {
          const desc = document.getElementById('task-description').value.trim();
          if (!desc) { this._showError('error-step4'); return false; }
        }
        // Validate image subject if image models selected
        if (hasImage) {
          const subj = document.getElementById('img-subject').value.trim();
          if (!subj) { this._showError('error-step4'); return false; }
        }
        // Validate video subject if video models selected
        if (hasVideo) {
          const subj = document.getElementById('vid-subject').value.trim();
          if (!subj) { this._showError('error-step4'); return false; }
        }
        return true;
      }
      case 5:
        return true;
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

  _createModelCard(key, cfg) {
    const card = document.createElement('div');
    card.className = 'llm-card';
    card.dataset.llm = key;
    card.innerHTML = `
      <div class="llm-icon" style="background: ${cfg.color}">${cfg.letter}</div>
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
      { key: 'redaction', icon: '\u270D\uFE0F', label: 'Redaction / Generation' },
      { key: 'analyse', icon: '\uD83D\uDD0D', label: 'Analyse / Resume' },
      { key: 'code', icon: '\uD83D\uDCBB', label: 'Code / Developpement' },
      { key: 'extraction', icon: '\uD83D\uDCE5', label: 'Extraction de donnees' },
      { key: 'classification', icon: '\uD83C\uDFF7\uFE0F', label: 'Classification / Tri' },
      { key: 'traduction', icon: '\uD83C\uDF10', label: 'Traduction / Transformation' },
      { key: 'qa-rag', icon: '\u2753', label: 'Question-Reponse / RAG' },
      { key: 'agent', icon: '\uD83E\uDD16', label: 'Agent / Automatisation' },
      { key: 'brainstorming', icon: '\uD83D\uDCA1', label: 'Brainstorming / Creativite' },
      { key: 'image-gen', icon: '\uD83C\uDFA8', label: 'Generation d\'images' },
      { key: 'video-gen', icon: '\uD83C\uDFAC', label: 'Generation de videos' },
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
        <label>Entree (input)</label>
        <textarea class="example-input" rows="2" placeholder="Exemple d'entree..."></textarea>
      </div>
      <div class="form-group">
        <label>Sortie attendue (output)</label>
        <textarea class="example-output" rows="2" placeholder="Reponse attendue..."></textarea>
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

  // ===== PREVIEW & GENERATION (Step 6) =====

  generatePreview() {
    const formData = PromptBuilder.collectFormData();
    this.generatedPrompts = PromptBuilder.generateAll(formData);
    this.renderLLMTabs();
    const firstModel = formData.targetLLMs[0];
    this.showPromptForLLM(firstModel);
  },

  renderLLMTabs() {
    const tabsContainer = document.getElementById('llm-tabs');
    tabsContainer.innerHTML = '';
    const allConfigs = { ...LLMAdapters.config, ...LLMAdapters.imageConfig };

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

    document.querySelectorAll('.llm-tab').forEach(t => {
      t.classList.toggle('active', t.dataset.llm === llmKey);
    });

    const adapted = this.generatedPrompts[llmKey];
    const markdown = LLMAdapters.renderPreview(adapted, llmKey);

    document.getElementById('prompt-editor').value = markdown;
    document.getElementById('prompt-preview').innerHTML = UIHelpers.renderMarkdown(markdown);

    const rawText = LLMAdapters.getRawPrompt(adapted);
    const tokens = UIHelpers.estimateTokens(rawText);
    document.getElementById('token-counter').textContent = `~${tokens} tokens`;

    this.setEditMode(false);
  },

  setEditMode(isEdit) {
    this.editMode = isEdit;
    const editor = document.getElementById('prompt-editor');
    const preview = document.getElementById('prompt-preview');
    const btnEdit = document.getElementById('btn-edit-mode');
    const btnPreview = document.getElementById('btn-preview-mode');

    if (isEdit) {
      editor.classList.remove('hidden');
      preview.classList.add('hidden');
      btnEdit.classList.add('active');
      btnPreview.classList.remove('active');
    } else {
      editor.classList.add('hidden');
      preview.classList.remove('hidden');
      btnEdit.classList.remove('active');
      btnPreview.classList.add('active');
      preview.innerHTML = UIHelpers.renderMarkdown(editor.value);
    }
  },

  // ===== AI REFINEMENT =====

  async optimizeWithAI() {
    const apiKey = localStorage.getItem('pf_api_key');
    if (!apiKey) {
      this.openSettings();
      UIHelpers.showToast('Configurez votre cle API d\'abord.', 'error');
      return;
    }

    const currentPrompt = document.getElementById('prompt-editor').value;
    const formData = PromptBuilder.collectFormData();

    this._setLoadingState(true);

    try {
      const response = await fetch('/api/refine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: currentPrompt,
          targetLLM: this.activeLLMTab,
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

      document.getElementById('prompt-editor').value = result.optimizedPrompt;
      document.getElementById('prompt-preview').innerHTML = UIHelpers.renderMarkdown(result.optimizedPrompt);

      const tokens = UIHelpers.estimateTokens(result.optimizedPrompt);
      document.getElementById('token-counter').textContent = `~${tokens} tokens`;

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
        Optimiser avec l'IA
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

  // ===== EVENT BINDING =====

  bindEvents() {
    // Navigation
    document.getElementById('btn-next').addEventListener('click', () => this.nextStep());
    document.getElementById('btn-prev').addEventListener('click', () => this.prevStep());

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

    // Step 6: Edit/Preview mode
    document.getElementById('btn-edit-mode').addEventListener('click', () => this.setEditMode(true));
    document.getElementById('btn-preview-mode').addEventListener('click', () => this.setEditMode(false));

    // Step 6: Actions
    document.getElementById('btn-optimize').addEventListener('click', () => this.optimizeWithAI());

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

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA' && e.target.tagName !== 'INPUT') {
        e.preventDefault();
        this.nextStep();
      }
      if (e.key === 'Escape') this.closeSettings();
    });
  }
};

// Bootstrap
document.addEventListener('DOMContentLoaded', () => App.init());
