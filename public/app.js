/* ================================================================
   INKRAFT — Frontend Application Logic (v3)
   Responsive, polished, all fixes applied
   ================================================================ */

(function () {
  'use strict';

  // ── DOM refs ────────────────────────────────────────────────────
  const form = document.getElementById('generate-form');
  const keywordInput = document.getElementById('keyword-input');
  const audienceInput = document.getElementById('audience-input');
  const toneSelect = document.getElementById('tone-select');
  const typeSelect = document.getElementById('type-select');
  const wordcountInput = document.getElementById('wordcount-input');
  const wordcountHelper = document.getElementById('wordcount-helper');
  const toggleBtn = document.getElementById('toggle-options');
  const optionsPanel = document.getElementById('advanced-options');
  const generateBtn = document.getElementById('generate-btn');
  const imageStyleGrid = document.getElementById('image-style-grid');
  const optionsSummary = document.getElementById('options-summary');

  const inputSection = document.getElementById('input-section');
  const loadingSection = document.getElementById('loading-section');
  const loaderSteps = document.getElementById('loader-steps');
  const progressFill = document.getElementById('progress-fill');
  const progressFillMobile = document.getElementById('progress-fill-mobile');
  const loadingPercent = document.getElementById('loading-percent');
  const loadingStatusMobile = document.getElementById('loading-status-mobile');
  const errorSection = document.getElementById('error-section');
  const errorMessage = document.getElementById('error-message');
  const errorDismiss = document.getElementById('error-dismiss');
  const errorRetry = document.getElementById('error-retry');
  const outputSection = document.getElementById('output-section');
  const exampleChips = document.getElementById('example-chips');
  const newArticleBtn = document.getElementById('new-article-btn');
  const copyAllMetaBtn = document.getElementById('copy-all-meta-btn');
  const footerText = document.getElementById('footer-text');
  const resetSettingsBtn = document.getElementById('reset-settings');

  const DEFAULT_TITLE = 'Inkraft — AI Blog Article Engine';
  let selectedImageStyle = 'photorealistic';
  let activeTab = 'seo-brief';

  window.currentState = {
    keyword: '', tone: '', contentType: '', wordCount: '', audience: '', 
    imageStyle: 'photorealistic', articleTitle: '', articleExcerpt: ''
  };

  const tabsNav = document.getElementById('tabs-nav');
  const wordCountBadge = document.getElementById('word-count-badge');
  const readingTimeBadge = document.getElementById('reading-time-badge');
  const qualityScoreBadge = document.getElementById('quality-score-badge');

  // History
  const historyToggle = document.getElementById('history-toggle');
  const historySidebar = document.getElementById('history-sidebar');
  const historyClose = document.getElementById('history-close');
  const historyOverlay = document.getElementById('history-overlay');
  const historyList = document.getElementById('history-list');

  // Version toggle
  const toggleV1 = document.getElementById('toggle-v1');
  const toggleV2 = document.getElementById('toggle-v2');

  // Content containers
  const contentMap = {
    'seo-brief': document.getElementById('seo-brief-content'),
    'outline': document.getElementById('outline-content'),
    'article': document.getElementById('article-content'),
    'seo-meta': document.getElementById('seo-meta-content'),
    'image-prompt': document.getElementById('image-prompt-content'),
  };

  const rawContent = {
    'seo-brief': '', 'outline': '', 'article': '', 'seo-meta': '', 'image-prompt': '',
  };

  let lastRequestBody = null;
  let isGenerating = false;
  let stepInterval = null;
  const stepLabels = [
    'Analysing search intent...',
    'Mapping semantic entities...',
    'Building article outline...',
    'Writing full article...',
    'Generating SEO package & image prompt...',
  ];

  // ══════════════════════════════════════════════════════════════════
  //  THEME TOGGLE
  // ══════════════════════════════════════════════════════════════════

  const THEME_KEY = 'inkraft_theme';

  function applyTheme(theme) {
    document.body.setAttribute('data-theme', theme);
    toggleV1.classList.toggle('active', theme === 'v1');
    toggleV2.classList.toggle('active', theme === 'v2');
    footerText.textContent = theme === 'v2' ? 'Inkraft v2.0 — Powered by Gemini' : 'Inkraft v1.0 — Powered by Gemini';
    localStorage.setItem(THEME_KEY, theme);
  }

  applyTheme(localStorage.getItem(THEME_KEY) || 'v1');

  toggleV1.addEventListener('click', () => applyTheme('v1'));
  toggleV2.addEventListener('click', () => applyTheme('v2'));

  // ══════════════════════════════════════════════════════════════════
  //  SETTINGS MEMORY
  // ══════════════════════════════════════════════════════════════════

  const SETTINGS_KEY = 'inkraft_settings';

  function loadSettings() {
    const saved = localStorage.getItem(SETTINGS_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.tone) toneSelect.value = parsed.tone;
        if (parsed.contentType) typeSelect.value = parsed.contentType;
        if (parsed.wordCount) wordcountInput.value = parsed.wordCount;
        if (parsed.audience) audienceInput.value = parsed.audience;
        if (parsed.imageStyle) {
          selectedImageStyle = parsed.imageStyle;
          selectStyleCard(parsed.imageStyle);
        }
        resetSettingsBtn.classList.remove('hidden');
      } catch(e) {}
    }
    updateWordcountHelper();
    updateOptionsSummary();
  }

  function saveSettings(body) {
    if (body.tone || body.contentType || body.wordCount || body.audience || body.imageStyle) {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify({
        tone: body.tone,
        contentType: body.contentType,
        wordCount: body.wordCount,
        audience: body.audience,
        imageStyle: body.imageStyle
      }));
      resetSettingsBtn.classList.remove('hidden');
    } else {
      localStorage.removeItem(SETTINGS_KEY);
      resetSettingsBtn.classList.add('hidden');
    }
  }

  resetSettingsBtn.addEventListener('click', (e) => {
    e.preventDefault();
    toneSelect.value = '';
    typeSelect.value = '';
    wordcountInput.value = '';
    audienceInput.value = '';
    selectedImageStyle = 'photorealistic';
    selectStyleCard('photorealistic');
    localStorage.removeItem(SETTINGS_KEY);
    resetSettingsBtn.classList.add('hidden');
    updateWordcountHelper();
    updateOptionsSummary();
  });

  loadSettings();

  // ══════════════════════════════════════════════════════════════════
  //  TOGGLE / EVENTS
  // ══════════════════════════════════════════════════════════════════

  toggleBtn.addEventListener('click', () => {
    const isCollapsed = optionsPanel.classList.contains('collapsed');
    optionsPanel.classList.toggle('collapsed', !isCollapsed);
    optionsPanel.classList.toggle('expanded', isCollapsed);
    toggleBtn.classList.toggle('open', isCollapsed);
    // Show/hide options summary
    if (isCollapsed) {
      // Panel is now expanding — hide summary
      optionsSummary.classList.add('hidden');
    } else {
      // Panel is now collapsing — show summary
      optionsSummary.classList.remove('hidden');
    }
  });

  // ── Image Style Picker ──────────────────────────────────────────
  function selectStyleCard(style) {
    imageStyleGrid.querySelectorAll('.style-card').forEach(c => c.classList.remove('selected'));
    const card = imageStyleGrid.querySelector(`[data-style="${style}"]`);
    if (card) card.classList.add('selected');
    selectedImageStyle = style;
  }

  imageStyleGrid.addEventListener('click', (e) => {
    const card = e.target.closest('.style-card');
    if (!card) return;
    selectStyleCard(card.dataset.style);
    updateOptionsSummary();
  });

  // ── Word Count Helper ──────────────────────────────────────────
  function updateWordcountHelper() {
    const val = parseInt(wordcountInput.value, 10);
    if (!wordcountInput.value.trim() || isNaN(val) || val === 0) {
      wordcountHelper.textContent = 'Auto (Gemini decides — usually 3,000–5,000)';
    } else if (val >= 1000 && val <= 2000) {
      wordcountHelper.textContent = 'Short article — good for quick reads';
    } else if (val >= 2001 && val <= 3500) {
      wordcountHelper.textContent = 'Standard article — good for most topics';
    } else if (val >= 3501 && val <= 5000) {
      wordcountHelper.textContent = 'Long-form — great for SEO authority';
    } else if (val > 5000) {
      wordcountHelper.textContent = 'Pillar content — maximum depth and ranking potential';
    } else {
      wordcountHelper.textContent = 'Auto (Gemini decides — usually 3,000–5,000)';
    }
  }

  wordcountInput.addEventListener('input', updateWordcountHelper);

  // ── Options Summary Line ────────────────────────────────────────
  function getStyleLabel(style) {
    const map = {
      'photorealistic': 'Photorealistic',
      'flat-illustration': 'Flat Illustration',
      'cinematic': 'Cinematic',
      'corporate-clean': 'Corporate Clean',
      'abstract-art': 'Abstract Art',
      'isometric-3d': 'Isometric 3D'
    };
    return map[style] || 'Photorealistic';
  }

  function updateOptionsSummary() {
    const stylePart = `Style: <strong>${getStyleLabel(selectedImageStyle)}</strong>`;
    const tonePart = `Tone: <strong>${toneSelect.options[toneSelect.selectedIndex]?.text || 'Auto'}</strong>`;
    const typePart = `Type: <strong>${typeSelect.options[typeSelect.selectedIndex]?.text || 'Auto-detect'}</strong>`;
    optionsSummary.innerHTML = `${stylePart} · ${tonePart} · ${typePart}`;
  }

  toneSelect.addEventListener('change', updateOptionsSummary);
  typeSelect.addEventListener('change', updateOptionsSummary);

  errorDismiss.addEventListener('click', () => {
    errorSection.classList.add('hidden');
    inputSection.classList.remove('hidden');
    exampleChips.classList.remove('hidden');
  });

  errorRetry.addEventListener('click', () => {
    if (lastRequestBody) { errorSection.classList.add('hidden'); startGeneration(lastRequestBody); }
  });

  // ── Example chips ───────────────────────────────────────────────
  exampleChips.addEventListener('click', (e) => {
    const chip = e.target.closest('.chip');
    if (!chip) return;
    keywordInput.value = chip.dataset.keyword;
    keywordInput.focus();
  });

  // ── New article button ──────────────────────────────────────────
  newArticleBtn.addEventListener('click', () => {
    resetOutput();
    keywordInput.value = '';
    inputSection.classList.remove('hidden');
    exampleChips.classList.remove('hidden');
    outputSection.classList.add('hidden');
    newArticleBtn.classList.add('hidden');
    document.title = DEFAULT_TITLE;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  // ── Tab switching ───────────────────────────────────────────────
  tabsNav.addEventListener('click', (e) => {
    const btn = e.target.closest('.tab-btn');
    if (!btn) return;
    switchTab(btn.dataset.tab);
  });

  function switchTab(tabId) {
    activeTab = tabId;
    tabsNav.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    const btn = tabsNav.querySelector(`[data-tab="${tabId}"]`);
    if (btn) btn.classList.add('active');
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
    const panel = document.getElementById(`tab-${tabId}`);
    if (panel) panel.classList.add('active');
    // Show/hide reading progress bar
    const progressBar = document.getElementById('reading-progress-bar');
    if (tabId === 'article' && rawContent['article']) {
      progressBar.classList.remove('hidden');
      updateReadingProgress();
    } else {
      progressBar.classList.add('hidden');
    }
  }

  // ── Copy buttons ────────────────────────────────────────────────
  document.addEventListener('click', (e) => {
    const copyBtn = e.target.closest('.copy-btn');
    if (!copyBtn) return;
    const copyType = copyBtn.dataset.copyType;
    const targetId = copyBtn.dataset.target;
    let text = '';

    if (copyBtn.dataset.value) {
      text = copyBtn.dataset.value;
    } else if (copyType === 'clean') {
      text = stripMarkdown(rawContent['article'] || '');
    } else if (copyType === 'wp-html') {
      text = convertToWordPressHTML(rawContent['article'] || '');
    } else if (copyType === 'markdown') {
      text = rawContent['article'] || '';
    } else {
      const keyMap = { 'seo-brief-content': 'seo-brief', 'outline-content': 'outline', 'article-content': 'article', 'seo-meta-content': 'seo-meta', 'image-prompt-content': 'image-prompt' };
      text = rawContent[keyMap[targetId]] || '';
    }
    if (!text) return;
    
    if (copyType === 'wp-html') {
      doCopy(copyBtn, text, 'Copied WordPress HTML!');
    } else {
      doCopy(copyBtn, text);
    }
  });

  // ── Copy all metadata ──────────────────────────────────────────
  copyAllMetaBtn.addEventListener('click', () => {
    const fields = document.querySelectorAll('#seo-meta-content .meta-field');
    const lines = [];
    fields.forEach(f => {
      const label = f.querySelector('.meta-field-label')?.textContent?.trim() || '';
      const value = f.querySelector('.meta-field-value')?.textContent?.trim() || '';
      if (label && value) lines.push(`${label}: ${value}`);
    });
    const text = lines.join('\n');
    if (text) doCopy(copyAllMetaBtn, text);
  });

  // ── Change Style link ─────────────────────────────────────────
  const changeStyleLink = document.getElementById('change-style-link');
  changeStyleLink.addEventListener('click', (e) => {
    e.preventDefault();
    // Open the Advanced Options if collapsed
    if (optionsPanel.classList.contains('collapsed')) {
      optionsPanel.classList.remove('collapsed');
      optionsPanel.classList.add('expanded');
      toggleBtn.classList.add('open');
      optionsSummary.classList.add('hidden');
    }
    // Scroll to the style picker
    const styleSection = document.querySelector('.image-style-section');
    if (styleSection) {
      styleSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  });

  // ── Copy All Prompts ──────────────────────────────────────────
  const copyAllPromptsBtn = document.getElementById('copy-all-prompts-btn');
  copyAllPromptsBtn.addEventListener('click', () => {
    const boxes = document.querySelectorAll('#image-prompt-content .prompt-box');
    const parts = [];
    boxes.forEach(box => {
      const title = box.querySelector('.prompt-box-header')?.textContent?.replace('Copy', '').trim() || '';
      const body = box.querySelector('.prompt-box-body')?.textContent?.trim() || '';
      if (title && body) parts.push(`━━━ ${title} ━━━\n${body}`);
    });
    const text = parts.join('\n\n');
    if (text) doCopy(copyAllPromptsBtn, text);
  });

  function doCopy(btn, text, customMessage = '✓ Copied') {
    navigator.clipboard.writeText(text).then(() => {
      const orig = btn.textContent;
      btn.textContent = customMessage;
      btn.classList.add('copied');
      setTimeout(() => { btn.textContent = orig; btn.classList.remove('copied'); }, 2000);
    });
  }

  function stripMarkdown(md) {
    // Strip any leaked delimiter tags
    md = md.replace(/%%[A-Z0-9_]+_(?:START|END)%%/g, '').trim();
    return md.replace(/#{1,6}\s/g, '').replace(/\*\*\*(.+?)\*\*\*/g, '$1').replace(/\*\*(.+?)\*\*/g, '$1').replace(/__(.+?)__/g, '$1').replace(/\*(.+?)\*/g, '$1').replace(/_(.+?)_/g, '$1').replace(/~~(.+?)~~/g, '$1').replace(/`([^`]+)`/g, '$1').replace(/```[\s\S]*?```/g, '').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').replace(/^>\s*/gm, '').replace(/^[-*+]\s+/gm, '• ').replace(/^\d+\.\s+/gm, '').replace(/^---+$/gm, '').replace(/^\*\*\*+$/gm, '').replace(/[━─=]{3,}/g, '').replace(/\n{3,}/g, '\n\n').trim();
  }

  function convertToWordPressHTML(md) {
    if (!md) return '';
    
    // Strip delimiter tags first
    md = md.replace(/%%[A-Z0-9_]+_(?:START|END)%%/g, '').trim();
    
    let html = md;

    // Step 1: Handle callout boxes BEFORE any escaping
    // These produce real HTML so must come first
    html = html.replace(
      /^(?:>\s*)?💡\s*\*\*Pro Tip:\*\*\s*(.+)$/gm,
      '<div class="wp-block-callout" style="background:#f0f7ff;border-left:4px solid #6B4EFF;padding:16px 20px;border-radius:0 8px 8px 0;margin:24px 0"><p>💡 <strong>Pro Tip:</strong> $1</p></div>'
    );
    html = html.replace(
      /^(?:>\s*)?⚠️\s*\*\*Watch Out:\*\*\s*(.+)$/gm,
      '<div class="wp-block-callout" style="background:#fff4f0;border-left:4px solid #FF503C;padding:16px 20px;border-radius:0 8px 8px 0;margin:24px 0"><p>⚠️ <strong>Watch Out:</strong> $1</p></div>'
    );
    html = html.replace(
      /^(?:>\s*)?🔑\s*\*\*Quick Win:\*\*\s*(.+)$/gm,
      '<div class="wp-block-callout" style="background:#f5ffeb;border-left:4px solid #1AA84C;padding:16px 20px;border-radius:0 8px 8px 0;margin:24px 0"><p>🔑 <strong>Quick Win:</strong> $1</p></div>'
    );

    // Step 2: Split into lines, process non-HTML lines only
    const lines = html.split('\n');
    const processed = lines.map(line => {
      // Don't escape lines that are already HTML (callout divs)
      if (line.trim().startsWith('<div') || line.trim().startsWith('</div>')) {
        return line;
      }
      // Escape HTML special chars in content lines
      return line
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
    });
    html = processed.join('\n');

    // Step 3: Convert markdown to WordPress HTML
    // Tables
    html = renderTables(html).replace(/<table>/g, '<table class="wp-block-table">');

    // Headings
    html = html.replace(/^#### (.+)$/gm, '<h4 class="wp-block-heading">$1</h4>');
    html = html.replace(/^### (.+)$/gm,  '<h3 class="wp-block-heading">$1</h3>');
    html = html.replace(/^## (.+)$/gm,   '<h2 class="wp-block-heading">$1</h2>');
    html = html.replace(/^# (.+)$/gm,    '<h1 class="wp-block-heading">$1</h1>');

    // Inline formatting
    html = html.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
    html = html.replace(/\*\*(.+?)\*\*/g,     '<strong>$1</strong>');
    html = html.replace(/__(.+?)__/g,         '<strong>$1</strong>');
    html = html.replace(/\*(.+?)\*/g,         '<em>$1</em>');
    html = html.replace(/_(.+?)_/g,           '<em>$1</em>');

    // Horizontal rules
    html = html.replace(/^---+$/gm,    '<hr class="wp-block-separator"/>');
    html = html.replace(/^\*\*\*+$/gm, '<hr class="wp-block-separator"/>');

    // Blockquotes (generic, non-callout)
    html = html.replace(
      /^(?:&gt;|>) (?!<div)(.+)$/gm,
      '<blockquote class="wp-block-quote"><p>$1</p></blockquote>'
    );
    html = html.replace(/<\/blockquote>\n<blockquote[^>]*>/g, '\n');

    // Unordered lists
    html = html.replace(/((?:^[-*+] .+\n?)+)/gm, (m) => {
      const items = m.trim().split('\n')
        .filter(l => l.trim())
        .map(l => `<li>${l.replace(/^[-*+]\s+/, '')}</li>`)
        .join('\n');
      return `<ul>\n${items}\n</ul>\n`;
    });

    // Ordered lists
    html = html.replace(/((?:^\d+\. .+\n?)+)/gm, (m) => {
      const items = m.trim().split('\n')
        .filter(l => l.trim())
        .map(l => `<li>${l.replace(/^\d+\.\s+/, '')}</li>`)
        .join('\n');
      return `<ol>\n${items}\n</ol>\n`;
    });

    // Paragraphs
    const blockTags = ['h1','h2','h3','h4','ul','ol','blockquote','hr','div','table','thead','tbody','tr'];
    html = html.split('\n\n').map(block => {
      const t = block.trim();
      if (!t) return '';
      const tagMatch = t.match(/^<(\w+)/);
      if (tagMatch && blockTags.includes(tagMatch[1])) return t;
      return `<p>${t.replace(/\n/g, '<br/>')}</p>`;
    }).filter(Boolean).join('\n\n');

    return html.trim();
  }

  function showSuccessToast(words, score) {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `<span class="toast-icon">✨</span> Generated! ${words.toLocaleString()} words • Quality Score: ${score}/100`;
    container.appendChild(toast);
    
    setTimeout(() => {
      toast.classList.add('toast-exit');
      toast.addEventListener('animationend', () => toast.remove());
    }, 3000);
  }

  // ── Keyboard shortcut ───────────────────────────────────────────
  document.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      if (!isGenerating && keywordInput.value.trim()) {
        form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
      }
    }
  });

  // ── Form submission ─────────────────────────────────────────────
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (isGenerating) return;
    const keyword = keywordInput.value.trim();
    if (!keyword) { keywordInput.focus(); return; }
    const body = { keyword, audience: audienceInput.value.trim(), tone: toneSelect.value, contentType: typeSelect.value, wordCount: wordcountInput.value.trim(), imageStyle: selectedImageStyle };
    
    // Inject user settings to bypass defaults
    appendUserSettings(body);
    
    lastRequestBody = body;
    startGeneration(body);
  });

  // Helper to attach user settings to outgoing requests
  function appendUserSettings(bodyObj) {
    try {
      const saved = JSON.parse(localStorage.getItem('inkraft_user_settings') || '{}');
      if (saved.apiKey) bodyObj.apiKey = saved.apiKey;
      if (saved.blogName) bodyObj.blogName = saved.blogName;
      if (saved.niche) bodyObj.niche = saved.niche;
      
      // If UI fields are empty, let settings take over
      if (!bodyObj.tone && saved.tone) bodyObj.tone = saved.tone;
      if (!bodyObj.contentType && saved.contentType) bodyObj.contentType = saved.contentType;
      if (!bodyObj.wordCount && saved.wordCount) bodyObj.wordCount = saved.wordCount;
      if (!bodyObj.audience && saved.audience) bodyObj.audience = saved.audience;
    } catch(e) {}
    return bodyObj;
  }

  // ── Start generation ────────────────────────────────────────────
  async function startGeneration(body) {
    isGenerating = true;
    saveSettings(body);
    
    window.currentState = {
      keyword: body.keyword || '',
      tone: body.tone || '',
      contentType: body.contentType || '',
      wordCount: body.wordCount || '',
      audience: body.audience || '',
      imageStyle: body.imageStyle || 'photorealistic',
      articleTitle: '',
      articleExcerpt: ''
    };
    
    resetOutput();
    showLoading();

    try {
      const response = await fetch('/api/generate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (!response.ok) {
        const err = await response.json().catch(() => ({ error: 'Server error' }));
        throw new Error(err.error || `HTTP ${response.status}`);
      }
      await readStream(response);
    } catch (err) {
      showError(err.message || 'Something went wrong. Check your API key and try again.');
    } finally {
      isGenerating = false;
    }
  }

  let seoFixData = null;

  // ── Stream reader ───────────────────────────────────────────────
  async function readStream(response) {
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let fullText = '';
    seoFixData = null; // reset

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop();

      for (const line of lines) {
        if (line.startsWith('event: error')) continue;
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') { finishStreaming(fullText); return; }
          try {
            const parsed = JSON.parse(data);
            if (parsed.error) { showError(parsed.error); return; }
            if (parsed.type === 'seoFix') {
              seoFixData = parsed;
              continue;
            }
          } catch (_) {}
          const text = data.replace(/\\n/g, '\n');
          fullText += text;
          updateLiveOutput(fullText);
        }
      }
    }
    if (fullText) finishStreaming(fullText);
  }

  // ── Parse the response into 5 blocks ────────────────────────────
  function parseBlocks(text) {
    const blocks = { 
      'seo-brief': '', 
      'outline': '', 
      'article': '', 
      'seo-meta': '', 
      'image-prompt': '' 
    };

    // ── Method 1: New delimiter format %%BLOCK1_START%% ──
    function extractBlock(txt, tag) {
      const s = `%%${tag}_START%%`;
      const e = `%%${tag}_END%%`;
      const si = txt.indexOf(s);
      const ei = txt.indexOf(e);
      if (si === -1 || ei === -1) return '';
      return txt.substring(si + s.length, ei).trim();
    }

    const b1 = extractBlock(text, 'BLOCK1');
    const b2 = extractBlock(text, 'BLOCK2');
    const b3 = extractBlock(text, 'BLOCK3');
    const b4 = extractBlock(text, 'BLOCK4');
    const b5 = extractBlock(text, 'BLOCK5');

    if (b1 || b2 || b3 || b4 || b5) {
      // Delimiter format found — use it
      if (b1) blocks['seo-brief'] = b1;
      if (b2) blocks['outline'] = b2;
      if (b3) blocks['article'] = b3
        .replace(/%%BLOCK\d+_(?:START|END)%%/g, '')
        .replace(/%%[A-Z_]+_(?:START|END)%%/g, '')
        .trim();
      if (b4) blocks['seo-meta'] = b4;
      if (b5) blocks['image-prompt'] = b5;
      return blocks;
    }

    // ── Method 2: Fallback — look for OUTPUT BLOCK headers ──
    const blockPatterns = [
      { key: 'seo-brief',    pattern: /#{1,3}\s*OUTPUT\s+BLOCK\s+1[^\n]*/i },
      { key: 'outline',      pattern: /#{1,3}\s*OUTPUT\s+BLOCK\s+2[^\n]*/i },
      { key: 'article',      pattern: /#{1,3}\s*OUTPUT\s+BLOCK\s+3[^\n]*/i },
      { key: 'seo-meta',     pattern: /#{1,3}\s*OUTPUT\s+BLOCK\s+4[^\n]*/i },
      { key: 'image-prompt', pattern: /#{1,3}\s*OUTPUT\s+BLOCK\s+5[^\n]*/i },
    ];

    const positions = [];
    for (const { key, pattern } of blockPatterns) {
      const match = text.match(pattern);
      if (match) {
        positions.push({ 
          key, 
          index: text.indexOf(match[0]), 
          headerLength: match[0].length 
        });
      }
    }
    positions.sort((a, b) => a.index - b.index);

    for (let i = 0; i < positions.length; i++) {
      const start = positions[i].index + positions[i].headerLength;
      const end = i + 1 < positions.length ? positions[i + 1].index : text.length;
      let content = text.slice(start, end).trim()
        .replace(/^[━─\-=]{3,}\s*/gm, '').trim();
      blocks[positions[i].key] = content;
    }

    // ── Method 3: Last resort — put everything in article tab ──
    if (positions.length === 0 && text.trim()) {
      blocks['article'] = text.trim();
    }

    // Apply SEO Fix if provided by the server
    if (seoFixData && blocks['seo-meta']) {
      blocks['seo-meta'] = blocks['seo-meta']
        .replace(/\*\*SEO Title\*\*[:\s]*(.*)/i, `**SEO Title**: ${seoFixData.title}`)
        .replace(/\*\*Meta Description\*\*[:\s]*(.*)/i, `**Meta Description**: ${seoFixData.metaDesc}`);
    }

    return blocks;
  }

  // ── Live output update ──────────────────────────────────────────
  function updateLiveOutput(fullText) {
    if (outputSection.classList.contains('hidden')) {
      hideLoading();
      outputSection.classList.remove('hidden');
      exampleChips.classList.add('hidden');
      newArticleBtn.classList.remove('hidden');
      outputSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    const blocks = parseBlocks(fullText);

    for (const [key, content] of Object.entries(blocks)) {
      if (!content) continue;
      rawContent[key] = content;
      if (key === 'seo-meta') contentMap[key].innerHTML = renderSeoMeta(content);
      else if (key === 'image-prompt') contentMap[key].innerHTML = renderImagePrompt(content);
      else { contentMap[key].innerHTML = renderMarkdown(content); contentMap[key].classList.add('streaming-cursor'); }
      if (key === 'article') updateWordCount(content);
      const tabBtn = tabsNav.querySelector(`[data-tab="${key}"]`);
      if (tabBtn && !tabBtn.classList.contains('has-content')) tabBtn.classList.add('has-content');
    }
    autoSwitchTab(blocks);
  }

  let lastAutoTab = '';
  function autoSwitchTab(blocks) {
    const order = ['seo-brief', 'outline', 'article', 'seo-meta', 'image-prompt'];
    let latest = '';
    for (const k of order) { if (blocks[k]) latest = k; }
    if (latest && latest !== lastAutoTab) { lastAutoTab = latest; switchTab(latest); }
  }

  // ── Finish streaming ────────────────────────────────────────────
  function finishStreaming(fullText) {
    stopStatusRotation();
    isGenerating = false;

    const blocks = parseBlocks(fullText);
    for (const [key, content] of Object.entries(blocks)) {
      rawContent[key] = content;
      if (!content) continue;
      if (key === 'seo-meta') contentMap[key].innerHTML = renderSeoMeta(content);
      else if (key === 'image-prompt') contentMap[key].innerHTML = renderImagePrompt(content);
      else contentMap[key].innerHTML = renderMarkdown(content);
      contentMap[key].classList.remove('streaming-cursor');
      const tabBtn = tabsNav.querySelector(`[data-tab="${key}"]`);
      if (tabBtn) tabBtn.classList.add('has-content');
    }

    if (rawContent['article']) {
      const titleMatch = rawContent['article'].match(/^#\s+(.+)/m);
      if (titleMatch) {
        window.currentState.articleTitle = titleMatch[1].replace(/\*\*/g, '').trim();
        document.title = `${window.currentState.articleTitle} — Inkraft`;
      }
      const pMatch = rawContent['article'].match(/\n\n(.*?)\n\n/);
      if (pMatch) {
        window.currentState.articleExcerpt = stripMarkdown(pMatch[1]).substring(0, 150);
      }
      
      const wc = updateWordCount(rawContent['article']);
      const score = computeQualityScore(rawContent['article']);
      attachRewriteButtons();
      showSuccessToast(wc, score);
    }

    // Wire up contenteditable SEO fields
    if (rawContent['seo-meta']) initSeoEditableFields();

    // Show Regnerate Bar
    const regenBar = document.getElementById('regen-bar');
    if (regenBar) regenBar.classList.remove('hidden');

    outputSection.classList.remove('hidden');
    loadingSection.classList.add('hidden');
    inputSection.classList.remove('hidden');
    exampleChips.classList.add('hidden');
    newArticleBtn.classList.remove('hidden');
    generateBtn.disabled = false;
    generateBtn.querySelector('.btn-text').textContent = 'Generate Article';
    generateBtn.querySelector('.btn-icon').textContent = '⚡';

    // Auto-switch to Full Article
    if (rawContent['article']) switchTab('article');

    // Smooth scroll to output
    outputSection.scrollIntoView({ behavior: 'smooth', block: 'start' });

    // FIX 6.2: On mobile, scroll tabs into view
    if (window.innerWidth <= 768) {
      setTimeout(() => {
        tabsNav.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 300);
    }

    saveToHistory(fullText);
  }

  // ══════════════════════════════════════════════════════════════════
  //  QUALITY SCORE
  // ══════════════════════════════════════════════════════════════════

  function computeQualityScore(articleMd) {
    let score = 0;
    const wc = countWords(articleMd);
    score += Math.min(40, Math.round((wc / 3000) * 40));
    if (/faq|frequently\s+asked/i.test(articleMd)) score += 15;
    if (/\|.+\|.+\|/.test(articleMd)) score += 15;
    score += 10; // reading time always shown
    if (/^[-*+]\s+/m.test(articleMd) || /^\d+\.\s+/m.test(articleMd)) score += 10;
    if (/\*\*.+?\*\*/.test(articleMd)) score += 10;
    score = Math.min(100, score);

    let cls = 'quality-green';
    if (score < 60) cls = 'quality-red';
    else if (score < 80) cls = 'quality-amber';

    qualityScoreBadge.textContent = `Quality: ${score}/100`;
    qualityScoreBadge.className = `quality-badge ${cls}`;
    qualityScoreBadge.classList.remove('hidden');
  }

  function countWords(text) {
    return text.replace(/#{1,6}\s/g, '').replace(/\*\*|__/g, '').replace(/\*|_/g, '').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').replace(/[━─\-=]{3,}/g, '').replace(/\n+/g, ' ').trim().split(/\s+/).filter(w => w.length > 0).length;
  }

  // ══════════════════════════════════════════════════════════════════
  //  REGENERATE SECTION
  // ══════════════════════════════════════════════════════════════════

  function attachRewriteButtons() {
    const articleEl = contentMap['article'];
    const h2s = articleEl.querySelectorAll('h2');

    h2s.forEach((h2) => {
      const wrapper = document.createElement('div');
      wrapper.className = 'section-wrapper';
      const sectionEls = [h2];
      let next = h2.nextElementSibling;
      while (next && next.tagName !== 'H2') { sectionEls.push(next); next = next.nextElementSibling; }
      h2.parentNode.insertBefore(wrapper, h2);
      sectionEls.forEach(el => wrapper.appendChild(el));

      // FIX 6.3: Create heading row with rewrite button positioned to the right
      const headingRow = document.createElement('div');
      headingRow.className = 'heading-row';
      const rewriteBtn = document.createElement('button');
      rewriteBtn.className = 'rewrite-btn';
      rewriteBtn.innerHTML = '↻ Rewrite';
      rewriteBtn.title = 'Rewrite this section with more detail';

      // Move h2 into heading row
      wrapper.insertBefore(headingRow, wrapper.firstChild);
      headingRow.appendChild(wrapper.querySelector('h2'));
      headingRow.appendChild(rewriteBtn);

      rewriteBtn.addEventListener('click', () => rewriteSection(wrapper, rewriteBtn));
    });
  }

  async function rewriteSection(wrapper, btn) {
    const h2El = wrapper.querySelector('h2');
    if (!h2El) return;
    const heading = h2El.textContent;
    const articleMd = rawContent['article'];
    const headingPattern = new RegExp(`(##\\s*${escapeRegExp(heading)})([\\s\\S]*?)(?=\\n##\\s|$)`);
    const match = articleMd.match(headingPattern);
    if (!match) return;
    const sectionContent = match[0];
    const keyword = keywordInput.value.trim() || (lastRequestBody && lastRequestBody.keyword) || '';

    btn.disabled = true;
    btn.innerHTML = '⏳ Rewriting...';
    btn.classList.add('rewriting');

    try {
      const body = appendUserSettings({ sectionContent, keyword });
      const response = await fetch('/api/rewrite-section', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (!response.ok) throw new Error('Rewrite failed');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let newText = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop();
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const d = line.slice(6);
            if (d === '[DONE]') break;
            newText += d.replace(/\\n/g, '\n');
          }
        }
      }

      if (newText.trim()) {
        rawContent['article'] = articleMd.replace(sectionContent, newText.trim());
        contentMap['article'].innerHTML = renderMarkdown(rawContent['article']);
        updateWordCount(rawContent['article']);
        computeQualityScore(rawContent['article']);
        attachRewriteButtons();
      }
    } catch (err) {
      btn.innerHTML = '❌ Failed';
      setTimeout(() => { btn.innerHTML = '↻ Rewrite'; btn.disabled = false; btn.classList.remove('rewriting'); }, 2000);
    }
  }

  function escapeRegExp(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

  // ══════════════════════════════════════════════════════════════════
  //  REGENERATE BAR Handlers
  // ══════════════════════════════════════════════════════════════════
  
  document.querySelectorAll('.regen-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const target = e.target.dataset.target;
      if (target === 'all') {
        const keyword = keywordInput.value.trim() || window.currentState.keyword;
        if (!keyword) return;
        const body = { 
          keyword, 
          audience: audienceInput.value.trim(), 
          tone: toneSelect.value, 
          contentType: typeSelect.value, 
          wordCount: wordcountInput.value.trim(), 
          imageStyle: selectedImageStyle 
        };
        appendUserSettings(body);
        startGeneration(body);
      } else {
        regenSection(target);
      }
    });
  });

  async function regenSection(target) {
    if (!window.currentState || !window.currentState.keyword) return;

    const btn = document.querySelector(`.regen-btn[data-target="${target}"]`);
    const origHtml = btn.innerHTML;
    btn.innerHTML = '⏳ Regenerating...';
    btn.disabled = true;

    let endpoint = '';
    let tabId = '';

    if (target === 'image') { endpoint = '/api/regen-image'; tabId = 'image-prompt'; }
    else if (target === 'seo') { endpoint = '/api/regen-seo'; tabId = 'seo-meta'; }
    else if (target === 'article') { endpoint = '/api/regen-article'; tabId = 'article'; }

    const contentEl = contentMap[tabId];
    if (contentEl) {
      contentEl.innerHTML = `<div class="regen-spinner">✨ Regenerating ${target}...</div>`;
      contentEl.classList.add('streaming-cursor');
    }
    switchTab(tabId);

    try {
      const body = appendUserSettings({ ...window.currentState });
      const resp = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      if (!resp.ok) throw new Error('API Error');

      if (target === 'seo') {
        const json = await resp.json();
        if (json.success && json.metadata) {
          let fakeMd = '';
          const m = json.metadata;
          if (m.seoTitle) fakeMd += `%%SEO_TITLE_START%%\n${m.seoTitle}\n%%SEO_TITLE_END%%\n`;
          if (m.metaDesc) fakeMd += `%%META_DESC_START%%\n${m.metaDesc}\n%%META_DESC_END%%\n`;
          if (m.urlSlug) fakeMd += `%%URL_SLUG_START%%\n${m.urlSlug}\n%%URL_SLUG_END%%\n`;
          if (m.primaryKw) fakeMd += `%%PRIMARY_KW_START%%\n${m.primaryKw}\n%%PRIMARY_KW_END%%\n`;
          if (m.secondaryKw) fakeMd += `%%SECONDARY_KW_START%%\n${m.secondaryKw}\n%%SECONDARY_KW_END%%\n`;
          if (m.categories) fakeMd += `%%CATEGORIES_START%%\n${m.categories}\n%%CATEGORIES_END%%\n`;
          if (m.tags) fakeMd += `%%TAGS_START%%\n${m.tags}\n%%TAGS_END%%\n`;
          if (m.readTime) fakeMd += `%%READ_TIME_START%%\n${m.readTime}\n%%READ_TIME_END%%\n`;
          if (m.schemaType) fakeMd += `%%SCHEMA_TYPE_START%%\n${m.schemaType}\n%%SCHEMA_TYPE_END%%\n`;
          
          rawContent['seo-meta'] = fakeMd;
          contentEl.innerHTML = renderSeoMeta(fakeMd);
          initSeoEditableFields();
        }
      } else {
        const reader = resp.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let fullText = '';
        contentEl.innerHTML = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop();

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const dataStr = line.slice(6);
              if (dataStr === '[DONE]') continue;
              try {
                const parsed = JSON.parse(dataStr);
                if (parsed.error) throw new Error(parsed.error);
                if (parsed.text) {
                  fullText += parsed.text;
                  if (target === 'image') contentEl.innerHTML = renderImagePrompt(fullText);
                  else contentEl.innerHTML = renderMarkdown(fullText);
                }
              } catch (e) {}
            }
          }
        }
        
        rawContent[tabId] = fullText;
        if (target === 'article') {
          updateWordCount(fullText);
          computeQualityScore(fullText);
          attachRewriteButtons();
        }
      }
    } catch (e) {
      if (contentEl) contentEl.innerHTML = `<div class="regen-error">❌ Failed to regenerate. Please try again.</div>`;
    } finally {
      if (contentEl) contentEl.classList.remove('streaming-cursor');
      btn.innerHTML = origHtml;
      btn.disabled = false;
    }
  }

  // ══════════════════════════════════════════════════════════════════
  //  SEO METADATA RENDERER
  // ══════════════════════════════════════════════════════════════════

  function extractDelimitedClient(text, fieldName) {
    const start = `%%${fieldName}_START%%`;
    const end = `%%${fieldName}_END%%`;
    const startIdx = text.indexOf(start);
    const endIdx = text.indexOf(end);
    if (startIdx === -1) return '';
    const actualEndIdx = endIdx !== -1 ? endIdx : text.length;
    let raw = text.substring(startIdx + start.length, actualEndIdx).trim();
    return raw.replace(/^["']|["']$/g, '');
  }

  function renderSeoMeta(md) {
    const fieldsData = [
      { key: 'SEO_TITLE', label: 'SEO Title', min: 50, max: 60 },
      { key: 'META_DESC', label: 'Meta Description', min: 150, max: 160 },
      { key: 'URL_SLUG', label: 'URL Slug' },
      { key: 'PRIMARY_KW', label: 'Primary Keyword' },
      { key: 'SECONDARY_KW', label: 'Secondary Keywords' },
      { key: 'CATEGORIES', label: 'Categories' },
      { key: 'TAGS', label: 'Tags' },
      { key: 'READ_TIME', label: 'Reading Time' },
      { key: 'SCHEMA_TYPE', label: 'Schema Type' },
    ];

    const fields = [];
    for (const f of fieldsData) {
      const val = extractDelimitedClient(md, f.key);
      if (val) fields.push({ ...f, value: val.replace(/\*\*/g, '') });
    }

    if (fields.length === 0) return renderMarkdown(md);

    return fields.map(f => {
      const ci = getCharRange(f.label);
      const len = f.value.length;
      let badgeCls = '';
      let badgeText = '';
      let barWidth = 0;
      let barColor = '#6B4EFF';
      let charHint = '';
      let countText = `${len} chars`;

      if (ci) {
        charHint = `Target: ${ci.min}–${ci.max} characters`;
        if (len < ci.min) {
          badgeCls = 'bad'; badgeText = '✗ Too short';
          barWidth = Math.max(5, (len / ci.max) * 100);
          barColor = '#F09595';
        } else if (len > ci.max) {
          badgeCls = 'warn'; badgeText = '⚠ Too long';
          barWidth = 100;
          barColor = '#EF9F27';
        } else {
          badgeCls = 'good'; badgeText = '✓ Good';
          barWidth = ((len - ci.min) / (ci.max - ci.min)) * 100;
          barColor = '#0D9F6F';
        }
      }

      const charBarHtml = ci ? `
        <div class="char-bar"><div class="char-bar-fill" style="width: ${barWidth}%; background: ${barColor}"></div></div>
        <div class="char-hint">${charHint}</div>` : '';

      const indicatorsHtml = ci ? `
        <div class="meta-field-indicators">
          <span class="char-count">${countText}</span>
          <span class="char-badge ${badgeCls}">${badgeText}</span>
          <button class="copy-btn-small meta-copy-inline" data-value="${escapeAttr(f.value)}">Copy</button>
        </div>` : `
        <div class="meta-field-indicators">
          <button class="copy-btn-small meta-copy-inline" data-value="${escapeAttr(f.value)}">Copy</button>
        </div>`;

      return `<div class="meta-field" data-min="${ci?.min || ''}" data-max="${ci?.max || ''}">
        <div class="meta-field-header">
          <span class="meta-field-label">${escapeHtml(f.label)}</span>
          ${indicatorsHtml}
        </div>
        <div class="meta-field-value" contenteditable="true" spellcheck="false">${escapeHtml(f.value)}</div>
        ${charBarHtml}
      </div>`;
    }).join('');
  }

  function getCharRange(label) {
    const lower = label.toLowerCase();
    if (lower.includes('seo title') || (lower.includes('title') && !lower.includes('meta') && !lower.includes('read'))) return { min: 50, max: 60 };
    if (lower.includes('meta description')) return { min: 150, max: 160 };
    return null;
  }

  function initSeoEditableFields() {
    const fields = document.querySelectorAll('#seo-meta-content .meta-field');
    fields.forEach(field => {
      const valueEl = field.querySelector('.meta-field-value');
      const countEl = field.querySelector('.char-count');
      const badgeEl = field.querySelector('.char-badge');
      const barFillEl = field.querySelector('.char-bar-fill');
      const min = parseInt(field.dataset.min, 10);
      const max = parseInt(field.dataset.max, 10);

      if (!valueEl || !min || !max) return;

      valueEl.addEventListener('input', () => {
        const len = valueEl.textContent.length;
        if (countEl) countEl.textContent = `${len} chars`;

        if (badgeEl) {
          badgeEl.className = 'char-badge';
          if (len < min) {
            badgeEl.classList.add('bad'); badgeEl.textContent = '✗ Too short';
          } else if (len > max) {
            badgeEl.classList.add('warn'); badgeEl.textContent = '⚠ Too long';
          } else {
            badgeEl.classList.add('good'); badgeEl.textContent = '✓ Good';
          }
        }

        if (barFillEl) {
          if (len < min) {
            barFillEl.style.width = Math.max(5, (len / max) * 100) + '%';
            barFillEl.style.background = '#F09595';
          } else if (len > max) {
            barFillEl.style.width = '100%';
            barFillEl.style.background = '#EF9F27';
          } else {
            barFillEl.style.width = ((len - min) / (max - min)) * 100 + '%';
            barFillEl.style.background = '#0D9F6F';
          }
        }
      });
    });

    // Handle inline copy buttons
    document.querySelectorAll('.meta-copy-inline').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const field = btn.closest('.meta-field');
        const value = field?.querySelector('.meta-field-value')?.textContent?.trim() || btn.dataset.value;
        if (value) doCopy(btn, value);
      });
    });
  }

  // ══════════════════════════════════════════════════════════════════
  //  IMAGE PROMPT RENDERER
  // ══════════════════════════════════════════════════════════════════

  function renderImagePrompt(md) {
    // Hide empty state when we have content
    const emptyState = document.getElementById('image-prompt-empty');
    if (emptyState) emptyState.classList.add('hidden');

    const defs = [
      { key: 'midjourney', emoji: '🎨', title: 'MIDJOURNEY', pattern: /🎨\s*MIDJOURNEY/i, alt: /midjourney/i },
      { key: 'dalle', emoji: '📸', title: 'DALL-E 3', pattern: /📸\s*DALL[\-·]?E/i, alt: /dall[\-·]?e/i },
      { key: 'imagefx', emoji: '⚡', title: 'GOOGLE IMAGEFX / FLUX', pattern: /⚡\s*(GOOGLE|FLUX)/i, alt: /(imagefx|flux)/i },
      { key: 'negative', emoji: '🚫', title: 'NEGATIVE PROMPT', pattern: /🚫\s*NEGATIVE/i, alt: /negative\s*prompt/i },
      { key: 'tip', emoji: '💡', title: 'USAGE TIP', pattern: /💡\s*USAGE/i, alt: /usage\s*tip/i },
    ];

    const lines = md.split('\n');
    const sections = [];
    let current = null;

    for (const line of lines) {
      const t = line.trim();
      if (!t) continue;
      let matched = false;
      for (const def of defs) {
        if (def.pattern.test(t) || (def.alt.test(t) && /^[#*\-🎨📸⚡🚫💡]/.test(t))) {
          if (current) sections.push(current);
          current = { ...def, content: [] };
          const after = t.replace(def.pattern, '').replace(def.alt, '').replace(/^[\s:*#\-]+/, '').trim();
          if (after) current.content.push(after);
          matched = true; break;
        }
      }
      if (!matched && current) current.content.push(t.replace(/^[*\-]+\s*/, ''));
      else if (!matched && !current) current = { emoji: '🎨', title: 'IMAGE PROMPT', key: 'general', content: [t] };
    }
    if (current) sections.push(current);

    if (sections.length === 0) return `<div class="prompt-box"><div class="prompt-box-header">🎨 IMAGE PROMPT<button class="copy-btn prompt-copy" data-value="${escapeAttr(md)}">Copy</button></div><div class="prompt-box-body">${escapeHtml(md)}</div></div>`;

    return sections.map(s => {
      const text = s.content.join('\n').replace(/^[━─\-=]{3,}\s*/gm, '').trim();
      const copyHtml = s.key !== 'tip' ? `<button class="copy-btn-small prompt-copy" data-value="${escapeAttr(text)}">Copy</button>` : '';
      return `<div class="prompt-box prompt-box-${s.key}"><div class="prompt-box-header"><span>${s.emoji} ${escapeHtml(s.title)}</span>${copyHtml}</div><div class="prompt-box-body">${escapeHtml(text)}</div></div>`;
    }).join('');
  }

  // ══════════════════════════════════════════════════════════════════
  //  WORD COUNT / READING TIME
  // ══════════════════════════════════════════════════════════════════

  function updateWordCount(text) {
    const wc = countWords(text);
    wordCountBadge.textContent = `${wc.toLocaleString()} words`;
    wordCountBadge.classList.remove('hidden');
    readingTimeBadge.textContent = `${Math.max(1, Math.ceil(wc / 230))} min read`;
    readingTimeBadge.classList.remove('hidden');
    return wc;
  }

  // ══════════════════════════════════════════════════════════════════
  //  MARKDOWN RENDERER
  // ══════════════════════════════════════════════════════════════════

  function renderMarkdown(md) {
    let html = md;
    html = html.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (_, lang, code) => `<pre><code class="language-${lang}">${code.trim()}</code></pre>`);
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
    html = renderTables(html);
    html = html.replace(/^#### (.+)$/gm, '<h4>$1</h4>');
    html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
    html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
    html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');
    html = html.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/__(.+?)__/g, '<strong>$1</strong>');
    html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
    html = html.replace(/_(.+?)_/g, '<em>$1</em>');
    html = html.replace(/~~(.+?)~~/g, '<del>$1</del>');
    html = html.replace(/^&gt;\s*(.+)$/gm, '<blockquote><p>$1</p></blockquote>');
    html = html.replace(/<\/blockquote>\n<blockquote>/g, '\n');
    html = html.replace(/^---+$/gm, '<hr>');
    html = html.replace(/^\*\*\*+$/gm, '<hr>');
    html = html.replace(/((?:^[-*+] .+\n?)+)/gm, (m) => {
      const items = m.trim().split('\n').map(l => `<li>${l.replace(/^[-*+]\s+/, '')}</li>`).join('\n');
      return `<ul>${items}</ul>\n`;
    });
    html = html.replace(/((?:^\d+\.\s.+\n?)+)/gm, (m) => {
      const items = m.trim().split('\n').map(l => `<li>${l.replace(/^\d+\.\s+/, '')}</li>`).join('\n');
      return `<ol>${items}</ol>\n`;
    });
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');

    const blockTags = ['<h1', '<h2', '<h3', '<h4', '<h5', '<h6', '<ul', '<ol', '<li', '<blockquote', '<pre', '<hr', '<table', '<tr', '<th', '<td', '<thead', '<tbody', '</'];
    const lines = html.split('\n');
    const result = [];
    let inP = false;
    for (const line of lines) {
      const l = line.trim();
      if (!l) { if (inP) { result.push('</p>'); inP = false; } continue; }
      const isBlock = blockTags.some(t => l.startsWith(t));
      if (isBlock) { if (inP) { result.push('</p>'); inP = false; } result.push(l); }
      else { if (!inP) { result.push('<p>'); inP = true; } result.push(l); }
    }
    if (inP) result.push('</p>');
    return result.join('\n');
  }

  function renderTables(html) {
    return html.replace(/((?:^\|.+\|\s*\n)+)/gm, (match) => {
      const rows = match.trim().split('\n').filter(r => r.trim());
      if (rows.length < 2 || !/^\|[\s\-:|]+\|$/.test(rows[1].trim())) return match;
      const parse = (r) => r.split('|').slice(1, -1).map(c => c.trim());
      const headers = parse(rows[0]);
      let t = '<div class="table-scroll"><table>\n<thead><tr>' + headers.map(h => `<th>${h}</th>`).join('') + '</tr></thead>\n<tbody>';
      for (const row of rows.slice(2)) t += '<tr>' + parse(row).map(c => `<td>${c}</td>`).join('') + '</tr>\n';
      return t + '</tbody></table></div>\n';
    });
  }

  function escapeHtml(s) { return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function escapeAttr(s) { return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/'/g, '&#39;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

  // ══════════════════════════════════════════════════════════════════
  //  HISTORY
  // ══════════════════════════════════════════════════════════════════

  const HISTORY_KEY = 'inkraft_history';
  const MAX_HISTORY = 20;

  function getHistory() { try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]'); } catch { return []; } }

  function saveToHistory(fullText) {
    const keyword = keywordInput.value.trim();
    const wc = countWords(rawContent['article'] || '');
    const entry = { id: Date.now(), keyword, title: window.currentState.articleTitle || keyword, date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }), wordCount: wc, rawContent: { ...rawContent }, fullText };
    const history = getHistory();
    history.unshift(entry);
    if (history.length > MAX_HISTORY) history.pop();
    try { localStorage.setItem(HISTORY_KEY, JSON.stringify(history)); } catch { history.pop(); try { localStorage.setItem(HISTORY_KEY, JSON.stringify(history)); } catch {} }
    renderHistory();
  }

  function renderHistory() {
    const history = getHistory();
    if (history.length === 0) { 
      historyList.innerHTML = '<p class="history-empty">No articles yet. Generate your first article to see it here.</p>'; 
      return; 
    }
    historyList.innerHTML = history.map(e => `
      <button class="history-item" data-id="${e.id}">
        <div class="history-item-title">${escapeHtml(e.title || e.keyword)}</div>
        <div class="history-item-keyword">${escapeHtml(e.keyword)}</div>
        <div class="history-item-meta">
          <span>${e.date}</span>
          <span class="history-dot">·</span>
          <span>${(e.wordCount || 0).toLocaleString()} words</span>
        </div>
      </button>
    `).join('');
  }

  function loadHistoryEntry(id) {
    const entry = getHistory().find(e => e.id === id);
    if (!entry) return;
    for (const [key, content] of Object.entries(entry.rawContent)) {
      rawContent[key] = content;
      if (!content) continue;
      if (key === 'seo-meta') contentMap[key].innerHTML = renderSeoMeta(content);
      else if (key === 'image-prompt') contentMap[key].innerHTML = renderImagePrompt(content);
      else contentMap[key].innerHTML = renderMarkdown(content);
      contentMap[key].classList.remove('streaming-cursor');
      const btn = tabsNav.querySelector(`[data-tab="${key}"]`);
      if (btn) btn.classList.add('has-content');
    }
    if (rawContent['article']) { updateWordCount(rawContent['article']); computeQualityScore(rawContent['article']); attachRewriteButtons(); }
    if (rawContent['seo-meta']) initSeoEditableFields();
    outputSection.classList.remove('hidden');
    exampleChips.classList.add('hidden');
    newArticleBtn.classList.remove('hidden');
    errorSection.classList.add('hidden');
    loadingSection.classList.add('hidden');
    if (rawContent['article']) switchTab('article');
    closeSidebar();
  }

  function openSidebar() {
    historySidebar.classList.add('open');
    historyOverlay.classList.add('open');
    document.body.classList.add('sidebar-open');
    renderHistory();
  }
  function closeSidebar() {
    historySidebar.classList.remove('open');
    historyOverlay.classList.remove('open');
    document.body.classList.remove('sidebar-open');
    // Reset any inline transform from swipe
    historySidebar.style.transform = '';
    historySidebar.style.transition = '';
    const historySearchInput = document.getElementById('history-search-input');
    if (historySearchInput) historySearchInput.value = '';
  }
  function isSidebarOpen() { return historySidebar.classList.contains('open'); }

  historyToggle.addEventListener('click', openSidebar);
  historyClose.addEventListener('click', closeSidebar);
  historyOverlay.addEventListener('click', closeSidebar);
  historyList.addEventListener('click', (e) => { const item = e.target.closest('.history-item'); if (item) loadHistoryEntry(Number(item.dataset.id)); });

  // Escape key closes sidebar
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && isSidebarOpen()) { e.preventDefault(); closeSidebar(); }
  });

  // Close on orientation/resize changes (prevents stuck panels)
  let resizeTimer = null;
  window.addEventListener('resize', () => {
    if (!isSidebarOpen()) return;
    if (resizeTimer) clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      // Re-sync position after resize
      historySidebar.style.transform = '';
      historySidebar.style.transition = '';
    }, 150);
  });

  // ── Swipe-to-dismiss on bottom sheet drag handle ────────────────
  (function initSwipeToDismiss() {
    const dragHandle = historySidebar.querySelector('.history-drag-handle');
    if (!dragHandle) return;

    let startY = 0;
    let currentY = 0;
    let isDragging = false;

    dragHandle.addEventListener('touchstart', (e) => {
      if (!isSidebarOpen()) return;
      startY = e.touches[0].clientY;
      currentY = startY;
      isDragging = true;
      historySidebar.style.transition = 'none';
    }, { passive: true });

    document.addEventListener('touchmove', (e) => {
      if (!isDragging) return;
      currentY = e.touches[0].clientY;
      const deltaY = currentY - startY;
      if (deltaY > 0) {
        // Only allow dragging downward
        historySidebar.style.transform = `translateY(${deltaY}px)`;
        // Fade overlay proportionally
        const progress = Math.min(deltaY / 200, 1);
        historyOverlay.style.opacity = 1 - progress * 0.6;
      }
    }, { passive: true });

    document.addEventListener('touchend', () => {
      if (!isDragging) return;
      isDragging = false;
      const deltaY = currentY - startY;
      historySidebar.style.transition = '';
      historyOverlay.style.opacity = '';
      if (deltaY > 80) {
        // Dismiss
        closeSidebar();
      } else {
        // Snap back
        historySidebar.style.transform = '';
      }
    });
  })();

  // ══════════════════════════════════════════════════════════════════
  //  STATE MANAGEMENT
  // ══════════════════════════════════════════════════════════════════

  function resetOutput() {
    for (const key of Object.keys(rawContent)) { rawContent[key] = ''; contentMap[key].innerHTML = ''; contentMap[key].classList.remove('streaming-cursor'); }
    lastAutoTab = '';
    activeTab = 'seo-brief';
    tabsNav.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('has-content', 'active'));
    tabsNav.querySelector('[data-tab="seo-brief"]').classList.add('active');
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
    document.getElementById('tab-seo-brief').classList.add('active');
    wordCountBadge.classList.add('hidden');
    readingTimeBadge.classList.add('hidden');
    qualityScoreBadge.classList.add('hidden');
    outputSection.classList.add('hidden');
    errorSection.classList.add('hidden');
    newArticleBtn.classList.add('hidden');
    // Hide reading progress
    const progressBar = document.getElementById('reading-progress-bar');
    if (progressBar) progressBar.classList.add('hidden');
    // Hide regen bar
    const regenBar = document.getElementById('regen-bar');
    if (regenBar) regenBar.classList.add('hidden');
    // Show empty state in image prompt
    const emptyState = document.getElementById('image-prompt-empty');
    if (emptyState) emptyState.classList.remove('hidden');
  }

  function showLoading() {
    inputSection.classList.add('hidden');
    exampleChips.classList.add('hidden');
    loadingSection.classList.remove('hidden');
    generateBtn.disabled = true;
    generateBtn.querySelector('.btn-text').textContent = 'Generating...';
    generateBtn.querySelector('.btn-icon').textContent = '⏳';
    progressFill.style.width = '0%';
    if (progressFillMobile) progressFillMobile.style.width = '0%';
    if (loadingPercent) loadingPercent.textContent = '0%';
    if (loadingStatusMobile) loadingStatusMobile.textContent = stepLabels[0];
    loaderSteps.querySelectorAll('.loader-step').forEach(s => s.classList.remove('active', 'done'));
    loaderSteps.querySelector('[data-step="1"]').classList.add('active');
    startStatusRotation();
  }

  function hideLoading() { loadingSection.classList.add('hidden'); stopStatusRotation(); }

  function startStatusRotation() {
    let fakeStep = 0;
    const stepEls = loaderSteps.querySelectorAll('.loader-step');
    const total = stepEls.length;
    stepInterval = setInterval(() => {
      fakeStep++;
      if (fakeStep >= total) fakeStep = total - 1;
      stepEls.forEach((el, idx) => { el.classList.remove('active', 'done'); if (idx < fakeStep) el.classList.add('done'); else if (idx === fakeStep) el.classList.add('active'); });
      const pct = Math.min(5 + (fakeStep / total) * 90, 95);
      progressFill.style.width = `${pct}%`;
      if (progressFillMobile) progressFillMobile.style.width = `${pct}%`;
      if (loadingPercent) loadingPercent.textContent = `${Math.round(pct)}%`;
      if (loadingStatusMobile) loadingStatusMobile.textContent = stepLabels[Math.min(fakeStep, stepLabels.length - 1)];
    }, 5000);
  }

  function stopStatusRotation() {
    if (stepInterval) { clearInterval(stepInterval); stepInterval = null; }
    progressFill.style.width = '100%';
    if (progressFillMobile) progressFillMobile.style.width = '100%';
    if (loadingPercent) loadingPercent.textContent = '100%';
    loaderSteps.querySelectorAll('.loader-step').forEach(s => { s.classList.remove('active'); s.classList.add('done'); });
  }

  function showError(msg) {
    hideLoading();
    outputSection.classList.add('hidden');
    errorSection.classList.remove('hidden');
    inputSection.classList.add('hidden');
    exampleChips.classList.add('hidden');
    if (msg.includes('API_KEY') || msg.includes('GEMINI_API_KEY') || msg.includes('api key')) {
      errorMessage.innerHTML = `<strong>API Key Not Configured</strong><br/>Add your <code>GEMINI_API_KEY</code> to the <code>.env</code> file.<br/><a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener" class="error-link">Get your free key at aistudio.google.com →</a>`;
    } else { errorMessage.textContent = msg; }
    generateBtn.disabled = false;
    generateBtn.querySelector('.btn-text').textContent = 'Generate Article';
    generateBtn.querySelector('.btn-icon').textContent = '⚡';
    isGenerating = false;
  }

  // ── Reading progress bar ──────────────────────────────────────
  function updateReadingProgress() {
    const article = document.getElementById('article-content');
    if (!article || activeTab !== 'article') return;
    const rect = article.getBoundingClientRect();
    const articleHeight = article.offsetHeight;
    const scrolled = window.scrollY - article.offsetTop + window.innerHeight;
    const progress = Math.min(Math.max(scrolled / articleHeight, 0), 1);
    const fill = document.getElementById('reading-progress');
    if (fill) fill.style.width = (progress * 100) + '%';
  }

  window.addEventListener('scroll', updateReadingProgress, { passive: true });

  // ── Download .md button ────────────────────────────────────────
  document.getElementById('download-md-btn').addEventListener('click', () => {
    const content = rawContent['article'];
    if (!content) return;
    
    // Generate filename from article title or keyword
    const title = window.currentState.articleTitle 
      || window.currentState.keyword 
      || 'inkraft-article';
    const filename = title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .substring(0, 60) + '.md';
    
    // Add frontmatter for Jekyll/Hugo/Astro compatibility
    const seoTitle = document.getElementById('seo-meta-content')
      ?.querySelector('[data-field="seo-title"] .meta-field-value')
      ?.textContent?.trim() || '';
    const metaDesc = document.getElementById('seo-meta-content')
      ?.querySelector('[data-field="meta-desc"] .meta-field-value')
      ?.textContent?.trim() || '';
    const slug = rawContent['seo-meta']
      ? extractDelimitedClient(rawContent['seo-meta'], 'URL_SLUG')
      : '';
    
    const date = new Date().toISOString().split('T')[0];
    
    const frontmatter = `---
title: "${seoTitle || title}"
description: "${metaDesc}"
slug: "${slug}"
date: ${date}
generated_by: Inkraft
---

`;
    
    const fullContent = frontmatter + content;
    
    const blob = new Blob([fullContent], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    // Visual feedback
    const btn = document.getElementById('download-md-btn');
    const orig = btn.textContent;
    btn.textContent = '✓ Downloaded!';
    setTimeout(() => { btn.textContent = orig; }, 2000);
  });

  // ── History search ─────────────────────────────────────────────
  const historySearchInput = document.getElementById('history-search-input');
  historySearchInput.addEventListener('input', () => {
    const query = historySearchInput.value.toLowerCase().trim();
    const history = getHistory();
    const filtered = query 
      ? history.filter(e => 
          (e.title || e.keyword).toLowerCase().includes(query) || 
          e.keyword.toLowerCase().includes(query)
        )
      : history;
    
    if (filtered.length === 0) {
      historyList.innerHTML = `<p class="history-empty">No articles match "${escapeHtml(query)}"</p>`;
      return;
    }
    historyList.innerHTML = filtered.map(e => `
      <button class="history-item" data-id="${e.id}">
        <div class="history-item-title">${escapeHtml(e.title || e.keyword)}</div>
        <div class="history-item-keyword">${escapeHtml(e.keyword)}</div>
        <div class="history-item-meta">
          <span>${e.date}</span>
          <span class="history-dot">·</span>
          <span>${(e.wordCount || 0).toLocaleString()} words</span>
        </div>
      </button>
    `).join('');
  });

  // ══════════════════════════════════════════════════════════════════
  //  USER SETTINGS (API KEY, PREFERENCES, BLOG CONTEXT)
  // ══════════════════════════════════════════════════════════════════

  const USER_SETTINGS_KEY = 'inkraft_user_settings';
  
  const settingsToggle = document.getElementById('settings-toggle');
  const settingsClose = document.getElementById('settings-close');
  const settingsOverlay = document.getElementById('settings-overlay');
  const settingsModal = document.getElementById('settings-modal');
  const apiKeyDot = document.getElementById('api-key-dot');

  // Fields
  const sApiKey = document.getElementById('settings-api-key');
  const visBtn = document.getElementById('toggle-api-key-vis');
  const sTone = document.getElementById('settings-tone');
  const sType = document.getElementById('settings-type');
  const sWordcount = document.getElementById('settings-wordcount');
  const sImage = document.getElementById('settings-image');
  const sBlogName = document.getElementById('settings-blogname');
  const sNiche = document.getElementById('settings-niche');
  const sAudience = document.getElementById('settings-audience');

  // Toggle visibility
  if (visBtn && sApiKey) {
    visBtn.addEventListener('click', () => {
      const isPass = sApiKey.type === 'password';
      sApiKey.type = isPass ? 'text' : 'password';
      visBtn.textContent = isPass ? '🔒' : '👁️';
    });
  }

  function openSettings() {
    if(!settingsOverlay || !settingsModal) return;
    settingsOverlay.classList.add('open');
    settingsModal.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function closeSettings() {
    if(!settingsOverlay || !settingsModal) return;
    settingsOverlay.classList.remove('open');
    settingsModal.classList.remove('open');
    document.body.style.overflow = '';
  }

  if (settingsToggle) settingsToggle.addEventListener('click', openSettings);
  if (settingsClose) settingsClose.addEventListener('click', closeSettings);
  if (settingsOverlay) settingsOverlay.addEventListener('click', closeSettings);

  function loadUserSettings() {
    try {
      const saved = JSON.parse(localStorage.getItem(USER_SETTINGS_KEY) || '{}');
      if (saved.apiKey && sApiKey) {
        sApiKey.value = saved.apiKey;
        if (apiKeyDot) apiKeyDot.classList.remove('hidden');
      } else if (apiKeyDot) {
        apiKeyDot.classList.add('hidden');
      }
      
      if (saved.tone && sTone) sTone.value = saved.tone;
      if (saved.contentType && sType) sType.value = saved.contentType;
      if (saved.wordCount && sWordcount) sWordcount.value = saved.wordCount;
      if (saved.imageStyle && sImage) sImage.value = saved.imageStyle;
      
      if (saved.blogName && sBlogName) sBlogName.value = saved.blogName;
      if (saved.niche && sNiche) sNiche.value = saved.niche;
      if (saved.audience && sAudience) sAudience.value = saved.audience;

      // Apply to main generator form inputs if not already set manually
      if (audienceInput && !audienceInput.value) audienceInput.value = saved.audience || '';
      
    } catch(e) { console.error('Error loading settings', e); }
  }

  const settingsSaveBtn = document.getElementById('settings-save');
  if (settingsSaveBtn) {
    settingsSaveBtn.addEventListener('click', () => {
      const settings = {
        apiKey: sApiKey ? sApiKey.value.trim() : '',
        tone: sTone ? sTone.value.trim() : '',
        contentType: sType ? sType.value.trim() : '',
        wordCount: sWordcount ? sWordcount.value.trim() : '',
        imageStyle: sImage ? sImage.value : '',
        blogName: sBlogName ? sBlogName.value.trim() : '',
        niche: sNiche ? sNiche.value.trim() : '',
        audience: sAudience ? sAudience.value.trim() : ''
      };
      
      localStorage.setItem(USER_SETTINGS_KEY, JSON.stringify(settings));
      
      if (settings.apiKey && apiKeyDot) apiKeyDot.classList.remove('hidden');
      else if (apiKeyDot) apiKeyDot.classList.add('hidden');
      
      // Auto-apply defaults to main form
      if (toneSelect) toneSelect.value = settings.tone;
      if (typeSelect) typeSelect.value = settings.contentType;
      if (wordcountInput) wordcountInput.value = settings.wordCount;
      if (audienceInput) audienceInput.value = settings.audience;
      if (settings.imageStyle) selectStyleCard(settings.imageStyle);
      
      updateWordcountHelper();
      updateOptionsSummary();
      
      const orig = settingsSaveBtn.textContent;
      settingsSaveBtn.textContent = 'Saved!';
      setTimeout(() => {
        settingsSaveBtn.textContent = orig;
        closeSettings();
      }, 800);
    });
  }

  // Data management
  const exportBtn = document.getElementById('settings-export');
  if (exportBtn) {
    exportBtn.addEventListener('click', () => {
      const history = getHistory();
      const blob = new Blob([JSON.stringify(history, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `inkraft-history-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    });
  }

  const clearBtn = document.getElementById('settings-clear');
  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      if (confirm('Are you sure you want to clear all data? This will delete your article history, API key, and all settings. This cannot be undone.')) {
        localStorage.clear();
        location.reload();
      }
    });
  }

  // Init
  loadUserSettings();

})();
