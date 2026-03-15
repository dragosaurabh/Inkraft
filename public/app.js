/* ================================================================
   INKRAFT — Frontend Application Logic (v2)
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
  const loadingPercent = document.getElementById('loading-percent');
  const errorSection = document.getElementById('error-section');
  const errorMessage = document.getElementById('error-message');
  const errorDismiss = document.getElementById('error-dismiss');
  const errorRetry = document.getElementById('error-retry');
  const outputSection = document.getElementById('output-section');

  const tabsNav = document.getElementById('tabs-nav');
  const wordCountBadge = document.getElementById('word-count-badge');

  // History
  const historyToggle = document.getElementById('history-toggle');
  const historySidebar = document.getElementById('history-sidebar');
  const historyClose = document.getElementById('history-close');
  const historyOverlay = document.getElementById('history-overlay');
  const historyList = document.getElementById('history-list');

  // Content containers
  const contentMap = {
    'seo-brief': document.getElementById('seo-brief-content'),
    'outline': document.getElementById('outline-content'),
    'article': document.getElementById('article-content'),
    'seo-meta': document.getElementById('seo-meta-content'),
    'image-prompt': document.getElementById('image-prompt-content'),
  };

  // Raw markdown per block (for copy functionality)
  const rawContent = {
    'seo-brief': '',
    'outline': '',
    'article': '',
    'seo-meta': '',
    'image-prompt': '',
  };

  // Last request body for retry
  let lastRequestBody = null;
  let isGenerating = false;

  // ── Loading step config ────────────────────────────────────────
  const loadingSteps = [
    { threshold: 0, percent: 0 },
    { threshold: 20, percent: 20 },
    { threshold: 40, percent: 40 },
    { threshold: 60, percent: 60 },
    { threshold: 85, percent: 85 },
  ];

  let currentStep = 0;
  let stepInterval = null;

  // ── Toggle advanced options ─────────────────────────────────────
  toggleBtn.addEventListener('click', () => {
    const isCollapsed = optionsPanel.classList.contains('collapsed');
    optionsPanel.classList.toggle('collapsed', !isCollapsed);
    optionsPanel.classList.toggle('expanded', isCollapsed);
    toggleBtn.classList.toggle('open', isCollapsed);
  });

  // ── Error dismiss ───────────────────────────────────────────────
  errorDismiss.addEventListener('click', () => {
    errorSection.classList.add('hidden');
    inputSection.classList.remove('hidden');
  });

  // ── Error retry ─────────────────────────────────────────────────
  errorRetry.addEventListener('click', () => {
    if (lastRequestBody) {
      errorSection.classList.add('hidden');
      startGeneration(lastRequestBody);
    }
  });

  // ── Tab switching ───────────────────────────────────────────────
  tabsNav.addEventListener('click', (e) => {
    const btn = e.target.closest('.tab-btn');
    if (!btn) return;

    const tabId = btn.dataset.tab;

    tabsNav.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
    document.getElementById(`tab-${tabId}`).classList.add('active');
  });

  // ── Copy buttons ────────────────────────────────────────────────
  document.addEventListener('click', (e) => {
    const copyBtn = e.target.closest('.copy-btn');
    if (!copyBtn) return;

    const targetId = copyBtn.dataset.target;
    const copyType = copyBtn.dataset.copyType;
    let text = '';

    // Check if it's a meta-field individual copy
    if (copyBtn.dataset.value) {
      text = copyBtn.dataset.value;
    } else if (copyType === 'clean') {
      // Strip markdown for clean text copy
      text = stripMarkdown(rawContent['article'] || '');
    } else if (copyType === 'markdown') {
      text = rawContent['article'] || '';
    } else {
      const keyMap = {
        'seo-brief-content': 'seo-brief',
        'outline-content': 'outline',
        'article-content': 'article',
        'seo-meta-content': 'seo-meta',
        'image-prompt-content': 'image-prompt',
      };
      const key = keyMap[targetId];
      text = key ? rawContent[key] : '';
    }

    if (!text) return;

    navigator.clipboard.writeText(text).then(() => {
      const originalText = copyBtn.textContent;
      copyBtn.textContent = '✓ Copied';
      copyBtn.classList.add('copied');
      setTimeout(() => {
        copyBtn.textContent = originalText;
        copyBtn.classList.remove('copied');
      }, 2000);
    });
  });

  // ── Strip markdown helper ──────────────────────────────────────
  function stripMarkdown(md) {
    return md
      .replace(/#{1,6}\s/g, '')
      .replace(/\*\*\*(.+?)\*\*\*/g, '$1')
      .replace(/\*\*(.+?)\*\*/g, '$1')
      .replace(/__(.+?)__/g, '$1')
      .replace(/\*(.+?)\*/g, '$1')
      .replace(/_(.+?)_/g, '$1')
      .replace(/~~(.+?)~~/g, '$1')
      .replace(/`([^`]+)`/g, '$1')
      .replace(/```[\s\S]*?```/g, '')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .replace(/^>\s*/gm, '')
      .replace(/^[-*+]\s+/gm, '• ')
      .replace(/^\d+\.\s+/gm, '')
      .replace(/^---+$/gm, '')
      .replace(/^\*\*\*+$/gm, '')
      .replace(/[━─=]{3,}/g, '')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  // ── Keyboard shortcut: Cmd/Ctrl + Enter ─────────────────────────
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
    if (!keyword) {
      keywordInput.focus();
      return;
    }

    const body = {
      keyword,
      audience: audienceInput.value.trim(),
      tone: toneSelect.value,
      contentType: typeSelect.value,
      wordCount: wordcountInput.value.trim(),
    };

    lastRequestBody = body;
    startGeneration(body);
  });

  // ── Start generation ────────────────────────────────────────────
  async function startGeneration(body) {
    isGenerating = true;
    resetOutput();
    showLoading();

    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

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
        if (line.startsWith('data: ')) {
          const data = line.slice(6);

          if (data === '[DONE]') {
            finishStreaming(fullText);
            return;
          }

          if (line.startsWith('event: error')) continue;

          const text = data.replace(/\\n/g, '\n');
          fullText += text;

          updateLiveOutput(fullText);
        }

        if (line.startsWith('event: error')) {
          continue;
        }

        if (line.startsWith('data: {')) {
          try {
            const errData = JSON.parse(line.slice(6));
            if (errData.error) {
              showError(errData.error);
              return;
            }
          } catch (_) {
            // Not JSON, ignore
          }
        }
      }
    }

    if (fullText) {
      finishStreaming(fullText);
    }
  }

  // ── Parse the full response into 5 blocks ───────────────────────
  function parseBlocks(text) {
    const blocks = {
      'seo-brief': '',
      'outline': '',
      'article': '',
      'seo-meta': '',
      'image-prompt': '',
    };

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
      if (match) {
        positions.push({
          key,
          index: text.indexOf(match[0]),
          headerLength: match[0].length,
        });
      }
    }

    positions.sort((a, b) => a.index - b.index);

    for (let i = 0; i < positions.length; i++) {
      const start = positions[i].index + positions[i].headerLength;
      const end = i + 1 < positions.length ? positions[i + 1].index : text.length;
      let content = text.slice(start, end).trim();
      content = content.replace(/^[━─\-=]{3,}\s*/gm, '').trim();
      blocks[positions[i].key] = content;
    }

    if (positions.length === 0 && text.trim()) {
      blocks['article'] = text.trim();
    }

    return blocks;
  }

  // ── Update output live during streaming ─────────────────────────
  function updateLiveOutput(fullText) {
    if (outputSection.classList.contains('hidden')) {
      hideLoading();
      outputSection.classList.remove('hidden');
    }

    const blocks = parseBlocks(fullText);

    // Update loading progress based on which blocks have content
    updateLoadingProgress(blocks);

    for (const [key, content] of Object.entries(blocks)) {
      if (content) {
        rawContent[key] = content;

        if (key === 'seo-meta') {
          contentMap[key].innerHTML = renderSeoMeta(content);
        } else if (key === 'image-prompt') {
          contentMap[key].innerHTML = renderImagePrompt(content);
        } else {
          contentMap[key].innerHTML = renderMarkdown(content);
          contentMap[key].classList.add('streaming-cursor');
        }

        if (key === 'article') {
          updateWordCount(content);
        }

        const tabBtn = tabsNav.querySelector(`[data-tab="${key}"]`);
        if (tabBtn && !tabBtn.classList.contains('has-content')) {
          tabBtn.classList.add('has-content');
        }
      }
    }

    autoSwitchTab(blocks);
  }

  // ── Update loading progress based on blocks ─────────────────────
  function updateLoadingProgress(blocks) {
    let step = 0;
    if (blocks['seo-brief']) step = 1;
    if (blocks['outline']) step = 2;
    if (blocks['article']) step = 3;
    if (blocks['seo-meta']) step = 4;
    if (blocks['image-prompt']) step = 5;

    if (step > currentStep) {
      currentStep = step;
    }
  }

  // ── Auto-switch tab to show active content ──────────────────────
  let lastAutoTab = '';
  function autoSwitchTab(blocks) {
    const tabOrder = ['seo-brief', 'outline', 'article', 'seo-meta', 'image-prompt'];
    let latestTab = '';
    for (const key of tabOrder) {
      if (blocks[key]) {
        latestTab = key;
      }
    }

    if (latestTab && latestTab !== lastAutoTab) {
      lastAutoTab = latestTab;
      tabsNav.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      const btn = tabsNav.querySelector(`[data-tab="${latestTab}"]`);
      if (btn) btn.classList.add('active');

      document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
      document.getElementById(`tab-${latestTab}`).classList.add('active');
    }
  }

  // ── Finish streaming ────────────────────────────────────────────
  function finishStreaming(fullText) {
    stopStatusRotation();
    isGenerating = false;

    const blocks = parseBlocks(fullText);

    for (const [key, content] of Object.entries(blocks)) {
      rawContent[key] = content;
      if (content) {
        if (key === 'seo-meta') {
          contentMap[key].innerHTML = renderSeoMeta(content);
        } else if (key === 'image-prompt') {
          contentMap[key].innerHTML = renderImagePrompt(content);
        } else {
          contentMap[key].innerHTML = renderMarkdown(content);
        }
        contentMap[key].classList.remove('streaming-cursor');

        const tabBtn = tabsNav.querySelector(`[data-tab="${key}"]`);
        if (tabBtn) tabBtn.classList.add('has-content');
      }
    }

    if (rawContent['article']) {
      updateWordCount(rawContent['article']);
    }

    outputSection.classList.remove('hidden');
    loadingSection.classList.add('hidden');
    inputSection.classList.remove('hidden');
    generateBtn.disabled = false;
    generateBtn.querySelector('.btn-text').textContent = 'Generate Article';
    generateBtn.querySelector('.btn-icon').textContent = '⚡';

    // Auto-switch to Full Article tab
    const articleBtn = tabsNav.querySelector('[data-tab="article"]');
    if (articleBtn && rawContent['article']) {
      tabsNav.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      articleBtn.classList.add('active');
      document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
      document.getElementById('tab-article').classList.add('active');
    }

    // Save to history
    saveToHistory(fullText);
  }

  // ── SEO Metadata renderer ──────────────────────────────────────
  function renderSeoMeta(md) {
    const fields = [];
    const lines = md.split('\n');
    let currentField = null;

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      // Match field labels like **SEO Title** or **Meta Description**
      const labelMatch = trimmed.match(/^\*\*(.+?)\*\*[:\s]*(.*)/);
      if (labelMatch) {
        if (currentField) fields.push(currentField);
        currentField = {
          label: labelMatch[1].replace(/[*]/g, '').trim(),
          value: labelMatch[2].trim(),
        };
      } else if (currentField) {
        currentField.value += (currentField.value ? ' ' : '') + trimmed;
      }
    }
    if (currentField) fields.push(currentField);

    if (fields.length === 0) {
      return renderMarkdown(md);
    }

    return fields.map(f => {
      const charInfo = getCharInfo(f.label, f.value);
      return `
        <div class="meta-field">
          <div class="meta-field-content">
            <div class="meta-field-label">${escapeHtml(f.label)}${charInfo.html}</div>
            <div class="meta-field-value">${escapeHtml(f.value)}</div>
          </div>
          <button class="copy-btn meta-copy" data-value="${escapeAttr(f.value)}">Copy</button>
        </div>
      `;
    }).join('');
  }

  // ── Character counter for SEO meta fields ──────────────────────
  function getCharInfo(label, value) {
    const lower = label.toLowerCase();
    let min = 0, max = 0;

    if (lower.includes('seo title') || (lower.includes('title') && !lower.includes('meta'))) {
      min = 50; max = 60;
    } else if (lower.includes('meta description')) {
      min = 150; max = 160;
    } else {
      return { html: '' };
    }

    const len = value.length;
    const inRange = len >= min && len <= max;
    const colorClass = inRange ? 'char-good' : 'char-bad';

    return {
      html: ` <span class="char-counter ${colorClass}">${len} / ${min}–${max} chars</span>`,
    };
  }

  // ── Image Prompt renderer ──────────────────────────────────────
  function renderImagePrompt(md) {
    const sections = [];
    let current = null;

    // Try to split into Midjourney / DALL-E / ImageFX sections
    const platforms = [
      { key: 'midjourney', patterns: [/midjourney/i, /\-\-ar\s/i, /\-\-v\s/i, /\-\-style/i] },
      { key: 'dalle', patterns: [/dall[\-·]?e/i, /dall-e\s*3/i] },
      { key: 'imagefx', patterns: [/imagefx/i, /flux/i, /google\s+image/i] },
    ];

    const lines = md.split('\n');
    const platformSections = [];
    let currentSection = { title: 'General Prompt', content: [] };

    for (const line of lines) {
      const trimmed = line.trim();

      // Check if this line introduces a new platform section
      let matched = false;
      if (/midjourney\s*(version|prompt)?/i.test(trimmed) && (trimmed.startsWith('**') || trimmed.startsWith('-') || trimmed.startsWith('#'))) {
        if (currentSection.content.length > 0 || currentSection.title !== 'General Prompt') {
          platformSections.push(currentSection);
        }
        currentSection = { title: 'Midjourney', icon: '🎨', content: [] };
        // If the prompt is on the same line after the label
        const afterLabel = trimmed.replace(/^\*?\*?[-#]*\s*midjourney\s*(version|prompt)?[\s:]*\*?\*?/i, '').trim();
        if (afterLabel) currentSection.content.push(afterLabel);
        matched = true;
      } else if (/dall[\-·]?e\s*3?\s*(version|prompt)?/i.test(trimmed) && (trimmed.startsWith('**') || trimmed.startsWith('-') || trimmed.startsWith('#'))) {
        if (currentSection.content.length > 0 || currentSection.title !== 'General Prompt') {
          platformSections.push(currentSection);
        }
        currentSection = { title: 'DALL-E 3', icon: '🖼️', content: [] };
        const afterLabel = trimmed.replace(/^\*?\*?[-#]*\s*dall[\-·]?e\s*3?\s*(version|prompt)?[\s:]*\*?\*?/i, '').trim();
        if (afterLabel) currentSection.content.push(afterLabel);
        matched = true;
      } else if (/(google\s*image\s*fx|flux|imagefx)\s*(version|prompt)?/i.test(trimmed) && (trimmed.startsWith('**') || trimmed.startsWith('-') || trimmed.startsWith('#'))) {
        if (currentSection.content.length > 0 || currentSection.title !== 'General Prompt') {
          platformSections.push(currentSection);
        }
        currentSection = { title: 'Google ImageFX / Flux', icon: '✨', content: [] };
        const afterLabel = trimmed.replace(/^\*?\*?[-#]*\s*(google\s*image\s*fx\s*\/?\s*flux|imagefx|flux)\s*(version|prompt)?[\s:]*\*?\*?/i, '').trim();
        if (afterLabel) currentSection.content.push(afterLabel);
        matched = true;
      }

      if (!matched && trimmed) {
        currentSection.content.push(trimmed);
      }
    }
    if (currentSection.content.length > 0) {
      platformSections.push(currentSection);
    }

    // If we couldn't detect platform sections, just show as one block
    if (platformSections.length <= 1) {
      const content = md.replace(/^[━─\-=]{3,}\s*/gm, '').trim();
      return `
        <div class="prompt-card">
          <div class="prompt-card-header">
            <span class="prompt-card-icon">🎨</span>
            <span class="prompt-card-title">Image Generation Prompt</span>
            <button class="copy-btn prompt-copy" data-value="${escapeAttr(content)}">Copy</button>
          </div>
          <div class="prompt-card-body">${renderMarkdown(content)}</div>
        </div>
      `;
    }

    return platformSections.map(sec => {
      const text = sec.content.join('\n').replace(/^[━─\-=]{3,}\s*/gm, '').trim();
      const icon = sec.icon || '🎨';
      return `
        <div class="prompt-card">
          <div class="prompt-card-header">
            <span class="prompt-card-icon">${icon}</span>
            <span class="prompt-card-title">${escapeHtml(sec.title)}</span>
            <button class="copy-btn prompt-copy" data-value="${escapeAttr(text)}">Copy</button>
          </div>
          <div class="prompt-card-body"><p>${escapeHtml(text)}</p></div>
        </div>
      `;
    }).join('');
  }

  // ── Word count ──────────────────────────────────────────────────
  function updateWordCount(text) {
    const plain = text
      .replace(/#{1,6}\s/g, '')
      .replace(/\*\*|__/g, '')
      .replace(/\*|_/g, '')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .replace(/[━─\-=]{3,}/g, '')
      .replace(/\n+/g, ' ')
      .trim();

    const count = plain.split(/\s+/).filter(w => w.length > 0).length;
    wordCountBadge.textContent = `${count.toLocaleString()} words`;
    wordCountBadge.classList.remove('hidden');
  }

  // ── Markdown renderer (lightweight, no deps) ───────────────────
  function renderMarkdown(md) {
    let html = md;

    html = html
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (_, lang, code) => {
      return `<pre><code class="language-${lang}">${code.trim()}</code></pre>`;
    });

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

    html = html.replace(/((?:^[-*+] .+\n?)+)/gm, (match) => {
      const items = match.trim().split('\n').map(line => {
        return `<li>${line.replace(/^[-*+]\s+/, '')}</li>`;
      }).join('\n');
      return `<ul>${items}</ul>\n`;
    });

    html = html.replace(/((?:^\d+\.\s.+\n?)+)/gm, (match) => {
      const items = match.trim().split('\n').map(line => {
        return `<li>${line.replace(/^\d+\.\s+/, '')}</li>`;
      }).join('\n');
      return `<ol>${items}</ol>\n`;
    });

    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');

    const blockTags = ['<h1', '<h2', '<h3', '<h4', '<h5', '<h6', '<ul', '<ol', '<li', '<blockquote', '<pre', '<hr', '<table', '<tr', '<th', '<td', '<thead', '<tbody', '</'];
    const htmlLines = html.split('\n');
    const result = [];
    let inParagraph = false;

    for (let i = 0; i < htmlLines.length; i++) {
      const line = htmlLines[i].trim();

      if (!line) {
        if (inParagraph) {
          result.push('</p>');
          inParagraph = false;
        }
        continue;
      }

      const isBlock = blockTags.some(tag => line.startsWith(tag));

      if (isBlock) {
        if (inParagraph) {
          result.push('</p>');
          inParagraph = false;
        }
        result.push(line);
      } else {
        if (!inParagraph) {
          result.push('<p>');
          inParagraph = true;
        }
        result.push(line);
      }
    }

    if (inParagraph) result.push('</p>');

    return result.join('\n');
  }

  // ── Table renderer ──────────────────────────────────────────────
  function renderTables(html) {
    const tableRegex = /((?:^\|.+\|\s*\n)+)/gm;

    return html.replace(tableRegex, (match) => {
      const rows = match.trim().split('\n').filter(r => r.trim());
      if (rows.length < 2) return match;

      const sepRow = rows[1];
      if (!/^\|[\s\-:|]+\|$/.test(sepRow.trim())) return match;

      const parseRow = (row) => {
        return row.split('|').slice(1, -1).map(c => c.trim());
      };

      const headers = parseRow(rows[0]);
      const dataRows = rows.slice(2);

      let table = '<table>\n<thead><tr>';
      for (const h of headers) {
        table += `<th>${h}</th>`;
      }
      table += '</tr></thead>\n<tbody>';

      for (const row of dataRows) {
        const cells = parseRow(row);
        table += '<tr>';
        for (const c of cells) {
          table += `<td>${c}</td>`;
        }
        table += '</tr>\n';
      }

      table += '</tbody></table>\n';
      return table;
    });
  }

  // ── HTML escaping helpers ───────────────────────────────────────
  function escapeHtml(str) {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function escapeAttr(str) {
    return str.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/'/g, '&#39;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  // ── History management ──────────────────────────────────────────
  const HISTORY_KEY = 'inkraft_history';
  const MAX_HISTORY = 5;

  function getHistory() {
    try {
      return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
    } catch {
      return [];
    }
  }

  function saveToHistory(fullText) {
    const keyword = keywordInput.value.trim();
    const article = rawContent['article'] || '';
    const wordCount = article
      .replace(/#{1,6}\s/g, '').replace(/\*\*|__/g, '').replace(/\*|_/g, '')
      .replace(/\n+/g, ' ').trim()
      .split(/\s+/).filter(w => w.length > 0).length;

    const entry = {
      id: Date.now(),
      keyword,
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      wordCount,
      rawContent: { ...rawContent },
      fullText,
    };

    const history = getHistory();
    history.unshift(entry);
    if (history.length > MAX_HISTORY) history.pop();

    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
    } catch {
      // Storage full — remove oldest
      history.pop();
      try { localStorage.setItem(HISTORY_KEY, JSON.stringify(history)); } catch {}
    }

    renderHistory();
  }

  function renderHistory() {
    const history = getHistory();

    if (history.length === 0) {
      historyList.innerHTML = '<p class="history-empty">No articles generated yet.</p>';
      return;
    }

    historyList.innerHTML = history.map(entry => `
      <button class="history-item" data-id="${entry.id}">
        <div class="history-item-keyword">${escapeHtml(entry.keyword)}</div>
        <div class="history-item-meta">
          <span>${entry.date}</span>
          <span class="history-dot">·</span>
          <span>${entry.wordCount.toLocaleString()} words</span>
        </div>
      </button>
    `).join('');
  }

  function loadHistoryEntry(id) {
    const history = getHistory();
    const entry = history.find(e => e.id === id);
    if (!entry) return;

    // Restore content
    for (const [key, content] of Object.entries(entry.rawContent)) {
      rawContent[key] = content;
      if (content) {
        if (key === 'seo-meta') {
          contentMap[key].innerHTML = renderSeoMeta(content);
        } else if (key === 'image-prompt') {
          contentMap[key].innerHTML = renderImagePrompt(content);
        } else {
          contentMap[key].innerHTML = renderMarkdown(content);
        }
        contentMap[key].classList.remove('streaming-cursor');

        const tabBtn = tabsNav.querySelector(`[data-tab="${key}"]`);
        if (tabBtn) tabBtn.classList.add('has-content');
      }
    }

    if (rawContent['article']) {
      updateWordCount(rawContent['article']);
    }

    outputSection.classList.remove('hidden');
    errorSection.classList.add('hidden');
    loadingSection.classList.add('hidden');

    // Switch to article tab
    const articleBtn = tabsNav.querySelector('[data-tab="article"]');
    if (articleBtn && rawContent['article']) {
      tabsNav.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      articleBtn.classList.add('active');
      document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
      document.getElementById('tab-article').classList.add('active');
    }

    // Close sidebar
    closeSidebar();
  }

  // History sidebar events
  historyToggle.addEventListener('click', () => {
    historySidebar.classList.add('open');
    historyOverlay.classList.add('open');
    renderHistory();
  });

  function closeSidebar() {
    historySidebar.classList.remove('open');
    historyOverlay.classList.remove('open');
  }

  historyClose.addEventListener('click', closeSidebar);
  historyOverlay.addEventListener('click', closeSidebar);

  historyList.addEventListener('click', (e) => {
    const item = e.target.closest('.history-item');
    if (!item) return;
    loadHistoryEntry(Number(item.dataset.id));
  });

  // ── State management ────────────────────────────────────────────
  function resetOutput() {
    for (const key of Object.keys(rawContent)) {
      rawContent[key] = '';
      contentMap[key].innerHTML = '';
      contentMap[key].classList.remove('streaming-cursor');
    }
    lastAutoTab = '';
    currentStep = 0;

    tabsNav.querySelectorAll('.tab-btn').forEach(b => {
      b.classList.remove('has-content');
      b.classList.remove('active');
    });
    tabsNav.querySelector('[data-tab="seo-brief"]').classList.add('active');

    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
    document.getElementById('tab-seo-brief').classList.add('active');

    wordCountBadge.classList.add('hidden');
    outputSection.classList.add('hidden');
    errorSection.classList.add('hidden');
  }

  function showLoading() {
    inputSection.classList.add('hidden');
    loadingSection.classList.remove('hidden');
    generateBtn.disabled = true;
    generateBtn.querySelector('.btn-text').textContent = 'Generating...';
    generateBtn.querySelector('.btn-icon').textContent = '⏳';

    currentStep = 0;
    progressFill.style.width = '0%';
    loadingPercent.textContent = '0%';

    // Reset all steps
    loaderSteps.querySelectorAll('.loader-step').forEach(s => {
      s.classList.remove('active', 'done');
    });
    loaderSteps.querySelector('[data-step="1"]').classList.add('active');

    startStatusRotation();
  }

  function hideLoading() {
    loadingSection.classList.add('hidden');
    stopStatusRotation();
  }

  function startStatusRotation() {
    let fakeStep = 0;
    const stepEls = loaderSteps.querySelectorAll('.loader-step');
    const totalSteps = stepEls.length;

    stepInterval = setInterval(() => {
      fakeStep++;
      if (fakeStep >= totalSteps) {
        fakeStep = totalSteps - 1;
      }

      // Mark previous steps as done, current as active
      stepEls.forEach((el, idx) => {
        el.classList.remove('active', 'done');
        if (idx < fakeStep) {
          el.classList.add('done');
        } else if (idx === fakeStep) {
          el.classList.add('active');
        }
      });

      // Animate progress bar
      const percent = Math.min(5 + (fakeStep / totalSteps) * 90, 95);
      progressFill.style.width = `${percent}%`;
      loadingPercent.textContent = `${Math.round(percent)}%`;
    }, 5000);
  }

  function stopStatusRotation() {
    if (stepInterval) {
      clearInterval(stepInterval);
      stepInterval = null;
    }
    progressFill.style.width = '100%';
    loadingPercent.textContent = '100%';

    // Mark all steps as done
    loaderSteps.querySelectorAll('.loader-step').forEach(s => {
      s.classList.remove('active');
      s.classList.add('done');
    });
  }

  function showError(msg) {
    hideLoading();
    outputSection.classList.add('hidden');
    errorSection.classList.remove('hidden');
    inputSection.classList.add('hidden');

    // Check for API key error and improve message
    if (msg.includes('API_KEY') || msg.includes('GEMINI_API_KEY') || msg.includes('api key')) {
      errorMessage.innerHTML = `
        <strong>API Key Not Configured</strong><br/>
        Add your <code>GEMINI_API_KEY</code> to the <code>.env</code> file.<br/>
        <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener" class="error-link">
          Get your free key at aistudio.google.com →
        </a>
      `;
    } else {
      errorMessage.textContent = msg;
    }

    generateBtn.disabled = false;
    generateBtn.querySelector('.btn-text').textContent = 'Generate Article';
    generateBtn.querySelector('.btn-icon').textContent = '⚡';
    isGenerating = false;
  }

  // ── Init ────────────────────────────────────────────────────────
  renderHistory();

})();
