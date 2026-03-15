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
  const toggleBtn = document.getElementById('toggle-options');
  const optionsPanel = document.getElementById('advanced-options');
  const generateBtn = document.getElementById('generate-btn');

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
  //  TOGGLE / EVENTS
  // ══════════════════════════════════════════════════════════════════

  toggleBtn.addEventListener('click', () => {
    const isCollapsed = optionsPanel.classList.contains('collapsed');
    optionsPanel.classList.toggle('collapsed', !isCollapsed);
    optionsPanel.classList.toggle('expanded', isCollapsed);
    toggleBtn.classList.toggle('open', isCollapsed);
  });

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
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  // ── Tab switching ───────────────────────────────────────────────
  tabsNav.addEventListener('click', (e) => {
    const btn = e.target.closest('.tab-btn');
    if (!btn) return;
    switchTab(btn.dataset.tab);
  });

  function switchTab(tabId) {
    tabsNav.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    const btn = tabsNav.querySelector(`[data-tab="${tabId}"]`);
    if (btn) btn.classList.add('active');
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
    const panel = document.getElementById(`tab-${tabId}`);
    if (panel) panel.classList.add('active');
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
    } else if (copyType === 'markdown') {
      text = rawContent['article'] || '';
    } else {
      const keyMap = { 'seo-brief-content': 'seo-brief', 'outline-content': 'outline', 'article-content': 'article', 'seo-meta-content': 'seo-meta', 'image-prompt-content': 'image-prompt' };
      text = rawContent[keyMap[targetId]] || '';
    }
    if (!text) return;
    doCopy(copyBtn, text);
  });

  // ── Copy all metadata ──────────────────────────────────────────
  copyAllMetaBtn.addEventListener('click', () => {
    const fields = document.querySelectorAll('#seo-meta-content .meta-field');
    const lines = [];
    fields.forEach(f => {
      const label = f.querySelector('.meta-field-label')?.textContent?.replace(/\d+\s*\/.*chars/g, '').trim() || '';
      const value = f.querySelector('.meta-field-value')?.textContent?.trim() || '';
      if (label && value) lines.push(`${label}: ${value}`);
    });
    const text = lines.join('\n');
    if (text) doCopy(copyAllMetaBtn, text);
  });

  function doCopy(btn, text) {
    navigator.clipboard.writeText(text).then(() => {
      const orig = btn.textContent;
      btn.textContent = '✓ Copied';
      btn.classList.add('copied');
      setTimeout(() => { btn.textContent = orig; btn.classList.remove('copied'); }, 1500);
    });
  }

  function stripMarkdown(md) {
    return md.replace(/#{1,6}\s/g, '').replace(/\*\*\*(.+?)\*\*\*/g, '$1').replace(/\*\*(.+?)\*\*/g, '$1').replace(/__(.+?)__/g, '$1').replace(/\*(.+?)\*/g, '$1').replace(/_(.+?)_/g, '$1').replace(/~~(.+?)~~/g, '$1').replace(/`([^`]+)`/g, '$1').replace(/```[\s\S]*?```/g, '').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').replace(/^>\s*/gm, '').replace(/^[-*+]\s+/gm, '• ').replace(/^\d+\.\s+/gm, '').replace(/^---+$/gm, '').replace(/^\*\*\*+$/gm, '').replace(/[━─=]{3,}/g, '').replace(/\n{3,}/g, '\n\n').trim();
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
    const body = { keyword, audience: audienceInput.value.trim(), tone: toneSelect.value, contentType: typeSelect.value, wordCount: wordcountInput.value.trim() };
    lastRequestBody = body;
    startGeneration(body);
  });

  // ── Start generation ────────────────────────────────────────────
  async function startGeneration(body) {
    isGenerating = true;
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

  // ── Stream reader ───────────────────────────────────────────────
  async function readStream(response) {
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let fullText = '';

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
    const blocks = { 'seo-brief': '', 'outline': '', 'article': '', 'seo-meta': '', 'image-prompt': '' };
    const blockPatterns = [
      { key: 'seo-brief', pattern: /#{1,3}\s*OUTPUT\s+BLOCK\s+1[^\n]*/i },
      { key: 'outline', pattern: /#{1,3}\s*OUTPUT\s+BLOCK\s+2[^\n]*/i },
      { key: 'article', pattern: /#{1,3}\s*OUTPUT\s+BLOCK\s+3[^\n]*/i },
      { key: 'seo-meta', pattern: /#{1,3}\s*OUTPUT\s+BLOCK\s+4[^\n]*/i },
      { key: 'image-prompt', pattern: /#{1,3}\s*OUTPUT\s+BLOCK\s+5[^\n]*/i },
    ];

    const positions = [];
    for (const { key, pattern } of blockPatterns) {
      const match = text.match(pattern);
      if (match) positions.push({ key, index: text.indexOf(match[0]), headerLength: match[0].length });
    }
    positions.sort((a, b) => a.index - b.index);

    for (let i = 0; i < positions.length; i++) {
      const start = positions[i].index + positions[i].headerLength;
      const end = i + 1 < positions.length ? positions[i + 1].index : text.length;
      let content = text.slice(start, end).trim().replace(/^[━─\-=]{3,}\s*/gm, '').trim();
      blocks[positions[i].key] = content;
    }
    if (positions.length === 0 && text.trim()) blocks['article'] = text.trim();
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
      updateWordCount(rawContent['article']);
      computeQualityScore(rawContent['article']);
      attachRewriteButtons();
    }

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

      const rewriteBtn = document.createElement('button');
      rewriteBtn.className = 'rewrite-btn';
      rewriteBtn.innerHTML = '↻ Rewrite';
      rewriteBtn.title = 'Rewrite this section with more detail';
      wrapper.insertBefore(rewriteBtn, wrapper.firstChild);
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
      const response = await fetch('/api/rewrite-section', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sectionContent, keyword }) });
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
  //  SEO METADATA RENDERER
  // ══════════════════════════════════════════════════════════════════

  function renderSeoMeta(md) {
    const fields = [];
    const lines = md.split('\n');
    let curr = null;
    for (const line of lines) {
      const t = line.trim();
      if (!t) continue;
      const m = t.match(/^\*\*(.+?)\*\*[:\s]*(.*)/);
      if (m) { if (curr) fields.push(curr); curr = { label: m[1].replace(/[*]/g, '').trim(), value: m[2].trim() }; }
      else if (curr) curr.value += (curr.value ? ' ' : '') + t;
    }
    if (curr) fields.push(curr);
    if (fields.length === 0) return renderMarkdown(md);

    return fields.map(f => {
      const ci = getCharInfo(f.label, f.value);
      return `<div class="meta-field"><div class="meta-field-content"><div class="meta-field-label">${escapeHtml(f.label)}${ci}</div><div class="meta-field-value">${escapeHtml(f.value)}</div></div><button class="copy-btn meta-copy" data-value="${escapeAttr(f.value)}">Copy</button></div>`;
    }).join('');
  }

  function getCharInfo(label, value) {
    const lower = label.toLowerCase();
    let min = 0, max = 0;
    if (lower.includes('seo title') || (lower.includes('title') && !lower.includes('meta') && !lower.includes('read'))) { min = 50; max = 60; }
    else if (lower.includes('meta description')) { min = 150; max = 160; }
    else return '';
    const len = value.length;
    const cls = (len >= min && len <= max) ? 'char-good' : 'char-bad';
    return ` <span class="char-counter ${cls}">${len} / ${min}–${max} chars</span>`;
  }

  // ══════════════════════════════════════════════════════════════════
  //  IMAGE PROMPT RENDERER
  // ══════════════════════════════════════════════════════════════════

  function renderImagePrompt(md) {
    const defs = [
      { key: 'midjourney', emoji: '🎨', title: 'Midjourney', pattern: /🎨\s*MIDJOURNEY/i, alt: /midjourney/i },
      { key: 'dalle', emoji: '📸', title: 'DALL-E 3', pattern: /📸\s*DALL[\-·]?E/i, alt: /dall[\-·]?e/i },
      { key: 'imagefx', emoji: '⚡', title: 'Google ImageFX / Flux', pattern: /⚡\s*(GOOGLE|FLUX)/i, alt: /(imagefx|flux)/i },
      { key: 'negative', emoji: '🚫', title: 'Negative Prompt', pattern: /🚫\s*NEGATIVE/i, alt: /negative\s*prompt/i },
      { key: 'tip', emoji: '💡', title: 'Usage Tip', pattern: /💡\s*USAGE/i, alt: /usage\s*tip/i },
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
      else if (!matched && !current) current = { emoji: '🎨', title: 'Image Prompt', key: 'general', content: [t] };
    }
    if (current) sections.push(current);

    if (sections.length === 0) return `<div class="prompt-card"><div class="prompt-card-header"><span class="prompt-card-icon">🎨</span><span class="prompt-card-title">Image Prompt</span><button class="copy-btn prompt-copy" data-value="${escapeAttr(md)}">Copy</button></div><div class="prompt-card-body">${renderMarkdown(md)}</div></div>`;

    return sections.map(s => {
      const text = s.content.join('\n').replace(/^[━─\-=]{3,}\s*/gm, '').trim();
      const copyHtml = s.key !== 'tip' ? `<button class="copy-btn prompt-copy" data-value="${escapeAttr(text)}">Copy</button>` : '';
      return `<div class="prompt-card prompt-card-${s.key}"><div class="prompt-card-header"><span class="prompt-card-icon">${s.emoji}</span><span class="prompt-card-title">${escapeHtml(s.title)}</span>${copyHtml}</div><div class="prompt-card-body"><p>${escapeHtml(text)}</p></div></div>`;
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
  const MAX_HISTORY = 5;

  function getHistory() { try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]'); } catch { return []; } }

  function saveToHistory(fullText) {
    const keyword = keywordInput.value.trim();
    const wc = countWords(rawContent['article'] || '');
    const entry = { id: Date.now(), keyword, date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }), wordCount: wc, rawContent: { ...rawContent }, fullText };
    const history = getHistory();
    history.unshift(entry);
    if (history.length > MAX_HISTORY) history.pop();
    try { localStorage.setItem(HISTORY_KEY, JSON.stringify(history)); } catch { history.pop(); try { localStorage.setItem(HISTORY_KEY, JSON.stringify(history)); } catch {} }
    renderHistory();
  }

  function renderHistory() {
    const history = getHistory();
    if (history.length === 0) { historyList.innerHTML = '<p class="history-empty">No articles generated yet.</p>'; return; }
    historyList.innerHTML = history.map(e => `<button class="history-item" data-id="${e.id}"><div class="history-item-keyword">${escapeHtml(e.keyword)}</div><div class="history-item-meta"><span>${e.date}</span><span class="history-dot">·</span><span>${e.wordCount.toLocaleString()} words</span></div></button>`).join('');
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

  // Init
  renderHistory();
})();
