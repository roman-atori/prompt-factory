/**
 * UI Helper Functions
 * Markdown rendering, clipboard, download, toast notifications
 */
const UIHelpers = {

  /**
   * Render Markdown to HTML using marked.js + highlight.js
   */
  renderMarkdown(markdown) {
    if (typeof marked === 'undefined') return this.escapeHtml(markdown);

    marked.setOptions({
      gfm: true,
      breaks: true,
      highlight: function(code, lang) {
        if (typeof hljs !== 'undefined' && lang && hljs.getLanguage(lang)) {
          return hljs.highlight(code, { language: lang }).value;
        }
        return code;
      }
    });
    return marked.parse(markdown);
  },

  /**
   * Copy text to clipboard
   */
  async copyToClipboard(text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      return true;
    }
  },

  /**
   * Download content as .md file
   */
  downloadAsMarkdown(content, filename) {
    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
    this._downloadBlob(blob, filename || 'prompt.md');
  },

  /**
   * Download content as .txt file
   */
  downloadAsText(content, filename) {
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    this._downloadBlob(blob, filename || 'prompt.txt');
  },

  /**
   * Download markdown content as .html file (rendered)
   */
  downloadAsHTML(markdownContent, filename, title) {
    const htmlBody = this.renderMarkdown(markdownContent);
    const html = `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${title || 'Prompt Factory'}</title>
<style>
body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 800px; margin: 40px auto; padding: 0 20px; color: #1a1a1a; line-height: 1.7; }
h1 { font-size: 1.5rem; border-bottom: 2px solid #2563eb; padding-bottom: 8px; }
h2 { font-size: 1.2rem; margin-top: 2rem; color: #334155; }
pre { background: #f1f5f9; padding: 16px; border-radius: 8px; overflow-x: auto; }
code { background: #f1f5f9; padding: 2px 6px; border-radius: 4px; font-size: 0.9em; }
pre code { background: none; padding: 0; }
blockquote { border-left: 3px solid #2563eb; padding-left: 16px; color: #475569; margin: 16px 0; }
</style>
</head>
<body>
${htmlBody}
</body>
</html>`;
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    this._downloadBlob(blob, filename || 'prompt.html');
  },

  _downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },

  /**
   * Show toast notification
   */
  showToast(message, type = 'info', duration = 3000) {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    container.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('removing');
      setTimeout(() => toast.remove(), 200);
    }, duration);
  },

  /**
   * Escape HTML characters for security
   */
  escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  },

  /**
   * Estimate token count (rough: ~4 chars per token)
   */
  estimateTokens(text) {
    if (!text) return 0;
    return Math.ceil(text.length / 4);
  }
};
